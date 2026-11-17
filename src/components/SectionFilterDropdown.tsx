import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Filter } from 'lucide-react';

export interface SectionOption {
  name: string;
  count: number;
}

interface SectionFilterDropdownProps {
  sections: SectionOption[];
  selectedSections: string[];
  onChangeSelectedSections: (next: string[]) => void;
}

export const SectionFilterDropdown: React.FC<SectionFilterDropdownProps> = ({
  sections,
  selectedSections,
  onChangeSelectedSections,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const toggleSection = (sectionName: string) => {
    if (selectedSections.includes(sectionName)) {
      onChangeSelectedSections(
        selectedSections.filter((s) => s !== sectionName)
      );
    } else {
      onChangeSelectedSections([...selectedSections, sectionName]);
    }
  };

  const isFiltered = selectedSections.length > 0;
  const triggerLabel = !isFiltered
    ? 'Toutes les sections'
    : selectedSections.length === 1
      ? selectedSections[0]
      : `${selectedSections.length} sections ciblées`;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full sm:w-auto min-h-[44px] inline-flex items-center justify-between gap-2.5 px-3.5 py-2 text-xs font-medium border transition-colors cursor-pointer ${
          isFiltered
            ? 'bg-[#131925] border-cyan-400/55 text-cyan-200'
            : 'bg-[#0C1018] border-white/[0.12] text-slate-300 hover:text-slate-100 hover:border-white/[0.2]'
        }`}
      >
        <span className="inline-flex items-center gap-2 min-w-0">
          <Filter
            className={`w-3.5 h-3.5 shrink-0 ${
              isFiltered ? 'text-cyan-300' : 'text-slate-400'
            }`}
          />
          <span className="truncate max-w-[230px] sm:max-w-[260px]">
            {triggerLabel}
          </span>
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-slate-400 transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-multiselectable="true"
          aria-label="Restreindre la recherche à une ou plusieurs sections"
          className="absolute left-0 right-0 sm:right-auto sm:w-80 mt-1.5 z-30 bg-[#0C1018] border border-white/[0.16] shadow-2xl"
        >
          <div className="px-3.5 py-2.5 border-b border-white/[0.08] flex items-center justify-between gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              Restreindre par section
            </span>
            {isFiltered && (
              <button
                type="button"
                onClick={() => onChangeSelectedSections([])}
                className="text-xs text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
              >
                Tout inclure
              </button>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto divide-y divide-white/[0.05]">
            <button
              type="button"
              role="option"
              aria-selected={!isFiltered}
              onClick={() => {
                onChangeSelectedSections([]);
                setIsOpen(false);
              }}
              className={`w-full min-h-[44px] px-3.5 py-2 flex items-center justify-between gap-3 text-left text-xs transition-colors cursor-pointer ${
                !isFiltered
                  ? 'bg-[#131925] text-amber-300 font-medium'
                  : 'text-slate-300 hover:bg-white/[0.04]'
              }`}
            >
              <span>Toutes les sections du document</span>
              {!isFiltered && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
            </button>

            {sections.map((sec) => {
              const checked = selectedSections.includes(sec.name);
              return (
                <button
                  key={sec.name}
                  type="button"
                  role="option"
                  aria-selected={checked}
                  onClick={() => toggleSection(sec.name)}
                  className={`w-full min-h-[44px] px-3.5 py-2 flex items-center justify-between gap-3 text-left text-xs transition-colors cursor-pointer ${
                    checked
                      ? 'bg-[#121927] text-cyan-200 font-medium'
                      : 'text-slate-300 hover:bg-white/[0.04]'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span
                      aria-hidden="true"
                      className={`w-4 h-4 border flex items-center justify-center shrink-0 transition-colors ${
                        checked
                          ? 'bg-cyan-400 border-cyan-400 text-[#07090D]'
                          : 'border-white/[0.22] bg-[#080B10]'
                      }`}
                    >
                      {checked && <Check className="w-3 h-3 stroke-[3]" />}
                    </span>
                    <span className="truncate">{sec.name}</span>
                  </span>
                  <span className="font-mono text-[11px] text-slate-500 tabular-nums shrink-0">
                    {sec.count} art.
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
