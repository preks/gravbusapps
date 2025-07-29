import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '../../../../../../../../../common/BusinessAppContext';
import { useGetAbsenceData } from '../queries/AbsenceQueries';
import {
  transformAbsenceData,
  calculateAbsenceStatistics,
  generateChartData,
  generateTableData
} from '../utils/absenceUtils';
import type {
  AbsenceRecord,
  AbsenceBalance,
  AbsenceType,
  AbsenceGroup,
  AbsenceStatistics,
  AbsenceChartData,
  AbsenceTableData,
  UseAbsenceDataIntegrationResponse
} from '../types/absenceTypes';

export const useAbsenceDataIntegration = (context: BusinessAppContextProps): UseAbsenceDataIntegrationResponse => {
  const [absenceData, setAbsenceData] = useState<AbsenceRecord[]>([]);
  const [balanceData, setBalanceData] = useState<AbsenceBalance[]>([]);
  const [absenceTypes, setAbsenceTypes] = useState<AbsenceType[]>([]);
  const [absenceGroups, setAbsenceGroups] = useState<AbsenceGroup[]>([]);
  const [statistics, setStatistics] = useState<AbsenceStatistics>({
    totalEmployees: 0,
    totalAbsenceDays: 0,
    vacationUsagePercentage: 0,
    sickUsagePercentage: 0,
    averageDaysUsed: 0,
    totalVacationDays: 0,
    totalSickDays: 0,
    totalSpecialLeaveDays: 0,
    totalWorkLeaveDays: 0,
    groupStats: [],
    typeStats: [],
  });
  const [chartData, setChartData] = useState<AbsenceChartData>({
    monthlyUsageByGroup: [],
    totalAbsenceDays: [],
    absenceByGroup: [],
    absenceByType: [],
    departmentBreakdown: [],
  });
  const [tableData, setTableData] = useState<AbsenceTableData>({
    byCostCenter: [],
    byEmployee: [],
    byAbsenceType: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { fetchAbsenceData, fetchAbsenceBalanceData, fetchAbsenceTypes, fetchAbsenceGroups } = useGetAbsenceData(context);

  const loadData = useCallback(async () => {
    if (!context.accessToken) {
      setError('No access token available');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch all data in parallel
      const [
        absenceResponse,
        balanceResponse,
        typesResponse,
        groupsResponse
      ] = await Promise.all([
        fetchAbsenceData({ limit: 1000, offset: 0 }),
        fetchAbsenceBalanceData({ 
          year: new Date().getFullYear().toString(), 
          limit: 1000, 
          offset: 0 
        }),
        fetchAbsenceTypes(),
        fetchAbsenceGroups()
      ]);

      // Transform and enhance the data
      const transformedData = transformAbsenceData(
        absenceResponse,
        balanceResponse,
        typesResponse,
        groupsResponse
      );

      // Calculate statistics
      const calculatedStatistics = calculateAbsenceStatistics(
        transformedData.absenceData,
        transformedData.balanceData,
        transformedData.absenceGroups
      );

      // Generate chart data
      const generatedChartData = generateChartData(
        transformedData.absenceData,
        transformedData.balanceData,
        transformedData.absenceGroups
      );

      // Generate table data
      const generatedTableData = generateTableData(
        transformedData.absenceData,
        transformedData.balanceData,
        transformedData.absenceTypes,
        transformedData.absenceGroups
      );

      // Update state
      setAbsenceData(transformedData.absenceData);
      setBalanceData(transformedData.balanceData);
      setAbsenceTypes(transformedData.absenceTypes);
      setAbsenceGroups(transformedData.absenceGroups);
      setStatistics(calculatedStatistics);
      setChartData(generatedChartData);
      setTableData(generatedTableData);

    } catch (err) {
      console.error('Error loading absence data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load absence data');
    } finally {
      setIsLoading(false);
    }
  }, [context.accessToken, fetchAbsenceData, fetchAbsenceBalanceData, fetchAbsenceTypes, fetchAbsenceGroups]);

  useEffect(() => {
    if (context.accessToken) {
      loadData();
    }
  }, [context.accessToken, loadData]);

  return {
    absenceData,
    balanceData,
    absenceTypes,
    absenceGroups,
    statistics,
    chartData,
    tableData,
    isLoading,
    error,
    refetch: loadData,
  };
}; 