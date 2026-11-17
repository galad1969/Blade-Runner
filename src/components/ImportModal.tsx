import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileUp, X } from 'lucide-react';
import { parseRuleDocument } from '../engine/vectorSearch';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportDocument: (title: string, subtitle: string, rawText: string) => void;
}

const TEMPLATE_SNIPPET = `# Section 1 — Dispositions générales

### Art. 1.1 — Principe de priorité
Lorsqu’une règle spécifique contredit une règle générale, la règle spécifique s’applique toujours en priorité.

Exemple : La règle générale interdit d’agir deux fois, mais la carte « Réflexe » autorise une seconde action gratuite. La carte s’applique.

### Art. 1.2 — Validation et délais
Toute demande doit être soumise par écrit avant l’expiration du délai de 48 heures.

Exemple : Un incident constaté le lundi à 10h00 doit être signalé au plus tard le mercredi à 10h00.`;

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportDocument,
}) => {
  const [title, setTitle] = useState('Mon Document Réglementaire');
  const [subtitle, setSubtitle] = useState('Document source personnalisé importé localement');
  const [rawText, setRawText] = useState('');
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
      if (cleanName) setTitle(cleanName);
    };
    reader.onerror = () => {
      setErrorMsg('Impossible de lire le fichier sélectionné.');
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Veuillez saisir un titre pour le document.');
      return;
    }
    if (rawText.trim().length < 30) {
      setErrorMsg('Veuillez coller ou charger un texte réglementaire d’au moins 30 caractères.');
      return;
    }
    onImportDocument(title.trim(), subtitle.trim() || 'Document source importé', rawText);
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#080B10] border border-dashed border-white/[0.14] p-4">
            <div className="text-xs text-slate-300">
              <p className="font-medium text-slate-100">Charger un fichier texte (.txt, .md)</p>
              <p className="text-slate-400 mt-0.5">
                Traitement 100 % local : aucun texte n’est envoyé sur un serveur.
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
                className="w-full bg-[#080B10] border border-white/[0.1] focus:border-amber-400/70 focus:outline-none px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Description courte
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full bg-[#080B10] border border-white/[0.1] focus:border-amber-400/70 focus:outline-none px-3 py-2 text-sm text-slate-100"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-300">
                Contenu du document de règles
              </label>
              <button
                type="button"
                onClick={() => setRawText(TEMPLATE_SNIPPET)}
                className="text-xs text-cyan-300 hover:text-cyan-200 transition-colors cursor-pointer"
              >
                Insérer un modèle structuré
              </button>
            </div>
            <textarea
              rows={8}
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                setErrorMsg(null);
              }}
              placeholder="Collez ici le texte de votre règlement (titres avec ### Art. X.Y — Titre, et paragraphes commençant par Exemple : ...)"
              className="w-full bg-[#080B10] border border-white/[0.1] focus:border-amber-400/70 focus:outline-none p-3 font-mono text-xs leading-relaxed text-slate-200 placeholder:text-slate-600"
            />
            <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
              <span>
                Format conseillé : <code className="text-slate-300">### Art. 1 — Titre</code> et{' '}
                <code className="text-slate-300">Exemple : ...</code>
              </span>
              {rawText.trim() && (
                <span className="font-mono text-amber-400 tabular-nums">
                  {previewChunks.length} articles · {exampleCount} exemples détectés
                </span>
              )}
            </div>
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
