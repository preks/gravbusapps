"use client";

import { useEffect, useState, useCallback } from 'react';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils';
import { JOB_POSITION_QUERY } from '../queries/JobPositionQueries';

/**
 * Job Function type definition.
 */
export interface JobFunction {
  id: string;
  name: string;
  jobFamily: JobFamily | null;
}

/**
 * Job Level type definition.
 */
export interface JobLevel {
  id: string;
  name: string;
}

/**
 * Job Profile type definition.
 */
export interface JobProfile {
  id: string;
  name: string;
}

/**
 * Job Family translation definition.
 */
export interface JobFamilyTranslation {
  value: string;
  localeCode: string;
  id: string;
}

/**
 * Job Family definition.
 */
export interface JobFamily {
  value: string;
  id: string;
  code: string;
  catalogId: string;
  translations: JobFamilyTranslation[];
}

/**
 * Contract Type translation definition.
 */
export interface ContractTypeTranslation {
  value: string;
  localeCode: string;
  id: string;
}

/**
 * Contract Type definition.
 */
export interface ContractType {
  value: string;
  id: string;
  code: string;
  catalogId: string;
  translations: ContractTypeTranslation[];
}

/**
 * Employment Type translation definition.
 */
export interface EmploymentTypeTranslation {
  value: string;
  localeCode: string;
  id: string;
}

/**
 * Employment Type definition.
 */
export interface EmploymentType {
  value: string;
  id: string;
  code: string;
  catalogId: string;
  translations: EmploymentTypeTranslation[];
}

/**
 * Organizational Unit definition.
 */
export interface OrganizationalUnit {
  name: string;
  id: string;
}

/**
 * Organizational Unit Employee definition.
 */
export interface OrganizationalUnitEmployee {
  organizationalUnit: OrganizationalUnit;
}

/**
 * Employee type definition.
 */
export interface Employee {
  pictureThumbnail: string | null;
}

/**
 * Employee Position type definition.
 */
export interface EmployeePosition {
  firstName: string;
  lastName: string;
  employeeId: string;
  employee: Employee;
}

/**
 * Job Position type definition for the list.
 */
export interface JobPosition {
  id: string;
  name: string;
  jobFunction: JobFunction | null;
  jobLevel: JobLevel | null;
  jobProfile: JobProfile | null;
  employeePositions: EmployeePosition[];
  contractType: ContractType | null;
  employmentType: EmploymentType | null;
  organizationalUnitEmployees: OrganizationalUnitEmployee[];
}

/**
 * Filters for the job position list query.
 */
export type JobPositionListFilters = {
  search?: string;
  organizationalUnits?: string[];
  jobProfiles?: string[];
  jobFunctions?: string[];
  jobLevels?: string[];
  jobFamilies?: string[];
  contractTypes?: string[];
  employmentTypes?: string[];
  vacant?: boolean; // true = vacant only, false = non-vacant only, undefined = both
};

/**
 * Vacancy filter type for the hook.
 */
export type VacancyFilter = 'vacant' | 'filled' | 'all';

const POSITIONS_PER_PAGE = 20;

/**
 * Custom hook to fetch job position list data with filters and pagination.
 * @param filters Filters for the job position list.
 * @returns Job positions, total count, loading, error, hasMore, loadMore, loadPage, retry
 */
