import { useLocalStorage } from './useLocalStorage';

/**
 * Hook to manage hidden list items (client-side only)
 * This allows users to hide items they don't want to see without deleting them from relays
 */
export function useHiddenItems() {
  const [hiddenIds, setHiddenIds] = useLocalStorage<string[]>('trustwave:hidden-items', []);
  
  const hideItem = (eventId: string) => {
    if (!hiddenIds.includes(eventId)) {
      setHiddenIds([...hiddenIds, eventId]);
    }
  };
  
  const unhideItem = (eventId: string) => {
    setHiddenIds(hiddenIds.filter(id => id !== eventId));
  };
  
  const isHidden = (eventId: string) => {
    return hiddenIds.includes(eventId);
  };
  
  const clearHidden = () => {
    setHiddenIds([]);
  };
  
  return {
    hiddenIds,
    hideItem,
    unhideItem,
    isHidden,
    clearHidden,
  };
}
