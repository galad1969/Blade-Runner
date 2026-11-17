import React, { useEffect, useRef } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { RuleChunk } from '../engine/vectorSearch';
import { HighlightedText } from './HighlightedText';

interface SourcePreviewModalProps {
  isOpen: boolean;
  docTitle: string;
  chunks: RuleChunk[];
  activeChunkId: string | null;
  matchedTerms: string[];
  availablePages?: Set<number>;
  onSelectChunkId: (chunkId: string) => void;
  onJumpToPage?: (pageNum: number) => void;
  onOpenInDocumentTab: (chunkId: string) => void;
  onClose: () => void;
}

export const SourcePreviewModal: React.FC<SourcePreviewModalProps> = ({
  isOpen,
  docTitle,
  chunks,
  activeChunkId,
  matchedTerms,
  availablePages,
  onSelectChunkId,
  onJumpToPage,
  onOpenInDocumentTab,
  onClose,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [isOpen, activeChunkId]);

  if (!isOpen || !activeChunkId) return null;

  const currentIndex = chunks.findIndex((c) => c.id === activeChunkId);
  if (currentIndex === -1) return null;

  const currentChunk = chunks[currentIndex];
  const prevChunk = currentIndex > 0 ? chunks[currentIndex - 1] : null;
  const nextChunk = currentIndex < chunks.length - 1 ? chunks[currentIndex + 1] : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="source-popup-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl bg-[#0C1018] border border-white/[0.16] shadow-2xl max-h-[90vh] flex flex-col">
        {/* Popup Header */}
        <div className="flex items-start justify-between gap-4 px-5 sm:px-6 py-4 border-b border-white/[0.08]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400">
              <span className="truncate max-w-[200px] sm:max-w-xs text-slate-300 font-medium">
                {docTitle}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-amber-400">{currentChunk.articleCode}</span>
              {currentChunk.pageNumber && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-cyan-300">
                    Page {currentChunk.pageNumber}
                  </span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums text-slate-500">
                {currentIndex + 1} / {chunks.length}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400 truncate">{currentChunk.section}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la fenêtre"
            className="min-w-[44px] min-h-[44px] -mr-2 -mt-1 flex items-center justify-center text-slate-400 hover:text-slate-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Passage Content */}
        <div
          ref={scrollContainerRef}
          className="px-5 sm:px-6 py-5 overflow-y-auto space-y-5"
        >
          <div className="bg-[#111622] border border-amber-400/40 p-5 sm:p-6">
            <h2
              id="source-popup-title"
              className="font-display text-2xl sm:text-3xl font-semibold text-slate-50 leading-snug"
            >
              <HighlightedText text={currentChunk.title} matchedTerms={matchedTerms} />
            </h2>

            <div className="mt-4 text-[15px] leading-[1.75] text-slate-100 max-w-prose whitespace-pre-line">
              <HighlightedText
                text={currentChunk.ruleText}
                matchedTerms={matchedTerms}
                availablePages={availablePages}
                onJumpToPage={onJumpToPage}
              />
            </div>

            {currentChunk.examples.length > 0 && (
              <div className="mt-5 bg-[#080B10] border border-white/[0.08] p-4">
                <p className="text-xs font-mono uppercase tracking-wider text-cyan-300/90 mb-2">
                  Exemple issu du document source
                </p>
                <div className="space-y-2.5 text-sm leading-relaxed text-slate-300 max-w-prose">
                  {currentChunk.examples.map((ex, i) => (
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
          </div>

          {/* Surrounding context quick previews */}
          {(prevChunk || nextChunk) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {prevChunk ? (
                <button
                  type="button"
                  onClick={() => onSelectChunkId(prevChunk.id)}
                  className="text-left p-3.5 bg-[#090C12] hover:bg-[#101520] border border-white/[0.07] hover:border-white/[0.16] transition-colors cursor-pointer"
                >
                  <span className="block text-[11px] font-mono text-slate-400 mb-1">
                    ← Article précédent · {prevChunk.articleCode}
                  </span>
                  <span className="block text-xs font-medium text-slate-200 truncate">
                    {prevChunk.title}
                  </span>
                </button>
              ) : (
                <div />
              )}

              {nextChunk && (
                <button
                  type="button"
                  onClick={() => onSelectChunkId(nextChunk.id)}
                  className="text-left p-3.5 bg-[#090C12] hover:bg-[#101520] border border-white/[0.07] hover:border-white/[0.16] transition-colors cursor-pointer"
                >
                  <span className="block text-[11px] font-mono text-slate-400 mb-1">
                    Article suivant · {nextChunk.articleCode} →
                  </span>
                  <span className="block text-xs font-medium text-slate-200 truncate">
                    {nextChunk.title}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-white/[0.08] bg-[#090C12] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!prevChunk}
              onClick={() => prevChunk && onSelectChunkId(prevChunk.id)}
              aria-label="Article précédent"
              className="inline-flex items-center gap-1 min-h-[44px] px-3 text-xs font-medium bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-slate-200 transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Précédent</span>
            </button>
            <button
              type="button"
              disabled={!nextChunk}
              onClick={() => nextChunk && onSelectChunkId(nextChunk.id)}
              aria-label="Article suivant"
              className="inline-flex items-center gap-1 min-h-[44px] px-3 text-xs font-medium bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-slate-200 transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
            >
              <span className="hidden sm:inline">Suivant</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenInDocumentTab(currentChunk.id);
              }}
              className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 text-xs font-medium text-cyan-300 hover:text-cyan-200 transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>Onglet Document</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-[#07090D] transition-colors cursor-pointer whitespace-nowrap"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
