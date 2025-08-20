import { useState, useEffect } from 'react';
import type { StepReceiver } from 'packages/services-plus-core';
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils';
import { getWorkflowEngine, mockDataHelpers } from '../../../services/workflowEngineProvider';
import { useDesksForUser } from '../../../hooks/useDesksForUser';

// Helper function to get display names for desks
const getDeskDisplayName = (desk: StepReceiver): string => {
  const displayNames: Record<StepReceiver, string> = {
    HR: 'Human Resources',
    IT: 'IT Support',
    Facilities: 'Facilities Management',
    Finance: 'Finance',
    Procurement: 'Procurement',
    Legal: 'Legal',
    Security: 'Security',
    AccessIdentity: 'Access & Identity',
    Workplace: 'Workplace',
    Fleet: 'Fleet Management',
    Data: 'Data & Analytics',
    'L&D': 'Learning & Development',
    Admin: 'Administration',
  };
  return displayNames[desk] || desk;
};

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
 * Now integrates with GraphQL-based MAP Orgchart data for real capability checking
 * Falls back to mock data for development when GraphQL data is not available
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

        // Wait for GraphQL data to load
        if (desksLoading) {
          console.log('useUserCapabilities: Still loading GraphQL desk capabilities');
          return;
        }

        // If we have GraphQL desk data, use it
        if (availableDesks.length > 0) {
          console.log('useUserCapabilities: Using GraphQL-based desk capabilities');
          
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

        // Fallback to mock data for development when no GraphQL data
        console.log('useUserCapabilities: No GraphQL capabilities, falling back to mock data');
        
        const structureId = getCurrentActiveStructureId();
        const employeeId = userInfo?.employeeDetails?.employeeId || 'default-user';

        console.log('useUserCapabilities: Using mock data with', { 
          structureId, 
          employeeId 
        });

        // Get WorkflowEngine instance and seed with sample data if needed
        const workflowEngine = getWorkflowEngine(employeeId);
        
        // Seed sample data for development (only if no requests exist)
        try {
          const existingRequests = await workflowEngine.getMyRequests();
          console.log('useUserCapabilities: Existing requests count:', existingRequests.length);
          
          if (existingRequests.length === 0) {
            console.log('useUserCapabilities: Seeding sample data');
            await mockDataHelpers.seedSampleData(workflowEngine);
            console.log('useUserCapabilities: Sample data seeded');
          }
        } catch (seedError) {
          console.warn('useUserCapabilities: Error seeding data:', seedError);
          // Continue without seeding
        }

        // Use mock data to determine capabilities based on ticket availability
        const deskTypes: StepReceiver[] = ['HR', 'IT', 'Facilities', 'Finance'];
        const userCapabilities: UserCapability[] = [];

        console.log('useUserCapabilities: Checking mock desk types:', deskTypes);

        for (const desk of deskTypes) {
          try {
            const tickets = await workflowEngine.getDeskTickets(desk);
            console.log(`useUserCapabilities: ${desk} desk has ${tickets.length} tickets`);
            
            // Grant access to desks with tickets or HR as default
            if (tickets.length > 0 || desk === 'HR') {
              userCapabilities.push({
                desk,
                name: getDeskDisplayName(desk),
                ticketCount: tickets.length,
              });
            }
          } catch (deskError) {
            console.warn(`useUserCapabilities: Error getting ${desk} tickets:`, deskError);
          }
        }

        // Ensure user has at least HR access for demo purposes
        if (userCapabilities.length === 0) {
          console.log('useUserCapabilities: No capabilities found, adding default HR access');
          userCapabilities.push({
            desk: 'HR',
            name: 'Human Resources',
            ticketCount: 0,
          });
        }

        console.log('useUserCapabilities: Final mock capabilities:', userCapabilities);
        setCapabilities(userCapabilities);
      } catch (err) {
        console.error('useUserCapabilities: Error processing capabilities:', err);
        setError(err instanceof Error ? err.message : 'Failed to process capabilities');
        
        // Provide emergency fallback
        setCapabilities([{
          desk: 'HR',
          name: 'Human Resources',
          ticketCount: 0,
        }]);
      } finally {
        setIsLoading(false);
        console.log('useUserCapabilities: Finished processing');
      }
    };

    processCapabilities();
  }, [availableDesks, desksLoading, desksError, accessToken, userInfo]);

  // Combine errors from both GraphQL and processing
  const combinedError = error || desksError;

  return {
    capabilities,
    isLoading,
    error: combinedError,
  };
};
