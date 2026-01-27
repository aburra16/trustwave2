import { useInfiniteQuery } from '@tanstack/react-query';
import { NRelay1 } from '@nostrify/nostrify';
import { useBatchTrustScores } from './useTrustScore';
import { useCurrentUser } from './useCurrentUser';
import { useHiddenItems } from './useHiddenItems';
import { DCOSL_RELAY, KINDS, SONGS_LIST_A_TAG, MUSICIANS_LIST_A_TAG, TRUST_THRESHOLD } from '@/lib/constants';
import type { ListItem, ScoredListItem } from '@/lib/types';
import type { NostrEvent } from '@nostrify/nostrify';

const SEVEN_DAYS_AGO = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
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
 * Hook for trending songs (last 7 days) with infinite scroll pagination
 */
export function useTrendingSongs() {
  const { user } = useCurrentUser();
  const { hiddenIds } = useHiddenItems();
  
  // First get all items and reactions
  const dataQuery = useInfiniteQuery({
    queryKey: ['trending', 'songs', 'data'],
    queryFn: async ({ pageParam = 0 }) => {
      const offset = pageParam * PAGE_SIZE;
      
      console.log(`Fetching trending songs page ${pageParam} (offset: ${offset})`);
      
      const relay = new NRelay1(DCOSL_RELAY);
      
      try {
        // Fetch recent list items
        const items = await relay.query([{
          kinds: [KINDS.LIST_ITEM, KINDS.LIST_ITEM_REPLACEABLE],
          '#z': [SONGS_LIST_A_TAG],
          since: SEVEN_DAYS_AGO,
          limit: PAGE_SIZE * 10, // Fetch larger batch, we'll paginate client-side
        }]);
        
        const parsedItems = items.map(parseListItem).filter(item => !hiddenIds.includes(item.id));
        
        // Fetch reactions for these items (last 7 days)
        const itemIds = parsedItems.map(i => i.id);
        const reactions = await fetchReactionsForItems(itemIds, SEVEN_DAYS_AGO);
        
        return { items: parsedItems, reactions };
      } finally {
        await relay.close();
      }
    },
    getNextPageParam: (lastPage, pages) => {
      // Simple pagination - just increment page number
      return pages.length;
    },
    initialPageParam: 0,
    staleTime: 2 * 60 * 1000,
  });
  
  // Get all reaction authors
  const allReactions = dataQuery.data?.pages.flatMap(page => 
    Array.from(page.reactions.values()).flat()
  ) || [];
  
  const reactionAuthors = Array.from(new Set(allReactions.map(r => r.pubkey)));
  
  // Fetch trust scores
  const { data: trustScores } = useBatchTrustScores(reactionAuthors);
  
  // Calculate scores for all pages
  const scoredPages = dataQuery.data?.pages.map(page => {
    const scored = calculateScores(page.items, page.reactions, trustScores || new Map(), user?.pubkey);
    return scored.filter(item => item.score >= 0).sort((a, b) => b.score - a.score);
  }) || [];
  
  // Flatten and paginate client-side
  const allScored = scoredPages.flat();
  
  return {
    ...dataQuery,
    songs: allScored,
    hasMore: allScored.length >= PAGE_SIZE && allScored.length % PAGE_SIZE === 0,
  };
}

/**
 * Hook for trending artists (last 7 days) with infinite scroll pagination
 * Aggregates scores across all their songs
 */
export function useTrendingArtists() {
  const { user } = useCurrentUser();
  const { hiddenIds } = useHiddenItems();
  
  const dataQuery = useInfiniteQuery({
    queryKey: ['trending', 'artists', 'data'],
    queryFn: async ({ pageParam = 0 }) => {
      console.log(`Fetching trending artists page ${pageParam}`);
      
      const relay = new NRelay1(DCOSL_RELAY);
      
      try {
        const items = await relay.query([{
          kinds: [KINDS.LIST_ITEM, KINDS.LIST_ITEM_REPLACEABLE],
          '#z': [MUSICIANS_LIST_A_TAG],
          since: SEVEN_DAYS_AGO,
          limit: PAGE_SIZE * 10,
        }]);
        
        const parsedItems = items.map(parseListItem).filter(item => !hiddenIds.includes(item.id));
        const itemIds = parsedItems.map(i => i.id);
        const reactions = await fetchReactionsForItems(itemIds, SEVEN_DAYS_AGO);
        
        return { items: parsedItems, reactions };
      } finally {
        await relay.close();
      }
    },
    getNextPageParam: (lastPage, pages) => pages.length,
    initialPageParam: 0,
    staleTime: 2 * 60 * 1000,
  });
  
  const allReactions = dataQuery.data?.pages.flatMap(page => 
    Array.from(page.reactions.values()).flat()
  ) || [];
  
  const reactionAuthors = Array.from(new Set(allReactions.map(r => r.pubkey)));
  const { data: trustScores } = useBatchTrustScores(reactionAuthors);
  
  const scoredPages = dataQuery.data?.pages.map(page => {
    const scored = calculateScores(page.items, page.reactions, trustScores || new Map(), user?.pubkey);
    return scored.filter(item => item.score >= 0).sort((a, b) => b.score - a.score);
  }) || [];
  
  const allScored = scoredPages.flat();
  
  return {
    ...dataQuery,
    artists: allScored,
    hasMore: allScored.length >= PAGE_SIZE && allScored.length % PAGE_SIZE === 0,
  };
}
