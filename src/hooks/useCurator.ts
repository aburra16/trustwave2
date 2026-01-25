import { useMutation, useQueryClient } from '@tanstack/react-query';
import { NRelay1, type NostrEvent } from '@nostrify/nostrify';
import { useCurrentUser } from './useCurrentUser';
import { DCOSL_RELAY, KINDS, SONGS_LIST_A_TAG, MUSICIANS_LIST_A_TAG, PODCAST_INDEX_PROXY } from '@/lib/constants';
import type { PodcastIndexEpisode, PodcastIndexFeed, PodcastIndexEpisodesResponse } from '@/lib/types';

interface AddSongParams {
  episode: PodcastIndexEpisode;
  feed: PodcastIndexFeed;
  listATag?: string; // Optional: add to a specific sublist instead of master
  annotation?: string;
}

interface AddMusicianParams {
  feed: PodcastIndexFeed;
  annotation?: string;
  addSongsAutomatically?: boolean; // If true, also add all songs from this artist
}

interface CreateListParams {
  nameSingular: string;
  namePlural: string;
  description?: string;
  genres?: string[];
}

/**
 * Hook to add a song to the master songs list (or a sublist)
 */
export function useAddSong() {
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: AddSongParams): Promise<NostrEvent> => {
      if (!user) {
        throw new Error('You must be logged in to add songs');
      }
      
      const { episode, feed, listATag, annotation } = params;
      const targetList = listATag || SONGS_LIST_A_TAG;
      
      // Build tags
      const tags: string[][] = [
        ['z', targetList],
        ['t', episode.guid],
        ['title', episode.title],
        ['artist', feed.author || feed.title],
        ['url', episode.enclosureUrl],
        ['duration', String(episode.duration || 0)],
        ['feedId', String(feed.id)],
        ['feedGuid', feed.podcastGuid || ''],
      ];
      
      // Add artwork if available
      if (episode.image || episode.feedImage || feed.artwork) {
        tags.push(['artwork', episode.image || episode.feedImage || feed.artwork]);
      }
      
      // Add description/annotation if provided
      if (annotation) {
        tags.push(['description', annotation]);
      }
      
      // Add alt tag for NIP-31 (human-readable description)
      tags.push(['alt', `Song: ${episode.title} by ${feed.author || feed.title}`]);
      
      console.log('Adding song with tags:', JSON.stringify(tags, null, 2));
      
      // Create the list item event
      const event = await user.signer.signEvent({
        kind: KINDS.LIST_ITEM,
        content: '',
        tags,
        created_at: Math.floor(Date.now() / 1000),
      });
      
      console.log('Signed event:', JSON.stringify(event, null, 2));
      console.log('Publishing song to relay:', DCOSL_RELAY);
      
      // Publish to the DCOSL relay
      const relay = new NRelay1(DCOSL_RELAY);
      
      try {
        await relay.event(event);
        console.log('Song event published successfully! Event ID:', event.id);
      } catch (error) {
        console.error('Failed to publish song event:', error);
        throw error;
      } finally {
        await relay.close();
      }
      
      return event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nostr', 'songsList'] });
      queryClient.invalidateQueries({ queryKey: ['nostr', 'genreListItems'] });
    },
    onError: (error) => {
      console.error('Failed to add song:', error);
    },
  });
}

/**
 * Hook to add a musician to the master musicians list
 * Optionally also adds all their songs
 */
