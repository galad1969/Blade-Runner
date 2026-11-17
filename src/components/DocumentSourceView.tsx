import React, { useEffect, useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { RuleChunk } from '../engine/vectorSearch';

interface DocumentSourceViewProps {
  docTitle: string;
  docSubtitle: string;
  chunks: RuleChunk[];
  highlightedChunkId: string | null;
  onBackToSearch: () => void;
  onOpenImport: () => void;
}

export const DocumentSourceView: React.FC<DocumentSourceViewProps> = ({
  docTitle,
  docSubtitle,
  chunks,
  highlightedChunkId,
  onBackToSearch,
  onOpenImport,
}) => {
  const [filterText, setFilterText] = useState('');

  useEffect(() => {
    if (highlightedChunkId) {
      const el = document.getElementById(`source-${highlightedChunkId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [highlightedChunkId]);

  const filteredChunks = chunks.filter((chunk) => {
    if (!filterText.trim()) return true;
    const q = filterText.toLowerCase();
    return (
      chunk.title.toLowerCase().includes(q) ||
      chunk.articleCode.toLowerCase().includes(q) ||
      chunk.section.toLowerCase().includes(q) ||
      chunk.ruleText.toLowerCase().includes(q) ||
      chunk.examples.some((ex) => ex.toLowerCase().includes(q))
    );
  });

  // Group sections for TOC
  const sections = Array.from(new Set(chunks.map((c) => c.section)));

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Top Action & Document Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-white/[0.08]">
        <div>
          <button
            type="button"
            onClick={onBackToSearch}
            className="inline-flex items-center gap-2 text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors mb-4 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Retour au moteur de recherche</span>
          </button>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-wide text-slate-50">
            {docTitle}
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            {docSubtitle} · {chunks.length} articles indexés
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filtrer un article..."
              className="bg-[#0E131C] border border-white/[0.1] focus:border-cyan-400/60 focus:outline-none text-sm text-slate-100 placeholder:text-slate-500 pl-9 pr-3 py-2 w-56 transition-colors"
            />
          </div>
          <button
            type="button"
            onClick={onOpenImport}
            className="px-4 py-2 text-xs font-medium bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Remplacer le texte
          </button>
        </div>
      </div>

      {/* 2-Column Editorial Layout: Sticky TOC + Full Rulebook Prose */}
      <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <aside className="lg:col-span-4 lg:sticky lg:top-24 bg-[#0B0F17] border border-white/[0.07] p-5">
          <h2 className="font-mono text-xs uppercase tracking-wider text-slate-400 pb-3 border-b border-white/[0.07]">
            Sommaire du document
          </h2>
          <nav className="mt-4 space-y-4 max-h-[65vh] overflow-y-auto pr-2">
            {sections.map((section) => {
              const sectionChunks = chunks.filter((c) => c.section === section);
              return (
                <div key={section}>
                  <p className="text-xs font-semibold text-slate-300 mb-1.5">
                    {section}
                  </p>
                  <ul className="space-y-1">
                    {sectionChunks.map((c) => {
                      const isHighlighted = highlightedChunkId === c.id;
                      return (
                        <li key={c.id}>
                          <a
                            href={`#source-${c.id}`}
                            className={`block text-xs py-1 transition-colors truncate ${
                              isHighlighted
                                ? 'text-amber-400 font-medium'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <span className="font-mono text-[11px] mr-1.5 opacity-80">
                              {c.articleCode}
                            </span>
                            {c.title}
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </nav>
        </aside>

        <div className="lg:col-span-8 space-y-6">
          {filteredChunks.length === 0 ? (
            <div className="bg-[#0E131C] border border-white/[0.08] p-8 text-center">
              <p className="text-sm text-slate-400">
                Aucun passage ne correspond à ce filtre dans le document source.
              </p>
            </div>
          ) : (
            filteredChunks.map((chunk) => {
              const isHighlighted = highlightedChunkId === chunk.id;
              return (
                <article
                  key={chunk.id}
                  id={`source-${chunk.id}`}
                  className={`p-6 border transition-all duration-200 ${
                    isHighlighted
                      ? 'bg-[#121824] border-amber-400/60 br-amber-glow'
                      : 'bg-[#0C1018] border-white/[0.07]'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                    <span className="font-mono text-amber-400">{chunk.articleCode}</span>
                    <span aria-hidden="true">·</span>
                    <span>{chunk.section}</span>
                  </div>
                  <h3 className="font-display text-2xl font-semibold text-slate-50">
                    {chunk.title}
                  </h3>
                  <p className="mt-3 text-[15px] leading-[1.7] text-slate-200 max-w-prose whitespace-pre-line">
                    {chunk.ruleText}
                  </p>
                  {chunk.examples.length > 0 && (
                    <div className="mt-4 bg-[#080B10] border border-white/[0.06] p-4">
                      <p className="text-xs font-mono uppercase tracking-wider text-cyan-300/85 mb-1.5">
                        Exemple
                      </p>
                      <div className="space-y-2 text-sm text-slate-300 leading-relaxed max-w-prose">
                        {chunk.examples.map((ex, i) => (
                          <p key={i}>{ex}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
};
