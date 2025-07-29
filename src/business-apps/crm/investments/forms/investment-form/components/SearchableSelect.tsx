import React, { useState, useEffect, useMemo } from 'react';
import { Select } from '@newwork/gravity-ui-catalog';
import { Spin } from 'antd';
import { SelectOption } from '../types';
import { useDebounce } from '@/common/hooks/useDebounce';

interface SearchableSelectProps {
  label: string;
  name: string;
  value?: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onSearch: (searchTerm: string) => void;
  error?: string | null;
  'data-testid'?: string;
  required?: boolean;
  disabled?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  name,
  value,
  onChange,
  options = [],
  placeholder = "Please Select...",
  loading = false,
  hasMore = false,
  onLoadMore,
  onSearch,
  error,
  'data-testid': dataTestId,
  required = false,
  disabled = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  
  // Debounce search to avoid too many API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Trigger search when debounced term changes (but avoid triggering on mount)
  useEffect(() => {
    if (debouncedSearchTerm !== undefined) {
      onSearch(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm, onSearch]);

  // Load initial data if value is present but options are empty
  useEffect(() => {
    if (value && options.length === 0 && !loading) {

      onSearch('');
    }
  }, [value, options.length, loading, onSearch, name]);

  // Find the display value for the selected option
  const selectedOption = useMemo(() => {
    return options.find(option => String(option.value) === String(value));
  }, [options, value]);

  const handleSearch = (searchValue: string) => {
    setSearchTerm(searchValue);
  };

  const handleChange = (selectedValue: any) => {
    onChange(String(selectedValue || ''));
  };

  const handleDropdownOpen = (open: boolean) => {
    setIsOpen(open);
    if (open && !searchTerm) {
      // Load initial data when opening dropdown without search
      onSearch('');
    }
  };

  // Transform options to the format expected by Select component
  const selectOptions = options.map(option => ({
    id: option.id,
    value: option.value,
    label: option.label,
    name: option.name
  }));

  return (
    <div>
      <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
        {label} {required && <span className="gba:text-red-500">*</span>}
      </label>
      
      <Select
        name={name}
        value={value}
        onChange={(e) => handleChange(e.value)}
        data={selectOptions}
        placeholder={placeholder}
        loading={loading}
        disabled={disabled}
        onPopupScrollEnd={onLoadMore}
        onOpenChange={handleDropdownOpen}
        showSearch
        onSearch={handleSearch}
        filterOption={false}
        data-testid={dataTestId}
        notFoundContent={loading ? <Spin size="small" /> : "No options found"}
      />
      {error && (
        <p className="gba:mt-1 gba:text-sm gba:text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};

export default SearchableSelect; 