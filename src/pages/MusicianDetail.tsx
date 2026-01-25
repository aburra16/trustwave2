import { useSeoMeta } from '@unhead/react';
import { ArrowLeft, Music, ExternalLink, ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import { useParams, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { SongCard } from '@/components/songs/SongCard';
import { Skeleton } from '@/components/ui/skeleton';
import { usePodcastIndexEpisodes, usePodcastIndexFeed } from '@/hooks/usePodcastIndex';
import { useMusiciansList } from '@/hooks/useDecentralizedList';
import { usePublishReaction } from '@/hooks/useReaction';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { cn } from '@/lib/utils';
import { APP_NAME, KINDS } from '@/lib/constants';
import type { ScoredListItem } from '@/lib/types';

export default function MusicianDetail() {
  const { feedId } = useParams<{ feedId: string }>();
  const { user } = useCurrentUser();
  
  // Find the musician from the list
  const { data: musicians, isLoading: loadingMusicians } = useMusiciansList();
  const musician = musicians?.find(m => 
    m.feedId === feedId || 
    m.musicianFeedGuid === feedId ||
    String(m.feedId) === feedId
  );
  
  console.log('MusicianDetail:', { feedId, musician, musicians });
  
  // Use the feedId from the musician if we found them, otherwise use the URL param
  const actualFeedId = musician?.feedId || feedId;
  
  // Fetch feed data and episodes from Podcast Index
  const { data: feed } = usePodcastIndexFeed(actualFeedId);
  const { data: episodes, isLoading: loadingEpisodes } = usePodcastIndexEpisodes(actualFeedId);
  
  console.log('Fetched episodes:', episodes);
  
  const { mutate: publishReaction, isPending: isReacting } = usePublishReaction();
  
  useSeoMeta({
    title: `${musician?.musicianName || feed?.title || 'Artist'} | ${APP_NAME}`,
    description: feed?.description || `Listen to music from ${musician?.musicianName || 'this artist'}`,
  });
  
  const handleReaction = (reaction: '+' | '-') => {
    if (!user || !musician) return;
    
    publishReaction({
      targetEventId: musician.id,
      targetPubkey: musician.pubkey,
      targetKind: musician.event.kind || KINDS.LIST_ITEM,
      reaction,
    });
  };
  
  const name = musician?.musicianName || feed?.author || feed?.title || 'Unknown Artist';
  const artwork = musician?.musicianArtwork || feed?.artwork || feed?.image;
  const description = musician?.description || feed?.description;
  
  // Convert episodes to ScoredListItem format for the player
  const songs: ScoredListItem[] = episodes?.map(ep => ({
    id: ep.guid,
    pubkey: musician?.pubkey || '',
    listATag: musician?.listATag || '',
    songGuid: ep.guid,
    songTitle: ep.title,
    songArtist: name,
    songUrl: ep.enclosureUrl,
    songArtwork: ep.image || ep.feedImage || artwork,
    songDuration: ep.duration,
    feedId: String(ep.feedId),
    feedGuid: ep.podcastGuid,
    createdAt: ep.datePublished,
    event: musician?.event || {} as any,
    score: 0,
    upvotes: 0,
    downvotes: 0,
    userReaction: null,
  })) || [];
  
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
  
  if (!musician && !loadingMusicians) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-20">
            <Music className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Musician Not Found</h2>
            <p className="text-muted-foreground mb-6">
              This musician hasn't been added to the list yet.
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
                <img src={artwork} alt={name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-tw-purple/20 to-tw-cyan/20 flex items-center justify-center">
                  <Music className="w-20 h-20 text-muted-foreground/30" />
                </div>
              )}
            </div>
            
            {/* Info */}
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2">{name}</h1>
              {description && (
                <p className="text-muted-foreground mb-4 max-w-2xl">
                  {description}
                </p>
              )}
              
              <div className="flex flex-wrap items-center gap-4">
                {/* Score */}
                {musician && (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <ThumbsUp className="w-5 h-5 text-tw-success" />
                      <span className="font-semibold">{musician.upvotes}</span>
                    </div>
                    {musician.downvotes > 0 && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <ThumbsDown className="w-5 h-5" />
                        <span>{musician.downvotes}</span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Actions */}
                {user && musician && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReaction('+')}
                      disabled={isReacting}
                      className={cn(
                        musician.userReaction === '+' && 'border-tw-success text-tw-success'
                      )}
                    >
                      <ThumbsUp className={cn(
                        'w-4 h-4 mr-1.5',
                        musician.userReaction === '+' && 'fill-current'
                      )} />
                      Upvote
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReaction('-')}
                      disabled={isReacting}
                      className={cn(
                        musician.userReaction === '-' && 'border-destructive text-destructive'
                      )}
                    >
                      <ThumbsDown className={cn(
                        'w-4 h-4 mr-1.5',
                        musician.userReaction === '-' && 'fill-current'
                      )} />
                      Downvote
                    </Button>
                  </>
                )}
                
                {/* RSS Feed Link */}
                {(musician?.musicianFeedUrl || feed?.url) && (
                  <Button variant="ghost" size="sm" asChild>
                    <a 
                      href={musician?.musicianFeedUrl || feed?.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-4 h-4 mr-1.5" />
                      RSS Feed
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Episodes/Songs */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Tracks</h2>
          
          {loadingEpisodes ? (
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
