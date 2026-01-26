import { useTrustProviders } from './useTrustedAssertions';

/**
 * Hook to check if the current user has personalized Web-of-Trust
 * (i.e., they have a kind 10040 event with trust providers)
 */
export function useHasPersonalization() {
  const { data: providers, isLoading } = useTrustProviders();
  
  // User has personalization if they have at least one valid trust provider
  const hasPersonalization = providers && providers.length > 0;
  
  return {
    hasPersonalization,
    isLoading,
  };
}
