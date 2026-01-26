import { ThumbsUp, ThumbsDown, Users } from 'lucide-react';
import { useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import type { NostrEvent } from '@nostrify/nostrify';

interface VoterAvatarProps {
  pubkey: string;
  reaction: '+' | '-';
  showName?: boolean;
}

function VoterAvatar({ pubkey, reaction, showName = false }: VoterAvatarProps) {
  const { data: author } = useAuthor(pubkey);
  const metadata = author?.metadata;
  const displayName = metadata?.name || metadata?.display_name || genUserName(pubkey);
  const picture = metadata?.picture;
  
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Avatar className="w-6 h-6 border border-border">
            <AvatarImage src={picture} alt={displayName} />
            <AvatarFallback className="text-xs">
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {showName && (
            <span className="text-sm truncate max-w-24">{displayName}</span>
          )}
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-64">
        <div className="flex items-start gap-3">
          <Avatar className="w-12 h-12">
            <AvatarImage src={picture} alt={displayName} />
            <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold truncate">{displayName}</h4>
            {metadata?.about && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {metadata.about}
              </p>
            )}
            <div className="flex items-center gap-1 mt-2 text-xs">
              {reaction === '+' ? (
                <>
                  <ThumbsUp className="w-3 h-3 text-tw-success" />
                  <span className="text-tw-success">Upvoted</span>
                </>
              ) : (
                <>
                  <ThumbsDown className="w-3 h-3 text-destructive" />
                  <span className="text-destructive">Downvoted</span>
                </>
              )}
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

interface VotersListProps {
  upvoters: NostrEvent[];
  downvoters: NostrEvent[];
  variant?: 'compact' | 'full';
}

export function VotersList({ upvoters, downvoters, variant = 'compact' }: VotersListProps) {
  const [showDialog, setShowDialog] = useState(false);
  
  const totalVoters = upvoters.length + downvoters.length;
  
  if (totalVoters === 0) {
    return null;
  }
  
  if (variant === 'compact') {
    // Show first 3 upvoter avatars + count
    const displayUpvoters = upvoters.slice(0, 3);
    const remainingCount = totalVoters - displayUpvoters.length;
    
    return (
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-auto p-1 gap-1 hover:bg-secondary">
            <div className="flex -space-x-2">
              {displayUpvoters.map((voter) => (
                <div key={voter.id} className="ring-2 ring-background rounded-full">
                  <VoterAvatar pubkey={voter.pubkey} reaction="+" />
                </div>
              ))}
            </div>
            {remainingCount > 0 && (
              <span className="text-xs text-muted-foreground">
                +{remainingCount}
              </span>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Votes</DialogTitle>
            <DialogDescription>
              People who voted on this track
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-96">
            <div className="space-y-4">
              {upvoters.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <ThumbsUp className="w-4 h-4 text-tw-success" />
                    Upvoted ({upvoters.length})
                  </h4>
                  <div className="space-y-2">
                    {upvoters.map((voter) => (
                      <VoterAvatar key={voter.id} pubkey={voter.pubkey} reaction="+" showName />
                    ))}
                  </div>
                </div>
              )}
              {downvoters.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <ThumbsDown className="w-4 h-4 text-destructive" />
                    Downvoted ({downvoters.length})
                  </h4>
                  <div className="space-y-2">
                    {downvoters.map((voter) => (
                      <VoterAvatar key={voter.id} pubkey={voter.pubkey} reaction="-" showName />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  }
  
  return null;
}
