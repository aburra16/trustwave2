import { useQuery } from '@tanstack/react-query';
import { NRelay1, type NostrEvent } from '@nostrify/nostrify';
import { useBatchTrustScores } from './useTrustScore';
import { useCurrentUser } from './useCurrentUser';
import { DCOSL_RELAY, KINDS, MUSICIANS_LIST_A_TAG, TRUST_THRESHOLD, SYSTEM_CURATORS } from '@/lib/constants';
import type { ScoredListItem } from '@/lib/types';

/**
 * Fetch a specific musician by their feed GUID (on-demand)
 * Used when musician isn't in the loaded list
 */
export function useMusicianByGuid(guid: string | undefined) {
  const { user } = useCurrentUser();
  
  const dataQuery = useQuery({
    queryKey: ['musicianByGuid', guid],
    queryFn: async () => {
      if (!guid) return null;
      
      console.log('Fetching musician by GUID:', guid);
      
      const relay = new NRelay1(DCOSL_RELAY);
      
      try {
        const events = await relay.query([{
          kinds: [KINDS.LIST_ITEM, KINDS.LIST_ITEM_REPLACEABLE],
          '#z': [MUSICIANS_LIST_A_TAG],
          '#t': [guid], // Exact GUID lookup
          limit: 10, // Artist might have multiple releases
        }]);
        
        console.log(`Found ${events.length} musician events for GUID ${guid}`);
        
        if (events.length === 0) return null;
        
        // Parse events
        const musicians = events.map(event => {
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
          };
        });
        
        // Fetch reactions for these musicians
        const itemIds = musicians.map(m => m.id);
        const reactions = await relay.query([{
          kinds: [KINDS.REACTION],
          '#e': itemIds,
          limit: 100,
        }]);
        
        const reactionsMap = new Map<string, NostrEvent[]>();
        for (const reaction of reactions) {
          const targetId = reaction.tags.find(t => t[0] === 'e')?.[1];
          if (targetId) {
            const existing = reactionsMap.get(targetId) || [];
            existing.push(reaction);
            reactionsMap.set(targetId, existing);
          }
        }
        
        return { musicians, reactions: reactionsMap };
      } finally {
        await relay.close();
      }
    },
    enabled: !!guid,
    staleTime: 5 * 60 * 1000,
  });
  
  // Get reaction authors for trust scores
  const allReactions = dataQuery.data ? Array.from(dataQuery.data.reactions.values()).flat() : [];
  const reactionAuthors = Array.from(new Set(allReactions.map(r => r.pubkey)));
  
  const { data: trustScores } = useBatchTrustScores(reactionAuthors);
  
  // Calculate scores
  const scoredMusicians: ScoredListItem[] = dataQuery.data && trustScores
    ? dataQuery.data.musicians.map(musician => {
        const itemReactions = dataQuery.data.reactions.get(musician.id) || [];
        const reactionsByAuthor = new Map<string, NostrEvent>();
        
        for (const reaction of itemReactions) {
          const existing = reactionsByAuthor.get(reaction.pubkey);
          if (!existing || reaction.created_at > existing.created_at) {
            reactionsByAuthor.set(reaction.pubkey, reaction);
          }
        }
        
        let upvotes = 0;
        let downvotes = 0;
        let userReaction: '+' | '-' | null = null;
        const upvoterEvents: NostrEvent[] = [];
        const downvoterEvents: NostrEvent[] = [];
        
        for (const reaction of reactionsByAuthor.values()) {
          const authorRank = trustScores.get(reaction.pubkey) || SYSTEM_CURATORS[reaction.pubkey] || 0;
          const isTrusted = authorRank > TRUST_THRESHOLD;
          const isCurrentUser = reaction.pubkey === user?.pubkey;
          
          if (isCurrentUser) {
            userReaction = reaction.content === '+' ? '+' : reaction.content === '-' ? '-' : null;
          }
          
          if (!isTrusted && !isCurrentUser) continue;
          
          if (reaction.content === '+' || reaction.content === '') {
            upvotes++;
            upvoterEvents.push(reaction);
          } else if (reaction.content === '-') {
            downvotes++;
            downvoterEvents.push(reaction);
          }
        }
        
        return {
          ...musician,
          score: upvotes - downvotes,
          upvotes,
          downvotes,
          userReaction,
          upvoterEvents,
          downvoterEvents,
        };
      })
    : dataQuery.data?.musicians.map(m => ({ ...m, score: 0, upvotes: 0, downvotes: 0, userReaction: null })) || [];
  
  return {
    musicians: scoredMusicians,
    isLoading: dataQuery.isLoading,
  };
}
