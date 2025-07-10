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
  required = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  
  // Debounce search to avoid too many API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Trigger search when debounced term changes
  useEffect(() => {
    onSearch(debouncedSearchTerm);
  }, [debouncedSearchTerm, onSearch]);

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
      // Reset search when opening dropdown
      setSearchTerm('');
    }
  };

  const handlePopupScroll = (e: any) => {
    const { target } = e;
    if (
      target.scrollTop + target.offsetHeight === target.scrollHeight &&
      hasMore &&
      !loading &&
      onLoadMore
    ) {
      onLoadMore();
    }
  };

  // The options are already in the correct format for Select component
  const selectOptions = options;

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
        onPopupScrollEnd={onLoadMore}
        data-testid={dataTestId}
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