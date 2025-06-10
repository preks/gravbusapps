import { useState, useMemo, useCallback } from 'react';
import type { DataFilterGroup, DataFilter } from '@/components/data-filter';
import { ExpenseStatus, getExpensePlanStatusDisplay } from '../utils';
import { useDebounce } from '@/common/hooks/useDebounce'; 

export interface UseExpensePlanFiltersReturn {
  searchTerm: string; 
  setSearchTerm: (term: string) => void; 
  debouncedSearchTerm: string; 
  statusFilter: ExpenseStatus | null; 
  setStatusFilter: (status: ExpenseStatus | null) => void; 
  filterGroups: DataFilterGroup[]; 
  handleDataFilterChange: (filterId: string, selected: boolean) => void; 
  filterLabelMap: Record<string, string>; 
}

export const useExpensePlanFilters = (): UseExpensePlanFiltersReturn => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | null>(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const handleStatusFilterChange = useCallback((newStatus: string | null) => {
    if (newStatus === null || newStatus === 'all_statuses') {
      setStatusFilter(null);
    } else if (Object.values(ExpenseStatus).includes(newStatus as ExpenseStatus)) {
      setStatusFilter(newStatus as ExpenseStatus);
    } else {
      // Unknown status, default to null (all statuses) and log a warning.
      setStatusFilter(null);
      console.warn(`Unknown status filter applied: ${newStatus}. Defaulting to all statuses.`);
    }
  }, [setStatusFilter]);

  const handleDataFilterChange = useCallback((filterId: string, isSelected: boolean) => {
    if (isSelected) {
      // A filter item was selected, so apply this filter.
      handleStatusFilterChange(filterId);
    } else if (statusFilter === filterId) {
      // A filter item was deselected, AND it was the currently active one.
      // Revert to 'all_statuses' by passing null to the status change handler.
      handleStatusFilterChange(null);
    }
    // If a filter item was deselected but it was NOT the active one, no state change is needed here,
    // as the active filter remains unchanged.
  }, [statusFilter, handleStatusFilterChange]);

  // Define the statuses that have explicit mappings and should be used for filtering
  const availableFilterStatuses: ExpenseStatus[] = [
    ExpenseStatus.PENDING,
    ExpenseStatus.APPROVED,
    ExpenseStatus.RETURNED,
    ExpenseStatus.CLOSED,
  ];

  const filterLabelMap: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {
      all_statuses: 'All Statuses', // Hardcoded string
    };
    availableFilterStatuses.forEach((status) => {
      map[status] = getExpensePlanStatusDisplay(status).label;
    });
    return map;
  }, []); // Removed t from dependency array

  const filterGroups = useMemo<DataFilterGroup[]>(() => {
    const statusItems: DataFilter[] = availableFilterStatuses.map(
      (status) => ({
        id: status,
        label: filterLabelMap[status],
        selected: statusFilter === status,
        group: 'statusGroup', // Added group property
      })
    );

    return [
      {
        id: 'statusGroup',
        title: 'Status', // Hardcoded string
        filters: [
          { id: 'all_statuses', label: filterLabelMap.all_statuses, selected: statusFilter === null, group: 'statusGroup' },
          ...statusItems,
        ],
        selectionMode: 'single',
      },
    ];
  }, [filterLabelMap, statusFilter]); // Removed t from dependency array

  return {
    searchTerm,
    setSearchTerm,
    debouncedSearchTerm,
    statusFilter,
    setStatusFilter,
    filterGroups,
    handleDataFilterChange,
    filterLabelMap,
  };
};
