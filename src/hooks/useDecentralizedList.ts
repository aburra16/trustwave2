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
  const relay = new NRelay1(DCOSL_RELAY);
  
  try {
    const events = await relay.query([{
      kinds: [KINDS.LIST_ITEM, KINDS.LIST_ITEM_REPLACEABLE],
      '#z': [listATag],
      limit: 500,
    }]);
    
    return events.map(parseListItem);
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
      
      // Check if this is the current user's reaction
      if (reaction.pubkey === userPubkey) {
        userReaction = reaction.content === '+' ? '+' : 
                       reaction.content === '-' ? '-' : null;
      }
      
      // Only count reactions from trusted users
      if (!isTrusted) continue;
      
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
  const { data: trustMap, isLoading: trustLoading } = useTrustMap();
  const { user } = useCurrentUser();
  
  return useQuery({
    queryKey: ['nostr', 'songsList', trustMap?.size],
    queryFn: async (): Promise<ScoredListItem[]> => {
      // Fetch list items
      const items = await fetchListItems(SONGS_LIST_A_TAG);
      
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
      return scoredItems
        .filter(item => item.score >= 0)
        .sort((a, b) => b.score - a.score);
    },
    enabled: !trustLoading,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to fetch and score musicians from the master musicians list
 */
export function useMusiciansList() {
  const { data: trustMap, isLoading: trustLoading } = useTrustMap();
  const { user } = useCurrentUser();
  
  return useQuery({
    queryKey: ['nostr', 'musiciansList', trustMap?.size],
    queryFn: async (): Promise<ScoredListItem[]> => {
      // Fetch list items
      const items = await fetchListItems(MUSICIANS_LIST_A_TAG);
      
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
      return scoredItems
        .filter(item => item.score >= 0)
        .sort((a, b) => b.score - a.score);
    },
    enabled: !trustLoading,
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
  const { data: trustMap, isLoading: trustLoading } = useTrustMap();
  const { user } = useCurrentUser();
  
  return useQuery({
    queryKey: ['nostr', 'genreListItems', listATag, trustMap?.size],
    queryFn: async (): Promise<ScoredListItem[]> => {
      if (!listATag) return [];
      
      // Fetch list items
      const items = await fetchListItems(listATag);
      
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
      return scoredItems
        .filter(item => item.score >= 0)
        .sort((a, b) => b.score - a.score);
    },
    enabled: !trustLoading && !!listATag,
    staleTime: 60 * 1000, // 1 minute
  });
}
