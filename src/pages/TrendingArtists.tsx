import { useSeoMeta } from '@unhead/react';
import { TrendingUp, Loader2, Users } from 'lucide-react';
import React, { useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { MainLayout } from '@/components/layout/MainLayout';
import { MusicianCard } from '@/components/musicians/MusicianCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useTrendingArtists } from '@/hooks/useTrending';
import { groupMusiciansByArtist } from '@/lib/musicianUtils';
import { APP_NAME } from '@/lib/constants';

const ITEMS_PER_PAGE = 25;

export default function TrendingArtists() {
useSeoMeta({
    title: `Trending Artists | ${APP_NAME}`,
    description: 'Top artists of all time, ranked by your trusted network.',
  });
  
  const { artists, isLoading } = useTrendingArtists();
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    rootMargin: '400px',
  });
  
  // Group by artist name
  const groupedArtists = artists ? groupMusiciansByArtist(artists) : [];
  
  // Client-side pagination
  const [displayCount, setDisplayCount] = React.useState(ITEMS_PER_PAGE);
  const displayedArtists = groupedArtists.slice(0, displayCount);
  const hasMore = displayCount < groupedArtists.length;
  
  // Auto-load when scrolling near bottom
  useEffect(() => {
    if (inView && hasMore && !isLoading) {
      console.log('Loading more artists...');
      setDisplayCount(prev => prev + ITEMS_PER_PAGE);
    }
  }, [inView, hasMore, isLoading]);
  
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-tw-purple/20 to-tw-cyan/20">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            Trending Artists
          </h1>
<p className="text-muted-foreground mt-1">
            Top artists of all time, ranked by your trusted network
          </p>
        </div>
        
        {/* Loading Initial */}
        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden">
                <Skeleton className="aspect-square" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Empty State */}
        {!isLoading && displayedArtists.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-tw-purple/20 to-tw-cyan/20 flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No Trending Artists</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Artists will appear here once people in your network start curating music.
            </p>
          </div>
        )}
        
        {/* Artists Grid */}
        {!isLoading && displayedArtists.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {displayedArtists.map(artist => (
                <MusicianCard key={artist.id} musician={artist} />
              ))}
            </div>
            
            {/* Load More Trigger */}
            {hasMore && (
              <div ref={loadMoreRef} className="py-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground mt-2">Loading more...</p>
              </div>
            )}
            
            {/* End of List */}
            {!hasMore && displayedArtists.length >= ITEMS_PER_PAGE && (
              <div className="py-8 text-center text-muted-foreground">
                <p>You've reached the end of trending artists</p>
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
