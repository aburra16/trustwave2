import { useSeoMeta } from '@unhead/react';
import { ArrowLeft, Music, ExternalLink, ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import { useParams, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { SongCard } from '@/components/songs/SongCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useMusicianByGuid } from '@/hooks/useMusicianByGuid';
import { useSongsByMusician } from '@/hooks/useSongsByMusician';
import { usePodcastIndexSearch } from '@/hooks/usePodcastIndex';
import { useMultipleFeedEpisodes } from '@/hooks/useMultipleFeedEpisodes';
import { usePublishReaction } from '@/hooks/useReaction';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { cn } from '@/lib/utils';
import { APP_NAME, KINDS } from '@/lib/constants';
import type { ScoredListItem } from '@/lib/types';

export default function MusicianDetail() {
  const { guid } = useParams<{ guid: string }>();
  const { user } = useCurrentUser();
  
  console.log('MusicianDetail: Loading musician with GUID:', guid);
  
// STEP 1: SEED - Fetch the initial musician by GUID (from URL)
  const { musicians: seedMusicians, isLoading: loadingSeed } = useMusicianByGuid(guid);
  
  const artistName = seedMusicians[0]?.musicianName || seedMusicians[0]?.name || 'Unknown Artist';
  const artistArtwork = seedMusicians[0]?.musicianArtwork;
  
  console.log('SEED musician loaded:', artistName);
  
  // STEP 2: EXPAND - Search Podcast Index API for ALL albums by this artist
  const { data: apiSearchResults, isLoading: loadingApiSearch } = usePodcastIndexSearch(
    artistName,
    !loadingSeed && !!artistName && artistName !== 'Unknown Artist'
  );
  
  // Extract all GUIDs for this artist
  const allArtistGuids = apiSearchResults?.map(feed => feed.podcastGuid).filter(Boolean) || [];
  console.log(`EXPAND: Found ${allArtistGuids.length} total albums for "${artistName}" via API`);
  
  // STEP 3: CLUSTER - Fetch musician events for ALL discovered GUIDs
  const { musicians: allMusicianEntries, isLoading: loadingAllMusicians } = useMusicianByGuid(
    allArtistGuids.length > 0 ? allArtistGuids : guid
  );
  
  console.log(`CLUSTER: Found ${allMusicianEntries.length} musician entries on relay`);
  
  // Get all musician event IDs (for querying songs)
  const allMusicianEventIds = allMusicianEntries.map(m => m.id);
  
  // STEP 4: FETCH SONGS - Get songs for ALL musician events
  const { songs: relaySongs, isLoading: loadingRelaySongs } = useSongsByMusician(undefined, allMusicianEventIds);
  
  console.log(`Found ${relaySongs.length} songs on relay for ${artistName}`);
  
  // STEP 5: API FALLBACK - If no songs on relay, fetch from Podcast Index for ALL albums
  const needsApiFallback = !loadingRelaySongs && relaySongs.length === 0;
  const allFeedIds = allMusicianEntries.map(m => m.feedId).filter(Boolean) as string[];
  
  const { data: apiEpisodes } = useMultipleFeedEpisodes(allFeedIds, needsApiFallback);
  
  console.log(`API FALLBACK: ${needsApiFallback ? 'enabled' : 'disabled'}, found ${apiEpisodes?.length || 0} episodes from ${allFeedIds.length} albums`);
  
  // Convert API episodes to preview format
  const apiPreviewSongs: ScoredListItem[] = (apiEpisodes || []).map(ep => ({
    id: `api-preview-${ep.guid}`,
    pubkey: '',
    listATag: '',
    songGuid: ep.guid,
    songTitle: ep.title,
    songArtist: artistName,
    songUrl: ep.enclosureUrl,
    songArtwork: ep.image || ep.feedImage || allMusicianEntries[0]?.musicianArtwork,
    songDuration: ep.duration,
    feedId: String(ep.feedId),
    feedGuid: ep.podcastGuid,
    createdAt: ep.datePublished,
    event: {} as any,
    score: 0,
    upvotes: 0,
    downvotes: 0,
    userReaction: null,
    isApiPreview: true,
  } as any));
  
  // Deduplicate
  const relayGuids = new Set(relaySongs.map(s => s.songGuid));
  const uniquePreviews = apiPreviewSongs.filter(s => !relayGuids.has(s.songGuid));
  
  // Combine all data
  const artistEntries = allMusicianEntries;
  const artistSongs = [...relaySongs, ...uniquePreviews];
  const loadingSongs = loadingRelaySongs || loadingApiSearch || loadingAllMusicians;
  const loadingMusicians = loadingSeed || loadingAllMusicians;
  
  console.log(`FINAL: ${artistSongs.length} total songs (${relaySongs.length} relay, ${uniquePreviews.length} API preview)`);
  
  // Use the primary entry (highest score) for metadata
  // If no musician entries, infer from songs
  const primaryMusician = artistEntries.sort((a, b) => b.score - a.score)[0] || (artistSongs[0] ? {
    id: `inferred-${artistName}`,
    musicianName: artistName,
    musicianArtwork: artistSongs[0].songArtwork,
  } as any : null);
  
  // Aggregate stats across all entries
  const totalUpvotes = artistEntries.reduce((sum, e) => sum + e.upvotes, 0);
  const totalDownvotes = artistEntries.reduce((sum, e) => sum + e.downvotes, 0);
  const userReaction = artistEntries.find(e => e.userReaction)?.userReaction || null;
  
console.log('MusicianDetail:', { 
    guid,
    artistName,
    entriesFound: artistEntries.length,
    feedIds: artistEntries.map(e => e.feedId),
    songsFound: artistSongs.length,
  });
  
  const isLoadingEpisodes = loadingSongs;
  
  const { mutate: publishReaction, isPending: isReacting } = usePublishReaction();
  
  useSeoMeta({
    title: `${artistName} | ${APP_NAME}`,
    description: `Listen to music from ${artistName}`,
  });
  
  const handleReaction = (reaction: '+' | '-') => {
    if (!user || !primaryMusician) return;
    
    // Can't vote on inferred musicians (they don't have a real Nostr event)
    if (primaryMusician.id.startsWith('inferred-')) {
      console.log('Cannot vote on inferred musician - no musician event exists');
      return;
    }
    
    // React to the primary entry (highest scored)
    publishReaction({
      targetEventId: primaryMusician.id,
      targetPubkey: primaryMusician.pubkey || '',
      targetKind: primaryMusician.event?.kind || KINDS.LIST_ITEM,
      reaction,
      currentReaction: userReaction,
    });
  };
  
  const artwork = primaryMusician?.musicianArtwork || primaryMusician?.songArtwork;
  const description = primaryMusician?.description;
  
  // Use songs from the songs list (these are votable Nostr events)
  const songs = artistSongs.sort((a, b) => b.createdAt - a.createdAt);
  
  const isLoading = loadingMusicians || isLoadingEpisodes;
  
  if (loadingMusicians) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </MainLayout>
    );
  }
  
  // If artist not in musicians list but has songs, still show their page
  if (artistEntries.length === 0 && artistSongs.length === 0 && !loadingMusicians && !loadingSongs) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-20">
            <Music className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Artist Not Found</h2>
            <p className="text-muted-foreground mb-6">
              This artist hasn't been added to the catalog yet.
            </p>
            <Button asChild>
              <Link to="/search">Search for Music</Link>
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button variant="ghost" className="mb-6" asChild>
          <Link to="/search">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Search
          </Link>
        </Button>
        
        {/* Artist Header */}
        <div className="relative rounded-2xl overflow-hidden mb-8">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background" />
          {artwork && (
            <div className="absolute inset-0 opacity-20 blur-2xl">
              <img src={artwork} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          
          {/* Content */}
          <div className="relative p-8 flex flex-col md:flex-row gap-8 items-start md:items-end">
            {/* Artwork */}
            <div className="w-48 h-48 rounded-xl overflow-hidden bg-secondary flex-shrink-0 shadow-2xl">
              {artwork ? (
                <img src={artwork} alt={artistName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-tw-purple/20 to-tw-cyan/20 flex items-center justify-center">
                  <Music className="w-20 h-20 text-muted-foreground/30" />
                </div>
              )}
            </div>
            
            {/* Info */}
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2">{artistName}</h1>
              {description && (
                <p className="text-muted-foreground mb-4 max-w-2xl">
                  {description}
                </p>
              )}
              
              {/* Release count */}
              {artistEntries.length > 1 && (
                <p className="text-sm text-muted-foreground mb-4">
                  {artistEntries.length} releases • {songs.length} tracks
                </p>
              )}
              
              <div className="flex flex-wrap items-center gap-4">
                {/* Aggregated Score */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <ThumbsUp className="w-5 h-5 text-tw-success" />
                    <span className="font-semibold">{totalUpvotes}</span>
                  </div>
                  {totalDownvotes > 0 && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <ThumbsDown className="w-5 h-5" />
                      <span>{totalDownvotes}</span>
                    </div>
                  )}
                </div>
                
                {/* Actions - only show if this is a real musician entry */}
                {user && primaryMusician && !primaryMusician.id.startsWith('inferred-') && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReaction('+')}
                      disabled={isReacting}
                      className={cn(
                        userReaction === '+' && 'border-tw-success text-tw-success'
                      )}
                    >
                      <ThumbsUp className={cn(
                        'w-4 h-4 mr-1.5',
                        userReaction === '+' && 'fill-current'
                      )} />
                      Upvote
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReaction('-')}
                      disabled={isReacting}
                      className={cn(
                        userReaction === '-' && 'border-destructive text-destructive'
                      )}
                    >
                      <ThumbsDown className={cn(
                        'w-4 h-4 mr-1.5',
                        userReaction === '-' && 'fill-current'
                      )} />
                      Downvote
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Episodes/Songs */}
        <div>
          <h2 className="text-2xl font-bold mb-6">
            Tracks
            {artistEntries.length > 1 && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                from {artistEntries.length} releases
              </span>
            )}
          </h2>
          
          {isLoadingEpisodes ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-3">
                  <Skeleton className="w-14 h-14 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          ) : songs.length > 0 ? (
            <div className="space-y-1">
              {songs.map((song, index) => (
                <SongCard 
                  key={song.id} 
                  song={song}
                  index={index}
                  queue={songs}
                  variant="default"
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-card rounded-xl border border-dashed border-border">
              <Music className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No tracks available for this artist</p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
