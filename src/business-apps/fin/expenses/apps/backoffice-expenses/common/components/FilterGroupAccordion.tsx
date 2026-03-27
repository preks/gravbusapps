import type { KeyboardEvent, ReactNode } from 'react'
import { Button, Badge } from '@newwork/nw-design-system'
import { CaretDownIcon, CaretUpIcon } from '@phosphor-icons/react'
import type { FilterConfiguration } from '@newwork/nw-design-system'

type FilterGroupConfig = FilterConfiguration['groups'][number]

export interface FilterGroupAccordionProps {
  group: FilterGroupConfig
  values: Record<string, unknown>
  isExpanded: boolean
  onToggle?: () => void
  disabled?: boolean
  children: ReactNode
}

/**
 * Matches design-system FilterGroup header so custom filter blocks
 * fit alongside standard sheet sections.
 */
export function FilterGroupAccordion({
  group,
  values,
  isExpanded,
  onToggle,
  disabled = false,
  children
}: Readonly<FilterGroupAccordionProps>) {
  const firstFilter = group.filters[0]
  const rawValue = firstFilter ? values[firstFilter.id] : undefined
  const activeCount = Array.isArray(rawValue) ? rawValue.length : 0

  const headerId = `filter-group-header-${group.id}`
  const contentId = `filter-group-content-${group.id}`

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onToggle?.()
    }
  }

  return (
    <div className="gba:w-full" data-testid={`filter-group-${group.id}`}>
      <Button
        id={headerId}
        type="button"
        variant="ghost"
        onClick={onToggle}
        onKeyDown={handleKeyDown}
        disabled={disabled || !onToggle}
        className="gba:w-full gba:h-11 gba:p-3 gba:justify-between gba:hover:bg-accent gba:transition-colors gba:text-left gba:font-normal gba:focus-visible:border-ring gba:focus-visible:ring-ring/50 gba:focus-visible:ring-[3px] gba:focus-visible:ring-inset"
        aria-expanded={isExpanded}
        aria-controls={contentId}
        role="button"
      >
        <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0">
          <span className="gba:text-sm gba:font-semibold gba:text-foreground gba:truncate">{group.label}</span>
          {activeCount > 0 && (
            <Badge
              variant="default"
              size="sm"
              aria-label={`${activeCount} active filter${activeCount === 1 ? '' : 's'}`}
            >
              {activeCount}
            </Badge>
          )}
        </div>
        <div className="gba:flex-shrink-0">
          {isExpanded ? (
            <CaretUpIcon className="gba:h-4 gba:w-4" aria-hidden="true" />
          ) : (
            <CaretDownIcon className="gba:h-4 gba:w-4" aria-hidden="true" />
          )}
        </div>
      </Button>
      {(group.collapsible === false || isExpanded) && (
        <div id={contentId} className="gba:w-full gba:px-1 gba:pt-1" aria-labelledby={headerId}>
          {children}
        </div>
      )}
    </div>
  )
}
