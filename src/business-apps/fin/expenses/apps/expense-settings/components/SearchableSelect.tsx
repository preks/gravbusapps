import React, { useMemo, useCallback, useState, useEffect } from 'react'
import { Combobox } from '@newwork/nw-design-system'

export interface SelectOption {
  id: string
  value: string
  label: string
  name: string
  code?: string
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
  onSearch,
  onLoadMore,
  onChange,
  'data-testid': dataTestId,
  disabled = false
}) => {
  // Store selected option so we can display it even when not in current options
  const [selectedOption, setSelectedOption] = useState<SelectOption | null>(null)

  // Update selected option when value changes or options update
  useEffect(() => {
    if (value) {
      // First check if selected option already matches
      if (selectedOption?.value === value) return

      // Try to find in current options
      const found = options.find(opt => opt.value === value)
      if (found) {
        setSelectedOption(found)
      }
    } else {
      setSelectedOption(null)
    }
  }, [value, options, selectedOption?.value])

  // Handle selection change
  const handleChange = useCallback(
    (selectedValue: string | null) => {
      if (!selectedValue) {
        setSelectedOption(null)
        if (onChange) {
          onChange('')
        }
        return
      }

      // Find the selected option and store it
      const selected = options.find(opt => opt.value === selectedValue)
      if (selected) {
        setSelectedOption(selected)
      }

      if (onChange) {
        onChange(selectedValue)
      }
    },
    [onChange, options]
  )

  // Handle search
  const handleSearch = useCallback(
    (searchTerm: string) => {
      if (onSearch) {
        onSearch(searchTerm)
      }
    },
    [onSearch]
  )

  // Handle load more (infinite scroll)
  const handleLoadMore = useCallback(() => {
    if (onLoadMore) {
      onLoadMore()
    }
  }, [onLoadMore])

  // Build options for Combobox with proper labels
  const comboboxOptions = useMemo(() => {
    // Include selected option if not in current list
    let allOptions = [...options]
    if (selectedOption && !options.find(opt => opt.value === selectedOption.value)) {
      allOptions = [selectedOption, ...options]
    }

    return allOptions.map(option => ({
      value: option.value,
      label: (
        <div className="gba:flex gba:flex-col gba:min-w-0 gba:w-full">
          <div className="gba:text-sm gba:font-medium gba:truncate">{option.label}</div>
          {option.code && <div className="gba:text-xs gba:text-muted-foreground gba:truncate">Code: {option.code}</div>}
        </div>
      )
    }))
  }, [options, selectedOption])

  // Empty text based on loading state
  const emptyText = loading ? 'Loading...' : 'No options found'

  return (
    <div className="gba:w-full gba:max-w-full gba:overflow-hidden">
      <Combobox
        className="gba:w-full"
        options={comboboxOptions as any}
        value={value || ''}
        onValueChange={handleChange}
        placeholder={placeholder}
        searchPlaceholder="Type to search..."
        emptyText={emptyText}
        onSearch={handleSearch}
        onLoadMore={handleLoadMore}
        hasMore={hasMore}
        searchDebounce={300}
        loading={loading}
        disabled={disabled}
        data-testid={dataTestId}
        align="start"
        popoverContentClassName="gba:max-h-[300px] gba:overflow-y-auto"
      />
    </div>
  )
}

export default SearchableSelect
