import { Album } from '../types';

export type AlbumSortField = 'default' | 'title' | 'artist' | 'year' | 'trackCount' | 'genre' | 'provider';
export type SortDirection = 'asc' | 'desc';

export interface AlbumSortOption {
  id: string;
  field: AlbumSortField;
  direction: SortDirection;
  label: string;
  shortLabel: string;
}

export const ALBUM_SORT_OPTIONS: AlbumSortOption[] = [
  { id: 'default', field: 'default', direction: 'asc', label: 'Default (Original)', shortLabel: 'Default' },
  { id: 'title-asc', field: 'title', direction: 'asc', label: 'Album Title (A → Z)', shortLabel: 'Title A-Z' },
  { id: 'title-desc', field: 'title', direction: 'desc', label: 'Album Title (Z → A)', shortLabel: 'Title Z-A' },
  { id: 'artist-asc', field: 'artist', direction: 'asc', label: 'Artist (A → Z)', shortLabel: 'Artist A-Z' },
  { id: 'artist-desc', field: 'artist', direction: 'desc', label: 'Artist (Z → A)', shortLabel: 'Artist Z-A' },
  { id: 'year-desc', field: 'year', direction: 'desc', label: 'Release Year (Newest first)', shortLabel: 'Newest' },
  { id: 'year-asc', field: 'year', direction: 'asc', label: 'Release Year (Oldest first)', shortLabel: 'Oldest' },
  { id: 'trackCount-desc', field: 'trackCount', direction: 'desc', label: 'Track Count (Most tracks)', shortLabel: 'Most tracks' },
  { id: 'trackCount-asc', field: 'trackCount', direction: 'asc', label: 'Track Count (Fewest tracks)', shortLabel: 'Fewest tracks' },
  { id: 'provider-asc', field: 'provider', direction: 'asc', label: 'Platform / Source', shortLabel: 'Platform' }
];

export function sortAlbums(albums: Album[], optionId: string): Album[] {
  if (!optionId || optionId === 'default') return albums;
  const opt = ALBUM_SORT_OPTIONS.find(o => o.id === optionId);
  if (!opt) return albums;

  const copy = [...albums];
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
      case 'year': {
        const yA = a.releaseYear || 2023;
        const yB = b.releaseYear || 2023;
        return opt.direction === 'asc' ? yA - yB : yB - yA;
      }
      case 'trackCount': {
        const cA = a.trackCount || a.tracks?.length || 0;
        const cB = b.trackCount || b.tracks?.length || 0;
        return opt.direction === 'asc' ? cA - cB : cB - cA;
      }
      case 'genre': {
        const cmp = (a.genre || '').localeCompare(b.genre || '', undefined, { sensitivity: 'base' });
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
