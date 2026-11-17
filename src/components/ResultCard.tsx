import React, { useState } from 'react';
import { ArrowUpRight, ChevronDown, ChevronUp } from 'lucide-react';
import { SearchResult } from '../engine/vectorSearch';
import { HighlightedText } from './HighlightedText';

interface ResultCardProps {
  result: SearchResult;
  rank: number;
  availablePages?: Set<number>;
  onInspectSource: (chunkId: string) => void;
  onJumpToPage?: (pageNum: number) => void;
}

function getConcordanceLabel(score: number): {
  label: string;
  textColor: string;
  barColor: string;
} {
  if (score >= 70) {
    return {
      label: 'Concordance élevée',
      textColor: 'text-amber-400',
      barColor: 'bg-amber-400',
    };
  }
  if (score >= 42) {
    return {
      label: 'Concordance modérée',
      textColor: 'text-cyan-300',
      barColor: 'bg-cyan-400',
    };
  }
  return {
    label: 'Concordance partielle',
    textColor: 'text-slate-400',
    barColor: 'bg-slate-500',
  };
}

export const ResultCard: React.FC<ResultCardProps> = ({
  result,
  rank,
  availablePages,
  onInspectSource,
  onJumpToPage,
}) => {
  const [showVectorDetails, setShowVectorDetails] = useState(false);
  const {
    chunk,
    concordance,
    rawCosine,
    breakdown,
    matchedTerms,
    matchedConcepts,
    exactPhrasesMatched,
  } = result;
  const status = getConcordanceLabel(concordance);
  const formattedScore = concordance.toFixed(1).replace('.', ',');

  return (
    <article
      className={`bg-[#0E131C] border transition-colors duration-150 p-6 md:p-7 ${
        rank === 1
          ? 'border-amber-500/35'
          : 'border-white/[0.08] hover:border-white/[0.16]'
      }`}
    >
      {/* Top row: Unboxed metadata & Concordance readout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.07]">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400">
          <span className="font-mono font-medium text-amber-400 tabular-nums">
            #{String(rank).padStart(2, '0')}
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono text-slate-200">{chunk.articleCode}</span>
          {chunk.pageNumber && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-cyan-300 tabular-nums">
                Page {chunk.pageNumber}
              </span>
            </>
          )}
          <span aria-hidden="true">·</span>
          <span className="text-slate-400">{chunk.section}</span>
          {exactPhrasesMatched && exactPhrasesMatched.length > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-cyan-300 font-medium">
                Expression exacte
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <div className="flex items-baseline gap-2 justify-end">
              <span className="text-xs text-slate-400">{status.label}</span>
              <span
                className={`font-mono text-lg font-semibold tabular-nums ${status.textColor}`}
              >
                {formattedScore} %
              </span>
            </div>
            <div className="w-36 h-1 bg-slate-800/90 mt-1.5 overflow-hidden">
              <div
                className={`h-full ${status.barColor} transition-all duration-300`}
                style={{ width: `${Math.min(100, Math.max(2, concordance))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Article Title */}
      <h3 className="mt-5 font-display text-2xl font-semibold tracking-wide text-slate-50 leading-snug">
        <HighlightedText text={chunk.title} matchedTerms={matchedTerms} />
      </h3>

      {/* Core Rule Body */}
      <div className="mt-3 text-[15px] leading-[1.7] text-slate-200 max-w-prose whitespace-pre-line">
        <HighlightedText
          text={chunk.ruleText}
          matchedTerms={matchedTerms}
          availablePages={availablePages}
          onJumpToPage={onJumpToPage}
        />
      </div>

      {/* Examples extracted from source document */}
      {chunk.examples.length > 0 && (
        <div className="mt-5 bg-[#090C12] border border-white/[0.07] p-4 md:p-5">
          <p className="text-xs font-mono uppercase tracking-wider text-cyan-300/90 mb-2">
            Exemple issu du document source
          </p>
          <div className="space-y-2.5 text-sm leading-relaxed text-slate-300 max-w-prose">
            {chunk.examples.map((ex, i) => (
              <p key={i}>
                <HighlightedText
                  text={ex}
                  matchedTerms={matchedTerms}
                  availablePages={availablePages}
                  onJumpToPage={onJumpToPage}
                />
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Footer Actions & Vector Inspector Toggle */}
      <div className="mt-5 pt-3 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setShowVectorDetails((prev) => !prev)}
          className="inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-[32px] text-xs font-medium text-slate-400 hover:text-slate-100 transition-colors cursor-pointer py-1"
        >
          <span>Détail de concordance vectorielle</span>
          {showVectorDetails ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>

        <button
          type="button"
          onClick={() => onInspectSource(chunk.id)}
          className="inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-[32px] text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors cursor-pointer whitespace-nowrap shrink-0 py-1"
        >
          <span>Voir dans le document source</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Expandable Vector Space Breakdown */}
      {showVectorDetails && (
        <div className="mt-4 pt-4 border-t border-white/[0.06] grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-slate-400">
              <span>Score cosinus composite brut</span>
              <span className="font-mono text-slate-200 tabular-nums">
                {rawCosine.toFixed(3).replace('.', ',')}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Lexical TF-IDF</span>
                <span className="font-mono text-slate-200 tabular-nums">
                  {breakdown.lexical} %
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Concepts sémantiques</span>
                <span className="font-mono text-slate-200 tabular-nums">
                  {breakdown.semantic} %
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Sous-mots (3-grammes)</span>
                <span className="font-mono text-slate-200 tabular-nums">
                  {breakdown.subword} %
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Bigrammes</span>
                <span className="font-mono text-slate-200 tabular-nums">
                  {breakdown.bigram} %
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <span className="text-slate-400 block mb-1">Termes alignés :</span>
              <span className="text-cyan-300 font-mono leading-relaxed">
                {matchedTerms.length > 0
                  ? matchedTerms.join(' · ')
                  : 'Correspondance sémantique / sous-mots'}
              </span>
            </div>
            {matchedConcepts.length > 0 && (
              <div>
                <span className="text-slate-400 block mb-1">Dimensions conceptuelles :</span>
                <span className="text-amber-300/90 leading-relaxed">
                  {matchedConcepts.join(' · ')}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  );
};
