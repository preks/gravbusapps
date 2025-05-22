import React, { useState } from 'react';
import { PiMagnifyingGlass, PiCaretUp, PiCaretDown } from 'react-icons/pi';
import { Checkbox } from '@newwork/gravity-ui-catalog';
import { cn } from '@/utils/cn';

/**
 * Data Filter Group type definition
 */
export interface DataFilterGroup {
  id: string;
  title: string;
  filters?: DataFilter[];
  type?: string; // e.g., 'organizationalUnit', 'employee', etc.
  /**
   * Optional backend search hook or function. If provided, it should be a React hook or function
   * that takes a search string and returns { filters, loading, error }.
   * If not provided, local filtering will be used.
   */
  backendSearch?: (search: string) => { filters: DataFilter[]; loading: boolean; error: any };
}

/**
 * Data Filter type definition
 */
export interface DataFilter {
  id: string;
  label: string;
  selected: boolean;
  count?: number;
}

/**
 * Generic Data Filter component with filter groups functionality.
 * @param show - Whether the sidebar is visible
 * @param onClose - Callback to close the sidebar
 * @param filterGroups - Array of filter groups to display
 * @param onFilterChange - Callback when a filter is toggled
 * @param className - Optional additional class names
 */
export interface DataFilterProps {
  show: boolean;
  onClose: () => void;
  filterGroups?: DataFilterGroup[];
  onFilterChange?: (filterId: string, selected: boolean) => void;
  className?: string;
  children?: React.ReactNode;
}

