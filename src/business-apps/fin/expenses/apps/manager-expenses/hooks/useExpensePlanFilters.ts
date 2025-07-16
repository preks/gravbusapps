import { useState, useMemo, useCallback } from 'react';
import type { DataFilterGroup, DataFilter } from '@/components/data-filter';
import { ExpenseStatus, getExpensePlanStatusDisplay } from '../utils';
import { useDebounce } from '@/common/hooks/useDebounce'; 

export interface UseExpensePlanFiltersReturn {
  searchTerm: string; 
  setSearchTerm: (term: string) => void; 
  debouncedSearchTerm: string; 
  statusFilter: ExpenseStatus[]; 
  setStatusFilter: (status: ExpenseStatus[]) => void; 
  filterGroups: DataFilterGroup[]; 
  handleDataFilterChange: (filterId: string, selected: boolean) => void; 
  filterLabelMap: Record<string, string>; 
}

export const useExpensePlanFilters = (): UseExpensePlanFiltersReturn => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus[]>([]);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const handleStatusFilterChange = useCallback((newStatus: string | null) => {
    if (newStatus === null || newStatus === 'all_statuses') {
      setStatusFilter([]);
    } else if (Object.values(ExpenseStatus).includes(newStatus as ExpenseStatus)) {
      setStatusFilter([newStatus as ExpenseStatus]);
    } else {
      // Unknown status, default to empty array (all statuses) and log a warning.
      setStatusFilter([]);
      console.warn(`Unknown status filter applied: ${newStatus}. Defaulting to all statuses.`);
    }
  }, [setStatusFilter]);

  const handleDataFilterChange = useCallback((filterId: string, isSelected: boolean) => {
    if (filterId === 'all_statuses') {
      if (isSelected) {
        setStatusFilter([]);
      }
      return;
    }

    if (isSelected) {
      // Add the status to the filter array
      setStatusFilter(prev => [...prev, filterId as ExpenseStatus]);
    } else {
      // Remove the status from the filter array
      setStatusFilter(prev => prev.filter(status => status !== filterId));
    }
  }, []);

  // Define the statuses that have explicit mappings and should be used for filtering
  const availableFilterStatuses: ExpenseStatus[] = [
    ExpenseStatus.CREATED,
    ExpenseStatus.PENDING,
    ExpenseStatus.REJECTED,
    ExpenseStatus.APPROVED,
    ExpenseStatus.ASSIGNED,
    ExpenseStatus.BOOKED,
    ExpenseStatus.VERIFIED,
    ExpenseStatus.CLOSED,
  ];

  const filterLabelMap: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {
      all_statuses: 'All Statuses', // Hardcoded string
    };
    availableFilterStatuses.forEach((status) => {
      // Use custom labels for BOOKED and VERIFIED to distinguish them
      if (status === ExpenseStatus.BOOKED) {
        map[status] = 'In Transit (Booked)';
      } else if (status === ExpenseStatus.VERIFIED) {
        map[status] = 'In Transit (Verified)';
      } else {
        map[status] = getExpensePlanStatusDisplay(status).label;
      }
    });
    return map;
  }, [availableFilterStatuses]); // Added dependency

  const filterGroups = useMemo<DataFilterGroup[]>(() => {
    const statusItems: DataFilter[] = availableFilterStatuses.map(
      (status) => ({
        id: status,
        label: filterLabelMap[status],
        selected: statusFilter.includes(status),
        group: 'statusGroup', // Added group property
      })
    );

    return [
      {
        id: 'statusGroup',
        title: 'Status', // Hardcoded string
        filters: [
          { id: 'all_statuses', label: filterLabelMap.all_statuses, selected: statusFilter.length === 0, group: 'statusGroup' },
          ...statusItems,
        ],
        selectionMode: 'multiple',
      },
    ];
  }, [filterLabelMap, statusFilter, availableFilterStatuses]); // Added availableFilterStatuses dependency

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
