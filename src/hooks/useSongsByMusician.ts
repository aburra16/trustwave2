import { useQuery } from '@tanstack/react-query';
import { NRelay1, type NostrEvent } from '@nostrify/nostrify';
import { useBatchTrustScores } from './useTrustScore';
import { useCurrentUser } from './useCurrentUser';
import { DCOSL_RELAY, KINDS, SONGS_LIST_A_TAG, TRUST_THRESHOLD, SYSTEM_CURATORS } from '@/lib/constants';
import { filterOutPodcasts } from '@/lib/filters';
import type { ScoredListItem } from '@/lib/types';

/**
 * Fetch songs for a specific musician using multiple strategies
 * 1. Query by feed GUID (g tag) - works for new imports
 * 2. Query by musician event ID (e tag) - works for songs linked to musician
 */
export function useSongsByMusician(feedGuid: string | undefined, musicianEventIds: string[]) {
  const { user } = useCurrentUser();
  
  const dataQuery = useQuery({
    queryKey: ['songsByMusician', feedGuid, musicianEventIds.join(',')],
    queryFn: async () => {
      if (!feedGuid && musicianEventIds.length === 0) {
        return { songs: [], reactions: new Map() };
      }
      
      console.log('Fetching songs for musician:', { feedGuid, musicianEventIds });
      
      const relay = new NRelay1(DCOSL_RELAY);
      
      try {
        const queries = [];
        
        // Strategy 1: Query by feed GUID (new structure)
        if (feedGuid) {
          queries.push(relay.query([{
            kinds: [KINDS.LIST_ITEM, KINDS.LIST_ITEM_REPLACEABLE],
            '#z': [SONGS_LIST_A_TAG],
            '#g': [feedGuid], // Query by feed GUID (single-letter tag, indexed!)
            limit: 500,
          }]));
        }
        
        // Strategy 2: Query by musician event ID (for older songs)
        if (musicianEventIds.length > 0) {
          queries.push(relay.query([{
            kinds: [KINDS.LIST_ITEM, KINDS.LIST_ITEM_REPLACEABLE],
            '#z': [SONGS_LIST_A_TAG],
            '#e': musicianEventIds, // Query by parent musician event
            limit: 500,
          }]));
        }
        
        const results = await Promise.all(queries);
        const allEvents = results.flat();
        
        // Deduplicate by event ID
        const uniqueEvents = Array.from(
          new Map(allEvents.map(e => [e.id, e])).values()
        );
        
        console.log(`Found ${uniqueEvents.length} songs for this musician`);
        
        // Parse into ScoredListItem
        const songs = uniqueEvents.map(event => {
          const tags = event.tags;
          return {
            id: event.id,
            pubkey: event.pubkey,
            listATag: tags.find(([name]) => name === 'z')?.[1] || '',
            songGuid: tags.find(([name]) => name === 't')?.[1],
            songTitle: tags.find(([name]) => name === 'title')?.[1],
            songArtist: tags.find(([name]) => name === 'artist')?.[1],
            songUrl: tags.find(([name]) => name === 'url')?.[1],
            songArtwork: tags.find(([name]) => name === 'artwork')?.[1],
            songDuration: parseInt(tags.find(([name]) => name === 'duration')?.[1] || '0', 10),
            feedId: tags.find(([name]) => name === 'feedId')?.[1],
            feedGuid: tags.find(([name]) => name === 'feedGuid')?.[1],
            createdAt: event.created_at,
            event,
          };
        });
        
        // Fetch reactions
        const itemIds = songs.map(s => s.id);
        const reactionEvents = itemIds.length > 0 ? await relay.query([{
          kinds: [KINDS.REACTION],
          '#e': itemIds,
          limit: 1000,
        }]) : [];
        
        const reactionsMap = new Map<string, NostrEvent[]>();
        for (const reaction of reactionEvents) {
          const targetId = reaction.tags.find(t => t[0] === 'e')?.[1];
          if (targetId) {
            const existing = reactionsMap.get(targetId) || [];
            existing.push(reaction);
            reactionsMap.set(targetId, existing);
          }
        }
        
        return { songs, reactions: reactionsMap };
      } finally {
        await relay.close();
      }
    },
    enabled: !!feedGuid || musicianEventIds.length > 0,
    staleTime: 2 * 60 * 1000,
  });
  
  // Calculate scores with trust filtering
  const allReactions = dataQuery.data ? Array.from(dataQuery.data.reactions.values()).flat() : [];
  const reactionAuthors = Array.from(new Set(allReactions.map(r => r.pubkey)));
  
  const { data: trustScores } = useBatchTrustScores(reactionAuthors);
  
  const scoredSongs: ScoredListItem[] = dataQuery.data && trustScores
    ? dataQuery.data.songs.map(song => {
        const itemReactions = dataQuery.data.reactions.get(song.id) || [];
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
          ...song,
          score: upvotes - downvotes,
          upvotes,
          downvotes,
          userReaction,
          upvoterEvents,
          downvoterEvents,
        };
      })
    : dataQuery.data?.songs.map(s => ({ ...s, score: 0, upvotes: 0, downvotes: 0, userReaction: null })) || [];
  
  const musicOnly = filterOutPodcasts(scoredSongs);
  
  return {
    songs: musicOnly,
    isLoading: dataQuery.isLoading,
  };
}
