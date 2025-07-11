import { useState, useMemo, useCallback } from 'react';
import { DataFilterGroup } from '@/components/data-filter/DataFilter';
import { ExpensePlanStatus } from '@/business-apps/fin/expenses/types/expensePlanStatus';

/**
 * Custom hook to manage filtering and searching logic for expense plans.
 * @returns An object containing filter state, handlers, and derived data.
 */
export const useExpensePlanFilters = () => {
  const [search, setSearch] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  const availableStatuses = useMemo(() => {
    return Object.values(ExpensePlanStatus);
  }, []);

  const filterGroups = useMemo<DataFilterGroup[]>(() => [
    {
      id: 'status',
      title: 'Status',
      filters: availableStatuses.map(status => ({
        id: status,
        label: status.charAt(0) + status.slice(1).toLowerCase(),
        selected: selectedFilters.includes(status),
      })),
    },
  ], [availableStatuses, selectedFilters]);

  const graphqlFilters = useMemo(() => {
    const conditions: any[] = [];

    if (search) {
      conditions.push({
        _or: [
          { code: { _ilike: `%${search}%` } },
          { title: { _ilike: `%${search}%` } },
        ],
      });
    }

    if (selectedFilters.length > 0) {
      conditions.push({ status: { _in: selectedFilters } });
    }

    return { _and: conditions.length > 0 ? conditions : [{}] };
  }, [search, selectedFilters]);

  const clearFilters = useCallback(() => {
    setSelectedFilters([]);
  }, []);

  const setFilters = useCallback((filters: string[]) => {
    setSelectedFilters(filters);
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
    graphqlFilters,
    filterGroups,
    handleFilterChange,
    setFilters,
    clearFilters,
  };
};
