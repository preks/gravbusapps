import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  cn
} from '@newwork/nw-design-system'
import { CaretDown, Check } from '@phosphor-icons/react'
import type { SelectOption } from '../types'

export interface JobFamilySelectProps {
  jobFamilies: SelectOption[]
  value?: string
  onValueChange: (jobFamilyId: string) => void
  loading: boolean
  hasMore: boolean
  onSearch: (searchTerm: string) => void
  onLoadMore: () => void
  disabled?: boolean
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  'data-testid'?: string
}

/**
 * Job family picker: avoids Combobox/cmdk ordering by UUID. List order matches the `jobFamilies` array (GraphQL orderBy).
 */
export const JobFamilySelect: React.FC<JobFamilySelectProps> = ({
  jobFamilies,
  value,
  onValueChange,
  loading,
  hasMore,
  onSearch,
  onLoadMore,
  disabled = false,
  placeholder = 'Please Select...',
  searchPlaceholder = 'Search job families...',
  emptyText = 'No job families found',
  'data-testid': dataTestId = 'job-family-select'
}) => {
  const [open, setOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const onSearchRef = useRef(onSearch)
  onSearchRef.current = onSearch

  const lastKnownLabelRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    const found = jobFamilies.find(o => o.value === value)
    if (found) {
      lastKnownLabelRef.current = found.name
    }
  }, [jobFamilies, value])

  useEffect(() => {
    if (!open) {
      return
    }
    const id = window.setTimeout(() => {
      onSearchRef.current(searchInput.trim())
    }, 300)
    return () => window.clearTimeout(id)
  }, [searchInput, open])

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next)
    setSearchInput('')
    if (next) {
      onSearchRef.current('')
    }
  }, [])

  const handleListScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (!hasMore || loading) {
        return
      }
      const t = e.currentTarget
      if (t.scrollHeight - t.scrollTop - t.clientHeight < 48) {
        onLoadMore()
      }
    },
    [hasMore, loading, onLoadMore]
  )

  const displayLabel = useMemo(() => {
    const found = jobFamilies.find(o => o.value === value)
    if (found) {
      return found.name
    }
    if (!value) {
      return undefined
    }
    return lastKnownLabelRef.current
  }, [jobFamilies, value])

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('gba:w-full gba:justify-between gba:font-normal', !displayLabel && 'gba:text-muted-foreground')}
          data-testid={dataTestId}
        >
          <span className="gba:truncate">{displayLabel ?? placeholder}</span>
          <CaretDown className="gba:ml-2 gba:h-4 gba:w-4 gba:shrink-0 gba:opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="gba:w-[var(--radix-popover-trigger-width)] gba:p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder={searchPlaceholder} value={searchInput} onValueChange={setSearchInput} />
          <CommandList className="gba:max-h-72" onScroll={handleListScroll}>
            <CommandEmpty>{loading ? 'Loading job families...' : emptyText}</CommandEmpty>
            <CommandGroup>
              {jobFamilies.map(option => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => {
                    onValueChange(option.value)
                    lastKnownLabelRef.current = option.name
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'gba:mr-2 gba:h-4 gba:w-4',
                      value === option.value ? 'gba:opacity-100' : 'gba:opacity-0'
                    )}
                  />
                  {option.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
