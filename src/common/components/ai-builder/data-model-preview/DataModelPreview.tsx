import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { PreviewTemplate } from '../preview-template'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Alert,
  AlertDescription,
  Spinner,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from '@newwork/nw-design-system'
import { Database, Plus, RefreshCw, LayoutList, Table2 } from 'lucide-react'
import { PreviewHeaderCard } from '../preview-header'
import { CustomDataGraphQLClient } from '@/common/network/custom-data/CustomDataGraphQLClient'
import { CustomDataMutationClient } from '@/common/network/custom-data/CustomDataMutationClient'
import type { DataModelPreviewColumn, DataModelPreviewDefinition } from './dataModelPreviewTypes'
import { enrichColumnsWithSchemaTypes } from './typeMapping'
import type { RowValues } from './DataModelPreviewCells'
import { SimpleTableRow } from './SimpleTableRow'

export interface DataModelPreviewItem {
  id: string
  label: string
  definition: DataModelPreviewDefinition
  onCreateRow?: (values: Record<string, unknown>) => Promise<void>
  onUpdateRow?: (rowId: string, values: Record<string, unknown>) => Promise<void>
  onDeleteRow?: (rowId: string) => Promise<void>
}

export interface DataModelPreviewProps {
  /** Multiple preloaded data models with switcher. */
  items?: DataModelPreviewItem[]
  /** Single data model (no switcher). */
  definition?: DataModelPreviewDefinition
  onCreateRow?: (values: Record<string, unknown>) => Promise<void>
  onUpdateRow?: (rowId: string, values: Record<string, unknown>) => Promise<void>
  onDeleteRow?: (rowId: string) => Promise<void>
  /** When provided, existing records are fetched from the custom-data API and mutations are auto-wired. */
  accessToken?: string
  'data-testid'?: string
}

function emptyRow(columns: DataModelPreviewColumn[]): RowValues {
  const row: RowValues = {}
  columns.forEach(col => {
    row[col.name] = col.type === 'CHECKBOX' ? false : ''
  })
  return row
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
  onUpdateRow,
  onDeleteRow,
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
              onUpdateRow={active.onUpdateRow}
              onDeleteRow={active.onDeleteRow}
              accessToken={accessToken}
              testId={`${testId}-${active.id}`}
            />
          )
        }}
      </PreviewTemplate>
    )
  }
  if (!definition) return null
  return (
    <DataModelPreviewSingle
      definition={definition}
      onCreateRow={onCreateRow}
      onUpdateRow={onUpdateRow}
      onDeleteRow={onDeleteRow}
      accessToken={accessToken}
      testId={testId}
    />
  )
}

interface DataModelPreviewSingleProps {
  definition: DataModelPreviewDefinition
  onCreateRow?: (values: Record<string, unknown>) => Promise<void>
  onUpdateRow?: (rowId: string, values: Record<string, unknown>) => Promise<void>
  onDeleteRow?: (rowId: string) => Promise<void>
  accessToken?: string
  testId: string
}

const COLUMN_TYPE_LABELS: Record<string, string> = {
  TEXT: 'Short text',
  NUMBER: 'Number',
  DATE: 'Date',
  DATETIME: 'Date and time',
  CHECKBOX: 'Yes / No',
  SELECT: 'Dropdown',
  REFERENCE: 'Link to another list'
}

function getColumnTypeLabel(type: string): string {
  const upper = (type ?? 'TEXT').toUpperCase()
  return COLUMN_TYPE_LABELS[upper] ?? upper
}

