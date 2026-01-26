import { useQuery } from '@tanstack/react-query';
import { NRelay1 } from '@nostrify/nostrify';
import { useTrustProviders } from './useTrustedAssertions';
import { KINDS, GENESIS_CURATOR_PUBKEY, NIP85_RELAY } from '@/lib/constants';

/**
 * Hook to fetch a single user's trust score
 * Much more efficient than building entire trust map
 */
export function useTrustScore(subjectPubkey: string | undefined) {
  const { data: providers } = useTrustProviders();
  
  // Get the service provider info (who calculates the scores)
  const rankProvider = providers?.find(p => p.service === '30382:rank');
  const serviceProviderPubkey = rankProvider?.pubkey || GENESIS_CURATOR_PUBKEY;
  const serviceRelay = rankProvider?.relay || NIP85_RELAY;
  
  return useQuery({
    queryKey: ['trustScore', subjectPubkey, serviceProviderPubkey],
    queryFn: async (): Promise<number> => {
      if (!subjectPubkey) return 0;
      
      console.log(`Looking up trust score for ${subjectPubkey.slice(0, 8)} from provider ${serviceProviderPubkey.slice(0, 8)} on ${serviceRelay}`);
      
      const relay = new NRelay1(serviceRelay);
      
      try {
        const events = await relay.query([{
          kinds: [KINDS.TRUSTED_ASSERTION_PUBKEY],
          authors: [serviceProviderPubkey],
          '#d': [subjectPubkey],
          limit: 1,
        }]);
        
        if (events.length === 0) {
          console.log(`No trust score found for ${subjectPubkey.slice(0, 8)}`);
          return 0;
        }
        
        const rankTag = events[0].tags.find(([name]) => name === 'rank')?.[1];
        const rank = rankTag ? parseInt(rankTag, 10) : 0;
        
        console.log(`Trust score for ${subjectPubkey.slice(0, 8)}: ${rank}`);
        
        return rank;
      } finally {
        await relay.close();
      }
    },
    enabled: !!subjectPubkey,
    staleTime: Infinity, // Cache forever for the session
    gcTime: Infinity, // Don't garbage collect
  });
}

/**
 * Hook to batch fetch trust scores for multiple pubkeys
 * Fetches all in parallel for efficiency
 */
export function useBatchTrustScores(pubkeys: string[]) {
  const { data: providers } = useTrustProviders();
  
  const rankProvider = providers?.find(p => p.service === '30382:rank');
  const serviceProviderPubkey = rankProvider?.pubkey || GENESIS_CURATOR_PUBKEY;
  const serviceRelay = rankProvider?.relay || NIP85_RELAY;
  
  return useQuery({
    queryKey: ['batchTrustScores', pubkeys.join(','), serviceProviderPubkey],
    queryFn: async (): Promise<Map<string, number>> => {
      if (pubkeys.length === 0) return new Map();
      
      console.log(`Batch fetching trust scores for ${pubkeys.length} pubkeys from ${serviceRelay}`);
      
      const relay = new NRelay1(serviceRelay);
      const trustScores = new Map<string, number>();
      
      try {
        // Fetch all in one query using #d filter
        const events = await relay.query([{
          kinds: [KINDS.TRUSTED_ASSERTION_PUBKEY],
          authors: [serviceProviderPubkey],
          '#d': pubkeys,
          limit: pubkeys.length,
        }]);
        
        console.log(`Received ${events.length} trust assertion events for ${pubkeys.length} pubkeys`);
        
        for (const event of events) {
          const dTag = event.tags.find(([name]) => name === 'd')?.[1];
          const rankTag = event.tags.find(([name]) => name === 'rank')?.[1];
          
          if (dTag && rankTag) {
            const rank = parseInt(rankTag, 10);
            trustScores.set(dTag, rank);
          }
        }
        
        console.log(`Parsed ${trustScores.size} trust scores`);
        
        // Log some stats
        const ranks = Array.from(trustScores.values());
        const above50 = ranks.filter(r => r > 50).length;
        console.log(`${above50} pubkeys with rank > 50`);
        
        return trustScores;
      } finally {
        await relay.close();
      }
    },
    enabled: pubkeys.length > 0,
    staleTime: Infinity, // Cache forever for the session
    gcTime: Infinity,
  });
}
