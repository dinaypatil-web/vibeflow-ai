import { Channel } from '../types';

export type ChannelSortField = 'default' | 'name' | 'subscribers' | 'videoCount' | 'verified' | 'provider';
export type SortDirection = 'asc' | 'desc';

export interface ChannelSortOption {
  id: string;
  field: ChannelSortField;
  direction: SortDirection;
  label: string;
  shortLabel: string;
}

export const CHANNEL_SORT_OPTIONS: ChannelSortOption[] = [
  { id: 'default', field: 'default', direction: 'asc', label: 'Default (Original)', shortLabel: 'Default' },
  { id: 'name-asc', field: 'name', direction: 'asc', label: 'Channel Name (A → Z)', shortLabel: 'Name A-Z' },
  { id: 'name-desc', field: 'name', direction: 'desc', label: 'Channel Name (Z → A)', shortLabel: 'Name Z-A' },
  { id: 'subscribers-desc', field: 'subscribers', direction: 'desc', label: 'Subscribers (Most subscribers)', shortLabel: 'Most subs' },
  { id: 'subscribers-asc', field: 'subscribers', direction: 'asc', label: 'Subscribers (Fewest subscribers)', shortLabel: 'Fewest subs' },
  { id: 'videoCount-desc', field: 'videoCount', direction: 'desc', label: 'Track Count (Most tracks)', shortLabel: 'Most tracks' },
  { id: 'videoCount-asc', field: 'videoCount', direction: 'asc', label: 'Track Count (Fewest tracks)', shortLabel: 'Fewest tracks' },
  { id: 'verified-desc', field: 'verified', direction: 'desc', label: 'Verification (Verified first)', shortLabel: 'Verified' },
  { id: 'provider-asc', field: 'provider', direction: 'asc', label: 'Platform / Source', shortLabel: 'Platform' }
];

function parseSubscriberCount(subStr?: string): number {
  if (!subStr) return 0;
  const clean = subStr.trim().toUpperCase();
  if (clean.endsWith('M')) {
    return parseFloat(clean.replace('M', '')) * 1_000_000;
  }
  if (clean.endsWith('K')) {
    return parseFloat(clean.replace('K', '')) * 1_000;
  }
  return parseFloat(clean.replace(/[^\d.]/g, '')) || 0;
}

export function sortChannels(channels: Channel[], optionId: string): Channel[] {
  if (!optionId || optionId === 'default') return channels;
  const opt = CHANNEL_SORT_OPTIONS.find(o => o.id === optionId);
  if (!opt) return channels;

  const copy = [...channels];
  return copy.sort((a, b) => {
    switch (opt.field) {
      case 'name': {
        const cmp = (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
        return opt.direction === 'asc' ? cmp : -cmp;
      }
      case 'subscribers': {
        const subA = parseSubscriberCount(a.subscriberCount);
        const subB = parseSubscriberCount(b.subscriberCount);
        return opt.direction === 'asc' ? subA - subB : subB - subA;
      }
      case 'videoCount': {
        const vA = a.videoCount || 0;
        const vB = b.videoCount || 0;
        return opt.direction === 'asc' ? vA - vB : vB - vA;
      }
      case 'verified': {
        const verA = a.verified ? 1 : 0;
        const verB = b.verified ? 1 : 0;
        return opt.direction === 'asc' ? verA - verB : verB - verA;
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
