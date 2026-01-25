import { Play, Pause, ThumbsUp, ThumbsDown, MoreHorizontal, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePlayer } from '@/contexts/PlayerContext';
import { usePublishReaction } from '@/hooks/useReaction';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { KINDS } from '@/lib/constants';
import type { ScoredListItem } from '@/lib/types';

interface SongCardProps {
  song: ScoredListItem;
  index?: number;
  queue?: ScoredListItem[];
  variant?: 'default' | 'compact' | 'grid';
}

function formatDuration(seconds: number | undefined): string {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function SongCard({ song, index = 0, queue = [], variant = 'default' }: SongCardProps) {
  const { state, playTrack } = usePlayer();
  const { user } = useCurrentUser();
  const { mutate: publishReaction, isPending: isReacting } = usePublishReaction();
  
  const isCurrentTrack = state.currentTrack?.id === song.id;
  const isPlaying = isCurrentTrack && state.isPlaying;
  
  const handlePlay = () => {
    playTrack(song, queue.length > 0 ? queue : [song], index);
  };
  
  const handleReaction = (reaction: '+' | '-') => {
    if (!user) return;
    
    publishReaction({
      targetEventId: song.id,
      targetPubkey: song.pubkey,
      targetKind: song.event.kind || KINDS.LIST_ITEM,
      reaction,
    });
  };
  
  if (variant === 'grid') {
    return (
      <div 
        className={cn(
          'group relative rounded-xl overflow-hidden bg-card border border-border/50 transition-all duration-200',
          'hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5',
          isCurrentTrack && 'border-primary/50 shadow-lg shadow-primary/10'
        )}
      >
        {/* Album Art */}
        <div className="aspect-square relative">
          {song.songArtwork ? (
            <img 
              src={song.songArtwork} 
              alt={song.songTitle || 'Album art'}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-tw-purple/20 to-tw-cyan/20 flex items-center justify-center">
              <Play className="w-12 h-12 text-muted-foreground/50" />
            </div>
          )}
          
          {/* Play Overlay */}
          <div className={cn(
            'absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity',
            'opacity-0 group-hover:opacity-100',
            isPlaying && 'opacity-100'
          )}>
            <Button
              size="icon"
              className="w-14 h-14 rounded-full shadow-xl"
              onClick={handlePlay}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6 ml-1" />
              )}
            </Button>
          </div>
          
          {/* Score Badge */}
          {song.score > 0 && (
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-background/80 backdrop-blur text-xs font-medium">
              +{song.score}
            </div>
          )}
        </div>
        
        {/* Info */}
        <div className="p-3">
          <h3 className="font-medium text-sm truncate">
            {song.songTitle || 'Unknown Track'}
          </h3>
          <p className="text-xs text-muted-foreground truncate">
            {song.songArtist || 'Unknown Artist'}
          </p>
        </div>
      </div>
    );
  }
  
  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'group flex items-center gap-3 p-2 rounded-lg transition-all',
          'hover:bg-secondary/50',
          isCurrentTrack && 'bg-primary/5'
        )}
      >
        {/* Play Button */}
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 flex-shrink-0"
          onClick={handlePlay}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </Button>
        
        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium truncate">
            {song.songTitle || 'Unknown Track'}
          </h4>
          <p className="text-xs text-muted-foreground truncate">
            {song.songArtist}
          </p>
        </div>
        
        {/* Duration */}
        <span className="text-xs text-muted-foreground">
          {formatDuration(song.songDuration)}
        </span>
        
        {/* Score */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <ThumbsUp className="w-3 h-3" />
          <span>{song.upvotes}</span>
        </div>
      </div>
    );
  }
  
  // Default variant
  return (
    <div
      className={cn(
        'group flex items-center gap-4 p-3 rounded-xl transition-all duration-200',
        'hover:bg-secondary/50 border border-transparent',
        isCurrentTrack && 'bg-primary/5 border-primary/20'
      )}
    >
      {/* Album Art */}
      <div 
        className="relative w-14 h-14 rounded-lg overflow-hidden bg-secondary flex-shrink-0 cursor-pointer"
        onClick={handlePlay}
      >
        {song.songArtwork ? (
          <img 
            src={song.songArtwork} 
            alt={song.songTitle || 'Album art'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-tw-purple/20 to-tw-cyan/20 flex items-center justify-center">
            <Play className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
        
        {/* Play Overlay */}
        <div className={cn(
          'absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity',
          'opacity-0 group-hover:opacity-100',
          isPlaying && 'opacity-100'
        )}>
          {isPlaying ? (
            <Pause className="w-5 h-5 text-white" />
          ) : (
            <Play className="w-5 h-5 text-white ml-0.5" />
          )}
        </div>
      </div>
      
      {/* Track Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium truncate">
          {song.songTitle || 'Unknown Track'}
        </h3>
        <p className="text-sm text-muted-foreground truncate">
          {song.songArtist || 'Unknown Artist'}
        </p>
      </div>
      
      {/* Duration */}
      <span className="text-sm text-muted-foreground hidden sm:block">
        {formatDuration(song.songDuration)}
      </span>
      
      {/* Score */}
      <div className="flex items-center gap-2 px-3">
        <div className="flex items-center gap-1 text-tw-success">
          <ThumbsUp className="w-4 h-4" />
          <span className="text-sm font-medium">{song.upvotes}</span>
        </div>
        {song.downvotes > 0 && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <ThumbsDown className="w-4 h-4" />
            <span className="text-sm">{song.downvotes}</span>
          </div>
        )}
      </div>
      
      {/* Action Buttons */}
      {user && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleReaction('+')}
            disabled={isReacting}
          >
            <ThumbsUp className={cn(
              'w-4 h-4',
              song.userReaction === '+' && 'fill-current text-tw-success'
            )} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleReaction('-')}
            disabled={isReacting}
          >
            <ThumbsDown className={cn(
              'w-4 h-4',
              song.userReaction === '-' && 'fill-current text-destructive'
            )} />
          </Button>
        </div>
      )}
      
      {/* More Options */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handlePlay}>
            <Play className="w-4 h-4 mr-2" />
            Play Now
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Plus className="w-4 h-4 mr-2" />
            Add to Queue
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
