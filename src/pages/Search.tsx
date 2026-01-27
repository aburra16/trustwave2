import { useSeoMeta } from '@unhead/react';
import { Search as SearchIcon, Music, Users, X } from 'lucide-react';
import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SongCard } from '@/components/songs/SongCard';
import { MusicianCard } from '@/components/musicians/MusicianCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useSongsList, useMusiciansList } from '@/hooks/useDecentralizedList';
import { groupMusiciansByArtist } from '@/lib/musicianUtils';
import { APP_NAME } from '@/lib/constants';

export default function Search() {
  useSeoMeta({
    title: `Search | ${APP_NAME}`,
    description: 'Search the TrustWave music catalog curated by your network.',
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const { data: allSongs, isLoading: loadingSongs } = useSongsList();
  const { data: allMusicians, isLoading: loadingMusicians } = useMusiciansList();
  
  // Group musicians by artist name
  const groupedMusicians = allMusicians ? groupMusiciansByArtist(allMusicians) : [];
  
  // Filter based on search query
  const filteredSongs = useMemo(() => {
    if (!searchQuery.trim() || !allSongs) return [];
    
    const query = searchQuery.toLowerCase();
    return allSongs.filter(song => 
      song.songTitle?.toLowerCase().includes(query) ||
      song.songArtist?.toLowerCase().includes(query)
    );
  }, [searchQuery, allSongs]);
  
  const filteredMusicians = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    
    // Filter musicians by name
    const matchingMusicians = groupedMusicians.filter(musician =>
      (musician.musicianName || musician.name || '').toLowerCase().includes(query)
    );
    
    // Also check if any SONGS match this artist name (infer the artist exists)
    const songsWithMatchingArtist = filteredSongs.filter(song =>
      song.songArtist?.toLowerCase().includes(query)
    );
    
    // Get unique artist names from matching songs
    const artistsFromSongs = Array.from(
      new Set(songsWithMatchingArtist.map(s => s.songArtist?.toLowerCase()))
    ).filter(Boolean);
    
    // Create pseudo-musician entries for artists found in songs but not in musicians list
    const inferredMusicians = artistsFromSongs
      .filter(artistName => !matchingMusicians.some(m => 
        (m.musicianName || m.name || '').toLowerCase() === artistName
      ))
      .map(artistName => {
        // Find a song by this artist to get artwork
        const sampleSong = songsWithMatchingArtist.find(s => s.songArtist?.toLowerCase() === artistName);
        return {
          id: `inferred-${artistName}`,
          musicianName: sampleSong?.songArtist || '',
          musicianArtwork: sampleSong?.songArtwork,
          score: 0,
          upvotes: 0,
          downvotes: 0,
        } as any;
      });
    
    return [...matchingMusicians, ...inferredMusicians];
  }, [searchQuery, groupedMusicians, filteredSongs]);
  
  const hasResults = filteredSongs.length > 0 || filteredMusicians.length > 0;
  const showResults = searchQuery.trim().length > 0;
  
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
        {(loadingSongs || loadingMusicians) && !showResults && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading catalog...</p>
          </div>
        )}
        
        {/* Results */}
        {showResults && (
          <div className="max-w-4xl mx-auto">
            {hasResults ? (
              <Tabs defaultValue="all" className="space-y-6">
                <TabsList>
                  <TabsTrigger value="all">
                    All ({filteredSongs.length + filteredMusicians.length})
                  </TabsTrigger>
                  <TabsTrigger value="songs">
                    <Music className="w-4 h-4 mr-1.5" />
                    Songs ({filteredSongs.length})
                  </TabsTrigger>
                  <TabsTrigger value="musicians">
                    <Users className="w-4 h-4 mr-1.5" />
                    Artists ({filteredMusicians.length})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="all" className="space-y-6">
                  {/* Musicians */}
                  {filteredMusicians.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Artists
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {filteredMusicians.slice(0, 10).map(musician => (
                          <MusicianCard key={musician.id} musician={musician} />
                        ))}
                      </div>
                      {filteredMusicians.length > 10 && (
                        <p className="text-sm text-muted-foreground mt-4">
                          +{filteredMusicians.length - 10} more artists
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Songs */}
                  {filteredSongs.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Music className="w-5 h-5" />
                        Songs
                      </h3>
                      <div className="space-y-1">
                        {filteredSongs.slice(0, 20).map((song, index) => (
                          <SongCard key={song.id} song={song} index={index} queue={filteredSongs} />
                        ))}
                      </div>
                      {filteredSongs.length > 20 && (
                        <p className="text-sm text-muted-foreground mt-4">
                          +{filteredSongs.length - 20} more songs
                        </p>
                      )}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="songs">
                  <div className="space-y-1">
                    {filteredSongs.map((song, index) => (
                      <SongCard key={song.id} song={song} index={index} queue={filteredSongs} />
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="musicians">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {filteredMusicians.map(musician => (
                      <MusicianCard key={musician.id} musician={musician} />
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
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
        {!showResults && !loadingSongs && !loadingMusicians && (
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
