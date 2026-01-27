import { useQuery } from '@tanstack/react-query';
import { NRelay1 } from '@nostrify/nostrify';
import { useBatchTrustScores } from './useTrustScore';
import { useMusiciansList } from './useDecentralizedList';
import { useCurrentUser } from './useCurrentUser';
import { useHiddenItems } from './useHiddenItems';
import { DCOSL_RELAY, KINDS, SONGS_LIST_A_TAG, MUSICIANS_LIST_A_TAG, TRUST_THRESHOLD } from '@/lib/constants';
import type { ListItem, ScoredListItem } from '@/lib/types';
import type { NostrEvent } from '@nostrify/nostrify';

const PAGE_SIZE = 25;

/**
 * Parse list item - same as in useDecentralizedList
 */
function parseListItem(event: NostrEvent): ListItem {
  const tags = event.tags;
  
  return {
    id: event.id,
    pubkey: event.pubkey,
    listATag: tags.find(([name]) => name === 'z')?.[1] || '',
    name: tags.find(([name]) => name === 'name')?.[1],
    title: tags.find(([name]) => name === 'title')?.[1],
    description: tags.find(([name]) => name === 'description')?.[1],
    createdAt: event.created_at,
    event,
    songGuid: tags.find(([name]) => name === 't')?.[1],
    songTitle: tags.find(([name]) => name === 'title')?.[1],
    songArtist: tags.find(([name]) => name === 'artist')?.[1],
    songUrl: tags.find(([name]) => name === 'url')?.[1],
    songArtwork: tags.find(([name]) => name === 'artwork')?.[1],
    songDuration: parseInt(tags.find(([name]) => name === 'duration')?.[1] || '0', 10),
    feedId: tags.find(([name]) => name === 'feedId')?.[1],
    feedGuid: tags.find(([name]) => name === 'feedGuid')?.[1],
    musicianName: tags.find(([name]) => name === 'name')?.[1],
    musicianFeedGuid: tags.find(([name]) => name === 't')?.[1] || tags.find(([name]) => name === 'feedGuid')?.[1],
    musicianFeedUrl: tags.find(([name]) => name === 'feedUrl')?.[1],
    musicianArtwork: tags.find(([name]) => name === 'artwork')?.[1],
  };
}

/**
 * Fetch reactions for items
 */
async function fetchReactionsForItems(itemIds: string[], since?: number): Promise<Map<string, NostrEvent[]>> {
  const reactionsMap = new Map<string, NostrEvent[]>();
  
  if (itemIds.length === 0) return reactionsMap;
  
  const relay = new NRelay1(DCOSL_RELAY);
  
  try {
    const filter: any = {
      kinds: [KINDS.REACTION],
      '#e': itemIds,
      limit: 2000,
    };
    
    if (since) {
      filter.since = since;
    }
    
    const events = await relay.query([filter]);
    
    for (const event of events) {
      const eTags = event.tags.filter(([name]) => name === 'e');
      const targetId = eTags[eTags.length - 1]?.[1];
      
      if (targetId) {
        const existing = reactionsMap.get(targetId) || [];
        existing.push(event);
        reactionsMap.set(targetId, existing);
      }
    }
    
    return reactionsMap;
  } finally {
    await relay.close();
  }
}

/**
 * Calculate scores with trust filtering
 */
function calculateScores(
  items: ListItem[],
  reactions: Map<string, NostrEvent[]>,
  trustScores: Map<string, number>,
  userPubkey?: string
): ScoredListItem[] {
  return items.map(item => {
    const itemReactions = reactions.get(item.id) || [];
    
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
      const authorRank = trustScores.get(reaction.pubkey) || 0;
      const isTrusted = authorRank > TRUST_THRESHOLD;
      const isCurrentUser = reaction.pubkey === userPubkey;
      
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
      ...item,
      score: upvotes - downvotes,
      upvotes,
      downvotes,
      userReaction,
      upvoterEvents,
      downvoterEvents,
    };
  });
}

/**
 * Hook for trending songs with client-side pagination
 * Fetches all songs once, then paginates in the component
 */
export function useTrendingSongs() {
  const { user } = useCurrentUser();
  const { hiddenIds } = useHiddenItems();
  
  const dataQuery = useQuery({
    queryKey: ['trending', 'songs', 'data'],
    queryFn: async () => {
      console.log('Fetching trending songs...');
      
      const relay = new NRelay1(DCOSL_RELAY);
      
      try {
        const items = await relay.query([{
          kinds: [KINDS.LIST_ITEM, KINDS.LIST_ITEM_REPLACEABLE],
          '#z': [SONGS_LIST_A_TAG],
          limit: 1000, // Fetch up to 1000 songs
        }]);
        
        const parsedItems = items.map(parseListItem).filter(item => !hiddenIds.includes(item.id));
        
        const itemIds = parsedItems.map(i => i.id);
        const reactions = await fetchReactionsForItems(itemIds);
        
        console.log(`Fetched ${parsedItems.length} songs with reactions`);
        
        return { items: parsedItems, reactions };
      } finally {
        await relay.close();
      }
    },
    staleTime: 2 * 60 * 1000,
  });
  
  const allReactions = dataQuery.data ? Array.from(dataQuery.data.reactions.values()).flat() : [];
  const reactionAuthors = Array.from(new Set(allReactions.map(r => r.pubkey)));
  
  const { data: trustScores, isLoading: loadingScores } = useBatchTrustScores(reactionAuthors);
  
  // Wait for both data and trust scores
  const scoredSongs = dataQuery.data && trustScores
    ? calculateScores(dataQuery.data.items, dataQuery.data.reactions, trustScores, user?.pubkey)
        .filter(item => item.score >= 0)
        .sort((a, b) => b.score - a.score) // Sort by score descending
    : [];
  
  console.log(`Returning ${scoredSongs.length} scored and sorted songs (trustScores: ${trustScores?.size || 0})`);
  
  return {
    songs: scoredSongs,
    isLoading: dataQuery.isLoading || loadingScores,
  };
}

/**
 * Hook for trending artists
 * Just uses the regular musicians list (already has WoT filtering and user's additions)
 */
export function useTrendingArtists() {
  const { data: musicians, isLoading } = useMusiciansList();
  
  console.log(`useTrendingArtists: ${musicians?.length || 0} musicians loaded`);
  
  return {
    artists: musicians || [],
    isLoading,
  };
}
