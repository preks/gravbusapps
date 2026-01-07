import React, { useState, useCallback } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Spinner
} from '@newwork/nw-design-system'
import { PiMagnifyingGlass } from 'react-icons/pi'
import { debounce } from 'lodash'

export interface SelectOption {
  id: string
  value: string
  label: string
  name: string
  [key: string]: any
}

export interface SearchableSelectProps {
  value?: string
  placeholder?: string
  options: SelectOption[]
  loading?: boolean
  hasMore?: boolean
  allowClear?: boolean
  showSearch?: boolean
  onSearch?: (searchTerm: string) => void
  onLoadMore?: () => void
  onChange?: (value: string) => void
  'data-testid'?: string
  disabled?: boolean
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  placeholder = 'Search and select...',
  options,
  loading = false,
  hasMore = false,
  showSearch = true,
  onSearch,
  onChange,
  'data-testid': dataTestId,
  disabled = false
}) => {
  const [searchTerm, setSearchTerm] = useState('')

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((term: string) => {
      if (onSearch) {
        onSearch(term)
      }
    }, 300),
    [onSearch]
  )

  // Handle search input change
  const handleSearchChange = useCallback(
    (searchValue: string) => {
      setSearchTerm(searchValue)
      debouncedSearch(searchValue)
    },
    [debouncedSearch]
  )

  // Handle selection change
  const handleChange = useCallback(
    (selectedValue: string) => {
      if (onChange) {
        onChange(selectedValue)
      }
      // Clear search after selection
      setSearchTerm('')
      if (onSearch) {
        onSearch('')
      }
    },
    [onChange, onSearch]
  )

  return (
    <Select value={value} onValueChange={handleChange} disabled={disabled}>
      <SelectTrigger data-testid={dataTestId} className="gba:w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {showSearch && (
          <div className="gba:p-2 gba:border-b gba:border-border">
            <div className="gba:relative">
              <PiMagnifyingGlass className="gba:absolute gba:left-3 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:h-4 gba:w-4 gba:text-muted-foreground" />
              <Input
                placeholder="Type to search..."
                value={searchTerm}
                onChange={e => handleSearchChange(e.target.value)}
                className="gba:pl-10"
                data-testid={dataTestId ? `${dataTestId}-search-input` : 'searchable-select-search-input'}
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
          <div className="gba:p-4 gba:text-center gba:text-muted-foreground">
            {searchTerm ? 'No matching results' : 'No options available'}
          </div>
        ) : (
          <>
            {options.map(option => (
              <SelectItem key={option.id} value={option.value}>
                <div>
                  <div>{option.label}</div>
                  {option.name !== option.label && (
                    <div className="gba:text-xs gba:text-muted-foreground">{option.name}</div>
                  )}
                </div>
              </SelectItem>
            ))}

            {hasMore && !loading && (
              <div className="gba:p-2 gba:text-center gba:text-muted-foreground gba:border-t gba:border-border gba:text-sm">
                Scroll down for more...
              </div>
            )}

            {loading && (
              <div className="gba:p-2 gba:text-center gba:border-t gba:border-border">
                <Spinner size="sm" className="gba:mr-2" />
                Loading more...
              </div>
            )}
          </>
        )}
      </SelectContent>
    </Select>
  )
}

export default SearchableSelect
