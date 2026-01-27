import { useSeoMeta } from '@unhead/react';
import { ListMusic, Music, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useGenreLists } from '@/hooks/useDecentralizedList';
import { APP_NAME } from '@/lib/constants';

export default function Browse() {
  useSeoMeta({
    title: `Browse | ${APP_NAME}`,
    description: 'Browse music by genre, mood, and curated playlists.',
  });
  
  const { data: genreLists, isLoading } = useGenreLists();
  
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h1 className="text-3xl font-bold mb-2">Browse Playlists</h1>
          <p className="text-muted-foreground">
            Discover music organized by genre, mood, and community curators
          </p>
        </div>
        
        {/* Loading */}
        {isLoading && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {/* Empty State */}
        {!isLoading && (!genreLists || genreLists.length === 0) && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-tw-purple/20 to-tw-cyan/20 flex items-center justify-center mx-auto mb-4">
              <ListMusic className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No Playlists Yet</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Genre and mood playlists will appear here once curators create them.
              Be the first to create one!
            </p>
            <Link 
              to="/curate"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Create Playlist
            </Link>
          </div>
        )}
        
        {/* Genre Lists */}
        {!isLoading && genreLists && genreLists.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {genreLists.map(list => (
              <Link
                key={list.id}
                to={`/playlist/${list.aTag}`}
                className="group"
              >
                <Card className="h-full transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
                  <CardHeader>
                    <CardTitle className="flex items-start justify-between gap-2">
                      <span className="group-hover:text-primary transition-colors">
                        {list.namePlural}
                      </span>
                      <div className="p-2 rounded-lg bg-gradient-to-br from-tw-purple/10 to-tw-cyan/10">
                        <Music className="w-4 h-4 text-primary" />
                      </div>
                    </CardTitle>
                    {list.description && (
                      <CardDescription className="line-clamp-2">
                        {list.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    {list.genres && list.genres.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {list.genres.slice(0, 3).map((genre, i) => (
                          <span 
                            key={i}
                            className="px-2 py-1 rounded-full bg-secondary text-xs"
                          >
                            {genre}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
