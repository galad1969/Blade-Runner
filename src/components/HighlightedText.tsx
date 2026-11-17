import React from 'react';
import { stripAccents } from '../engine/vectorSearch';

interface HighlightedTextProps {
  text: string;
  matchedTerms: string[];
  className?: string;
}

export const HighlightedText: React.FC<HighlightedTextProps> = ({
  text,
  matchedTerms,
  className = '',
}) => {
  if (!matchedTerms || matchedTerms.length === 0) {
    return <span className={className}>{text}</span>;
  }

  // Build accent-insensitive normalized lookup set for fast, accurate highlighting
  const normalizedSet = new Set(
    matchedTerms
      .map((t) => stripAccents(t.toLowerCase()))
      .filter((t) => t.length >= 2)
  );

  if (normalizedSet.size === 0) {
    return <span className={className}>{text}</span>;
  }

  // Split preserving all punctuation and whitespace
  const parts = text.split(/([A-Za-zÀ-ÖØ-öø-ÿ0-9]+)/g);

  return (
    <span className={className}>
      {parts.map((part, idx) => {
        if (idx % 2 === 1) {
          const norm = stripAccents(part.toLowerCase());
          if (normalizedSet.has(norm)) {
            return (
              <mark
                key={idx}
                className="bg-cyan-400/15 text-cyan-200 px-0.5 rounded-[2px] border-b border-cyan-400/40 font-medium"
              >
                {part}
              </mark>
            );
          }
        }
        return <React.Fragment key={idx}>{part}</React.Fragment>;
      })}
    </span>
  );
};
