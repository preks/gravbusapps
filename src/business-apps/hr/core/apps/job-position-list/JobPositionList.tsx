"use client";

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '@/components/layout/pageLayout';
import { DataContainer } from '@/components/layout/dataContainer';
import { useJobPositionListData, VacancyFilter } from './hooks/useJobPositionListData';
import { useJobPositionFilters } from './hooks/useJobPositionFilters';
import { JobPositionTable } from './components/JobPositionTable';
import { PiBriefcase } from 'react-icons/pi';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { startProcess } from '@/common/utils/start-process';

/**
 * Job Position List page component. Renders the job position list module with a table view.
 * Shows vacant positions by default, with options to filter by vacancy status.
 * @returns {JSX.Element}
 */
export const JobPositionList: React.FC<BusinessAppContextProps> = (props: BusinessAppContextProps) => {
  const { accessToken } = props;
  const { t } = useTranslation();
  const [vacancyFilter, setVacancyFilter] = useState<VacancyFilter>('vacant'); // Default to vacant positions
  const initialLoadDone = useRef(false);

  // Use the centralized job position filters hook
  const {
    search,
    setSearch,
    selectedFilters,
    setSelectedFilters,
    filterGroups,
    filterLabelMap,
    addFilter,
    removeFilter,
    getFilters
  } = useJobPositionFilters(accessToken);

  // Convert vacancy filter to boolean for the query
  const getVacantParam = (filter: VacancyFilter): boolean | undefined => {
    switch (filter) {
      case 'vacant':
        return true;
      case 'filled':
        return false;
      case 'all':
        return undefined;
      default:
        return true; // Default to vacant
    }
  };

  // Handle adding a new job position
  const handleAddJobPosition = useCallback(() => {
    startProcess({
      domain: 'employee',
      processName: 'saveJobPosition',
      builderType: 'NATIVE_SCREEN',
      payload: {}
    });
  }, []);

  // Adapter function for DataFilter component
  const handleFilterChange = useCallback((filterId: string, selected: boolean) => {
    // Use the appropriate function directly
    selected ? addFilter(filterId) : removeFilter(filterId);
  }, [addFilter, removeFilter]);

  // Get job position data with filters (computed inline to avoid dependency issues)
  const { 
    jobPositions, 
    total, 
    loading, 
    error, 
    hasMore, 
    loadMore, 
    loadPage,
    retry 
  } = useJobPositionListData({
    search,
    jobProfiles: selectedFilters, // Backend will filter by the IDs that match
    jobFunctions: selectedFilters,
    jobLevels: selectedFilters,
    contractTypes: selectedFilters,
    employmentTypes: selectedFilters,
    vacant: getVacantParam(vacancyFilter),
    accessToken
  });
  
  // Trigger initial data loading when component mounts
  useEffect(() => {
    if (!initialLoadDone.current && accessToken) {
      initialLoadDone.current = true;
      loadPage(1); // Load first page instead of loadMore
    }
  }, [loadPage, accessToken]);

  // Trigger search when filters change
  useEffect(() => {
    if (initialLoadDone.current) {
      const filters = getFilters();
      loadPage(1, 20, {
        ...filters,
        vacant: getVacantParam(vacancyFilter)
      }); // Reset to first page when filters change
    }
  }, [search, selectedFilters, vacancyFilter]); // Removed loadPage from dependencies to avoid loop

  // Handle vacancy filter changes
  const handleVacancyFilterChange = useCallback((id: string, selected: boolean) => {
    if (selected) {
      switch (id) {
        case 'vacant':
          setVacancyFilter('vacant');
          break;
        case 'filled':
          setVacancyFilter('filled');
          break;
        case 'all':
          setVacancyFilter('all');
          break;
      }
    }
  }, []);

  // Combined filter groups including vacancy status
  const allFilterGroups = useMemo(() => [
    ...filterGroups,
    {
      id: 'vacancyStatus',
      title: t('job_position.vacancy_status', 'Vacancy Status'),
      filters: [
        {
          id: 'vacant',
          label: t('job_position.vacant_positions', 'Vacant Positions'),
          selected: vacancyFilter === 'vacant'
        },
        {
          id: 'filled',
          label: t('job_position.filled_positions', 'Filled Positions'),
          selected: vacancyFilter === 'filled'
        },
        {
          id: 'all',
          label: t('job_position.all_positions', 'All Positions'),
          selected: vacancyFilter === 'all'
        }
      ]
    }
  ], [filterGroups, t, vacancyFilter]);

  // Combined filter label map
  const allFilterLabelMap = useMemo(() => ({
    ...filterLabelMap,
    vacant: t('job_position.vacant_positions', 'Vacant Positions'),
    filled: t('job_position.filled_positions', 'Filled Positions'),
    all: t('job_position.all_positions', 'All Positions')
  }), [filterLabelMap, t]);

  // Create filter array for DataController
  const activeFilters = useMemo(() => {
    const filters = [...selectedFilters];
    if (vacancyFilter !== 'all') {
      filters.push(vacancyFilter);
    }
    return filters;
  }, [selectedFilters, vacancyFilter]);

  return (
    <div className="gba:w-full gba:h-screen gba:flex gba:flex-row gba:relative gba:bg-white">
      <PageLayout
        variant="default"
        headerIcon={<PiBriefcase size={24} className="gba:text-primary" />}
        headerLabel={t('job_position.list_title', 'Job Position List')}
        contentContainer={
          <DataContainer
            dataControllerProps={{
              search,
              setSearch,
              debounceDelay: 500,
              filter: activeFilters,
              setFilter: setSelectedFilters,
              filterLabelMap: allFilterLabelMap,
              listTitle: t('job_position.list_title', 'Job Positions'),
              listIcon: <PiBriefcase size={20} />,
              listAmount: total,
              addButton: {
                onClick: handleAddJobPosition,
                label: 'Add',
                'data-testid': 'add-job-position-button'
              },
            }}
            dataFilterProps={{
              filterGroups: allFilterGroups,
              onFilterChange: (filterId: string, selected: boolean) => {
                // Handle vacancy filter separately
                if (['vacant', 'filled', 'all'].includes(filterId)) {
                  handleVacancyFilterChange(filterId, selected);
                } else {
                  handleFilterChange(filterId, selected);
                }
              },
            }}
            dataBody={
              <div data-testid="job-position-table-container">
                <JobPositionTable
                  jobPositions={jobPositions}
                  loading={loading}
                  error={error}
                  hasMore={hasMore}
                  loadMore={loadMore}
                  loadPage={loadPage}
                  retry={retry}
                  total={total}
                />
              </div>
            }
          />
        }
      />
    </div>
  );
};

export default JobPositionList;