export const DataFilter: React.FC<Readonly<DataFilterProps>> = ({
  show,
  onClose,
  filterGroups = [],
  onFilterChange,
  className = '',
  children,
}) => {
  // State for global search functionality
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    // Initialize all groups as expanded by default
    ...filterGroups.reduce((acc, group) => ({ ...acc, [group.id]: true }), {}),
  });
  // State for per-group search queries
  const [groupSearchQueries, setGroupSearchQueries] = useState<Record<string, string>>({});

  // Prepare backend search results for each group at the top level
  // This ensures hooks are called at the top, not conditionally
  const backendResults: Record<string, { filters: DataFilter[]; loading: boolean; error: any }> = {};
  filterGroups.forEach(group => {
    if (typeof group.backendSearch === 'function') {
      backendResults[group.id] = group.backendSearch(groupSearchQueries[group.id] || '');
    }
  });

  // Focus search input when it becomes visible
  React.useEffect(() => {
    if (showSearchInput && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearchInput]);

  // Handle per-group search input changes
  const handleGroupSearchChange = (groupId: string, value: string) => {
    setGroupSearchQueries((prev) => ({ ...prev, [groupId]: value }));
  };

  if (!show) return null;

  // Filter groups based on search query
  const filteredGroups = searchQuery
    ? filterGroups.filter(
        (group) =>
          group.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (group.filters ?? []).some(f => f.label.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : filterGroups;

  // Toggle group expansion
  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  // Count selected filters in a group
  const countSelectedFilters = (group: DataFilterGroup) => {
    return (group.filters ?? []).filter(f => f.selected).length;
  };
  
  // Handle search button click
  const handleSearchClick = () => {
    setShowSearchInput(true);
  };

  return (
    <aside className={cn('flex flex-row items-start w-[336px] h-full', className)}>
      <div className="flex flex-row justify-center items-start p-0 px-6 w-[336px] max-w-[336px] h-full border-r border-gray-100 flex-grow overflow-hidden">
        <form className="min-w-0 w-full flex flex-col items-start p-0 gap-4 h-full flex-grow z-0 overflow-hidden" onSubmit={(e) => e.preventDefault()}>
          <div className="min-w-0 w-full flex flex-row items-center py-3 pb-1 gap-4 h-12">
            {!showSearchInput ? (
              <>
                <div className="flex flex-col items-start p-0 w-8 h-8 relative">
                  <button
                    className="flex flex-row justify-center items-center p-0 w-8 h-8 bg-gray-100/40 rounded hover:bg-gray-100/80 transition-colors"
                    type="button"
                    aria-label="Search filters"
                    onClick={handleSearchClick}
                  >
                    <PiMagnifyingGlass size={20} className="text-black" aria-hidden="true" />
                  </button>
                </div>
                <span className="text-base font-medium text-gray-900">Filter</span>
              </>
            ) : (
              <div className="flex flex-row items-center w-full h-8 bg-gray-100/40 rounded px-2">
                <span className="flex items-center justify-center mr-2">
                  <PiMagnifyingGlass size={20} className="text-black" aria-hidden="true" />
                </span>
                <input
                  ref={searchInputRef}
                  className="flex-grow bg-transparent border-none outline-none text-sm"
                  type="text"
                  placeholder="Search for Filter Group..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onBlur={(e) => {
                    if (!e.target.value) setShowSearchInput(false);
                  }}
                  aria-label="Search filter groups and filters"
                />
              </div>
            )}
          </div>
          
          <div className="flex flex-col w-full gap-1 overflow-y-auto flex-grow">
            {filteredGroups.map((group) => {
              // Determine if this group uses backend-powered search
              const groupSearch = groupSearchQueries[group.id] || '';
              const isExpanded = expandedGroups[group.id];
              const groupId = `filter-group-${group.id}`;

              // Get backend search results if available, otherwise do local filtering
              let filterOptions: DataFilter[] = [];
              let loading = false;
              let error: Error | null = null;

              if (typeof group.backendSearch === 'function' && backendResults[group.id]) {
                filterOptions = backendResults[group.id].filters;
                loading = backendResults[group.id].loading;
                error = backendResults[group.id].error;
              } else if (group.filters) {
                filterOptions = groupSearch
                  ? group.filters.filter(f => f.label.toLowerCase().includes(groupSearch.toLowerCase()))
                  : group.filters;
              }

              const selectedCount = countSelectedFilters({ ...group, filters: filterOptions });

              let filterContent: React.ReactNode;
              if (loading) {
                filterContent = (
                  <div className="p-2 text-gray-400">Loading...</div>
                );
              } else if (error) {
                filterContent = (
                  <div className="p-2 text-red-500">Error loading filters</div>
                );
              } else if ((filterOptions ?? []).length > 0) {
                filterContent = (filterOptions ?? []).map((filter) => (
                  <button
                    key={filter.id}
                    className="flex flex-row items-center w-full p-2 rounded hover:bg-gray-100/50 transition-colors"
                    onClick={() => onFilterChange?.(filter.id, !filter.selected)}
                    onKeyDown={(e) => e.key === 'Enter' && onFilterChange?.(filter.id, !filter.selected)}
                    type="button"
                    aria-pressed={filter.selected}
                  >
                    <div className="flex items-center justify-center mr-2">
                      <Checkbox 
                        checked={filter.selected} 
                        onChange={() => onFilterChange?.(filter.id, !filter.selected)}
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      />
                    </div>
                    <span className={`text-sm ${filter.selected ? 'font-medium text-primary-500' : 'text-gray-700'}`}>
                      {filter.label}{typeof filter.count === 'number' ? ` (${filter.count})` : ''}
                    </span>
                  </button>
                ));
              } else {
                filterContent = (
                  <div className="p-2 text-gray-400 text-sm">
                    No filters found
                  </div>
                );
              }

              return (
                <div key={group.id} className="w-full">
                  <button 
                    className="flex flex-row items-center justify-between w-full p-2 rounded hover:bg-gray-100/50 transition-colors" 
                    onClick={() => toggleGroup(group.id)}
                    onKeyDown={(e) => e.key === 'Enter' && toggleGroup(group.id)}
                    aria-expanded={isExpanded}
                    aria-controls={groupId}
                    type="button"
                  >
                    <span className="text-sm font-medium text-gray-900">{group.title}</span>
                    <div className="flex items-center">
                      {selectedCount > 0 && (
                        <div className="flex items-center justify-center min-w-[20px] h-5 bg-primary-500 text-white text-xs font-medium rounded-full px-1.5 mr-2" aria-label={`${selectedCount} selected filters`}>
                          <span>{selectedCount}</span>
                        </div>
                      )}
                      {isExpanded ? (
                        <PiCaretUp size={20} className="text-black" aria-hidden="true" />
                      ) : (
                        <PiCaretDown size={20} className="text-black" aria-hidden="true" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="flex flex-col w-full pl-2" id={groupId}>
                      {/* Per-group search input */}
                      <div className="w-full mb-2 mt-1">
                        <input
                          type="text"
                          className="w-full h-8 px-2 text-sm bg-gray-100/40 rounded border-none outline-none"
                          placeholder={`Search in ${group.title}...`}
                          value={groupSearch}
                          onChange={e => handleGroupSearchChange(group.id, e.target.value)}
                          aria-label={`Search filters in ${group.title}`}
                        />
                      </div>
                      {/* Show loading, error, or filter options */}
                      {filterContent}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {children}
        </form>
      </div>
    </aside>
  );
};
