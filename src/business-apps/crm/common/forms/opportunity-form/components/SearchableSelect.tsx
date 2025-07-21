import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Input, Label, Spinner } from '@newwork/nw-design-system';
import { PiMagnifyingGlass } from 'react-icons/pi';
import { SelectOption } from '../types';
import { formatDataTestId } from '@/common/utils/formatDataTestId';

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
  'data-testid'?: string;
  className?: string;
  disabled?: boolean;
  error?: string | null;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  name,
  value,
  placeholder = 'Search and select...',
  options,
  loading = false,
  hasMore = false,
  onSearch,
  onLoadMore,
  onChange,
  'data-testid': dataTestId,
  className = '',
  disabled = false,
  error
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [cachedSelectedOption, setCachedSelectedOption] = useState<SelectOption | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Find the selected option in current options
  const selectedOption = value ? options.find(option => 
    option.value === value || option.id === value
  ) : undefined;

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
  const displayValue = displayOption ? displayOption.label : undefined;

  // Create enhanced options that always include the selected option
  const enhancedOptions = React.useMemo(() => {
    if (!cachedSelectedOption || !value) return options;
    
    // Check if the cached selected option is already in the current options
    const isSelectedInOptions = options.some(option => 
      option.value === cachedSelectedOption.value || option.id === cachedSelectedOption.id
    );
    
    if (isSelectedInOptions) {
      return options;
    }
    
    // Add the cached selected option to the beginning of the list
    return [cachedSelectedOption, ...options];
  }, [options, cachedSelectedOption, value]);

  // Debug logging
  useEffect(() => {
    if (value && displayOption) {
      console.log('✅ Option selected:', displayOption.label);
    } else if (value && !displayOption) {
      console.log('❌ Option value not found:', value, 'in', options.length, 'options');
    }
  }, [value, displayOption, options.length]);

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
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const term = e.target.value;
    setSearchTerm(term);
    debouncedSearch(term);
  }, [debouncedSearch]);

  // Prevent search input from affecting Select
  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation();
  }, []);

  const handleSearchClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  // Handle scroll to load more
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { target } = e;
    if (target instanceof HTMLDivElement) {
      const { scrollTop, scrollHeight, clientHeight } = target;
      if (scrollTop + clientHeight >= scrollHeight - 10 && hasMore && !loading && onLoadMore) {
        onLoadMore();
      }
    }
  }, [hasMore, loading, onLoadMore]);

  // Handle selection change
  const handleChange = useCallback((selectedValue: string) => {
    // Find the selected option to cache it
    const newSelectedOption = enhancedOptions.find(option => 
      option.value === selectedValue || option.id === selectedValue
    );
    
    if (newSelectedOption) {
      setCachedSelectedOption(newSelectedOption);
    }
    
    if (onChange) {
      onChange(selectedValue);
    }
    
    // Clear search after selection
    setSearchTerm('');
    if (onSearch) {
      onSearch('');
    }
    setIsOpen(false);
  }, [onChange, onSearch, enhancedOptions]);

  // Handle dropdown open/close
  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Reset search when closing dropdown
      setSearchTerm('');
      if (onSearch) {
        onSearch('');
      }
    }
  }, [onSearch]);

  // Reset search when options change (but preserve selected option)
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  return (
    <div className={`gba:w-full gba:max-w-full gba:overflow-hidden ${className}`}>
      {label && (
        <Label htmlFor={name} className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2 gba:truncate">
          {label}
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
          <SelectTrigger className="gba:w-full gba:max-w-full">
            <div className="gba:truncate gba:overflow-hidden">
              {displayValue || placeholder}
            </div>
          </SelectTrigger>
          <SelectContent className="gba:w-full gba:min-w-[200px] gba:max-w-[400px]">
            {/* Search input */}
            <div 
              className="gba:p-2 gba:border-b gba:border-gray-200"
              onClick={handleSearchClick}
            >
              <div className="gba:flex gba:items-center gba:w-full gba:border gba:border-gray-300 gba:rounded-md gba:shadow-sm gba:bg-white gba:transition-all gba:duration-200 gba:hover:border-gray-400 gba:focus-within:ring-1 gba:focus-within:ring-blue-500 gba:focus-within:border-blue-500">
                <div className="gba:flex gba:items-center gba:justify-center gba:pl-2 gba:w-8 gba:text-gray-400">
                  <PiMagnifyingGlass size={14} />
                </div>
                <Input
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onKeyDown={handleSearchKeyDown}
                  onClick={handleSearchClick}
                  placeholder="Search..."
                  className="gba:w-full gba:py-1.5 gba:pr-2 gba:border-0 gba:focus:outline-none gba:focus:ring-0 gba:focus:shadow-none gba:text-sm gba:rounded-md"
                  autoFocus
                />
              </div>
            </div>
            
            {/* Options list */}
            <div ref={listRef} onScroll={handleScroll} className="gba:max-h-48 gba:overflow-y-auto">
              {enhancedOptions.length > 0 ? (
                enhancedOptions.map((option, index) => (
                  <SelectItem key={`${option.id}-${index}`} value={option.value}>
                    <div className="gba:flex gba:items-center gba:justify-between gba:w-full">
                      <span className="gba:truncate">{option.label}</span>
                      {cachedSelectedOption && (cachedSelectedOption.value === option.value || cachedSelectedOption.id === option.id) && (
                        <span className="gba:text-xs gba:text-blue-600 gba:font-medium gba:ml-2">✓</span>
                      )}
                    </div>
                  </SelectItem>
                ))
              ) : (
                !loading && searchTerm && (
                  <div className="gba:p-4 gba:text-center gba:text-gray-500">
                    No results found for "{searchTerm}"
                  </div>
                )
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
            </div>
          </SelectContent>
        </Select>
      </div>
      {error && (
        <div className="gba:mt-1 gba:text-sm gba:text-red-600">
          {error}
        </div>
      )}
    </div>
  );
};

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export default SearchableSelect; 