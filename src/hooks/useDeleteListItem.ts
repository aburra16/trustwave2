import { useMutation, useQueryClient } from '@tanstack/react-query';
import { NRelay1, type NostrEvent } from '@nostrify/nostrify';
import { useCurrentUser } from './useCurrentUser';
import { useToast } from './useToast';
import { useHiddenItems } from './useHiddenItems';
import { DCOSL_RELAY } from '@/lib/constants';

interface DeleteResult {
  success: boolean;
  method: 'deleted' | 'hidden';
  event?: NostrEvent;
}

/**
 * Hook to delete a list item (song or musician) by publishing a kind 5 delete event
 * Falls back to client-side hiding if relay deletion fails
 */
export function useDeleteListItem() {
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { hideItem } = useHiddenItems();
  
  return useMutation({
    mutationFn: async (eventId: string): Promise<DeleteResult> => {
      if (!user) {
        throw new Error('You must be logged in to delete items');
      }
      
      console.log('Attempting to delete event:', eventId);
      
      // Try to publish kind 5 delete event first
      try {
        const deleteEvent = await user.signer.signEvent({
          kind: 5,
          content: 'Removing outdated entry',
          tags: [
            ['e', eventId],
          ],
          created_at: Math.floor(Date.now() / 1000),
        });
        
        console.log('Publishing delete event:', deleteEvent);
        
        const relay = new NRelay1(DCOSL_RELAY);
        
        try {
          await relay.event(deleteEvent);
          console.log('✅ Delete event published successfully to relay!');
          return {
            success: true,
            method: 'deleted',
            event: deleteEvent,
          };
        } finally {
          await relay.close();
        }
      } catch (error) {
        console.warn('❌ Relay deletion failed, falling back to client-side hide:', error);
        
        // Fallback: hide client-side
        hideItem(eventId);
        
        return {
          success: true,
          method: 'hidden',
        };
      }
    },
    onSuccess: (result) => {
      if (result.method === 'deleted') {
        toast({
          title: 'Deleted from Relay',
          description: 'Item permanently removed from the network',
        });
      } else {
        toast({
          title: 'Hidden Locally',
          description: 'Item hidden in your browser (relay deletion not supported)',
        });
      }
      
      // Refresh all lists
      queryClient.invalidateQueries({ queryKey: ['nostr', 'songsList'] });
      queryClient.invalidateQueries({ queryKey: ['nostr', 'musiciansList'] });
      queryClient.refetchQueries({ queryKey: ['nostr', 'songsList'] });
      queryClient.refetchQueries({ queryKey: ['nostr', 'musiciansList'] });
    },
    onError: (error) => {
      console.error('Failed to delete/hide item:', error);
      toast({
        title: 'Failed to Remove',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
