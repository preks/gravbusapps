import React, { useState } from "react";
import { PiMagnifyingGlass, PiCaretUp, PiCaretDown } from "react-icons/pi";
import { Checkbox } from "@newwork/gravity-ui-catalog";
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
  backendSearch?: (search: string) => {
    filters: DataFilter[];
    loading: boolean;
    error: any;
  };
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
  // State for per-group search queries
  const [groupSearchQueries, setGroupSearchQueries] = useState<
    Record<string, string>
  >({});

  // Prepare backend search results for each group at the top level
  // This ensures hooks are called at the top, not conditionally
  const backendResults: Record<
    string,
    { filters: DataFilter[]; loading: boolean; error: any }
  > = {};
  filterGroups.forEach((group) => {
    if (typeof group.backendSearch === "function") {
      backendResults[group.id] = group.backendSearch(
        groupSearchQueries[group.id] || ""
      );
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
          (group.filters ?? []).some((f) =>
            f.label.toLowerCase().includes(searchQuery.toLowerCase())
          )
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
    return (group.filters ?? []).filter((f) => f.selected).length;
  };

  // Handle search button click
  const handleSearchClick = () => {
    setShowSearchInput(true);
  };

  return (
    <aside
      className={cn(
        "gba:flex gba:flex-row gba:items-start gba:w-[336px] gba:h-full gba:pr-6 gba:relative",
        className
      )}
    >
      <div className="gba:flex gba:flex-row gba:justify-center gba:items-start gba:p-0 gba:w-[336px] gba:max-w-[336px] gba:h-full gba:grow gba:overflow-hidden">
        <form
          className="gba:min-w-0 gba:w-full gba:flex gba:flex-col gba:items-start gba:p-0 gba:gap-4 gba:h-full gba:grow gba:z-0 gba:overflow-hidden"
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="gba:min-w-0 gba:w-full gba:flex gba:flex-row gba:items-center gba:justify-between gba:pb-1 gba:gap-4">
            <div className="gba:flex gba:items-center gba:gap-4">
              {!showSearchInput ? (
                <>
                  <div className="gba:flex gba:flex-col gba:items-start gba:p-0 gba:w-8 gba:h-8 gba:relative">
                    <button
                      className="gba:flex gba:flex-row gba:justify-center gba:items-center gba:p-0 gba:w-8 gba:h-8 gba:!bg-black/[0.04] gba:rounded gba:hover:bg-gray-100/80 gba:transition-colors"
                      type="button"
                      aria-label="Search filters"
                      onClick={handleSearchClick}
                    >
                      <PiMagnifyingGlass
                        size={20}
                        className="gba:text-black"
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                  <span className="gba:text-base gba:font-medium gba:text-gray-900">
                    Filter
                  </span>
                </>
              ) : (
                <div className="gba:flex gba:flex-row gba:items-center gba:w-full gba:h-8 gba:!bg-black/[0.04] gba:rounded gba:px-2">
                  <span className="gba:flex gba:items-center gba:justify-center gba:mr-2">
                    <PiMagnifyingGlass
                      size={20}
                      className="gba:text-black"
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
                  />
                  {/* Close button for search */}
                  {searchQuery && (
                    <button
                      type="button"
                      className="gba:ml-1 gba:text-gray-400 gba:hover:text-gray-600"
                      onClick={() => {
                        setSearchQuery("");
                        if (!searchQuery) setShowSearchInput(false);
                      }}
                      aria-label="Clear search"
                    >
                      <span aria-hidden="true">×</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="gba:flex gba:flex-col gba:w-full gba:gap-1 gba:overflow-y-auto gba:grow">
            {filteredGroups.map((group) => {
              // Determine if this group uses backend-powered search
              const groupSearch = groupSearchQueries[group.id] || "";
              const isExpanded = expandedGroups[group.id];
              const groupId = `filter-group-${group.id}`;

              // Get backend search results if available, otherwise do local filtering
              let filterOptions: DataFilter[] = [];
              let loading = false;
              let error: Error | null = null;

              if (
                typeof group.backendSearch === "function" &&
                backendResults[group.id]
              ) {
                filterOptions = backendResults[group.id].filters;
                loading = backendResults[group.id].loading;
                error = backendResults[group.id].error;
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
                  <div className="gba:p-2 gba:text-gray-400">Loading...</div>
                );
              } else if (error) {
                filterContent = (
                  <div className="gba:p-2 gba:text-red-500">
                    Error loading filters
                  </div>
                );
              } else if ((filterOptions ?? []).length > 0) {
                filterContent = (filterOptions ?? []).map((filter) => (
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
                  >
                    <div className="gba:flex gba:items-center gba:justify-center gba:mr-2">
                      <Checkbox
                        value={filter.selected}
                        onChange={() =>
                          onFilterChange?.(filter.id, !filter.selected)
                        }
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        name={filter.id}
                      />
                    </div>
                    <span
                      className={`gba:text-sm ${
                        filter.selected
                          ? "gba:font-medium gba:text-primary-500"
                          : "gba:text-gray-700"
                      }`}
                    >
                      {filter.label}
                      {typeof filter.count === "number"
                        ? ` (${filter.count})`
                        : ""}
                    </span>
                  </button>
                ));
              } else {
                filterContent = (
                  <div className="gba:p-2 gba:text-gray-400 gba:text-sm">
                    No filters found
                  </div>
                );
              }

              return (
                <div key={group.id} className="gba:w-full">
                  <button
                    className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:w-full gba:pt-2 gba:!pl-2 gba:!pr-2 gba:!pb-[14px] gba:hover:bg-gray-100/50 gba:transition-colors gba:!border-b gba:!border-gray-200"
                    onClick={() => toggleGroup(group.id)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && toggleGroup(group.id)
                    }
                    aria-expanded={isExpanded}
                    aria-controls={groupId}
                    type="button"
                  >
                    <span className="gba:text-sm gba:font-medium gba:text-gray-900">
                      {group.title}
                    </span>
                    <div className="gba:flex gba:items-center">
                      {selectedCount > 0 && (
                        <div
                          className="gba:flex gba:items-center gba:justify-center gba:min-w-[20px] gba:h-5 gba:bg-primary-500 gba:text-white gba:text-xs gba:font-medium gba:rounded-full gba:px-1.5 gba:mr-2"
                          aria-label={`${selectedCount} selected filters`}
                        >
                          <span>{selectedCount}</span>
                        </div>
                      )}
                      {isExpanded ? (
                        <PiCaretUp
                          size={20}
                          className="gba:text-black"
                          aria-hidden="true"
                        />
                      ) : (
                        <PiCaretDown
                          size={20}
                          className="gba:text-black"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div
                      className="gba:flex gba:flex-col gba:w-full gba:pl-2"
                      id={groupId}
                    >
                      {/* Per-group search input with debounce */}
                      <div className="gba:w-full gba:mb-2 gba:mt-1">
                        <DebouncedInput
                          className="gba:w-full gba:h-8 gba:px-2 gba:text-sm gba:bg-gray-100/40 gba:rounded gba:border-none gba:outline-none"
                          placeholder={`Search in ${group.title}...`}
                          value={groupSearch}
                          onChange={(value) =>
                            handleGroupSearchChange(group.id, value)
                          }
                          ariaLabel={`Search filters in ${group.title}`}
                          debounceDelay={300}
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
      <div className="gba:absolute gba:top-0 gba:right-0 gba:w-px gba:h-[calc(100%-1.5rem)] gba:bg-gray-100" />
    </aside>
  );
};
