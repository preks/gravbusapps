import React, { useCallback, useId, useState } from 'react'
import { PreviewTemplate } from '../preview-template'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Checkbox,
  Alert,
  AlertDescription,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  DateInput
} from '@newwork/nw-design-system'
import { Database, Plus, Trash2, Check, Loader2 } from 'lucide-react'
import type { DataModelPreviewColumn, DataModelPreviewDefinition } from './dataModelPreviewTypes'

export interface DataModelPreviewItem {
  id: string
  label: string
  definition: DataModelPreviewDefinition
  onCreateRow?: (values: Record<string, unknown>) => Promise<void>
}

export interface DataModelPreviewProps {
  /** Multiple preloaded data models with switcher. */
  items?: DataModelPreviewItem[]
  /** Single data model (no switcher). */
  definition?: DataModelPreviewDefinition
  onCreateRow?: (values: Record<string, unknown>) => Promise<void>
  'data-testid'?: string
}

type RowValues = Record<string, string | boolean>

function emptyRow(columns: DataModelPreviewColumn[]): RowValues {
  const row: RowValues = {}
  columns.forEach(col => {
    row[col.name] = col.type === 'CHECKBOX' ? false : ''
  })
  return row
}

interface CellInputProps {
  col: DataModelPreviewColumn
  value: string | boolean
  onChange: (value: string | boolean) => void
  disabled?: boolean
  id: string
}

const CellInput: React.FC<CellInputProps> = ({ col, value, onChange, disabled, id }) => {
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
          className="gba:h-8 gba:text-sm gba:border-0 gba:shadow-none gba:bg-transparent focus-visible:gba:ring-1"
        />
      )
    case 'DATE':
      return (
        <DateInput
          type="date"
          value={value as string}
          onChange={val => onChange(Array.isArray(val) ? (val[0] ?? '') : (val ?? ''))}
          disabled={disabled}
          className="gba:h-8 gba:text-sm gba:border-0 gba:shadow-none gba:bg-transparent"
        />
      )
    case 'DATETIME':
      return (
        <DateInput
          type="datetime-local"
          value={value as string}
          onChange={val => onChange(Array.isArray(val) ? (val[0] ?? '') : (val ?? ''))}
          disabled={disabled}
          className="gba:h-8 gba:text-sm gba:border-0 gba:shadow-none gba:bg-transparent"
        />
      )
    case 'SELECT':
      if (col.options && col.options.length > 0) {
        return (
          <Select value={value as string} onValueChange={val => onChange(val)} disabled={disabled}>
            <SelectTrigger className="gba:h-8 gba:text-sm gba:border-0 gba:shadow-none gba:bg-transparent focus:gba:ring-1">
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
          className="gba:h-8 gba:text-sm gba:border-0 gba:shadow-none gba:bg-transparent focus-visible:gba:ring-1"
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
          className="gba:h-8 gba:text-sm gba:border-0 gba:shadow-none gba:bg-transparent focus-visible:gba:ring-1"
        />
      )
  }
}

interface EditableRowProps {
  rowIndex: number
  columns: DataModelPreviewColumn[]
  values: RowValues
  onChange: (name: string, value: string | boolean) => void
  onDelete: () => void
  onSave?: () => Promise<void>
  saving?: boolean
  saved?: boolean
  saveError?: string | null
  testId: string
}

const EditableRow: React.FC<EditableRowProps> = ({
  rowIndex,
  columns,
  values,
  onChange,
  onDelete,
  onSave,
  saving,
  saved,
  saveError,
  testId
}) => {
  const uid = useId()
  return (
    <>
      <tr
        className="gba:border-b gba:border-border gba:bg-background hover:gba:bg-muted/30 gba:transition-colors"
        data-testid={`${testId}-row-${rowIndex}`}
      >
        {columns.map(col => (
          <td key={col.name} className="gba:px-1 gba:py-1 gba:align-middle">
            <CellInput
              col={col}
              value={values[col.name] ?? (col.type === 'CHECKBOX' ? false : '')}
              onChange={val => onChange(col.name, val)}
              disabled={saving || saved}
              id={`${uid}-${col.name}`}
            />
          </td>
        ))}
        <td className="gba:px-2 gba:py-1 gba:align-middle gba:w-16">
          <div className="gba:flex gba:items-center gba:gap-1">
            {onSave && !saved && (
              <Button
                variant="ghost"
                size="icon"
                className="gba:h-7 gba:w-7"
                onClick={onSave}
                disabled={saving}
                data-testid={`${testId}-row-${rowIndex}-save`}
              >
                {saving ? (
                  <Loader2 className="gba:h-3.5 gba:w-3.5 gba:animate-spin" />
                ) : (
                  <Check className="gba:h-3.5 gba:w-3.5 gba:text-green-600" />
                )}
              </Button>
            )}
            {!saved && (
              <Button
                variant="ghost"
                size="icon"
                className="gba:h-7 gba:w-7"
                onClick={onDelete}
                disabled={saving}
                data-testid={`${testId}-row-${rowIndex}-delete`}
              >
                <Trash2 className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />
              </Button>
            )}
          </div>
        </td>
      </tr>
      {saveError && (
        <tr>
          <td colSpan={columns.length + 1} className="gba:px-3 gba:pb-2">
            <Alert variant="destructive" className="gba:py-2">
              <AlertDescription className="gba:text-xs">{saveError}</AlertDescription>
            </Alert>
          </td>
        </tr>
      )}
    </>
  )
}

