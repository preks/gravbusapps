/**
 * WidgetFilterFields - compact filter builder for the AddWidgetDialog.
 * Lets users narrow the data a widget sees (e.g. Status = "Converted").
 */

import React, { useCallback, useMemo } from 'react'
import {
  Button,
  Label,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Badge
} from '@newwork/nw-design-system'
import { Plus, X } from 'lucide-react'
import type { BoardColumn, ViewFilter, ViewFilterOperator, FilterConnector } from '../../types'
import { Hint, HINTS } from './widgetFieldHelpers'

export interface WidgetFilterFieldsProps {
  columns: BoardColumn[]
  filters: ViewFilter[]
  onFiltersChange: (filters: ViewFilter[]) => void
  connector: FilterConnector
  onConnectorChange: (c: FilterConnector) => void
  testId: string
}

type OperatorOption = { value: ViewFilterOperator; label: string }

const TEXT_OPS: OperatorOption[] = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'not equals' },
  { value: 'contains', label: 'contains' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' }
]

const NUMBER_OPS: OperatorOption[] = [
  { value: 'equals', label: '=' },
  { value: 'not_equals', label: '!=' },
  { value: 'greater', label: '>' },
  { value: 'less', label: '<' },
  { value: 'greater_or_equal', label: '>=' },
  { value: 'less_or_equal', label: '<=' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' }
]

const SELECT_OPS: OperatorOption[] = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'not equals' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' }
]

const BOOL_OPS: OperatorOption[] = [
  { value: 'is_true', label: 'is true' },
  { value: 'is_false', label: 'is false' }
]

const NO_VALUE_OPS = new Set<string>(['is_empty', 'is_not_empty', 'is_true', 'is_false'])

function opsForColumn(col?: BoardColumn): OperatorOption[] {
  if (!col) return TEXT_OPS
  switch (col.type) {
    case 'number':
    case 'currency':
    case 'percentage':
    case 'rating':
    case 'progress':
      return NUMBER_OPS
    case 'select':
    case 'multiselect':
    case 'status':
      return SELECT_OPS
    case 'boolean':
      return BOOL_OPS
    default:
      return TEXT_OPS
  }
}

