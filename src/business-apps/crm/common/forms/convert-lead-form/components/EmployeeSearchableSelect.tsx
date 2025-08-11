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
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@newwork/nw-design-system";
import { PiMagnifyingGlass } from "react-icons/pi";
import { formatDataTestId } from "@/common/utils/formatDataTestId";

// Custom debounce utility
const debounce = (func: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

interface SelectOption {
  id: string;
  value: string;
  name: string;
  extraInfo?: {
    pictureThumbnail?: string;
    jobPosition?: string;
    organizationalUnit?: string;
  };
}

interface EmployeeSearchableSelectProps {
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

const EmployeeSearchableSelect: React.FC<EmployeeSearchableSelectProps> = ({
  label,
  name,
  value,
  placeholder = "Search and select employee...",
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
  const selectedOption = value
    ? options.find((option) => option.value === value || option.id === value)
    : undefined;

  // Update cached selected option when found in current options
  useEffect(() => {
    if (selectedOption) {
      setCachedSelectedOption(selectedOption);
    }
  }, [selectedOption]);

  // Clear cached option when value is cleared
  useEffect(() => {
    if (!value) {
      setCachedSelectedOption(null);
    }
  }, [value]);

  // Use either the current selected option or the cached one
  const displayOption = selectedOption || cachedSelectedOption;

  // Create enhanced options that always include the selected option
  const enhancedOptions = React.useMemo(() => {
    if (!cachedSelectedOption || !value) return options;

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
    }, 300),
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

  // Create display value for selected employee
  const getDisplayValue = () => {
    if (!displayOption) return placeholder;
    return displayOption.name || "Unknown Employee";
  };

  // Custom employee option renderer
  const EmployeeSelectItem: React.FC<{ employee: SelectOption }> = ({
    employee,
  }) => (
    <div className="gba:flex gba:items-center gba:gap-3 gba:p-2 gba:w-full">
      {/* Employee Avatar */}
      <Avatar size="sm">
        {employee.extraInfo?.pictureThumbnail ? (
          <AvatarImage
            src={`data:image/jpeg;base64,${employee.extraInfo.pictureThumbnail}`}
            alt={employee.name || "Employee"}
          />
        ) : null}
        <AvatarFallback className="gba:bg-gradient-to-br gba:from-blue-500 gba:to-purple-600 gba:text-white gba:font-semibold gba:text-xs">
          {employee.name
            ?.split(" ")
            .map((n: string) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2) || "??"}
        </AvatarFallback>
      </Avatar>

      {/* Employee Information */}
      <div className="gba:flex-1 gba:min-w-0">
        <div className="gba:text-sm gba:font-medium gba:text-gray-900 gba:truncate">
          {employee.name}
        </div>
        <div className="gba:text-xs gba:text-gray-600 gba:truncate">
          {employee.extraInfo?.jobPosition || "No Position"}
        </div>
        <div className="gba:text-xs gba:text-gray-500 gba:truncate">
          {employee.extraInfo?.organizationalUnit || "No Unit"}
        </div>
      </div>

      {/* Selection indicator */}
      {cachedSelectedOption &&
        (cachedSelectedOption.value === employee.value ||
          cachedSelectedOption.id === employee.id) && (
          <div className="gba:w-4 gba:h-4 gba:bg-blue-500 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
            <div className="gba:w-1.5 gba:h-1.5 gba:bg-white gba:rounded-full"></div>
          </div>
        )}
    </div>
  );

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
          <SelectTrigger className="gba:w-full gba:max-w-full gba:border-gray-300 gba:bg-white gba:min-h-[60px]">
            <div className="gba:flex gba:items-center gba:gap-3 gba:w-full gba:overflow-hidden">
              {displayOption ? (
                <>
                  {/* Selected Employee Avatar */}
                  <Avatar size="sm">
                    {displayOption.extraInfo?.pictureThumbnail ? (
                      <AvatarImage
                        src={`data:image/jpeg;base64,${displayOption.extraInfo.pictureThumbnail}`}
                        alt={displayOption.name || "Employee"}
                      />
                    ) : null}
                    <AvatarFallback className="gba:bg-gradient-to-br gba:from-blue-500 gba:to-purple-600 gba:text-white gba:font-semibold gba:text-xs">
                      {displayOption.name
                        ?.split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2) || "??"}
                    </AvatarFallback>
                  </Avatar>

                  {/* Selected Employee Info */}
                  <div className="gba:flex-1 gba:min-w-0 gba:text-left">
                    <div className="gba:text-sm gba:font-medium gba:text-gray-900 gba:truncate">
                      {displayOption.name}
                    </div>
                    <div className="gba:text-xs gba:text-gray-600 gba:truncate">
                      {displayOption.extraInfo?.jobPosition || "No Position"}
                    </div>
                  </div>
                </>
              ) : (
                <div className="gba:text-gray-500 gba:text-sm gba:truncate">
                  {placeholder}
                </div>
              )}
            </div>
          </SelectTrigger>
          <SelectContent
            className="gba:w-full gba:max-h-80 gba:overflow-hidden"
            ref={listRef}
            onScroll={handleScroll}
          >
            {/* Search Input */}
            <div className="gba:sticky gba:top-0 gba:z-10 gba:bg-white gba:border-b gba:border-gray-200 gba:p-2">
              <div className="gba:relative">
                <PiMagnifyingGlass
                  size={16}
                  className="gba:absolute gba:text-gray-400 gba:pointer-events-none gba:z-10"
                  style={{
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                />
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onKeyDown={handleSearchKeyDown}
                  onClick={handleSearchClick}
                  style={{
                    paddingLeft: "36px",
                    paddingRight: "16px",
                    paddingTop: "12px",
                    paddingBottom: "12px",
                    fontSize: "14px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    width: "100%",
                    height: "44px",
                    outline: "none",
                    backgroundColor: "white",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* Results */}
            <div className="gba:max-h-64 gba:overflow-y-auto">
              {enhancedOptions.length > 0 ? (
                enhancedOptions.map((employee) => (
                  <SelectItem
                    key={employee.id || employee.value}
                    value={employee.value}
                    className="gba:p-0 gba:cursor-pointer gba:hover:bg-gray-50"
                  >
                    <EmployeeSelectItem employee={employee} />
                  </SelectItem>
                ))
              ) : !loading ? (
                <div className="gba:p-4 gba:text-center gba:text-gray-500 gba:text-sm">
                  No employees found
                </div>
              ) : null}

              {/* Loading indicator */}
              {loading && (
                <div className="gba:p-4 gba:text-center">
                  <Spinner size="sm" />
                  <span className="gba:ml-2 gba:text-sm gba:text-gray-500">
                    Loading employees...
                  </span>
                </div>
              )}

              {/* Load more indicator */}
              {hasMore && !loading && (
                <div className="gba:p-2 gba:text-center gba:text-xs gba:text-gray-500">
                  Scroll down to load more employees
                </div>
              )}
            </div>
          </SelectContent>
        </Select>

        {/* Error message */}
        {error && (
          <Alert variant="destructive" className="gba:mt-2">
            <AlertDescription className="gba:text-sm">{error}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};

export default EmployeeSearchableSelect;
