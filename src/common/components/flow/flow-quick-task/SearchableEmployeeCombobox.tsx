import React, { useState, useEffect, useMemo } from 'react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@newwork/nw-design-system'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { cn } from '@/common/utils/cn'

export interface SearchableEmployeeComboboxProps {
  options: Array<{ value: string; label: string; displayName?: string; avatar?: string }>
  value?: string | string[]
  onValueChange?: (value: string | string[]) => void
  onSearchChange: (query: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  loading?: boolean
  className?: string
  multiple?: boolean
  showTeammatesHint?: boolean
}

// Helper to convert base64 to data URL (no memory leak, unlike ObjectURL)
const base64ToDataURL = (base64Data: string): string | undefined => {
  try {
    if (!base64Data || base64Data.startsWith('{')) return undefined
    if (base64Data.startsWith('data:')) return base64Data
    return `data:image/jpeg;base64,${base64Data}`
  } catch {
    return undefined
  }
}

/**
 * Custom searchable combobox for employee selection
 * Manually handles search to avoid bugs in the default Combobox onSearch implementation
 * Supports both single and multi-select modes
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
  className,
  multiple = false,
  showTeammatesHint = false
}) => {
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')

  // Store all options we've seen to maintain data for selected employees
  // even when they're filtered out by search (includes avatarUrl)
  const allSeenOptionsRef = React.useRef<Map<string, (typeof options)[0] & { avatarUrl?: string }>>(new Map())

  // Trigger search when search value changes (debounced by parent)
  useEffect(() => {
    onSearchChange(searchValue)
  }, [searchValue, onSearchChange])

  // No longer trigger search on dropdown open - let the parent component handle initial load
  // The parent (useQuickTaskForm) already fetches on mount, so we don't need to refetch when opening

  // Process current options and update cache synchronously
  const optionsWithAvatarUrls = useMemo(() => {
    return options.map(option => {
      const existing = allSeenOptionsRef.current.get(option.value)

      // Check if we can reuse existing cached avatar URL
      if (existing && existing.avatar === option.avatar && existing.avatarUrl) {
        // Avatar data hasn't changed, reuse existing avatarUrl
        return existing
      }

      // Create new avatar URL
      const avatarUrl = option.avatar && !option.avatar.startsWith('{') ? base64ToDataURL(option.avatar) : undefined

      const optionWithAvatar = {
        ...option,
        avatarUrl
      }

      // Update cache
      allSeenOptionsRef.current.set(option.value, optionWithAvatar)

      return optionWithAvatar
    })
  }, [options])

  const handleMultiSelect = (selectedValue: string) => {
    const currentValues = Array.isArray(value) ? value : []
    const isSelected = currentValues.includes(selectedValue)
    const newValues = isSelected ? currentValues.filter(v => v !== selectedValue) : [...currentValues, selectedValue]
    onValueChange?.(newValues)
    setSearchValue('')
  }

  const handleSingleSelect = (selectedValue: string) => {
    const newValue = selectedValue === value ? '' : selectedValue
    onValueChange?.(newValue)
    setOpen(false)
  }

  const handleSelect = multiple ? handleMultiSelect : handleSingleSelect

  const selectedOptionsWithAvatar = useMemo(() => {
    if (multiple) {
      const selectedValues = Array.isArray(value) ? value : []
      // Get selected employees, prioritizing current options (which might have updated avatar data)
      // This ensures avatars are always fresh if available
      return selectedValues
        .map(val => {
          // First check if employee is in current options (might have fresh avatar data)
          const currentOption = optionsWithAvatarUrls.find(opt => opt.value === val)
          if (currentOption) {
            return currentOption
          }
          // Fall back to cache if not in current options (e.g., doesn't match current search)
          return allSeenOptionsRef.current.get(val)
        })
        .filter((opt): opt is NonNullable<typeof opt> => opt !== null && opt !== undefined)
    } else {
      const selected = optionsWithAvatarUrls.find(opt => opt.value === value)
      return selected ? [selected] : []
    }
  }, [value, optionsWithAvatarUrls, multiple])

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

  // Get initials for avatar fallback (like TaskCard)
  const getInitials = (label: string) => {
    const parts = label.trim().split(/\s+/)
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return label.substring(0, 2).toUpperCase()
  }

  return (
    <>
      {/* Trigger Button */}
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className={cn('gba:w-full gba:justify-between', className)}
        disabled={disabled}
      >
        {selectedOptionsWithAvatar.length > 0 ? (
          <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1 gba:min-w-0">
            {multiple ? (
              <>
                <div className="gba:flex gba:-space-x-2 gba:py-1">
                  {selectedOptionsWithAvatar.slice(0, 3).map(option => (
                    <Avatar
                      key={option.value}
                      className="gba:h-7 gba:w-7 gba:flex-shrink-0 gba:border-2 gba:border-background"
                    >
                      {option.avatarUrl && <AvatarImage src={option.avatarUrl} alt={option.label} />}
                      <AvatarFallback className="gba:text-xs gba:font-medium gba:bg-gradient-to-br gba:from-blue-500 gba:to-purple-600 gba:text-white">
                        {getInitials(option.label)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <span className="gba:truncate gba:font-medium">
                  {selectedOptionsWithAvatar.length === 1
                    ? selectedOptionsWithAvatar[0].displayName || selectedOptionsWithAvatar[0].label
                    : `${selectedOptionsWithAvatar.length} employees selected`}
                </span>
              </>
            ) : (
              <>
                <Avatar className="gba:h-6 gba:w-6 gba:flex-shrink-0">
                  {selectedOptionsWithAvatar[0].avatarUrl && (
                    <AvatarImage
                      src={selectedOptionsWithAvatar[0].avatarUrl}
                      alt={selectedOptionsWithAvatar[0].label}
                    />
                  )}
                  <AvatarFallback className="gba:text-xs gba:font-medium gba:bg-gradient-to-br gba:from-blue-500 gba:to-purple-600 gba:text-white">
                    {getInitials(selectedOptionsWithAvatar[0].label)}
                  </AvatarFallback>
                </Avatar>
                <span className="gba:truncate">
                  {selectedOptionsWithAvatar[0].displayName || selectedOptionsWithAvatar[0].label}
                </span>
              </>
            )}
          </div>
        ) : (
          <span className="gba:text-muted-foreground">{placeholder}</span>
        )}
        <ChevronsUpDown className="gba:opacity-50 gba:ml-2 gba:shrink-0" />
      </Button>

      {/* Selection Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="gba:flex gba:flex-col gba:p-0 gba:w-full"
          style={{
            maxWidth: '672px',
            minWidth: '672px',
            width: '672px',
            maxHeight: '90vh',
            minHeight: '80vh',
            height: '90vh'
          }}
        >
          <DialogHeader className="gba:px-6 gba:pt-6 gba:pb-4 gba:flex-shrink-0">
            <DialogTitle>Select Employees</DialogTitle>
            {showTeammatesHint && !searchValue && options.length > 0 && (
              <p className="gba:text-sm gba:text-muted-foreground gba:mt-2">
                Showing your teammates. Type to search all employees.
              </p>
            )}
          </DialogHeader>

          {/* Selected Employees Section (Multi-select only) */}
          {multiple && selectedOptionsWithAvatar.length > 0 && (
            <div className="gba:flex gba:flex-col gba:gap-2 gba:px-6 gba:pb-4 gba:flex-shrink-0">
              <div className="gba:text-sm gba:font-medium gba:text-muted-foreground">
                Selected ({selectedOptionsWithAvatar.length})
              </div>
              <div className="gba:flex gba:flex-wrap gba:gap-2">
                {selectedOptionsWithAvatar.map(option => (
                  <div
                    key={option.value}
                    className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-2 gba:bg-secondary gba:rounded-md"
                  >
                    <Avatar className="gba:h-6 gba:w-6 gba:flex-shrink-0">
                      {option.avatarUrl && <AvatarImage src={option.avatarUrl} alt={option.label} />}
                      <AvatarFallback className="gba:text-xs gba:font-medium gba:bg-gradient-to-br gba:from-blue-500 gba:to-purple-600 gba:text-white">
                        {getInitials(option.label)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="gba:text-sm">{option.displayName || option.label}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gba:h-5 gba:w-5 gba:p-0"
                      onClick={() => handleSelect(option.value)}
                    >
                      <X className="gba:h-3 gba:w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search and List - This should fill remaining space */}
          <div className="gba:flex-1 gba:min-h-0 gba:px-6">
            <Command shouldFilter={false} className="gba:h-full gba:border gba:rounded-lg gba:flex gba:flex-col">
              <CommandInput
                placeholder={searchPlaceholder}
                value={searchValue}
                onValueChange={setSearchValue}
                className="gba:h-11 gba:flex-shrink-0"
              />
              <CommandList className="gba:flex-1 gba:min-h-0 gba:max-h-full gba:overflow-y-auto gba:pb-4">
                {renderEmptyState()}

                <CommandGroup className="gba:pb-2">
                  {optionsWithAvatarUrls
                    .filter(option => {
                      // In multi-select mode, exclude already selected employees
                      if (multiple && Array.isArray(value)) {
                        return !value.includes(option.value)
                      }
                      return true
                    })
                    .map(option => {
                      const isSelected = multiple ? false : value === option.value

                      return (
                        <CommandItem
                          key={option.value}
                          value={option.value}
                          onSelect={handleSelect}
                          className="gba:cursor-pointer"
                        >
                          <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1 gba:min-w-0">
                            <Avatar className="gba:h-8 gba:w-8 gba:flex-shrink-0">
                              {option.avatarUrl && <AvatarImage src={option.avatarUrl} alt={option.label} />}
                              <AvatarFallback className="gba:text-xs gba:font-medium gba:bg-gradient-to-br gba:from-blue-500 gba:to-purple-600 gba:text-white">
                                {getInitials(option.label)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="gba:flex gba:flex-col gba:flex-1 gba:min-w-0">
                              <span className="gba:truncate gba:font-medium">{option.displayName || option.label}</span>
                              {option.displayName && option.displayName !== option.label && (
                                <span className="gba:text-xs gba:text-muted-foreground gba:truncate">
                                  {option.label}
                                </span>
                              )}
                            </div>
                          </div>
                          {!multiple && isSelected && <Check className="gba:ml-2 gba:shrink-0" />}
                        </CommandItem>
                      )
                    })}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>

          {/* Sticky Footer */}
          <div className="gba:border-t gba:bg-background gba:px-6 gba:py-5 gba:flex gba:justify-end gba:gap-3 gba:flex-shrink-0">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => setOpen(false)}
              disabled={multiple && (!value || (Array.isArray(value) && value.length === 0))}
            >
              Done
              {multiple && Array.isArray(value) && value.length > 0 && (
                <span className="gba:ml-2">({value.length})</span>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
