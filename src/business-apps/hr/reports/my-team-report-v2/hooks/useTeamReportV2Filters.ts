import { useState, useCallback, useMemo } from 'react';
import { DataFilterGroup } from '@/components/data-filter/DataFilter';

// Interface for team report filters to use with API calls
export interface TeamReportFilter {
  position?: string[];
  location?: string[];
  employmentType?: string[];
  contractType?: string[];
  tenurePeriod?: string;
  exitStatus?: 'active' | 'inactive' | null;
}

// Interface for the return type of useTeamReportV2Filters
export interface UseTeamReportV2FiltersReturn {
  search: string;
  setSearch: (search: string) => void;
  selectedFilters: string[];
  filterGroups: DataFilterGroup[];
  filterLabelMap: Record<string, string>;
  addFilter: (filterId: string) => void;
  removeFilter: (filterId: string) => void;
  getFilters: () => TeamReportFilter;
  clearFilters: () => void;
}

/**
 * Hook to manage filter selection for team reports
 */
export interface FilterOption {
  id: string;
  name: string;
}

export const useTeamReportV2Filters = (
  uniquePositions: string[] = [],
  uniqueLocations: string[] = [],
  uniqueEmploymentTypes: string[] = [],
  uniqueContractTypes: string[] = []
): UseTeamReportV2FiltersReturn => {
  // State for search and selected filters
  const [search, setSearch] = useState<string>('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  // Define these as constants for stable references
  const TENURE_PERIOD_OPTIONS = ['lessThan3m', '3to6m', '6to12m', '1to3y', 'moreThan3y'];
  const EXIT_STATUS_OPTIONS = ['activeOnly', 'inactiveOnly'];
  
  // Define filter groups - memoized so they don't cause re-renders
  const filterGroups = useMemo<DataFilterGroup[]>(() => [
    {
      id: 'position',
      title: 'Position',
      filters: uniquePositions.map(position => ({
        id: `position:${position}`,
        label: position,
        selected: selectedFilters.includes(`position:${position}`)
      }))
    },
    {
      id: 'location',
      title: 'Location',
      filters: uniqueLocations.map(location => ({
        id: `location:${location}`,
        label: location,
        selected: selectedFilters.includes(`location:${location}`)
      }))
    },
    {
      id: 'employmentType',
      title: 'Employment Type',
      filters: uniqueEmploymentTypes.map(type => ({
        id: `employmentType:${type}`,
        label: type,
        selected: selectedFilters.includes(`employmentType:${type}`)
      }))
    },
    {
      id: 'contractType',
      title: 'Contract Type',
      filters: uniqueContractTypes.map(type => ({
        id: `contractType:${type}`,
        label: type,
        selected: selectedFilters.includes(`contractType:${type}`)
      }))
    },
    {
      id: 'tenurePeriod',
      title: 'Tenure Period',
      filters: [
        { id: 'lessThan3m', label: 'Less than 3 months', selected: selectedFilters.includes('lessThan3m') },
        { id: '3to6m', label: '3 to 6 months', selected: selectedFilters.includes('3to6m') },
        { id: '6to12m', label: '6 to 12 months', selected: selectedFilters.includes('6to12m') },
        { id: '1to3y', label: '1 to 3 years', selected: selectedFilters.includes('1to3y') },
        { id: 'moreThan3y', label: 'More than 3 years', selected: selectedFilters.includes('moreThan3y') }
      ]
    },
    {
      id: 'exitStatus',
      title: 'Status',
      filters: [
        { id: 'activeOnly', label: 'Active employees only', selected: selectedFilters.includes('activeOnly') },
        { id: 'inactiveOnly', label: 'Inactive employees only', selected: selectedFilters.includes('inactiveOnly') }
      ]
    }
  ], [selectedFilters, uniquePositions, uniqueLocations, uniqueEmploymentTypes, uniqueContractTypes]);
  
  // Build the filter label map dynamically
  const filterLabelMap = useMemo(() => {
    const labelMap: Record<string, string> = {
      'lessThan3m': 'Less than 3 months',
      '3to6m': '3 to 6 months',
      '6to12m': '6 to 12 months',
      '1to3y': '1 to 3 years',
      'moreThan3y': 'More than 3 years',
      'activeOnly': 'Active employees only',
      'inactiveOnly': 'Inactive employees only'
    };

    uniquePositions.forEach(position => {
      labelMap[`position:${position}`] = `Position: ${position}`;
    });

    uniqueLocations.forEach(location => {
      labelMap[`location:${location}`] = `Location: ${location}`;
    });

    uniqueEmploymentTypes.forEach(type => {
      labelMap[`employmentType:${type}`] = `Employment Type: ${type}`;
    });

    uniqueContractTypes.forEach(type => {
      labelMap[`contractType:${type}`] = `Contract Type: ${type}`;
    });

    return labelMap;
  }, [uniquePositions, uniqueLocations, uniqueEmploymentTypes, uniqueContractTypes]);
  
  // Add filter with proper dependency handling
  const addFilter = useCallback((filterId: string) => {
    setSelectedFilters(prev => {
      // Special handling for radio filter types (tenure period)
      if (TENURE_PERIOD_OPTIONS.includes(filterId)) {
        const withoutTenurePeriods = prev.filter(f => !TENURE_PERIOD_OPTIONS.includes(f));
        return [...withoutTenurePeriods, filterId];
      }
      
      // Special handling for exit status (active/inactive)
      if (EXIT_STATUS_OPTIONS.includes(filterId)) {
        const withoutExitStatus = prev.filter(f => !EXIT_STATUS_OPTIONS.includes(f));
        return [...withoutExitStatus, filterId];
      }
      
      // For multi-select filters, just add if not already selected
      if (prev.includes(filterId)) {
        return prev;
      } else {
        return [...prev, filterId];
      }
    });
  }, []);
  
  // Remove filter with proper dependency handling
  const removeFilter = useCallback((filterId: string) => {
    setSelectedFilters(prev => prev.filter(f => f !== filterId));
  }, []);
  
  // Clear all filters
  const clearFilters = useCallback(() => {
    setSelectedFilters([]);
    setSearch('');
  }, []);
  
  // Convert UI filters to API filter format
  const getFilters = useCallback((): TeamReportFilter => {
    // Map UI filter format to the expected API filter format
    const filter: TeamReportFilter = {};
    
    // Extract filters by category
    const positionFilters = selectedFilters
      .filter(f => f.startsWith('position:'))
      .map(f => f.replace('position:', ''));
    
    const locationFilters = selectedFilters
      .filter(f => f.startsWith('location:'))
      .map(f => f.replace('location:', ''));
    
    const employmentTypeFilters = selectedFilters
      .filter(f => f.startsWith('employmentType:'))
      .map(f => f.replace('employmentType:', ''));
    
    const contractTypeFilters = selectedFilters
      .filter(f => f.startsWith('contractType:'))
      .map(f => f.replace('contractType:', ''));
    
    const tenurePeriod = selectedFilters.find(f => TENURE_PERIOD_OPTIONS.includes(f));
    
    const exitStatus = selectedFilters.find(f => EXIT_STATUS_OPTIONS.includes(f));
    
    // Apply filters to the filter object
    if (positionFilters.length > 0) {
      filter.position = positionFilters;
    }
    
    if (locationFilters.length > 0) {
      filter.location = locationFilters;
    }
    
    if (employmentTypeFilters.length > 0) {
      filter.employmentType = employmentTypeFilters;
    }
    
    if (contractTypeFilters.length > 0) {
      filter.contractType = contractTypeFilters;
    }
    
    if (tenurePeriod) {
      filter.tenurePeriod = tenurePeriod;
    }
    
    if (exitStatus) {
      filter.exitStatus = exitStatus === 'activeOnly' ? 'active' : 'inactive';
    }
    
    return filter;
  }, [selectedFilters, uniquePositions, uniqueLocations, uniqueEmploymentTypes, uniqueContractTypes]);
  
  return {
    search,
    setSearch,
    selectedFilters,
    filterGroups,
    filterLabelMap,
    addFilter,
    removeFilter,
    clearFilters,
    getFilters
  };
};

export default useTeamReportV2Filters;
