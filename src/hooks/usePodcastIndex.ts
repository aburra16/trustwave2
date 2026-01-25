import { useQuery, useMutation } from '@tanstack/react-query';
import { PODCAST_INDEX_PROXY } from '@/lib/constants';
import type { 
  PodcastIndexFeed, 
  PodcastIndexEpisode,
  PodcastIndexSearchResponse,
  PodcastIndexEpisodesResponse 
} from '@/lib/types';

/**
 * Search for music/podcasts on Podcast Index
 */
export function usePodcastIndexSearch(searchTerm: string, enabled = true) {
  return useQuery({
    queryKey: ['podcastIndex', 'search', searchTerm],
    queryFn: async (): Promise<PodcastIndexFeed[]> => {
      if (!searchTerm.trim()) return [];
      
      const response = await fetch(
        `${PODCAST_INDEX_PROXY}/search?q=${encodeURIComponent(searchTerm)}&medium=music`
      );
      
      if (!response.ok) {
        throw new Error(`Podcast Index search failed: ${response.statusText}`);
      }
      
      const data: PodcastIndexSearchResponse = await response.json();
      return data.feeds || [];
    },
    enabled: enabled && searchTerm.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get episodes/tracks for a specific podcast/artist feed
 * Uses the /episodes/byfeedid endpoint proxied through the worker
 */
export function usePodcastIndexEpisodes(feedId: number | string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['podcastIndex', 'episodes', feedId],
    queryFn: async (): Promise<PodcastIndexEpisode[]> => {
      if (!feedId) return [];
      
      try {
        // Add medium=music to only get music episodes, not podcast episodes
        const url = `${PODCAST_INDEX_PROXY}/episodes/byfeedid?id=${feedId}&max=50&medium=music`;
        console.log('Fetching episodes from:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
          console.error(`Podcast Index episodes fetch failed: ${response.status} ${response.statusText}`);
          const text = await response.text();
          console.error('Response body:', text);
          throw new Error(`Podcast Index episodes fetch failed: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Episodes API response:', data);
        
        // The API returns "items" array for episodes
        const episodes = data.items || [];
        console.log(`Fetched ${episodes.length} episodes for feed ${feedId}`);
        return episodes;
      } catch (error) {
        console.error('Error fetching episodes:', error);
        throw error;
      }
    },
    enabled: enabled && !!feedId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

/**
 * Get feed details by ID
 */
export function usePodcastIndexFeed(feedId: number | string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['podcastIndex', 'feed', feedId],
    queryFn: async (): Promise<PodcastIndexFeed | null> => {
      if (!feedId) return null;
      
      const response = await fetch(
        `${PODCAST_INDEX_PROXY}/feed?id=${feedId}`
      );
      
      if (!response.ok) {
        throw new Error(`Podcast Index feed fetch failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.feed || null;
    },
    enabled: enabled && !!feedId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Mutation hook for searching (useful for on-demand searches)
 */
export function usePodcastIndexSearchMutation() {
  return useMutation({
    mutationFn: async (searchTerm: string): Promise<PodcastIndexFeed[]> => {
      if (!searchTerm.trim()) return [];
      
      const response = await fetch(
        `${PODCAST_INDEX_PROXY}/search?q=${encodeURIComponent(searchTerm)}&medium=music`
      );
      
      if (!response.ok) {
        throw new Error(`Podcast Index search failed: ${response.statusText}`);
      }
      
      const data: PodcastIndexSearchResponse = await response.json();
      return data.feeds || [];
    },
  });
}

/**
 * Get value/payment info for a feed
 */
export function usePodcastIndexValue(feedId: number | string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['podcastIndex', 'value', feedId],
    queryFn: async () => {
      if (!feedId) return null;
      
      const response = await fetch(
        `${PODCAST_INDEX_PROXY}/value?id=${feedId}`
      );
      
      if (!response.ok) {
        // Value info might not exist for all feeds
        return null;
      }
      
      const data = await response.json();
      return data.value || null;
    },
    enabled: enabled && !!feedId,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}
