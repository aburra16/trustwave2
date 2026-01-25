import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { NRelay1, type NostrEvent } from '@nostrify/nostrify';
import { useCurrentUser } from './useCurrentUser';
import { 
  GENESIS_CURATOR_PUBKEY, 
  NIP85_RELAY,
  NIP85_FALLBACK_RELAY,
  KINDS,
  TRUST_THRESHOLD 
} from '@/lib/constants';
import type { TrustedAssertion, TrustProvider } from '@/lib/types';

/**
 * Parse a kind 10040 event to extract trust providers
 * Only includes secure (wss://) relays
 */
function parseTrustProviders(event: NostrEvent): TrustProvider[] {
  const providers: TrustProvider[] = [];
  
  for (const tag of event.tags) {
    // Format: ["30382:rank", "<pubkey>", "<relay>"]
    if (tag[0]?.includes(':') && tag.length >= 3) {
      const relay = tag[2];
      
      // Only accept secure WebSocket relays (wss://)
      if (!relay.startsWith('wss://')) {
        console.warn(`Skipping insecure relay in kind 10040: ${relay}`);
        continue;
      }
      
      providers.push({
        service: tag[0],
        pubkey: tag[1],
        relay: tag[2],
      });
    }
  }
  
  return providers;
}

/**
 * Parse a kind 30382 event to extract trusted assertion data
 */
function parseTrustedAssertion(event: NostrEvent): TrustedAssertion | null {
  const dTag = event.tags.find(([name]) => name === 'd')?.[1];
  if (!dTag) return null;
  
  const rankTag = event.tags.find(([name]) => name === 'rank')?.[1];
  const rank = rankTag ? parseInt(rankTag, 10) : 0;
  
  const followersTag = event.tags.find(([name]) => name === 'followers')?.[1];
  const zapAmtRecdTag = event.tags.find(([name]) => name === 'zap_amt_recd')?.[1];
  const zapAmtSentTag = event.tags.find(([name]) => name === 'zap_amt_sent')?.[1];
  
  return {
    pubkey: dTag,
    rank,
    followers: followersTag ? parseInt(followersTag, 10) : undefined,
    zapAmountReceived: zapAmtRecdTag ? parseInt(zapAmtRecdTag, 10) : undefined,
    zapAmountSent: zapAmtSentTag ? parseInt(zapAmtSentTag, 10) : undefined,
    event,
  };
}

/**
 * Hook to fetch the user's trust providers (kind 10040)
 */