interface RowState {
  id: number
  values: RowValues
  saving: boolean
  saved: boolean
  saveError: string | null
}

let rowIdCounter = 0

export const DataModelPreview: React.FC<DataModelPreviewProps> = ({
  items,
  definition,
  onCreateRow,
  'data-testid': testId = 'data-model-preview'
}) => {
  if (items && items.length > 0) {
    return (
      <PreviewTemplate items={items} data-testid={testId}>
        {selectedId => {
          const active = items.find(i => i.id === selectedId) ?? items[0]
          return (
            <DataModelPreviewSingle
              key={active.id}
              definition={active.definition}
              onCreateRow={active.onCreateRow}
              testId={`${testId}-${active.id}`}
            />
          )
        }}
      </PreviewTemplate>
    )
  }
  return <DataModelPreviewSingle definition={definition!} onCreateRow={onCreateRow} testId={testId} />
}

interface DataModelPreviewSingleProps {
  definition: DataModelPreviewDefinition
  onCreateRow?: (values: Record<string, unknown>) => Promise<void>
  testId: string
}

const DataModelPreviewSingle: React.FC<DataModelPreviewSingleProps> = ({ definition, onCreateRow, testId }) => {
  const columns = definition.columns ?? []
  const displayName = definition.display_name ?? definition.key ?? ''
  const [rows, setRows] = useState<RowState[]>([])

  const addRow = useCallback(() => {
    setRows(prev => [
      ...prev,
      { id: ++rowIdCounter, values: emptyRow(columns), saving: false, saved: false, saveError: null }
    ])
  }, [columns])

  const updateCell = useCallback((rowId: number, name: string, value: string | boolean) => {
    setRows(prev => prev.map(r => (r.id === rowId ? { ...r, values: { ...r.values, [name]: value } } : r)))
  }, [])

  const deleteRow = useCallback((rowId: number) => {
    setRows(prev => prev.filter(r => r.id !== rowId))
  }, [])

  const saveRow = useCallback(
    async (rowId: number) => {
      if (!onCreateRow) return
      setRows(prev => prev.map(r => (r.id === rowId ? { ...r, saving: true, saveError: null } : r)))
      const row = rows.find(r => r.id === rowId)
      if (!row) return
      try {
        await onCreateRow(row.values as Record<string, unknown>)
        setRows(prev => prev.map(r => (r.id === rowId ? { ...r, saving: false, saved: true } : r)))
      } catch (e) {
        setRows(prev =>
          prev.map(r =>
            r.id === rowId
              ? { ...r, saving: false, saveError: e instanceof Error ? e.message : 'Failed to create entry' }
              : r
          )
        )
      }
    },
    [onCreateRow, rows]
  )

  return (
    <div className="gba:flex gba:flex-col gba:gap-4" data-testid={testId}>
      <Card className="gba:border-border">
        <CardContent className="gba:pt-4 gba:pb-4">
          <div className="gba:flex gba:items-start gba:gap-4">
            <div className="gba:p-3 gba:rounded-xl gba:bg-primary/10 gba:shrink-0">
              <Database className="gba:h-7 gba:w-7 gba:text-primary" />
            </div>
            <div className="gba:flex-1 gba:min-w-0">
              <span className="gba:text-lg gba:font-semibold gba:text-foreground">{displayName}</span>
              <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
                {definition.description ?? 'A data type you can use to store and manage records.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="gba:border-border gba:overflow-hidden">
        <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:space-y-0 gba:py-3 gba:border-b gba:border-border">
          <CardTitle className="gba:text-sm gba:font-medium">{displayName} entries</CardTitle>
          <Button variant="outline" size="sm" onClick={addRow} data-testid={`${testId}-add-row`}>
            <Plus className="gba:h-3.5 gba:w-3.5 gba:mr-1" /> Add row
          </Button>
        </CardHeader>
        <CardContent className="gba:p-0">
          <div className="gba:overflow-x-auto">
            <table className="gba:w-full gba:text-sm">
              <thead>
                <tr className="gba:bg-muted/50 gba:border-b gba:border-border">
                  {columns.map(col => (
                    <th
                      key={col.name}
                      className="gba:text-left gba:font-medium gba:px-3 gba:py-2.5 gba:text-foreground gba:whitespace-nowrap"
                    >
                      <span>{col.label || col.name}</span>
                      {col.required && <span className="gba:text-destructive gba:ml-0.5">*</span>}
                    </th>
                  ))}
                  <th className="gba:w-16" />
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={columns.length + 1}
                      className="gba:text-center gba:text-sm gba:text-muted-foreground gba:py-10"
                    >
                      No entries yet. Click "Add row" to create one.
                    </td>
                  </tr>
                )}
                {rows.map((row, i) => (
                  <EditableRow
                    key={row.id}
                    rowIndex={i}
                    columns={columns}
                    values={row.values}
                    onChange={(name, value) => updateCell(row.id, name, value)}
                    onDelete={() => deleteRow(row.id)}
                    onSave={onCreateRow ? () => saveRow(row.id) : undefined}
                    saving={row.saving}
                    saved={row.saved}
                    saveError={row.saveError}
                    testId={testId}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
