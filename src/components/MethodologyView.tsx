import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { VectorIndex } from '../engine/vectorSearch';

interface MethodologyViewProps {
  index: VectorIndex | null;
  onBackToSearch: () => void;
}

export const MethodologyView: React.FC<MethodologyViewProps> = ({
  index,
  onBackToSearch,
}) => {
  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <button
        type="button"
        onClick={onBackToSearch}
        className="inline-flex items-center gap-2 text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors mb-6 cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Retour au moteur de recherche</span>
      </button>

      <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-wide text-slate-50">
        Architecture du Moteur Vectoriel Statique
      </h1>
      <p className="mt-3 text-base text-slate-300 leading-relaxed max-w-prose">
        L’ensemble de l’indexation et du calcul de similarité cosinus s’exécute localement
        dans votre navigateur, sans serveur externe ni latence réseau. Chaque point de règle
        du document importé est projeté dans un espace vectoriel multi-dimensionnel.
      </p>

      {/* Real Index Snapshot */}
      <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 border-y border-white/[0.08] py-6">
        <div>
          <p className="text-xs text-slate-400">Articles indexés</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-slate-50 tabular-nums">
            {index ? index.chunks.length : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Vocabulaire (racines)</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-amber-400 tabular-nums">
            {index ? index.vocabSize : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Dimensions conceptuelles</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-cyan-300 tabular-nums">
            {index ? index.conceptDimensionCount : 20}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Temps d’indexation</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-slate-50 tabular-nums">
            {index ? `${index.indexedAtMs} ms` : '—'}
          </p>
        </div>
      </div>

      {/* 4 Vector Spaces Explanation */}
      <div className="mt-10 space-y-6">
        <h2 className="font-display text-2xl font-semibold text-slate-100">
          Calcul de l’indice de concordance
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-[#0E131C] border border-white/[0.08] p-6">
            <div className="flex items-baseline justify-between gap-2 mb-2">
              <h3 className="font-display text-xl font-semibold text-amber-400">
                01. Espace Lexical TF-IDF
              </h3>
              <span className="font-mono text-xs text-slate-400 tabular-nums">Poids 44 %</span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Normalisation accentuée et lemmatisation morphologique française (racines des noms,
              verbes et adjectifs). Les titres d’articles reçoivent une pondération renforcée (2,2×)
              afin de privilégier la règle principale.
            </p>
          </div>

          <div className="bg-[#0E131C] border border-white/[0.08] p-6">
            <div className="flex items-baseline justify-between gap-2 mb-2">
              <h3 className="font-display text-xl font-semibold text-cyan-300">
                02. Espace Sémantique par Concepts
              </h3>
              <span className="font-mono text-xs text-slate-400 tabular-nums">Poids 24 %</span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Projection dense sur {index ? index.conceptDimensionCount : 20} axes thématiques
              réglementaires (déplacement, ligne de vue, sanctions, priorité des règles,
              départage…). Permet de relier des synonymes comme « bouger » et « déplacement ».
            </p>
          </div>

          <div className="bg-[#0E131C] border border-white/[0.08] p-6">
            <div className="flex items-baseline justify-between gap-2 mb-2">
              <h3 className="font-display text-xl font-semibold text-slate-100">
                03. Sous-mots (Trigrammes)
              </h3>
              <span className="font-mono text-xs text-slate-400 tabular-nums">Poids 18 %</span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Découpage en fenêtres de 3 caractères normalisées L2. Assure une tolérance naturelle
              aux variantes orthographiques, aux fautes de frappe légères et aux mots composés.
            </p>
          </div>

          <div className="bg-[#0E131C] border border-white/[0.08] p-6">
            <div className="flex items-baseline justify-between gap-2 mb-2">
              <h3 className="font-display text-xl font-semibold text-slate-100">
                04. Vecteur de Bigrammes
              </h3>
              <span className="font-mono text-xs text-slate-400 tabular-nums">Poids 14 %</span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Capture les locutions exactes de deux termes adjacents (« ligne de vue », « temps mort »,
              « faute technique », « majorité absolue ») pour affiner la précision des résultats.
            </p>
          </div>
        </div>

        <div className="bg-[#0A0D14] border border-white/[0.07] p-6">
          <h3 className="font-mono text-xs uppercase tracking-wider text-slate-400 mb-2">
            Formule de similarité cosinus
          </h3>
          <p className="font-mono text-sm text-amber-300/95">
            cos(θ) = (V_question · V_règle) / (‖V_question‖ × ‖V_règle‖)
          </p>
          <p className="mt-2.5 text-sm text-slate-300 leading-relaxed">
            L’indice de concordance affiché en pourcentage résulte de la fusion pondérée des quatre
            similarités cosinus normalisées, calibrée pour distinguer nettement les correspondances
            directes (≥ 70 %) des correspondances partielles.
          </p>
        </div>
      </div>
    </section>
  );
};
