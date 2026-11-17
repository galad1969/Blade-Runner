import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PositionedLine {
  y: number;
  text: string;
  maxHeight: number;
}

export interface PdfExtractionResult {
  structuredText: string;
  pageCount: number;
}

const STRUCTURAL_HEADING_RE =
  /^(?:chapitre|titre|partie|section)\s+[0-9ivxlcdm]+/i;
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

export async function extractTextFromPdfBuffer(
  buffer: ArrayBuffer,
  onProgress?: (currentPage: number, totalPages: number) => void
): Promise<PdfExtractionResult> {
  const loadingTask = pdfjsLib.getDocument({ data: buffer });
  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;

  const pageLines: PositionedLine[][] = [];
  const allFontHeights: number[] = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    onProgress?.(pageNum, totalPages);
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    interface RawSpan {
      x: number;
      y: number;
      str: string;
      height: number;
      width: number;
    }

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

    // Sort top-to-bottom (higher Y first in PDF coordinates), then left-to-right
    spans.sort((a, b) => {
      if (Math.abs(b.y - a.y) > 3) return b.y - a.y;
      return a.x - b.x;
    });

    const lines: PositionedLine[] = [];
    for (const span of spans) {
      const last = lines[lines.length - 1];
      if (last && Math.abs(last.y - span.y) <= 3) {
        const needsSpace =
          last.text.length > 0 &&
          !last.text.endsWith(' ') &&
          !span.str.startsWith(' ') &&
          !last.text.endsWith('-') &&
          !last.text.endsWith("'");
        last.text += (needsSpace ? ' ' : '') + span.str;
        last.maxHeight = Math.max(last.maxHeight, span.height);
      } else {
        lines.push({
          y: span.y,
          text: span.str,
          maxHeight: span.height,
        });
      }
    }

    pageLines.push(
      lines.map((l) => ({
        ...l,
        text: l.text.replace(/\s+/g, ' ').trim(),
      }))
    );
  }

  const totalExtractedChars = pageLines.reduce(
    (sum, lines) => sum + lines.reduce((s, l) => s + l.text.length, 0),
    0
  );

  if (totalExtractedChars < 20) {
    throw new Error(
      'Ce PDF ne contient pas de texte sélectionnable (document scanné en image). Veuillez importer un PDF contenant du texte ou un fichier .txt / .md.'
    );
  }

  const medianFontHeight = computeMedian(allFontHeights);
  const outputBlocks: string[] = [];

  for (let pIdx = 0; pIdx < pageLines.length; pIdx++) {
    const pageNum = pIdx + 1;
    const lines = pageLines[pIdx];
    if (lines.length === 0) continue;

    // Emit page section fallback marker if no section headings exist yet
    let pageHasHeading = false;
    const pageParagraphs: string[] = [];
    let currentPara: string[] = [];

    const flushPara = () => {
      if (currentPara.length === 0) return;
      // Rejoin soft-hyphenated words across line wraps
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
      currentPara = [];
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
        line.maxHeight >= medianFontHeight * 1.22 && text.length <= 120;
      const isSectionPattern =
        STRUCTURAL_HEADING_RE.test(text) && text.length <= 110;
      const isArticlePattern =
        ARTICLE_HEADING_RE.test(text) && text.length <= 120;

      if (isSectionPattern || (isLargeHeading && !isArticlePattern && line.maxHeight >= medianFontHeight * 1.38)) {
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

      // Detect vertical paragraph gap
      const prevLine = i > 0 ? lines[i - 1] : null;
      const verticalGap = prevLine ? Math.abs(prevLine.y - line.y) : 0;
      const startsExample = /^(?:exemples?|cas pratique|illustration)\s*[:—-]/i.test(text);

      if (startsExample || (prevLine && verticalGap > medianFontHeight * 1.75)) {
        flushPara();
      }

      currentPara.push(text);
    }

    flushPara();

    if (pageParagraphs.length > 0) {
      if (!pageHasHeading && totalPages > 1) {
        outputBlocks.push(`### Page ${pageNum} — Extrait\n${pageParagraphs.join('\n\n')}`);
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
