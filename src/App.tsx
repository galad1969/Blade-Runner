import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Cpu,
  FileUp,
  Link2,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  buildVectorIndex,
  parseQueryPhrases,
  parseRuleDocument,
  searchVectorIndex,
} from './engine/vectorSearch';
import { extractTextFromPdfBuffer } from './engine/pdfParser';
import {
  getLinkedFileHandle,
  loadAllDocuments,
  removeDocument,
  saveDocument,
  supportsFileSystemAccess,
  UserDocument,
} from './engine/storage';
import { ResultCard } from './components/ResultCard';
import { DocumentSourceView } from './components/DocumentSourceView';
import { MethodologyView } from './components/MethodologyView';
import { ImportedDocPayload, ImportModal } from './components/ImportModal';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { OfflineIndicator } from './components/OfflineIndicator';
import { SourcePreviewModal } from './components/SourcePreviewModal';
import {
  SectionFilterDropdown,
  SectionOption,
} from './components/SectionFilterDropdown';

type ActiveView = 'search' | 'source' | 'methodology';

export default function App() {
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState<boolean>(true);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('search');

  const [query, setQuery] = useState<string>('');
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [minThreshold, setMinThreshold] = useState<number>(15);
  const [highlightedChunkId, setHighlightedChunkId] = useState<string | null>(null);
  const [popupChunkId, setPopupChunkId] = useState<string | null>(null);
  const [popupMatchedTerms, setPopupMatchedTerms] = useState<string[]>([]);
  const [isImportOpen, setIsImportOpen] = useState<boolean>(false);
  const [isDraggingDropzone, setIsDraggingDropzone] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [quickExtractProgress, setQuickExtractProgress] = useState<{
    fileName: string;
    current: number;
    total: number;
  } | null>(null);
  const [isReloadingLinked, setIsReloadingLinked] = useState<boolean>(false);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const quickFileInputRef = useRef<HTMLInputElement | null>(null);

  const canLinkLocalFile = useMemo(() => supportsFileSystemAccess(), []);

  useEffect(() => {
    let active = true;
    loadAllDocuments().then((loaded) => {
      if (!active) return;
      setDocuments(loaded);
      if (loaded.length > 0) {
        setActiveDocId(loaded[0].id);
      }
      setIsLoadingDocs(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const activeDoc = useMemo(
    () => documents.find((d) => d.id === activeDocId) ?? documents[0] ?? null,
    [documents, activeDocId]
  );

  const vectorIndex = useMemo(() => {
    if (!activeDoc) return null;
    const chunks = parseRuleDocument(activeDoc.rawText, activeDoc.id);
    return buildVectorIndex(activeDoc.id, activeDoc.title, chunks);
  }, [activeDoc]);

  const results = useMemo(() => {
    if (!vectorIndex || !query.trim()) return [];
    return searchVectorIndex(
      vectorIndex,
      query,
      minThreshold,
      8,
      selectedSections
    );
  }, [vectorIndex, query, minThreshold, selectedSections]);

  const handleSelectDocument = (docId: string) => {
    setActiveDocId(docId);
    setSelectedSections([]);
    setHighlightedChunkId(null);
    setUploadError(null);
  };

  const handleDeleteDocument = async (docId: string) => {
    await removeDocument(docId);
    setDocuments((prev) => {
      const remaining = prev.filter((d) => d.id !== docId);
      if (activeDocId === docId) {
        setActiveDocId(remaining.length > 0 ? remaining[0].id : null);
        setSelectedSections([]);
        setHighlightedChunkId(null);
        setQuery('');
      }
      return remaining;
    });
  };

  const handleInspectSource = (chunkId: string) => {
    setHighlightedChunkId(chunkId);
    setActiveView('source');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const availablePages = useMemo(() => {
    const pages = new Set<number>();
    if (!vectorIndex) return pages;
    for (const item of vectorIndex.chunks) {
      if (item.chunk.pageNumber) pages.add(item.chunk.pageNumber);
    }
    return pages;
  }, [vectorIndex]);

  const activeQueryPhrases = useMemo(
    () => parseQueryPhrases(query).exactPhrases,
    [query]
  );

  const handleOpenSourcePopup = (chunkId: string, matchedTerms: string[]) => {
    setPopupChunkId(chunkId);
    setPopupMatchedTerms(matchedTerms);
  };

  const handleJumpToPage = (pageNum: number) => {
    if (!vectorIndex) return;
    const target = vectorIndex.chunks.find(
      (item) => item.chunk.pageNumber === pageNum
    );
    if (target) {
      setPopupChunkId(target.chunk.id);
      setPopupMatchedTerms([]);
    }
  };

  const handleImportDocument = async (payload: ImportedDocPayload) => {
    const newId = `doc-${Date.now()}`;
    const newDoc: UserDocument = {
      id: newId,
      title: payload.title,
      subtitle: payload.subtitle,
      rawText: payload.rawText,
      sourceType: payload.sourceType,
      pageCount: payload.pageCount,
      fileName: payload.fileName,
      updatedAt: Date.now(),
      hasLinkedHandle: Boolean(payload.fileHandle),
    };
    await saveDocument(newDoc, payload.fileHandle);
    setDocuments((prev) => [...prev, newDoc]);
    setActiveDocId(newId);
    setSelectedSections([]);
    setQuery('');
    setHighlightedChunkId(null);
    setUploadError(null);
    setActiveView('search');
  };

  const processFileDirect = async (file: File, handle?: FileSystemFileHandle) => {
    setUploadError(null);
    const isPdf =
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const cleanTitle = file.name.replace(/\.(pdf|md|txt)$/i, '') || 'Document personnel';

    if (isPdf) {
      setQuickExtractProgress({ fileName: file.name, current: 0, total: 1 });
      try {
        const buffer = await file.arrayBuffer();
        const extracted = await extractTextFromPdfBuffer(buffer, (current, total) => {
          setQuickExtractProgress({ fileName: file.name, current, total });
        });
        await handleImportDocument({
          title: cleanTitle,
          subtitle: `PDF local · ${extracted.pageCount} pages`,
          rawText: extracted.structuredText,
          sourceType: 'pdf',
          pageCount: extracted.pageCount,
          fileName: file.name,
          fileHandle: handle,
        });
      } catch (err) {
        setUploadError(
          err instanceof Error
            ? err.message
            : 'Erreur lors de la lecture locale du fichier PDF.'
        );
      } finally {
        setQuickExtractProgress(null);
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      if (content.trim().length < 20) {
        setUploadError(
          'Le fichier sélectionné est vide ou trop court (minimum 20 caractères).'
        );
        return;
      }
      await handleImportDocument({
        title: cleanTitle,
        subtitle: 'Document texte local',
        rawText: content,
        sourceType: 'text',
        fileName: file.name,
        fileHandle: handle,
      });
    };
    reader.onerror = () => {
      setUploadError('Impossible de lire le fichier sélectionné.');
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleQuickLinkFile = async () => {
    setUploadError(null);
    try {
      const picker = (
        window as unknown as {
          showOpenFilePicker: (opts: unknown) => Promise<FileSystemFileHandle[]>;
        }
      ).showOpenFilePicker;
      const [handle] = await picker({
        multiple: false,
        types: [
          {
            description: 'Documents PDF ou texte (.pdf, .txt, .md)',
            accept: {
              'application/pdf': ['.pdf'],
              'text/plain': ['.txt'],
              'text/markdown': ['.md'],
            },
          },
        ],
      });
      if (!handle) return;
      const file = await handle.getFile();
      await processFileDirect(file, handle);
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return;
      setUploadError('Impossible de lier ce fichier local.');
    }
  };

  const handleReloadLinkedDoc = async (doc: UserDocument) => {
    setUploadError(null);
    setIsReloadingLinked(true);
    try {
      const handle = await getLinkedFileHandle(doc.id);
      if (!handle) {
        setUploadError('Lien fichier introuvable. Réimportez le document.');
        return;
      }
      const permHandle = handle as unknown as {
        queryPermission?: (desc: { mode: string }) => Promise<string>;
        requestPermission?: (desc: { mode: string }) => Promise<string>;
      };
      if (permHandle.queryPermission && permHandle.requestPermission) {
        let perm = await permHandle.queryPermission({ mode: 'read' });
        if (perm !== 'granted') {
          perm = await permHandle.requestPermission({ mode: 'read' });
        }
        if (perm !== 'granted') {
          setUploadError('Autorisation refusée pour relire le fichier local.');
          return;
        }
      }

      const file = await handle.getFile();
      const isPdf =
        file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      let updatedText = '';
      let updatedPageCount = doc.pageCount;

      if (isPdf) {
        const buffer = await file.arrayBuffer();
        const extracted = await extractTextFromPdfBuffer(buffer);
        updatedText = extracted.structuredText;
        updatedPageCount = extracted.pageCount;
      } else {
        updatedText = await file.text();
      }

      const updatedDoc: UserDocument = {
        ...doc,
        rawText: updatedText,
        pageCount: updatedPageCount,
        subtitle:
          isPdf && updatedPageCount
            ? `PDF local · ${updatedPageCount} pages`
            : doc.subtitle,
        updatedAt: Date.now(),
      };
      await saveDocument(updatedDoc, handle);
      setDocuments((prev) => prev.map((d) => (d.id === doc.id ? updatedDoc : d)));
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Échec du rechargement du fichier lié.'
      );
    } finally {
      setIsReloadingLinked(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchInputRef.current?.blur();
  };

  const sectionsList = useMemo(() => {
    if (!vectorIndex) return [];
    return Array.from(new Set(vectorIndex.chunks.map((c) => c.chunk.section)));
  }, [vectorIndex]);

  const sectionOptions: SectionOption[] = useMemo(() => {
    if (!vectorIndex) return [];
    return sectionsList.map((sec) => ({
      name: sec,
      count: vectorIndex.chunks.filter((c) => c.chunk.section === sec).length,
    }));
  }, [vectorIndex, sectionsList]);

  return (
    <div className="min-h-screen flex flex-col bg-[#07090D] text-slate-100 br-grid-backdrop">
      {/* Top Bar Contract: compact 48px on mobile (<md), 64px 3-zone on desktop (md+) */}
      <header className="sticky top-0 z-40 bg-[#07090D]/90 backdrop-blur-md border-b border-white/[0.08]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-12 md:h-16 flex items-center justify-between gap-4 md:gap-8">
          {/* Zone 1: Single text element wordmark */}
          <button
            type="button"
            onClick={() => setActiveView('search')}
            className="font-display text-lg md:text-xl font-bold tracking-[0.1em] text-slate-50 hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            CODEX VECTEUR
          </button>

          {/* Zone 2: Desktop single-line navigation links */}
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
              className="px-3.5 md:px-4 py-1.5 md:py-2 text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Importer un document
            </button>
          </div>
        </div>
      </header>

      {/* Prominent In-App Android/iOS PWA Install Banner */}
      <PWAInstallBanner />

      {/* Main Content (padded at bottom on mobile for fixed thumb navigation bar) */}
      <main className="flex-1 pb-20 md:pb-0">
        {activeView === 'search' && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 md:pt-12 pb-12 md:pb-20">
            {/* Editorial Headline & Clarity */}
            <div className="max-w-2xl">
              <h1
                className="font-display text-3xl sm:text-5xl font-semibold tracking-wide text-slate-50 leading-[1.08]"
                style={{ textWrap: 'balance' }}
              >
                Interroger un point de règle
              </h1>
              <p className="mt-2.5 sm:mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
                Chargez un fichier PDF, texte ou Markdown local puis posez votre question en
                français. L’extraction et l’index vectoriel restent intégralement sur votre
                appareil.
              </p>
            </div>

            {isLoadingDocs ? (
              <div className="mt-10 bg-[#0C1018] border border-white/[0.08] p-8 text-center">
                <p className="text-sm text-slate-400">
                  Chargement de votre bibliothèque locale…
                </p>
              </div>
            ) : !activeDoc || !vectorIndex ? (
              /* Empty State: No document uploaded yet */
              <div className="mt-8 sm:mt-10">
                <input
                  ref={quickFileInputRef}
                  type="file"
                  accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void processFileDirect(f);
                  }}
                  className="hidden"
                />
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingDropzone(true);
                  }}
                  onDragLeave={() => setIsDraggingDropzone(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingDropzone(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) void processFileDirect(f);
                  }}
                  className={`border border-dashed p-7 sm:p-14 text-center transition-colors ${
                    isDraggingDropzone
                      ? 'bg-amber-500/10 border-amber-400 br-amber-glow'
                      : 'bg-[#0C1018] border-white/[0.16]'
                  }`}
                >
                  <FileUp className="w-8 h-8 text-amber-400 mx-auto mb-3.5" />
                  <h2 className="font-display text-2xl sm:text-3xl font-semibold text-slate-50">
                    Importer un document PDF ou texte
                  </h2>
                  <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                    Formats pris en charge : <strong className="text-slate-200">.pdf</strong>{' '}
                    (texte sélectionnable), <strong className="text-slate-200">.txt</strong> et{' '}
                    <strong className="text-slate-200">.md</strong>. Stocké localement dans
                    votre navigateur pour un accès hors-ligne.
                  </p>

                  {quickExtractProgress ? (
                    <div className="mt-6 max-w-sm mx-auto text-left">
                      <div className="flex items-center justify-between text-xs text-cyan-300 mb-1.5">
                        <span className="truncate pr-2">
                          Analyse de {quickExtractProgress.fileName}…
                        </span>
                        <span className="font-mono tabular-nums shrink-0">
                          {quickExtractProgress.current} / {quickExtractProgress.total}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-cyan-400 transition-all duration-150"
                          style={{
                            width: `${Math.round(
                              (quickExtractProgress.current /
                                Math.max(1, quickExtractProgress.total)) *
                                100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="mt-7 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => quickFileInputRef.current?.click()}
                        className="min-h-[44px] px-6 py-2.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-[#07090D] transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Choisir un PDF / fichier
                      </button>
                      {canLinkLocalFile && (
                        <button
                          type="button"
                          onClick={handleQuickLinkFile}
                          className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 text-xs font-medium bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-200 border border-cyan-500/35 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                          <span>Lier un fichier local</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsImportOpen(true)}
                        className="min-h-[44px] px-5 py-2.5 text-xs font-medium bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 border border-white/[0.12] transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Coller un texte
                      </button>
                    </div>
                  )}

                  {uploadError && (
                    <p className="mt-5 text-xs text-rose-400 max-w-md mx-auto">
                      {uploadError}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Active Source Document Selector */}
                <div className="mt-7 sm:mt-8">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                    <span className="text-xs font-medium text-slate-400">
                      Documents locaux ({documents.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setHighlightedChunkId(null);
                        setActiveView('source');
                      }}
                      className="inline-flex items-center gap-1.5 min-h-[36px] text-xs text-cyan-300 hover:text-cyan-200 transition-colors cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>
                        Texte intégral ({vectorIndex.chunks.length} articles)
                      </span>
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
                        <div
                          key={doc.id}
                          className={`inline-flex items-center border transition-colors max-w-full ${
                            isActive
                              ? 'bg-[#131925] border-amber-400/60 text-amber-300'
                              : 'bg-[#0B0E15] border-white/[0.08] text-slate-400 hover:text-slate-200 hover:border-white/[0.16]'
                          }`}
                        >
                          <button
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            onClick={() => handleSelectDocument(doc.id)}
                            className="min-h-[44px] sm:min-h-[38px] px-3.5 py-2 text-xs font-medium cursor-pointer truncate max-w-[200px] sm:max-w-[260px]"
                          >
                            {doc.title}
                          </button>

                          {doc.hasLinkedHandle && isActive && (
                            <button
                              type="button"
                              disabled={isReloadingLinked}
                              onClick={() => void handleReloadLinkedDoc(doc)}
                              aria-label={`Actualiser ${doc.title}`}
                              title="Relire le fichier local lié"
                              className="min-w-[40px] min-h-[44px] sm:min-h-[38px] flex items-center justify-center text-cyan-300 hover:text-cyan-200 transition-colors cursor-pointer disabled:opacity-40"
                            >
                              <RefreshCw
                                className={`w-3.5 h-3.5 ${
                                  isReloadingLinked ? 'animate-spin' : ''
                                }`}
                              />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => void handleDeleteDocument(doc.id)}
                            aria-label={`Retirer ${doc.title}`}
                            title="Retirer ce document"
                            className="min-w-[40px] min-h-[44px] sm:min-h-[38px] flex items-center justify-center pr-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {uploadError && (
                    <p className="mt-3 text-xs text-rose-400">{uploadError}</p>
                  )}
                </div>

                {/* Search Input Form (16px font size prevents iOS/Android auto-zoom) */}
                <form onSubmit={handleSearchSubmit} className="mt-5 sm:mt-6">
                  <div className="flex flex-col sm:flex-row items-stretch bg-[#0C1018] border border-white/[0.14] focus-within:border-amber-400/75 focus-within:br-amber-glow transition-all">
                    <div className="relative flex-1 flex items-center">
                      <Search className="w-4 h-4 text-slate-400 ml-4 shrink-0 pointer-events-none" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Posez votre question en français sur un point de règle..."
                        aria-label="Votre question sur un point de règle"
                        className="w-full min-h-[48px] bg-transparent px-3.5 py-3.5 text-base text-slate-50 placeholder:text-slate-500 focus:outline-none"
                      />
                      {query && (
                        <button
                          type="button"
                          onClick={() => {
                            setQuery('');
                            searchInputRef.current?.focus();
                          }}
                          aria-label="Effacer la question"
                          className="min-w-[44px] min-h-[44px] flex items-center justify-center mr-1 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="min-h-[48px] px-7 py-3 sm:py-0 bg-amber-500 hover:bg-amber-400 text-[#07090D] font-semibold text-sm tracking-wide transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Rechercher
                    </button>
                  </div>

                  {/* Section Filter Dropdown + Query Syntax Tip */}
                  <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {sectionOptions.length > 1 && (
                      <SectionFilterDropdown
                        sections={sectionOptions}
                        selectedSections={selectedSections}
                        onChangeSelectedSections={setSelectedSections}
                      />
                    )}
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Astuce : séparez des thèmes par des{' '}
                      <span className="font-mono text-slate-400">virgules</span>, utilisez{' '}
                      <span className="font-mono text-slate-400">"guillemets"</span> pour
                      une expression exacte, ou des dés (<span className="font-mono text-slate-400">2d6</span>,{' '}
                      <span className="font-mono text-slate-400">DD 15</span>).
                    </p>
                  </div>
                </form>

                {/* Document Structure Overview or Search Results */}
                {!query.trim() ? (
                  <div className="mt-9 pt-7 border-t border-white/[0.07]">
                    <div className="flex flex-wrap items-baseline justify-between gap-3 mb-3">
                      <h2 className="font-display text-2xl font-semibold text-slate-100">
                        Structure du document indexé
                      </h2>
                      <span className="font-mono text-xs text-slate-400 tabular-nums">
                        {vectorIndex.chunks.length} articles · {vectorIndex.vocabSize} racines
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 mb-5">{activeDoc.subtitle}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                            className="text-left min-h-[52px] p-4 bg-[#0A0D13] hover:bg-[#0F141E] border border-white/[0.07] hover:border-white/[0.16] transition-colors cursor-pointer"
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
                ) : (
                  <div className="mt-9">
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
                          className="min-h-[40px] bg-[#0C1018] border border-white/[0.12] text-slate-200 font-mono text-xs px-3 py-1 focus:outline-none focus:border-cyan-400/60"
                        >
                          <option value={5}>5 % (large)</option>
                          <option value={15}>15 % (équilibré)</option>
                          <option value={35}>35 % (strict)</option>
                        </select>
                      </div>
                    </div>

                    {/* Result List or Empty State */}
                    {results.length === 0 ? (
                      <div className="mt-6 bg-[#0C1018] border border-white/[0.08] p-7 sm:p-8 text-center">
                        <p className="font-display text-2xl font-semibold text-slate-100">
                          {activeQueryPhrases.length > 0
                            ? 'Aucune occurrence exacte trouvée'
                            : 'Aucune correspondance suffisante'}
                        </p>
                        <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                          {activeQueryPhrases.length > 0
                            ? `L’expression exacte « ${activeQueryPhrases.join(' », « ')} » n’apparaît pas dans « ${activeDoc.title} ». Essayez sans guillemets pour élargir au moteur vectoriel.`
                            : `Aucun article de « ${activeDoc.title} » n’atteint ${minThreshold} % de concordance pour cette requête. Reformulez avec d’autres termes ou abaissez le seuil minimal.`}
                        </p>
                        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                          {selectedSections.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setSelectedSections([])}
                              className="min-h-[44px] px-4 py-2 text-xs font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 transition-colors cursor-pointer"
                            >
                              Chercher dans toutes les sections
                            </button>
                          )}
                          {minThreshold > 5 && activeQueryPhrases.length === 0 && (
                            <button
                              type="button"
                              onClick={() => setMinThreshold(5)}
                              className="min-h-[44px] px-4 py-2 text-xs font-medium bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 transition-colors cursor-pointer"
                            >
                              Élargir le seuil à 5 %
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setActiveView('source')}
                            className="min-h-[44px] px-4 py-2 text-xs font-medium bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 border border-white/[0.1] transition-colors cursor-pointer"
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
                            availablePages={availablePages}
                            onInspectSource={(chunkId) =>
                              handleOpenSourcePopup(chunkId, result.matchedTerms)
                            }
                            onJumpToPage={handleJumpToPage}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeView === 'source' && (
          <DocumentSourceView
            docTitle={activeDoc?.title ?? null}
            docSubtitle={activeDoc?.subtitle ?? null}
            chunks={vectorIndex ? vectorIndex.chunks.map((c) => c.chunk) : []}
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

      {/* Desktop Quiet Editorial Footer */}
      <footer className="hidden md:block border-t border-white/[0.07] py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 text-xs text-slate-500">
          <span>
            CODEX VECTEUR · Recherche vectorielle statique et analyse PDF hors-ligne
          </span>
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

      {/* Mobile Android Thumb-Zone Bottom Tab Bar (56px, paired with 48px header = 104px <= 15% mobile height) */}
      <nav
        aria-label="Navigation mobile"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-14 bg-[#07090D]/95 backdrop-blur-md border-t border-white/[0.1] grid grid-cols-3 items-center"
      >
        <button
          type="button"
          onClick={() => setActiveView('search')}
          className={`h-full flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
            activeView === 'search' ? 'text-amber-400' : 'text-slate-400'
          }`}
        >
          <Search className="w-5 h-5" />
          <span className="text-[11px] font-medium tracking-tight">Recherche</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView('source')}
          className={`h-full flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
            activeView === 'source' ? 'text-amber-400' : 'text-slate-400'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[11px] font-medium tracking-tight">Document</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView('methodology')}
          className={`h-full flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
            activeView === 'methodology' ? 'text-amber-400' : 'text-slate-400'
          }`}
        >
          <Cpu className="w-5 h-5" />
          <span className="text-[11px] font-medium tracking-tight">Méthode</span>
        </button>
      </nav>

      <OfflineIndicator />

      <SourcePreviewModal
        isOpen={Boolean(popupChunkId)}
        docTitle={activeDoc?.title ?? ''}
        chunks={vectorIndex ? vectorIndex.chunks.map((c) => c.chunk) : []}
        activeChunkId={popupChunkId}
        matchedTerms={popupMatchedTerms}
        availablePages={availablePages}
        onSelectChunkId={(chunkId) => setPopupChunkId(chunkId)}
        onJumpToPage={handleJumpToPage}
        onOpenInDocumentTab={handleInspectSource}
        onClose={() => setPopupChunkId(null)}
      />

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportDocument={handleImportDocument}
      />
    </div>
  );
}