function createFilterId(): string {
  return `f_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

export const WidgetFilterFields: React.FC<WidgetFilterFieldsProps> = ({
  columns,
  filters,
  onFiltersChange,
  connector,
  onConnectorChange,
  testId
}) => {
  const addFilter = useCallback(() => {
    onFiltersChange([...filters, { id: createFilterId(), column: '', operator: 'equals', value: '' }])
  }, [filters, onFiltersChange])

  const removeFilter = useCallback(
    (id: string) => onFiltersChange(filters.filter(f => f.id !== id)),
    [filters, onFiltersChange]
  )

  const updateFilter = useCallback(
    (id: string, patch: Partial<ViewFilter>) => {
      onFiltersChange(filters.map(f => (f.id === id ? { ...f, ...patch } : f)))
    },
    [filters, onFiltersChange]
  )

  const handleColumnChange = useCallback(
    (id: string, colName: string) => {
      const col = columns.find(c => c.name === colName)
      const ops = opsForColumn(col)
      updateFilter(id, { column: colName, operator: ops[0].value, value: '' })
    },
    [columns, updateFilter]
  )

  return (
    <div data-testid={`${testId}-filters`}>
      <div className="gba:flex gba:items-center gba:justify-between">
        <Label className="gba:text-xs">Filter data</Label>
        <Button
          variant="ghost"
          size="sm"
          className="gba:h-6 gba:text-xs gba:gap-1 gba:px-1.5"
          onClick={addFilter}
          data-testid={`${testId}-add-filter`}
        >
          <Plus className="gba:w-3 gba:h-3" /> Add filter
        </Button>
      </div>
      {filters.length === 0 && <Hint>{HINTS.filter}</Hint>}

      {filters.length > 1 && (
        <div className="gba:flex gba:items-center gba:gap-1 gba:mt-1">
          <span className="gba:text-[10px] gba:text-muted-foreground">Match</span>
          <Button
            variant={connector === 'and' ? 'default' : 'outline'}
            size="sm"
            className="gba:h-5 gba:text-[10px] gba:px-1.5 gba:rounded-sm"
            onClick={() => onConnectorChange('and')}
            data-testid={`${testId}-connector-and`}
          >
            ALL
          </Button>
          <Button
            variant={connector === 'or' ? 'default' : 'outline'}
            size="sm"
            className="gba:h-5 gba:text-[10px] gba:px-1.5 gba:rounded-sm"
            onClick={() => onConnectorChange('or')}
            data-testid={`${testId}-connector-or`}
          >
            ANY
          </Button>
        </div>
      )}

      {filters.map((f, idx) => (
        <FilterRow
          key={f.id}
          filter={f}
          columns={columns}
          onColumnChange={colName => handleColumnChange(f.id, colName)}
          onOperatorChange={op => updateFilter(f.id, { operator: op as ViewFilterOperator })}
          onValueChange={val => updateFilter(f.id, { value: val })}
          onRemove={() => removeFilter(f.id)}
          testId={`${testId}-filter-${idx}`}
        />
      ))}
    </div>
  )
}

interface FilterRowProps {
  filter: ViewFilter
  columns: BoardColumn[]
  onColumnChange: (col: string) => void
  onOperatorChange: (op: string) => void
  onValueChange: (val: unknown) => void
  onRemove: () => void
  testId: string
}

const FilterRow: React.FC<FilterRowProps> = ({
  filter,
  columns,
  onColumnChange,
  onOperatorChange,
  onValueChange,
  onRemove,
  testId
}) => {
  const col = useMemo(() => columns.find(c => c.name === filter.column), [columns, filter.column])
  const ops = useMemo(() => opsForColumn(col), [col])
  const needsValue = !NO_VALUE_OPS.has(filter.operator)
  const hasSelectOptions = col && col.selectOptions && col.selectOptions.length > 0

  return (
    <div className="gba:flex gba:items-center gba:gap-1 gba:mt-1" data-testid={testId}>
      <Select value={filter.column || '_pick'} onValueChange={v => v !== '_pick' && onColumnChange(v)}>
        <SelectTrigger className="gba:h-7 gba:text-[11px] gba:flex-1 gba:min-w-0" data-testid={`${testId}-col`}>
          <SelectValue placeholder="Column" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_pick" disabled>
            Column
          </SelectItem>
          {columns.map(c => (
            <SelectItem key={c.id || c.name} value={c.name}>
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filter.operator} onValueChange={onOperatorChange}>
        <SelectTrigger className="gba:h-7 gba:text-[11px] gba:w-24 gba:shrink-0" data-testid={`${testId}-op`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ops.map(o => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {needsValue && hasSelectOptions ? (
        <Select value={String(filter.value || '_pick')} onValueChange={v => v !== '_pick' && onValueChange(v)}>
          <SelectTrigger className="gba:h-7 gba:text-[11px] gba:flex-1 gba:min-w-0" data-testid={`${testId}-val`}>
            <SelectValue placeholder="Value" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_pick" disabled>
              Value
            </SelectItem>
            {col!.selectOptions!.map(o => (
              <SelectItem key={o.value} value={o.value}>
                {o.label || o.value}
                {o.colorToken && (
                  <Badge variant="secondary" className="gba:ml-1 gba:text-[9px] gba:px-1 gba:py-0">
                    {o.colorToken}
                  </Badge>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : needsValue ? (
        <Input
          value={String(filter.value ?? '')}
          onChange={e => onValueChange(e.target.value)}
          placeholder="Value"
          className="gba:h-7 gba:text-[11px] gba:flex-1 gba:min-w-0"
          type={
            col && ['number', 'currency', 'percentage', 'rating', 'progress'].includes(col.type) ? 'number' : 'text'
          }
          data-testid={`${testId}-val`}
        />
      ) : null}

      <Button
        variant="ghost"
        size="icon"
        className="gba:h-6 gba:w-6 gba:shrink-0"
        onClick={onRemove}
        data-testid={`${testId}-remove`}
      >
        <X className="gba:w-3 gba:h-3" />
      </Button>
    </div>
  )
}