export function useTrustProviders() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  
  return useQuery({
    queryKey: ['nostr', 'trustProviders', user?.pubkey],
    queryFn: async (): Promise<TrustProvider[]> => {
      const pubkey = user?.pubkey || GENESIS_CURATOR_PUBKEY;
      
      // Try to fetch from multiple relays
      const relays = ['wss://relay.damus.io', 'wss://relay.primal.net', NIP85_RELAY];
      
      for (const relayUrl of relays) {
        try {
          const relay = nostr.relay(relayUrl);
          const events = await relay.query([{
            kinds: [KINDS.TRUSTED_PROVIDERS],
            authors: [pubkey],
            limit: 1,
          }]);
          
          if (events.length > 0) {
            return parseTrustProviders(events[0]);
          }
        } catch (error) {
          console.warn(`Failed to fetch trust providers from ${relayUrl}:`, error);
        }
      }
      
      // Default to genesis curator's trust providers
      return [{
        service: '30382:rank',
        pubkey: GENESIS_CURATOR_PUBKEY,
        relay: NIP85_RELAY,
      }];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to build a trust map from trusted assertions
 * Returns a Map of pubkey -> rank
 */
export function useTrustMap() {
  const { data: providers, isLoading: providersLoading } = useTrustProviders();
  
  return useQuery({
    queryKey: ['nostr', 'trustMap', providers?.map(p => p.pubkey).join(',')],
    queryFn: async (): Promise<Map<string, number>> => {
      let trustMap = new Map<string, number>();
      
      if (!providers || providers.length === 0) {
        console.log('No trust providers found, using genesis curator fallback');
        // Fallback: use genesis curator as trust source
        trustMap = await fetchTrustAssertions(GENESIS_CURATOR_PUBKEY, NIP85_RELAY);
        
        // TODO: Add fallback relay once it's configured with wss:// (not ws://)
        // if (trustMap.size === 0) {
        //   console.log('Primary relay had no data, trying fallback relay...');
        //   trustMap = await fetchTrustAssertions(GENESIS_CURATOR_PUBKEY, NIP85_FALLBACK_RELAY);
        // }
        
        return trustMap;
      }
      
      // Find the rank provider
      const rankProvider = providers.find(p => p.service === '30382:rank');
      if (rankProvider) {
        return fetchTrustAssertions(rankProvider.pubkey, rankProvider.relay);
      }
      
      return trustMap;
    },
    enabled: !providersLoading,
    staleTime: 10 * 60 * 1000, // 10 minutes (longer since we're fetching a lot)
  });
}

/**
 * Fetch trust assertions from a specific provider with pagination
 * Fetches in batches to avoid rate limiting
 */
async function fetchTrustAssertions(
  providerPubkey: string, 
  relayUrl: string
): Promise<Map<string, number>> {
  const trustMap = new Map<string, number>();
  const BATCH_SIZE = 500; // Fetch 500 at a time to avoid rate limits
  let totalFetched = 0;
  let oldestTimestamp: number | undefined = undefined;
  let hasMore = true;
  
  console.log(`Fetching trust assertions from ${relayUrl}`);
  console.log(`Looking for kind ${KINDS.TRUSTED_ASSERTION_PUBKEY} by author ${providerPubkey}`);
  
  try {
    const relay = new NRelay1(relayUrl);
    
    // Paginate through all events
    while (hasMore) {
      const filter: any = {
        kinds: [KINDS.TRUSTED_ASSERTION_PUBKEY],
        authors: [providerPubkey],
        limit: BATCH_SIZE,
      };
      
      // Add until parameter for pagination (fetch older events)
      if (oldestTimestamp !== undefined) {
        filter.until = oldestTimestamp;
      }
      
      console.log(`Query filter:`, JSON.stringify(filter));
      
      const events = await relay.query([filter]);
      
      console.log(`Received ${events.length} events from relay`);
      
      if (events.length === 0) {
        hasMore = false;
        break;
      }
      
      console.log(`Fetched ${events.length} assertions in this batch`);
      totalFetched += events.length;
      
      for (const event of events) {
        const assertion = parseTrustedAssertion(event);
        if (assertion) {
          trustMap.set(assertion.pubkey, assertion.rank);
        }
        
        // Track oldest timestamp for next batch
        if (!oldestTimestamp || event.created_at < oldestTimestamp) {
          oldestTimestamp = event.created_at;
        }
      }
      
      // If we got fewer events than the batch size, we've reached the end
      if (events.length < BATCH_SIZE) {
        hasMore = false;
      }
      
      // Safety limit: stop after 200 batches (100k events)
      if (totalFetched >= 100000) {
        console.warn('Reached 100k event limit, stopping pagination');
        hasMore = false;
      }
    }
    
    await relay.close();
    
    console.log(`✅ Fetched ${totalFetched} total trust assertions`);
    console.log(`📊 Trust map contains ${trustMap.size} unique pubkeys`);
    
  } catch (error) {
    console.error('Failed to fetch trust assertions:', error);
  }
  
  return trustMap;
}

/**
 * Check if a pubkey is trusted (rank > threshold)
 */
export function useIsTrusted(pubkey: string | undefined) {
  const { data: trustMap, isLoading } = useTrustMap();
  
  if (!pubkey || isLoading || !trustMap) {
    return { isTrusted: false, rank: 0, isLoading };
  }
  
  const rank = trustMap.get(pubkey) || 0;
  return {
    isTrusted: rank > TRUST_THRESHOLD,
    rank,
    isLoading: false,
  };
}

/**
 * Get the trust score for a specific pubkey
 */
export function useTrustScore(pubkey: string | undefined) {
  const { data: trustMap, isLoading } = useTrustMap();
  
  if (!pubkey || isLoading || !trustMap) {
    return { score: 0, isLoading };
  }
  
  return {
    score: trustMap.get(pubkey) || 0,
    isLoading: false,
  };
}