export function useAddMusician() {
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: AddMusicianParams): Promise<{ musicianEvent: NostrEvent; songEvents: NostrEvent[] }> => {
      if (!user) {
        throw new Error('You must be logged in to add musicians');
      }
      
      const { feed, annotation, addSongsAutomatically = true } = params;
      
      // Build tags
      const tags: string[][] = [
        ['z', MUSICIANS_LIST_A_TAG],
        ['t', feed.podcastGuid || String(feed.id)],
        ['name', feed.author || feed.title],
        ['feedUrl', feed.url],
        ['feedId', String(feed.id)], // Store the numeric feed ID for fetching episodes
        ['feedGuid', feed.podcastGuid || ''],
      ];
      
      // Add artwork if available
      if (feed.artwork || feed.image) {
        tags.push(['artwork', feed.artwork || feed.image]);
      }
      
      // Add description/annotation if provided
      if (annotation) {
        tags.push(['description', annotation]);
      }
      
      // Add alt tag for NIP-31
      tags.push(['alt', `Musician: ${feed.author || feed.title}`]);
      
      // Create the musician list item event
      const musicianEvent = await user.signer.signEvent({
        kind: KINDS.LIST_ITEM,
        content: '',
        tags,
        created_at: Math.floor(Date.now() / 1000),
      });
      
      // Publish to the DCOSL relay
      const relay = new NRelay1(DCOSL_RELAY);
      const songEvents: NostrEvent[] = [];
      
      try {
        await relay.event(musicianEvent);
        console.log('Musician event published successfully!');
        
        // Auto-add all songs from this artist
        if (addSongsAutomatically) {
          console.log('Auto-adding songs for artist:', feed.author || feed.title);
          
          try {
            // Fetch episodes
            const episodesResponse = await fetch(
              `${PODCAST_INDEX_PROXY}/episodes/byfeedid?id=${feed.id}&max=100`
            );
            
            if (episodesResponse.ok) {
              const episodesData: PodcastIndexEpisodesResponse = await episodesResponse.json();
              const episodes = episodesData.items || [];
              
              console.log(`Auto-adding ${episodes.length} songs...`);
              
              // Add each episode as a song
              for (const episode of episodes) {
                const songTags: string[][] = [
                  ['z', SONGS_LIST_A_TAG],
                  ['t', episode.guid],
                  ['title', episode.title],
                  ['artist', feed.author || feed.title],
                  ['url', episode.enclosureUrl],
                  ['duration', String(episode.duration || 0)],
                  ['feedId', String(feed.id)],
                  ['feedGuid', feed.podcastGuid || ''],
                ];
                
                if (episode.image || episode.feedImage || feed.artwork) {
                  songTags.push(['artwork', episode.image || episode.feedImage || feed.artwork]);
                }
                
                songTags.push(['alt', `Song: ${episode.title} by ${feed.author || feed.title}`]);
                
                const songEvent = await user.signer.signEvent({
                  kind: KINDS.LIST_ITEM,
                  content: '',
                  tags: songTags,
                  created_at: Math.floor(Date.now() / 1000),
                });
                
                await relay.event(songEvent);
                songEvents.push(songEvent);
              }
              
              console.log(`✅ Auto-added ${songEvents.length} songs successfully!`);
            }
          } catch (error) {
            console.warn('Failed to auto-add songs (musician still added):', error);
          }
        }
      } finally {
        await relay.close();
      }
      
      return { musicianEvent, songEvents };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['nostr', 'musiciansList'] });
      queryClient.invalidateQueries({ queryKey: ['nostr', 'songsList'] });
      
      console.log(`Added musician + ${data.songEvents.length} songs`);
    },
    onError: (error) => {
      console.error('Failed to add musician:', error);
    },
  });
}

/**
 * Hook to create a new genre sublist
 */
export function useCreateList() {
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: CreateListParams): Promise<NostrEvent> => {
      if (!user) {
        throw new Error('You must be logged in to create lists');
      }
      
      const { nameSingular, namePlural, description, genres } = params;
      
      // Generate a unique d-tag
      const dTag = crypto.randomUUID();
      
      // Build tags
      const tags: string[][] = [
        ['d', dTag],
        ['names', nameSingular, namePlural],
        ['parent', SONGS_LIST_A_TAG], // Link to master songs list
        ['required', 't'],
        ['recommended', 'title', 'artist', 'url', 'artwork'],
      ];
      
      if (description) {
        tags.push(['description', description]);
      }
      
      if (genres && genres.length > 0) {
        for (const genre of genres) {
          tags.push(['genre', genre.toLowerCase()]);
          tags.push(['t', genre.toLowerCase()]); // Also add as t tag for discoverability
        }
      }
      
      // Add alt tag for NIP-31
      tags.push(['alt', `Music playlist: ${namePlural}`]);
      
      // Create the list header event (replaceable)
      const event = await user.signer.signEvent({
        kind: KINDS.LIST_HEADER_REPLACEABLE,
        content: '',
        tags,
        created_at: Math.floor(Date.now() / 1000),
      });
      
      // Publish to the DCOSL relay
      const relay = new NRelay1(DCOSL_RELAY);
      
      try {
        await relay.event(event);
      } finally {
        await relay.close();
      }
      
      return event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nostr', 'genreLists'] });
    },
    onError: (error) => {
      console.error('Failed to create list:', error);
    },
  });
}
