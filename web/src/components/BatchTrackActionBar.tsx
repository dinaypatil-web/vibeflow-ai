import React from 'react';
import { Plus, X, CheckSquare, Square, ListPlus } from 'lucide-react';
import { MediaItem } from '../types';

interface BatchTrackActionBarProps {
  selectedTracks: MediaItem[];
  allTracks?: MediaItem[];
  onSelectAll?: () => void;
  onClear: () => void;
  onAddToPlaylist: (tracks: MediaItem[]) => void;
  itemName?: string; // e.g. "tracks", "songs", "files"
}

export const BatchTrackActionBar: React.FC<BatchTrackActionBarProps> = ({
  selectedTracks,
  allTracks = [],
  onSelectAll,
  onClear,
  onAddToPlaylist,
  itemName = 'tracks'
}) => {
  if (selectedTracks.length === 0) return null;

  const isAllSelected = allTracks.length > 0 && selectedTracks.length === allTracks.length;

  return (
    <div className="fixed bottom-24 md:bottom-20 left-1/2 -translate-x-1/2 z-40 bg-surface-900/95 backdrop-blur-2xl border border-brand-500/40 rounded-2xl p-2.5 px-5 shadow-2xl shadow-brand-500/20 flex items-center gap-3 sm:gap-4 text-xs animate-in slide-in-from-bottom-5 duration-200 ring-1 ring-white/10 max-w-[95vw]">
      {/* Count pill */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="w-6 h-6 rounded-full bg-brand-500 text-white font-bold flex items-center justify-center text-xs shadow-md">
          {selectedTracks.length}
        </span>
        <span className="font-bold text-white hidden sm:inline">
          {selectedTracks.length} {itemName} selected
        </span>
      </div>

      <div className="h-4 w-[1px] bg-white/10 shrink-0" />

      {/* Select / Deselect All */}
      {onSelectAll && (
        <button
          type="button"
          onClick={onSelectAll}
          className="flex items-center gap-1.5 text-slate-300 hover:text-white font-medium hover:underline shrink-0"
        >
          {isAllSelected ? (
            <>
              <Square className="w-3.5 h-3.5 text-slate-400" />
              <span>Deselect All</span>
            </>
          ) : (
            <>
              <CheckSquare className="w-3.5 h-3.5 text-brand-400" />
              <span>Select All</span>
            </>
          )}
        </button>
      )}

      {/* Add to Playlist Primary Button */}
      <button
        type="button"
        onClick={() => onAddToPlaylist(selectedTracks)}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-brand-500/30 active:scale-95 shrink-0 cursor-pointer"
      >
        <ListPlus className="w-4 h-4" />
        <span>Add to Playlist</span>
      </button>

      {/* Clear selection button */}
      <button
        type="button"
        onClick={onClear}
        className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-surface-800 transition-colors shrink-0"
        title="Clear selection"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

