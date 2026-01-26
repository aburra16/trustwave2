import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import type { NostrEvent } from '@nostrify/nostrify';
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
 * Intelligently handles replacing existing reactions from the same user
 */
export function usePublishReaction() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    // Optimistically update the UI before the mutation
    onMutate: async (params: PublishReactionParams & { currentReaction?: '+' | '-' | null }) => {
      const { targetEventId, reaction, currentReaction } = params;
      
      // If clicking same reaction, do nothing
      if (currentReaction === reaction) {
        return { rollback: false };
      }
      
      console.log('Optimistic update: applying vote immediately');
      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['nostr', 'songsList'] });
      await queryClient.cancelQueries({ queryKey: ['nostr', 'musiciansList'] });
      
      // Get current data
      const previousSongs = queryClient.getQueryData(['nostr', 'songsList']);
      const previousMusicians = queryClient.getQueryData(['nostr', 'musiciansList']);
      
      // Update songs list optimistically
      queryClient.setQueryData(['nostr', 'songsList'], (old: any) => {
        if (!old) return old;
        return old.map((item: any) => {
          if (item.id !== targetEventId) return item;
          
          // Calculate new votes
          let upvotes = item.upvotes;
          let downvotes = item.downvotes;
          
          // Remove old vote if changing
          if (currentReaction === '+') upvotes--;
          if (currentReaction === '-') downvotes--;
          
          // Add new vote
          if (reaction === '+') upvotes++;
          if (reaction === '-') downvotes++;
          
          return {
            ...item,
            upvotes,
            downvotes,
            score: upvotes - downvotes,
            userReaction: reaction,
          };
        });
      });
      
      // Update musicians list optimistically
      queryClient.setQueryData(['nostr', 'musiciansList'], (old: any) => {
        if (!old) return old;
        return old.map((item: any) => {
          if (item.id !== targetEventId) return item;
          
          let upvotes = item.upvotes;
          let downvotes = item.downvotes;
          
          if (currentReaction === '+') upvotes--;
          if (currentReaction === '-') downvotes--;
          
          if (reaction === '+') upvotes++;
          if (reaction === '-') downvotes++;
          
          return {
            ...item,
            upvotes,
            downvotes,
            score: upvotes - downvotes,
            userReaction: reaction,
          };
        });
      });
      
      // Return context for rollback
      return { previousSongs, previousMusicians, rollback: true };
    },
    
    mutationFn: async (params: PublishReactionParams & { currentReaction?: '+' | '-' | null }): Promise<NostrEvent | null> => {
      if (!user) {
        throw new Error('You must be logged in to react');
      }
      
      const { targetEventId, targetPubkey, targetKind, reaction, currentReaction } = params;
      
      // If user clicks the same reaction they already made, remove it (don't publish)
      if (currentReaction === reaction) {
        console.log('User clicked same reaction - ignoring (already voted this way)');
        return null;
      }
      
      console.log('Publishing reaction:', { reaction, targetEventId, targetPubkey, targetKind, currentReaction });
      
      // Create the reaction event
      // Note: Some relays enforce strict tag sizes, so we use minimal format
      const event = await user.signer.signEvent({
        kind: KINDS.REACTION,
        content: reaction,
        tags: [
          ['e', targetEventId],
          ['p', targetPubkey],
          ['k', String(targetKind)],
        ],
        created_at: Math.floor(Date.now() / 1000),
      });
      
      console.log('Signed reaction event:', JSON.stringify(event, null, 2));
      
      // Publish to the DCOSL relay specifically
      const relay = nostr.relay(DCOSL_RELAY);
      
      try {
        await relay.event(event, { signal: AbortSignal.timeout(5000) });
        console.log('Reaction published successfully to relay!');
      } catch (error) {
        console.error('Failed to publish reaction to relay:', error);
        console.error('Event that failed:', JSON.stringify(event, null, 2));
        throw error;
      }
      
      return event;
    },
    onSuccess: (data, variables, context) => {
      // Only show toast if we actually published something
      if (data !== null) {
        toast({
          title: variables.reaction === '+' ? 'Upvoted' : 'Downvoted',
          description: 'Your vote has been recorded',
        });
      }
      
      // Invalidate to ensure fresh data on next load
      queryClient.invalidateQueries({ queryKey: ['nostr', 'songsListItems'] });
      queryClient.invalidateQueries({ queryKey: ['nostr', 'musiciansListItems'] });
    },
    onError: (error, variables, context) => {
      console.error('Failed to publish reaction:', error);
      
      // Rollback optimistic update
      if (context?.rollback) {
        if (context.previousSongs) {
          queryClient.setQueryData(['nostr', 'songsList'], context.previousSongs);
        }
        if (context.previousMusicians) {
          queryClient.setQueryData(['nostr', 'musiciansList'], context.previousMusicians);
        }
      }
      
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
