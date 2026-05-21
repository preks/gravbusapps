import React from 'react'
import type { ColumnDefinition } from '../types'
import type { EntityDataSelectOption } from '../hooks/useEntityDataSelectOptions'
import type { EntityDataEditValue, EntityDataEditValues } from '../utils/entityDataRowValues'
import { EntityDataValueInput } from './EntityDataValueInput'

interface EntityDataTableCellProps {
  column: ColumnDefinition
  value: EntityDataEditValue
  originalValue: EntityDataEditValue | null
  isDraft: boolean
  options?: EntityDataSelectOption[]
  loading?: boolean
  optionError?: string | null
  onChange: (value: EntityDataEditValue) => void
  testId: string
}

function areEditValuesEqual(left: EntityDataEditValue, right: EntityDataEditValue | null): boolean {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null)
}

export function hasEditedEntityDataValues(
  columns: ColumnDefinition[],
  values: EntityDataEditValues,
  originalValues: EntityDataEditValues
): boolean {
  return columns.some(column => !areEditValuesEqual(values[column.fieldName], originalValues[column.fieldName]))
}

export const EntityDataTableCell: React.FC<EntityDataTableCellProps> = ({
  column,
  value,
  originalValue,
  isDraft,
  options,
  loading,
  optionError,
  onChange,
  testId
}) => (
  <EntityDataValueInput
    column={column}
    value={value}
    options={options}
    loading={loading}
    optionError={optionError}
    isEdited={isDraft || !areEditValuesEqual(value, originalValue)}
    onChange={onChange}
    data-testid={testId}
  />
)
