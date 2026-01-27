import type { ScoredListItem } from './types';

// Keywords that indicate podcast content (not music)
const PODCAST_KEYWORDS = [
  'podcast',
  'episode',
  'interview',
  'talk',
  'discussion',
  'conversation',
  'show',
  'news',
  'daily',
  'weekly',
];

// Maximum duration for music (20 minutes = 1200 seconds)
const MAX_MUSIC_DURATION = 20 * 60; // 1200 seconds

/**
 * Filter out likely podcast content (not music)
 * Based on keywords in title and duration
 */
export function filterOutPodcasts(items: ScoredListItem[]): ScoredListItem[] {
  return items.filter(item => {
    // Check duration - music is typically under 20 minutes
    if (item.songDuration && item.songDuration > MAX_MUSIC_DURATION) {
      console.log(`Filtering out (duration): ${item.songTitle} (${Math.floor(item.songDuration / 60)} min)`);
      return false;
    }
    
    // Check for podcast keywords in title
    const title = (item.songTitle || item.title || '').toLowerCase();
    const hasPodcastKeyword = PODCAST_KEYWORDS.some(keyword => title.includes(keyword));
    
    if (hasPodcastKeyword) {
      console.log(`Filtering out (keyword): ${item.songTitle}`);
      return false;
    }
    
    return true;
  });
}

/**
 * Check if a single item is likely a podcast (not music)
 */
export function isProbablyPodcast(item: ScoredListItem): boolean {
  // Duration check
  if (item.songDuration && item.songDuration > MAX_MUSIC_DURATION) {
    return true;
  }
  
  // Keyword check
  const title = (item.songTitle || item.title || '').toLowerCase();
  return PODCAST_KEYWORDS.some(keyword => title.includes(keyword));
}
