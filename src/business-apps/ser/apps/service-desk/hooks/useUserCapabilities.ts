import { useState, useEffect } from 'react';
import type { StepReceiver } from 'packages/services-plus-core';
import { useDesksForUser } from '../../../hooks/useDesksForUser';


export interface UserCapability {
  desk: StepReceiver;
  name: string;
  ticketCount: number;
}

export interface UseUserCapabilitiesProps {
  accessToken: string;
  userInfo?: any;
}

export interface UseUserCapabilitiesReturn {
  capabilities: UserCapability[] | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to get user capabilities and determine which desks they have access to
 * Integrates with GraphQL-based MAP Orgchart data for real capability checking
 */
export const useUserCapabilities = ({
  accessToken,
  userInfo,
}: UseUserCapabilitiesProps): UseUserCapabilitiesReturn => {
  const [capabilities, setCapabilities] = useState<UserCapability[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Use the new GraphQL-based desk access hook
  const {
    availableDesks,
    isLoading: desksLoading,
    error: desksError,
    getUserCapabilities,
  } = useDesksForUser({ accessToken, userInfo });

  useEffect(() => {
    const processCapabilities = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log('useUserCapabilities: Processing capabilities', { 
          desksLoading, 
          availableDesks: availableDesks.length,
          desksError,
          accessToken: !!accessToken, 
          userInfo: !!userInfo,
          employeeId: userInfo?.employeeDetails?.employeeId 
        });

        // Wait for GraphQL data to load - don't process anything until it's ready
        if (desksLoading) {
          console.log('useUserCapabilities: Still loading GraphQL desk capabilities');
          setIsLoading(true); // Keep loading state active
          return;
        }

        // If we have GraphQL desk data, use it
        if (availableDesks.length > 0) {
          console.log('useUserCapabilities: Using GraphQL-based desk capabilities', {
            deskCount: availableDesks.length,
            desks: availableDesks.map(d => d.desk)
          });
          
          const userCapabilities: UserCapability[] = availableDesks.map(deskCap => ({
            desk: deskCap.desk,
            name: deskCap.name,
            ticketCount: deskCap.ticketCount,
          }));

          console.log('useUserCapabilities: GraphQL capabilities processed', {
            userCapabilities,
            rawCapabilities: getUserCapabilities(),
          });

          setCapabilities(userCapabilities);
          return;
        }

        // No GraphQL desk data available - user has no desk access
        console.log('useUserCapabilities: No GraphQL capabilities available, user has no desk access', {
          desksLoading,
          availableDesksCount: availableDesks.length,
          hasDesksError: !!desksError
        });
        
        // Set empty capabilities - the UI will handle the "no access" state
        setCapabilities([]);
      } catch (err) {
        console.error('useUserCapabilities: Error processing capabilities:', err);
        setError(err instanceof Error ? err.message : 'Failed to process capabilities');
        
        // No emergency fallback - user truly has no access
        setCapabilities([]);
      } finally {
        setIsLoading(false);
        console.log('useUserCapabilities: Finished processing');
      }
    };

    processCapabilities();
  }, [availableDesks, desksLoading, desksError, accessToken, userInfo]);

  // Combine errors from both GraphQL and processing
  const combinedError = error || desksError;

  // If GraphQL is still loading, override the isLoading state
  const actualIsLoading = desksLoading || isLoading;

  return {
    capabilities,
    isLoading: actualIsLoading,
    error: combinedError,
  };
};
