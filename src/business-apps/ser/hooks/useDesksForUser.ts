import { useEffect, useMemo, useState } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import type { StepReceiver } from 'packages/services-plus-core';
import { useUserCapabilitiesGraphQL } from './useUserCapabilitiesGraphQL';
import { getWorkflowEngine } from '../services/workflowEngineProvider';

/**
 * Interface for desk capability mapping
 */
export interface DeskCapability {
  desk: StepReceiver;
  name: string;
  ticketCount: number;
  requiredCapabilities: string[];
  organizationalUnits?: string[];
}

/**
 * Hook return type
 */
export interface UseDesksForUserReturn {
  availableDesks: DeskCapability[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  hasAccessToDesk: (desk: StepReceiver) => boolean;
  getUserCapabilities: () => string[];
}

/**
 * Mapping of service desk types to required capabilities and organizational units
 * This mapping determines which capabilities grant access to which desks
 */
const DESK_CAPABILITY_MAPPING: Record<StepReceiver, {
  name: string;
  requiredCapabilities: string[];
  organizationalUnits?: string[];
}> = {
  'IT': {
    name: 'Information Technology',
    requiredCapabilities: [
      'IT_Manager',
      'IT_Support',
      'IT_Administrator',
      'System_Administrator',
      'Network_Administrator',
    ],
    organizationalUnits: ['IT', 'Information Technology', 'Technology'],
  },
  'HR': {
    name: 'Human Resources',
    requiredCapabilities: [
      'HR_Manager',
      'HR_Specialist',
      'HR_Business_Partner',
      'People_Operations',
      'Talent_Acquisition',
    ],
    organizationalUnits: ['HR', 'Human Resources', 'People Operations'],
  },
  'Finance': {
    name: 'Finance',
    requiredCapabilities: [
      'Finance_Manager',
      'Finance_Analyst',
      'Accounting_Manager',
      'Controller',
      'CFO',
    ],
    organizationalUnits: ['Finance', 'Accounting', 'Financial Operations'],
  },
  'Facilities': {
    name: 'Facilities',
    requiredCapabilities: [
      'Facilities_Manager',
      'Facility_Coordinator',
      'Building_Manager',
      'Maintenance_Manager',
    ],
    organizationalUnits: ['Facilities', 'Building Management', 'Maintenance'],
  },
  'Security': {
    name: 'Security',
    requiredCapabilities: [
      'Security_Manager',
      'Security_Officer',
      'Security_Analyst',
      'Physical_Security',
    ],
    organizationalUnits: ['Security', 'Physical Security', 'Risk Management'],
  },
};

/**
 * Helper function to normalize capability names for matching
 */
const normalizeCapabilityName = (name: string): string => {
  return name.toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '');
};

/**
 * Helper function to check if a capability matches any required capabilities
 */
const hasRequiredCapability = (
  userCapabilities: string[],
  requiredCapabilities: string[]
): boolean => {
  const normalizedUserCaps = userCapabilities.map(normalizeCapabilityName);
  const normalizedRequiredCaps = requiredCapabilities.map(normalizeCapabilityName);
  
  return normalizedRequiredCaps.some(required => 
    normalizedUserCaps.some(user => 
      user.includes(required) || required.includes(user)
    )
  );
};

/**
 * Helper function to check if user belongs to relevant organizational unit
 */
const hasRelevantOrgUnit = (
  userOrgUnits: string[],
  deskOrgUnits?: string[]
): boolean => {
  if (!deskOrgUnits || deskOrgUnits.length === 0) return false;
  
  const normalizedUserOrgs = userOrgUnits.map(org => 
    org.toLowerCase().replace(/[^a-z0-9]/g, '')
  );
  const normalizedDeskOrgs = deskOrgUnits.map(org => 
    org.toLowerCase().replace(/[^a-z0-9]/g, '')
  );
  
  return normalizedDeskOrgs.some(deskOrg => 
    normalizedUserOrgs.some(userOrg => 
      userOrg.includes(deskOrg) || deskOrg.includes(userOrg)
    )
  );
};

/**
 * Helper function to get ticket count for a desk
 */
const getTicketCountForDesk = async (desk: StepReceiver): Promise<number> => {
  try {
    const workflowEngine = getWorkflowEngine();
    const tickets = await workflowEngine.getDeskTickets(desk);
    return tickets.length;
  } catch (error) {
    console.warn(`Failed to get ticket count for desk ${desk}:`, error);
    return 0;
  }
};

/**
 * Hook to determine which service desks a user has access to based on MAP Orgchart capabilities
 */
