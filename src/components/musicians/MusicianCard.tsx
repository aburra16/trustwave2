import { ThumbsUp, ThumbsDown, ExternalLink, Music } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { usePublishReaction } from '@/hooks/useReaction';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { KINDS } from '@/lib/constants';
import type { ScoredListItem } from '@/lib/types';

interface MusicianCardProps {
  musician: ScoredListItem;
  variant?: 'default' | 'compact';
}

export function MusicianCard({ musician, variant = 'default' }: MusicianCardProps) {
  const { user } = useCurrentUser();
  const { mutate: publishReaction, isPending: isReacting } = usePublishReaction();
  
  const handleReaction = (reaction: '+' | '-') => {
    if (!user) return;
    
    publishReaction({
      targetEventId: musician.id,
      targetPubkey: musician.pubkey,
      targetKind: musician.event.kind || KINDS.LIST_ITEM,
      reaction,
      currentReaction: musician.userReaction,
    });
  };
  
  const name = musician.musicianName || musician.name || 'Unknown Artist';
  const artwork = musician.musicianArtwork || musician.songArtwork;
  
  // Use feedGuid (podcast GUID) as the primary identifier for navigation
  // Fallback to feedId only if feedGuid is not available
  const musicianId = musician.feedGuid || musician.musicianFeedGuid || musician.feedId;
  
  if (variant === 'compact') {
    return (
      <Link 
        to={musicianId ? `/musician/${musicianId}` : '#'}
        className="group flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-all block"
      >
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full overflow-hidden bg-secondary flex-shrink-0">
          {artwork ? (
            <img 
              src={artwork} 
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-tw-purple/20 to-tw-cyan/20 flex items-center justify-center">
              <Music className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
        </div>
        
        {/* Name */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium truncate">{name}</h4>
        </div>
        
        {/* Score */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <ThumbsUp className="w-3 h-3" />
          <span>{musician.upvotes}</span>
        </div>
      </Link>
    );
  }
  
  return (
    <Link 
      to={musicianId ? `/musician/${musicianId}` : '#'}
      className={cn(
        'group relative rounded-xl overflow-hidden bg-card border border-border/50 transition-all duration-200 block',
        'hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 cursor-pointer'
      )}
    >
      {/* Artist Image */}
      <div className="aspect-square relative">
        {artwork ? (
          <img 
            src={artwork} 
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-tw-purple/20 to-tw-cyan/20 flex items-center justify-center">
            <Music className="w-16 h-16 text-muted-foreground/30" />
          </div>
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Score Badge */}
        {musician.score > 0 && (
          <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-background/80 backdrop-blur text-xs font-medium flex items-center gap-1">
            <ThumbsUp className="w-3 h-3 text-tw-success" />
            <span>{musician.score}</span>
          </div>
        )}
        
        {/* Name Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-semibold text-lg text-white truncate">
            {name}
          </h3>
          {musician.description && (
            <p className="text-sm text-white/70 line-clamp-2 mt-1">
              {musician.description}
            </p>
          )}
        </div>
      </div>
      
      {/* Actions */}
      <div className="p-3 flex items-center justify-between" onClick={(e) => e.preventDefault()}>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-sm">
            <ThumbsUp className="w-4 h-4 text-tw-success" />
            <span>{musician.upvotes}</span>
          </div>
          {musician.downvotes > 0 && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <ThumbsDown className="w-4 h-4" />
              <span>{musician.downvotes}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {user && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.preventDefault();
                  handleReaction('+');
                }}
                disabled={isReacting}
              >
                <ThumbsUp className={cn(
                  'w-4 h-4',
                  musician.userReaction === '+' && 'fill-current text-tw-success'
                )} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.preventDefault();
                  handleReaction('-');
                }}
                disabled={isReacting}
              >
                <ThumbsDown className={cn(
                  'w-4 h-4',
                  musician.userReaction === '-' && 'fill-current text-destructive'
                )} />
              </Button>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
