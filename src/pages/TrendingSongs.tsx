import { useSeoMeta } from '@unhead/react';
import { TrendingUp, Loader2, Music } from 'lucide-react';
import React, { useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { MainLayout } from '@/components/layout/MainLayout';
import { SongCard } from '@/components/songs/SongCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useTrendingSongs } from '@/hooks/useTrending';
import { APP_NAME } from '@/lib/constants';

const ITEMS_PER_PAGE = 25;

export default function TrendingSongs() {
  useSeoMeta({
    title: `Trending Songs | ${APP_NAME}`,
    description: 'Top songs of all time, ranked by your trusted network.',
  });
  
  const { songs, isLoading } = useTrendingSongs();
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    rootMargin: '400px',
  });
  
  // Client-side pagination
  const [displayCount, setDisplayCount] = React.useState(ITEMS_PER_PAGE);
  const displayedSongs = songs?.slice(0, displayCount) || [];
  const hasMore = songs && displayCount < songs.length;
  
  // Auto-load when scrolling near bottom
  useEffect(() => {
    if (inView && hasMore && !isLoading) {
      console.log('Loading more songs...');
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
            Trending Songs
          </h1>
          <p className="text-muted-foreground mt-1">
            Top tracks of all time, ranked by your trusted network
          </p>
        </div>
        
        {/* Loading Initial */}
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
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
        )}
        
        {/* Empty State */}
        {!isLoading && displayedSongs.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-tw-purple/20 to-tw-cyan/20 flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No Trending Songs</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Songs will appear here once people in your network start upvoting tracks.
            </p>
          </div>
        )}
        
        {/* Songs List */}
        {!isLoading && displayedSongs.length > 0 && (
          <div className="space-y-1">
            {displayedSongs.map((song, index) => (
              <SongCard 
                key={song.id} 
                song={song}
                index={index}
                queue={displayedSongs}
              />
            ))}
            
            {/* Load More Trigger */}
            {hasMore && (
              <div ref={loadMoreRef} className="py-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground mt-2">Loading more...</p>
              </div>
            )}
            
            {/* End of List */}
            {!hasMore && displayedSongs.length >= ITEMS_PER_PAGE && (
              <div className="py-8 text-center text-muted-foreground">
                <p>You've reached the end of trending songs</p>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
