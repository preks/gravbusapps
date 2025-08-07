import React, { useState, useCallback } from 'react';
import { Select, Input } from 'antd';
import { SearchOutlined, LoadingOutlined } from '@ant-design/icons';
import { debounce } from 'lodash';

const { Option } = Select;

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
  const [isOpen, setIsOpen] = useState(false);

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

  // Handle scroll to load more
  const handlePopupScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
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
  }, [hasMore, loading, onLoadMore]);

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
    setIsOpen(false);
  }, [onChange, onSearch]);

  // Handle dropdown open/close
  const handleDropdownVisibleChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Reset search when closed
      setSearchTerm('');
      if (onSearch) {
        onSearch('');
      }
    }
  }, [onSearch]);

  return (
    <Select
      value={value}
      placeholder={placeholder}
      allowClear={allowClear}
      showSearch={showSearch}
      searchValue={searchTerm}
      onSearch={handleSearchChange}
      onChange={handleChange}
      onDropdownVisibleChange={handleDropdownVisibleChange}
      onPopupScroll={handlePopupScroll}
      loading={loading}
      disabled={disabled}
      data-testid={dataTestId}
      style={{ width: '100%' }}
      filterOption={false} // Disable client-side filtering
      notFoundContent={
        loading ? (
          <div style={{ padding: '8px', textAlign: 'center' }}>
            <LoadingOutlined /> Loading...
          </div>
        ) : options.length === 0 ? (
          <div style={{ padding: '8px', textAlign: 'center', color: '#999' }}>
            {searchTerm ? 'No matching results' : 'No options available'}
          </div>
        ) : null
      }
      dropdownRender={(menu) => (
        <div>
          {showSearch && isOpen && (
            <div style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>
              <Input
                prefix={<SearchOutlined />}
                placeholder="Type to search..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
          )}
          {menu}
          {hasMore && !loading && (
            <div 
              style={{ 
                padding: '8px', 
                textAlign: 'center', 
                color: '#999',
                borderTop: '1px solid #f0f0f0'
              }}
            >
              Scroll down for more...
            </div>
          )}
          {loading && (
            <div style={{ padding: '8px', textAlign: 'center' }}>
              <LoadingOutlined /> Loading more...
            </div>
          )}
        </div>
      )}
    >
      {options.map((option) => (
        <Option key={option.id} value={option.value} title={option.label}>
          <div>
            <div>{option.label}</div>
            {option.name !== option.label && (
              <div style={{ fontSize: '12px', color: '#999' }}>
                {option.name}
              </div>
            )}
          </div>
        </Option>
      ))}
    </Select>
  );
};

export default SearchableSelect;
