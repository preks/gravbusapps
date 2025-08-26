import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Label,
  Spinner,
  Alert,
  AlertDescription,
} from "@newwork/nw-design-system";
import { PiMagnifyingGlass } from "react-icons/pi";
import { debounce, DEFAULT_SEARCH_DEBOUNCE_DELAY } from "@/common/data/investment";
import { SelectOption } from "../types";
import { formatDataTestId } from "@/common/utils/formatDataTestId";

interface SearchableSelectProps {
  label?: string;
  name: string;
  value?: string;
  placeholder?: string;
  options: SelectOption[];
  loading?: boolean;
  hasMore?: boolean;
  onSearch?: (searchTerm: string) => void;
  onLoadMore?: () => void;
  onChange?: (value: string) => void;
  "data-testid"?: string;
  className?: string;
  disabled?: boolean;
  error?: string | null;
  required?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  name,
  value,
  placeholder = "Search and select...",
  options,
  loading = false,
  hasMore = false,
  onSearch,
  onLoadMore,
  onChange,
  "data-testid": dataTestId,
  className = "",
  disabled = false,
  error,
  required = false,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [cachedSelectedOption, setCachedSelectedOption] =
    useState<SelectOption | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Find the selected option in current options
  const selectedOption =
    value && value.trim()
      ? options.find((option) => option.value === value || option.id === value)
      : undefined;

  // Debug logging for specific problematic fields - ✅ ENHANCED after catalog fix
  useEffect(() => {
    if (
      name === "leadStatus" ||
      name === "leadSource" ||
      name === "rating" ||
      name === "country"
    ) {
      console.log(`🔍 SearchableSelect "${name}" Debug AFTER CATALOG FIX:`, {
        value: value,
        valueType: typeof value,
        optionsCount: options.length,
        selectedOption: selectedOption,
        cachedSelectedOption: cachedSelectedOption,
        displayValue: selectedOption?.label || cachedSelectedOption?.label,
        firstOption: options[0],
        // Try to find option manually
        manualFind: options.find((opt) => {
          const matchesValue = opt.value === value;
          const matchesId = opt.id === value;
          console.log(
            `  🔍 Comparing "${opt.value}" === "${value}" (${matchesValue}) or "${opt.id}" === "${value}" (${matchesId})`
          );
          return matchesValue || matchesId;
        }),
        catalogPrefix: options[0]?.value?.split(":")[0] || "no-prefix",
        valuePrefix: value?.split(":")[0] || "no-value-prefix",
      });
    }
  }, [name, value, selectedOption, cachedSelectedOption, options]);

  // Update cached selected option when found in current options
  useEffect(() => {
    if (selectedOption) {
      setCachedSelectedOption(selectedOption);
    }
  }, [selectedOption]);

  // Clear cached option when value is cleared
  useEffect(() => {
    if (!value || (typeof value === "string" && !value.trim())) {
      setCachedSelectedOption(null);
    }
  }, [value]);

  // Use either the current selected option or the cached one
  const displayOption = selectedOption || cachedSelectedOption;
  const displayValue = displayOption ? displayOption.label : undefined;

