import { useState } from 'react';
import { Music, ChevronDown, ChevronUp, Plus, User, Loader2, Check, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/useToast';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { usePodcastIndexEpisodes } from '@/hooks/usePodcastIndex';
import { useAddSong, useAddMusician } from '@/hooks/useCurator';
import type { PodcastIndexFeed, PodcastIndexEpisode } from '@/lib/types';

interface SearchResultCardProps {
  feed: PodcastIndexFeed;
}

export function SearchResultCard({ feed }: SearchResultCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { user } = useCurrentUser();
  const { toast } = useToast();
  
  const { data: episodes, isLoading: loadingEpisodes } = usePodcastIndexEpisodes(
    isExpanded ? feed.id : undefined
  );
  
  const { mutate: addMusician, isPending: addingMusician } = useAddMusician();
  const { mutate: addSong, isPending: addingSong } = useAddSong();
  
  const [addedMusician, setAddedMusician] = useState(false);
  const [addedSongs, setAddedSongs] = useState<Set<string>>(new Set());
  
  const handleAddMusician = () => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please log in to add musicians to the list.',
        variant: 'destructive',
      });
      return;
    }
    
    addMusician({ feed }, {
      onSuccess: () => {
        setAddedMusician(true);
        toast({
          title: 'Musician Added',
          description: `${feed.author || feed.title} has been added to the musicians list.`,
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
  
  const handleAddSong = (episode: PodcastIndexEpisode) => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please log in to add songs to the list.',
        variant: 'destructive',
      });
      return;
    }
    
    addSong({ episode, feed }, {
      onSuccess: () => {
        setAddedSongs(prev => new Set([...prev, episode.guid]));
        toast({
          title: 'Song Added',
          description: `${episode.title} has been added to the songs list.`,
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
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden transition-all hover:border-border">
      {/* Main Info */}
      <div className="flex items-start gap-4 p-4">
        {/* Artwork */}
        <div className="w-20 h-20 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
          {feed.artwork || feed.image ? (
            <img 
              src={feed.artwork || feed.image} 
              alt={feed.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-tw-purple/20 to-tw-cyan/20 flex items-center justify-center">
              <Music className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
        </div>
        
        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg truncate">{feed.title}</h3>
          <p className="text-sm text-muted-foreground truncate">
            {feed.author || 'Unknown Artist'}
          </p>
          {feed.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {feed.description}
            </p>
          )}
          
          {/* Categories */}
          {feed.categories && Object.keys(feed.categories).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {Object.values(feed.categories).slice(0, 3).map((category, i) => (
                <span 
                  key={i}
                  className="px-2 py-0.5 rounded-full bg-secondary text-xs text-muted-foreground"
                >
                  {category}
                </span>
              ))}
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Button
            variant={addedMusician ? 'outline' : 'default'}
            size="sm"
            onClick={handleAddMusician}
            disabled={addingMusician || addedMusician || !user}
            className="gap-1.5"
          >
            {addingMusician ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : addedMusician ? (
              <Check className="w-4 h-4" />
            ) : (
              <User className="w-4 h-4" />
            )}
            {addedMusician ? 'Added' : 'Add Artist'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="gap-1.5"
          >
            <Music className="w-4 h-4" />
            Tracks
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
      
      {/* Expanded Episodes */}
      {isExpanded && (
        <div className="border-t border-border/50 bg-secondary/30">
          {loadingEpisodes ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : episodes && episodes.length > 0 ? (
            <div className="divide-y divide-border/50">
              {episodes.slice(0, 20).map(episode => (
                <div 
                  key={episode.id}
                  className="flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors"
                >
                  {/* Episode Artwork */}
                  <div className="w-12 h-12 rounded overflow-hidden bg-secondary flex-shrink-0">
                    {episode.image || episode.feedImage ? (
                      <img 
                        src={episode.image || episode.feedImage} 
                        alt={episode.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-tw-purple/10 to-tw-cyan/10 flex items-center justify-center">
                        <Music className="w-5 h-5 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                  
                  {/* Episode Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium truncate">{episode.title}</h4>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {episode.duration && (
                        <span>{Math.floor(episode.duration / 60)}:{String(episode.duration % 60).padStart(2, '0')}</span>
                      )}
                      {episode.datePublishedPretty && (
                        <span>{episode.datePublishedPretty}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Add Button */}
                  <Button
                    variant={addedSongs.has(episode.guid) ? 'outline' : 'default'}
                    size="sm"
                    onClick={() => handleAddSong(episode)}
                    disabled={addingSong || addedSongs.has(episode.guid) || !user}
                    className="gap-1"
                  >
                    {addedSongs.has(episode.guid) ? (
                      <>
                        <Check className="w-3 h-3" />
                        Added
                      </>
                    ) : (
                      <>
                        <Plus className="w-3 h-3" />
                        Add
                      </>
                    )}
                  </Button>
                </div>
              ))}
              
              {episodes.length > 20 && (
                <div className="p-3 text-center text-sm text-muted-foreground">
                  Showing first 20 of {episodes.length} tracks
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No tracks found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
