import { Sparkles, Check } from 'lucide-react';
import { Button } from './ui/button';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useHasPersonalization } from '@/hooks/useHasPersonalization';
import { cn } from '@/lib/utils';

const SERVICE_PROVIDER_URL = 'https://brainstorm.nosfabrica.com';

export function PersonalizeButton() {
  const { user } = useCurrentUser();
  const { hasPersonalization, isLoading } = useHasPersonalization();
  
  // Don't show if not logged in
  if (!user) return null;
  
  // Loading state
  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled className="gap-2">
        <Sparkles className="w-4 h-4" />
        <span className="hidden sm:inline">Personalize</span>
      </Button>
    );
  }
  
  // User has personalization
  if (hasPersonalization) {
    return (
      <Button
        variant="outline"
        size="sm"
        className={cn(
          'gap-2 cursor-default',
          'border-tw-success/50 bg-tw-success/5 text-tw-success',
          'hover:bg-tw-success/5'
        )}
      >
        <Check className="w-4 h-4" />
        <span className="hidden sm:inline">Personalized</span>
      </Button>
    );
  }
  
  // User needs personalization
  return (
    <Button
      variant="default"
      size="sm"
      className={cn(
        'gap-2',
        'bg-gradient-to-r from-tw-purple to-tw-cyan',
        'hover:opacity-90 transition-opacity'
      )}
      asChild
    >
      <a href={SERVICE_PROVIDER_URL} target="_blank" rel="noopener noreferrer">
        <Sparkles className="w-4 h-4" />
        <span className="hidden sm:inline">Personalize</span>
      </a>
    </Button>
  );
}
