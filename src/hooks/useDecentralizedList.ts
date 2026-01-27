import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { NRelay1, type NostrEvent } from '@nostrify/nostrify';
import { useBatchTrustScores } from './useTrustScore';
import { useCurrentUser } from './useCurrentUser';
import { useHiddenItems } from './useHiddenItems';
import { 
  DCOSL_RELAY, 
  KINDS, 
  SONGS_LIST_A_TAG, 
  MUSICIANS_LIST_A_TAG,
  TRUST_THRESHOLD 
} from '@/lib/constants';
import type { ListItem, ScoredListItem } from '@/lib/types';

/**
 * Parse a list item event (kind 9999/39999) into a ListItem object
 */
function parseListItem(event: NostrEvent): ListItem {
  const tags = event.tags;
  
  const listATag = tags.find(([name]) => name === 'z')?.[1] || '';
  const songGuid = tags.find(([name]) => name === 't')?.[1];
  const title = tags.find(([name]) => name === 'title')?.[1];
  const artist = tags.find(([name]) => name === 'artist')?.[1];
  const url = tags.find(([name]) => name === 'url')?.[1];
  const artwork = tags.find(([name]) => name === 'artwork')?.[1];
  const durationStr = tags.find(([name]) => name === 'duration')?.[1];
  const feedId = tags.find(([name]) => name === 'feedId')?.[1];
  const feedGuid = tags.find(([name]) => name === 'feedGuid')?.[1];
  const name = tags.find(([name]) => name === 'name')?.[1];
  const feedUrl = tags.find(([name]) => name === 'feedUrl')?.[1];
  const description = tags.find(([name]) => name === 'description')?.[1];
  
  return {
    id: event.id,
    pubkey: event.pubkey,
    listATag,
    name,
    title,
    description,
    createdAt: event.created_at,
    event,
    // Song fields
    songGuid,
    songTitle: title,
    songArtist: artist,
    songUrl: url,
    songArtwork: artwork,
    songDuration: durationStr ? parseInt(durationStr, 10) : undefined,
    feedId,
    feedGuid,
    // Musician fields
    musicianName: name,
    musicianFeedGuid: songGuid || feedGuid,
    musicianFeedUrl: feedUrl,
    musicianArtwork: artwork,
  };
}

/**
 * Fetch list items from the DCOSL relay
 * Limited to avoid performance issues with large datasets
 */
async function fetchListItems(listATag: string, limit = 500): Promise<ListItem[]> {
  console.log(`Fetching list items for: ${listATag} (limit: ${limit})`);
  console.log(`Connecting to relay: ${DCOSL_RELAY}`);
  
  const relay = new NRelay1(DCOSL_RELAY);
  
  try {
    const filter = {
      kinds: [KINDS.LIST_ITEM, KINDS.LIST_ITEM_REPLACEABLE],
      '#z': [listATag],
      limit, // Configurable limit
    };
    console.log('Query filter:', JSON.stringify(filter));
    
    const events = await relay.query([filter]);
    console.log(`Fetched ${events.length} list items from relay`);
    
    if (events.length > 0) {
      console.log('First event sample:', JSON.stringify(events[0], null, 2));
    }
    
    return events.map(parseListItem);
  } catch (error) {
    console.error('Error fetching list items:', error);
    throw error;
  } finally {
    await relay.close();
  }
}

/**
 * Fetch reactions (kind 7) for list items
 */
async function fetchReactions(itemIds: string[]): Promise<Map<string, NostrEvent[]>> {
  const reactionsMap = new Map<string, NostrEvent[]>();
  
  if (itemIds.length === 0) return reactionsMap;
  
  console.log(`Fetching reactions for ${itemIds.length} items from ${DCOSL_RELAY}`);
  
  const relay = new NRelay1(DCOSL_RELAY);
  
  try {
    const events = await relay.query([{
      kinds: [KINDS.REACTION],
      '#e': itemIds,
      limit: 2000,
    }]);
    
    console.log(`Fetched ${events.length} total reactions`);
    if (events.length > 0) {
      console.log('Sample reaction:', events[0]);
    }
    
    for (const event of events) {
      // Get the event ID being reacted to (last e tag)
      const eTags = event.tags.filter(([name]) => name === 'e');
      const targetId = eTags[eTags.length - 1]?.[1];
      
      if (targetId) {
        const existing = reactionsMap.get(targetId) || [];
        existing.push(event);
        reactionsMap.set(targetId, existing);
      }
    }
    
    console.log(`Reactions mapped to ${reactionsMap.size} items`);
    
    return reactionsMap;
  } finally {
    await relay.close();
  }
}

/**
 * Calculate scores for list items based on trusted reactions
 * Uses Web-of-Trust filtering (rank > 50)
 */
