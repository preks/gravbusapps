import React from 'react'
import {
  Input,
  Checkbox,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  DateInput
} from '@newwork/nw-design-system'
import type { DataModelPreviewColumn } from './dataModelPreviewTypes'

export type RowValues = Record<string, string | boolean>

function normalizeDateInput(
  val: string | string[] | [string | null, string | null] | undefined,
  format: 'date' | 'datetime'
): string {
  const raw = Array.isArray(val) ? (val[0] ?? val[1] ?? '') : (val ?? '')
  const dateValue = typeof raw === 'string' ? raw : ''
  if (dateValue.length === 0 || Number.isNaN(Number(dateValue))) return dateValue
  const date = new Date(Number(dateValue))
  const pad = (n: number) => String(n).padStart(2, '0')
  if (format === 'date') {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export interface CellInputProps {
  col: DataModelPreviewColumn
  value: string | boolean
  onChange: (value: string | boolean) => void
  disabled?: boolean
  id: string
}

interface BaseCellProps {
  value: string | boolean
  onChange: (value: string | boolean) => void
  disabled?: boolean
  id: string
  required?: boolean
}

const CheckboxCell: React.FC<BaseCellProps> = ({ value, onChange, disabled, id }) => (
  <div className="gba:flex gba:justify-center">
    <Checkbox id={id} checked={!!value} onCheckedChange={checked => onChange(!!checked)} disabled={disabled} />
  </div>
)

const NumberCell: React.FC<BaseCellProps> = ({ value, onChange, disabled, id, required }) => (
  <Input
    id={id}
    type="number"
    value={value as string}
    onChange={e => onChange(e.target.value)}
    disabled={disabled}
    placeholder={required ? 'Required' : '—'}
    className="gba:h-8 gba:w-full gba:min-w-0 gba:text-sm gba:border-0 gba:shadow-none gba:bg-transparent focus-visible:gba:ring-1"
  />
)

const DateCell: React.FC<BaseCellProps> = ({ value, onChange, disabled, required }) => (
  <div className="gba:w-full">
    <DateInput
      type="date"
      value={value as string}
      onChange={val => onChange(normalizeDateInput(val as string | string[] | undefined, 'date'))}
      disabled={disabled}
      placeholder={required ? 'Select date' : 'Optional'}
      className="gba:h-8 gba:w-full gba:min-w-0 gba:text-sm gba:border-0 gba:shadow-none gba:bg-transparent"
    />
  </div>
)

const DateTimeCell: React.FC<BaseCellProps> = ({ value, onChange, disabled, required }) => (
  <div className="gba:w-full">
    <DateInput
      type="datetime-local"
      value={value as string}
      onChange={val => onChange(normalizeDateInput(val as string | string[] | undefined, 'datetime'))}
      disabled={disabled}
      placeholder={required ? 'Select date & time' : 'Optional'}
      className="gba:h-8 gba:w-full gba:min-w-0 gba:text-sm gba:border-0 gba:shadow-none gba:bg-transparent"
    />
  </div>
)

interface SelectCellProps extends BaseCellProps {
  options?: Array<{ value: string; label: string }>
}

const SelectCell: React.FC<SelectCellProps> = ({ value, onChange, disabled, id, required, options }) => {
  if (options && options.length > 0) {
    return (
      <Select value={value as string} onValueChange={val => onChange(val)} disabled={disabled}>
        <SelectTrigger
          id={id}
          className="gba:h-8 gba:w-full gba:min-w-0 gba:text-sm gba:border-0 gba:shadow-none gba:bg-transparent focus:gba:ring-1"
        >
          <SelectValue placeholder={required ? 'Required' : '—'} />
        </SelectTrigger>
        <SelectContent>
          {options.map(opt => (
            <SelectItem key={opt.value} value={opt.value} className="gba:text-sm">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }
  return (
    <Input
      id={id}
      value={value as string}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      placeholder={required ? 'Required' : '—'}
      className="gba:h-8 gba:w-full gba:min-w-0 gba:text-sm gba:border-0 gba:shadow-none gba:bg-transparent focus-visible:gba:ring-1"
    />
  )
}

const ReferenceCell: React.FC<BaseCellProps> = ({ value, onChange, disabled, id, required }) => (
  <Input
    id={id}
    value={value as string}
    onChange={e => onChange(e.target.value)}
    disabled={disabled}
    placeholder={required ? 'ID required' : 'Reference ID'}
    className="gba:h-8 gba:w-full gba:min-w-0 gba:text-xs gba:border-0 gba:shadow-none gba:bg-transparent focus-visible:gba:ring-1 gba:font-mono"
  />
)

const TextCell: React.FC<BaseCellProps> = ({ value, onChange, disabled, id, required }) => (
  <Input
    id={id}
    value={value as string}
    onChange={e => onChange(e.target.value)}
    disabled={disabled}
    placeholder={required ? 'Required' : '—'}
    className="gba:h-8 gba:w-full gba:min-w-0 gba:text-sm gba:border-0 gba:shadow-none gba:bg-transparent focus-visible:gba:ring-1"
  />
)

export const CellInput: React.FC<CellInputProps> = ({ col, value, onChange, disabled, id }) => {
  const baseProps = { value, onChange, disabled, id, required: col.required }

  switch (col.type) {
    case 'CHECKBOX':
      return <CheckboxCell {...baseProps} />
    case 'NUMBER':
      return <NumberCell {...baseProps} />
    case 'DATE':
      return <DateCell {...baseProps} />
    case 'DATETIME':
      return <DateTimeCell {...baseProps} />
    case 'SELECT':
      return <SelectCell {...baseProps} options={col.options} />
    case 'REFERENCE':
      return <ReferenceCell {...baseProps} />
    default:
      return <TextCell {...baseProps} />
  }
}