function formatDateLike(value: unknown, type: string): string {
  const num = Number(value)
  if (Number.isNaN(num)) return typeof value === 'string' ? value : JSON.stringify(value)
  const date = new Date(num)
  if (Number.isNaN(date.getTime())) return typeof value === 'string' ? value : JSON.stringify(value)
  if (type === 'DATE') {
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  }
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatReadValue(value: unknown, type: string): string {
  if (value == null || value === '') return '—'
  if (type === 'CHECKBOX') return value ? '✓' : '✗'
  if ((type === 'DATE' || type === 'DATETIME') && typeof value === 'string') {
    try {
      return formatDateLike(value, type)
    } catch {
      return typeof value === 'string' ? value : JSON.stringify(value)
    }
  }
  if (type === 'REFERENCE' && typeof value === 'object') return JSON.stringify(value)
  if (typeof value === 'object') return JSON.stringify(value)
  return typeof value === 'string' ? value : JSON.stringify(value)
}

/** Reference columns map to scalar fields only in GraphQL. */
const SCALAR_COLUMN_TYPES = new Set(['TEXT', 'NUMBER', 'DATE', 'DATETIME', 'CHECKBOX', 'SELECT'])

function toStableRowKey(row: Record<string, unknown>, index: number): string {
  const id = row.id
  if (id == null) return `row-${index}`
  if (typeof id === 'object') return JSON.stringify(id)
  return `${id}`
}

function toRowId(row: Record<string, unknown>): string {
  const id = row.id
  if (id == null) return ''
  if (typeof id === 'object') return JSON.stringify(id)
  return `${id}`
}

function areColumnOptionsEqual(
  left: Array<{ value: string; label: string }> | undefined,
  right: Array<{ value: string; label: string }> | undefined
): boolean {
  if (!left && !right) return true
  if (!left || !right) return false
  if (left.length !== right.length) return false
  return left.every((option, index) => {
    const rightOption = right[index]
    return option.value === rightOption?.value && option.label === rightOption?.label
  })
}

function areColumnsEqual(left: DataModelPreviewColumn[], right: DataModelPreviewColumn[]): boolean {
  if (left.length !== right.length) return false
  return left.every((column, index) => {
    const rightColumn = right[index]
    return (
      column.name === rightColumn?.name &&
      column.label === rightColumn?.label &&
      column.type === rightColumn?.type &&
      column.required === rightColumn?.required &&
      areColumnOptionsEqual(column.options, rightColumn?.options)
    )
  })
}

function toPascalCaseEntityKey(input: string): string {
  const value = String(input || '').trim()
  if (!value) return 'Entity'
  const parts = value
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  const out = parts.map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('')
  return out && /^[A-Za-z]/.test(out) ? out : `Entity${out}`
}

function toCamelCaseEntityKey(input: string): string {
  const pascal = toPascalCaseEntityKey(input)
  return pascal.charAt(0).toLowerCase() + pascal.slice(1)
}

function toGraphqlSafeEntityBase(input: string): string {
  const value = String(input || '').trim()
  if (!value) return 'entity'
  const safe = value.replace(/\W/g, '_')
  if (!safe) return 'entity'
  return /^[_A-Za-z]/.test(safe) ? safe : `_${safe}`
}

function buildEntityQueryNames(entityKey: string): { listPrimary: string; listCandidates: string[]; typeName: string } {
  const primaryBase = toCamelCaseEntityKey(entityKey)
  const rawBase = toGraphqlSafeEntityBase(entityKey)
  const rawLowerBase = rawBase.charAt(0).toLowerCase() + rawBase.slice(1)
  const bases = Array.from(new Set([primaryBase, rawBase, rawLowerBase].filter(Boolean)))

  return {
    listPrimary: `${primaryBase}List`,
    listCandidates: bases.map(base => `${base}List`),
    typeName: toPascalCaseEntityKey(entityKey)
  }
}

function buildListQuery(
  key: string,
  columns: DataModelPreviewColumn[]
): { query: string; listFieldCandidates: string[] } {
  const queryNames = buildEntityQueryNames(key)
  const scalarFields = columns.filter(c => SCALAR_COLUMN_TYPES.has(c.type)).map(c => c.name)
  const fields = ['id', ...scalarFields].join('\n      ')
  return {
    query: `{ ${queryNames.listPrimary} {\n      ${fields}\n    } }`,
    listFieldCandidates: queryNames.listCandidates
  }
}

type DataModelTab = 'structure' | 'data'

const DataModelPreviewSingle: React.FC<DataModelPreviewSingleProps> = ({
  definition,
  onCreateRow,
  onUpdateRow,
  onDeleteRow,
  accessToken,
  testId
}) => {
  const [activeTab, setActiveTab] = useState<DataModelTab>('structure')
  const [columns, setColumns] = useState<DataModelPreviewColumn[]>(definition.columns ?? [])
  const displayName = definition.display_name ?? definition.key ?? ''
  const [rows, setRows] = useState<RowState[]>([])

  const [existingRows, setExistingRows] = useState<Record<string, unknown>[]>([])
  const [fetchLoading, setFetchLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [editingExistingId, setEditingExistingId] = useState<string | null>(null)
  const [editingValues, setEditingValues] = useState<RowValues>({})
  const [existingSaving, setExistingSaving] = useState(false)
  const [existingError, setExistingError] = useState<string | null>(null)

  const isCatalog = definition.modelType === 'catalog'
  const entityQueryNames = useMemo(() => buildEntityQueryNames(definition.key), [definition.key])
  const scalarFieldNames = useMemo(
    () => columns.filter(c => SCALAR_COLUMN_TYPES.has(c.type)).map(c => c.name),
    [columns]
  )
  const scalarFieldSignature = useMemo(() => scalarFieldNames.join('|'), [scalarFieldNames])
  const listQueryConfig = useMemo(() => buildListQuery(definition.key, columns), [definition.key, scalarFieldSignature])

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

  const fetchSchemaTypes = useCallback(async () => {
    if (!graphqlClient) return

    try {
      const schemaTypes = await graphqlClient.introspectEntityType(entityQueryNames.typeName)
      if (Object.keys(schemaTypes).length > 0) {
        const enrichedColumns = enrichColumnsWithSchemaTypes(definition.columns ?? [], schemaTypes)
        setColumns(prev => (areColumnsEqual(prev, enrichedColumns) ? prev : enrichedColumns))
      }
    } catch (error) {
      console.warn('Failed to fetch schema types, using definition types:', error)
    }
  }, [graphqlClient, definition.columns, entityQueryNames.typeName])

  useEffect(() => {
    fetchSchemaTypes()
  }, [fetchSchemaTypes])

  const fetchRows = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!graphqlClient) return
      const isSilent = options?.silent === true
      if (!isSilent) {
        setFetchLoading(true)
      }
      setFetchError(null)
      try {
        const { query, listFieldCandidates } = listQueryConfig
        const data = await graphqlClient.request<Record<string, Record<string, unknown>[]>>(query)
        const listRows =
          listFieldCandidates
            .map(field => data[field])
            .find((rows): rows is Record<string, unknown>[] => Array.isArray(rows)) || []
        setExistingRows(listRows)
      } catch (e) {
        setFetchError(e instanceof Error ? e.message : 'Failed to load records')
      } finally {
        if (!isSilent) {
          setFetchLoading(false)
        }
      }
    },
    [graphqlClient, listQueryConfig]
  )

  useEffect(() => {
    void fetchRows({ silent: true })
  }, [fetchRows])

  const effectiveOnCreateRow = useMemo<((values: Record<string, unknown>) => Promise<void>) | undefined>(() => {
    if (onCreateRow) return onCreateRow
    if (!mutationClient) return undefined
    return async (values: Record<string, unknown>) => {
      await mutationClient.createRow({ definitionKey: definition.key, values, namespace: definition.namespace })
      await fetchRows({ silent: true })
    }
  }, [onCreateRow, mutationClient, definition.key, definition.namespace, fetchRows])

  const effectiveOnUpdateRow = useMemo<
    ((rowId: string, values: Record<string, unknown>) => Promise<void>) | undefined
  >(() => {
    if (onUpdateRow) return onUpdateRow
    if (!mutationClient) return undefined
    return async (rowId: string, values: Record<string, unknown>) => {
      await mutationClient.updateRow({
        definitionKey: definition.key,
        rowId,
        values,
        namespace: definition.namespace
      })
      await fetchRows({ silent: true })
    }
  }, [onUpdateRow, mutationClient, definition.key, definition.namespace, fetchRows])

  const effectiveOnDeleteRow = useMemo<((rowId: string) => Promise<void>) | undefined>(() => {
    if (onDeleteRow) return onDeleteRow
    if (!mutationClient) return undefined
    return async (rowId: string) => {
      await mutationClient.deleteRow({
        definitionKey: definition.key,
        rowId,
        namespace: definition.namespace
      })
      await fetchRows({ silent: true })
    }
  }, [onDeleteRow, mutationClient, definition.key, definition.namespace, fetchRows])

  const convertCheckboxValue = Boolean

  const convertDateValue = (raw: unknown, colType: string): string => {
    if (raw == null || raw === '') return ''

    let date: Date
    if (typeof raw === 'number') {
      date = new Date(raw)
    } else {
      const numericTimestamp = Number(raw)
      if (Number.isNaN(numericTimestamp)) {
        date = new Date(`${raw}`)
      } else {
        date = new Date(numericTimestamp)
      }
    }

    if (Number.isNaN(date.getTime())) return ''

    return colType === 'DATE' ? date.toISOString().split('T')[0] : date.toISOString()
  }

  const convertReferenceValue = (raw: unknown): string => {
    if (typeof raw !== 'object' || raw === null || !('id' in raw)) return ''
    const refId = (raw as { id: unknown }).id
    if (refId == null) return ''
    return typeof refId === 'object' ? JSON.stringify(refId) : `${refId}`
  }

  const convertGenericValue = (raw: unknown): string => {
    if (raw == null) return ''
    return typeof raw === 'object' ? JSON.stringify(raw) : `${raw}`
  }

  const startEditingExisting = useCallback(
    (rowKey: string, row: Record<string, unknown>) => {
      setEditingExistingId(rowKey)
      const values: RowValues = {}
      columns.forEach(col => {
        const raw = row[col.name]
        if (col.type === 'CHECKBOX') {
          values[col.name] = convertCheckboxValue(raw)
        } else if (col.type === 'DATE' || col.type === 'DATETIME') {
          values[col.name] = convertDateValue(raw, col.type)
        } else if (col.type === 'REFERENCE') {
          values[col.name] = convertReferenceValue(raw)
        } else {
          values[col.name] = convertGenericValue(raw)
        }
      })
      setEditingValues(values)
    },
    [columns]
  )

  const cancelEditingExisting = useCallback(() => {
    setEditingExistingId(null)
  }, [])

  const updateExistingCell = useCallback((name: string, value: string | boolean) => {
    setEditingValues(prev => ({ ...prev, [name]: value }))
  }, [])

  const saveExistingRow = useCallback(
    async (rowId: string) => {
      if (!effectiveOnUpdateRow) return
      setExistingSaving(true)
      setExistingError(null)
      try {
        await effectiveOnUpdateRow(rowId, editingValues as Record<string, unknown>)
        setEditingExistingId(null)
        setExistingError(null)
      } catch (e) {
        setExistingError(e instanceof Error ? e.message : 'Failed to update row')
      } finally {
        setExistingSaving(false)
      }
    },
    [effectiveOnUpdateRow, editingValues]
  )

  const deleteExistingRow = useCallback(
    async (rowId: string) => {
      if (!effectiveOnDeleteRow) return
      setExistingError(null)
      try {
        await effectiveOnDeleteRow(rowId)
        if (editingExistingId === rowId) {
          setEditingExistingId(null)
        }
        setExistingError(null)
      } catch (e) {
        setExistingError(e instanceof Error ? e.message : 'Failed to delete row')
      }
    },
    [effectiveOnDeleteRow, editingExistingId]
  )

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
      <PreviewHeaderCard
        icon={Database}
        title={displayName}
        description={definition.description ?? 'A data type you can use to store and manage records.'}
        data-testid={`${testId}-header`}
      />

      <Tabs
        value={activeTab}
        onValueChange={v => setActiveTab(v as DataModelTab)}
        className="gba:flex gba:flex-col gba:gap-3 gba:min-h-0"
        data-testid={`${testId}-tabs`}
      >
        <TabsList
          className="gba:w-full gba:grid gba:grid-cols-2 gba:shrink-0 gba:h-11 gba:p-1 gba:bg-muted gba:rounded-lg gba:items-stretch"
          data-testid={`${testId}-tabs-list`}
        >
          <TabsTrigger
            value="structure"
            className="gba:inline-flex gba:items-center gba:justify-center gba:gap-1.5 gba:h-full gba:min-h-0 gba:py-0 gba:rounded-md"
            data-testid={`${testId}-tab-structure`}
          >
            <span className="gba:inline-flex gba:items-center gba:gap-1.5">
              <LayoutList className="gba:h-3.5 gba:w-3.5 gba:shrink-0" />
              <span>Structure</span>
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="data"
            className="gba:inline-flex gba:items-center gba:justify-center gba:gap-1.5 gba:h-full gba:min-h-0 gba:py-0 gba:rounded-md"
            data-testid={`${testId}-tab-data`}
          >
            <span className="gba:inline-flex gba:items-center gba:gap-1.5">
              <Table2 className="gba:h-3.5 gba:w-3.5 gba:shrink-0" />
              <span>Data</span>
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="structure" className="gba:mt-0 gba:flex-1 gba:min-h-0" data-testid={`${testId}-structure`}>
          <Card className="gba:border-border gba:overflow-hidden">
            <CardHeader className="gba:py-3 gba:border-b gba:border-border">
              <CardTitle className="gba:text-sm gba:font-medium">Fields</CardTitle>
            </CardHeader>
            <CardContent className="gba:p-0">
              {columns.length === 0 ? (
                <p className="gba:text-sm gba:text-muted-foreground gba:py-6 gba:px-4">No fields defined.</p>
              ) : (
                <ul className="gba:divide-y gba:divide-border">
                  {columns.map(col => (
                    <li
                      key={col.name}
                      className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:px-4 gba:py-3 gba:text-sm"
                      data-testid={`${testId}-structure-field-${col.name}`}
                    >
                      <div className="gba:min-w-0 gba:flex-1">
                        <span className="gba:font-medium gba:text-foreground">{col.label || col.name}</span>
                        <span className="gba:text-muted-foreground gba:ml-2">{getColumnTypeLabel(col.type)}</span>
                      </div>
                      <Badge variant="outline" className="gba:text-xs gba:shrink-0">
                        {col.required ? 'Required' : 'Optional'}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="gba:mt-0 gba:flex-1 gba:min-h-0">
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
                    onClick={() => void fetchRows()}
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
                      This is a catalog (reference data). Its entries are managed through the Catalog Manager and are
                      not directly editable here.
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
              {existingError && (
                <div className="gba:px-3 gba:pt-3">
                  <Alert variant="destructive" className="gba:py-2">
                    <AlertDescription className="gba:text-xs">{existingError}</AlertDescription>
                  </Alert>
                </div>
              )}
              {(() => {
                const hasNoRows = existingRows.length === 0 && rows.length === 0
                if (fetchLoading && hasNoRows) {
                  return (
                    <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
                      <Spinner size="sm" />
                    </div>
                  )
                }
                if (hasNoRows) {
                  return (
                    <div className="gba:text-center gba:text-sm gba:text-muted-foreground gba:py-10">
                      No entries yet. Click "Add row" to create one.
                    </div>
                  )
                }
                return (
                  <div className="gba:overflow-x-auto">
                    <table className="gba:w-full gba:text-sm" style={{ tableLayout: 'fixed', width: '100%' }}>
                      <colgroup>
                        {columns.map(col => (
                          <col key={col.name} />
                        ))}
                        <col style={{ width: '120px' }} />
                      </colgroup>
                      <thead>
                        <tr className="gba:bg-muted/50 gba:border-b gba:border-border">
                          {columns.map(col => (
                            <th
                              key={col.name}
                              className="gba:text-left gba:font-medium gba:px-3 gba:py-2.5 gba:text-foreground gba:overflow-hidden"
                            >
                              <div className="gba:truncate">
                                {col.label || col.name}
                                {col.required && <span className="gba:text-destructive gba:ml-0.5">*</span>}
                              </div>
                            </th>
                          ))}
                          <th className="gba:px-3 gba:py-2.5" style={{ width: '120px' }} />
                        </tr>
                      </thead>
                      <tbody>
                        {existingRows.map((row, rowIndex) => {
                          const rowKey = toStableRowKey(row, rowIndex)
                          const rowId = toRowId(row)
                          const isEditingThis = editingExistingId === rowKey
                          const canEditRow = isCatalog === false && Boolean(effectiveOnUpdateRow) && rowId.length > 0
                          const canDeleteRow = isCatalog === false && Boolean(effectiveOnDeleteRow) && rowId.length > 0
                          return (
                            <SimpleTableRow
                              key={rowKey}
                              row={row}
                              rowIndex={rowIndex}
                              columns={columns}
                              isEditing={isEditingThis}
                              editValues={editingValues}
                              canEdit={canEditRow}
                              canDelete={canDeleteRow}
                              saving={existingSaving}
                              testId={testId}
                              onStartEdit={() => startEditingExisting(rowKey, row)}
                              onCancelEdit={cancelEditingExisting}
                              onSave={() => saveExistingRow(rowId)}
                              onDelete={() => deleteExistingRow(rowId)}
                              onCellChange={updateExistingCell}
                              formatValue={formatReadValue}
                            />
                          )
                        })}
                        {rows.map((row, rowIndex) => {
                          const isSaved = row.saved === true
                          return (
                            <SimpleTableRow
                              key={row.id}
                              row={row.values}
                              rowIndex={existingRows.length + rowIndex}
                              columns={columns}
                              isEditing={true}
                              editValues={row.values}
                              canEdit={false}
                              canDelete={isSaved === false}
                              saving={row.saving}
                              testId={testId}
                              onStartEdit={() => {}}
                              onCancelEdit={() => {}}
                              onSave={() => (effectiveOnCreateRow ? saveRow(row.id) : undefined)}
                              onDelete={() => deleteRow(row.id)}
                              onCellChange={(name, value) => updateCell(row.id, name, value)}
                              formatValue={formatReadValue}
                            />
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              })()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