export const useDesksForUser = ({
  accessToken,
  userInfo,
}: Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'>): UseDesksForUserReturn => {
  const {
    capabilities,
    organizationalUnits,
    isLoading: capabilitiesLoading,
    error: capabilitiesError,
    refetch,
  } = useUserCapabilitiesGraphQL({ accessToken, userInfo });

  const [availableDesks, setAvailableDesks] = useState<DeskCapability[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [deskError, setDeskError] = useState<string | null>(null);

  // Process capabilities and determine available desks
  useEffect(() => {
    const processDesks = async () => {
      if (capabilitiesLoading) {
        console.log('useDesksForUser: Still loading GraphQL capabilities');
        return;
      }

      // Don't require capabilities to exist - proceed with empty capabilities for fallback
      console.log('useDesksForUser: Processing capabilities', { 
        capabilitiesLoading, 
        capabilitiesCount: capabilities.length,
        hasCapabilitiesError: !!capabilitiesError,
      });

      setIsProcessing(true);
      setDeskError(null);

      try {
        const userCapabilityNames = capabilities.map(cap => cap.name);
        const userOrgUnitNames = organizationalUnits.map(org => org.name);

        console.log('useDesksForUser: Processing capabilities', {
          userCapabilityNames,
          userOrgUnitNames,
          deskMappings: Object.keys(DESK_CAPABILITY_MAPPING),
        });

        const desks: DeskCapability[] = [];

        // Check each desk type for access
        for (const [deskType, deskConfig] of Object.entries(DESK_CAPABILITY_MAPPING)) {
          const desk = deskType as StepReceiver;
          
          // Check if user has required capabilities
          const hasCapability = userCapabilityNames.length > 0 && hasRequiredCapability(
            userCapabilityNames,
            deskConfig.requiredCapabilities
          );

          // Check if user belongs to relevant organizational unit
          const hasOrgUnit = userOrgUnitNames.length > 0 && hasRelevantOrgUnit(
            userOrgUnitNames,
            deskConfig.organizationalUnits
          );

          console.log(`useDesksForUser: Checking desk ${desk}`, {
            hasCapability,
            hasOrgUnit,
            requiredCapabilities: deskConfig.requiredCapabilities,
            userCapabilities: userCapabilityNames,
            deskOrgUnits: deskConfig.organizationalUnits,
            userOrgUnits: userOrgUnitNames,
          });

          // Grant access if user has either required capability OR belongs to relevant org unit
          // OR if we have no GraphQL data (fallback mode - grant access to common desks)
          const shouldGrantAccess = hasCapability || hasOrgUnit || 
            (userCapabilityNames.length === 0 && userOrgUnitNames.length === 0 && ['HR', 'IT'].includes(desk));

          if (shouldGrantAccess) {
            const ticketCount = await getTicketCountForDesk(desk);
            
            desks.push({
              desk,
              name: getTranslationFromI18nKeyAndLabel(
                `services.desk.${desk.toLowerCase()}.name`,
                deskConfig.name
              ),
              ticketCount,
              requiredCapabilities: deskConfig.requiredCapabilities,
              organizationalUnits: deskConfig.organizationalUnits,
            });

            console.log(`useDesksForUser: Access granted to desk ${desk}`, {
              reason: hasCapability ? 'capability' : hasOrgUnit ? 'organizationalUnit' : 'fallback',
              ticketCount,
            });
          }
        }

        // If still no desks found, provide default access to HR
        // This ensures users always have access to at least one desk
        if (desks.length === 0) {
          console.log('useDesksForUser: No desk access found, providing emergency HR access');
          const ticketCount = await getTicketCountForDesk('HR');
          
          desks.push({
            desk: 'HR',
            name: getTranslationFromI18nKeyAndLabel(
              'services.desk.hr.name',
              'Human Resources'
            ),
            ticketCount,
            requiredCapabilities: DESK_CAPABILITY_MAPPING.HR.requiredCapabilities,
            organizationalUnits: DESK_CAPABILITY_MAPPING.HR.organizationalUnits,
          });
        }

        console.log('useDesksForUser: Final available desks', desks);
        setAvailableDesks(desks);
      } catch (err) {
        console.error('useDesksForUser: Error processing desks', err);
        setDeskError(err instanceof Error ? err.message : 'Failed to process desk access');
      } finally {
        setIsProcessing(false);
      }
    };

    processDesks();
  }, [capabilities, organizationalUnits, capabilitiesLoading]);

  // Helper function to check if user has access to a specific desk
  const hasAccessToDesk = (desk: StepReceiver): boolean => {
    return availableDesks.some(deskCap => deskCap.desk === desk);
  };

  // Helper function to get user capabilities as string array
  const getUserCapabilities = (): string[] => {
    return capabilities.map(cap => cap.name);
  };

  const isLoading = capabilitiesLoading || isProcessing;
  const error = capabilitiesError || deskError;

  return {
    availableDesks,
    isLoading,
    error,
    refetch,
    hasAccessToDesk,
    getUserCapabilities,
  };
};
