import React, { useState, useEffect } from 'react'
import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@newwork/nw-design-system'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/common/utils/cn'

export interface SearchableEmployeeComboboxProps {
  options: Array<{ value: string; label: string }>
  value?: string
  onValueChange?: (value: string) => void
  onSearchChange: (query: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  loading?: boolean
  className?: string
}

/**
 * Custom searchable combobox for employee selection
 * Manually handles search to avoid bugs in the default Combobox onSearch implementation
 */
export const SearchableEmployeeCombobox: React.FC<SearchableEmployeeComboboxProps> = ({
  options,
  value,
  onValueChange,
  onSearchChange,
  placeholder = 'Select employee...',
  searchPlaceholder = 'Search employees...',
  emptyText = 'No employees found.',
  disabled = false,
  loading = false,
  className
}) => {
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')

  // Trigger search when search value changes
  useEffect(() => {
    onSearchChange(searchValue)
  }, [searchValue, onSearchChange])

  // Trigger initial search when dropdown opens
  useEffect(() => {
    if (open && searchValue === '') {
      onSearchChange('')
    }
  }, [open, searchValue, onSearchChange])

  const handleSelect = (selectedValue: string) => {
    const newValue = selectedValue === value ? '' : selectedValue
    onValueChange?.(newValue)
    setOpen(false)
  }

  const selectedOption = options.find(opt => opt.value === value)

  // Render empty state message based on loading and options
  const renderEmptyState = () => {
    if (loading && options.length === 0) {
      return <CommandEmpty>Loading...</CommandEmpty>
    }
    if (options.length === 0) {
      return <CommandEmpty>{emptyText}</CommandEmpty>
    }
    return null
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-expanded={open}
          className={cn('gba:w-full gba:justify-between', className)}
          disabled={disabled}
        >
          {selectedOption?.label || placeholder}
          <ChevronsUpDown className="gba:opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="gba:w-[var(--radix-popover-trigger-width)] gba:p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={searchValue}
            onValueChange={setSearchValue}
            className="gba:h-9"
          />
          <CommandList>
            {renderEmptyState()}
            <CommandGroup>
              {options.map(option => (
                <CommandItem key={option.value} value={option.value} onSelect={handleSelect}>
                  {option.label}
                  <Check className={cn('gba:ml-auto', value === option.value ? 'gba:opacity-100' : 'gba:opacity-0')} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
