import { MediaItem } from '../types';

export type SortField = 'default' | 'title' | 'artist' | 'duration' | 'year' | 'genre' | 'mood' | 'provider';
export type SortDirection = 'asc' | 'desc';

export interface SortOption {
  id: string;
  field: SortField;
  direction: SortDirection;
  label: string;
  shortLabel: string;
}

export const SORT_OPTIONS: SortOption[] = [
  { id: 'default', field: 'default', direction: 'asc', label: 'Default (Original)', shortLabel: 'Default' },
  { id: 'title-asc', field: 'title', direction: 'asc', label: 'Title (A → Z)', shortLabel: 'Title A-Z' },
  { id: 'title-desc', field: 'title', direction: 'desc', label: 'Title (Z → A)', shortLabel: 'Title Z-A' },
  { id: 'artist-asc', field: 'artist', direction: 'asc', label: 'Artist (A → Z)', shortLabel: 'Artist A-Z' },
  { id: 'artist-desc', field: 'artist', direction: 'desc', label: 'Artist (Z → A)', shortLabel: 'Artist Z-A' },
  { id: 'duration-asc', field: 'duration', direction: 'asc', label: 'Duration (Shortest first)', shortLabel: 'Shortest' },
  { id: 'duration-desc', field: 'duration', direction: 'desc', label: 'Duration (Longest first)', shortLabel: 'Longest' },
  { id: 'year-desc', field: 'year', direction: 'desc', label: 'Release Year (Newest first)', shortLabel: 'Newest' },
  { id: 'year-asc', field: 'year', direction: 'asc', label: 'Release Year (Oldest first)', shortLabel: 'Oldest' },
  { id: 'genre-asc', field: 'genre', direction: 'asc', label: 'Genre (A → Z)', shortLabel: 'Genre' },
  { id: 'mood-asc', field: 'mood', direction: 'asc', label: 'Mood (A → Z)', shortLabel: 'Mood' },
  { id: 'provider-asc', field: 'provider', direction: 'asc', label: 'Platform / Source', shortLabel: 'Platform' }
];

export function sortMediaItems(items: MediaItem[], optionId: string): MediaItem[] {
  if (!optionId || optionId === 'default') return items;
  const opt = SORT_OPTIONS.find(o => o.id === optionId);
  if (!opt) return items;

  const copy = [...items];
  return copy.sort((a, b) => {
    switch (opt.field) {
      case 'title': {
        const cmp = (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' });
        return opt.direction === 'asc' ? cmp : -cmp;
      }
      case 'artist': {
        const cmp = (a.artist || '').localeCompare(b.artist || '', undefined, { sensitivity: 'base' });
        return opt.direction === 'asc' ? cmp : -cmp;
      }
      case 'duration': {
        const durA = a.duration || 0;
        const durB = b.duration || 0;
        return opt.direction === 'asc' ? durA - durB : durB - durA;
      }
      case 'year': {
        const yearA = a.releaseYear || 2023;
        const yearB = b.releaseYear || 2023;
        return opt.direction === 'asc' ? yearA - yearB : yearB - yearA;
      }
      case 'genre': {
        const cmp = (a.genre || '').localeCompare(b.genre || '', undefined, { sensitivity: 'base' });
        return opt.direction === 'asc' ? cmp : -cmp;
      }
      case 'mood': {
        const cmp = (a.mood || '').localeCompare(b.mood || '', undefined, { sensitivity: 'base' });
        return opt.direction === 'asc' ? cmp : -cmp;
      }
      case 'provider': {
        const cmp = (a.provider || '').localeCompare(b.provider || '', undefined, { sensitivity: 'base' });
        return opt.direction === 'asc' ? cmp : -cmp;
      }
      default:
        return 0;
    }
  });
}
