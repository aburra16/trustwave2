import { useQuery } from '@tanstack/react-query';
import { NRelay1 } from '@nostrify/nostrify';
import { useSongsList, useMusiciansList } from './useDecentralizedList';
import { DCOSL_RELAY, KINDS, SONGS_LIST_A_TAG, MUSICIANS_LIST_A_TAG } from '@/lib/constants';

/**
 * Check if a song already exists in the songs list (local check only)
 */
export function useIsSongInList(episodeGuid: string | undefined) {
  const { data: songs } = useSongsList();
  
  if (!episodeGuid) return false;
  
  // Check if any song has this episode GUID in the local list
  return songs?.some(song => song.songGuid === episodeGuid) || false;
}

/**
 * Check if a musician already exists in the musicians list (local check only)
 */
export function useIsMusicianInList(feedGuid: string | undefined) {
  const { data: musicians } = useMusiciansList();
  
  if (!feedGuid) return false;
  
  // Check if any musician has this feed GUID in the local list
  return musicians?.some(musician => 
    musician.feedGuid === feedGuid || 
    musician.musicianFeedGuid === feedGuid
  ) || false;
}

/**
 * Query the relay to check if a song exists (used before adding)
 */
export function useCheckSongExists(episodeGuid: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['checkSongExists', episodeGuid],
    queryFn: async (): Promise<boolean> => {
      if (!episodeGuid) return false;
      
      console.log('Checking relay for existing song with GUID:', episodeGuid);
      
      const relay = new NRelay1(DCOSL_RELAY);
      
      try {
        const events = await relay.query([{
          kinds: [KINDS.LIST_ITEM, KINDS.LIST_ITEM_REPLACEABLE],
          '#z': [SONGS_LIST_A_TAG],
          '#t': [episodeGuid],
          limit: 1,
        }]);
        
        const exists = events.length > 0;
        console.log(`Song ${episodeGuid.slice(0, 8)}... exists on relay:`, exists);
        
        return exists;
      } finally {
        await relay.close();
      }
    },
    enabled: enabled && !!episodeGuid,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Query the relay to check if a musician exists (used before adding)
 */
export function useCheckMusicianExists(feedGuid: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['checkMusicianExists', feedGuid],
    queryFn: async (): Promise<boolean> => {
      if (!feedGuid) return false;
      
      console.log('Checking relay for existing musician with GUID:', feedGuid);
      
      const relay = new NRelay1(DCOSL_RELAY);
      
      try {
        const events = await relay.query([{
          kinds: [KINDS.LIST_ITEM, KINDS.LIST_ITEM_REPLACEABLE],
          '#z': [MUSICIANS_LIST_A_TAG],
          '#t': [feedGuid],
          limit: 1,
        }]);
        
        const exists = events.length > 0;
        console.log(`Musician ${feedGuid.slice(0, 8)}... exists on relay:`, exists);
        
        return exists;
      } finally {
        await relay.close();
      }
    },
    enabled: enabled && !!feedGuid,
    staleTime: 30 * 1000, // 30 seconds
  });
}
