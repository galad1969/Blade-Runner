import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileUp, Link2, X } from 'lucide-react';
import { parseRuleDocument } from '../engine/vectorSearch';
import { extractTextFromPdfBuffer } from '../engine/pdfParser';
import { supportsFileSystemAccess } from '../engine/storage';

export interface ImportedDocPayload {
  title: string;
  subtitle: string;
  rawText: string;
  sourceType: 'pdf' | 'text';
  pageCount?: number;
  fileName?: string;
  fileHandle?: FileSystemFileHandle;
}

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportDocument: (payload: ImportedDocPayload) => Promise<void> | void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportDocument,
}) => {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [rawText, setRawText] = useState('');
  const [sourceType, setSourceType] = useState<'pdf' | 'text'>('text');
  const [pageCount, setPageCount] = useState<number | undefined>(undefined);
  const [fileName, setFileName] = useState<string | undefined>(undefined);
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | undefined>(undefined);

  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const canLinkLocalFile = useMemo(() => supportsFileSystemAccess(), []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isExtracting) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, isExtracting, onClose]);

  const previewChunks = useMemo(() => {
    if (!rawText.trim()) return [];
    return parseRuleDocument(rawText, 'preview');
  }, [rawText]);

  const exampleCount = useMemo(
    () => previewChunks.reduce((acc, c) => acc + c.examples.length, 0),
    [previewChunks]
  );

  if (!isOpen) return null;

  const processFile = async (file: File, handle?: FileSystemFileHandle) => {
    setErrorMsg(null);
    const isPdf =
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const cleanName = file.name.replace(/\.(pdf|md|txt)$/i, '');

    setFileName(file.name);
    setFileHandle(handle);

    if (isPdf) {
      setIsExtracting(true);
      setExtractProgress({ current: 0, total: 1 });
      try {
        const buffer = await file.arrayBuffer();
        const extracted = await extractTextFromPdfBuffer(buffer, (current, total) => {
          setExtractProgress({ current, total });
        });
        setRawText(extracted.structuredText);
        setSourceType('pdf');
        setPageCount(extracted.pageCount);
        setTitle(cleanName || 'Document PDF');
        setSubtitle(`PDF local · ${extracted.pageCount} pages`);
      } catch (err) {
        setErrorMsg(
          err instanceof Error
            ? err.message
            : 'Erreur lors de l’analyse locale du fichier PDF.'
        );
      } finally {
        setIsExtracting(false);
        setExtractProgress(null);
      }
      return;
    }

    // Text / Markdown file
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      if (!content.trim()) {
        setErrorMsg('Le fichier sélectionné est vide.');
        return;
      }
      setRawText(content);
      setSourceType('text');
      setPageCount(undefined);
      setTitle(cleanName || 'Document texte');
      if (!subtitle.trim()) setSubtitle('Document texte local');
    };
    reader.onerror = () => {
      setErrorMsg('Impossible de lire le fichier sélectionné.');
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void processFile(file);
  };

  const handleLinkFile = async () => {
    setErrorMsg(null);
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
      await processFile(file, handle);
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return;
      setErrorMsg('Impossible de lier ce fichier local.');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void processFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Veuillez saisir un titre pour le document.');
      return;
    }
    if (rawText.trim().length < 20) {
      setErrorMsg('Veuillez importer un fichier ou coller un texte d’au moins 20 caractères.');
      return;
    }
    await onImportDocument({
      title: title.trim(),
      subtitle: subtitle.trim() || (sourceType === 'pdf' ? 'Document PDF local' : 'Document personnel'),
      rawText,
      sourceType,
      pageCount,
      fileName,
      fileHandle,
    });
    setTitle('');
    setSubtitle('');
    setRawText('');
    setPageCount(undefined);
    setFileName(undefined);
    setFileHandle(undefined);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isExtracting) onClose();
      }}
    >
      <div className="w-full max-w-2xl bg-[#0C1018] border border-white/[0.14] shadow-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-white/[0.08]">
          <h2
            id="import-modal-title"
            className="font-display text-2xl font-semibold tracking-wide text-slate-50"
          >
            Importer un document source
          </h2>
          <button
            type="button"
            disabled={isExtracting}
            onClick={onClose}
            aria-label="Fermer"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-100 transition-colors cursor-pointer disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* File drop / picker */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`flex flex-col gap-4 bg-[#080B10] border border-dashed p-4 transition-colors ${
              isDragging ? 'border-amber-400 bg-amber-500/5' : 'border-white/[0.16]'
            }`}
          >
            <div className="text-xs text-slate-300">
              <p className="font-medium text-slate-100">
                Déposer ou choisir un fichier local (.pdf, .txt, .md)
              </p>
              <p className="text-slate-400 mt-0.5">
                Analyse et indexation 100 % locales dans votre navigateur, y compris hors-ligne.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                disabled={isExtracting}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 text-xs font-medium bg-white/[0.07] hover:bg-white/[0.14] border border-white/[0.12] text-slate-100 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                <FileUp className="w-4 h-4 text-amber-400" />
                <span>Choisir un fichier (.pdf, .txt, .md)</span>
              </button>

              {canLinkLocalFile && (
                <button
                  type="button"
                  disabled={isExtracting}
                  onClick={handleLinkFile}
                  className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 text-xs font-medium bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/35 text-cyan-200 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
                >
                  <Link2 className="w-4 h-4 text-cyan-300" />
                  <span>Lier un fichier local</span>
                </button>
              )}
            </div>

            {isExtracting && extractProgress && (
              <div className="pt-1">
                <div className="flex items-center justify-between text-xs text-cyan-300 mb-1.5">
                  <span>Extraction locale du PDF en cours…</span>
                  <span className="font-mono tabular-nums">
                    Page {extractProgress.current} / {extractProgress.total}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-cyan-400 transition-all duration-150"
                    style={{
                      width: `${Math.round(
                        (extractProgress.current / Math.max(1, extractProgress.total)) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Titre du document
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex : Règlement officiel"
                className="w-full min-h-[44px] bg-[#080B10] border border-white/[0.1] focus:border-amber-400/70 focus:outline-none px-3 py-2 text-base sm:text-sm text-slate-100 placeholder:text-slate-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Description (optionnelle)
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Ex : Édition 2026"
                className="w-full min-h-[44px] bg-[#080B10] border border-white/[0.1] focus:border-amber-400/70 focus:outline-none px-3 py-2 text-base sm:text-sm text-slate-100 placeholder:text-slate-600"
              />
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <label className="text-xs font-medium text-slate-300">
                Texte extrait ou collé
              </label>
              {rawText.trim() && (
                <span className="font-mono text-xs text-amber-400 tabular-nums">
                  {previewChunks.length} articles · {exampleCount} exemples détectés
                </span>
              )}
            </div>
            <textarea
              rows={6}
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                setErrorMsg(null);
              }}
              placeholder="Le texte extrait de votre PDF apparaîtra ici, ou collez directement votre document..."
              className="w-full bg-[#080B10] border border-white/[0.1] focus:border-amber-400/70 focus:outline-none p-3 font-mono text-xs leading-relaxed text-slate-200 placeholder:text-slate-600"
            />
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-400 bg-rose-950/30 border border-rose-500/30 px-3 py-2.5">
              {errorMsg}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/[0.08]">
            <button
              type="button"
              disabled={isExtracting}
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 text-xs font-medium text-slate-300 hover:text-slate-100 transition-colors cursor-pointer disabled:opacity-40"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isExtracting}
              className="min-h-[44px] px-5 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-[#07090D] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
            >
              Indexer le document
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
