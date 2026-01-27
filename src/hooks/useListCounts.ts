import { useQuery } from '@tanstack/react-query';
import { NRelay1 } from '@nostrify/nostrify';
import { DCOSL_RELAY, KINDS, SONGS_LIST_A_TAG, MUSICIANS_LIST_A_TAG } from '@/lib/constants';
import { useHiddenItems } from './useHiddenItems';

/**
 * Get simple counts of songs and musicians without fetching all events
 * Uses small sample to estimate or shows "X+" if hitting limit
 */
export function useListCounts() {
  const { hiddenIds } = useHiddenItems();
  
  return useQuery({
    queryKey: ['listCounts', hiddenIds.length],
    queryFn: async () => {
      const relay = new NRelay1(DCOSL_RELAY);
      const SAMPLE_SIZE = 1000; // Just fetch a sample to check
      
      try {
        // Fetch a sample of songs
        const songEvents = await relay.query([{
          kinds: [KINDS.LIST_ITEM, KINDS.LIST_ITEM_REPLACEABLE],
          '#z': [SONGS_LIST_A_TAG],
          limit: SAMPLE_SIZE,
        }]);
        
        // Fetch a sample of musicians  
        const musicianEvents = await relay.query([{
          kinds: [KINDS.LIST_ITEM, KINDS.LIST_ITEM_REPLACEABLE],
          '#z': [MUSICIANS_LIST_A_TAG],
          limit: SAMPLE_SIZE,
        }]);
        
        // Filter out hidden items from sample
        const visibleSongs = songEvents.filter(e => !hiddenIds.includes(e.id));
        const visibleMusicians = musicianEvents.filter(e => !hiddenIds.includes(e.id));
        
        // If we got the full limit, there are likely more
        const songsCount = songEvents.length >= SAMPLE_SIZE ? `${visibleSongs.length}+` : visibleSongs.length;
        const musiciansCount = musicianEvents.length >= SAMPLE_SIZE ? `${visibleMusicians.length}+` : visibleMusicians.length;
        
        console.log(`List counts: ${songsCount} songs, ${musiciansCount} musicians`);
        
        return {
          songs: songsCount,
          musicians: musiciansCount,
        };
      } finally {
        await relay.close();
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

