import React, { useEffect, useMemo, useState } from 'react'
import { Button, Input, Label } from '@newwork/nw-design-system'
import { Plus, Trash } from '@phosphor-icons/react'
import { FlowContextExpressionEditor } from '../../shared/FlowContextExpressionEditor'

type EditorProps = React.ComponentProps<typeof FlowContextExpressionEditor>

export interface CustomDataColumn {
  fieldName: string
  label?: string
  required?: boolean
}

interface CustomDataValuesEditorProps {
  /** "columns" renders one fixed row per entity column; "freeform" lets the user add arbitrary keys. */
  mode: 'columns' | 'freeform'
  columns?: CustomDataColumn[]
  values: Record<string, string>
  onChange: (next: Record<string, string>) => void
  suggestions: EditorProps['suggestions']
  dataSources: EditorProps['dataSources']
  testId: string
}

interface FreeformRow {
  id: string
  key: string
  value: string
}

let rowSeq = 0
const nextRowId = (): string => {
  rowSeq += 1
  return `cd-row-${rowSeq}`
}

const buildValuesFromRows = (rows: FreeformRow[]): Record<string, string> => {
  const next: Record<string, string> = {}
  for (const row of rows) {
    const key = row.key.trim()
    if (key) next[key] = row.value
  }
  return next
}

/**
 * Maps custom-data field values to flow expressions. In "columns" mode each entity
 * column gets a labelled expression editor; in "freeform" mode the user manages an
 * arbitrary key -> expression map (used for the generic Flow Data store).
 */
export const CustomDataValuesEditor: React.FC<CustomDataValuesEditorProps> = ({
  mode,
  columns = [],
  values,
  onChange,
  suggestions,
  dataSources,
  testId
}) => {
  const [rows, setRows] = useState<FreeformRow[]>(() =>
    Object.entries(values).map(([key, value]) => ({ id: nextRowId(), key, value }))
  )

  // Keep the freeform editor seeded once when the step is first opened with values.
  useEffect(() => {
    if (mode !== 'freeform') return
    setRows(prev => {
      if (prev.length > 0) return prev
      const entries = Object.entries(values)
      if (entries.length === 0) return prev
      return entries.map(([key, value]) => ({ id: nextRowId(), key, value }))
    })
  }, [mode])

  const applyRows = (nextRows: FreeformRow[]) => {
    setRows(nextRows)
    onChange(buildValuesFromRows(nextRows))
  }

  const sortedColumns = useMemo(
    () => columns.filter(column => column.fieldName && column.fieldName !== 'id'),
    [columns]
  )

  if (mode === 'columns') {
    if (sortedColumns.length === 0) {
      return (
        <p className="gba:text-xs gba:text-muted-foreground" data-testid={`${testId}-empty`}>
          Select an entity to map its fields.
        </p>
      )
    }
    return (
      <div className="gba:flex gba:flex-col gba:gap-3" data-testid={testId}>
        {sortedColumns.map(column => (
          <div key={column.fieldName} className="gba:flex gba:flex-col gba:gap-1.5">
            <Label className="gba:text-xs gba:font-medium">
              {column.label || column.fieldName}
              {column.required ? <span className="gba:text-destructive"> *</span> : null}
            </Label>
            <FlowContextExpressionEditor
              value={values[column.fieldName] ?? ''}
              onChange={next => onChange({ ...values, [column.fieldName]: next })}
              suggestions={suggestions}
              dataSources={dataSources}
              placeholder="Type {{ to insert data."
              allowFreeText
              singleLine
              data-testid={`${testId}-field-${column.fieldName}`}
            />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="gba:flex gba:flex-col gba:gap-2" data-testid={testId}>
      {rows.map(row => (
        <div key={row.id} className="gba:flex gba:items-start gba:gap-2">
          <Input
            value={row.key}
            placeholder="key"
            className="gba:w-40 gba:flex-shrink-0"
            onChange={event =>
              applyRows(rows.map(item => (item.id === row.id ? { ...item, key: event.target.value } : item)))
            }
            data-testid={`${testId}-key-${row.id}`}
          />
          <div className="gba:flex-1">
            <FlowContextExpressionEditor
              value={row.value}
              onChange={next => applyRows(rows.map(item => (item.id === row.id ? { ...item, value: next } : item)))}
              suggestions={suggestions}
              dataSources={dataSources}
              placeholder="Type {{ to insert data."
              allowFreeText
              singleLine
              data-testid={`${testId}-value-${row.id}`}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Remove field"
            onClick={() => applyRows(rows.filter(item => item.id !== row.id))}
            data-testid={`${testId}-remove-${row.id}`}
          >
            <Trash className="gba:h-4 gba:w-4" />
          </Button>
        </div>
      ))}
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => applyRows([...rows, { id: nextRowId(), key: '', value: '' }])}
          data-testid={`${testId}-add`}
        >
          <Plus className="gba:h-4 gba:w-4 gba:mr-1" />
          Add field
        </Button>
      </div>
    </div>
  )
}
