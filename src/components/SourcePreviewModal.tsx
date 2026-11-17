import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Crosshair, X } from 'lucide-react';
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
  onClose: () => void;
}

type PopupViewMode = 'page' | 'chunk' | 'full';

export const SourcePreviewModal: React.FC<SourcePreviewModalProps> = ({
  isOpen,
  docTitle,
  chunks,
  activeChunkId,
  matchedTerms,
  availablePages,
  onSelectChunkId,
  onJumpToPage,
  onClose,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const selectedBlockRef = useRef<HTMLDivElement | null>(null);
  const [viewMode, setViewMode] = useState<PopupViewMode>('page');

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const currentIndex = useMemo(
    () => chunks.findIndex((c) => c.id === activeChunkId),
    [chunks, activeChunkId]
  );

  const currentChunk = currentIndex >= 0 ? chunks[currentIndex] : null;
  const pageNumber = currentChunk?.pageNumber;

  const samePageChunks = useMemo(() => {
    if (!pageNumber) return [];
    return chunks.filter((c) => c.pageNumber === pageNumber);
  }, [chunks, pageNumber]);

  const hasFullPageView = Boolean(pageNumber && samePageChunks.length > 0);

  // Reset to page/chunk mode whenever modal opens freshly
  useEffect(() => {
    if (isOpen) {
      setViewMode(hasFullPageView ? 'page' : 'chunk');
    }
  }, [isOpen, hasFullPageView]);

  const effectiveMode: PopupViewMode =
    viewMode === 'page' && !hasFullPageView ? 'chunk' : viewMode;

  const scrollToSelected = (instant = false) => {
    requestAnimationFrame(() => {
      if (selectedBlockRef.current) {
        selectedBlockRef.current.scrollIntoView({
          behavior: instant ? 'auto' : 'smooth',
          block: effectiveMode === 'full' ? 'start' : 'center',
        });
      }
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    if (effectiveMode === 'full' || effectiveMode === 'page') {
      scrollToSelected(effectiveMode === 'full');
    } else if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [isOpen, activeChunkId, effectiveMode]);

  const sectionsWithFirstChunk = useMemo(() => {
    const seen = new Set<string>();
    const list: { section: string; chunkId: string }[] = [];
    for (const c of chunks) {
      if (!seen.has(c.section)) {
        seen.add(c.section);
        list.push({ section: c.section, chunkId: c.id });
      }
    }
    return list;
  }, [chunks]);

  if (!isOpen || !currentChunk) return null;

  const prevChunk = currentIndex > 0 ? chunks[currentIndex - 1] : null;
  const nextChunk = currentIndex < chunks.length - 1 ? chunks[currentIndex + 1] : null;

  const prevPageChunk = pageNumber
    ? [...chunks]
        .reverse()
        .find((c) => c.pageNumber !== undefined && c.pageNumber < pageNumber) ?? null
    : null;
  const nextPageChunk = pageNumber
    ? chunks.find((c) => c.pageNumber !== undefined && c.pageNumber > pageNumber) ?? null
    : null;

  const handleJumpSectionInFull = (chunkId: string) => {
    const el = document.getElementById(`full-popup-${chunkId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

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
      <div
        className={`w-full bg-[#0C1018] border border-white/[0.16] shadow-2xl flex flex-col transition-[max-width] duration-150 ${
          effectiveMode === 'full'
            ? 'max-w-4xl h-[92vh] sm:h-[88vh]'
            : 'max-w-2xl max-h-[90vh]'
        }`}
      >
        {/* Popup Header */}
        <div className="flex items-start justify-between gap-4 px-5 sm:px-6 py-4 border-b border-white/[0.08] shrink-0">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400">
              <span className="truncate max-w-[180px] sm:max-w-xs text-slate-300 font-medium">
                {docTitle}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-amber-400">{currentChunk.articleCode}</span>
              {pageNumber && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono font-semibold text-cyan-300">
                    Page {pageNumber}
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

        {/* Mode Bar: Passage / Page / Document complet */}
        <div className="px-5 sm:px-6 py-2.5 bg-[#090C12] border-b border-white/[0.07] flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="inline-flex flex-wrap bg-[#07090D] border border-white/[0.08] p-0.5">
            {hasFullPageView && (
              <button
                type="button"
                onClick={() => setViewMode('page')}
                className={`min-h-[36px] px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  effectiveMode === 'page'
                    ? 'bg-[#141B29] text-cyan-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Page {pageNumber} ({samePageChunks.length})
              </button>
            )}
            <button
              type="button"
              onClick={() => setViewMode('chunk')}
              className={`min-h-[36px] px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                effectiveMode === 'chunk'
                  ? 'bg-[#141B29] text-amber-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Passage sélectionné
            </button>
            <button
              type="button"
              onClick={() => setViewMode('full')}
              className={`min-h-[36px] px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                effectiveMode === 'full'
                  ? 'bg-[#141B29] text-amber-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Document complet ({chunks.length})
            </button>
          </div>

          {effectiveMode === 'full' && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {sectionsWithFirstChunk.length > 1 && (
                <select
                  aria-label="Aller à une section"
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) handleJumpSectionInFull(e.target.value);
                  }}
                  className="flex-1 sm:flex-initial sm:max-w-[200px] min-h-[36px] bg-[#0C1018] border border-white/[0.12] text-slate-200 text-xs px-2.5 py-1 focus:outline-none focus:border-cyan-400/60"
                >
                  <option value="" disabled>
                    Aller à une section…
                  </option>
                  {sectionsWithFirstChunk.map((item) => (
                    <option key={item.chunkId} value={item.chunkId}>
                      {item.section}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                onClick={() => scrollToSelected(false)}
                title="Recentrer sur le passage sélectionné"
                className="inline-flex items-center gap-1.5 min-h-[36px] px-3 text-xs font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/35 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>Passage ciblé</span>
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Content */}
        <div
          ref={scrollContainerRef}
          className="px-5 sm:px-6 py-5 overflow-y-auto space-y-4 flex-1"
        >
          {effectiveMode === 'full' ? (
            chunks.map((chunkItem, idx) => {
              const isSelected = chunkItem.id === currentChunk.id;
              const prevSection = idx > 0 ? chunks[idx - 1].section : null;
              const showSectionHeader = chunkItem.section !== prevSection;

              return (
                <React.Fragment key={chunkItem.id}>
                  {showSectionHeader && (
                    <div className="pt-4 first:pt-0 pb-1 border-b border-white/[0.08]">
                      <p className="font-mono text-xs uppercase tracking-wider text-cyan-300/90">
                        {chunkItem.section}
                      </p>
                    </div>
                  )}
                  <div
                    id={`full-popup-${chunkItem.id}`}
                    ref={isSelected ? selectedBlockRef : undefined}
                    className={`scroll-mt-4 p-5 transition-colors border ${
                      isSelected
                        ? 'bg-[#111622] border-amber-400/65 br-amber-glow'
                        : 'bg-[#090C12] border-white/[0.07]'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono ${
                            isSelected ? 'text-amber-400 font-semibold' : 'text-slate-400'
                          }`}
                        >
                          {chunkItem.articleCode}
                        </span>
                        {chunkItem.pageNumber && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono text-cyan-300 tabular-nums">
                              Page {chunkItem.pageNumber}
                            </span>
                          </>
                        )}
                      </div>
                      {isSelected && (
                        <span className="font-mono text-[11px] text-amber-300">
                          Passage sélectionné
                        </span>
                      )}
                    </div>

                    <h3
                      id={isSelected ? 'source-popup-title' : undefined}
                      className={`font-display text-xl sm:text-2xl font-semibold leading-snug ${
                        isSelected ? 'text-slate-50' : 'text-slate-200'
                      }`}
                    >
                      {isSelected ? (
                        <HighlightedText
                          text={chunkItem.title}
                          matchedTerms={matchedTerms}
                        />
                      ) : (
                        chunkItem.title
                      )}
                    </h3>

                    <div
                      className={`mt-3 text-[15px] leading-[1.7] max-w-prose whitespace-pre-line ${
                        isSelected ? 'text-slate-100' : 'text-slate-300'
                      }`}
                    >
                      {isSelected ? (
                        <HighlightedText
                          text={chunkItem.ruleText}
                          matchedTerms={matchedTerms}
                          availablePages={availablePages}
                          onJumpToPage={onJumpToPage}
                        />
                      ) : (
                        chunkItem.ruleText
                      )}
                    </div>

                    {chunkItem.examples.length > 0 && (
                      <div className="mt-4 bg-[#07090D] border border-white/[0.07] p-4">
                        <p className="text-xs font-mono uppercase tracking-wider text-cyan-300/90 mb-1.5">
                          Exemple issu du document source
                        </p>
                        <div className="space-y-2 text-sm leading-relaxed text-slate-300 max-w-prose">
                          {chunkItem.examples.map((ex, i) => (
                            <p key={i}>
                              {isSelected ? (
                                <HighlightedText
                                  text={ex}
                                  matchedTerms={matchedTerms}
                                  availablePages={availablePages}
                                  onJumpToPage={onJumpToPage}
                                />
                              ) : (
                                ex
                              )}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </React.Fragment>
              );
            })
          ) : effectiveMode === 'page' ? (
            samePageChunks.map((chunkItem) => {
              const isSelected = chunkItem.id === currentChunk.id;
              return (
                <div
                  key={chunkItem.id}
                  ref={isSelected ? selectedBlockRef : undefined}
                  onClick={() => {
                    if (!isSelected) onSelectChunkId(chunkItem.id);
                  }}
                  className={`p-5 transition-colors border ${
                    isSelected
                      ? 'bg-[#111622] border-amber-400/55 br-amber-glow'
                      : 'bg-[#090C12] border-white/[0.07] hover:border-white/[0.15] cursor-pointer'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono ${
                          isSelected ? 'text-amber-400 font-semibold' : 'text-slate-400'
                        }`}
                      >
                        {chunkItem.articleCode}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate max-w-[240px]">{chunkItem.section}</span>
                    </div>
                    {isSelected && (
                      <span className="font-mono text-[11px] text-amber-300">
                        Résultat sélectionné
                      </span>
                    )}
                  </div>

                  <h3
                    id={isSelected ? 'source-popup-title' : undefined}
                    className={`font-display text-xl sm:text-2xl font-semibold leading-snug ${
                      isSelected ? 'text-slate-50' : 'text-slate-200'
                    }`}
                  >
                    <HighlightedText
                      text={chunkItem.title}
                      matchedTerms={isSelected ? matchedTerms : []}
                    />
                  </h3>

                  <div
                    className={`mt-3 text-[15px] leading-[1.7] max-w-prose whitespace-pre-line ${
                      isSelected ? 'text-slate-100' : 'text-slate-300'
                    }`}
                  >
                    <HighlightedText
                      text={chunkItem.ruleText}
                      matchedTerms={isSelected ? matchedTerms : []}
                      availablePages={availablePages}
                      onJumpToPage={onJumpToPage}
                    />
                  </div>

                  {chunkItem.examples.length > 0 && (
                    <div className="mt-4 bg-[#07090D] border border-white/[0.07] p-4">
                      <p className="text-xs font-mono uppercase tracking-wider text-cyan-300/90 mb-1.5">
                        Exemple issu du document source
                      </p>
                      <div className="space-y-2 text-sm leading-relaxed text-slate-300 max-w-prose">
                        {chunkItem.examples.map((ex, i) => (
                          <p key={i}>
                            <HighlightedText
                              text={ex}
                              matchedTerms={isSelected ? matchedTerms : []}
                              availablePages={availablePages}
                              onJumpToPage={onJumpToPage}
                            />
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <>
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

              {(prevChunk || nextChunk) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {prevChunk ? (
                    <button
                      type="button"
                      onClick={() => onSelectChunkId(prevChunk.id)}
                      className="text-left p-3.5 bg-[#090C12] hover:bg-[#101520] border border-white/[0.07] hover:border-white/[0.16] transition-colors cursor-pointer"
                    >
                      <span className="block text-[11px] font-mono text-slate-400 mb-1">
                        ← Précédent · {prevChunk.articleCode}
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
                        Suivant · {nextChunk.articleCode} →
                      </span>
                      <span className="block text-xs font-medium text-slate-200 truncate">
                        {nextChunk.title}
                      </span>
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Controls */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-white/[0.08] bg-[#090C12] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {effectiveMode === 'page' && pageNumber ? (
              <>
                <button
                  type="button"
                  disabled={!prevPageChunk}
                  onClick={() => prevPageChunk && onSelectChunkId(prevPageChunk.id)}
                  className="inline-flex items-center gap-1 min-h-[44px] px-3 text-xs font-medium bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-slate-200 transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>
                    {prevPageChunk?.pageNumber
                      ? `Page ${prevPageChunk.pageNumber}`
                      : 'Page préc.'}
                  </span>
                </button>
                <button
                  type="button"
                  disabled={!nextPageChunk}
                  onClick={() => nextPageChunk && onSelectChunkId(nextPageChunk.id)}
                  className="inline-flex items-center gap-1 min-h-[44px] px-3 text-xs font-medium bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-slate-200 transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                >
                  <span>
                    {nextPageChunk?.pageNumber
                      ? `Page ${nextPageChunk.pageNumber}`
                      : 'Page suiv.'}
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {effectiveMode !== 'full' && (
              <button
                type="button"
                onClick={() => setViewMode('full')}
                className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 text-xs font-medium text-cyan-300 hover:text-cyan-200 transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>Onglet Document</span>
              </button>
            )}
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
