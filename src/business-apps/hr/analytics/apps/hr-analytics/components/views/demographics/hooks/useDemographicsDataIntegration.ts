import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '../../../../../../../../../common/BusinessAppContext';
import { 
  useQueryExecutionClient, 
  QueryType,
  Services
} from '@/common/network/dataset';

export interface DemographicsData {
  genderDistribution: Array<{
    category: string;
    value: number;
  }>;
  ageDistribution: Array<{
    category: string;
    value: number;
  }>;
  nationalityDistribution: Array<{
    category: string;
    value: number;
  }>;
}

export interface DemographicsStatistics {
  totalEmployees: number;
  averageAge: number | null;
  mostCommonGender: string | null;
  mostCommonNationality: string | null;
  genderDiversity: number; // percentage of non-majority gender
  nationalityDiversity: number; // number of different nationalities
}

export interface UseDemographicsDataIntegrationResponse {
  demographicsData: DemographicsData;
  statistics: DemographicsStatistics;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useDemographicsDataIntegration = (context: BusinessAppContextProps): UseDemographicsDataIntegrationResponse => {
  const [demographicsData, setDemographicsData] = useState<DemographicsData>({
    genderDistribution: [],
    ageDistribution: [],
    nationalityDistribution: [],
  });
  
  const [statistics, setStatistics] = useState<DemographicsStatistics>({
    totalEmployees: 0,
    averageAge: null,
    mostCommonGender: null,
    mostCommonNationality: null,
    genderDiversity: 0,
    nationalityDiversity: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryExecutionClient(context.accessToken, Services.EMPLOYEE);

  const calculateStatistics = useCallback((data: DemographicsData, totalEmployeesFromQuery: number): DemographicsStatistics => {
    // Use the authoritative total employees count from the dedicated query
    const totalEmployees = totalEmployeesFromQuery;
    
    // Find most common values
    const mostCommonGender = data.genderDistribution.length > 0 
      ? data.genderDistribution.reduce((prev, current) => prev.value > current.value ? prev : current).category
      : null;
      
    const mostCommonNationality = data.nationalityDistribution.length > 0
      ? data.nationalityDistribution.reduce((prev, current) => prev.value > current.value ? prev : current).category
      : null;

    // Calculate diversity metrics
    const genderDiversity = data.genderDistribution.length > 0 && totalEmployees > 0
      ? ((totalEmployees - Math.max(...data.genderDistribution.map(g => g.value))) / totalEmployees) * 100
      : 0;
      
    const nationalityDiversity = data.nationalityDistribution.length;

    // Mock average age calculation (could be enhanced with additional queries)
    const averageAge = data.ageDistribution.length > 0 ? 35.5 : null; // Mock value

    return {
      totalEmployees,
      averageAge,
      mostCommonGender,
      mostCommonNationality,
      genderDiversity,
      nationalityDiversity,
    };
  }, []);

  const loadDemographicsData = useCallback(async () => {
    if (!context.accessToken) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Execute all demographic queries in parallel, including the authoritative employee count
      const [
        totalEmployeeData,
        genderData,
        ageData,
        nationalityData
      ] = await Promise.all([
        // Total employee count (Query 17) - authoritative source
        queryClient.executeQuery('totalEmployeeCount', QueryType.DATASET, {}),
        
        // Gender distribution (Query 8)
        queryClient.executeQuery('genderDistribution', QueryType.DATASET, {}),
        
        // Age distribution (Query 9)
        queryClient.executeQuery('ageDistribution', QueryType.DATASET, {}),
        
        // Nationality distribution (Query 16)
        queryClient.executeQuery('nationalityDistribution', QueryType.DATASET, {})
      ]);

      // Transform data for consistent structure
      const transformedData: DemographicsData = {
        genderDistribution: genderData.data.map(item => ({
          category: item.category,
          value: item.value
        })),
        ageDistribution: ageData.data.map(item => ({
          category: item.category,
          value: item.value
        })),
        nationalityDistribution: nationalityData.data.map(item => ({
          category: item.category,
          value: item.value
        }))
      };

      // Get the authoritative total employee count
      const totalEmployeesCount = totalEmployeeData.data.length > 0 ? totalEmployeeData.data[0].value : 0;

      setDemographicsData(transformedData);
      setStatistics(calculateStatistics(transformedData, totalEmployeesCount));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load demographics data');
    } finally {
      setIsLoading(false);
    }
  }, [queryClient, context.accessToken, calculateStatistics]);

  useEffect(() => {
    if (context.accessToken) {
      loadDemographicsData();
    }
  }, [context.accessToken, loadDemographicsData]);

  return {
    demographicsData,
    statistics,
    isLoading,
    error,
    refetch: loadDemographicsData
  };
}; 