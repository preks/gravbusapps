import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Combobox, Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@newwork/nw-design-system'

export interface EditableComboboxCellProps {
  // Union type: single select (string) or multi select (string[])
  value: string | string[] | undefined
  onChange: (value: string | string[]) => void
  options: Array<{ id: string; name: string }>
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
  hasError = false
}) => {
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)
  const [hasOpened, setHasOpened] = useState(false)
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

      if (onSearch) {
        const timer = setTimeout(() => {
          onSearch(searchTerm)
        }, searchDebounce)
        setDebounceTimer(timer)
      }
    },
    [onSearch, searchDebounce, debounceTimer, hasOpened, onOpenChange]
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

    const opts = options.map(opt => ({
      value: opt.id,
      label: createLabel(opt.name)
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
  }, [options, normalizedValue, multiple])

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
        onSearch: handleSearch,
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
        onSearch: handleSearch,
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
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
      onKeyDown={handleKeyDown}
      aria-invalid={hasError ? 'true' : undefined}
    >
      <Combobox {...comboboxProps} />
    </div>
  )
}

export default EditableComboboxCell
