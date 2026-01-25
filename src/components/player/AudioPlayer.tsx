import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  ThumbsUp,
  ThumbsDown,
  Zap,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { usePlayer } from '@/contexts/PlayerContext';
import { usePublishReaction } from '@/hooks/useReaction';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { BoostDialog } from './BoostDialog';
import { KINDS } from '@/lib/constants';

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function AudioPlayer() {
  const { state, togglePlay, seek, setVolume, nextTrack, prevTrack } = usePlayer();
  const { currentTrack, isPlaying, currentTime, duration, volume, isLoading } = state;
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(volume);
  
  const { user } = useCurrentUser();
  const { mutate: publishReaction, isPending: isReacting } = usePublishReaction();
  
  if (!currentTrack) return null;
  
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  
  const handleVolumeToggle = () => {
    if (isMuted) {
      setVolume(prevVolume);
      setIsMuted(false);
    } else {
      setPrevVolume(volume);
      setVolume(0);
      setIsMuted(true);
    }
  };
  
  const handleReaction = (reaction: '+' | '-') => {
    if (!user || !currentTrack) return;
    
    publishReaction({
      targetEventId: currentTrack.id,
      targetPubkey: currentTrack.pubkey,
      targetKind: currentTrack.event.kind || KINDS.LIST_ITEM,
      reaction,
    });
  };
  
  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 glass border-t border-border/50 transition-all duration-300',
        'md:bottom-0',
        isExpanded ? 'h-auto' : 'h-20'
      )}
    >
      {/* Progress bar (thin, at top of player) */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-secondary">
        <div 
          className="h-full bg-gradient-to-r from-tw-purple to-tw-cyan transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <div className="container mx-auto px-4">
        {/* Compact Player */}
        <div className="flex items-center gap-4 h-20">
          {/* Album Art */}
          <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
            {currentTrack.songArtwork ? (
              <img 
                src={currentTrack.songArtwork} 
                alt={currentTrack.songTitle || 'Album art'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-tw-purple/20 to-tw-cyan/20 flex items-center justify-center">
                <Play className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            {isLoading && (
              <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          
          {/* Track Info */}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">
              {currentTrack.songTitle || 'Unknown Track'}
            </h4>
            <p className="text-xs text-muted-foreground truncate">
              {currentTrack.songArtist || 'Unknown Artist'}
            </p>
          </div>
          
          {/* Main Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:flex"
              onClick={prevTrack}
            >
              <SkipBack className="w-4 h-4" />
            </Button>
            
            <Button
              variant="default"
              size="icon"
              className="w-10 h-10 rounded-full"
              onClick={togglePlay}
              disabled={isLoading}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:flex"
              onClick={nextTrack}
            >
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Time Display */}
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground min-w-[100px]">
            <span>{formatTime(currentTime)}</span>
            <span>/</span>
            <span>{formatTime(duration)}</span>
          </div>
          
          {/* Volume (desktop) */}
          <div className="hidden lg:flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleVolumeToggle}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume * 100]}
              onValueChange={([v]) => {
                setVolume(v / 100);
                if (v > 0) setIsMuted(false);
              }}
              max={100}
              step={1}
              className="w-24"
            />
          </div>
          
          {/* Reaction Buttons */}
          {user && (
            <div className="hidden md:flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleReaction('+')}
                disabled={isReacting}
                className={cn(
                  currentTrack.userReaction === '+' && 'text-tw-success'
                )}
              >
                <ThumbsUp className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleReaction('-')}
                disabled={isReacting}
                className={cn(
                  currentTrack.userReaction === '-' && 'text-destructive'
                )}
              >
                <ThumbsDown className="w-4 h-4" />
              </Button>
            </div>
          )}
          
          {/* Boost Button */}
          <BoostDialog>
            <Button
              variant="outline"
              size="sm"
              className="hidden md:flex items-center gap-1.5 border-tw-orange/50 text-tw-orange hover:bg-tw-orange/10"
            >
              <Zap className="w-4 h-4" />
              <span>Boost</span>
            </Button>
          </BoostDialog>
          
          {/* Expand Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </Button>
        </div>
        
        {/* Expanded Player (mobile) */}
        {isExpanded && (
          <div className="pb-4 pt-2 md:hidden animate-slide-in-up">
            {/* Seek Bar */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs text-muted-foreground w-10">
                {formatTime(currentTime)}
              </span>
              <Slider
                value={[progress]}
                onValueChange={([v]) => {
                  const newTime = (v / 100) * duration;
                  seek(newTime);
                }}
                max={100}
                step={0.1}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground w-10 text-right">
                {formatTime(duration)}
              </span>
            </div>
            
            {/* Extra Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleVolumeToggle}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </Button>
                <Slider
                  value={[isMuted ? 0 : volume * 100]}
                  onValueChange={([v]) => {
                    setVolume(v / 100);
                    if (v > 0) setIsMuted(false);
                  }}
                  max={100}
                  step={1}
                  className="w-20"
                />
              </div>
              
              {user && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleReaction('+')}
                    disabled={isReacting}
                    className={cn(
                      currentTrack.userReaction === '+' && 'text-tw-success'
                    )}
                  >
                    <ThumbsUp className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleReaction('-')}
                    disabled={isReacting}
                    className={cn(
                      currentTrack.userReaction === '-' && 'text-destructive'
                    )}
                  >
                    <ThumbsDown className="w-5 h-5" />
                  </Button>
                </div>
              )}
              
              <BoostDialog>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-tw-orange/50 text-tw-orange hover:bg-tw-orange/10"
                >
                  <Zap className="w-4 h-4 mr-1.5" />
                  Boost
                </Button>
              </BoostDialog>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
