import React from 'react'
import { Input } from '@newwork/nw-design-system'
import { Button } from '@newwork/nw-design-system'
import { RiSearchLine, RiCloseLine } from '@remixicon/react'
import { useDebounce } from '@/common/hooks/useDebounce'
import { SearchBarProps } from '../types'

const SearchBar: React.FC<SearchBarProps> = ({ value, onChange, onClear, placeholder = 'Search CRM areas...' }) => {
  const [localValue, setLocalValue] = React.useState(value)
  const debouncedValue = useDebounce(localValue, 300)

  // Update parent when debounced value changes
  React.useEffect(() => {
    onChange(debouncedValue)
  }, [debouncedValue, onChange])

  // Update local value when prop value changes
  React.useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(event.target.value)
  }

  const handleClear = () => {
    setLocalValue('')
    onClear()
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      handleClear()
    }
  }

  return (
    <div className="gba:relative gba:w-full" data-testid="search-bar-container">
      <div className="gba:relative">
        <RiSearchLine
          className="gba:absolute gba:left-3 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:h-4 gba:w-4 gba:text-gray-400"
          data-testid="search-icon"
        />
        <Input
          type="text"
          placeholder={placeholder}
          value={localValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className="gba:pl-9 gba:pr-9 gba:py-2 gba:w-full gba:border-gray-300 gba:bg-hsl(var(--background)) gba:text-sm gba:rounded-md focus:gba:ring-2 focus:gba:ring-blue-500 focus:gba:border-blue-500 gba:transition-colors gba:duration-200"
          data-testid="search-input"
          aria-label="Search CRM areas"
        />
        {localValue && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="gba:absolute gba:right-1 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:h-6 gba:w-6 gba:p-0 gba:rounded-full hover:gba:bg-gray-100 gba:transition-colors gba:duration-200"
            data-testid="search-clear-button"
            aria-label="Clear search"
          >
            <RiCloseLine className="gba:h-3 gba:w-3 gba:text-gray-400" />
          </Button>
        )}
      </div>
    </div>
  )
}

export default SearchBar
