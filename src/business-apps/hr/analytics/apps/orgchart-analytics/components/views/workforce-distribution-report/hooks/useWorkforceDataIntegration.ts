import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '../../../../../../../../../common/BusinessAppContext';
import { useGetWorkforceData } from '../queries/WorkforceQueries';
import {
  processWorkforceDistribution,
  calculateWorkforceStatistics,
  generateWorkforceTableData
} from '../utils/workforceUtils';
import type {
  WorkforceEmployee,
  WorkforceEmployeeWithOrganization,
  WorkforceDistribution,
  WorkforceStatistics,
  WorkforceTableData,
  UseWorkforceDistributionResponse
} from '../types/workforceTypes';

export const useWorkforceDataIntegration = (context: BusinessAppContextProps): UseWorkforceDistributionResponse => {
  const [employees, setEmployees] = useState<WorkforceEmployee[]>([]);
  const [distribution, setDistribution] = useState<WorkforceDistribution>({
    geographic: { byCountry: [], byRegion: [], bySiteLocation: [] },
    organizational: { byDepartment: [], byJobLevel: [], byCostCenter: [], byCompany: [] },
    demographic: { byGender: [], byAgeGroup: [], byTenure: [] },
    employment: { byEmploymentType: [], byStartYear: [] }
  });
  const [statistics, setStatistics] = useState<WorkforceStatistics>({
    totalEmployees: 0,
    countries: 0,
    regions: 0,
    siteLocations: 0,
    departments: 0,
    jobLevels: 0,
    companies: 0,
    costCenters: 0,
    averageAge: 0,
    averageTenure: 0,
    genderDiversityIndex: 0,
    geographicSpread: 0
  });
  const [tableData, setTableData] = useState<WorkforceTableData>({
    geographic: [],
    organizational: [],
    demographic: [],
    employment: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { fetchWorkforceData } = useGetWorkforceData(context);

  const loadData = useCallback(async () => {
    if (!context.accessToken) {
      console.log('No access token available, skipping data load');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch workforce data
      const response = await fetchWorkforceData();
      const employeeOrgUnits = response.EmployeePosition || [];
      
      // Transform data to match expected structure
      const employeeData = employeeOrgUnits.map(eou => ({
        ...eou.employee,
        organizationalUnit: {
          ...eou.organizationalUnit,
          company: eou.organizationalUnit.company || undefined
        },
        jobPosition: eou.jobPosition || undefined,
        // Include site location and cost center from position level
        siteLocation: eou.siteLocation || undefined,
        costCenter: eou.costCenter || undefined
      })) as WorkforceEmployeeWithOrganization[];

      // Process distribution data
      const distributionData = processWorkforceDistribution(employeeData);
      
      // Calculate statistics
      const statsData = calculateWorkforceStatistics(employeeData, distributionData);
      
      // Generate table data
      const tableDataResult = generateWorkforceTableData(employeeData, distributionData);

      // Update state
      setEmployees(employeeData);
      setDistribution(distributionData);
      setStatistics(statsData);
      setTableData(tableDataResult);
    } catch (err) {
      console.error('Error loading workforce data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [context.accessToken, fetchWorkforceData]);

  useEffect(() => {
    if (context.accessToken) {
      loadData();
    }
  }, [context.accessToken, loadData]);

  return {
    employees,
    distribution,
    statistics,
    tableData,
    isLoading,
    error,
    refetch: loadData
  };
}; 