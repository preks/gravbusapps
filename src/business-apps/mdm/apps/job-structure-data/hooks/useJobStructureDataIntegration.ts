import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';
import { useGetJobLevelData, JobLevelDataVariables } from '../queries/JobLevelQueries';
import { CatalogEntry } from '@/common/types/CatalogTypes';

// Enhanced interfaces
export interface EnhancedJobLevel {
  id: string;
  name: string;
  nameI18n?: { [key: string]: string };
  code?: string;
  description?: string;
  descriptionI18n?: { [key: string]: string };
  level: number; // derived from heirarchyOrder
  jobLevelGroupId: string; // from jobLevelGroupRef
  compensationBandId?: string;
  compensationBand?: {
    id: string;
    name: string;
  };
  version?: number;
  // Additional computed fields
  displayName: string;
  salaryGrade?: number; // derived from compensation band
  experienceYears?: number; // could be derived or added later
}

export interface EnhancedJobLevelGroup {
  id: string;
  name: string;
  code: string;
  description?: string;
  category: string;
  isActive: boolean;
  translations?: any;
  additionalValue1?: string;
  additionalValue2?: string;
  additionalValue3?: string;
  // Computed fields
  jobLevels: EnhancedJobLevel[];
  jobLevelCount: number;
  color: string; // for UI display
}

const JOB_LEVEL_GROUP_CATALOG = 'JobLevelGroup';
const JOB_LEVEL_GROUP_VERSION = 'v1';

// Color palette for job level groups
const GROUP_COLORS = [
  'gba:bg-blue-400',
  'gba:bg-green-400', 
  'gba:bg-purple-400',
  'gba:bg-orange-400',
  'gba:bg-pink-400',
  'gba:bg-indigo-400',
  'gba:bg-teal-400',
  'gba:bg-red-400'
];

export const useJobStructureDataIntegration = (context: BusinessAppContextProps) => {
  const [jobLevelGroups, setJobLevelGroups] = useState<EnhancedJobLevelGroup[]>([]);
  const [jobLevels, setJobLevels] = useState<EnhancedJobLevel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const catalogClient = useCatalogManagerClient(context.accessToken);
  const { fetchJobLevelData } = useGetJobLevelData(context);

  const transformJobLevelGroup = (catalogEntry: CatalogEntry, index: number): EnhancedJobLevelGroup => {
    return {
      id: catalogEntry.id,
      name: catalogEntry.value || catalogEntry.code || 'Unknown',
      code: catalogEntry.code || catalogEntry.id,
      description: catalogEntry.additionalValue1 || undefined,
      category: catalogEntry.additionalValue2 || 'General',
      isActive: true, // Catalog entries are generally active
      translations: catalogEntry.translations,
      additionalValue1: catalogEntry.additionalValue1,
      additionalValue2: catalogEntry.additionalValue2,
      additionalValue3: catalogEntry.additionalValue3,
      jobLevels: [],
      jobLevelCount: 0,
      color: GROUP_COLORS[index % GROUP_COLORS.length]
    };
  };

  const transformJobLevel = (jobLevel: any): EnhancedJobLevel => {
    return {
      id: jobLevel.id,
      name: jobLevel.name || 'Unknown Job Level',
      nameI18n: jobLevel.nameI18n,
      code: jobLevel.code,
      description: jobLevel.description,
      descriptionI18n: jobLevel.descriptionI18n,
      level: jobLevel.heirarchyOrder || 1,
      jobLevelGroupId: jobLevel.jobLevelGroupRef || '',
      compensationBandId: jobLevel.compensationBandId,
      compensationBand: jobLevel.compensationBand,
      version: jobLevel.version,
      displayName: jobLevel.name || jobLevel.code || 'Unknown',
      salaryGrade: jobLevel.compensationBand?.id ? parseInt(jobLevel.compensationBand.id) : undefined,
      experienceYears: jobLevel.heirarchyOrder ? (jobLevel.heirarchyOrder - 1) * 2 : 0 // Rough estimation
    };
  };

  const fetchJobLevelGroups = async () => {
    try {
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: JOB_LEVEL_GROUP_CATALOG,
          version: JOB_LEVEL_GROUP_VERSION
        },
        {
          limit: 100,
          offset: 0,
          returnTotalRecords: true,
          includeChildCatalogEntries: true
        }
      );

      return response.data.map(transformJobLevelGroup);
    } catch (error) {
      console.error('Error fetching job level groups:', error);
      throw new Error('Failed to fetch job level groups from catalog');
    }
  };

  const fetchJobLevels = async (variables?: JobLevelDataVariables) => {
    try {
      const response = await fetchJobLevelData({
        limit: 1000, // Get all job levels
        offset: 0,
        ...variables
      });

      return response.jobLevels?.map(transformJobLevel) || [];
    } catch (error) {
      console.error('Error fetching job levels:', error);
      throw new Error('Failed to fetch job levels from GraphQL API');
    }
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch both job level groups and job levels in parallel
      const [groupsData, levelsData] = await Promise.all([
        fetchJobLevelGroups(),
        fetchJobLevels()
      ]);

      // Combine the data - assign job levels to their respective groups
      const enhancedGroups = groupsData.map(group => {
        const groupJobLevels = levelsData.filter(level => level.jobLevelGroupId === group.id);
        return {
          ...group,
          jobLevels: groupJobLevels.sort((a, b) => a.level - b.level), // Sort by level
          jobLevelCount: groupJobLevels.length
        };
      });

      setJobLevelGroups(enhancedGroups);
      setJobLevels(levelsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error loading job structure data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [context.accessToken]);

  const refetch = useCallback(() => {
    return loadData();
  }, [loadData]);

  // Load data on mount and when access token changes
  useEffect(() => {
    if (context.accessToken) {
      loadData();
    }
  }, [context.accessToken, loadData]);

  // Helper functions
  const getJobLevelsByGroupId = (groupId: string): EnhancedJobLevel[] => {
    return jobLevels.filter(level => level.jobLevelGroupId === groupId);
  };

  const getJobLevelById = (levelId: string): EnhancedJobLevel | undefined => {
    return jobLevels.find(level => level.id === levelId);
  };

  const getJobLevelGroupById = (groupId: string): EnhancedJobLevelGroup | undefined => {
    return jobLevelGroups.find(group => group.id === groupId);
  };

  return {
    // Data
    jobLevelGroups,
    jobLevels,
    
    // State
    isLoading,
    error,
    
    // Actions
    refetch,
    
    // Helper functions
    getJobLevelsByGroupId,
    getJobLevelById,
    getJobLevelGroupById,
    
    // Raw fetch functions for advanced usage
    fetchJobLevelGroups,
    fetchJobLevels
  };
}; 