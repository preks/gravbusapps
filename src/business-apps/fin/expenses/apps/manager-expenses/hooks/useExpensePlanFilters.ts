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

// Move outside component to prevent re-creation on every render
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

export const useExpensePlanFilters = (): UseExpensePlanFiltersReturn => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus[]>([]);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const handleDataFilterChange = useCallback((filterId: string, isSelected: boolean) => {
    setStatusFilter(prevFilter => {
      if (isSelected) {
        // Add the status if it's not already in the array
        if (!prevFilter.includes(filterId as ExpenseStatus)) {
          return [...prevFilter, filterId as ExpenseStatus];
        }
        return prevFilter;
      } else {
        // Remove the status from the array
        return prevFilter.filter(status => status !== filterId);
      }
    });
  }, []);

  // Memoize filterLabelMap with stable dependencies
  const filterLabelMap: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {};
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
  }, []); // Empty dependency array since availableFilterStatuses is now stable

  const filterGroups = useMemo<DataFilterGroup[]>(() => {
    const statusItems: DataFilter[] = availableFilterStatuses.map(
      (status) => ({
        id: status,
        label: filterLabelMap[status],
        selected: statusFilter.includes(status),
        group: 'statusGroup',
      })
    );

    return [
      {
        id: 'statusGroup',
        title: 'Status',
        filters: statusItems,
        selectionMode: 'multiple',
      },
    ];
  }, [filterLabelMap, statusFilter]); // Removed availableFilterStatuses dependency

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
