import React, { useState } from "react";
import { PiMagnifyingGlass, PiCaretUp, PiCaretDown } from "react-icons/pi";
import { Checkbox, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@newwork/nw-design-system";
import { cn } from "../../common/utils/cn";
import { DebouncedInput } from "./DebouncedInput";

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
  
  /**
   * Custom component to render instead of default filter list
   */
  customComponent?: React.ReactNode;
  
  /**
   * Whether to hide the search input for this group
   */
  hideSearch?: boolean;
}

/**
 * Individual filter option type definition
 */
export interface DataFilter {
  id: string;
  label: string;
  value: string;
  selected: boolean;
  count?: number;
}

/**
 * Props for the DataFilter component
 */
export interface DataFilterProps {
  show: boolean;
  onClose: () => void;
  filterGroups: DataFilterGroup[];
  onFilterChange: (filterId: string, selected: boolean) => void;
  className?: string;
  children?: React.ReactNode;
}

/**
 * DataFilter component provides filtering capabilities with expandable filter groups.
 * Supports both local and backend-driven filtering with search functionality.
 */
export const DataFilter: React.FC<Readonly<DataFilterProps>> = ({
  show,
  onClose,
  filterGroups = [],
  onFilterChange,
  className = "",
  children,
}) => {
  // State for global search functionality
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {
      // Initialize all groups as expanded by default
      ...filterGroups.reduce(
        (acc, group) => ({ ...acc, [group.id]: true }),
        {}
      ),
    }
  );

  // State for tracking which groups are showing all items vs limited
  const [showAllItems, setShowAllItems] = useState<Record<string, boolean>>({});

  // State for individual group search queries
  const [groupSearchQueries, setGroupSearchQueries] = useState<Record<string, string>>({});

  const toggleExpansion = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const toggleShowAllItems = (groupId: string) => {
    setShowAllItems(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const handleGroupSearch = (groupId: string, searchValue: string) => {
    setGroupSearchQueries(prev => ({
      ...prev,
      [groupId]: searchValue
    }));
  };

  if (!show) {
    return null;
  }

  // Global search functionality (for future enhancement)
  const handleGlobalSearchToggle = () => {
    setShowSearchInput(!showSearchInput);
    if (!showSearchInput) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      setSearchQuery("");
    }
  };

  // Filter groups based on search query
  const filteredGroups = searchQuery
    ? filterGroups.filter(
        (group) =>
          group.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (group.filters ?? []).some((f) =>
            f.label.toLowerCase().includes(searchQuery.toLowerCase())
          )
      )
    : filterGroups;

  // Count selected filters in a group
  const countSelectedFilters = (group: DataFilterGroup) => {
    return (group.filters ?? []).filter((f) => f.selected).length;
  };

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "gba:flex gba:flex-row gba:items-start gba:w-[336px] gba:h-full gba:pl-6 gba:pr-6 gba:relative gba:overflow-hidden",
          className
        )}
        data-testid="data-filter-sidebar"
      >
        <div className="gba:flex gba:flex-row gba:justify-center gba:items-start gba:p-0 gba:w-[336px] gba:max-w-[336px] gba:h-full gba:grow gba:overflow-hidden" data-testid="data-filter-container">
          <form
            className="gba:min-w-0 gba:w-full gba:flex gba:flex-col gba:items-start gba:p-0 gba:gap-4 gba:h-full gba:grow gba:z-0 gba:overflow-hidden"
            onSubmit={(e) => e.preventDefault()}
            data-testid="data-filter-form"
          >
            <div className="gba:min-w-0 gba:w-full gba:flex gba:flex-row gba:items-center gba:justify-between gba:pb-1 gba:gap-4" data-testid="data-filter-header">
              <div className="gba:flex gba:items-baseline gba:gap-2">
                {!showSearchInput ? (
                  <>
                    <button
                      className="gba:flex gba:justify-center gba:items-center gba:p-0 gba:w-8 gba:h-8 gba:!bg-black/[0.04] gba:rounded gba:hover:bg-gray-100/80 gba:transition-colors gba:leading-none"
                      type="button"
                      aria-label="Search filters"
                      onClick={handleGlobalSearchToggle}
                      data-testid="data-filter-search-toggle-button"
                      style={{
                        backgroundColor: 'var(--color-muted)',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <PiMagnifyingGlass
                        size={16}
                        style={{ color: 'var(--color-foreground)' }}
                        aria-hidden="true"
                      />
                    </button>
                    <span 
                      className="gba:text-base gba:font-medium"
                      style={{ color: 'var(--color-foreground)' }}
                      data-testid="data-filter-title"
                    >
                      Filter
                    </span>
                  </>
                ) : (
                  <div 
                    className="gba:flex gba:flex-row gba:items-center gba:w-full gba:h-8 gba:rounded gba:px-2"
                    style={{ backgroundColor: 'var(--color-muted)' }}
                    data-testid="data-filter-search-container"
                  >
                    <span className="gba:flex gba:items-center gba:justify-center gba:mr-2">
                      <PiMagnifyingGlass
                        size={20}
                        style={{ color: 'var(--color-foreground)' }}
                        aria-hidden="true"
                      />
                    </span>
                    <DebouncedInput
                      ref={searchInputRef}
                      className="gba:grow gba:bg-transparent gba:border-none gba:outline-none gba:text-sm"
                      placeholder="Search for Filter Group..."
                      value={searchQuery}
                      onChange={setSearchQuery}
                      ariaLabel="Search filter groups and filters"
                      debounceDelay={300}
                      data-testid="data-filter-global-search-input"
                    />
                    {/* Close button for search */}
                    {searchQuery && (
                      <button
                        type="button"
                        className="gba:ml-1"
                        style={{ 
                          color: 'var(--color-muted-foreground)',
                          backgroundColor: 'transparent',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                        onClick={() => {
                          setSearchQuery("");
                          if (!searchQuery) setShowSearchInput(false);
                        }}
                        aria-label="Clear search"
                        data-testid="data-filter-clear-global-search-button"
                      >
                        <span aria-hidden="true">×</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="gba:flex gba:flex-col gba:w-full gba:gap-1 gba:flex-1 gba:min-h-0 gba:overflow-y-auto" data-testid="data-filter-groups-container">
              {filteredGroups.map((group) => {
                // Determine if this group uses backend-powered search
                const groupSearch = groupSearchQueries[group.id] || "";
                const isExpanded = expandedGroups[group.id];
                const groupId = `filter-group-${group.id}`;

                // Get backend search results if available, otherwise do local filtering
                let filterOptions: DataFilter[] = [];
                let loading = false;
                let error: Error | null = null;

                if (group.backendSearch && typeof group.backendSearch === 'function') {
                  const searchResult = group.backendSearch(groupSearch);
                  filterOptions = searchResult.filters || [];
                  loading = searchResult.loading || false;
                  error = searchResult.error || null;
                } else if (group.filters) {
                  filterOptions = groupSearch
                    ? group.filters.filter((f) =>
                        f.label.toLowerCase().includes(groupSearch.toLowerCase())
                      )
                    : group.filters;
                }

                const selectedCount = countSelectedFilters({
                  ...group,
                  filters: filterOptions,
                });

                let filterContent: React.ReactNode;
                if (loading) {
                  filterContent = (
                    <div 
                      className="gba:p-2"
                      style={{ color: 'var(--color-muted-foreground)' }}
                      data-testid={`data-filter-group-loading-${group.id}`}
                    >
                      Loading...
                    </div>
                  );
                } else if (error) {
                  filterContent = (
                    <div 
                      className="gba:p-2"
                      style={{ color: 'var(--color-destructive)' }}
                      data-testid={`data-filter-group-error-${group.id}`}
                    >
                      Error loading filters
                    </div>
                  );
                } else if ((filterOptions ?? []).length > 0) {
                  // Determine if we should show limited or all items
                  // Don't limit when user is searching within the group
                  const isSearching = (groupSearchQueries[group.id] || "").trim().length > 0;
                  const shouldShowAll = showAllItems[group.id] || isSearching;
                  const shouldShowLimited = !shouldShowAll && filterOptions.length > 10;
                  const displayOptions = shouldShowLimited ? filterOptions.slice(0, 10) : filterOptions;
                  const hiddenCount = filterOptions.length - 10;

                  filterContent = (
                    <>
                      {displayOptions.map((filter) => (
                        <button
                          key={filter.id}
                          className="gba:flex gba:flex-row gba:items-center gba:w-full gba:p-2 gba:rounded gba:hover:bg-gray-100/50 gba:transition-colors"
                          onClick={() =>
                            onFilterChange?.(filter.id, !filter.selected)
                          }
                          onKeyDown={(e) =>
                            e.key === "Enter" &&
                            onFilterChange?.(filter.id, !filter.selected)
                          }
                          type="button"
                          aria-pressed={filter.selected}
                          data-testid={`data-filter-option-${filter.id}`}
                          style={{
                            backgroundColor: filter.selected ? 'var(--color-accent)' : 'transparent',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          <div className="gba:flex gba:items-center gba:justify-center gba:mr-2">
                            <Checkbox
                              checked={filter.selected}
                              onChange={() =>
                                onFilterChange?.(filter.id, !filter.selected)
                              }
                              onClick={(e: React.MouseEvent) => e.stopPropagation()}
                              data-testid={`data-filter-checkbox-${filter.id}`}
                            />
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                className={`gba:text-sm gba:text-left gba:truncate gba:block gba:max-w-[280px] ${
                                  filter.selected
                                    ? "gba:font-medium"
                                    : ""
                                }`}
                                style={{
                                  color: filter.selected ? 'var(--color-primary)' : 'var(--color-foreground)'
                                }}
                                data-testid={`data-filter-label-${filter.id}`}
                              >
                                {filter.label}
                                {typeof filter.count === "number"
                                  ? ` (${filter.count})`
                                  : ""}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{filter.label + (typeof filter.count === "number" ? ` (${filter.count})` : "")}</p>
                            </TooltipContent>
                          </Tooltip>
                        </button>
                      ))}
                      
                      {/* Show More / Show Less button - only show when not searching */}
                      {filterOptions.length > 10 && !isSearching && (
                        <button
                          type="button"
                          className="gba:flex gba:items-center gba:justify-center gba:w-full gba:p-2 gba:mt-1 gba:text-sm gba:rounded gba:transition-colors"
                          style={{
                            color: 'var(--color-primary)',
                            backgroundColor: 'transparent',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                          onClick={() => toggleShowAllItems(group.id)}
                          data-testid={`data-filter-toggle-${group.id}`}
                        >
                          {shouldShowAll ? (
                            <>
                              <PiCaretUp size={16} className="gba:mr-1" aria-hidden="true" />
                              Show Less
                            </>
                          ) : (
                            <>
                              <PiCaretDown size={16} className="gba:mr-1" aria-hidden="true" />
                              Show More ({hiddenCount} more)
                            </>
                          )}
                        </button>
                      )}
                    </>
                  );
                } else {
                  filterContent = (
                    <div 
                      className="gba:p-2 gba:text-sm"
                      style={{ color: 'var(--color-muted-foreground)' }}
                      data-testid={`data-filter-group-empty-${group.id}`}
                    >
                      No filters found
                    </div>
                  );
                }

                return (
                  <div key={group.id} className="gba:w-full" data-testid={`data-filter-group-${group.id}`}>
                    <button
                      className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:w-full gba:pt-2 gba:!pl-2 gba:!pr-2 gba:!pb-[14px] gba:hover:bg-gray-100/50 gba:transition-colors gba:!border-b gba:!border-gray-200"
                      onClick={() => toggleExpansion(group.id)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && toggleExpansion(group.id)
                      }
                      aria-expanded={isExpanded}
                      aria-controls={groupId}
                      type="button"
                      data-testid={`data-filter-group-toggle-${group.id}`}
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderBottom: `var(--spacing-px) solid var(--color-border)`,
                        cursor: 'pointer'
                      }}
                    >
                      <span 
                        className="gba:text-sm gba:font-medium"
                        style={{ color: 'var(--color-foreground)' }}
                        data-testid={`data-filter-group-title-${group.id}`}
                      >
                        {group.title}
                      </span>
                      <div className="gba:flex gba:items-center">
                        {selectedCount > 0 && (
                          <div
                            className="gba:flex gba:items-center gba:justify-center gba:min-w-[20px] gba:h-5 gba:text-xs gba:font-medium gba:rounded-full gba:px-1.5 gba:mr-2"
                            style={{
                              backgroundColor: 'var(--color-primary)',
                              color: 'var(--color-primary-foreground)'
                            }}
                            aria-label={`${selectedCount} selected filters`}
                            data-testid={`data-filter-group-count-${group.id}`}
                          >
                            <span>{selectedCount}</span>
                          </div>
                        )}
                        {isExpanded ? (
                          <PiCaretUp
                            size={20}
                            style={{ color: 'var(--color-foreground)' }}
                            aria-hidden="true"
                          />
                        ) : (
                          <PiCaretDown
                            size={20}
                            style={{ color: 'var(--color-foreground)' }}
                            aria-hidden="true"
                          />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div
                        className="gba:flex gba:flex-col gba:w-full gba:pl-2"
                        id={groupId}
                        data-testid={`data-filter-group-content-${group.id}`}
                      >
                        {/* Render custom component if provided */}
                        {group.customComponent ? (
                          <div className="gba:w-full gba:mt-1" data-testid={`data-filter-group-custom-${group.id}`}>
                            {group.customComponent}
                          </div>
                        ) : (
                          <>
                            {/* Per-group search input with debounce - only show if not disabled */}
                            {!group.hideSearch && (
                              <div className="gba:w-full gba:mb-2 gba:mt-1" data-testid={`data-filter-group-search-container-${group.id}`}>
                                <DebouncedInput
                                  className="gba:w-full gba:h-8 gba:px-2 gba:text-sm gba:bg-gray-100/40 gba:rounded gba:border-none gba:outline-none"
                                  placeholder={`Search in ${group.title}...`}
                                  value={groupSearch}
                                  onChange={(value) =>
                                    handleGroupSearch(group.id, value)
                                  }
                                  ariaLabel={`Search filters in ${group.title}`}
                                  debounceDelay={300}
                                  data-testid={`data-filter-group-search-input-${group.id}`}
                                />
                              </div>
                            )}
                            {/* Show loading, error, or filter options */}
                            <div data-testid={`data-filter-group-options-${group.id}`}>
                              {filterContent}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {children}
          </form>
        </div>
        <div 
          className="gba:absolute gba:top-0 gba:right-0 gba:w-px gba:h-[calc(100%-1.5rem)]"
          style={{ backgroundColor: 'var(--color-border)' }}
          data-testid="data-filter-divider"
        />
      </aside>
    </TooltipProvider>
  );
};
