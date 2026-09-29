import { MediaItem } from '../types';

export type SortField = 'default' | 'title' | 'artist' | 'duration' | 'date' | 'year' | 'genre' | 'mood' | 'provider';
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
  { id: 'date-desc', field: 'date', direction: 'desc', label: 'Release Date (Newest first)', shortLabel: 'Newest Date' },
  { id: 'date-asc', field: 'date', direction: 'asc', label: 'Release Date (Oldest first)', shortLabel: 'Oldest Date' },
  { id: 'year-desc', field: 'date', direction: 'desc', label: 'Release Date (Newest first)', shortLabel: 'Newest Date' },
  { id: 'year-asc', field: 'date', direction: 'asc', label: 'Release Date (Oldest first)', shortLabel: 'Oldest Date' },
  { id: 'title-asc', field: 'title', direction: 'asc', label: 'Title (A → Z)', shortLabel: 'Title A-Z' },
  { id: 'title-desc', field: 'title', direction: 'desc', label: 'Title (Z → A)', shortLabel: 'Title Z-A' },
  { id: 'artist-asc', field: 'artist', direction: 'asc', label: 'Artist (A → Z)', shortLabel: 'Artist A-Z' },
  { id: 'artist-desc', field: 'artist', direction: 'desc', label: 'Artist (Z → A)', shortLabel: 'Artist Z-A' },
  { id: 'duration-asc', field: 'duration', direction: 'asc', label: 'Duration (Shortest first)', shortLabel: 'Shortest' },
  { id: 'duration-desc', field: 'duration', direction: 'desc', label: 'Duration (Longest first)', shortLabel: 'Longest' },
  { id: 'genre-asc', field: 'genre', direction: 'asc', label: 'Genre (A → Z)', shortLabel: 'Genre' },
  { id: 'mood-asc', field: 'mood', direction: 'asc', label: 'Mood (A → Z)', shortLabel: 'Mood' },
  { id: 'provider-asc', field: 'provider', direction: 'asc', label: 'Platform / Source', shortLabel: 'Platform' }
];

export function parseTrackCompleteDate(item: MediaItem): number {
  if (item.releaseDate) {
    const t = new Date(item.releaseDate).getTime();
    if (!isNaN(t)) return t;
  }
  if (item.addedAt) {
    const t = new Date(item.addedAt).getTime();
    if (!isNaN(t)) return t;
  }
  if (item.releaseYear) {
    return new Date(item.releaseYear, 0, 1).getTime();
  }
  return 0;
}

export function formatCompleteDate(item: MediaItem): string {
  if (item.releaseDate) {
    const d = new Date(item.releaseDate);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }
    return item.releaseDate;
  }
  if (item.addedAt) {
    const d = new Date(item.addedAt);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }
  }
  if (item.releaseYear) {
    return String(item.releaseYear);
  }
  return 'Recent';
}

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
      case 'date':
      case 'year': {
        const timeA = parseTrackCompleteDate(a);
        const timeB = parseTrackCompleteDate(b);
        return opt.direction === 'asc' ? timeA - timeB : timeB - timeA;
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
