import { useState, useCallback, useMemo } from 'react';
import type { DataFilterGroup, DataFilter } from '@/components/data-filter/DataFilter';
import { useDebounce } from '@/common/hooks/useDebounce';
import { ExpenseStatus, getAdvancePaymentStatusDisplay } from '../utils';

export interface UseAdvancePaymentFiltersReturn {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  debouncedSearchTerm: string;
  statusFilter: string | null;
  setStatusFilter: (status: string | null) => void;
  filterGroups: DataFilterGroup[];
  handleDataFilterChange: (filterId: string, selected: boolean) => void;
  filterLabelMap: Record<string, string>;
}

export const useAdvancePaymentFilters = (): UseAdvancePaymentFiltersReturn => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const handleStatusFilterChange = useCallback((newStatus: string | null) => {
    if (newStatus === null || newStatus === 'all_statuses') {
      setStatusFilter(null);
    } else {
      setStatusFilter(newStatus);
    }
  }, [setStatusFilter]);

  const handleDataFilterChange = useCallback((filterId: string, isSelected: boolean) => {
    if (isSelected) {
      handleStatusFilterChange(filterId);
    } else if (statusFilter === filterId) {
      handleStatusFilterChange(null);
    }
  }, [statusFilter, handleStatusFilterChange]);

  // Define the statuses that should be used for filtering, grouped by their display labels
  const availableFilterStatuses: ExpenseStatus[] = [
    ExpenseStatus.PENDING,       // Shows as "Approval Required"
    ExpenseStatus.APPROVED,      // Shows as "In Transit" (grouped with VERIFIED, BOOKED, TRANSFERRED)
    ExpenseStatus.PAID,          // Shows as "Paid"
    ExpenseStatus.RETURNED,      // Shows as "In Revision"
    ExpenseStatus.CLOSED,        // Shows as "Closed"
  ];
  
  // Map of status to display label (for statuses that have unique labels)
  const statusDisplayMap: Partial<Record<ExpenseStatus, string>> = {
    [ExpenseStatus.APPROVED]: 'In Transit',
  };

  // Create a mapping of filter IDs to their display labels
  const filterLabelMap = useMemo(() => {
    const map: Record<string, string> = {
      all_statuses: 'All Statuses',
    };
    
    availableFilterStatuses.forEach((status) => {
      // Use the custom display map if available, otherwise get from getAdvancePaymentStatusDisplay
      map[status] = statusDisplayMap[status] || getAdvancePaymentStatusDisplay(status).label;
    });
    
    return map;
  }, [availableFilterStatuses]);

  // Create filter groups for the DataFilter component
  const filterGroups = useMemo<DataFilterGroup[]>(() => {
    const statusItems: DataFilter[] = availableFilterStatuses.map(
      (status) => ({
        id: status,
        label: filterLabelMap[status],
        selected: statusFilter === status,
        group: 'statusGroup',
      })
    );

    return [
      {
        id: 'statusGroup',
        title: 'Status',
        filters: [
          { 
            id: 'all_statuses', 
            label: filterLabelMap.all_statuses, 
            selected: statusFilter === null, 
            group: 'statusGroup' 
          },
          ...statusItems,
        ],
        selectionMode: 'single',
      },
    ];
  }, [availableFilterStatuses, statusFilter, filterLabelMap]);

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
