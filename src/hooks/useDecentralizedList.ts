import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { NRelay1, type NostrEvent } from '@nostrify/nostrify';
import { useTrustMap } from './useTrustedAssertions';
import { useCurrentUser } from './useCurrentUser';
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
 */
async function fetchListItems(listATag: string): Promise<ListItem[]> {
  console.log(`Fetching list items for: ${listATag}`);
  console.log(`Connecting to relay: ${DCOSL_RELAY}`);
  
  const relay = new NRelay1(DCOSL_RELAY);
  
  try {
    const filter = {
      kinds: [KINDS.LIST_ITEM, KINDS.LIST_ITEM_REPLACEABLE],
      '#z': [listATag],
      limit: 500,
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
  
  const relay = new NRelay1(DCOSL_RELAY);
  
  try {
    const events = await relay.query([{
      kinds: [KINDS.REACTION],
      '#e': itemIds,
      limit: 2000,
    }]);
    
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
    
    return reactionsMap;
  } finally {
    await relay.close();
  }
}

/**
 * Calculate scores for list items based on trusted reactions
 */
function calculateScores(
  items: ListItem[],
  reactions: Map<string, NostrEvent[]>,
  trustMap: Map<string, number>,
  userPubkey?: string
): ScoredListItem[] {
  return items.map(item => {
    const itemReactions = reactions.get(item.id) || [];
    
    let upvotes = 0;
    let downvotes = 0;
    let userReaction: '+' | '-' | null = null;
    
    for (const reaction of itemReactions) {
      const authorRank = trustMap.get(reaction.pubkey) || 0;
      const isTrusted = authorRank > TRUST_THRESHOLD;
      const isCurrentUser = reaction.pubkey === userPubkey;
      
      // Check if this is the current user's reaction
      if (isCurrentUser) {
        userReaction = reaction.content === '+' ? '+' : 
                       reaction.content === '-' ? '-' : null;
      }
      
      // Count reactions from trusted users OR the current user
      // (so users can always see their own votes)
      if (!isTrusted && !isCurrentUser) continue;
      
      if (reaction.content === '+' || reaction.content === '') {
        upvotes++;
      } else if (reaction.content === '-') {
        downvotes++;
      }
    }
    
    return {
      ...item,
      score: upvotes - downvotes,
      upvotes,
      downvotes,
      userReaction,
    };
  });
}

/**
 * Hook to fetch and score songs from the master songs list
 */
export function useSongsList() {
  const { data: trustMap } = useTrustMap();
  const { user } = useCurrentUser();
  
  return useQuery({
    queryKey: ['nostr', 'songsList'],
    queryFn: async (): Promise<ScoredListItem[]> => {
      console.log('useSongsList: Fetching songs...');
      
      // Fetch list items
      const items = await fetchListItems(SONGS_LIST_A_TAG);
      console.log(`useSongsList: Found ${items.length} items`);
      
      if (items.length === 0) {
        return [];
      }
      
      // Fetch reactions for all items
      const itemIds = items.map(item => item.id);
      const reactions = await fetchReactions(itemIds);
      console.log(`useSongsList: Found reactions for ${reactions.size} items`);
      
      // Calculate scores (use empty trust map if not loaded - will show all items)
      const scoredItems = calculateScores(
        items, 
        reactions, 
        trustMap || new Map(), 
        user?.pubkey
      );
      
      // Filter out negative scores and sort by score descending
      const result = scoredItems
        .filter(item => item.score >= 0)
        .sort((a, b) => b.score - a.score);
      
      console.log(`useSongsList: Returning ${result.length} scored items`);
      return result;
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to fetch and score musicians from the master musicians list
 */
export function useMusiciansList() {
  const { data: trustMap } = useTrustMap();
  const { user } = useCurrentUser();
  
  return useQuery({
    queryKey: ['nostr', 'musiciansList'],
    queryFn: async (): Promise<ScoredListItem[]> => {
      console.log('useMusiciansList: Fetching musicians...');
      
      // Fetch list items
      const items = await fetchListItems(MUSICIANS_LIST_A_TAG);
      console.log(`useMusiciansList: Found ${items.length} items`);
      
      if (items.length === 0) {
        return [];
      }
      
      // Fetch reactions for all items
      const itemIds = items.map(item => item.id);
      const reactions = await fetchReactions(itemIds);
      console.log(`useMusiciansList: Found reactions for ${reactions.size} items`);
      
      // Calculate scores
      const scoredItems = calculateScores(
        items, 
        reactions, 
        trustMap || new Map(), 
        user?.pubkey
      );
      
      // Filter out negative scores and sort by score descending
      const result = scoredItems
        .filter(item => item.score >= 0)
        .sort((a, b) => b.score - a.score);
      
      console.log(`useMusiciansList: Returning ${result.length} scored items`);
      return result;
    },
    staleTime: 60 * 1000, // 1 minute
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
 */
export function useGenreListItems(listATag: string | undefined) {
  const { data: trustMap } = useTrustMap();
  const { user } = useCurrentUser();
  
  return useQuery({
    queryKey: ['nostr', 'genreListItems', listATag],
    queryFn: async (): Promise<ScoredListItem[]> => {
      if (!listATag) return [];
      
      console.log('useGenreListItems: Fetching items...');
      
      // Fetch list items
      const items = await fetchListItems(listATag);
      console.log(`useGenreListItems: Found ${items.length} items`);
      
      if (items.length === 0) {
        return [];
      }
      
      // Fetch reactions for all items
      const itemIds = items.map(item => item.id);
      const reactions = await fetchReactions(itemIds);
      
      // Calculate scores
      const scoredItems = calculateScores(
        items, 
        reactions, 
        trustMap || new Map(), 
        user?.pubkey
      );
      
      // Filter out negative scores and sort by score descending
      const result = scoredItems
        .filter(item => item.score >= 0)
        .sort((a, b) => b.score - a.score);
      
      console.log(`useGenreListItems: Returning ${result.length} scored items`);
      return result;
    },
    enabled: !!listATag,
    staleTime: 60 * 1000, // 1 minute
  });
}
