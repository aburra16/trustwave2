import { useSeoMeta } from '@unhead/react';
import { ArrowLeft, Music, ExternalLink, ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import { useParams, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { SongCard } from '@/components/songs/SongCard';
import { Skeleton } from '@/components/ui/skeleton';
import { usePodcastIndexEpisodes } from '@/hooks/usePodcastIndex';
import { usePodcastIndexFeedByGuid } from '@/hooks/usePodcastIndexByGuid';
import { useMusiciansList } from '@/hooks/useDecentralizedList';
import { usePublishReaction } from '@/hooks/useReaction';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { getArtistEntries } from '@/lib/musicianUtils';
import { cn } from '@/lib/utils';
import { APP_NAME, KINDS } from '@/lib/constants';
import type { ScoredListItem } from '@/lib/types';

export default function MusicianDetail() {
  const { artistSlug } = useParams<{ artistSlug: string }>();
  const { user } = useCurrentUser();
  
  // Decode the artist name from the URL slug
  const artistName = decodeURIComponent(artistSlug || '').replace(/-/g, ' ');
  
  // Get ALL musician entries for this artist (could be multiple albums/feeds)
  const { data: allMusicians, isLoading: loadingMusicians } = useMusiciansList();
  const artistEntries = allMusicians ? getArtistEntries(allMusicians, artistName) : [];
  
  // Use the primary entry (highest score) for metadata
  const primaryMusician = artistEntries.sort((a, b) => b.score - a.score)[0];
  
  // Aggregate stats across all entries
  const totalUpvotes = artistEntries.reduce((sum, e) => sum + e.upvotes, 0);
  const totalDownvotes = artistEntries.reduce((sum, e) => sum + e.downvotes, 0);
  const userReaction = artistEntries.find(e => e.userReaction)?.userReaction || null;
  
  console.log('MusicianDetail:', { 
    artistSlug,
    artistName,
    entriesFound: artistEntries.length,
    feedIds: artistEntries.map(e => e.feedId),
  });
  
  // Fetch episodes from ALL feeds for this artist
  // For entries without feedId, we need to look up by feedGuid first
  const entriesWithFeedId = artistEntries.filter(e => e.feedId);
  const entriesWithoutFeedId = artistEntries.filter(e => !e.feedId && (e.feedGuid || e.musicianFeedGuid));
  
  console.log('Entries with feedId:', entriesWithFeedId.length);
  console.log('Entries needing GUID lookup:', entriesWithoutFeedId.length);
  
  // Fetch episodes for entries that have feedId
  const episodeQueries = entriesWithFeedId.map(entry => ({
    feedId: entry.feedId!,
    query: usePodcastIndexEpisodes(entry.feedId),
  }));
  
  // For entries without feedId, look up by GUID to get feedId, then fetch episodes
  const guidLookups = entriesWithoutFeedId.map(entry => {
    const guid = entry.feedGuid || entry.musicianFeedGuid;
    return {
      guid,
      lookup: usePodcastIndexFeedByGuid(guid),
    };
  });
  
  // Now fetch episodes for the looked-up feeds
  const additionalEpisodeQueries = guidLookups
    .filter(lookup => lookup.lookup.data?.id)
    .map(lookup => ({
      feedId: lookup.lookup.data!.id,
      query: usePodcastIndexEpisodes(lookup.lookup.data!.id),
    }));
  
  const allEpisodeQueries = [...episodeQueries, ...additionalEpisodeQueries];
  
  // Combine all episodes from all feeds
  const allEpisodes = allEpisodeQueries.flatMap(q => q.query.data || []);
  const isLoadingEpisodes = allEpisodeQueries.some(q => q.query.isLoading) || guidLookups.some(l => l.lookup.isLoading);
  
  console.log('Fetching from feeds:', allEpisodeQueries.map(q => q.feedId));
  console.log('Total episodes across all feeds:', allEpisodes.length);
  
  const { mutate: publishReaction, isPending: isReacting } = usePublishReaction();
  
  useSeoMeta({
    title: `${artistName} | ${APP_NAME}`,
    description: `Listen to music from ${artistName}`,
  });
  
  const handleReaction = (reaction: '+' | '-') => {
    if (!user || !primaryMusician) return;
    
    // React to the primary entry (highest scored)
    publishReaction({
      targetEventId: primaryMusician.id,
      targetPubkey: primaryMusician.pubkey,
      targetKind: primaryMusician.event.kind || KINDS.LIST_ITEM,
      reaction,
      currentReaction: userReaction,
    });
  };
  
  const artwork = primaryMusician?.musicianArtwork || primaryMusician?.songArtwork;
  const description = primaryMusician?.description;
  
  // Convert all episodes to ScoredListItem format for the player
  const songs: ScoredListItem[] = allEpisodes.map(ep => ({
    id: ep.guid,
    pubkey: primaryMusician?.pubkey || '',
    listATag: primaryMusician?.listATag || '',
    songGuid: ep.guid,
    songTitle: ep.title,
    songArtist: artistName,
    songUrl: ep.enclosureUrl,
    songArtwork: ep.image || ep.feedImage || artwork,
    songDuration: ep.duration,
    feedId: String(ep.feedId),
    feedGuid: ep.podcastGuid,
    createdAt: ep.datePublished,
    event: primaryMusician?.event || {} as any,
    score: 0,
    upvotes: 0,
    downvotes: 0,
    userReaction: null,
  }))
  // Sort by date published (most recent first)
  .sort((a, b) => b.createdAt - a.createdAt);
  
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
  
  if (artistEntries.length === 0 && !loadingMusicians) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-20">
            <Music className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Artist Not Found</h2>
            <p className="text-muted-foreground mb-6">
              This artist hasn't been added to the list yet.
            </p>
            <Button asChild>
              <Link to="/musicians">Back to Musicians</Link>
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
          <Link to="/musicians">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Musicians
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
                
                {/* Actions */}
                {user && primaryMusician && (
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
