import { useQuery } from '@tanstack/react-query';
import { PODCAST_INDEX_PROXY } from '@/lib/constants';
import type { PodcastIndexFeed } from '@/lib/types';

/**
 * Get feed details by GUID (podcast GUID)
 * This searches for the feed and returns the first match
 */
export function usePodcastIndexFeedByGuid(podcastGuid: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['podcastIndex', 'feedByGuid', podcastGuid],
    queryFn: async (): Promise<PodcastIndexFeed | null> => {
      if (!podcastGuid) return null;
      
      // Search by the GUID - this should return the exact feed
      const response = await fetch(
        `${PODCAST_INDEX_PROXY}/search?q=${encodeURIComponent(podcastGuid)}&medium=music&max=1`
      );
      
      if (!response.ok) {
        console.error(`Failed to fetch feed by GUID: ${response.statusText}`);
        return null;
      }
      
      const data = await response.json();
      
      // Find the feed that matches the GUID exactly
      const feed = data.feeds?.find((f: PodcastIndexFeed) => f.podcastGuid === podcastGuid);
      
      if (feed) {
        console.log('Found feed by GUID:', feed);
      } else {
        console.warn('No feed found with GUID:', podcastGuid);
      }
      
      return feed || null;
    },
    enabled: enabled && !!podcastGuid,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
