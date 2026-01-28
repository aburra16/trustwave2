import { useQuery } from '@tanstack/react-query';
import { PODCAST_INDEX_PROXY } from '@/lib/constants';
import type { PodcastIndexEpisode } from '@/lib/types';

/**
 * Fetch episodes for multiple feed IDs in parallel
 * Used when showing all albums for an artist
 */
export function useMultipleFeedEpisodes(feedIds: string[], enabled: boolean) {
  return useQuery({
    queryKey: ['multipleFeedEpisodes', feedIds.join(',')],
    queryFn: async (): Promise<PodcastIndexEpisode[]> => {
      if (feedIds.length === 0) return [];
      
      console.log(`Fetching episodes for ${feedIds.length} feeds...`);
      
      // Fetch all feeds in parallel
      const promises = feedIds.map(async (feedId) => {
        try {
          const response = await fetch(
            `${PODCAST_INDEX_PROXY}/episodes/byfeedid?id=${feedId}&max=100`
          );
          
          if (!response.ok) return [];
          
          const data = await response.json();
          return data.items || [];
        } catch (error) {
          console.error(`Failed to fetch episodes for feed ${feedId}:`, error);
          return [];
        }
      });
      
      const results = await Promise.all(promises);
      const allEpisodes = results.flat();
      
      console.log(`Found ${allEpisodes.length} total episodes across ${feedIds.length} feeds`);
      
      return allEpisodes;
    },
    enabled: enabled && feedIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
