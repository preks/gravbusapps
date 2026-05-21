import React from 'react'
import {
  Checkbox,
  DateInput,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea
} from '@newwork/nw-design-system'
import { EditableComboboxCell } from '@/components/editable-cell'
import type { ColumnDefinition } from '../types'
import { InputType } from '../types'
import type { EntityDataSelectOption } from '../hooks/useEntityDataSelectOptions'
import type { EntityDataEditValue } from '../utils/entityDataRowValues'

interface EntityDataValueInputProps {
  column: ColumnDefinition
  value: EntityDataEditValue
  options?: EntityDataSelectOption[]
  loading?: boolean
  optionError?: string | null
  isEdited?: boolean
  onChange: (value: EntityDataEditValue) => void
  'data-testid'?: string
}

function getStringValue(value: EntityDataEditValue): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
}

export const EntityDataValueInput: React.FC<EntityDataValueInputProps> = ({
  column,
  value,
  options = [],
  loading = false,
  optionError = null,
  isEdited = false,
  onChange,
  'data-testid': testId = 'entity-data-value-input'
}) => {
  const borderClassName = optionError
    ? 'gba:border gba:border-destructive'
    : isEdited
      ? 'gba:border gba:border-blue-500'
      : 'gba:border gba:border-gray-200'
  const compactInputClassName = `gba:h-6 gba:w-full gba:bg-transparent gba:p-1 gba:text-xs gba:focus:bg-white ${borderClassName}`

  if (column.readOnly) {
    return <Input value={getStringValue(value)} disabled className={compactInputClassName} data-testid={testId} />
  }

  if (column.type === InputType.TEXTAREA) {
    return (
      <Textarea
        value={getStringValue(value)}
        onChange={event => onChange(event.target.value)}
        rows={2}
        className={`gba:min-h-12 gba:w-full gba:bg-transparent gba:p-1 gba:text-xs gba:focus:bg-white ${borderClassName}`}
        data-testid={testId}
      />
    )
  }

  if (column.type === InputType.NUMBER) {
    return (
      <Input
        type="number"
        value={getStringValue(value)}
        onChange={event => onChange(event.target.value)}
        className={compactInputClassName}
        data-testid={testId}
      />
    )
  }

  if (column.type === InputType.DATE || column.type === InputType.DATETIME) {
    return (
      <DateInput
        type={column.type === InputType.DATE ? 'date' : 'datetime-local'}
        value={getStringValue(value)}
        onChange={nextValue => onChange(typeof nextValue === 'string' ? nextValue : '')}
        captionLayout="dropdown"
        outputFormat={column.type === InputType.DATETIME ? 'iso' : undefined}
        className={compactInputClassName}
        data-testid={testId}
      />
    )
  }

  if (column.type === InputType.CHECKBOX) {
    return (
      <div className="gba:flex gba:h-6 gba:items-center gba:justify-center gba:gap-2">
        <Checkbox checked={value === true} onCheckedChange={checked => onChange(checked === true)} data-testid={testId} />
      </div>
    )
  }

  if (column.type === InputType.SELECT) {
    return (
      <div className="gba:w-full gba:space-y-1">
        <Select value={getStringValue(value)} onValueChange={nextValue => onChange(nextValue)}>
          <SelectTrigger
            size="sm"
            className={`gba:h-6 gba:w-full gba:bg-transparent gba:p-1 gba:text-xs ${borderClassName}`}
            data-testid={testId}
          >
            <SelectValue placeholder={loading ? 'Loading...' : optionError || 'Select value'} />
          </SelectTrigger>
          <SelectContent>
            {options.map(option => (
              <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {optionError && <p className="gba:text-[10px] gba:text-destructive">{optionError}</p>}
      </div>
    )
  }

  if (column.type === InputType.MULTISELECT) {
    const comboboxOptions = options.map(option => ({ id: option.value, name: option.label }))
    return (
      <div className="gba:w-full">
        <EditableComboboxCell
          value={Array.isArray(value) ? value : []}
          onChange={nextValue => onChange(Array.isArray(nextValue) ? nextValue : [])}
          options={comboboxOptions}
          testId={testId}
          isEdited={isEdited}
          isLoading={loading}
          placeholder={optionError || 'Select values...'}
          mode="multiple"
          hasError={!!optionError}
          enableClientFilter
        />
      </div>
    )
  }

  if (column.type === InputType.FILE) {
    return (
      <Input
        value={getStringValue(value)}
        disabled
        placeholder="File fields are not editable in the data table"
        className={compactInputClassName}
        data-testid={testId}
      />
    )
  }

  return (
    <Input
      value={getStringValue(value)}
      onChange={event => onChange(event.target.value)}
      className={compactInputClassName}
      data-testid={testId}
    />
  )
}
