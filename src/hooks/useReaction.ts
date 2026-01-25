import { useMutation, useQueryClient } from '@tanstack/react-query';
import { NRelay1, type NostrEvent } from '@nostrify/nostrify';
import { useCurrentUser } from './useCurrentUser';
import { useToast } from './useToast';
import { DCOSL_RELAY, KINDS } from '@/lib/constants';

interface PublishReactionParams {
  targetEventId: string;
  targetPubkey: string;
  targetKind: number;
  reaction: '+' | '-';
}

/**
 * Hook to publish a reaction (thumbs up/down) to a list item
 */
export function usePublishReaction() {
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (params: PublishReactionParams): Promise<NostrEvent> => {
      if (!user) {
        throw new Error('You must be logged in to react');
      }
      
      const { targetEventId, targetPubkey, targetKind, reaction } = params;
      
      console.log('Publishing reaction:', { reaction, targetEventId, targetPubkey, targetKind });
      
      // Create the reaction event
      const event = await user.signer.signEvent({
        kind: KINDS.REACTION,
        content: reaction,
        tags: [
          ['e', targetEventId, DCOSL_RELAY],
          ['p', targetPubkey],
          ['k', String(targetKind)],
        ],
        created_at: Math.floor(Date.now() / 1000),
      });
      
      console.log('Signed reaction event:', event);
      
      // Publish to the DCOSL relay
      const relay = new NRelay1(DCOSL_RELAY);
      
      try {
        await relay.event(event);
        console.log('Reaction published successfully!');
      } catch (error) {
        console.error('Failed to publish reaction to relay:', error);
        throw error;
      } finally {
        await relay.close();
      }
      
      return event;
    },
    onSuccess: (data, variables) => {
      // Show success toast
      toast({
        title: variables.reaction === '+' ? 'Upvoted' : 'Downvoted',
        description: 'Your vote has been recorded',
      });
      
      // Invalidate the lists to refresh scores
      queryClient.invalidateQueries({ queryKey: ['nostr', 'songsList'] });
      queryClient.invalidateQueries({ queryKey: ['nostr', 'musiciansList'] });
      queryClient.invalidateQueries({ queryKey: ['nostr', 'genreListItems'] });
    },
    onError: (error) => {
      console.error('Failed to publish reaction:', error);
      toast({
        title: 'Failed to Vote',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to remove a reaction (by publishing a delete event or opposite reaction)
 * Note: In Nostr, reactions are typically not deleted - you would publish a new opposite reaction
 */
export function useToggleReaction() {
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: PublishReactionParams & { currentReaction?: '+' | '-' | null }): Promise<NostrEvent | null> => {
      if (!user) {
        throw new Error('You must be logged in to react');
      }
      
      const { targetEventId, targetPubkey, targetKind, reaction, currentReaction } = params;
      
      // If clicking the same reaction, we could publish a delete event
      // But for simplicity, we just won't do anything or publish opposite
      if (currentReaction === reaction) {
        // User is "un-reacting" - we'll skip for now
        // In a real app, you might publish a kind 5 delete event
        return null;
      }
      
      // Create the new reaction event
      const event = await user.signer.signEvent({
        kind: KINDS.REACTION,
        content: reaction,
        tags: [
          ['e', targetEventId, DCOSL_RELAY],
          ['p', targetPubkey],
          ['k', String(targetKind)],
        ],
        created_at: Math.floor(Date.now() / 1000),
      });
      
      // Publish to the DCOSL relay
      const relay = new NRelay1(DCOSL_RELAY);
      
      try {
        await relay.event(event);
      } finally {
        await relay.close();
      }
      
      return event;
    },
    onSuccess: () => {
      // Invalidate the lists to refresh scores
      queryClient.invalidateQueries({ queryKey: ['nostr', 'songsList'] });
      queryClient.invalidateQueries({ queryKey: ['nostr', 'musiciansList'] });
      queryClient.invalidateQueries({ queryKey: ['nostr', 'genreListItems'] });
    },
    onError: (error) => {
      console.error('Failed to toggle reaction:', error);
    },
  });
}
