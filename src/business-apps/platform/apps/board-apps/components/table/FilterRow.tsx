/**
 * FilterRow - a single filter condition with column, operator, and value inputs.
 * Renders type-aware value inputs (text, number, date, select dropdown).
 */

import React, { useMemo } from 'react'
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import { X } from 'lucide-react'
import type { BoardColumn, ViewFilter, ViewFilterOperator } from '../../types'
import { getOperatorsForType, getOperatorDef } from '../../utils/filterOperators'

interface FilterRowProps {
  filter: ViewFilter
  columns: BoardColumn[]
  onUpdate: (id: string, updates: Partial<ViewFilter>) => void
  onRemove: (id: string) => void
  connectorLabel?: string
  'data-testid'?: string
}

export const FilterRow: React.FC<FilterRowProps> = ({
  filter,
  columns,
  onUpdate,
  onRemove,
  connectorLabel,
  'data-testid': testId = 'filter-row'
}) => {
  const col = useMemo(() => columns.find(c => c.name === filter.column), [columns, filter.column])
  const operators = useMemo(() => (col ? getOperatorsForType(col.type) : []), [col])
  const opDef = useMemo(() => (col ? getOperatorDef(col.type, filter.operator) : undefined), [col, filter.operator])

  const handleColumnChange = (colName: string) => {
    const newCol = columns.find(c => c.name === colName)
    const newOps = newCol ? getOperatorsForType(newCol.type) : []
    const firstOp = newOps[0]?.value || 'contains'
    onUpdate(filter.id, { column: colName, operator: firstOp, value: '', secondValue: undefined })
  }

  return (
    <div className="gba:flex gba:items-center gba:gap-1.5 gba:group" data-testid={testId}>
      {connectorLabel && (
        <span className="gba:text-xs gba:text-muted-foreground gba:w-10 gba:text-right gba:flex-shrink-0">
          {connectorLabel}
        </span>
      )}

      <Select value={filter.column} onValueChange={handleColumnChange}>
        <SelectTrigger className="gba:h-7 gba:text-xs gba:w-32 gba:flex-shrink-0" data-testid={`${testId}-col`}>
          <SelectValue placeholder="Column" />
        </SelectTrigger>
        <SelectContent>
          {columns.map(c => (
            <SelectItem key={c.name} value={c.name}>
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filter.operator}
        onValueChange={(v: string) => onUpdate(filter.id, { operator: v as ViewFilterOperator })}
      >
        <SelectTrigger className="gba:h-7 gba:text-xs gba:w-36 gba:flex-shrink-0" data-testid={`${testId}-op`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {operators.map(op => (
            <SelectItem key={op.value} value={op.value}>
              {op.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {opDef?.needsValue && (
        <FilterValueInput
          column={col}
          value={filter.value}
          onChange={v => onUpdate(filter.id, { value: v })}
          testId={`${testId}-val`}
        />
      )}

      {opDef?.needsSecondValue && (
        <>
          <span className="gba:text-xs gba:text-muted-foreground">and</span>
          <FilterValueInput
            column={col}
            value={filter.secondValue}
            onChange={v => onUpdate(filter.id, { secondValue: v })}
            testId={`${testId}-val2`}
          />
        </>
      )}

      <Button
        variant="ghost"
        size="icon"
        className="gba:h-6 gba:w-6 gba:flex-shrink-0 gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity"
        onClick={() => onRemove(filter.id)}
        data-testid={`${testId}-remove`}
      >
        <X className="gba:w-3 gba:h-3" />
      </Button>
    </div>
  )
}

function FilterValueInput({
  column,
  value,
  onChange,
  testId
}: {
  column: BoardColumn | undefined
  value: unknown
  onChange: (v: unknown) => void
  testId: string
}) {
  if (!column) return null

  if (['select', 'status'].includes(column.type) && column.selectOptions?.length) {
    const strVal = Array.isArray(value) ? String(value[0] || '') : String(value || '')
    return (
      <Select value={strVal} onValueChange={v => onChange(v)}>
        <SelectTrigger className="gba:h-7 gba:text-xs gba:w-36" data-testid={testId}>
          <SelectValue placeholder="Value" />
        </SelectTrigger>
        <SelectContent>
          {column.selectOptions.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  if (['multiselect', 'tags'].includes(column.type) && column.selectOptions?.length) {
    const selected = Array.isArray(value) ? (value as string[]) : value ? [String(value)] : []
    return (
      <div className="gba:flex gba:flex-wrap gba:gap-1 gba:max-w-48">
        {column.selectOptions.map(opt => {
          const active = selected.includes(opt.value)
          return (
            <button
              key={opt.value}
              type="button"
              className={`gba:px-2 gba:py-0.5 gba:rounded-full gba:text-xs gba:border gba:transition-colors ${
                active
                  ? 'gba:bg-primary gba:text-primary-foreground gba:border-primary'
                  : 'gba:border-border gba:text-muted-foreground gba:hover:border-primary'
              }`}
              onClick={() => {
                const next = active ? selected.filter(v => v !== opt.value) : [...selected, opt.value]
                onChange(next)
              }}
              data-testid={`${testId}-${opt.value}`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    )
  }

  if (['date', 'datetime'].includes(column.type)) {
    return (
      <Input
        type="date"
        value={value ? String(value).slice(0, 10) : ''}
        onChange={e => onChange(e.target.value)}
        className="gba:h-7 gba:text-xs gba:w-36"
        data-testid={testId}
      />
    )
  }

  if (['number', 'currency', 'percentage', 'rating', 'progress'].includes(column.type)) {
    return (
      <Input
        type="number"
        value={value != null ? String(value) : ''}
        onChange={e => onChange(e.target.value ? Number(e.target.value) : '')}
        className="gba:h-7 gba:text-xs gba:w-28"
        data-testid={testId}
      />
    )
  }

  return (
    <Input
      type="text"
      value={String(value || '')}
      onChange={e => onChange(e.target.value)}
      placeholder="Value..."
      className="gba:h-7 gba:text-xs gba:w-36"
      data-testid={testId}
    />
  )
}
