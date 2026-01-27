import { useSeoMeta } from '@unhead/react';
import { Search as SearchIcon, Music, Users, X, Plus, Sparkles, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MusicianCard } from '@/components/musicians/MusicianCard';
import { Card, CardContent } from '@/components/ui/card';
import { useHybridSearch } from '@/hooks/useHybridSearch';
import { useAddMusician } from '@/hooks/useCurator';
import { useToast } from '@/hooks/useToast';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { groupMusiciansByArtist } from '@/lib/musicianUtils';
import { APP_NAME } from '@/lib/constants';
import type { PodcastIndexFeed } from '@/lib/types';

export default function Search() {
  useSeoMeta({
    title: `Search | ${APP_NAME}`,
    description: 'Search the TrustWave music catalog curated by your network.',
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const { mutate: addMusician, isPending: addingMusician } = useAddMusician();
  
  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  // Use hybrid search (API + relay)
  const { data: searchResults, isLoading } = useHybridSearch(debouncedQuery);
  
  const onTrustWave = searchResults?.onTrustWave || [];
  const notOnTrustWave = searchResults?.notOnTrustWave || [];
  
  // Group musicians by name
  const groupedMusicians = onTrustWave.length > 0 ? groupMusiciansByArtist(onTrustWave) : [];
  
  const hasResults = groupedMusicians.length > 0 || notOnTrustWave.length > 0;
  const showResults = debouncedQuery.trim().length > 0;
  
  const handleImportArtist = (feed: PodcastIndexFeed) => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please log in to add artists to the catalog.',
        variant: 'destructive',
      });
      return;
    }
    
    addMusician({ feed, addSongsAutomatically: true }, {
      onSuccess: (data) => {
        toast({
          title: 'Artist Added!',
          description: `${feed.author || feed.title} and ${data.songEvents.length} songs added to TrustWave.`,
        });
      },
      onError: (error) => {
        toast({
          title: 'Failed to Add',
          description: error.message,
          variant: 'destructive',
        });
      },
    });
  };
  
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="max-w-2xl mx-auto text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Search Music</h1>
          <p className="text-muted-foreground">
            Search the TrustWave catalog curated by your network
          </p>
        </div>
        
        {/* Search Form */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search for artists, albums, or tracks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 h-12 text-lg"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2"
                onClick={() => setSearchQuery('')}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Loading */}
        {isLoading && showResults && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Searching...</p>
          </div>
        )}
        
        {/* Results */}
        {showResults && !isLoading && (
          <div className="max-w-4xl mx-auto space-y-6">
            {hasResults ? (
              <>
                {/* Artists on TrustWave */}
                {groupedMusicians.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      On TrustWave ({groupedMusicians.length})
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {groupedMusicians.map(musician => (
                        <MusicianCard key={musician.id} musician={musician} />
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Artists NOT on TrustWave (can be imported) */}
                {notOnTrustWave.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-tw-cyan" />
                      New Discoveries ({notOnTrustWave.length})
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      These artists aren't on TrustWave yet. Click to add them!
                    </p>
                    <div className="space-y-3">
                      {notOnTrustWave.map(feed => (
                        <Card key={feed.id} className="border-tw-cyan/30 bg-tw-cyan/5">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                              {/* Artwork */}
                              <div className="w-16 h-16 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                                {feed.artwork || feed.image ? (
                                  <img src={feed.artwork || feed.image} alt={feed.title} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-tw-cyan/20 to-tw-purple/20 flex items-center justify-center">
                                    <Music className="w-6 h-6 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              
                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold truncate">{feed.title}</h4>
                                <p className="text-sm text-muted-foreground truncate">{feed.author}</p>
                                <p className="text-xs text-tw-cyan mt-1">Not on TrustWave yet</p>
                              </div>
                              
                              {/* Import Button */}
                              <Button
                                variant="default"
                                onClick={() => handleImportArtist(feed)}
                                disabled={addingMusician || !user}
                                className="gap-2 bg-gradient-to-r from-tw-cyan to-tw-purple"
                              >
                                {addingMusician ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Plus className="w-4 h-4" />
                                )}
                                Add to TrustWave
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <SearchIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-lg font-medium mb-1">No results found</h2>
                <p className="text-muted-foreground">
                  Try a different search term
                </p>
              </div>
            )}
          </div>
        )}
        
        
        
        {/* Empty State */}
        {!showResults && !isLoading && (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-tw-purple/20 to-tw-cyan/20 flex items-center justify-center mx-auto mb-6">
              <SearchIcon className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Search the Catalog</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Search through thousands of V4V-enabled tracks curated by your trusted network
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
