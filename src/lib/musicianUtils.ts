import type { ScoredListItem } from './types';

/**
 * Group musicians by artist name
 * This aggregates multiple feeds/albums from the same artist into one entry
 */
export function groupMusiciansByArtist(musicians: ScoredListItem[]): ScoredListItem[] {
  console.log('Grouping musicians:', musicians.length, 'entries');
  const artistMap = new Map<string, ScoredListItem[]>();
  
  // Group by artist name (case-insensitive)
  for (const musician of musicians) {
    const artistName = (musician.musicianName || musician.name || 'Unknown Artist').toLowerCase();
    console.log('Processing musician:', artistName, {
      feedId: musician.feedId,
      feedGuid: musician.feedGuid,
      musicianFeedGuid: musician.musicianFeedGuid,
    });
    const existing = artistMap.get(artistName) || [];
    existing.push(musician);
    artistMap.set(artistName, existing);
  }
  
  console.log('Artist map:', Array.from(artistMap.entries()).map(([name, entries]) => ({
    name,
    count: entries.length,
    feedIds: entries.map(e => e.feedId),
  })));
  
  // Create aggregated entries
  const aggregated: ScoredListItem[] = [];
  
  console.log('Creating aggregated entries from', artistMap.size, 'artists');
  
  for (const [artistName, entries] of artistMap.entries()) {
    // Use the entry with the highest score as the primary
    const primary = entries.sort((a, b) => b.score - a.score)[0];
    
    // Aggregate scores across all entries
    const totalUpvotes = entries.reduce((sum, e) => sum + e.upvotes, 0);
    const totalDownvotes = entries.reduce((sum, e) => sum + e.downvotes, 0);
    const totalScore = totalUpvotes - totalDownvotes;
    
    // Check if user has reacted to any entry
    const userReaction = entries.find(e => e.userReaction)?.userReaction || null;
    
    // Create aggregated entry
    aggregated.push({
      ...primary,
      // Override with aggregated data
      score: totalScore,
      upvotes: totalUpvotes,
      downvotes: totalDownvotes,
      userReaction,
      // Add metadata about grouped entries
      description: entries.length > 1 
        ? `${entries.length} releases` 
        : primary.description,
    });
  }
  
  console.log('Returning', aggregated.length, 'aggregated musicians');
  return aggregated.sort((a, b) => b.score - a.score);
}

/**
 * Get all feed IDs for a specific artist
 * Used when viewing a musician's detail page to show all their releases
 */
export function getArtistFeedIds(musicians: ScoredListItem[], artistName: string): string[] {
  const normalizedName = artistName.toLowerCase();
  
  return musicians
    .filter(m => (m.musicianName || m.name || '').toLowerCase() === normalizedName)
    .map(m => m.feedId)
    .filter((id): id is string => !!id);
}

/**
 * Get all musician entries for a specific artist (for detail page)
 */
export function getArtistEntries(musicians: ScoredListItem[], artistName: string): ScoredListItem[] {
  const normalizedName = artistName.toLowerCase();
  
  return musicians.filter(m => 
    (m.musicianName || m.name || '').toLowerCase() === normalizedName
  );
}
