import { useQuery } from '@tanstack/react-query';
import { NRelay1, type NostrEvent } from '@nostrify/nostrify';
import { useBatchTrustScores } from './useTrustScore';
import { useCurrentUser } from './useCurrentUser';
import { useHiddenItems } from './useHiddenItems';
import { DCOSL_RELAY, KINDS, SONGS_LIST_A_TAG, MUSICIANS_LIST_A_TAG, TRUST_THRESHOLD, SYSTEM_CURATORS } from '@/lib/constants';
import { filterOutPodcasts } from '@/lib/filters';
import { groupMusiciansByArtist } from '@/lib/musicianUtils';
import type { ListItem, ScoredListItem } from '@/lib/types';

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
      const authorRank = trustScores.get(reaction.pubkey) 
        || SYSTEM_CURATORS[reaction.pubkey] 
        || 0;
      
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
 * Search the catalog by querying the relay directly (not limited to loaded items)
 */
export function useSearchCatalog(searchQuery: string) {
  const { user } = useCurrentUser();
  const { hiddenIds } = useHiddenItems();
  
  const dataQuery = useQuery({
    queryKey: ['searchCatalog', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return { songs: [], musicians: [], reactions: new Map() };
      
      console.log('Searching catalog for:', searchQuery);
      
      const relay = new NRelay1(DCOSL_RELAY);
      
      try {
        // Fetch items from relay
        const [songEvents, musicianEvents] = await Promise.all([
          relay.query([{
            kinds: [KINDS.LIST_ITEM, KINDS.LIST_ITEM_REPLACEABLE],
            '#z': [SONGS_LIST_A_TAG],
            limit: 2000,
          }]),
          relay.query([{
            kinds: [KINDS.LIST_ITEM, KINDS.LIST_ITEM_REPLACEABLE],
            '#z': [MUSICIANS_LIST_A_TAG],
            limit: 2000,
          }]),
        ]);
        
        const songs = songEvents.map(parseListItem).filter(item => !hiddenIds.includes(item.id));
        const musicians = musicianEvents.map(parseListItem).filter(item => !hiddenIds.includes(item.id));
        
        // Filter by search query
        const query = searchQuery.toLowerCase();
        const matchingSongs = songs.filter(s =>
          s.songTitle?.toLowerCase().includes(query) ||
          s.songArtist?.toLowerCase().includes(query)
        );
        
        const matchingMusicians = musicians.filter(m =>
          (m.musicianName || m.name || '').toLowerCase().includes(query)
        );
        
        console.log(`Search results: ${matchingSongs.length} songs, ${matchingMusicians.length} musicians`);
        
        // Fetch reactions for matches only
        const allMatches = [...matchingSongs, ...matchingMusicians];
        const itemIds = allMatches.map(i => i.id);
        const reactions = await fetchReactions(itemIds);
        
        return { songs: matchingSongs, musicians: matchingMusicians, reactions };
      } finally {
        await relay.close();
      }
    },
    enabled: searchQuery.trim().length > 0,
    staleTime: 2 * 60 * 1000,
  });
  
  // Get reactions from the data query (already fetched)
  const reactions = dataQuery.data?.reactions || new Map();
  
  // Get reaction authors for trust scores
  const allReactions = Array.from(reactions.values()).flat();
  const reactionAuthors = Array.from(new Set(allReactions.map(r => r.pubkey)));
  
  const { data: trustScores, isLoading: loadingScores } = useBatchTrustScores(reactionAuthors);
  
  // Calculate scores (wait for trust scores)
  const scoredSongs = dataQuery.data && trustScores
    ? calculateScores(dataQuery.data.songs, reactions, trustScores, user?.pubkey)
        .filter(item => item.score >= 0)
    : dataQuery.data?.songs || [];
  
  const scoredMusicians = dataQuery.data && trustScores
    ? calculateScores(dataQuery.data.musicians, reactions, trustScores, user?.pubkey)
        .filter(item => item.score >= 0)
    : dataQuery.data?.musicians || [];
  
  console.log(`After scoring: ${scoredSongs.length} songs, ${scoredMusicians.length} musicians`);
  
  // Filter podcasts from songs
  const musicOnlySongs = filterOutPodcasts(scoredSongs);
  
  // Group musicians
  const groupedMusicians = scoredMusicians.length > 0 ? groupMusiciansByArtist(scoredMusicians) : [];
  
  console.log(`Final results: ${musicOnlySongs.length} songs, ${groupedMusicians.length} grouped musicians`);
  
  return {
    songs: musicOnlySongs,
    musicians: groupedMusicians,
    isLoading: dataQuery.isLoading || loadingScores,
  };
}
