import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Check, 
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { SORT_OPTIONS, SortOption } from '../utils/trackSort';

interface TrackSortControlProps {
  currentSort: string;
  onSortChange: (sortId: string) => void;
  className?: string;
  compact?: boolean;
}

export const TrackSortControl: React.FC<TrackSortControlProps> = ({
  currentSort,
  onSortChange,
  className = '',
  compact = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeOption = SORT_OPTIONS.find(o => o.id === currentSort) || SORT_OPTIONS[0];

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Flip direction of current sort field if applicable
  const handleFlipDirection = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeOption.field === 'default') return;

    const oppositeDirection = activeOption.direction === 'asc' ? 'desc' : 'asc';
    const oppositeOption = SORT_OPTIONS.find(
      o => o.field === activeOption.field && o.direction === oppositeDirection
    );

    if (oppositeOption) {
      onSortChange(oppositeOption.id);
    }
  };

  return (
    <div ref={containerRef} className={`relative inline-block text-xs ${className}`}>
      <div className="flex items-center gap-1.5">
        {/* Main Sort Button */}
        <button
          type="button"
          onClick={() => setIsOpen(prev => !prev)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
            currentSort !== 'default'
              ? 'bg-brand-500/15 border-brand-500/40 text-brand-300 font-semibold shadow-xs'
              : 'bg-surface-800 hover:bg-surface-750 border-white/10 text-slate-300 hover:text-white'
          }`}
          title="Sort tracks based on attributes"
        >
          <ArrowUpDown className="w-3.5 h-3.5 text-brand-400" />
          <span>
            {compact ? activeOption.shortLabel : `Sort: ${activeOption.label}`}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Direction Flip Toggle (shown when an attribute is active) */}
        {activeOption.field !== 'default' && (
          <button
            type="button"
            onClick={handleFlipDirection}
            className="p-1.5 rounded-xl bg-surface-800 hover:bg-surface-750 border border-white/10 text-slate-300 hover:text-white transition-all"
            title={`Switch to ${activeOption.direction === 'asc' ? 'Descending' : 'Ascending'}`}
          >
            {activeOption.direction === 'asc' ? (
              <ArrowUp className="w-3.5 h-3.5 text-accent-cyan" />
            ) : (
              <ArrowDown className="w-3.5 h-3.5 text-accent-cyan" />
            )}
          </button>
        )}
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-surface-900/95 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl shadow-black/60 p-2 z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="px-2.5 py-1.5 border-b border-white/5 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Sort Tracks By
            </span>
            {currentSort !== 'default' && (
              <button
                type="button"
                onClick={() => {
                  onSortChange('default');
                  setIsOpen(false);
                }}
                className="text-[10px] text-brand-400 hover:underline"
              >
                Reset
              </button>
            )}
          </div>

          <div className="mt-1 max-h-64 overflow-y-auto space-y-0.5 scrollbar-thin">
            {SORT_OPTIONS.map((opt) => {
              const isSelected = opt.id === currentSort;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onSortChange(opt.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors ${
                    isSelected
                      ? 'bg-brand-600 text-white font-semibold shadow-xs'
                      : 'text-slate-300 hover:bg-surface-800 hover:text-white'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 ml-2 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
