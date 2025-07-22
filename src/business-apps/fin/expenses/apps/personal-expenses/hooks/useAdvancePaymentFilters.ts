import { useState, useCallback, useMemo } from 'react';
import type { DataFilterGroup, DataFilter } from '@/components/data-filter/DataFilter';
import { useDebounce } from '@/common/hooks/useDebounce';
import { ExpenseStatus, getAdvancePaymentStatusDisplay } from '../utils';

export interface UseAdvancePaymentFiltersReturn {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  debouncedSearchTerm: string;
  statusFilter: string[];
  setStatusFilter: (status: string[]) => void;
  filterGroups: DataFilterGroup[];
  handleDataFilterChange: (filterId: string, selected: boolean) => void;
  filterLabelMap: Record<string, string>;
}

export const useAdvancePaymentFilters = (): UseAdvancePaymentFiltersReturn => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const handleDataFilterChange = useCallback((filterId: string, isSelected: boolean) => {
    setStatusFilter(prevFilter => {
      if (isSelected) {
        // Add the status if it's not already in the array
        if (!prevFilter.includes(filterId)) {
          return [...prevFilter, filterId];
        }
        return prevFilter;
      } else {
        // Remove the status from the array
        return prevFilter.filter(status => status !== filterId);
      }
    });
  }, []);

  // Define the statuses that should be used for filtering with the correct mappings
  const availableFilterStatuses: ExpenseStatus[] = [
    ExpenseStatus.PREPARED,
    ExpenseStatus.CREATED,
    ExpenseStatus.ASSIGNED,
    ExpenseStatus.PENDING,
    ExpenseStatus.APPROVED,
    ExpenseStatus.VERIFIED,
    ExpenseStatus.BOOKED,
    ExpenseStatus.TRANSFERRED,
    ExpenseStatus.PAID,
    ExpenseStatus.REJECTED,
    ExpenseStatus.CLOSED,
  ];
  
  // Map of status to display label with backend labels in parentheses
  const statusDisplayMap: Partial<Record<ExpenseStatus, string>> = {
    [ExpenseStatus.PREPARED]: 'Prepared',
    [ExpenseStatus.CREATED]: 'Draft (Created)',
    [ExpenseStatus.ASSIGNED]: 'Assigned (Assigned)',
    [ExpenseStatus.PENDING]: 'In Approval (Pending)',
    [ExpenseStatus.APPROVED]: 'In Transit (Approved)',
    [ExpenseStatus.VERIFIED]: 'In Transit (Verified)',
    [ExpenseStatus.BOOKED]: 'In Transit (Booked)',
    [ExpenseStatus.TRANSFERRED]: 'In Transit (Transferred)',
    [ExpenseStatus.PAID]: 'Paid',
    [ExpenseStatus.REJECTED]: 'Revision Required (Rejected)',
    [ExpenseStatus.CLOSED]: 'Closed',
  };

  // Create a mapping of filter IDs to their display labels
  const filterLabelMap = useMemo(() => {
    const map: Record<string, string> = {};
    
    availableFilterStatuses.forEach((status) => {
      // Use the custom display map if available, otherwise get from getAdvancePaymentStatusDisplay
      map[status] = statusDisplayMap[status] || getAdvancePaymentStatusDisplay(status).label;
    });
    
    return map;
  }, []); // Empty dependency array since availableFilterStatuses is now stable

  // Create filter groups for the DataFilter component
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