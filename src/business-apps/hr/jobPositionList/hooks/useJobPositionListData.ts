"use client";

import { useEffect, useState, useCallback } from 'react';
import { useGraphqlClient } from '@/hooks/useGraphqlClient';

/**
 * Job Position type definition for the list.
 */
export interface JobPosition {
  id: string;
  name: string;
  organizationalUnit: string;
  organizationalUnitId: string;
  jobProfile: string;
  jobProfileId: string;
  isVacant: boolean;
  employeeId?: string;
  employeeFirstName?: string;
  employeeLastName?: string;
  employeeProfilePicture?: string;
}

/**
 * Filters for the job position list query.
 */
export type JobPositionListFilters = {
  search?: string;
  organizationalUnits?: string[];
  jobProfiles?: string[];
  showVacantOnly?: boolean;
};

const POSITIONS_PER_PAGE = 20;

// GraphQL query to fetch job positions with employee positions
const JOB_POSITION_QUERY = `
  query JobPositions($limit: Int!, $offset: Int!) {
    JobPosition(where: {employeePositionsAggregate: {count: {predicate: {_eq: 0}}}}, limit: 20, offset: 0) {
      name
      jobProfile {
        name
      }
    }
  }
`;

/**
 * Custom hook to fetch job position list data with filters and pagination.
 * @param filters Filters for the job position list.
 * @returns Job positions, total count, loading, error, hasMore, loadMore, retry
 */
export function useJobPositionListData(filters: JobPositionListFilters) {
  const client = useGraphqlClient('newwork');
  const [jobPositions, setJobPositions] = useState<JobPosition[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const { search, organizationalUnits, jobProfiles, showVacantOnly } = filters;
  const searchFilter = search ? `%${search}%` : `%`;

  // Reset on filter change
  useEffect(() => {
    setJobPositions([]);
    setOffset(0);
    setHasMore(true);
  }, [search, JSON.stringify(organizationalUnits), JSON.stringify(jobProfiles), showVacantOnly]);

  /**
   * Loads more job positions from the API. Guards against undefined client and SSR.
   */
  const loadMore = useCallback(() => {
    if (typeof window === 'undefined') return; // Prevent SSR execution
    if (!client) {
      setError(new Error('GraphQL client unavailable'));
      setLoading(false);
      return;
    }
    if (loading || !hasMore) return;
    setLoading(true);

    // Build the where filter
    const where: any = {
      ...(search ? {
        _or: [
          { name: { _ilike: searchFilter } },
          { jobProfile: { name: { _ilike: searchFilter } } },
          { organizationalUnit: { name: { _ilike: searchFilter } } }
        ]
      } : {})
    };

    // Add organizational unit filter if provided
    if (organizationalUnits && organizationalUnits.length > 0) {
      where.organizationalUnitId = { _in: organizationalUnits };
    }

    // Add job profile filter if provided
    if (jobProfiles && jobProfiles.length > 0) {
      where.jobProfileId = { _in: jobProfiles };
    }

    // Add vacant only filter if enabled
    if (showVacantOnly) {
      where.employeePositions = { _not_exists: {} };
    }

    client.request?.(JOB_POSITION_QUERY, {
      limit: POSITIONS_PER_PAGE,
      offset,
      where
    })
      .then((res: any) => {
        if (!res) {
          setError(new Error('No response from GraphQL query'));
          setLoading(false);
          return;
        }

        const positions = res.JobPosition ?? [];
        const newPositions = positions.map((jp: any) => {
          // Check if the job position has any employee positions
          const hasEmployeePosition = jp.employeePositions && jp.employeePositions.length > 0;
          const employeePosition = hasEmployeePosition ? jp.employeePositions[0] : null;
          const employee = employeePosition?.employee;

          return {
            id: jp.id,
            name: jp.name,
            organizationalUnit: jp.organizationalUnit?.name ?? '',
            organizationalUnitId: jp.organizationalUnit?.id ?? '',
            jobProfile: jp.jobProfile?.name ?? '',
            jobProfileId: jp.jobProfile?.id ?? '',
            isVacant: !hasEmployeePosition,
            employeeId: employee?.id,
            employeeFirstName: employee?.firstName,
            employeeLastName: employee?.lastName,
            employeeProfilePicture: employee?.pictureThumbnail 
              ? `data:image/jpeg;base64,${employee.pictureThumbnail}`
              : undefined
          };
        });

        setJobPositions((prev: JobPosition[]) => [...prev, ...newPositions]);
        setTotal(res.JobPositionAggregate.aggregate.count);
        setOffset(prev => prev + POSITIONS_PER_PAGE);
        setHasMore(newPositions.length === POSITIONS_PER_PAGE);
        setLoading(false);
      })
      .catch((err: any) => {
        setError(err);
        setHasMore(false);
        setLoading(false);
      });
  }, [loading, hasMore, client, offset, search, organizationalUnits, jobProfiles, showVacantOnly, searchFilter]);

  const retry = useCallback(() => {
    setError(null);
    setHasMore(true);
    loadMore();
  }, [loadMore]);

  return { jobPositions, total, loading, error, hasMore, loadMore, retry };
}
