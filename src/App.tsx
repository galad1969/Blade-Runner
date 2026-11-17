import React, { useMemo, useRef, useState } from 'react';
import { BookOpen, Search, X } from 'lucide-react';
import { RULEBOOK_PRESETS, RulebookPreset } from './data/rulebooks';
import {
  buildVectorIndex,
  parseRuleDocument,
  searchVectorIndex,
} from './engine/vectorSearch';
import { ResultCard } from './components/ResultCard';
import { DocumentSourceView } from './components/DocumentSourceView';
import { MethodologyView } from './components/MethodologyView';
import { ImportModal } from './components/ImportModal';

type ActiveView = 'search' | 'source' | 'methodology';

export default function App() {
  const [documents, setDocuments] = useState<RulebookPreset[]>(RULEBOOK_PRESETS);
  const [activeDocId, setActiveDocId] = useState<string>(RULEBOOK_PRESETS[0].id);
  const [activeView, setActiveView] = useState<ActiveView>('search');

  const [query, setQuery] = useState<string>('');
  const [minThreshold, setMinThreshold] = useState<number>(15);
  const [highlightedChunkId, setHighlightedChunkId] = useState<string | null>(null);
  const [isImportOpen, setIsImportOpen] = useState<boolean>(false);

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const activeDoc = useMemo(
    () => documents.find((d) => d.id === activeDocId) || documents[0],
    [documents, activeDocId]
  );

  // Parse and vector-index the active source document synchronously in memory
  const vectorIndex = useMemo(() => {
    const chunks = parseRuleDocument(activeDoc.rawText, activeDoc.id);
    return buildVectorIndex(activeDoc.id, activeDoc.title, chunks);
  }, [activeDoc]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return searchVectorIndex(vectorIndex, query, minThreshold, 8);
  }, [vectorIndex, query, minThreshold]);

  const handleSelectDocument = (docId: string) => {
    setActiveDocId(docId);
    setHighlightedChunkId(null);
  };

  const handleSelectSampleQuestion = (question: string) => {
    setQuery(question);
    setActiveView('search');
    searchInputRef.current?.focus();
  };

  const handleInspectSource = (chunkId: string) => {
    setHighlightedChunkId(chunkId);
    setActiveView('source');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleImportDocument = (title: string, subtitle: string, rawText: string) => {
    const newId = `custom-${Date.now()}`;
    const customDoc: RulebookPreset = {
      id: newId,
      title,
      subtitle,
      category: 'Document importé',
      sampleQuestions: [],
      rawText,
    };
    setDocuments((prev) => [...prev, customDoc]);
    setActiveDocId(newId);
    setQuery('');
    setHighlightedChunkId(null);
    setActiveView('search');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchInputRef.current?.blur();
  };

  const sectionsList = useMemo(
    () => Array.from(new Set(vectorIndex.chunks.map((c) => c.chunk.section))),
    [vectorIndex]
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#07090D] text-slate-100 br-grid-backdrop">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-40 bg-[#07090D]/90 backdrop-blur-md border-b border-white/[0.08]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <button
            type="button"
            onClick={() => setActiveView('search')}
            className="font-display text-xl font-bold tracking-[0.1em] text-slate-50 hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            CODEX VECTEUR
          </button>

          {/* Zone 2: Clean single-line navigation links */}
          <nav
            aria-label="Navigation principale"
            className="hidden md:flex items-center gap-7 text-sm font-medium"
          >
            <button
              type="button"
              onClick={() => setActiveView('search')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b ${
                activeView === 'search'
                  ? 'text-amber-400 border-amber-400'
                  : 'text-slate-400 hover:text-slate-100 border-transparent'
              }`}
            >
              Recherche
            </button>
            <button
              type="button"
              onClick={() => setActiveView('source')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b ${
                activeView === 'source'
                  ? 'text-amber-400 border-amber-400'
                  : 'text-slate-400 hover:text-slate-100 border-transparent'
              }`}
            >
              Document source
            </button>
            <button
              type="button"
              onClick={() => setActiveView('methodology')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b ${
                activeView === 'methodology'
                  ? 'text-amber-400 border-amber-400'
                  : 'text-slate-400 hover:text-slate-100 border-transparent'
              }`}
            >
              Méthode vectorielle
            </button>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setIsImportOpen(true)}
              className="px-4 py-2 text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Importer un document
            </button>
          </div>
        </div>

        {/* Mobile Secondary Navigation Row (strictly compact) */}
        <div className="md:hidden border-t border-white/[0.06] px-4 py-2 flex items-center justify-around text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveView('search')}
            className={`py-1 px-2 cursor-pointer ${
              activeView === 'search' ? 'text-amber-400' : 'text-slate-400'
            }`}
          >
            Recherche
          </button>
          <button
            type="button"
            onClick={() => setActiveView('source')}
            className={`py-1 px-2 cursor-pointer ${
              activeView === 'source' ? 'text-amber-400' : 'text-slate-400'
            }`}
          >
            Document source
          </button>
          <button
            type="button"
            onClick={() => setActiveView('methodology')}
            className={`py-1 px-2 cursor-pointer ${
              activeView === 'methodology' ? 'text-amber-400' : 'text-slate-400'
            }`}
          >
            Méthode
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {activeView === 'search' && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-20">
            {/* Editorial Headline & Clarity */}
            <div className="max-w-2xl">
              <h1
                className="font-display text-4xl sm:text-5xl font-semibold tracking-wide text-slate-50 leading-[1.08]"
                style={{ textWrap: 'balance' }}
              >
                Interroger un point de règle
              </h1>
              <p className="mt-3 text-base text-slate-300 leading-relaxed">
                Posez votre question en français. Le moteur vectoriel identifie les articles
                les plus pertinents du document source avec exemples et indice de concordance.
              </p>
            </div>

            {/* Active Source Document Selector */}
            <div className="mt-8">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
                <span className="text-xs font-medium text-slate-400">
                  Corpus source actif
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setHighlightedChunkId(null);
                    setActiveView('source');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-cyan-300 hover:text-cyan-200 transition-colors cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Consulter le texte intégral ({vectorIndex.chunks.length} articles)</span>
                </button>
              </div>

              <div
                role="tablist"
                aria-label="Choix du document source"
                className="flex flex-wrap gap-2"
              >
                {documents.map((doc) => {
                  const isActive = doc.id === activeDoc.id;
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => handleSelectDocument(doc.id)}
                      className={`px-3.5 py-2 text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
                        isActive
                          ? 'bg-[#131925] border-amber-400/60 text-amber-300'
                          : 'bg-[#0B0E15] border-white/[0.08] text-slate-400 hover:text-slate-200 hover:border-white/[0.16]'
                      }`}
                    >
                      {doc.title}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Search Input Form */}
            <form onSubmit={handleSearchSubmit} className="mt-6">
              <div className="flex flex-col sm:flex-row items-stretch bg-[#0C1018] border border-white/[0.14] focus-within:border-amber-400/75 focus-within:br-amber-glow transition-all">
                <div className="relative flex-1 flex items-center">
                  <Search className="w-4 h-4 text-slate-400 ml-4 shrink-0 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ex : Que se passe-t-il en cas d’égalité à la fin de la partie ?"
                    aria-label="Votre question sur un point de règle"
                    className="w-full bg-transparent px-3.5 py-4 text-base text-slate-50 placeholder:text-slate-500 focus:outline-none"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuery('');
                        searchInputRef.current?.focus();
                      }}
                      aria-label="Effacer la question"
                      className="p-2 mr-1 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  className="px-7 py-3.5 sm:py-0 bg-amber-500 hover:bg-amber-400 text-[#07090D] font-semibold text-sm tracking-wide transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  Rechercher
                </button>
              </div>
            </form>

            {/* Sample Questions or Active Search Results */}
            {!query.trim() ? (
              <div className="mt-10 space-y-10">
                {activeDoc.sampleQuestions.length > 0 && (
                  <div>
                    <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3">
                      Questions fréquentes sur ce document
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {activeDoc.sampleQuestions.map((sample, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectSampleQuestion(sample)}
                          className="text-left p-4 bg-[#0B0E15] hover:bg-[#111622] border border-white/[0.08] hover:border-cyan-400/45 text-sm text-slate-200 leading-snug transition-colors cursor-pointer"
                        >
                          {sample}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Document Structure Overview */}
                <div className="pt-8 border-t border-white/[0.07]">
                  <div className="flex items-baseline justify-between gap-4 mb-4">
                    <h2 className="font-display text-2xl font-semibold text-slate-100">
                      Structure du document indexé
                    </h2>
                    <span className="font-mono text-xs text-slate-400 tabular-nums">
                      {vectorIndex.chunks.length} articles · {vectorIndex.vocabSize} racines
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 mb-5">
                    {activeDoc.subtitle}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {sectionsList.map((sec) => {
                      const count = vectorIndex.chunks.filter(
                        (c) => c.chunk.section === sec
                      ).length;
                      const firstChunk = vectorIndex.chunks.find(
                        (c) => c.chunk.section === sec
                      )?.chunk;
                      return (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => firstChunk && handleInspectSource(firstChunk.id)}
                          className="text-left p-4 bg-[#0A0D13] hover:bg-[#0F141E] border border-white/[0.07] hover:border-white/[0.16] transition-colors cursor-pointer"
                        >
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="text-sm font-medium text-slate-100">
                              {sec}
                            </span>
                            <span className="font-mono text-xs text-amber-400 tabular-nums shrink-0">
                              {count} art.
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-10">
                {/* Results Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
                  <div className="text-sm text-slate-300">
                    <span className="font-mono font-semibold text-amber-400 tabular-nums">
                      {results.length}
                    </span>{' '}
                    {results.length > 1
                      ? 'règles pertinentes classées par concordance'
                      : results.length === 1
                        ? 'règle pertinente trouvée'
                        : 'résultat au-dessus du seuil'}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <label htmlFor="threshold-select" className="whitespace-nowrap">
                      Seuil minimal :
                    </label>
                    <select
                      id="threshold-select"
                      value={minThreshold}
                      onChange={(e) => setMinThreshold(Number(e.target.value))}
                      className="bg-[#0C1018] border border-white/[0.12] text-slate-200 font-mono text-xs px-2.5 py-1 focus:outline-none focus:border-cyan-400/60"
                    >
                      <option value={5}>5 % (large)</option>
                      <option value={15}>15 % (équilibré)</option>
                      <option value={35}>35 % (strict)</option>
                    </select>
                  </div>
                </div>

                {/* Result List or Empty State */}
                {results.length === 0 ? (
                  <div className="mt-6 bg-[#0C1018] border border-white/[0.08] p-8 text-center">
                    <p className="font-display text-2xl font-semibold text-slate-100">
                      Aucune correspondance suffisante
                    </p>
                    <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                      Aucun article de « {activeDoc.title} » n’atteint {minThreshold} % de
                      concordance pour cette requête. Reformulez avec d’autres termes ou
                      abaissez le seuil minimal.
                    </p>
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                      {minThreshold > 5 && (
                        <button
                          type="button"
                          onClick={() => setMinThreshold(5)}
                          className="px-4 py-2 text-xs font-medium bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 transition-colors cursor-pointer"
                        >
                          Élargir le seuil à 5 %
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveView('source')}
                        className="px-4 py-2 text-xs font-medium bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 border border-white/[0.1] transition-colors cursor-pointer"
                      >
                        Parcourir le document source
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 space-y-5">
                    {results.map((result, idx) => (
                      <ResultCard
                        key={result.chunk.id}
                        result={result}
                        rank={idx + 1}
                        onInspectSource={handleInspectSource}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeView === 'source' && (
          <DocumentSourceView
            docTitle={activeDoc.title}
            docSubtitle={activeDoc.subtitle}
            chunks={vectorIndex.chunks.map((c) => c.chunk)}
            highlightedChunkId={highlightedChunkId}
            onBackToSearch={() => setActiveView('search')}
            onOpenImport={() => setIsImportOpen(true)}
          />
        )}

        {activeView === 'methodology' && (
          <MethodologyView
            index={vectorIndex}
            onBackToSearch={() => setActiveView('search')}
          />
        )}
      </main>

      {/* Quiet Editorial Footer */}
      <footer className="border-t border-white/[0.07] py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <span>CODEX VECTEUR · Indexation et recherche vectorielle statique en français</span>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => setActiveView('source')}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              Document source
            </button>
            <button
              type="button"
              onClick={() => setActiveView('methodology')}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              Méthode vectorielle
            </button>
            <button
              type="button"
              onClick={() => setIsImportOpen(true)}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              Importer un document
            </button>
          </div>
        </div>
      </footer>

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportDocument={handleImportDocument}
      />
    </div>
  );
}
