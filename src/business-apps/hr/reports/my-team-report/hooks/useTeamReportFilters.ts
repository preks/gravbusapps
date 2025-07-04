import { useState, useCallback, useMemo } from 'react';
import { DataFilterGroup } from '@/components/data-filter/DataFilter';

// Interface for team report filters to use with API calls
export interface TeamReportFilter {
  position?: string[];
  location?: string[];
  employmentType?: string[];
  contractType?: string[];
  tenurePeriod?: string[];
  exitStatus?: 'active' | 'inactive' | null;
}

// Interface for the return type of useTeamReportFilters
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

export const useTeamReportFilters = (
  uniquePositions: string[] = [],
  uniqueLocations: string[] = [],
  uniqueEmploymentTypes: string[] = [],
  uniqueContractTypes: string[] = []
): UseTeamReportV2FiltersReturn => {
  // State for search and selected filters
  const [search, setSearch] = useState<string>('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  // Define these as constants for stable references
  const TENURE_OPTIONS = [
    { id: '0-1y', label: '0-1 years' },
    { id: '1-3y', label: '1-3 years' },
    { id: '3-5y', label: '3-5 years' },
    { id: '5-10y', label: '5-10 years' },
    { id: '10+y', label: '10+ years' },
  ];
  const TENURE_OPTION_IDS = TENURE_OPTIONS.map(o => o.id);
  const EXIT_STATUS_OPTIONS = ['activeOnly', 'inactiveOnly'];
  
  // Define filter groups - memoized so they don't cause re-renders
  const filterGroups = useMemo<DataFilterGroup[]>(() => {
    const SEARCH_THRESHOLD = 10;
    const groups: DataFilterGroup[] = [];

    // Helper function to create a backendSearch implementation for local data
    const createSearchHandler = (
      prefix: string,
      allItems: string[]
    ) => (search: string) => {
      const selectedForGroup = selectedFilters
        .filter(f => f.startsWith(`${prefix}:`))
        .map(f => f.replace(`${prefix}:`, ''));

      // If no search term is provided...
      if (!search) {
        // If there are selected filters, show them.
        if (selectedForGroup.length > 0) {
          const filters = selectedForGroup.map(item => ({
            id: `${prefix}:${item}`,
            label: item,
            selected: true,
          }));
          return { filters, loading: false, error: null };
        }
        // Otherwise, show a loading state to prompt user to search.
        return { filters: [], loading: true, error: null };
      }

      // If a search term is provided, find matches.
      const matchingItems = allItems.filter(item =>
        item.toLowerCase().includes(search.toLowerCase())
      );

      // Always include selected items in the results.
      const allItemsToShow = [...new Set([...selectedForGroup, ...matchingItems])];

      const filters = allItemsToShow.map(item => ({
        id: `${prefix}:${item}`,
        label: item,
        selected: selectedFilters.includes(`${prefix}:${item}`),
      }));

      return { filters, loading: false, error: null };
    };

    // Position
    if (uniquePositions.length > SEARCH_THRESHOLD) {
      groups.push({
        id: 'position',
        title: 'Position',
        backendSearch: createSearchHandler('position', uniquePositions),
      });
    } else {
      groups.push({
        id: 'position',
        title: 'Position',
        filters: uniquePositions.map(position => ({
          id: `position:${position}`,
          label: position,
          selected: selectedFilters.includes(`position:${position}`),
        })),
      });
    }

    // Location
    if (uniqueLocations.length > SEARCH_THRESHOLD) {
      groups.push({
        id: 'location',
        title: 'Location',
        backendSearch: createSearchHandler('location', uniqueLocations),
      });
    } else {
      groups.push({
        id: 'location',
        title: 'Location',
        filters: uniqueLocations.map(location => ({
          id: `location:${location}`,
          label: location,
          selected: selectedFilters.includes(`location:${location}`),
        })),
      });
    }

    // Employment Type
    if (uniqueEmploymentTypes.length > SEARCH_THRESHOLD) {
      groups.push({
        id: 'employmentType',
        title: 'Employment Type',
        backendSearch: createSearchHandler('employmentType', uniqueEmploymentTypes),
      });
    } else {
      groups.push({
        id: 'employmentType',
        title: 'Employment Type',
        filters: uniqueEmploymentTypes.map(type => ({
          id: `employmentType:${type}`,
          label: type,
          selected: selectedFilters.includes(`employmentType:${type}`),
        })),
      });
    }

    // Contract Type
    if (uniqueContractTypes.length > SEARCH_THRESHOLD) {
      groups.push({
        id: 'contractType',
        title: 'Contract Type',
        backendSearch: createSearchHandler('contractType', uniqueContractTypes),
      });
    } else {
      groups.push({
        id: 'contractType',
        title: 'Contract Type',
        filters: uniqueContractTypes.map(type => ({
          id: `contractType:${type}`,
          label: type,
          selected: selectedFilters.includes(`contractType:${type}`),
        })),
      });
    }

    const tenureSearchHandler = (search: string) => {
      const allItems = TENURE_OPTIONS;
      let filteredItems = allItems;

      if (search) {
        filteredItems = allItems.filter(item => {
          const searchTerm = search.toLowerCase();
          return item.label.toLowerCase().includes(searchTerm) || item.id.toLowerCase().includes(searchTerm);
        });
      }

      const filters = filteredItems.map(item => ({
        id: item.id,
        label: item.label,
        selected: selectedFilters.includes(item.id),
      }));

      return { filters, loading: false, error: null };
    };

    // Tenure
    groups.push({
      id: 'tenure',
      title: 'Tenure',
      backendSearch: tenureSearchHandler,
    });

    // Status (Active/Inactive)
    // groups.push({
    //   id: 'exitStatus',
    //   title: 'Status',
    //   filters: [
    //     { id: 'activeOnly', label: 'Active employees only', selected: selectedFilters.includes('activeOnly') },
    //     { id: 'inactiveOnly', label: 'Inactive employees only', selected: selectedFilters.includes('inactiveOnly') },
    //   ],
    // });

    return groups;
  }, [selectedFilters, uniquePositions, uniqueLocations, uniqueEmploymentTypes, uniqueContractTypes]);
  
  // Build the filter label map dynamically
  const filterLabelMap = useMemo(() => {
    const labelMap: Record<string, string> = {
      'activeOnly': 'Active employees only',
      'inactiveOnly': 'Inactive employees only'
    };

    TENURE_OPTIONS.forEach(option => {
      labelMap[option.id] = option.label;
    });

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
    
    const tenurePeriods = selectedFilters.filter(f => TENURE_OPTION_IDS.includes(f));
    
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
    
    if (tenurePeriods.length > 0) {
      filter.tenurePeriod = tenurePeriods;
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

export default useTeamReportFilters;
