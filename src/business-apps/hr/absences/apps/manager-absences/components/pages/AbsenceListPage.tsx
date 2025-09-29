import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@newwork/nw-design-system';
import { PiArrowLeft, PiListBullets } from 'react-icons/pi';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { DataContainer } from '@/components/layout/dataContainer';
import { AbsenceTable } from '../AbsenceTable';
import { EnhancedAbsence } from '../../types';
import { useAbsenceFilters } from '../../hooks/useAbsenceFilters';
import { useAbsenceListDataSimple } from '../../hooks/useAbsenceListDataSimple';
import { useAbsenceCatalogs } from '../../hooks/useAbsenceCatalogs';

export interface AbsenceListPageProps extends BusinessAppContextProps {
  onNavigateBack: () => void;
  preFilter?: {
    type?: 'pending' | 'recent' | 'sick' | 'vacation' | 'team-away' | 'upcoming' | 'top-absentees';
    status?: string[];
    groups?: string[];
    employees?: string[];
    dateRange?: {
      startDate?: string;
      endDate?: string;
    };
  };
}

/**
 * Absence List Page component that can be navigated to from dashboard cards
 */
export const AbsenceListPage: React.FC<AbsenceListPageProps> = (props) => {
  const { accessToken, userInfo, onNavigateBack, preFilter } = props;
  const supervisorId = userInfo?.employeeDetails?.employeeId;

  // Use the centralized absence filters hook
  const {
    search,
    setSearch,
    selectedFilters,
    filterGroups,
    filterLabelMap,
    addFilter,
    removeFilter,
    resetFilters,
    getFilters,
    startDate,
    endDate,
    creationStartDate,
    creationEndDate,
    handleDateRangeChange,
    handleCreationDateRangeChange,
  } = useAbsenceFilters(props);

  // Get absence groups from catalog for dynamic filtering
  const { absenceGroups } = useAbsenceCatalogs(props);

  // State for pagination and sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortField, setSortField] = useState('');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [selectedAbsence, setSelectedAbsence] = useState<EnhancedAbsence | null>(null);
  const initialLoadDone = useRef(false);
  const preFiltersApplied = useRef(false);

  // Apply pre-filters when component mounts and absence groups are loaded
  useEffect(() => {
    if (preFilter && !preFiltersApplied.current && absenceGroups.length > 0) {
      preFiltersApplied.current = true;

      // Clear all existing filters first
      resetFilters();

      // Apply pre-filters immediately
      if (preFilter.type === 'top-absentees') {
        // For top-absentees, apply employee filters and exclude work leave
        if (preFilter.employees) {
          preFilter.employees.forEach((employeeId) => {
            addFilter(employeeId);
          });
        }

        // Add all absence groups except work leave
        absenceGroups.forEach((group) => {
          if (group.id !== 'AbsenceGroup:v1:WORK') {
            addFilter(group.id);
          }
        });

        // Clear date ranges
        handleDateRangeChange(undefined, undefined);
        handleCreationDateRangeChange(undefined, undefined);
      } else if (preFilter.type === 'recent') {
        // For recent requests, set current month creation date range
        const now = new Date();
        const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
        const endOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0));

        handleCreationDateRangeChange(
          startOfMonth.toISOString().split('T')[0],
          endOfMonth.toISOString().split('T')[0],
        );
        handleDateRangeChange(undefined, undefined);
      } else {
        // Apply status filters for other pre-filter types
        if (preFilter.status) {
          preFilter.status.forEach((status) => {
            addFilter(`status-${status.toLowerCase()}`);
          });
        }

        // Apply group filters
        if (preFilter.groups) {
          preFilter.groups.forEach((group) => {
            addFilter(`group-${group}`);
          });
        }

        // Apply employee filters
        if (preFilter.employees) {
          preFilter.employees.forEach((employeeId) => {
            addFilter(employeeId);
          });
        }

        // Apply date range only if explicitly provided
        if (preFilter.dateRange) {
          handleDateRangeChange(preFilter.dateRange.startDate, preFilter.dateRange.endDate);
        } else {
          handleDateRangeChange(undefined, undefined);
        }
        handleCreationDateRangeChange(undefined, undefined);
      }
    }
  }, [
    preFilter,
    addFilter,
    resetFilters,
    handleDateRangeChange,
    handleCreationDateRangeChange,
    absenceGroups,
  ]);

  // Get absence data with search, sorting, and filters
  const filters = getFilters();

  const { absences, total, loading, error, hasMore, loadMore, loadPage, retry } =
    useAbsenceListDataSimple({
      ...filters,
      accessToken,
      orgUnitId: supervisorId,
    });

  // Consolidated data loading effect
  useEffect(() => {
    if (accessToken && supervisorId) {
      // If we have a preFilter, wait for it to be applied before loading data
      if (preFilter && !preFiltersApplied.current) {
        return; // Don't load data yet, wait for pre-filters to be applied
      }

      if (!initialLoadDone.current) {
        // Initial load
        initialLoadDone.current = true;
        loadPage(currentPage, pageSize);
      } else {
        // Subsequent loads (search, filters, etc.)
        setCurrentPage(1);
        loadPage(1, pageSize);
      }
    }
  }, [
    accessToken,
    supervisorId,
    search,
    JSON.stringify(selectedFilters),
    startDate,
    endDate,
    creationStartDate,
    creationEndDate,
    pageSize,
    loadPage,
    preFilter,
    preFiltersApplied,
  ]);

  // Handle filter changes from the filter sidebar
  const handleFilterChange = useCallback(
    (filterId: string, selected: boolean) => {
      selected ? addFilter(filterId) : removeFilter(filterId);
      setCurrentPage(1);
    },
    [addFilter, removeFilter],
  );

  // Handle search changes
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      setCurrentPage(1);
    },
    [setSearch],
  );

  // Handle filter set changes
  const handleSetFilter = useCallback(
    (filters: string[]) => {
      if (filters.length === 0) {
        resetFilters();
        // Also clear creation date filter when clearing all filters
        handleCreationDateRangeChange(undefined, undefined);
      } else {
        const removedFilters = selectedFilters.filter((f) => !filters.includes(f));
        removedFilters.forEach((filterId) => removeFilter(filterId));
      }
      setCurrentPage(1);
    },
    [selectedFilters, removeFilter, resetFilters, handleCreationDateRangeChange],
  );

  // Handle sorting changes
  const handleSortChange = useCallback((field: string, order: 'ASC' | 'DESC') => {
    setSortField(field);
    setSortOrder(order);
    setCurrentPage(1);
  }, []);

  // Handle page size changes
  const handlePageSizeChange = useCallback(
    (newPageSize: number) => {
      setPageSize(newPageSize);
      setCurrentPage(1);
      loadPage(1, newPageSize);
    },
    [loadPage],
  );

  // Handle page changes
  const handlePageChange = useCallback(
    (newPage: number) => {
      setCurrentPage(newPage);
      loadPage(newPage, pageSize);
    },
    [loadPage, pageSize],
  );

  // Get page title based on pre-filter
  const getPageTitle = () => {
    if (!preFilter) return 'Absence List';

    switch (preFilter.type) {
      case 'pending':
        return 'Pending Requests';
      case 'recent':
        return 'Recent Requests';
      case 'sick':
        return 'Sick Leaves';
      case 'vacation':
        return 'Vacation Requests';
      case 'team-away':
        return 'Team Members Away';
      case 'upcoming':
        return 'Upcoming Absences';
      case 'top-absentees':
        return 'Top Absentees';
      default:
        return 'Absence List';
    }
  };

  // Get page description based on pre-filter
  const getPageDescription = () => {
    if (!preFilter) return 'View and manage all absence requests';

    switch (preFilter.type) {
      case 'pending':
        return 'Review and approve pending absence requests';
      case 'recent':
        return 'View recent absence requests across all statuses';
      case 'sick':
        return 'View sick leave requests and patterns';
      case 'vacation':
        return 'Manage vacation and time-off requests';
      case 'team-away':
        return 'See team members currently away';
      case 'upcoming':
        return 'View upcoming scheduled absences';
      case 'top-absentees':
        return 'View all absence requests for employees with the most absence days';
      default:
        return 'View and manage all absence requests';
    }
  };

  return (
    <div className="gba:min-h-screen gba:bg-gray-50" data-testid="absence-list-page">
      {/* Header */}
      <div className="gba:bg-white gba:border-b gba:border-gray-200 gba:px-6 gba:py-4">
        <div className="gba:space-y-4">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={onNavigateBack}
            className="gba:flex gba:items-center gba:gap-2"
            data-testid="absence-list-page-back-button"
          >
            <PiArrowLeft className="gba:text-lg" />
            Back to Dashboard
          </Button>

          {/* Title and Subtitle */}
          <div>
            <h1
              className="gba:text-2xl gba:font-bold gba:text-gray-900"
              data-testid="absence-list-page-title"
            >
              {getPageTitle()}
            </h1>
            <p className="gba:text-gray-600 gba:mt-1" data-testid="absence-list-page-subtitle">
              {getPageDescription()}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="gba:p-6">
        <DataContainer
          dataControllerProps={{
            search: search,
            setSearch: handleSearchChange,
            placeholder: 'Search absences...',
            filter: selectedFilters,
            setFilter: handleSetFilter,
            filterLabelMap: filterLabelMap,
            hideFilter: false,
          }}
          dataFilterProps={{
            filterGroups: filterGroups,
            onFilterChange: handleFilterChange,
          }}
          dataBody={
            <AbsenceTable
              {...props}
              absences={absences}
              loading={loading}
              error={error}
              hasMore={hasMore}
              loadMore={loadMore}
              loadPage={loadPage}
              retry={retry}
              total={total}
              currentPage={currentPage}
              pageSize={pageSize}
              sortField={sortField}
              sortOrder={sortOrder}
              onSelectAbsence={setSelectedAbsence}
              onPaginationChange={(page, size) => {
                handlePageChange(page);
                if (size) handlePageSizeChange(size);
              }}
              onSortingChange={(field, order) => handleSortChange(field, order as 'ASC' | 'DESC')}
              selectedAbsenceId={selectedAbsence?.id}
            />
          }
          data-testid="absence-list-page-container"
        />
      </div>
    </div>
  );
};
