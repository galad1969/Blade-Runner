import React from 'react';
import { stripAccents } from '../engine/vectorSearch';

interface HighlightedTextProps {
  text: string;
  matchedTerms: string[];
  className?: string;
  availablePages?: Set<number>;
  onJumpToPage?: (pageNum: number) => void;
}

const PAGE_REF_RE = /\b((?:pages?|p\.)\s*(\d{1,4}))\b/gi;

export const HighlightedText: React.FC<HighlightedTextProps> = ({
  text,
  matchedTerms,
  className = '',
  availablePages,
  onJumpToPage,
}) => {
  const normalizedSet = new Set(
    (matchedTerms || [])
      .map((t) => stripAccents(t.toLowerCase()))
      .filter((t) => t.length >= 2)
  );

  const renderWords = (segment: string, keyPrefix: string) => {
    if (normalizedSet.size === 0) {
      return <React.Fragment key={keyPrefix}>{segment}</React.Fragment>;
    }

    const parts = segment.split(/([+\-]?\d+d\d+(?:[+\-]\d+)?|[A-Za-zÀ-ÖØ-öø-ÿ0-9]+)/g);
    return (
      <React.Fragment key={keyPrefix}>
        {parts.map((part, idx) => {
          if (idx % 2 === 1) {
            const norm = stripAccents(part.toLowerCase());
            if (normalizedSet.has(norm)) {
              return (
                <mark
                  key={`${keyPrefix}-${idx}`}
                  className="bg-cyan-400/15 text-cyan-200 px-0.5 rounded-[2px] border-b border-cyan-400/40 font-medium"
                >
                  {part}
                </mark>
              );
            }
          }
          return <React.Fragment key={`${keyPrefix}-${idx}`}>{part}</React.Fragment>;
        })}
      </React.Fragment>
    );
  };

  if (!onJumpToPage || !availablePages || availablePages.size === 0) {
    return <span className={className}>{renderWords(text, 'root')}</span>;
  }

  // Split text by clickable page references (e.g., "voir p. 42", "page 12")
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  PAGE_REF_RE.lastIndex = 0;

  while ((match = PAGE_REF_RE.exec(text)) !== null) {
    const fullMatch = match[1];
    const pageNum = Number(match[2]);
    const matchStart = match.index;

    if (matchStart > lastIndex) {
      nodes.push(renderWords(text.slice(lastIndex, matchStart), `seg-${lastIndex}`));
    }

    if (availablePages.has(pageNum)) {
      nodes.push(
        <button
          key={`ref-${matchStart}`}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onJumpToPage(pageNum);
          }}
          title={`Ouvrir la page ${pageNum}`}
          className="inline-flex items-baseline gap-0.5 text-amber-300 hover:text-amber-200 underline decoration-amber-400/50 underline-offset-2 font-mono text-[0.92em] cursor-pointer px-0.5"
        >
          <span>{fullMatch}</span>
          <span aria-hidden="true" className="text-[0.8em]">↗</span>
        </button>
      );
    } else {
      nodes.push(renderWords(fullMatch, `txt-${matchStart}`));
    }

    lastIndex = matchStart + fullMatch.length;
  }

  if (lastIndex < text.length) {
    nodes.push(renderWords(text.slice(lastIndex), `seg-end-${lastIndex}`));
  }

  return <span className={className}>{nodes}</span>;
};