function calculateScores(
  items: ListItem[],
  reactions: Map<string, NostrEvent[]>,
  trustScores: Map<string, number>,
  userPubkey?: string
): ScoredListItem[] {
  console.log(`Calculating scores with trust scores for ${trustScores.size} pubkeys`);
  
  return items.map(item => {
    const itemReactions = reactions.get(item.id) || [];
    
    let upvotes = 0;
    let downvotes = 0;
    let userReaction: '+' | '-' | null = null;
    
    // Group reactions by author to only count the most recent from each user
    const reactionsByAuthor = new Map<string, NostrEvent>();
    
    for (const reaction of itemReactions) {
      const existing = reactionsByAuthor.get(reaction.pubkey);
      // Keep the most recent reaction (higher created_at)
      if (!existing || reaction.created_at > existing.created_at) {
        reactionsByAuthor.set(reaction.pubkey, reaction);
      }
    }
    
    let totalReactions = 0;
    let trustedReactions = 0;
    let filteredReactions = 0;
    const upvoterEvents: NostrEvent[] = [];
    const downvoterEvents: NostrEvent[] = [];
    
    // Now count the latest reaction from each user
    for (const reaction of reactionsByAuthor.values()) {
      totalReactions++;
      const authorRank = trustScores.get(reaction.pubkey) || 0;
      const isTrusted = authorRank > TRUST_THRESHOLD;
      const isCurrentUser = reaction.pubkey === userPubkey;
      
      // Check if this is the current user's reaction
      if (isCurrentUser) {
        userReaction = reaction.content === '+' ? '+' : 
                       reaction.content === '-' ? '-' : null;
      }
      
      // Only count reactions from trusted users (rank > 50) OR the current user
      if (!isTrusted && !isCurrentUser) {
        filteredReactions++;
        continue;
      }
      
      if (isTrusted) trustedReactions++;
      
      if (reaction.content === '+' || reaction.content === '') {
        upvotes++;
        upvoterEvents.push(reaction);
      } else if (reaction.content === '-') {
        downvotes++;
        downvoterEvents.push(reaction);
      }
    }
    
    // Log filtering stats for first item only (to avoid spam)
    if (item === items[0] && totalReactions > 0) {
      console.log(`Trust filtering stats: ${totalReactions} total reactions, ${trustedReactions} trusted, ${filteredReactions} filtered out`);
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
 * Hook to fetch and score songs from the master songs list
 * Uses on-demand trust score lookups (efficient)
 */
export function useSongsList() {
  const { user } = useCurrentUser();
  const { hiddenIds } = useHiddenItems();
  
  // First, fetch items and reactions without trust scores
  const itemsQuery = useQuery({
    queryKey: ['nostr', 'songsListItems', hiddenIds.length],
    queryFn: async () => {
      console.log('useSongsList: Fetching songs...');
      
      const items = await fetchListItems(SONGS_LIST_A_TAG, 1000); // Limit to 1000 for performance
      console.log(`useSongsList: Found ${items.length} items`);
      
      if (items.length === 0) return { items: [], reactions: new Map() };
      
      const visibleItems = items.filter(item => !hiddenIds.includes(item.id));
      console.log(`useSongsList: ${visibleItems.length} visible after filtering ${hiddenIds.length} hidden`);
      
      const itemIds = visibleItems.map(item => item.id);
      const reactions = await fetchReactions(itemIds);
      console.log(`useSongsList: Found reactions for ${reactions.size} items`);
      
      return { items: visibleItems, reactions };
    },
    staleTime: 60 * 1000,
  });
  
  // Get all unique reaction authors
  const reactionAuthors = Array.from(
    new Set(
      Array.from(itemsQuery.data?.reactions.values() || [])
        .flat()
        .map(r => r.pubkey)
    )
  );
  
  // Batch fetch trust scores for all reaction authors
  const { data: trustScores } = useBatchTrustScores(reactionAuthors);
  
  // Calculate final scores
  return useQuery({
    queryKey: ['nostr', 'songsList', itemsQuery.data, trustScores?.size],
    queryFn: async (): Promise<ScoredListItem[]> => {
      if (!itemsQuery.data) return [];
      
      const { items, reactions } = itemsQuery.data;
      
      const scoredItems = calculateScores(
        items,
        reactions,
        trustScores || new Map(),
        user?.pubkey
      );
      
      const result = scoredItems
        .filter(item => item.score >= 0)
        .sort((a, b) => b.score - a.score);
      
      console.log(`useSongsList: Returning ${result.length} scored items`);
      return result;
    },
    enabled: !!itemsQuery.data,
    staleTime: 60 * 1000,
  });
}

/**
 * Hook to fetch and score musicians from the master musicians list
 * Uses on-demand trust score lookups (efficient)
 */
export function useMusiciansList() {
  const { user } = useCurrentUser();
  const { hiddenIds } = useHiddenItems();
  
  // First, fetch items and reactions without trust scores
  const itemsQuery = useQuery({
    queryKey: ['nostr', 'musiciansListItems', hiddenIds.length],
    queryFn: async () => {
      console.log('useMusiciansList: Fetching musicians...');
      
      const items = await fetchListItems(MUSICIANS_LIST_A_TAG, 1000); // Limit to 1000 for performance
      console.log(`useMusiciansList: Found ${items.length} items`);
      
      if (items.length === 0) return { items: [], reactions: new Map() };
      
      const visibleItems = items.filter(item => !hiddenIds.includes(item.id));
      console.log(`useMusiciansList: ${visibleItems.length} visible after filtering ${hiddenIds.length} hidden`);
      
      const itemIds = visibleItems.map(item => item.id);
      const reactions = await fetchReactions(itemIds);
      console.log(`useMusiciansList: Found reactions for ${reactions.size} items`);
      
      return { items: visibleItems, reactions };
    },
    staleTime: 60 * 1000,
  });
  
  // Get all unique reaction authors
  const reactionAuthors = Array.from(
    new Set(
      Array.from(itemsQuery.data?.reactions.values() || [])
        .flat()
        .map(r => r.pubkey)
    )
  );
  
  // Batch fetch trust scores for all reaction authors
  const { data: trustScores } = useBatchTrustScores(reactionAuthors);
  
  // Calculate final scores
  return useQuery({
    queryKey: ['nostr', 'musiciansList', itemsQuery.data, trustScores?.size],
    queryFn: async (): Promise<ScoredListItem[]> => {
      if (!itemsQuery.data) return [];
      
      const { items, reactions } = itemsQuery.data;
      
      const scoredItems = calculateScores(
        items,
        reactions,
        trustScores || new Map(),
        user?.pubkey
      );
      
      const result = scoredItems
        .filter(item => item.score >= 0)
        .sort((a, b) => b.score - a.score);
      
      console.log(`useMusiciansList: Returning ${result.length} scored items`);
      return result;
    },
    enabled: !!itemsQuery.data,
    staleTime: 60 * 1000,
  });
}

/**
 * Hook to fetch sublists (genre lists that reference the master songs list)
 */
export function useGenreLists() {
  const { nostr } = useNostr();
  
  return useQuery({
    queryKey: ['nostr', 'genreLists'],
    queryFn: async () => {
      const relay = nostr.relay(DCOSL_RELAY);
      
      // Fetch list headers that have the songs list as parent
      const events = await relay.query([{
        kinds: [KINDS.LIST_HEADER, KINDS.LIST_HEADER_REPLACEABLE],
        '#parent': [SONGS_LIST_A_TAG],
        limit: 100,
      }]);
      
      return events.map(event => {
        const names = event.tags.find(([name]) => name === 'names');
        const description = event.tags.find(([name]) => name === 'description')?.[1];
        const genres = event.tags.filter(([name]) => name === 'genre').map(t => t[1]);
        const dTag = event.tags.find(([name]) => name === 'd')?.[1] || event.id;
        
        return {
          id: event.id,
          pubkey: event.pubkey,
          aTag: `${event.kind}:${event.pubkey}:${dTag}`,
          nameSingular: names?.[1] || 'song',
          namePlural: names?.[2] || 'songs',
          description,
          genres,
          createdAt: event.created_at,
          event,
        };
      });
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch items from a specific genre sublist
 * Uses on-demand trust score lookups (efficient)
 */
export function useGenreListItems(listATag: string | undefined) {
  const { user } = useCurrentUser();
  
  const itemsQuery = useQuery({
    queryKey: ['nostr', 'genreListItemsData', listATag],
    queryFn: async () => {
      if (!listATag) return { items: [], reactions: new Map() };
      
      console.log('useGenreListItems: Fetching items...');
      
      const items = await fetchListItems(listATag);
      console.log(`useGenreListItems: Found ${items.length} items`);
      
      if (items.length === 0) return { items: [], reactions: new Map() };
      
      const itemIds = items.map(item => item.id);
      const reactions = await fetchReactions(itemIds);
      
      return { items, reactions };
    },
    enabled: !!listATag,
    staleTime: 60 * 1000,
  });
  
  const reactionAuthors = Array.from(
    new Set(
      Array.from(itemsQuery.data?.reactions.values() || [])
        .flat()
        .map(r => r.pubkey)
    )
  );
  
  const { data: trustScores } = useBatchTrustScores(reactionAuthors);
  
  return useQuery({
    queryKey: ['nostr', 'genreListItems', listATag, itemsQuery.data, trustScores?.size],
    queryFn: async (): Promise<ScoredListItem[]> => {
      if (!itemsQuery.data) return [];
      
      const { items, reactions } = itemsQuery.data;
      
      const scoredItems = calculateScores(
        items,
        reactions,
        trustScores || new Map(),
        user?.pubkey
      );
      
      const result = scoredItems
        .filter(item => item.score >= 0)
        .sort((a, b) => b.score - a.score);
      
      console.log(`useGenreListItems: Returning ${result.length} scored items`);
      return result;
    },
    enabled: !!itemsQuery.data && !!listATag,
    staleTime: 60 * 1000,
  });
}
