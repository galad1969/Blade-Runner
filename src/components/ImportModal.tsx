import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileUp, X } from 'lucide-react';
import { parseRuleDocument } from '../engine/vectorSearch';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportDocument: (title: string, subtitle: string, rawText: string) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportDocument,
}) => {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [rawText, setRawText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const previewChunks = useMemo(() => {
    if (!rawText.trim()) return [];
    return parseRuleDocument(rawText, 'preview');
  }, [rawText]);

  const exampleCount = useMemo(
    () => previewChunks.reduce((acc, c) => acc + c.examples.length, 0),
    [previewChunks]
  );

  if (!isOpen) return null;

  const loadFile = (file: File) => {
    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      if (!content.trim()) {
        setErrorMsg('Le fichier sélectionné est vide.');
        return;
      }
      setRawText(content);
      const cleanName = file.name.replace(/\.(md|txt)$/i, '');
      if (cleanName && !title.trim()) {
        setTitle(cleanName);
      } else if (cleanName) {
        setTitle(cleanName);
      }
    };
    reader.onerror = () => {
      setErrorMsg('Impossible de lire le fichier sélectionné.');
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) loadFile(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Veuillez saisir un titre pour le document.');
      return;
    }
    if (rawText.trim().length < 20) {
      setErrorMsg('Veuillez coller ou charger un texte d’au moins 20 caractères.');
      return;
    }
    onImportDocument(
      title.trim(),
      subtitle.trim() || 'Document source personnel',
      rawText
    );
    setTitle('');
    setSubtitle('');
    setRawText('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl bg-[#0C1018] border border-white/[0.14] shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
          <h2
            id="import-modal-title"
            className="font-display text-2xl font-semibold tracking-wide text-slate-50"
          >
            Importer un document source
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="p-1.5 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {/* File drop / picker */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#080B10] border border-dashed p-4 transition-colors ${
              isDragging ? 'border-amber-400 bg-amber-500/5' : 'border-white/[0.16]'
            }`}
          >
            <div className="text-xs text-slate-300">
              <p className="font-medium text-slate-100">
                Déposer ou choisir un fichier (.txt, .md)
              </p>
              <p className="text-slate-400 mt-0.5">
                Indexation 100 % locale dans votre navigateur.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,text/plain,text/markdown"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-slate-100 transition-colors cursor-pointer whitespace-nowrap"
              >
                <FileUp className="w-3.5 h-3.5 text-amber-400" />
                <span>Choisir un fichier</span>
              </button>
            </div>
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
                className="w-full bg-[#080B10] border border-white/[0.1] focus:border-amber-400/70 focus:outline-none px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
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
                className="w-full bg-[#080B10] border border-white/[0.1] focus:border-amber-400/70 focus:outline-none px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-300">
                Contenu du document
              </label>
              {rawText.trim() && (
                <span className="font-mono text-xs text-amber-400 tabular-nums">
                  {previewChunks.length} articles · {exampleCount} exemples détectés
                </span>
              )}
            </div>
            <textarea
              rows={8}
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                setErrorMsg(null);
              }}
              placeholder="Collez ici le texte de votre document source (titres Markdown # / ### ou paragraphes séparés par des lignes vides)..."
              className="w-full bg-[#080B10] border border-white/[0.1] focus:border-amber-400/70 focus:outline-none p-3 font-mono text-xs leading-relaxed text-slate-200 placeholder:text-slate-600"
            />
            <p className="mt-2 text-xs text-slate-400">
              Les sections précédées de <code className="text-slate-300">###</code> ou{' '}
              <code className="text-slate-300">Article X —</code> et les blocs{' '}
              <code className="text-slate-300">Exemple :</code> sont automatiquement structurés.
            </p>
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-400 bg-rose-950/30 border border-rose-500/30 px-3 py-2">
              {errorMsg}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-slate-100 transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-[#07090D] transition-colors cursor-pointer whitespace-nowrap"
            >
              Indexer le document
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
