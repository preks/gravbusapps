import { useState, useCallback, useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

export interface FilterGroup {
  id: string;
  label: string;
  filters: Array<{ id: string; label: string; value: any }>;
}

export interface AccountFilters {
  search: string;
  setSearch: (search: string) => void;
  selectedFilters: string[];
  filterGroups: FilterGroup[];
  filterLabelMap: Record<string, string>;
  addFilter: (filterId: string) => void;
  removeFilter: (filterId: string) => void;
  getFilters: () => any;
  createdAfter?: string;
  createdBefore?: string;
  handleDateRangeChange: (after?: string, before?: string) => void;
}

export const useAccountFilters = (context: BusinessAppContextProps): AccountFilters => {
  const [search, setSearch] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [createdAfter, setCreatedAfter] = useState<string | undefined>();
  const [createdBefore, setCreatedBefore] = useState<string | undefined>();

  const filterGroups: FilterGroup[] = useMemo(() => [
    {
      id: 'accountType',
      label: 'Account Type',
      filters: [
        { id: 'type-customer', label: 'Customer', value: 'Customer' },
        { id: 'type-prospect', label: 'Prospect', value: 'Prospect' },
        { id: 'type-partner', label: 'Partner', value: 'Partner' },
        { id: 'type-competitor', label: 'Competitor', value: 'Competitor' }
      ]
    },
    {
      id: 'industry',
      label: 'Industry',
      filters: [
        { id: 'industry-technology', label: 'Technology', value: 'Technology' },
        { id: 'industry-finance', label: 'Finance', value: 'Finance' },
        { id: 'industry-healthcare', label: 'Healthcare', value: 'Healthcare' },
        { id: 'industry-manufacturing', label: 'Manufacturing', value: 'Manufacturing' },
        { id: 'industry-retail', label: 'Retail', value: 'Retail' }
      ]
    }
  ], []);

  const filterLabelMap: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {};
    filterGroups.forEach(group => {
      group.filters.forEach(filter => {
        map[filter.id] = filter.label;
      });
    });
    return map;
  }, [filterGroups]);

  const addFilter = useCallback((filterId: string) => {
    setSelectedFilters(prev => {
      if (!prev.includes(filterId)) {
        return [...prev, filterId];
      }
      return prev;
    });
  }, []);

  const removeFilter = useCallback((filterId: string) => {
    setSelectedFilters(prev => prev.filter(id => id !== filterId));
  }, []);

  const handleDateRangeChange = useCallback((after?: string, before?: string) => {
    setCreatedAfter(after);
    setCreatedBefore(before);
  }, []);

  const getFilters = useCallback(() => {
    const filters: any = {};
    
    if (search) {
      filters.search = search;
    }

    if (createdAfter) {
      filters.createdAfter = createdAfter;
    }

    if (createdBefore) {
      filters.createdBefore = createdBefore;
    }

    // Process selected filters
    selectedFilters.forEach(filterId => {
      for (const group of filterGroups) {
        const filter = group.filters.find(f => f.id === filterId);
        if (filter) {
          if (group.id === 'accountType') {
            if (!filters.accountTypes) filters.accountTypes = [];
            filters.accountTypes.push(filter.value);
          } else if (group.id === 'industry') {
            if (!filters.industries) filters.industries = [];
            filters.industries.push(filter.value);
          }
          break;
        }
      }
    });

    return filters;
  }, [search, selectedFilters, createdAfter, createdBefore, filterGroups]);

  return {
    search,
    setSearch,
    selectedFilters,
    filterGroups,
    filterLabelMap,
    addFilter,
    removeFilter,
    getFilters,
    createdAfter,
    createdBefore,
    handleDateRangeChange
  };
}; 