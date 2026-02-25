import React, { useCallback, useEffect, useId, useMemo, useState } from 'react'
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
  DateInput,
  Spinner
} from '@newwork/nw-design-system'
import { Database, Plus, Trash2, Check, Loader2, RefreshCw } from 'lucide-react'
import { CustomDataGraphQLClient } from '@/common/network/custom-data/CustomDataGraphQLClient'
import { CustomDataMutationClient } from '@/common/network/custom-data/CustomDataMutationClient'
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
  /** When provided, existing records are fetched from the custom-data API and mutations are auto-wired. */
  accessToken?: string
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
    case 'REFERENCE':
      return (
        <Input
          id={id}
          value={value as string}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          placeholder={col.required ? 'ID required' : 'Reference ID'}
          className="gba:h-8 gba:text-xs gba:border-0 gba:shadow-none gba:bg-transparent focus-visible:gba:ring-1 gba:font-mono"
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
  accessToken,
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
              accessToken={accessToken}
              testId={`${testId}-${active.id}`}
            />
          )
        }}
      </PreviewTemplate>
    )
  }
  return (
    <DataModelPreviewSingle
      definition={definition!}
      onCreateRow={onCreateRow}
      accessToken={accessToken}
      testId={testId}
    />
  )
}

interface DataModelPreviewSingleProps {
  definition: DataModelPreviewDefinition
  onCreateRow?: (values: Record<string, unknown>) => Promise<void>
  accessToken?: string
  testId: string
}

/** Reference columns map to object types in GraphQL — only request scalar fields. */
const SCALAR_COLUMN_TYPES = new Set(['TEXT', 'NUMBER', 'DATE', 'DATETIME', 'CHECKBOX', 'SELECT'])

function buildListQuery(key: string, columns: DataModelPreviewColumn[]): { query: string; listField: string } {
  const listField = key.charAt(0).toLowerCase() + key.slice(1) + 'List'
  const scalarFields = columns.filter(c => SCALAR_COLUMN_TYPES.has(c.type)).map(c => c.name)
  const fields = ['id', ...scalarFields].join('\n      ')
  return { query: `{ ${listField} {\n      ${fields}\n    } }`, listField }
}