  // Create enhanced options that always include the selected option
  const enhancedOptions = React.useMemo(() => {
    if (!cachedSelectedOption || !value || !value.trim()) return options;

    // Check if the cached selected option is already in the current options
    const isSelectedInOptions = options.some(
      (option) =>
        option.value === cachedSelectedOption.value ||
        option.id === cachedSelectedOption.id
    );

    if (isSelectedInOptions) {
      return options;
    }

    // Add the cached selected option to the beginning of the list
    return [cachedSelectedOption, ...options];
  }, [options, cachedSelectedOption, value]);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((term: string) => {
      if (onSearch) {
        onSearch(term);
      }
    }, DEFAULT_SEARCH_DEBOUNCE_DELAY),
    [onSearch]
  );

  // Handle search input change
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.stopPropagation();
      const term = e.target.value;
      setSearchTerm(term);
      debouncedSearch(term);
    },
    [debouncedSearch]
  );

  // Prevent search input from affecting Select
  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation();
  }, []);

  const handleSearchClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  // Handle scroll to load more
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const { target } = e;
      if (target instanceof HTMLDivElement) {
        const { scrollTop, scrollHeight, clientHeight } = target;
        if (
          scrollTop + clientHeight >= scrollHeight - 10 &&
          hasMore &&
          !loading &&
          onLoadMore
        ) {
          console.log(
            "🔄 Scroll triggered loadMore - API has more data available"
          );
          onLoadMore();
        }
      }
    },
    [hasMore, loading, onLoadMore]
  );

  // Handle selection change
  const handleChange = useCallback(
    (selectedValue: string) => {
      // Find the selected option to cache it
      const newSelectedOption = enhancedOptions.find(
        (option) =>
          option.value === selectedValue || option.id === selectedValue
      );

      if (newSelectedOption) {
        setCachedSelectedOption(newSelectedOption);
      }

      if (onChange) {
        onChange(selectedValue);
      }

      // Clear search after selection
      setSearchTerm("");
      if (onSearch) {
        onSearch("");
      }
      setIsOpen(false);
    },
    [onChange, onSearch, enhancedOptions]
  );

  // Handle dropdown open/close
  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      if (!open) {
        // Reset search when closing dropdown
        setSearchTerm("");
        if (onSearch) {
          onSearch("");
        }
      }
    },
    [onSearch]
  );

  // Reset search when options change (but preserve selected option)
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
    }
  }, [isOpen]);

  return (
    <div
      className={`gba:w-full gba:max-w-full gba:overflow-hidden ${className}`}
    >
      {label && (
        <Label
          htmlFor={name}
          className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2 gba:truncate"
        >
          {label} {required && <span className="gba:text-red-500">*</span>}
        </Label>
      )}
      <div className="gba:relative gba:w-full gba:max-w-full gba:overflow-hidden">
        <Select
          value={value || ""}
          onValueChange={handleChange}
          onOpenChange={handleOpenChange}
          disabled={disabled}
          data-testid={dataTestId}
          open={isOpen}
        >
          <SelectTrigger className="gba:w-full gba:max-w-full gba:border-gray-300 gba:bg-white">
            <div className="gba:truncate gba:overflow-hidden">
              {displayValue || placeholder}
            </div>
          </SelectTrigger>
          <SelectContent className="gba:w-full gba:min-w-[200px] gba:max-w-[400px] gba:border-gray-300 gba:bg-white">
            {/* Search input */}
            <div
              className="gba:p-2 gba:border-b gba:border-gray-200"
              onClick={handleSearchClick}
            >
              <div className="gba:relative">
                <div className="gba:absolute gba:inset-y-0 gba:left-0 gba:pl-2 gba:flex gba:items-center gba:pointer-events-none gba:z-10">
                  <PiMagnifyingGlass className="gba:h-4 gba:w-4 gba:text-gray-400" />
                </div>
                <Input
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onKeyDown={handleSearchKeyDown}
                  onClick={handleSearchClick}
                  placeholder="Search..."
                  className="gba:border-gray-300 gba:bg-white gba:text-sm"
                  style={{
                    paddingLeft: "28px",
                  }}
                  autoFocus
                />
              </div>
            </div>

            {/* Options list */}
            <div
              ref={listRef}
              onScroll={handleScroll}
              className="gba:max-h-48 gba:overflow-y-auto"
            >
              {enhancedOptions.length > 0
                ? enhancedOptions.map((option, index) => (
                    <SelectItem
                      key={`${option.id}-${index}`}
                      value={String(option.value)}
                    >
                      <div className="gba:flex gba:items-center gba:justify-between gba:w-full">
                        <span className="gba:truncate">
                          {option.name || option.label}
                        </span>
                        {cachedSelectedOption &&
                          (cachedSelectedOption.value === option.value ||
                            cachedSelectedOption.id === option.id) && (
                            <span className="gba:text-xs gba:text-blue-600 gba:font-medium gba:ml-2">
                              ✓
                            </span>
                          )}
                      </div>
                    </SelectItem>
                  ))
                : !loading &&
                  searchTerm && (
                    <div className="gba:p-4 gba:text-center gba:text-gray-500">
                      No results found for "{searchTerm}"
                    </div>
                  )}

              {/* Load more indicator */}
              {loading && (
                <div className="gba:p-2 gba:text-center gba:border-t gba:border-gray-100">
                  <Spinner size="sm" className="gba:mr-2" />
                  <span className="gba:text-gray-500">Loading...</span>
                </div>
              )}

              {/* Has more indicator */}
              {hasMore && !loading && (
                <div className="gba:p-2 gba:text-center gba:text-gray-500 gba:text-sm gba:border-t gba:border-gray-100">
                  Scroll down to load more...
                </div>
              )}

              {/* Debug info */}
              {process.env.NODE_ENV === "development" && (
                <div className="gba:p-1 gba:text-xs gba:text-gray-400 gba:border-t gba:border-gray-50">
                  hasMore: {String(hasMore)} | loading: {String(loading)} |
                  options: {options.length}
                </div>
              )}
            </div>
          </SelectContent>
        </Select>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};



export default SearchableSelect;
