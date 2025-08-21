import React, { useState, useCallback } from 'react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Spinner
} from '@newwork/nw-design-system';
import { PiMagnifyingGlass } from 'react-icons/pi';
import { debounce } from 'lodash';

export interface SelectOption {
  id: string;
  value: string;
  label: string;
  name: string;
  [key: string]: any;
}

export interface SearchableSelectProps {
  value?: string;
  placeholder?: string;
  options: SelectOption[];
  loading?: boolean;
  hasMore?: boolean;
  allowClear?: boolean;
  showSearch?: boolean;
  onSearch?: (searchTerm: string) => void;
  onLoadMore?: () => void;
  onChange?: (value: string) => void;
  'data-testid'?: string;
  disabled?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  placeholder = "Search and select...",
  options,
  loading = false,
  hasMore = false,
  allowClear = true,
  showSearch = true,
  onSearch,
  onLoadMore,
  onChange,
  'data-testid': dataTestId,
  disabled = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');

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
  const handleSearchChange = useCallback((searchValue: string) => {
    setSearchTerm(searchValue);
    debouncedSearch(searchValue);
  }, [debouncedSearch]);

  // Handle selection change
  const handleChange = useCallback((selectedValue: string) => {
    if (onChange) {
      onChange(selectedValue);
    }
    // Clear search after selection
    setSearchTerm('');
    if (onSearch) {
      onSearch('');
    }
  }, [onChange, onSearch]);

  return (
    <Select
      value={value}
      onValueChange={handleChange}
      disabled={disabled}
    >
      <SelectTrigger data-testid={dataTestId} className="gba:w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {showSearch && (
          <div className="gba:p-2 gba:border-b gba:border-gray-200">
            <div className="gba:relative">
              <PiMagnifyingGlass className="gba:absolute gba:left-3 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:h-4 gba:w-4 gba:text-gray-400" />
              <Input
                placeholder="Type to search..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="gba:pl-10"
              />
            </div>
          </div>
        )}
        
        {loading ? (
          <div className="gba:p-4 gba:text-center">
            <Spinner size="sm" className="gba:mr-2" />
            Loading...
          </div>
        ) : options.length === 0 ? (
          <div className="gba:p-4 gba:text-center gba:text-gray-500">
            {searchTerm ? 'No matching results' : 'No options available'}
          </div>
        ) : (
          <>
            {options.map((option) => (
              <SelectItem key={option.id} value={option.value}>
                <div>
                  <div>{option.label}</div>
                  {option.name !== option.label && (
                    <div className="gba:text-xs gba:text-gray-500">
                      {option.name}
                    </div>
                  )}
                </div>
              </SelectItem>
            ))}
            
            {hasMore && !loading && (
              <div className="gba:p-2 gba:text-center gba:text-gray-500 gba:border-t gba:border-gray-200 gba:text-sm">
                Scroll down for more...
              </div>
            )}
            
            {loading && (
              <div className="gba:p-2 gba:text-center gba:border-t gba:border-gray-200">
                <Spinner size="sm" className="gba:mr-2" />
                Loading more...
              </div>
            )}
          </>
        )}
      </SelectContent>
    </Select>
  );
};

export default SearchableSelect;
