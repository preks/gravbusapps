"use client";

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '@/components/layout/pageLayout';
import { DataContainer } from '@/components/layout/dataContainer';
import { useJobPositionListData, VacancyFilter, JobPosition } from './hooks/useJobPositionListData';
import { useJobPositionFilters } from './hooks/useJobPositionFilters';
import { JobPositionTable } from './components/JobPositionTable';
import { JobPositionDetails } from './components/JobPositionDetails';
import { VacancyStatusToggle } from './components/VacancyStatusToggle';
import { PiBriefcase } from 'react-icons/pi';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { startProcess } from '@/common/utils/start-process';

/**
 * Job Position List page component. Renders the job position list module with a table view.
 * Shows vacant positions by default, with options to filter by vacancy status.
 * @returns {JSX.Element}
 */
export const JobPositionList: React.FC<BusinessAppContextProps> = (props: BusinessAppContextProps) => {
  console.log('JobPositionList', props.additionalData?.jobPositionId);
  const { accessToken } = props;
  const { t } = useTranslation();
  const [vacancyFilter, setVacancyFilter] = useState<VacancyFilter>('vacant'); // Default to vacant positions
  const [selectedJobPosition, setSelectedJobPosition] = useState<JobPosition | null>(null);
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
    jobFamilies: selectedFilters,
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
  const handleVacancyFilterChange = useCallback((value: VacancyFilter) => {
    setVacancyFilter(value);
  }, []);

  // Handle job position selection
  const handleSelectJobPosition = useCallback((jobPosition: JobPosition) => {
    setSelectedJobPosition(jobPosition);
  }, []);

  // Handle closing the details panel
  const handleCloseDetails = useCallback(() => {
    setSelectedJobPosition(null);
  }, []);

  // Filter groups without vacancy status (handled separately)
  const allFilterGroups = useMemo(() => filterGroups, [filterGroups]);

  // Combined filter label map (without vacancy status)
  const allFilterLabelMap = useMemo(() => filterLabelMap, [filterLabelMap]);

  // Create filter array for DataController (without vacancy status)
  const activeFilters = useMemo(() => selectedFilters, [selectedFilters]);

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
              listTitle: (
                <div className="gba:flex gba:items-center gba:gap-4">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <PiBriefcase size={20} />
                    <span>{t('job_position.list_title', 'Job Positions')}</span>
                    <span className="gba:text-gray-500">({total})</span>
                  </div>
                  <VacancyStatusToggle
                    value={vacancyFilter}
                    onChange={handleVacancyFilterChange}
                  />
                </div>
              ),
              addButton: {
                onClick: handleAddJobPosition,
                label: 'Add',
                'data-testid': 'add-job-position-button'
              },
            }}
            dataFilterProps={{
              filterGroups: allFilterGroups,
              onFilterChange: handleFilterChange,
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
                  onSelectJobPosition={handleSelectJobPosition}
                  selectedJobPositionId={selectedJobPosition?.id}
                  accessToken={accessToken}
                />
              </div>
            }
            dataDetails={selectedJobPosition ? {
              title: selectedJobPosition.name,
              icon: <PiBriefcase size={20} />,
              content: <JobPositionDetails jobPosition={selectedJobPosition} onClose={handleCloseDetails} />,
              onClose: handleCloseDetails
            } : undefined}
            floatingDetails={true}
          />
        }
      />
    </div>
  );
};

export default JobPositionList;
