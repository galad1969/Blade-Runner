import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface RawSpan {
  x: number;
  y: number;
  width: number;
  height: number;
  str: string;
}

interface PositionedLine {
  y: number;
  text: string;
  maxHeight: number;
  isTableRow: boolean;
}

export interface PdfExtractionResult {
  structuredText: string;
  pageCount: number;
}

const STRUCTURAL_HEADING_RE =
  /^(?:chapitre|titre|partie|section|livre|acte)\s+[0-9ivxlcdm]+/i;
const ARTICLE_HEADING_RE =
  /^(?:article|art\.|règle|regle|§)\s*[0-9]+(?:\.[0-9]+)*/i;

function computeMedian(values: number[]): number {
  if (values.length === 0) return 11;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Reconstructs ordered visual lines from a set of spans belonging to a single
 * column or full-width band, preserving tabular column gaps as " | ".
 */
function buildLinesFromSpans(
  spans: RawSpan[],
  medianFontHeight: number
): PositionedLine[] {
  if (spans.length === 0) return [];

  const sorted = [...spans].sort((a, b) => {
    if (Math.abs(b.y - a.y) > 3) return b.y - a.y;
    return a.x - b.x;
  });

  // Group into horizontal rows by Y coordinate
  const rows: RawSpan[][] = [];
  for (const span of sorted) {
    const lastRow = rows[rows.length - 1];
    if (lastRow && Math.abs(lastRow[0].y - span.y) <= 3.2) {
      lastRow.push(span);
    } else {
      rows.push([span]);
    }
  }

  const lines: PositionedLine[] = [];
  const tableGapThreshold = Math.max(14, medianFontHeight * 1.45);

  for (const row of rows) {
    row.sort((a, b) => a.x - b.x);
    let text = '';
    let maxHeight = 0;
    let largeGaps = 0;

    for (let i = 0; i < row.length; i++) {
      const span = row[i];
      maxHeight = Math.max(maxHeight, span.height);

      if (i === 0) {
        text = span.str;
        continue;
      }

      const prev = row[i - 1];
      const prevEnd = prev.x + prev.width;
      const gap = span.x - prevEnd;

      if (gap > tableGapThreshold) {
        largeGaps++;
        text = text.trimEnd() + ' | ' + span.str.trimStart();
      } else {
        const needsSpace =
          text.length > 0 &&
          !text.endsWith(' ') &&
          !span.str.startsWith(' ') &&
          !text.endsWith('-') &&
          !text.endsWith("'") &&
          !text.endsWith('’') &&
          gap > 1.2;
        text += (needsSpace ? ' ' : '') + span.str;
      }
    }

    const cleaned = text.replace(/[ \t]+/g, ' ').trim();
    if (cleaned) {
      lines.push({
        y: row[0].y,
        text: cleaned,
        maxHeight,
        isTableRow: largeGaps >= 1,
      });
    }
  }

  return lines;
}

/**
 * Splits a page's spans into reading-order lines, detecting 2-column JDR layouts
 * while keeping full-width titles/banners in their correct vertical bands.
 */
function extractPageLinesInReadingOrder(
  spans: RawSpan[],
  pageWidth: number,
  medianFontHeight: number
): PositionedLine[] {
  if (spans.length === 0) return [];

  const midX = pageWidth / 2;
  const gutterHalf = Math.max(10, pageWidth * 0.025);

  const fullWidthItems: RawSpan[] = [];
  const leftSpans: RawSpan[] = [];
  const rightSpans: RawSpan[] = [];

  for (const span of spans) {
    const startX = span.x;
    const endX = span.x + span.width;
    const crossesCenter = startX < midX - gutterHalf && endX > midX + gutterHalf;
    const isVeryWide = span.width > pageWidth * 0.54;

    if (crossesCenter || isVeryWide) {
      fullWidthItems.push(span);
    } else if (endX <= midX + gutterHalf) {
      leftSpans.push(span);
    } else {
      rightSpans.push(span);
    }
  }

  // Decide whether this page genuinely uses a 2-column layout
  const isTwoColumn =
    leftSpans.length >= 4 &&
    rightSpans.length >= 4 &&
    leftSpans.length + rightSpans.length >= spans.length * 0.55;

  if (!isTwoColumn) {
    return buildLinesFromSpans(spans, medianFontHeight);
  }

  // Build full-width divider lines sorted top-to-bottom
  const fullLines = buildLinesFromSpans(fullWidthItems, medianFontHeight);
  const result: PositionedLine[] = [];

  // Process vertical bands separated by full-width lines (titles, wide tables, banners)
  let upperBoundY = Infinity;
  for (const fullLine of fullLines) {
    const bandLeft = leftSpans.filter((s) => s.y < upperBoundY && s.y > fullLine.y + 3);
    const bandRight = rightSpans.filter((s) => s.y < upperBoundY && s.y > fullLine.y + 3);

    result.push(...buildLinesFromSpans(bandLeft, medianFontHeight));
    result.push(...buildLinesFromSpans(bandRight, medianFontHeight));
    result.push(fullLine);

    upperBoundY = fullLine.y - 3;
  }

  // Remaining spans below the last full-width line
  const tailLeft = leftSpans.filter((s) => s.y < upperBoundY);
  const tailRight = rightSpans.filter((s) => s.y < upperBoundY);
  result.push(...buildLinesFromSpans(tailLeft, medianFontHeight));
  result.push(...buildLinesFromSpans(tailRight, medianFontHeight));

  return result;
}

export async function extractTextFromPdfBuffer(
  buffer: ArrayBuffer,
  onProgress?: (currentPage: number, totalPages: number) => void
): Promise<PdfExtractionResult> {
  const loadingTask = pdfjsLib.getDocument({ data: buffer });
  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;

  interface RawPageData {
    spans: RawSpan[];
    pageWidth: number;
  }

  const rawPages: RawPageData[] = [];
  const allFontHeights: number[] = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    onProgress?.(pageNum, totalPages);
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();

    const spans: RawSpan[] = [];
    for (const item of textContent.items) {
      if (!('str' in item) || !item.str.trim()) continue;
      const transform = item.transform as number[];
      const x = transform[4] ?? 0;
      const y = transform[5] ?? 0;
      const height = Math.abs(item.height || transform[3] || 11);
      spans.push({
        x,
        y,
        str: item.str,
        height,
        width: item.width || 0,
      });
      if (height >= 6 && height <= 48) {
        allFontHeights.push(height);
      }
    }

    rawPages.push({
      spans,
      pageWidth: viewport.width || 595,
    });
  }

  const totalExtractedChars = rawPages.reduce(
    (sum, p) => sum + p.spans.reduce((s, sp) => s + sp.str.trim().length, 0),
    0
  );

  if (totalExtractedChars < 20) {
    throw new Error(
      'Ce PDF ne contient pas de texte sélectionnable (document scanné en image). Veuillez importer un PDF contenant du texte ou un fichier .txt / .md.'
    );
  }

  const medianFontHeight = computeMedian(allFontHeights);
  const outputBlocks: string[] = [];

  for (let pIdx = 0; pIdx < rawPages.length; pIdx++) {
    const pageNum = pIdx + 1;
    const lines = extractPageLinesInReadingOrder(
      rawPages[pIdx].spans,
      rawPages[pIdx].pageWidth,
      medianFontHeight
    );
    if (lines.length === 0) continue;

    let pageHasHeading = false;
    const pageParagraphs: string[] = [];
    let currentPara: string[] = [];
    let inTableBlock = false;

    const flushPara = () => {
      if (currentPara.length === 0) return;
      if (inTableBlock) {
        // Keep each table row on its own line for legibility
        pageParagraphs.push(currentPara.join('\n').trim());
      } else {
        let merged = '';
        for (const line of currentPara) {
          if (!merged) {
            merged = line;
          } else if (merged.endsWith('-') && /^[a-zà-ÿ]/i.test(line)) {
            merged = merged.slice(0, -1) + line;
          } else {
            merged += ' ' + line;
          }
        }
        pageParagraphs.push(merged.trim());
      }
      currentPara = [];
      inTableBlock = false;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const text = line.text;
      if (!text) continue;

      // Skip standalone numeric page footers/headers like "12" or "- 12 -" or "Page 12"
      if (/^(?:page\s*)?[-–—]?\s*\d{1,4}\s*[-–—]?$/i.test(text)) {
        continue;
      }

      const isLargeHeading =
        !line.isTableRow &&
        line.maxHeight >= medianFontHeight * 1.22 &&
        text.length <= 120;
      const isSectionPattern =
        !line.isTableRow && STRUCTURAL_HEADING_RE.test(text) && text.length <= 110;
      const isArticlePattern =
        !line.isTableRow && ARTICLE_HEADING_RE.test(text) && text.length <= 120;

      if (
        isSectionPattern ||
        (isLargeHeading &&
          !isArticlePattern &&
          line.maxHeight >= medianFontHeight * 1.38)
      ) {
        flushPara();
        pageHasHeading = true;
        pageParagraphs.push(`## ${text} (Page ${pageNum})`);
        continue;
      }

      if (isArticlePattern || isLargeHeading) {
        flushPara();
        pageHasHeading = true;
        pageParagraphs.push(`### ${text} (p. ${pageNum})`);
        continue;
      }

      // Keep table rows grouped cleanly line-by-line
      if (line.isTableRow) {
        if (!inTableBlock && currentPara.length > 0) {
          flushPara();
        }
        inTableBlock = true;
        currentPara.push(text);
        continue;
      } else if (inTableBlock) {
        flushPara();
      }

      const prevLine = i > 0 ? lines[i - 1] : null;
      const verticalGap = prevLine ? Math.abs(prevLine.y - line.y) : 0;
      const startsExample = /^(?:exemples?|cas pratique|illustration)\s*[:—-]/i.test(
        text
      );

      if (startsExample || (prevLine && verticalGap > medianFontHeight * 1.75)) {
        flushPara();
      }

      currentPara.push(text);
    }

    flushPara();

    if (pageParagraphs.length > 0) {
      const startsWithHeading = /^#{2,3}\s+/.test(pageParagraphs[0]);
      if (!startsWithHeading) {
        const label = pageHasHeading ? `Page ${pageNum} — Suite` : `Page ${pageNum} — Extrait`;
        outputBlocks.push(`### ${label}\n${pageParagraphs.join('\n\n')}`);
      } else {
        outputBlocks.push(pageParagraphs.join('\n\n'));
      }
    }
  }

  return {
    structuredText: outputBlocks.join('\n\n'),
    pageCount: totalPages,
  };
}
