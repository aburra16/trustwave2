import { useQuery } from '@tanstack/react-query';
import { NRelay1 } from '@nostrify/nostrify';
import { DCOSL_RELAY, KINDS, SONGS_LIST_A_TAG, MUSICIANS_LIST_A_TAG } from '@/lib/constants';
import { useHiddenItems } from './useHiddenItems';

/**
 * Get simple counts of songs and musicians without fetching reactions/scores
 * Much faster than full list queries - use for stats display
 */
export function useListCounts() {
  const { hiddenIds } = useHiddenItems();
  
  return useQuery({
    queryKey: ['listCounts', hiddenIds.length],
    queryFn: async () => {
      const relay = new NRelay1(DCOSL_RELAY);
      
      try {
        // Fetch songs count
        const songEvents = await relay.query([{
          kinds: [KINDS.LIST_ITEM, KINDS.LIST_ITEM_REPLACEABLE],
          '#z': [SONGS_LIST_A_TAG],
          limit: 10000,
        }]);
        
        // Fetch musicians count  
        const musicianEvents = await relay.query([{
          kinds: [KINDS.LIST_ITEM, KINDS.LIST_ITEM_REPLACEABLE],
          '#z': [MUSICIANS_LIST_A_TAG],
          limit: 10000,
        }]);
        
        // Filter out hidden items
        const visibleSongs = songEvents.filter(e => !hiddenIds.includes(e.id));
        const visibleMusicians = musicianEvents.filter(e => !hiddenIds.includes(e.id));
        
        console.log(`List counts: ${visibleSongs.length} songs, ${visibleMusicians.length} musicians`);
        
        return {
          songs: visibleSongs.length,
          musicians: visibleMusicians.length,
        };
      } finally {
        await relay.close();
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
