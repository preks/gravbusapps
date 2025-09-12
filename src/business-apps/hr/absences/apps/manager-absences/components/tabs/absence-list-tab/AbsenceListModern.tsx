import React, { useState, useCallback, useEffect, useRef } from 'react';
import { DataContainer } from '@/components/layout/dataContainer';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { AbsenceTable } from '../../AbsenceTable';
import { EnhancedAbsence } from '../../../types';
import { useAbsenceFilters } from '../../../hooks/useAbsenceFilters';
import { useAbsenceListDataSimple } from '../../../hooks/useAbsenceListDataSimple';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

interface AbsenceListModernProps extends BusinessAppContextProps {}

/**
 * Modern Absence List component using NW design system and data hooks
 */
export const AbsenceListModern: React.FC<AbsenceListModernProps> = (props) => {
  const { accessToken, userInfo } = props;
  const supervisorId = userInfo?.employeeDetails?.employeeId;

  // Use the centralized absence filters hook (following leads pattern)
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
    handleDateRangeChange
  } = useAbsenceFilters(props);

  // State for pagination and sorting (following leads pattern)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortField, setSortField] = useState('');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [selectedAbsence, setSelectedAbsence] = useState<EnhancedAbsence | null>(null);
  const initialLoadDone = useRef(false);

  // Get absence data with search, sorting, and filters
  const { 
    absences, 
    total, 
    loading, 
    error, 
    hasMore, 
    loadMore, 
    loadPage,
    retry 
  } = useAbsenceListDataSimple({
    ...getFilters(),
    accessToken,
    orgUnitId: supervisorId
  });
  
  // Trigger initial data loading when component mounts (following leads pattern)
  useEffect(() => {
    if (!initialLoadDone.current && accessToken && supervisorId) {
      initialLoadDone.current = true;
      loadPage(currentPage, pageSize);
    }
  }, [accessToken, supervisorId, currentPage, pageSize]);

  // Trigger reload when search changes (following leads pattern)
  useEffect(() => {
    if (initialLoadDone.current) {
      setCurrentPage(1);
      loadPage(1, pageSize);
    }
  }, [search, pageSize]);

  // Trigger reload when filters change (following leads pattern)
  useEffect(() => {
    if (initialLoadDone.current) {
      setCurrentPage(1);
      loadPage(1, pageSize);
    }
  }, [JSON.stringify(selectedFilters), startDate, endDate, pageSize]);

  // Handle filter changes from the filter sidebar (following leads pattern)
  const handleFilterChange = useCallback((filterId: string, selected: boolean) => {
    selected ? addFilter(filterId) : removeFilter(filterId);
    setCurrentPage(1);
  }, [addFilter, removeFilter]);

  // Handle search changes (following leads pattern)
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setCurrentPage(1); // Reset to first page when searching
  }, [setSearch]);

  // Handle filter set changes (following leads pattern)
  const handleSetFilter = useCallback((filters: string[]) => {
    if (filters.length === 0) {
      resetFilters();
    } else {
      const removedFilters = selectedFilters.filter(f => !filters.includes(f));
      removedFilters.forEach(filterId => removeFilter(filterId));
    }
  }, [resetFilters, selectedFilters, removeFilter]);

  // Handle absence selection
  const handleSelectAbsence = useCallback((absence: EnhancedAbsence) => {
    setSelectedAbsence(absence);
  }, []);

  // Handle pagination change
  const handlePaginationChange = useCallback((page: number, newPageSize?: number) => {
    const targetPageSize = newPageSize || pageSize;
    setCurrentPage(page);
    setPageSize(targetPageSize);
    loadPage(page, targetPageSize);
  }, [pageSize, loadPage]);

  // Handle sorting change
  const handleSortingChange = useCallback((field: string, order: '' | 'ASC' | 'DESC') => {
    if (order === '') {
      setSortField('');
      setSortOrder('DESC');
      setCurrentPage(1);
    } else {
      setSortField(field);
      setSortOrder(order);
      setCurrentPage(1);
    }
    loadPage(1, pageSize);
  }, [pageSize, loadPage]);

  return (
    <div data-testid="absence-list-modern-content">
      <DataContainer
        dataControllerProps={{
          search,
          setSearch: handleSearchChange,
          debounceDelay: 500,
          filter: selectedFilters,
          setFilter: handleSetFilter,
          filterLabelMap,
          listTitle: (
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:flex gba:items-center gba:gap-2">
                <span>{getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_manager.absence_list_screen.title', 'Absences')}</span>
                <span className="gba:text-gray-500">({total})</span>
              </div>
            </div>
          ),
        }}
        dataFilterProps={{
          filterGroups,
          onFilterChange: handleFilterChange
        }}
        dataBody={
          <div data-testid="absence-table-container">
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
              pageSize={pageSize}
              currentPage={currentPage}
              sortField={sortField}
              sortOrder={sortOrder}
              onSelectAbsence={handleSelectAbsence}
              onPaginationChange={handlePaginationChange}
              onSortingChange={handleSortingChange}
              selectedAbsenceId={selectedAbsence?.id}
            />
          </div>
        }
      />
    </div>
  );
}; 