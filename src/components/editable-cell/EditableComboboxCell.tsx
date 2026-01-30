import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Combobox, Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@newwork/nw-design-system'

export interface EditableComboboxCellProps {
  // Union type: single select (string) or multi select (string[])
  value: string | string[] | undefined
  onChange: (value: string | string[]) => void
  options: Array<{ id: string; name: string; optionLabel?: React.ReactNode }>
  placeholder?: string
  disabled?: boolean
  testId: string
  isEdited?: boolean
  isLoading?: boolean
  onSearch?: (searchTerm: string) => void
  onOpenChange?: (open: boolean) => void
  onLoadMore?: () => Promise<void>
  hasMore?: boolean
  searchDebounce?: number
  mode?: 'default' | 'multiple' // Add mode prop
  hasError?: boolean
  enableClientFilter?: boolean // Enable client-side filtering when onSearch is not provided
}

export const EditableComboboxCell: React.FC<EditableComboboxCellProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  disabled = false,
  testId,
  isEdited = false,
  isLoading = false,
  onSearch,
  onOpenChange,
  onLoadMore,
  hasMore = false,
  searchDebounce = 300,
  mode = 'default',
  hasError = false,
  enableClientFilter = false
}) => {
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)
  const [hasOpened, setHasOpened] = useState(false)
  const [clientSearchTerm, setClientSearchTerm] = useState<string>('')
  const wrapperRef = useRef<HTMLDivElement>(null)
  const multiple = mode === 'multiple'

  // Handle search with debounce
  const handleSearch = useCallback(
    (searchTerm: string) => {
      // First search indicates combobox was opened
      if (!hasOpened && onOpenChange) {
        setHasOpened(true)
        onOpenChange(true)
      }

      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }

      // Client-side filtering
      if (enableClientFilter && !onSearch) {
        setClientSearchTerm(searchTerm)
        return
      }

      if (onSearch) {
        const timer = setTimeout(() => {
          onSearch(searchTerm)
        }, searchDebounce)
        setDebounceTimer(timer)
      }
    },
    [onSearch, searchDebounce, debounceTimer, hasOpened, onOpenChange, enableClientFilter]
  )

  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
    }
  }, [debounceTimer])

  // Normalize value based on mode
  const normalizedValue = useMemo(() => {
    if (multiple) {
      if (!Array.isArray(value)) return []
      return value.map(v => {
        if (typeof v === 'string') return v
        if (typeof v === 'object' && v !== null) {
          return (v as any)?.id || (v as any)?.name || String(v)
        }
        return String(v)
      })
    } else {
      return typeof value === 'string' ? value : ''
    }
  }, [value, multiple])

  // Convert options to Combobox format with truncate and tooltip
  const comboboxOptions = useMemo(() => {
    // Client-side filtering if enabled
    let filteredOptions = options
    if (enableClientFilter && clientSearchTerm) {
      const searchLower = clientSearchTerm.toLowerCase()
      filteredOptions = options.filter(opt => opt.name.toLowerCase().includes(searchLower))
    }

    const createLabel = (text: string) => (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="gba:text-xs gba:truncate gba:block gba:w-full gba:text-left">{text}</span>
          </TooltipTrigger>
          <TooltipContent side="right" align="start">
            <span className="gba:text-xs">{text}</span>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )

    const opts = filteredOptions.map(opt => ({
      value: opt.id,
      label: createLabel(opt.name),
      optionLabel: opt.optionLabel
    }))

    if (multiple) {
      // Add selected values that are not yet in options
      const selectedValues = Array.isArray(normalizedValue) ? normalizedValue : []
      selectedValues.forEach(val => {
        if (val && !opts.some(opt => opt.value === val)) {
          opts.push({
            value: val,
            label: createLabel(val)
          })
        }
      })
    } else {
      // If value exists but is not in options, add it
      const singleValue = typeof normalizedValue === 'string' ? normalizedValue : ''
      if (singleValue?.trim() && !opts.some(opt => opt.value === singleValue)) {
        opts.push({
          value: singleValue,
          label: createLabel(singleValue)
        })
      }
    }

    return opts
  }, [options, normalizedValue, multiple, enableClientFilter, clientSearchTerm])

  // Get border class based on edited state and error state
  const getBorderClass = () => {
    if (hasError) {
      return 'gba:border gba:border-destructive'
    }
    if (isEdited) {
      return 'gba:border gba:border-blue-500'
    }
    return 'gba:border gba:border-gray-200'
  }

  // Handle value change
  const handleValueChange = useCallback(
    (newValue: string | string[]) => {
      onChange(newValue)
    },
    [onChange]
  )

  // Get ring class for multiple mode
  const getMultipleRingClass = () => {
    if (hasError) return 'gba:ring-1 gba:ring-destructive'
    if (isEdited) return 'gba:ring-1 gba:ring-blue-500'
    return ''
  }

  // In multiple mode, remove border/background from the Button wrapper
  // The className is applied to the Button element (see Combobox.tsx line 428-432)
  const commonComboboxClassName = multiple
    ? `gba:w-full gba:h-6 gba:text-xs gba:p-1 gba:bg-transparent gba:focus:bg-transparent gba:border-0 gba:shadow-none gba:hover:bg-transparent ${getMultipleRingClass()}`
    : `gba:w-full gba:h-6 gba:text-xs gba:p-1 gba:bg-transparent gba:focus:bg-white ${getBorderClass()}`

  const comboboxProps = multiple
    ? {
        className: commonComboboxClassName,
        options: comboboxOptions,
        value: normalizedValue as string[],
        onValueChange: handleValueChange as (value: string[]) => void,
        mode: 'multiple' as const,
        placeholder,
        searchPlaceholder: 'Type to search...',
        emptyText: isLoading ? 'Loading...' : 'No results found',
        onSearch: enableClientFilter ? handleSearch : onSearch ? handleSearch : undefined,
        onLoadMore,
        hasMore,
        searchDebounce,
        loading: isLoading,
        disabled,
        'data-testid': testId,
        align: 'start' as const
      }
    : {
        className: commonComboboxClassName,
        options: comboboxOptions,
        value: normalizedValue as string,
        onValueChange: handleValueChange as (value: string) => void,
        placeholder,
        searchPlaceholder: 'Type to search...',
        emptyText: isLoading ? 'Loading...' : 'No results found',
        onSearch: enableClientFilter ? handleSearch : onSearch ? handleSearch : undefined,
        onLoadMore,
        hasMore,
        searchDebounce,
        loading: isLoading,
        disabled,
        'data-testid': testId,
        align: 'start' as const
      }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.stopPropagation()
    }
  }

  return (
    <div
      ref={wrapperRef}
      className={multiple ? 'gba:min-w-[200px]' : 'gba:min-w-[100px]'}
      role="none"
      aria-invalid={hasError ? 'true' : undefined}
    >
      <div onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <Combobox {...comboboxProps} />
      </div>
    </div>
  )
}

export default EditableComboboxCell
