import React, { useState, useMemo, useCallback } from 'react';
import { DataFilterGroup } from '@/components/data-filter/DataFilter';
import { ExpenseStatus } from '../utils';
import { DateRangeFilter } from '../components/tabs/expense-plans-tab/DateRangeFilter';
import { EndDateRangeFilter } from '../components/tabs/expense-plans-tab/EndDateRangeFilter';
import PlanDateRangeFilter from '../components/tabs/expense-plans-tab/PlanDateRangeFilter';

export enum DataFilterType {
  CHECKBOX_GROUP = 'checkbox-group',
  DATE_RANGE = 'date-range',
  NUMBER_RANGE = 'number-range',
}

export const useExpensePlanFilters = () => {
  const [search, setSearch] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [startDateRange, setStartDateRange] = useState<[Date | null, Date | null] | null>(null);
  const [endDateRange, setEndDateRange] = useState<[Date | null, Date | null] | null>(null);
  const [planDateRange, setPlanDateRange] = useState<[Date | null, Date | null] | null>(null);
 
  const filterGroups = useMemo<DataFilterGroup[]>(() => [
    {
      id: 'planDateRange',
      title: 'Filter by Plan Date',
      type: DataFilterType.DATE_RANGE,
      customComponent: React.createElement(PlanDateRangeFilter, {
        planDateRange: planDateRange,
        onDateRangeChange: setPlanDateRange,
        placeholder: ['Start date', 'End date']
      }),
      hideSearch: true,
    },
    {
      id: 'startDateRange',
      title: 'Filter by Start Date',
      type: DataFilterType.DATE_RANGE,
      customComponent: React.createElement(DateRangeFilter, {
        startDateRange: startDateRange,
        onDateRangeChange: setStartDateRange,
        placeholder: ['Start date', 'End date']
      }),
      hideSearch: true,
    },
    {
      id: 'endDateRange',
      title: 'Filter by End Date Range',
      type: DataFilterType.DATE_RANGE,
      customComponent: React.createElement(EndDateRangeFilter, {
        endDateRange: endDateRange,
        onDateRangeChange: setEndDateRange,
        placeholder: ['Start date', 'End date']
      }),
      hideSearch: true,
    },
    {
      id: 'status',
      title: 'Filter by Status',
      type: DataFilterType.CHECKBOX_GROUP,
      filters: [
        { id: ExpenseStatus.PREPARED, label: 'Prepared', selected: selectedFilters.includes(ExpenseStatus.PREPARED) },
        { id: ExpenseStatus.CREATED, label: 'Draft (Created)', selected: selectedFilters.includes(ExpenseStatus.CREATED) },
        { id: ExpenseStatus.PENDING, label: 'In Approval (Pending)', selected: selectedFilters.includes(ExpenseStatus.PENDING) },
        { id: ExpenseStatus.ASSIGNED, label: 'Assigned', selected: selectedFilters.includes(ExpenseStatus.ASSIGNED) },
        { id: ExpenseStatus.APPROVED, label: 'Approved', selected: selectedFilters.includes(ExpenseStatus.APPROVED) },
        { id: ExpenseStatus.REJECTED, label: 'Revision Required (Rejected)', selected: selectedFilters.includes(ExpenseStatus.REJECTED) },
        { id: ExpenseStatus.VERIFIED, label: 'In Transit (Verified)', selected: selectedFilters.includes(ExpenseStatus.VERIFIED) },
        { id: ExpenseStatus.BOOKED, label: 'In Transit (Booked)', selected: selectedFilters.includes(ExpenseStatus.BOOKED) },
        { id: ExpenseStatus.PAID, label: 'Paid', selected: selectedFilters.includes(ExpenseStatus.PAID) },
        { id: ExpenseStatus.CLOSED, label: 'Closed', selected: selectedFilters.includes(ExpenseStatus.CLOSED) },
        { id: ExpenseStatus.TRANSFERRED, label: 'In Transit (Transferred)', selected: selectedFilters.includes(ExpenseStatus.TRANSFERRED) },
      ],
    },
  
  ], [selectedFilters, startDateRange, endDateRange, planDateRange]);

  /**
   * Returns the current filters as an object for API queries (GraphQL/REST)
   */
  const getFilters = useCallback(() => {
    const conditions: any[] = [];

    if (search) {
      conditions.push({ _or: [
        { code: { _ilike: `%${search}%` } },
        { title: { _ilike: `%${search}%` } }
      ] });
    }
    if (selectedFilters.length > 0) {
      conditions.push({ status: { _in: selectedFilters } });
    }
    if (planDateRange?.[0]) {
      conditions.push({ planDate: { _gte: planDateRange[0] } });
    }
    if (planDateRange?.[1]) {
      conditions.push({ planDate: { _lte: planDateRange[1] } });
    }
    if (startDateRange?.[0]) {
      conditions.push({ startDate: { _gte: startDateRange[0] } });
    }
    if (startDateRange?.[1]) {
      conditions.push({ startDate: { _lte: startDateRange[1] } });
    }
    if (endDateRange?.[0]) {
      conditions.push({ endDate: { _gte: endDateRange[0] } });
    }
    if (endDateRange?.[1]) {
      conditions.push({ endDate: { _lte: endDateRange[1] } });
    }

    // Always exclude DISCARDED plans at backend level for correct pagination
    conditions.push({ status: { _neq: 'DISCARDED' } });
    return { _and: conditions.length > 0 ? conditions : [{}] };

  }, [search, selectedFilters, planDateRange, startDateRange, endDateRange]);

  const clearFilters = useCallback(() => {
    setSelectedFilters([]);
    setStartDateRange(null);
    setEndDateRange(null);
    setPlanDateRange(null);
    setSearch('');
  }, []);

  const handleFilterChange = useCallback((filterId: string, selected: boolean) => {
    setSelectedFilters(prev =>
      selected ? [...prev, filterId] : prev.filter(id => id !== filterId)
    );
  }, []);

  return {
    search,
    setSearch,
    selectedFilters,
    setFilters: setSelectedFilters,
    filterGroups,
    handleFilterChange,
    clearFilters,
    getFilters,
    setStartDateRange,
    setEndDateRange,
    setPlanDateRange,
  };
};
