import { useState, useCallback, useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

export interface FilterGroup {
  id: string;
  title: string; // Changed from label to title to match DataFilterGroup
  filters: Array<{ id: string; label: string; value: any; selected: boolean }>;
}

export interface OpportunityFilters {
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

export const useOpportunityFilters = (context: BusinessAppContextProps): OpportunityFilters => {
  const [search, setSearch] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [createdAfter, setCreatedAfter] = useState<string | undefined>();
  const [createdBefore, setCreatedBefore] = useState<string | undefined>();

  const filterGroups: FilterGroup[] = useMemo(() => [
    {
      id: 'stage',
      title: 'Stage', // Changed from label to title
      filters: [
        { id: 'stage-qualification', label: 'Qualification', value: 'Qualification', selected: false },
        { id: 'stage-needs-analysis', label: 'Needs Analysis', value: 'Needs Analysis', selected: false },
        { id: 'stage-proposal', label: 'Proposal', value: 'Proposal', selected: false },
        { id: 'stage-negotiation', label: 'Negotiation', value: 'Negotiation', selected: false },
        { id: 'stage-closed-won', label: 'Closed Won', value: 'Closed Won', selected: false },
        { id: 'stage-closed-lost', label: 'Closed Lost', value: 'Closed Lost', selected: false }
      ]
    },
    {
      id: 'winningChance',
      title: 'Winning Chance',
      label: 'Winning Chance',
      filters: [
        { id: 'chance-high', label: 'High (75-100%)', value: { min: 75, max: 100 }, selected: false },
        { id: 'chance-medium', label: 'Medium (50-74%)', value: { min: 50, max: 74 }, selected: false },
        { id: 'chance-low', label: 'Low (25-49%)', value: { min: 25, max: 49 }, selected: false },
        { id: 'chance-very-low', label: 'Very Low (0-24%)', value: { min: 0, max: 24 }, selected: false }
      ]
    },
    {
      id: 'estimatedAmount',
      title: 'Deal Size',
      label: 'Deal Size',
      filters: [
        { id: 'amount-large', label: 'Large (>$100K)', value: { min: 100000 }, selected: false },
        { id: 'amount-medium', label: 'Medium ($50K-$100K)', value: { min: 50000, max: 100000 }, selected: false },
        { id: 'amount-small', label: 'Small ($10K-$50K)', value: { min: 10000, max: 50000 }, selected: false },
        { id: 'amount-micro', label: 'Micro (<$10K)', value: { max: 10000 }, selected: false }
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
          if (group.id === 'stage') {
            if (!filters.stages) filters.stages = [];
            filters.stages.push(filter.value);
          } else if (group.id === 'winningChance') {
            if (!filters.winningChanceRanges) filters.winningChanceRanges = [];
            filters.winningChanceRanges.push(filter.value);
          } else if (group.id === 'estimatedAmount') {
            if (!filters.amountRanges) filters.amountRanges = [];
            filters.amountRanges.push(filter.value);
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