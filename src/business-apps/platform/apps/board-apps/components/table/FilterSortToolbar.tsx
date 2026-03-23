/**
 * FilterSortToolbar - Notion/Monday-style toolbar with filter and sort popovers.
 * Shows active filter/sort pills, add buttons, and an AND/OR connector toggle.
 */

import React, { useCallback, useMemo, useState } from 'react'
import { Button, Badge, Popover, PopoverContent, PopoverTrigger, Spinner } from '@newwork/nw-design-system'
import { Filter, ArrowUpDown, Plus, X, Search } from 'lucide-react'
import type { BoardColumn, BoardQuickFilter, ViewFilter, ViewSort, FilterConnector } from '../../types'
import { getDefaultOperator } from '../../utils/filterOperators'
import { FilterRow } from './FilterRow'
import { SortRow } from './SortRow'
import { QuickFiltersBar } from './QuickFiltersBar'

interface FilterSortToolbarProps {
  columns: BoardColumn[]
  filters: ViewFilter[]
  sorts: ViewSort[]
  connector: FilterConnector
  filteredCount: number
  totalCount: number
  onAddFilter: (filter: ViewFilter) => void
  onUpdateFilter: (id: string, updates: Partial<ViewFilter>) => void
  onRemoveFilter: (id: string) => void
  onAddSort: (sort: ViewSort) => void
  onUpdateSort: (id: string, updates: Partial<ViewSort>) => void
  onRemoveSort: (id: string) => void
  onSetConnector: (c: FilterConnector) => void
  onClearAll: () => void
  quickSearch: string
  onQuickSearchChange: (v: string) => void
  isSearching?: boolean
  quickFilters?: BoardQuickFilter[]
  activeQuickFilterIds?: string[]
  onToggleQuickFilter?: (id: string) => void
  onAddQuickFilter?: (qf: BoardQuickFilter) => void
  onRenameQuickFilter?: (id: string, name: string) => void
  onDeleteQuickFilter?: (id: string) => void
  'data-testid'?: string
}

