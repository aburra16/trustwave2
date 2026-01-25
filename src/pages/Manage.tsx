import { useSeoMeta } from '@unhead/react';
import { Trash2, Music, Users, AlertCircle } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSongsList, useMusiciansList } from '@/hooks/useDecentralizedList';
import { useHiddenItems } from '@/hooks/useHiddenItems';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { LoginArea } from '@/components/auth/LoginArea';
import { APP_NAME } from '@/lib/constants';

export default function Manage() {
  useSeoMeta({
    title: `Manage | ${APP_NAME}`,
    description: 'Manage your curated songs and musicians.',
  });
  
  const { user } = useCurrentUser();
  const { data: songs } = useSongsList();
  const { data: musicians } = useMusiciansList();
  const { hideItem, unhideItem, isHidden } = useHiddenItems();
  
  // Filter to only show items added by the current user
  const mySongs = songs?.filter(s => s.pubkey === user?.pubkey) || [];
  const myMusicians = musicians?.filter(m => m.pubkey === user?.pubkey) || [];
  
  const handleHide = (eventId: string, itemName: string) => {
    if (confirm(`Hide "${itemName}"? You can re-add it later from Search.`)) {
      hideItem(eventId);
    }
  };
  
  if (!user) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Login Required</CardTitle>
              <CardDescription>
                You need to be logged in to manage your curated content.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <LoginArea className="w-full max-w-xs" />
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-2">Manage Your Content</h1>
        <p className="text-muted-foreground mb-8">
          View and remove songs and musicians you've added to the lists
        </p>
        
        <Alert className="mb-6">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            <strong>Note:</strong> Hide old entries missing feedId, then re-add them from Search. 
            Hidden items won't show in your lists. This is stored locally in your browser.
          </AlertDescription>
        </Alert>
        
        <Tabs defaultValue="songs">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="songs">
              My Songs ({mySongs.length})
            </TabsTrigger>
            <TabsTrigger value="musicians">
              My Musicians ({myMusicians.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="songs" className="space-y-3 mt-6">
            {mySongs.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-xl border border-dashed">
                <Music className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">You haven't added any songs yet</p>
              </div>
            ) : (
              mySongs.map(song => (
                <div 
                  key={song.id}
                  className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card"
                >
                  {/* Artwork */}
                  <div className="w-12 h-12 rounded overflow-hidden bg-secondary flex-shrink-0">
                    {song.songArtwork ? (
                      <img src={song.songArtwork} alt={song.songTitle || ''} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-tw-purple/10 to-tw-cyan/10" />
                    )}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{song.songTitle || 'Unknown'}</h4>
                    <p className="text-sm text-muted-foreground truncate">{song.songArtist}</p>
                    <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                      <span>Score: {song.score}</span>
                      {song.feedId && <span className="text-tw-success">✓ Has feedId</span>}
                      {!song.feedId && <span className="text-tw-orange">⚠ Missing feedId</span>}
                    </div>
                  </div>
                  
                  {/* Hide */}
                  {isHidden(song.id) ? (
                    <span className="text-xs text-muted-foreground px-2">Hidden</span>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleHide(song.id, song.songTitle || 'this song')}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))
            )}
          </TabsContent>
          
          <TabsContent value="musicians" className="space-y-3 mt-6">
            {myMusicians.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-xl border border-dashed">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">You haven't added any musicians yet</p>
              </div>
            ) : (
              myMusicians.map(musician => (
                <div 
                  key={musician.id}
                  className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card"
                >
                  {/* Artwork */}
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-secondary flex-shrink-0">
                    {musician.musicianArtwork ? (
                      <img src={musician.musicianArtwork} alt={musician.musicianName || ''} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-tw-purple/10 to-tw-cyan/10" />
                    )}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{musician.musicianName || musician.name}</h4>
                    <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                      <span>Score: {musician.score}</span>
                      {musician.feedId && <span className="text-tw-success">✓ Has feedId</span>}
                      {!musician.feedId && <span className="text-tw-orange">⚠ Missing feedId</span>}
                      {musician.feedGuid && <span>GUID: {musician.feedGuid.slice(0, 8)}...</span>}
                      {musician.musicianFeedGuid && <span>GUID: {musician.musicianFeedGuid.slice(0, 8)}...</span>}
                    </div>
                  </div>
                  
                  {/* Hide */}
                  {isHidden(musician.id) ? (
                    <span className="text-xs text-muted-foreground px-2">Hidden</span>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleHide(musician.id, musician.musicianName || musician.name || 'this musician')}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