export function useJobPositionListData(filters: JobPositionListFilters & { accessToken: string }) {
  const client = useGraphqlClient(filters.accessToken);
  const [jobPositions, setJobPositions] = useState<JobPosition[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const { search, organizationalUnits, jobProfiles, jobFunctions, jobLevels, jobFamilies, contractTypes, employmentTypes, vacant } = filters;
  
  // Get the structureId from the BusinessAppContext
  const structureId = getCurrentActiveStructureId();

  // Reset on filter change
  useEffect(() => {
    setJobPositions([]);
    setOffset(0);
    setHasMore(true);
    setTotal(0);
  }, [search, JSON.stringify(organizationalUnits), JSON.stringify(jobProfiles), JSON.stringify(jobFunctions), JSON.stringify(jobLevels), JSON.stringify(jobFamilies), JSON.stringify(contractTypes), JSON.stringify(employmentTypes), vacant]);

  /**
   * Loads a specific page of job positions. Used for true pagination.
   * @param page Page number (1-based)
   * @param pageSize Number of positions per page
   * @param overrideFilters Optional filters to override the current ones
   */
  const loadPage = useCallback((page: number, pageSize: number = POSITIONS_PER_PAGE, overrideFilters?: JobPositionListFilters) => {
    if (typeof window === 'undefined') return; // Prevent SSR execution
    if (!client) {
      setError(new Error('GraphQL client unavailable'));
      setLoading(false);
      return;
    }
    if (loading) return;
    
    const pageOffset = (page - 1) * pageSize;
    setLoading(true);

    // Use provided filters or current filters
    const currentFilters = overrideFilters || filters;

    // Build filter object for all filter types
    const filterConditions: any[] = [];
    
    if (currentFilters.organizationalUnits && currentFilters.organizationalUnits.length > 0) {
      filterConditions.push({
        organizationalUnitEmployees: {
          organizationalUnit: {
            id: { _in: currentFilters.organizationalUnits }
          }
        }
      });
    }
    
    if (currentFilters.jobProfiles && currentFilters.jobProfiles.length > 0) {
      filterConditions.push({
        jobProfile: {
          id: { _in: currentFilters.jobProfiles }
        }
      });
    }
    
    if (currentFilters.jobFunctions && currentFilters.jobFunctions.length > 0) {
      filterConditions.push({
        jobFunction: {
          id: { _in: currentFilters.jobFunctions }
        }
      });
    }
    
    if (currentFilters.jobLevels && currentFilters.jobLevels.length > 0) {
      filterConditions.push({
        jobLevel: {
          id: { _in: currentFilters.jobLevels }
        }
      });
    }
    
    if (currentFilters.jobFamilies && currentFilters.jobFamilies.length > 0) {
      filterConditions.push({
        jobFunction: {
          jobFamily: {
            id: { _in: currentFilters.jobFamilies }
          }
        }
      });
    }
    
    if (currentFilters.contractTypes && currentFilters.contractTypes.length > 0) {
      filterConditions.push({
        contractType: {
          id: { _in: currentFilters.contractTypes }
        }
      });
    }
    
    if (currentFilters.employmentTypes && currentFilters.employmentTypes.length > 0) {
      filterConditions.push({
        employmentType: {
          id: { _in: currentFilters.employmentTypes }
        }
      });
    }

    // Prepare query variables
    const variables: any = {
      structureId,
      limit: pageSize,
      offset: pageOffset,
      filter: filterConditions.length > 0 ? { _and: filterConditions } : {},
      search: currentFilters.search ? `%${currentFilters.search}%` : '%'
    };

    // Add vacant filter if specified
    if (currentFilters.vacant !== undefined) {
      variables.vacant = currentFilters.vacant;
    }

    client.request?.(JOB_POSITION_QUERY, variables)
      .then((res: any) => {
        if (!res) {
          setError(new Error('No response from GraphQL query'));
          setLoading(false);
          return;
        }

        const positions = res.JobPosition ?? [];
        
        // Server-side filtering is now handled in the GraphQL query
        setJobPositions(positions);
        setTotal(res.JobPositionAggregate.aggregate.count);
        setOffset(pageOffset);
        
        // Check if there are more positions to load
        const hasMoreData = positions.length === pageSize;
        setHasMore(hasMoreData);
        
        setLoading(false);
      })
      .catch((err: any) => {
        setError(err);
        setHasMore(false);
        setLoading(false);
      });
  }, [loading, client, structureId]); // Removed filters from dependencies

  /**
   * Loads more job positions from the API (for backward compatibility).
   * @deprecated Use loadPage instead for proper pagination
   */
  const loadMore = useCallback(() => {
    loadPage(1, POSITIONS_PER_PAGE);
  }, [loadPage]);

  const retry = useCallback(() => {
    setError(null);
    setHasMore(true);
    setOffset(0);
    setJobPositions([]);
    setTotal(0);
    loadPage(1);
  }, [loadPage]);

  return { jobPositions, total, loading, error, hasMore, loadMore, loadPage, retry };
}
