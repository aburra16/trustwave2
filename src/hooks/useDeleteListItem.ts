import { useMutation, useQueryClient } from '@tanstack/react-query';
import { NRelay1, type NostrEvent } from '@nostrify/nostrify';
import { useCurrentUser } from './useCurrentUser';
import { useToast } from './useToast';
import { DCOSL_RELAY, KINDS } from '@/lib/constants';

/**
 * Hook to delete a list item (song or musician) by publishing a kind 5 delete event
 */
export function useDeleteListItem() {
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (eventId: string): Promise<NostrEvent> => {
      if (!user) {
        throw new Error('You must be logged in to delete items');
      }
      
      console.log('Deleting event:', eventId);
      
      // Create a kind 5 delete event
      const deleteEvent = await user.signer.signEvent({
        kind: 5,
        content: 'Deleting outdated entry',
        tags: [
          ['e', eventId],
        ],
        created_at: Math.floor(Date.now() / 1000),
      });
      
      console.log('Publishing delete event:', deleteEvent);
      
      // Publish to the DCOSL relay
      const relay = new NRelay1(DCOSL_RELAY);
      
      try {
        await relay.event(deleteEvent);
        console.log('Delete event published successfully!');
      } catch (error) {
        console.error('Failed to publish delete event:', error);
        throw error;
      } finally {
        await relay.close();
      }
      
      return deleteEvent;
    },
    onSuccess: () => {
      toast({
        title: 'Deleted',
        description: 'Item removed from the list',
      });
      
      // Refresh all lists
      queryClient.invalidateQueries({ queryKey: ['nostr', 'songsList'] });
      queryClient.invalidateQueries({ queryKey: ['nostr', 'musiciansList'] });
      queryClient.refetchQueries({ queryKey: ['nostr', 'songsList'] });
      queryClient.refetchQueries({ queryKey: ['nostr', 'musiciansList'] });
    },
    onError: (error) => {
      console.error('Failed to delete item:', error);
      toast({
        title: 'Failed to Delete',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
