'use client'

import React from 'react'
import { MagnifyingGlassIcon } from '@phosphor-icons/react'
import { DebouncedInput } from '@/components/debounced-input'

/** Optional search slot: value, onChange, placeholder; debounced with magnifying glass icon. */
export interface FilterBarSearchConfig {
  value: string
  onChange: (value: string) => void
  placeholder: string
  debounceMs?: number
  'data-testid'?: string
  /** Min width of search wrapper, e.g. 'gba:min-w-[260px]' */
  minWidthClassName?: string
}

/** Optional clear button at the end of the bar. */
export interface FilterBarClearConfig {
  label: string
  onClick: () => void
  'data-testid'?: string
}

export interface FilterBarProps {
  /** Any combination of selects, custom dropdowns, buttons, etc. */
  children: React.ReactNode
  /** Container class (border, background, padding, radius). */
  className?: string
  /** Class for the flex row that contains search + children + clear. */
  controlsClassName?: string
  /** Root element data-testid. */
  dataTestId?: string
  /** When set, renders a search input with magnifying glass before children. */
  search?: FilterBarSearchConfig
  /** When set, renders a Clear button after children. */
  clear?: FilterBarClearConfig
}

const DEFAULT_SEARCH_MIN_WIDTH = 'gba:min-w-[220px]'
const DEFAULT_DEBOUNCE_MS = 300

/**
 * Unified filter bar: optional search (with icon), flexible children (selects/inputs/custom),
 * optional Clear button. Use for Feedback, Skills, or any tab that needs a compact filter row.
 */
export const FilterBar: React.FC<FilterBarProps> = ({
  children,
  className = '',
  controlsClassName = '',
  dataTestId,
  search,
  clear
}) => {
  const gapClass = controlsClassName.includes('gap-') ? '' : ' gba:gap-2'
  const rowClass = `gba:flex gba:flex-wrap gba:items-center${gapClass} ${controlsClassName}`.trim()

  return (
    <div data-testid={dataTestId} className={className}>
      <div className={rowClass}>
        {search && (
          <div className={search.minWidthClassName ?? DEFAULT_SEARCH_MIN_WIDTH + ' gba:flex-1'}>
            <DebouncedInput
              value={search.value}
              onChange={search.onChange}
              placeholder={search.placeholder}
              debounceDelay={search.debounceMs ?? DEFAULT_DEBOUNCE_MS}
              className="gba:w-full gba:h-9"
              icon={<MagnifyingGlassIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground" />}
              ariaLabel={search.placeholder}
              data-testid={search['data-testid']}
            />
          </div>
        )}

        {children}

        {clear && (
          <button
            type="button"
            onClick={clear.onClick}
            className="gba:h-9 gba:px-2 gba:text-sm gba:text-muted-foreground gba:hover:text-foreground"
            data-testid={clear['data-testid']}
          >
            {clear.label}
          </button>
        )}
      </div>
    </div>
  )
}

/** Thin wrapper: only layout (flex row). Use when you don't need search/clear from FilterBar. */
export interface CompactFilterBarProps {
  children: React.ReactNode
  className?: string
  controlsClassName?: string
  dataTestId?: string
}

const CompactFilterBar: React.FC<CompactFilterBarProps> = ({
  children,
  className = '',
  controlsClassName = '',
  dataTestId
}) => {
  const gapClass = controlsClassName.includes('gap-') ? '' : ' gba:gap-2'
  const rowClass = `gba:flex gba:flex-wrap gba:items-center${gapClass} ${controlsClassName}`.trim()
  return (
    <div data-testid={dataTestId} className={className}>
      <div className={rowClass}>{children}</div>
    </div>
  )
}

export default CompactFilterBar
