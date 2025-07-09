import { useState, useCallback, useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

export interface FilterGroup {
  id: string;
  title: string;
  label: string;
  filters: Array<{ id: string; label: string; value: any }>;
}

export interface ContactFilters {
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

export const useContactFilters = (context: BusinessAppContextProps): ContactFilters => {
  const [search, setSearch] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [createdAfter, setCreatedAfter] = useState<string | undefined>();
  const [createdBefore, setCreatedBefore] = useState<string | undefined>();

  const filterGroups: FilterGroup[] = useMemo(() => [
    {
      id: 'contactType',
      title: 'Contact Type',
      label: 'Contact Type',
      filters: [
        { id: 'type-primary', label: 'Primary Contact', value: 'Primary' },
        { id: 'type-secondary', label: 'Secondary Contact', value: 'Secondary' },
        { id: 'type-technical', label: 'Technical Contact', value: 'Technical' },
        { id: 'type-financial', label: 'Financial Contact', value: 'Financial' },
        { id: 'type-executive', label: 'Executive Contact', value: 'Executive' }
      ]
    },
    {
      id: 'jobTitle',
      title: 'Job Title',
      label: 'Job Title',
      filters: [
        { id: 'title-ceo', label: 'CEO', value: 'CEO' },
        { id: 'title-cto', label: 'CTO', value: 'CTO' },
        { id: 'title-manager', label: 'Manager', value: 'Manager' },
        { id: 'title-director', label: 'Director', value: 'Director' },
        { id: 'title-analyst', label: 'Analyst', value: 'Analyst' },
        { id: 'title-consultant', label: 'Consultant', value: 'Consultant' }
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
          if (group.id === 'contactType') {
            if (!filters.contactTypes) filters.contactTypes = [];
            filters.contactTypes.push(filter.value);
          } else if (group.id === 'jobTitle') {
            if (!filters.jobTitles) filters.jobTitles = [];
            filters.jobTitles.push(filter.value);
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