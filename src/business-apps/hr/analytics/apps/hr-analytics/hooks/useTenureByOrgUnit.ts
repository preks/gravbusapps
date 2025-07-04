import { useState, useEffect, useCallback, useRef } from 'react';
import dayjs from 'dayjs';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';
import { getTenureByOrgUnitQuery } from '../queries/getTenureByOrgUnit';

/**
 * Interface for tenure ranges used in the heatmap
 */
export interface TenureRange {
  id: string;
  label: string;
  minMonths: number;
  maxMonths: number;
}

/**
 * Interface for organizational unit information
 */
export interface OrganizationalUnit {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
}

/**
 * Interface for tenure distribution data point
 */
export interface TenureDistributionItem {
  orgUnitId: string;
  orgUnitName: string;
  tenureRangeId: string;
  count: number;
}

/**
 * Interface for GraphQL response structure
 */
interface TenureByOrgUnitResponse {
  Employee: Array<{
    id: string;
    firstName: string | null;
    lastName: string | null;
    workingCondition?: Array<{
      hireDate?: string;
    }>;
  }>;
  EmployeeOrganizationalUnit: Array<{
    id: string;
    employeeId: string;
    organizationalUnitId: string;
    organizationalUnit?: {
      id: string;
      name: string;
    };
  }>;
  OrganizationalUnit: Array<{
    id: string;
    name: string;
  }>;
}

/**
 * Predefined tenure ranges for categorization
 */
export const tenureRanges: TenureRange[] = [
  { id: 'less-than-6m', label: '< 6 months', minMonths: 0, maxMonths: 6 },
  { id: '6m-1y', label: '6-12 months', minMonths: 6, maxMonths: 12 },
  { id: '1y-2y', label: '1-2 years', minMonths: 12, maxMonths: 24 },
  { id: '2y-5y', label: '2-5 years', minMonths: 24, maxMonths: 60 },
  { id: 'more-than-5y', label: '5+ years', minMonths: 60, maxMonths: Number.MAX_SAFE_INTEGER }
];

/**
 * Hook to fetch and process employee tenure data by organizational unit
 * 
 * @param accessToken - Access token for API authentication
 * @param structureId - ID of the organizational structure to analyze
 * @returns Object containing tenure distribution data, organizational units, tenure ranges, and loading/error states
 */
