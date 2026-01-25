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
      
      console.log('Looking up feed by GUID:', podcastGuid);
      
      // Search by the GUID - this should return the exact feed
      const response = await fetch(
        `${PODCAST_INDEX_PROXY}/search?q=${encodeURIComponent(podcastGuid)}&medium=music&max=10`
      );
      
      if (!response.ok) {
        console.error(`Failed to fetch feed by GUID: ${response.statusText}`);
        return null;
      }
      
      const data = await response.json();
      console.log('Search by GUID returned:', data);
      
      // Find the feed that matches the GUID exactly
      const feed = data.feeds?.find((f: PodcastIndexFeed) => f.podcastGuid === podcastGuid);
      
      if (feed) {
        console.log('Found feed by GUID:', feed.id, feed.title);
      } else {
        console.warn('No feed found with GUID:', podcastGuid);
        console.log('Available feeds:', data.feeds?.map((f: PodcastIndexFeed) => ({ id: f.id, guid: f.podcastGuid, title: f.title })));
      }
      
      return feed || null;
    },
    enabled: enabled && !!podcastGuid,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Get feed details by artist name (fallback when we don't have ID or GUID)
 */
export function usePodcastIndexFeedByName(artistName: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['podcastIndex', 'feedByName', artistName],
    queryFn: async (): Promise<PodcastIndexFeed | null> => {
      if (!artistName) return null;
      
      console.log('Looking up feed by name:', artistName);
      
      const response = await fetch(
        `${PODCAST_INDEX_PROXY}/search?q=${encodeURIComponent(artistName)}&medium=music&max=5`
      );
      
      if (!response.ok) {
        console.error(`Failed to fetch feed by name: ${response.statusText}`);
        return null;
      }
      
      const data = await response.json();
      console.log('Search by name returned:', data);
      
      // Return the first result (best match)
      const feed = data.feeds?.[0] || null;
      
      if (feed) {
        console.log('Found feed by name:', feed.id, feed.title);
      } else {
        console.warn('No feed found with name:', artistName);
      }
      
      return feed;
    },
    enabled: enabled && !!artistName,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
