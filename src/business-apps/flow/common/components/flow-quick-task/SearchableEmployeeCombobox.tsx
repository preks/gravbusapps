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
  PopoverTrigger,
  Avatar,
  AvatarImage,
  AvatarFallback
} from '@newwork/nw-design-system'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/common/utils/cn'

export interface SearchableEmployeeComboboxProps {
  options: Array<{
    value: string
    label: string
    avatarUrl?: string
    email?: string
    firstName?: string
    lastName?: string
  }>
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

  // Get initials for avatar fallback
  const getInitials = (option: (typeof options)[0]): string => {
    if (option.firstName && option.lastName) {
      return `${option.firstName.charAt(0)}${option.lastName.charAt(0)}`.toUpperCase()
    }
    // Fallback to first two letters of label
    return option.label.substring(0, 2).toUpperCase()
  }

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
          className={cn('gba:w-full gba:justify-between gba:h-auto gba:py-2', className)}
          disabled={disabled}
        >
          {selectedOption ? (
            <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1 gba:min-w-0">
              <Avatar className="gba:h-6 gba:w-6 gba:shrink-0">
                {selectedOption.avatarUrl && <AvatarImage src={selectedOption.avatarUrl} alt={selectedOption.label} />}
                <AvatarFallback className="gba:text-xs">{getInitials(selectedOption)}</AvatarFallback>
              </Avatar>
              <div className="gba:flex gba:flex-col gba:items-start gba:min-w-0">
                <span className="gba:text-sm gba:font-medium gba:truncate gba:max-w-full">{selectedOption.label}</span>
                {selectedOption.email && (
                  <span className="gba:text-xs gba:text-muted-foreground gba:truncate gba:max-w-full">
                    {selectedOption.email}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <span className="gba:text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="gba:ml-2 gba:h-4 gba:w-4 gba:shrink-0 gba:opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="gba:w-[var(--radix-popover-trigger-width)] gba:p-0" align="start">
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
                <CommandItem key={option.value} value={option.value} onSelect={handleSelect} className="gba:py-2">
                  <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1 gba:min-w-0">
                    <Avatar className="gba:h-8 gba:w-8 gba:shrink-0">
                      {option.avatarUrl && <AvatarImage src={option.avatarUrl} alt={option.label} />}
                      <AvatarFallback className="gba:text-xs">{getInitials(option)}</AvatarFallback>
                    </Avatar>
                    <div className="gba:flex gba:flex-col gba:flex-1 gba:min-w-0">
                      <span className="gba:text-sm gba:font-medium gba:truncate">{option.label}</span>
                      {option.email && (
                        <span className="gba:text-xs gba:text-muted-foreground gba:truncate">{option.email}</span>
                      )}
                    </div>
                  </div>
                  <Check
                    className={cn(
                      'gba:ml-auto gba:h-4 gba:w-4 gba:shrink-0',
                      value === option.value ? 'gba:opacity-100' : 'gba:opacity-0'
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
