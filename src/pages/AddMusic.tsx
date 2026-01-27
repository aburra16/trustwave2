import { useSeoMeta } from '@unhead/react';
import { Search as SearchIcon, Loader2, Music, Users, Plus } from 'lucide-react';
import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePodcastIndexSearchMutation } from '@/hooks/usePodcastIndex';
import { SearchResultCard } from '@/components/search/SearchResultCard';
import { APP_NAME } from '@/lib/constants';

export default function AddMusic() {
  useSeoMeta({
    title: `Add Music | ${APP_NAME}`,
    description: 'Search Podcast Index to add new music to the TrustWave catalog.',
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const { mutate: search, data: results, isPending, reset } = usePodcastIndexSearchMutation();
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      search(searchQuery);
    }
  };
  
  const handleClear = () => {
    setSearchQuery('');
    reset();
  };
  
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="max-w-2xl mx-auto text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Add Music</h1>
          <p className="text-muted-foreground">
            Search Podcast Index to add new music to the TrustWave catalog
          </p>
        </div>
        
        {/* Search Form */}
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search for artists, albums, or tracks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-lg"
              />
            </div>
            <Button type="submit" size="lg" disabled={isPending || !searchQuery.trim()}>
              {isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Search'
              )}
            </Button>
          </div>
        </form>
        
        {/* Results */}
        {results && results.length > 0 && (
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                Found {results.length} result{results.length !== 1 ? 's' : ''}
              </p>
              <Button variant="ghost" size="sm" onClick={handleClear}>
                Clear
              </Button>
            </div>
            
            <div className="space-y-3">
              {results.map(feed => (
                <SearchResultCard key={feed.id} feed={feed} />
              ))}
            </div>
          </div>
        )}
        
        {/* No Results */}
        {results && results.length === 0 && (
          <div className="text-center py-12">
            <SearchIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-medium mb-1">No results found</h2>
            <p className="text-muted-foreground">
              Try a different search term
            </p>
          </div>
        )}
        
        {/* Empty State */}
        {!results && !isPending && (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-tw-purple/20 to-tw-cyan/20 flex items-center justify-center mx-auto mb-6">
              <SearchIcon className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Discover New Music</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-8">
              Search the Podcast Index database to find V4V-enabled music 
              from independent artists around the world.
            </p>
            
            <div className="flex flex-wrap justify-center gap-2">
              {['Bitcoin', 'Jazz', 'Electronic', 'Folk', 'Rock', 'Hip Hop'].map(genre => (
                <Button
                  key={genre}
                  variant="outline"
                  onClick={() => {
                    setSearchQuery(genre);
                    search(genre);
                  }}
                >
                  {genre}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
