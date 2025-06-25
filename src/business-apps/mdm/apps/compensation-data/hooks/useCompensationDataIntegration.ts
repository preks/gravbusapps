import { useState, useEffect } from 'react';
import { useGetCompensationBandData, CompensationBand } from '../queries/CompensationBandQueries';
import { useGetJobLevelData, JobLevelByJobLevelGroupIdData } from '../../job-structure-data/queries/JobLevelQueries';
import { useJobLevelGroups, JobLevelGroupData } from './useJobLevelGroups';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { CatalogEntry } from '@/common/types/CatalogTypes';

// Enhanced interfaces for the visualization
export interface EnhancedPayGrade {
  id: string;
  code: string;
  name: string;
  payGrade: number;
  minSalary: number;
  maxSalary: number;
  standardSalary: number; // Calculated as middle of min-max if not provided
  currency: {
    id: string;
    value: string;
  };
  order: number;
}

export interface EnhancedJobLevelGroup {
  id: string;
  code: string;
  value: string;
  name: string; // Will use value as name
  category: string; // Will map from code or use default
  color: string; // Will assign colors based on order
  order: number;
  additionalValue1?: string;
  additionalValue2?: string;
  additionalValue3?: string;
}

export interface EnhancedJobLevel {
  id: string;
  name: string;
  code: string;
  jobLevelGroupId: string;
  payGradeId: string;
  compensationBandId: string;
  level: number;
  heirarchyOrder: number;
}

export interface PayGradeVisualizationData {
  payGrades: EnhancedPayGrade[];
  jobLevelGroups: EnhancedJobLevelGroup[];
  jobLevels: EnhancedJobLevel[];
  isLoading: boolean;
  error: string | null;
}

// Default colors for job level groups
const GROUP_COLORS = [
  'gba:bg-blue-400',
  'gba:bg-green-400', 
  'gba:bg-purple-400',
  'gba:bg-orange-400',
  'gba:bg-red-400',
  'gba:bg-cyan-400',
  'gba:bg-pink-400',
  'gba:bg-indigo-400'
];

// Category mappings based on common job level group patterns
const CATEGORY_MAPPINGS: Record<string, string> = {
  'JUNIOR': 'Entry',
  'APPRENTICE': 'Entry',
  'TRAINEE': 'Entry',
  'SENIOR': 'Experienced',
  'LEAD': 'Leadership',
  'MANAGER': 'Leadership',
  'MANAGEMENT': 'Leadership',
  'EXECUTIVE': 'Leadership',
  'SPECIALIST': 'Technical',
  'EXPERT': 'Technical',
  'DEVELOPER': 'Technical',
  'ENGINEER': 'Technical'
};

export const useCompensationDataIntegration = (
  context: BusinessAppContextProps,
  options?: {
    limit?: number;
    autoFetch?: boolean;
  }
): PayGradeVisualizationData & {
  refetch: () => Promise<void>;
} => {
  const [data, setData] = useState<PayGradeVisualizationData>({
    payGrades: [],
    jobLevelGroups: [],
    jobLevels: [],
    isLoading: false,
    error: null
  });

  const { fetchCompensationBandData } = useGetCompensationBandData(context);
  const { fetchJobLevelData } = useGetJobLevelData(context);
  const { fetchJobLevelGroups } = useJobLevelGroups(context);

  const transformCompensationBands = (bands: CompensationBand[]): EnhancedPayGrade[] => {
    return bands
      .filter(band => band.id && band.name)
      .map((band, index) => {
        // Handle currency format - extract actual currency code if needed
        let currency = band.currency || { id: 'EUR', value: 'Euro' };
        if (currency.id && currency.id.includes(':')) {
          const parts = currency.id.split(':');
          currency = {
            ...currency,
            id: parts[parts.length - 1] // Extract "EUR" from "Currency:v1:EUR"
          };
        }

        return {
          id: band.id,
          code: band.name || `PG${index + 1}`, // Use name as code if no separate code exists
          name: band.name || 'Unnamed Grade',
          payGrade: band.payGrade || index + 1,
          minSalary: band.minSalary || 0,
          maxSalary: band.maxSalary || 0,
          standardSalary: band.minSalary && band.maxSalary 
            ? (band.minSalary + band.maxSalary) / 2 
            : band.minSalary || band.maxSalary || 0,
          currency,
          order: band.payGrade || index + 1
        };
      })
      .sort((a, b) => a.order - b.order);
  };

  const transformJobLevelGroups = (groups: CatalogEntry[]): EnhancedJobLevelGroup[] => {
    return groups
      .filter(group => group.id && group.value)
      .map((group, index) => {
        const codeUpper = group.code.toUpperCase();
        const category = CATEGORY_MAPPINGS[codeUpper] || 
                        Object.keys(CATEGORY_MAPPINGS).find(key => codeUpper.includes(key)) 
                        ? CATEGORY_MAPPINGS[Object.keys(CATEGORY_MAPPINGS).find(key => codeUpper.includes(key))!]
                        : 'General';

        return {
          id: group.id,
          code: group.code,
          value: group.value,
          name: group.value,
          category,
          color: GROUP_COLORS[index % GROUP_COLORS.length],
          order: index + 1,
          additionalValue1: group.additionalValue1,
          additionalValue2: group.additionalValue2,
          additionalValue3: group.additionalValue3
        };
      })
      .sort((a, b) => a.value.localeCompare(b.value));
  };

  const transformJobLevels = (levels: any[]): EnhancedJobLevel[] => {
    return levels
      .filter(level => level.id && level.name)
      .map(level => ({
        id: level.id,
        name: level.name,
        code: level.code || level.name,
        jobLevelGroupId: level.jobLevelGroupRef || level.jobLevelGroup?.id,
        payGradeId: level.compensationBandId || level.compensationBand?.id,
        compensationBandId: level.compensationBandId || level.compensationBand?.id,
        level: level.level || 1,
        heirarchyOrder: level.heirarchyOrder || 0
      }))
      .filter(level => level.jobLevelGroupId && level.compensationBandId);
  };

  const fetchData = async () => {
    if (!context.accessToken) {
      setData(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: 'No access token available. Please ensure you are authenticated.' 
      }));
      return;
    }

    setData(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      console.log('Fetching compensation data with token:', context.accessToken.substring(0, 20) + '...');
      
      // Fetch all data in parallel
      const [compensationBandsResult, jobLevelsResult, jobLevelGroupsResult] = await Promise.all([
        fetchCompensationBandData({
          limit: options?.limit || 100,
          offset: 0
        }),
        fetchJobLevelData({
          limit: options?.limit || 100,
          offset: 0
        }),
        fetchJobLevelGroups({ limit: options?.limit || 100, offset: 0 })
      ]);

      // Transform the data
      const payGrades = transformCompensationBands(
        compensationBandsResult?.compensationBands || []
      );
      
      const jobLevelGroups = transformJobLevelGroups(
        jobLevelGroupsResult?.data || []
      );
      
      const jobLevels = transformJobLevels(
        jobLevelsResult?.jobLevels || []
      );

      setData({
        payGrades,
        jobLevelGroups,
        jobLevels,
        isLoading: false,
        error: null
      });

    } catch (error) {
      console.error('Error fetching compensation data:', error);
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch data'
      }));
    }
  };

  useEffect(() => {
    if (options?.autoFetch !== false) {
      fetchData();
    }
  }, [context.accessToken]);

  return {
    ...data,
    refetch: fetchData
  };
}; 