function formatReadValue(value: unknown, type: string): string {
  if (value == null || value === '') return '—'
  if (type === 'CHECKBOX') return value ? '✓' : '✗'
  if ((type === 'DATE' || type === 'DATETIME') && typeof value === 'string') {
    try {
      return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    } catch {
      return String(value)
    }
  }
  // REFERENCE: value is the referenced entity's ID or a stringified object — show as-is
  if (type === 'REFERENCE' && typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const DataModelPreviewSingle: React.FC<DataModelPreviewSingleProps> = ({
  definition,
  onCreateRow,
  accessToken,
  testId
}) => {
  const columns = definition.columns ?? []
  const displayName = definition.display_name ?? definition.key ?? ''
  const [rows, setRows] = useState<RowState[]>([])

  const [existingRows, setExistingRows] = useState<Record<string, unknown>[]>([])
  const [fetchLoading, setFetchLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const isCatalog = definition.modelType === 'catalog'

  const graphqlClient = useMemo(
    () =>
      accessToken && !isCatalog ? new CustomDataGraphQLClient({ accessToken, namespace: definition.namespace }) : null,
    [accessToken, isCatalog, definition.namespace]
  )

  const mutationClient = useMemo(
    () =>
      accessToken && !isCatalog ? new CustomDataMutationClient({ accessToken, namespace: definition.namespace }) : null,
    [accessToken, isCatalog, definition.namespace]
  )

  const fetchRows = useCallback(async () => {
    if (!graphqlClient) return
    setFetchLoading(true)
    setFetchError(null)
    try {
      const { query, listField } = buildListQuery(definition.key, columns)
      const data = await graphqlClient.request<Record<string, Record<string, unknown>[]>>(query)
      setExistingRows(data[listField] ?? [])
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Failed to load records')
    } finally {
      setFetchLoading(false)
    }
  }, [graphqlClient, definition.key, columns])

  useEffect(() => {
    fetchRows()
  }, [fetchRows])

  const effectiveOnCreateRow = useMemo<((values: Record<string, unknown>) => Promise<void>) | undefined>(() => {
    if (onCreateRow) return onCreateRow
    if (!mutationClient) return undefined
    return async (values: Record<string, unknown>) => {
      await mutationClient.createRow({ definitionKey: definition.key, values, namespace: definition.namespace })
      await fetchRows()
    }
  }, [onCreateRow, mutationClient, definition.key, definition.namespace, fetchRows])

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
      if (!effectiveOnCreateRow) return
      setRows(prev => prev.map(r => (r.id === rowId ? { ...r, saving: true, saveError: null } : r)))
      const row = rows.find(r => r.id === rowId)
      if (!row) return
      try {
        await effectiveOnCreateRow(row.values as Record<string, unknown>)
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
    [effectiveOnCreateRow, rows]
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
          <CardTitle className="gba:text-sm gba:font-medium">
            {displayName} entries
            {existingRows.length > 0 && (
              <span className="gba:ml-2 gba:text-xs gba:font-normal gba:text-muted-foreground">
                ({existingRows.length})
              </span>
            )}
          </CardTitle>
          <div className="gba:flex gba:items-center gba:gap-2">
            {graphqlClient && (
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchRows}
                disabled={fetchLoading}
                title="Refresh records"
                data-testid={`${testId}-refresh`}
              >
                <RefreshCw className={`gba:h-3.5 gba:w-3.5 ${fetchLoading ? 'gba:animate-spin' : ''}`} />
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={addRow} data-testid={`${testId}-add-row`}>
              <Plus className="gba:h-3.5 gba:w-3.5 gba:mr-1" /> Add row
            </Button>
          </div>
        </CardHeader>
        <CardContent className="gba:p-0">
          {isCatalog && (
            <div className="gba:px-3 gba:pt-3 gba:pb-2">
              <Alert className="gba:py-2">
                <AlertDescription className="gba:text-xs gba:text-muted-foreground">
                  This is a catalog (reference data). Its entries are managed through the Catalog Manager and are not
                  directly editable here.
                </AlertDescription>
              </Alert>
            </div>
          )}
          {fetchError && (
            <div className="gba:px-3 gba:pt-3">
              <Alert variant="destructive" className="gba:py-2">
                <AlertDescription className="gba:text-xs">{fetchError}</AlertDescription>
              </Alert>
            </div>
          )}
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
                {fetchLoading && existingRows.length === 0 && rows.length === 0 && (
                  <tr>
                    <td colSpan={columns.length + 1} className="gba:text-center gba:py-8">
                      <Spinner size="sm" />
                    </td>
                  </tr>
                )}
                {!fetchLoading && existingRows.length === 0 && rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={columns.length + 1}
                      className="gba:text-center gba:text-sm gba:text-muted-foreground gba:py-10"
                    >
                      No entries yet. Click "Add row" to create one.
                    </td>
                  </tr>
                )}
                {existingRows.map((row, i) => (
                  <tr
                    key={String(row.id ?? i)}
                    className="gba:border-b gba:border-border hover:gba:bg-muted/20 gba:transition-colors"
                    data-testid={`${testId}-existing-row-${i}`}
                  >
                    {columns.map(col => (
                      <td key={col.name} className="gba:px-3 gba:py-2 gba:align-middle gba:text-sm gba:text-foreground">
                        {formatReadValue(row[col.name], col.type)}
                      </td>
                    ))}
                    <td className="gba:w-16" />
                  </tr>
                ))}
                {rows.map((row, i) => (
                  <EditableRow
                    key={row.id}
                    rowIndex={i}
                    columns={columns}
                    values={row.values}
                    onChange={(name, value) => updateCell(row.id, name, value)}
                    onDelete={() => deleteRow(row.id)}
                    onSave={effectiveOnCreateRow ? () => saveRow(row.id) : undefined}
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
