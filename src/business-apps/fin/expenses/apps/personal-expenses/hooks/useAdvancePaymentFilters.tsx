import React, { useState, useCallback, useMemo } from 'react';
import type { DataFilterGroup, DataFilter } from '@/components/data-filter/DataFilter';
import { useDebounce } from '@/common/hooks/useDebounce';
import { ExpenseStatus, getAdvancePaymentStatusDisplay } from '../utils';
import CompactRangeFilter from '../components/tabs/advance-payments-tab/CompactRangeFilter';

export interface UseAdvancePaymentFiltersReturn {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  debouncedSearchTerm: string;
  statusFilter: string[];
  setStatusFilter: (status: string[]) => void;
  amountRange: { min?: number; max?: number } | null;
  setAmountRange: (range: { min?: number; max?: number } | null) => void;
  advanceRange: { min?: number; max?: number } | null;
  setAdvanceRange: (range: { min?: number; max?: number } | null) => void;
  filterGroups: DataFilterGroup[];
  handleDataFilterChange: (filterId: string, selected: boolean) => void;
  filterLabelMap: Record<string, string>;
}

export const useAdvancePaymentFilters = (): UseAdvancePaymentFiltersReturn => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string[]>([ExpenseStatus.PREPARED, ExpenseStatus.PENDING]);
  const [amountRange, setAmountRange] = useState<{ min?: number; max?: number } | null>(null);
  const [advanceRange, setAdvanceRange] = useState<{ min?: number; max?: number } | null>(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const handleDataFilterChange = useCallback((filterId: string, isSelected: boolean) => {
    // Determine which filter group this belongs to
    if (filterId.startsWith('status-')) {
      const status = filterId.replace('status-', '');
      setStatusFilter(prevFilter => {
        if (isSelected) {
          if (!prevFilter.includes(status)) {
            return [...prevFilter, status];
          }
          return prevFilter;
        } else {
          return prevFilter.filter(s => s !== status);
        }
      });
    }
    // Note: Amount and advance ranges are now handled by custom components
  }, []);

  // Define the statuses that should be used for filtering with the correct mappings
  // These should match the actual status values in the database
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
  
  // Map of status to display label - using exact same labels as the table
  const statusDisplayMap: Partial<Record<ExpenseStatus, string>> = {
    [ExpenseStatus.PREPARED]: 'Prepared',
    [ExpenseStatus.CREATED]: 'Draft (Created)',
    [ExpenseStatus.ASSIGNED]: 'Assigned',
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
    
    // Status filters - map both filter IDs and raw status values
    availableFilterStatuses.forEach((status) => {
      const displayLabel = statusDisplayMap[status] || getAdvancePaymentStatusDisplay(status).label;
      // Map filter IDs (for DataFilter component)
      map[`status-${status}`] = displayLabel;
      // Map raw status values (for DataController pills)
      map[status] = displayLabel;
    });
    
    return map;
  }, []); // Empty dependency array since availableFilterStatuses is now stable

  // Create the custom components for range filters
  const amountRangeComponent = useMemo(() => (
    <CompactRangeFilter
      range={amountRange}
      onRangeChange={setAmountRange}
      currency="EUR"
      label="Amount Range"
      dataTestIdPrefix="amount-range"
    />
  ), [amountRange]);

  const advanceRangeComponent = useMemo(() => (
    <CompactRangeFilter
      range={advanceRange}
      onRangeChange={setAdvanceRange}
      currency="EUR"
      label="Advance Range"
      dataTestIdPrefix="advance-range"
    />
  ), [advanceRange]);

  // Create filter groups for the DataFilter component
  const filterGroups = useMemo<DataFilterGroup[]>(() => {
    const statusItems: DataFilter[] = availableFilterStatuses.map(
      (status) => ({
        id: `status-${status}`,
        label: filterLabelMap[`status-${status}`],
        selected: statusFilter.includes(status),
      })
    );

    return [
      {
        id: 'statusGroup',
        title: 'Status',
        filters: statusItems,
        selectionMode: 'multiple',
      },
      {
        id: 'amountGroup',
        title: 'Amount Range',
        customComponent: amountRangeComponent,
        hideSearch: true, // Hide search since we have custom component
      },
      {
        id: 'advanceGroup',
        title: 'Advance Range',
        customComponent: advanceRangeComponent,
        hideSearch: true, // Hide search since we have custom component
      },
    ];
  }, [filterLabelMap, statusFilter, amountRangeComponent, advanceRangeComponent]);

  return {
    searchTerm,
    setSearchTerm,
    debouncedSearchTerm,
    statusFilter,
    setStatusFilter,
    amountRange,
    setAmountRange,
    advanceRange,
    setAdvanceRange,
    filterGroups,
    handleDataFilterChange,
    filterLabelMap,
  };
}; 