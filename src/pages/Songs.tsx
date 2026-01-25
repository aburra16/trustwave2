import { useSeoMeta } from '@unhead/react';
import { Music, TrendingUp, Clock, Filter } from 'lucide-react';
import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { SongCard } from '@/components/songs/SongCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSongsList } from '@/hooks/useDecentralizedList';
import { cn } from '@/lib/utils';
import { APP_NAME } from '@/lib/constants';

type SortOption = 'score' | 'recent';
type ViewMode = 'list' | 'grid';

export default function Songs() {
  useSeoMeta({
    title: `Songs | ${APP_NAME}`,
    description: 'Discover music curated by people you trust through Web-of-Trust filtering.',
  });
  
  const { data: songs, isLoading, error } = useSongsList();
  const [sortBy, setSortBy] = useState<SortOption>('score');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  
  // Sort songs
  const sortedSongs = songs ? [...songs].sort((a, b) => {
    if (sortBy === 'score') {
      return b.score - a.score;
    }
    return b.createdAt - a.createdAt;
  }) : [];
  
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-tw-purple/20 to-tw-cyan/20">
                <Music className="w-6 h-6 text-primary" />
              </div>
              Songs
            </h1>
            <p className="text-muted-foreground mt-1">
              {songs?.length || 0} tracks curated by your trusted network
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Sort Options */}
            <div className="flex items-center rounded-lg bg-secondary p-1">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-8',
                  sortBy === 'score' && 'bg-background shadow-sm'
                )}
                onClick={() => setSortBy('score')}
              >
                <TrendingUp className="w-4 h-4 mr-1.5" />
                Top
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-8',
                  sortBy === 'recent' && 'bg-background shadow-sm'
                )}
                onClick={() => setSortBy('recent')}
              >
                <Clock className="w-4 h-4 mr-1.5" />
                Recent
              </Button>
            </div>
            
            {/* View Mode Toggle */}
            <div className="hidden sm:flex items-center rounded-lg bg-secondary p-1">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-8 w-8',
                  viewMode === 'list' && 'bg-background shadow-sm'
                )}
                onClick={() => setViewMode('list')}
              >
                <Filter className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-8 w-8',
                  viewMode === 'grid' && 'bg-background shadow-sm'
                )}
                onClick={() => setViewMode('grid')}
              >
                <div className="grid grid-cols-2 gap-0.5">
                  <div className="w-1.5 h-1.5 bg-current rounded-sm" />
                  <div className="w-1.5 h-1.5 bg-current rounded-sm" />
                  <div className="w-1.5 h-1.5 bg-current rounded-sm" />
                  <div className="w-1.5 h-1.5 bg-current rounded-sm" />
                </div>
              </Button>
            </div>
          </div>
        </div>
        
        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <p className="text-destructive">Failed to load songs. Please try again.</p>
          </div>
        )}
        
        {/* Loading State */}
        {isLoading && (
          <div className={cn(
            viewMode === 'grid' 
              ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4'
              : 'space-y-2'
          )}>
            {Array.from({ length: 12 }).map((_, i) => (
              viewMode === 'grid' ? (
                <div key={i} className="rounded-xl overflow-hidden">
                  <Skeleton className="aspect-square" />
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ) : (
                <div key={i} className="flex items-center gap-4 p-3">
                  <Skeleton className="w-14 h-14 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-4 w-12" />
                </div>
              )
            ))}
          </div>
        )}
        
        {/* Empty State */}
        {!isLoading && sortedSongs.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-tw-purple/20 to-tw-cyan/20 flex items-center justify-center mx-auto mb-4">
              <Music className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No songs yet</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Songs will appear here once curators in your trusted network add them.
              Be the first to curate some music!
            </p>
          </div>
        )}
        
        {/* Songs List/Grid */}
        {!isLoading && sortedSongs.length > 0 && (
          <div className={cn(
            viewMode === 'grid' 
              ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4'
              : 'space-y-1'
          )}>
            {sortedSongs.map((song, index) => (
              <SongCard
                key={song.id}
                song={song}
                index={index}
                queue={sortedSongs}
                variant={viewMode === 'grid' ? 'grid' : 'default'}
              />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
