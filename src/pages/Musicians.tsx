import { useSeoMeta } from '@unhead/react';
import { Users, TrendingUp, Clock } from 'lucide-react';
import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { MusicianCard } from '@/components/musicians/MusicianCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useMusiciansList } from '@/hooks/useDecentralizedList';
import { cn } from '@/lib/utils';
import { APP_NAME } from '@/lib/constants';

type SortOption = 'score' | 'recent';

export default function Musicians() {
  useSeoMeta({
    title: `Musicians | ${APP_NAME}`,
    description: 'Discover artists curated by people you trust through Web-of-Trust filtering.',
  });
  
  const { data: musicians, isLoading, error } = useMusiciansList();
  const [sortBy, setSortBy] = useState<SortOption>('score');
  
  // Sort musicians
  const sortedMusicians = musicians ? [...musicians].sort((a, b) => {
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
                <Users className="w-6 h-6 text-primary" />
              </div>
              Musicians
            </h1>
            <p className="text-muted-foreground mt-1">
              {musicians?.length || 0} artists curated by your trusted network
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
          </div>
        </div>
        
        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <p className="text-destructive">Failed to load musicians. Please try again.</p>
          </div>
        )}
        
        {/* Loading State */}
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
        {!isLoading && sortedMusicians.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-tw-purple/20 to-tw-cyan/20 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No musicians yet</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Musicians will appear here once curators in your trusted network add them.
              Be the first to add some artists!
            </p>
          </div>
        )}
        
        {/* Musicians Grid */}
        {!isLoading && sortedMusicians.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {sortedMusicians.map(musician => (
              <MusicianCard key={musician.id} musician={musician} />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
