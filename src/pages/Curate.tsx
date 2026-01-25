import { useSeoMeta } from '@unhead/react';
import { Plus, Loader2, ListMusic, Check } from 'lucide-react';
import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/useToast';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCreateList } from '@/hooks/useCurator';
import { useGenreLists } from '@/hooks/useDecentralizedList';
import { APP_NAME } from '@/lib/constants';
import { LoginArea } from '@/components/auth/LoginArea';

export default function Curate() {
  useSeoMeta({
    title: `Curate | ${APP_NAME}`,
    description: 'Create and manage your music playlists.',
  });
  
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const { data: genreLists, isLoading: loadingLists } = useGenreLists();
  const { mutate: createList, isPending: creating } = useCreateList();
  
  const [formData, setFormData] = useState({
    nameSingular: '',
    namePlural: '',
    description: '',
    genres: '',
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nameSingular.trim() || !formData.namePlural.trim()) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill in the list name (singular and plural forms).',
        variant: 'destructive',
      });
      return;
    }
    
    const genres = formData.genres
      .split(',')
      .map(g => g.trim().toLowerCase())
      .filter(g => g.length > 0);
    
    createList({
      nameSingular: formData.nameSingular.trim(),
      namePlural: formData.namePlural.trim(),
      description: formData.description.trim() || undefined,
      genres: genres.length > 0 ? genres : undefined,
    }, {
      onSuccess: () => {
        toast({
          title: 'List Created',
          description: `Your "${formData.namePlural}" list has been created!`,
        });
        setFormData({
          nameSingular: '',
          namePlural: '',
          description: '',
          genres: '',
        });
      },
      onError: (error) => {
        toast({
          title: 'Failed to Create List',
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
          <h1 className="text-3xl font-bold mb-2">Curate Music</h1>
          <p className="text-muted-foreground">
            Create playlists and organize music for your community
          </p>
        </div>
        
        {/* Not Logged In */}
        {!user && (
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <CardTitle>Login Required</CardTitle>
              <CardDescription>
                You need to be logged in to create and manage playlists.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <LoginArea className="w-full max-w-xs" />
            </CardContent>
          </Card>
        )}
        
        {/* Logged In - Curator Tools */}
        {user && (
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Create New List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Create New Playlist
                </CardTitle>
                <CardDescription>
                  Create a genre-based playlist that others can discover
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nameSingular">Name (Singular)</Label>
                      <Input
                        id="nameSingular"
                        placeholder="e.g., chill beat"
                        value={formData.nameSingular}
                        onChange={(e) => setFormData(prev => ({ ...prev, nameSingular: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="namePlural">Name (Plural)</Label>
                      <Input
                        id="namePlural"
                        placeholder="e.g., chill beats"
                        value={formData.namePlural}
                        onChange={(e) => setFormData(prev => ({ ...prev, namePlural: e.target.value }))}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe what kind of music belongs in this playlist..."
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="genres">Genres (comma-separated)</Label>
                    <Input
                      id="genres"
                      placeholder="e.g., electronic, ambient, lo-fi"
                      value={formData.genres}
                      onChange={(e) => setFormData(prev => ({ ...prev, genres: e.target.value }))}
                    />
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={creating}>
                    {creating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Playlist
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
            
            {/* Existing Lists */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ListMusic className="w-5 h-5" />
                  Your Playlists
                </CardTitle>
                <CardDescription>
                  Playlists you and others have created
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingLists ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : genreLists && genreLists.length > 0 ? (
                  <div className="space-y-2">
                    {genreLists.map(list => (
                      <div 
                        key={list.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50"
                      >
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-tw-purple/20 to-tw-cyan/20 flex items-center justify-center">
                          <ListMusic className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{list.namePlural}</h4>
                          {list.genres.length > 0 && (
                            <p className="text-xs text-muted-foreground truncate">
                              {list.genres.join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <ListMusic className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No playlists created yet</p>
                    <p className="text-sm">Create your first playlist above!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* How It Works */}
        <div className="max-w-2xl mx-auto mt-12">
          <h2 className="text-xl font-semibold text-center mb-6">How Curation Works</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-tw-purple to-tw-cyan flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold">1</span>
              </div>
              <h3 className="font-medium mb-1">Search</h3>
              <p className="text-sm text-muted-foreground">
                Find music on Podcast Index via the Search page
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-tw-purple to-tw-cyan flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold">2</span>
              </div>
              <h3 className="font-medium mb-1">Add</h3>
              <p className="text-sm text-muted-foreground">
                Add songs and artists to the master lists
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-tw-purple to-tw-cyan flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold">3</span>
              </div>
              <h3 className="font-medium mb-1">Organize</h3>
              <p className="text-sm text-muted-foreground">
                Create genre playlists to organize music
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
