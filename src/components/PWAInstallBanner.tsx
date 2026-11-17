import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled || dismissed) {
    return null;
  }

  if (!isInstallable && !isIOS) {
    return null;
  }

  return (
    <>
      <div className="bg-[#0E131D] border-b border-cyan-400/25 px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Smartphone className="w-4 h-4 text-cyan-300 shrink-0" />
            <p className="text-xs sm:text-sm text-slate-200 truncate">
              <span className="font-medium text-slate-50">Application installable</span>
              <span className="hidden sm:inline text-slate-400">
                {' '}· Utilisez Codex Vecteur hors-ligne sur votre téléphone Android
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isInstallable ? (
              <button
                type="button"
                onClick={install}
                className="inline-flex items-center gap-1.5 min-h-[36px] px-3.5 py-1.5 text-xs font-semibold bg-cyan-400 hover:bg-cyan-300 text-[#07090D] transition-colors cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Installer l’app</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowIOSGuide(true)}
                className="inline-flex items-center gap-1.5 min-h-[36px] px-3.5 py-1.5 text-xs font-semibold bg-cyan-400/15 hover:bg-cyan-400/25 text-cyan-200 border border-cyan-400/40 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Installer sur iOS</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setDismissed(true)}
              aria-label="Masquer la proposition d'installation"
              className="p-2 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {showIOSGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowIOSGuide(false);
          }}
        >
          <div className="w-full max-w-sm bg-[#0C1018] border border-white/[0.14] p-6">
            <h3 className="font-display text-2xl font-semibold text-slate-50">
              Installer sur iPhone / iPad
            </h3>
            <ol className="mt-3 space-y-2 text-sm text-slate-300 leading-relaxed list-decimal list-inside">
              <li>
                Appuyez sur le bouton <strong className="text-slate-100">Partager</strong> dans
                la barre Safari.
              </li>
              <li>
                Faites défiler et choisissez{' '}
                <strong className="text-slate-100">Sur l’écran d’accueil</strong>.
              </li>
            </ol>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full min-h-[44px] bg-amber-500 hover:bg-amber-400 text-[#07090D] text-xs font-semibold transition-colors cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  );
};
