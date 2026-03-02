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

export interface CellInputProps {
  col: DataModelPreviewColumn
  value: string | boolean
  onChange: (value: string | boolean) => void
  disabled?: boolean
  id: string
}

export const CellInput: React.FC<CellInputProps> = ({ col, value, onChange, disabled, id }) => {
  switch (col.type) {
    case 'CHECKBOX':
      return (
        <div className="gba:flex gba:justify-center">
          <Checkbox id={id} checked={!!value} onCheckedChange={checked => onChange(!!checked)} disabled={disabled} />
        </div>
      )
    case 'NUMBER':
      return (
        <Input
          id={id}
          type="number"
          value={value as string}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          placeholder={col.required ? 'Required' : '—'}
          className="gba:h-8 gba:w-full gba:min-w-0 gba:text-sm gba:border-0 gba:shadow-none gba:bg-transparent focus-visible:gba:ring-1"
        />
      )
    case 'DATE':
      return (
        <div className="gba:w-full">
          <DateInput
            type="date"
            value={value as string}
            onChange={val => {
              let dateValue = Array.isArray(val) ? (val[0] ?? '') : (val ?? '')
              if (dateValue && !isNaN(Number(dateValue))) {
                const date = new Date(Number(dateValue))
                const pad = (n: number) => String(n).padStart(2, '0')
                dateValue = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
              }
              onChange(dateValue)
            }}
            disabled={disabled}
            placeholder={col.required ? 'Select date' : 'Optional'}
            className="gba:h-8 gba:w-full gba:min-w-0 gba:text-sm gba:border-0 gba:shadow-none gba:bg-transparent"
          />
        </div>
      )
    case 'DATETIME':
      return (
        <div className="gba:w-full">
          <DateInput
            type="datetime-local"
            value={value as string}
            onChange={val => {
              let dateValue = Array.isArray(val) ? (val[0] ?? '') : (val ?? '')
              if (dateValue && !isNaN(Number(dateValue))) {
                const date = new Date(Number(dateValue))
                const pad = (n: number) => String(n).padStart(2, '0')
                dateValue = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
              }
              onChange(dateValue)
            }}
            disabled={disabled}
            placeholder={col.required ? 'Select date & time' : 'Optional'}
            className="gba:h-8 gba:w-full gba:min-w-0 gba:text-sm gba:border-0 gba:shadow-none gba:bg-transparent"
          />
        </div>
      )
    case 'SELECT':
      if (col.options && col.options.length > 0) {
        return (
          <Select value={value as string} onValueChange={val => onChange(val)} disabled={disabled}>
            <SelectTrigger className="gba:h-8 gba:w-full gba:min-w-0 gba:text-sm gba:border-0 gba:shadow-none gba:bg-transparent focus:gba:ring-1">
              <SelectValue placeholder={col.required ? 'Required' : '—'} />
            </SelectTrigger>
            <SelectContent>
              {col.options.map(opt => (
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
          placeholder={col.required ? 'Required' : '—'}
          className="gba:h-8 gba:w-full gba:min-w-0 gba:text-sm gba:border-0 gba:shadow-none gba:bg-transparent focus-visible:gba:ring-1"
        />
      )
    case 'REFERENCE':
      return (
        <Input
          id={id}
          value={value as string}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          placeholder={col.required ? 'ID required' : 'Reference ID'}
          className="gba:h-8 gba:w-full gba:min-w-0 gba:text-xs gba:border-0 gba:shadow-none gba:bg-transparent focus-visible:gba:ring-1 gba:font-mono"
        />
      )
    default:
      return (
        <Input
          id={id}
          value={value as string}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          placeholder={col.required ? 'Required' : '—'}
          className="gba:h-8 gba:w-full gba:min-w-0 gba:text-sm gba:border-0 gba:shadow-none gba:bg-transparent focus-visible:gba:ring-1"
        />
      )
  }
}
