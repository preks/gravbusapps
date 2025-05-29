"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '@/components/layout/pageLayout';
import { DataContainer } from '@/components/layout/dataContainer';
import { useJobPositionListData } from './hooks/useJobPositionListData';
import { JobPositionTable } from './components/JobPositionTable';
import { PiBriefcase } from 'react-icons/pi';
import { BusinessAppContextProps } from '../../../common/BusinessAppContext';
import { useGetOrganizationalUnits } from '../hooks/useGetOrganizationalUnits';

/**
 * Job Position List page component. Renders the job position list module with a table view.
 * Shows both filled and vacant positions.
 * @returns {JSX.Element}
 */
export const JobPositionList: React.FC<BusinessAppContextProps> = (props: BusinessAppContextProps) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [showVacantOnly, setShowVacantOnly] = useState(false);
  
  // Fetch organizational unit filter options using the centralized hook
  const [orgUnitSearch, setOrgUnitSearch] = useState('');
  const [orgUnitOffset, setOrgUnitOffset] = useState(0);
  const { units: orgUnitOptions, loading: orgUnitLoading } = useGetOrganizationalUnits(props.accessToken, orgUnitSearch, orgUnitOffset);
  
  // Use selected filter IDs for the job position filter
  const selectedOrgUnits: string[] = selectedFilters.filter((f: string) => 
    orgUnitOptions?.map((u: { id: string }) => u.id).includes(f) ?? []);

  // Define filter groups for the DataContainer
  const filterGroups = [
    {
      id: 'organizationalUnit',
      title: t('job_position.organizational_unit', 'Organizational Unit'),
      items: orgUnitOptions?.map((unit: any) => ({
        id: unit.id,
        label: unit.name,
        count: 0,
        selected: selectedOrgUnits.includes(unit.id)
      })) || [],
      loading: orgUnitLoading,
      searchable: true,
      onSearch: setOrgUnitSearch,
      onLoadMore: () => setOrgUnitOffset(prev => prev + 10)
    },
    {
      id: 'vacantOnly',
      title: t('job_position.vacancy_status', 'Vacancy Status'),
      items: [
        {
          id: 'vacant',
          label: t('job_position.vacant_only', 'Show Vacant Positions Only'),
          count: 0,
          selected: showVacantOnly
        }
      ],
      loading: false,
      searchable: false
    }
  ];
  
  // Handle filter changes
  const handleFilterChange = useCallback((id: string, selected: boolean) => {
    if (id === 'vacant') {
      setShowVacantOnly(selected);
    } else {
      setSelectedFilters(prev => (
        selected
          ? [...prev, id]
          : prev.filter(f => f !== id)
      ));
    }
  }, []);

  // Prepare filters for the job position data query
  const filters = {
    search,
    organizationalUnits: selectedOrgUnits,
    showVacantOnly
  };

  // Get job position data with filters
  const { 
    jobPositions, 
    total, 
    loading, 
    error, 
    hasMore, 
    loadMore, 
    retry 
  } = useJobPositionListData({ ...filters, accessToken: props.accessToken });
  
  // Trigger initial data loading when component mounts
  useEffect(() => {
    loadMore();
  }, [loadMore]);

  return (
    <div className="w-full h-screen flex flex-row relative bg-white">
      <PageLayout
        variant="default"
        headerIcon={<PiBriefcase size={24} className="text-primary" />}
        headerLabel={t('job_position.list_title', 'Job Position List')}
        contentContainer={
          <DataContainer
            dataControllerProps={{
              search,
              setSearch,
              filter: [...selectedFilters, ...(showVacantOnly ? ['vacant'] : [])],
              setFilter: (filters) => {
                const vacantFilter = filters.includes('vacant');
                setShowVacantOnly(vacantFilter);
                setSelectedFilters(filters.filter(f => f !== 'vacant'));
              },
              filterLabelMap: {
                ...Object.fromEntries((orgUnitOptions ?? []).map((u) => [u.id, u.name ?? ''])),
                vacant: t('job_position.vacant_only', 'Vacant Positions Only')
              },
              listTitle: t('job_position.list_title', 'Job Positions'),
              listIcon: <PiBriefcase size={20} />,
              listAmount: total,
            }}
            dataFilterProps={{
              filterGroups: filterGroups,
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
