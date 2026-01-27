import { useQuery } from '@tanstack/react-query';
import { NRelay1 } from '@nostrify/nostrify';
import { useHiddenItems } from './useHiddenItems';
import { DCOSL_RELAY, KINDS, MUSICIANS_LIST_A_TAG, PODCAST_INDEX_PROXY } from '@/lib/constants';
import type { PodcastIndexFeed, ScoredListItem } from '@/lib/types';

interface HybridSearchResult {
  // Artists found on both API and relay (full data with votes)
  onTrustWave: ScoredListItem[];
  // Artists found on API but not on relay (can be imported)
  notOnTrustWave: PodcastIndexFeed[];
  isLoading: boolean;
}

/**
 * Hybrid Search: Uses Podcast Index API for text search,
 * then looks up exact GUIDs on the Nostr relay
 */
export function useHybridSearch(searchQuery: string): HybridSearchResult {
  const { hiddenIds } = useHiddenItems();
  
  return useQuery({
    queryKey: ['hybridSearch', searchQuery],
    queryFn: async (): Promise<{ onTrustWave: ScoredListItem[], notOnTrustWave: PodcastIndexFeed[] }> => {
      if (!searchQuery.trim()) {
        return { onTrustWave: [], notOnTrustWave: [] };
      }
      
      console.log('🔍 Hybrid Search for:', searchQuery);
      
      // Phase 1: Search Podcast Index API
      console.log('📡 Searching Podcast Index API...');
      const apiResponse = await fetch(
        `${PODCAST_INDEX_PROXY}/search?q=${encodeURIComponent(searchQuery)}&medium=music&max=20`
      );
      
      if (!apiResponse.ok) {
        console.error('API search failed:', apiResponse.statusText);
        return { onTrustWave: [], notOnTrustWave: [] };
      }
      
      const apiData = await apiResponse.json();
      const apiFeeds: PodcastIndexFeed[] = apiData.feeds || [];
      
      console.log(`📋 API returned ${apiFeeds.length} results`);
      
      if (apiFeeds.length === 0) {
        return { onTrustWave: [], notOnTrustWave: [] };
      }
      
      // Phase 2: Extract GUIDs and query relay
      const guids = apiFeeds
        .map(feed => feed.podcastGuid)
        .filter(guid => guid && guid.length > 0);
      
      console.log(`🔑 Looking up ${guids.length} GUIDs on relay...`);
      
      const relay = new NRelay1(DCOSL_RELAY);
      
      let relayEvents = [];
      try {
        relayEvents = await relay.query([{
          kinds: [KINDS.LIST_ITEM, KINDS.LIST_ITEM_REPLACEABLE],
          '#z': [MUSICIANS_LIST_A_TAG],
          '#t': guids, // Lookup by exact GUID match
        }]);
        
        console.log(`✅ Found ${relayEvents.length} musicians on relay`);
      } finally {
        await relay.close();
      }
      
      // Phase 3: Separate into "on TrustWave" vs "not on TrustWave"
      const relayGuidSet = new Set(
        relayEvents.map(e => e.tags.find(t => t[0] === 't')?.[1]).filter(Boolean)
      );
      
      const onTrustWave: ScoredListItem[] = relayEvents
        .filter(e => !hiddenIds.includes(e.id))
        .map(event => {
          const tags = event.tags;
          return {
            id: event.id,
            pubkey: event.pubkey,
            listATag: tags.find(([name]) => name === 'z')?.[1] || '',
            musicianName: tags.find(([name]) => name === 'name')?.[1],
            name: tags.find(([name]) => name === 'name')?.[1],
            musicianFeedGuid: tags.find(([name]) => name === 't')?.[1],
            feedGuid: tags.find(([name]) => name === 'feedGuid')?.[1],
            feedId: tags.find(([name]) => name === 'feedId')?.[1],
            musicianFeedUrl: tags.find(([name]) => name === 'feedUrl')?.[1],
            musicianArtwork: tags.find(([name]) => name === 'artwork')?.[1],
            createdAt: event.created_at,
            event,
            score: 0, // Search doesn't need scoring
            upvotes: 0,
            downvotes: 0,
            userReaction: null,
          };
        });
      
      const notOnTrustWave: PodcastIndexFeed[] = apiFeeds.filter(
        feed => feed.podcastGuid && !relayGuidSet.has(feed.podcastGuid)
      );
      
      console.log(`📊 Results: ${onTrustWave.length} on TrustWave, ${notOnTrustWave.length} can be imported`);
      
      return { onTrustWave, notOnTrustWave };
    },
    enabled: searchQuery.trim().length > 0,
    staleTime: 2 * 60 * 1000,
  });
}