export const useTenureByOrgUnit = (accessToken: string, structureId?: string) => {
  const [tenureDistribution, setTenureDistribution] = useState<TenureDistributionItem[]>([]);
  const [orgUnits, setOrgUnits] = useState<OrganizationalUnit[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const isMounted = useRef<boolean>(true);

  // Get GraphQL client
  const graphQLClient = useGraphqlClient(accessToken);

  /**
   * Get tenure range ID for a given tenure in months
   */
  const getTenureRangeId = (tenureMonths: number): string => {
    const range = tenureRanges.find(
      r => tenureMonths >= r.minMonths && tenureMonths < r.maxMonths
    );
    return range?.id || tenureRanges[0].id;
  };

  /**
   * Fetch and process tenure distribution data
   */
  const fetchTenureDistribution = useCallback(async () => {
    if (!accessToken) {
      if (isMounted.current) {
        setError(new Error('[useTenureByOrgUnit] No access token provided'));
        setLoading(false);
      }
      return;
    }

    try {
      if (isMounted.current) {
        setLoading(true);
        setError(null);
      }

      console.log('[useTenureByOrgUnit] Fetching employee tenure data by organizational unit');

      if (!structureId) {
        throw new Error('[useTenureByOrgUnit] No structure ID provided');
      }

      // Fetch employee data with tenure and organizational unit information
      const response = await graphQLClient.request<TenureByOrgUnitResponse>(
        getTenureByOrgUnitQuery,
        { structureId }
      );

      if (!response || !response.Employee || !response.EmployeeOrganizationalUnit || !response.OrganizationalUnit) {
        throw new Error('[useTenureByOrgUnit] Invalid response structure from GraphQL API');
      }

      // Parse the GraphQL response
      const { 
        Employee: employees = [], 
        EmployeeOrganizationalUnit: assignments = [],
        OrganizationalUnit: units = [] 
      } = response;

      // Create a map to quickly look up employees by ID
      const employeesMap = new Map<string, typeof response.Employee[0]>();
      employees.forEach(employee => {
        employeesMap.set(employee.id, employee);
      });

      // Create a map to quickly look up organizational units by ID
      const orgUnitsMap = new Map<string, OrganizationalUnit>();
      units.forEach(unit => {
        orgUnitsMap.set(unit.id, {
          id: unit.id,
          name: unit.name
        });
      });

      // Process employee data and calculate tenure distribution
      const tenureData: Record<string, Record<string, number>> = {};
      const employeesByOrgUnit: Record<string, number> = {};
      const foundOrgUnits: Set<string> = new Set<string>();

      // Process each organizational unit assignment
      assignments.forEach(assignment => {
        // Skip assignments with no org unit
        if (!assignment.organizationalUnit) {
          return;
        }

        const orgUnitId = assignment.organizationalUnit.id;
        const orgUnitName = assignment.organizationalUnit.name;
        const employeeId = assignment.employeeId;

        // Get the employee data
        const employee = employeesMap.get(employeeId);
        if (!employee) {
          return;
        }

        // Get employee tenure
        let hireDate = null;
        if (employee.workingCondition && employee.workingCondition.length > 0) {
          // Find the first working condition with a hire date
          for (const condition of employee.workingCondition) {
            if (condition.hireDate) {
              hireDate = condition.hireDate;
              break;
            }
          }
        }

        // Skip employees with no hire date
        if (!hireDate) {
          return;
        }

        // Add this organizational unit to our set of found units
        foundOrgUnits.add(orgUnitId);

        // Calculate tenure range for this employee
        const tenureInMonths = dayjs().diff(dayjs(hireDate), 'month');
        const tenureRange = getTenureRangeId(tenureInMonths);

        // Initialize objects if they don't exist
        if (!tenureData[orgUnitId]) {
          tenureData[orgUnitId] = {};
          employeesByOrgUnit[orgUnitId] = 0;
        }

        // Initialize tenure range count if it doesn't exist
        if (!tenureData[orgUnitId][tenureRange]) {
          tenureData[orgUnitId][tenureRange] = 0;
        }

        // Increment the count for this tenure range and org unit
        tenureData[orgUnitId][tenureRange]++;
        employeesByOrgUnit[orgUnitId]++;

        // Add the organizational unit to our map if it's not there
        if (!orgUnitsMap.has(orgUnitId)) {
          orgUnitsMap.set(orgUnitId, {
            id: orgUnitId,
            name: orgUnitName
          });
        }
      });

      // Convert tenure data to distribution items
      const distributionData: TenureDistributionItem[] = [];
      orgUnitsMap.forEach(orgUnit => {
        tenureRanges.forEach(range => {
          const count = tenureData[orgUnit.id]?.[range.id] || 0;

          distributionData.push({
            orgUnitId: orgUnit.id,
            orgUnitName: orgUnit.name,
            tenureRangeId: range.id,
            count
          });
        });
      });

      console.log(`[useTenureByOrgUnit] Processed ${distributionData.length} data points across ${Array.from(orgUnitsMap.values()).length} organizational units`);

      // Limit to top 20 organizational units with the most employees to improve chart rendering
      const orgUnitCounts: Record<string, number> = {};
      Object.keys(employeesByOrgUnit).forEach(orgUnitId => {
        orgUnitCounts[orgUnitId] = employeesByOrgUnit[orgUnitId];
      });
      
      const topOrgUnitIds = Object.entries(orgUnitCounts)
        .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
        .slice(0, 20)
        .map(entry => entry[0]);
      
      // Filter distribution data to only include top org units
      const filteredDistributionData = distributionData.filter(item => 
        topOrgUnitIds.includes(item.orgUnitId)
      );
      
      const filteredOrgUnits = Array.from(orgUnitsMap.values())
        .filter(unit => topOrgUnitIds.includes(unit.id));
        
      // Log the filtering results
      console.log(`[useTenureByOrgUnit] Limited from ${distributionData.length} data points to ${filteredDistributionData.length} (top 20 org units)`);
      
      // Set derived data
      setTenureDistribution(filteredDistributionData);
      setOrgUnits(filteredOrgUnits);
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error('[useTenureByOrgUnit] Error fetching tenure distribution:', err);
      
      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      }
    }
  }, [accessToken, graphQLClient]);

  useEffect(() => {
    isMounted.current = true;
    fetchTenureDistribution();
    
    return () => {
      isMounted.current = false;
    };
  }, [fetchTenureDistribution]);

  return {
    tenureDistribution,
    orgUnits,
    tenureRanges,
    loading,
    error,
    refetch: fetchTenureDistribution
  };
};