export const FilterSortToolbar: React.FC<FilterSortToolbarProps> = ({
  columns,
  filters,
  sorts,
  connector,
  filteredCount,
  totalCount,
  onAddFilter,
  onUpdateFilter,
  onRemoveFilter,
  onAddSort,
  onUpdateSort,
  onRemoveSort,
  onSetConnector,
  onClearAll,
  quickSearch,
  onQuickSearchChange,
  isSearching,
  quickFilters,
  activeQuickFilterIds,
  onToggleQuickFilter,
  onAddQuickFilter,
  onRenameQuickFilter,
  onDeleteQuickFilter,
  'data-testid': testId = 'filter-sort-toolbar'
}) => {
  const [filterOpen, setFilterOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)

  const handleAddFilter = useCallback(() => {
    const col = columns[0]
    if (!col) return
    onAddFilter({
      id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      column: col.name,
      operator: getDefaultOperator(col.type),
      value: ''
    })
  }, [columns, onAddFilter])

  const handleAddSort = useCallback(() => {
    const usedCols = new Set(sorts.map(s => s.column))
    const col = columns.find(c => !usedCols.has(c.name)) || columns[0]
    if (!col) return
    onAddSort({
      id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      column: col.name,
      direction: 'asc'
    })
  }, [columns, sorts, onAddSort])

  const isFiltering = filters.length > 0
  const isSorting = sorts.length > 0
  const hasActiveQuickFilters = (activeQuickFilterIds?.length ?? 0) > 0
  const hasAnything = isFiltering || isSorting || quickSearch || hasActiveQuickFilters

  const filterSummary = useMemo(() => {
    if (filters.length === 0) return null
    return filters.length === 1 ? `1 filter` : `${filters.length} filters`
  }, [filters.length])

  const sortSummary = useMemo(() => {
    if (sorts.length === 0) return null
    if (sorts.length === 1) {
      const col = columns.find(c => c.name === sorts[0].column)
      return `${col?.label || sorts[0].column} ${sorts[0].direction === 'asc' ? '↑' : '↓'}`
    }
    return `${sorts.length} sorts`
  }, [sorts, columns])

  return (
    <div
      className="gba:flex gba:items-center gba:gap-1.5 gba:px-2.5 gba:py-1.5 gba:border-b gba:bg-card gba:flex-wrap gba:min-h-[36px]"
      data-testid={testId}
    >
      {/* Quick search */}
      <div className="gba:relative gba:flex gba:items-center">
        <Search className="gba:absolute gba:left-2 gba:w-3 gba:h-3 gba:text-muted-foreground gba:pointer-events-none" />
        {isSearching ? (
          <Spinner size="sm" className="gba:absolute gba:right-2 gba:w-3 gba:h-3 gba:text-muted-foreground" />
        ) : null}
        <input
          type="text"
          value={quickSearch}
          onChange={e => onQuickSearchChange(e.target.value)}
          placeholder="Search..."
          className="gba:h-7 gba:pl-7 gba:pr-7 gba:text-xs gba:rounded-md gba:border gba:border-border gba:bg-background gba:outline-none gba:focus:ring-1 gba:focus:ring-primary gba:w-44 gba:transition-all gba:placeholder-muted-foreground"
          data-testid={`${testId}-search`}
        />
      </div>

      <div className="gba:h-4 gba:w-px gba:bg-border" />

      {/* Filter popover */}
      <Popover open={filterOpen} onOpenChange={setFilterOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={isFiltering ? 'secondary' : 'ghost'}
            size="sm"
            className="gba:h-7 gba:text-xs gba:gap-1 gba:px-2"
            data-testid={`${testId}-filter-btn`}
          >
            <Filter className="gba:w-3 gba:h-3" />
            {filterSummary || 'Filter'}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="gba:w-auto gba:min-w-[420px] gba:max-w-[90vw] gba:p-3"
          data-testid={`${testId}-filter-popover`}
        >
          <div className="gba:flex gba:flex-col gba:gap-2">
            {filters.length > 0 && (
              <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                <span className="gba:text-xs gba:text-muted-foreground">Match</span>
                <Button
                  variant={connector === 'and' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="gba:h-6 gba:text-xs gba:px-2"
                  onClick={() => onSetConnector('and')}
                  data-testid={`${testId}-connector-and`}
                >
                  AND
                </Button>
                <Button
                  variant={connector === 'or' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="gba:h-6 gba:text-xs gba:px-2"
                  onClick={() => onSetConnector('or')}
                  data-testid={`${testId}-connector-or`}
                >
                  OR
                </Button>
                <span className="gba:text-xs gba:text-muted-foreground">conditions</span>
              </div>
            )}

            {filters.map((f, i) => (
              <FilterRow
                key={f.id}
                filter={f}
                columns={columns}
                onUpdate={onUpdateFilter}
                onRemove={onRemoveFilter}
                onSaveAsQuickFilter={onAddQuickFilter ? filter => onAddQuickFilter(filter) : undefined}
                connectorLabel={i === 0 ? 'Where' : connector.toUpperCase()}
                data-testid={`${testId}-filter-${i}`}
              />
            ))}

            <Button
              variant="ghost"
              size="sm"
              className="gba:h-7 gba:text-xs gba:gap-1 gba:px-2 gba:self-start"
              onClick={handleAddFilter}
              data-testid={`${testId}-add-filter`}
            >
              <Plus className="gba:w-3 gba:h-3" /> Add filter
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Sort popover */}
      <Popover open={sortOpen} onOpenChange={setSortOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={isSorting ? 'secondary' : 'ghost'}
            size="sm"
            className="gba:h-7 gba:text-xs gba:gap-1 gba:px-2"
            data-testid={`${testId}-sort-btn`}
          >
            <ArrowUpDown className="gba:w-3 gba:h-3" />
            {sortSummary || 'Sort'}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="gba:w-auto gba:min-w-[360px] gba:max-w-[90vw] gba:p-3"
          data-testid={`${testId}-sort-popover`}
        >
          <div className="gba:flex gba:flex-col gba:gap-2">
            {sorts.map((s, i) => (
              <SortRow
                key={s.id}
                sort={s}
                columns={columns}
                index={i}
                onUpdate={onUpdateSort}
                onRemove={onRemoveSort}
                data-testid={`${testId}-sort-${i}`}
              />
            ))}

            <Button
              variant="ghost"
              size="sm"
              className="gba:h-7 gba:text-xs gba:gap-1 gba:px-2 gba:self-start"
              onClick={handleAddSort}
              data-testid={`${testId}-add-sort`}
            >
              <Plus className="gba:w-3 gba:h-3" /> Add sort
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Quick filters */}
      {quickFilters && quickFilters.length > 0 && onToggleQuickFilter && (
        <>
          <div className="gba:h-4 gba:w-px gba:bg-border" />
          <QuickFiltersBar
            quickFilters={quickFilters}
            activeIds={activeQuickFilterIds ?? []}
            onToggle={onToggleQuickFilter}
            onRename={onRenameQuickFilter}
            onDelete={onDeleteQuickFilter}
            data-testid={`${testId}-quick-filters`}
          />
        </>
      )}

      {/* Active indicator & clear */}
      {hasAnything && (
        <>
          <div className="gba:h-4 gba:w-px gba:bg-border" />
          {filteredCount < totalCount && (
            <Badge variant="secondary" className="gba:text-[10px] gba:px-1.5 gba:py-0">
              {filteredCount} of {totalCount}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="gba:h-6 gba:text-xs gba:gap-1 gba:px-1.5 gba:text-muted-foreground gba:hover:text-destructive"
            onClick={onClearAll}
            data-testid={`${testId}-clear-all`}
          >
            <X className="gba:w-3 gba:h-3" /> Clear
          </Button>
        </>
      )}
    </div>
  )
}
