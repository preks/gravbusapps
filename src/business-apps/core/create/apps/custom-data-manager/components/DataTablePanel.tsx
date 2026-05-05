import React, { useCallback, useMemo, useState } from 'react'
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Input,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Alert,
  AlertDescription
} from '@newwork/nw-design-system'
import { Plus, Trash2, Save, X, RefreshCw, Loader2, Pencil } from 'lucide-react'
import type { CustomDataDefinition, RowMutationResult } from '../types'
import { useEntityData } from '../hooks/useEntityData'

interface DataTablePanelProps {
  definition: CustomDataDefinition
  accessToken: string
  onCreateRow: (namespace: string, definitionKey: string, values: Record<string, unknown>) => Promise<RowMutationResult>
  onUpdateRow: (
    namespace: string,
    definitionKey: string,
    rowId: string,
    values: Record<string, unknown>
  ) => Promise<RowMutationResult>
  onDeleteRow: (namespace: string, definitionKey: string, rowId: string) => Promise<RowMutationResult>
  'data-testid'?: string
}

type EditingState =
  | { mode: 'create'; values: Record<string, string> }
  | { mode: 'update'; rowId: string; values: Record<string, string> }
  | null

export const DataTablePanel: React.FC<DataTablePanelProps> = ({
  definition,
  accessToken,
  onCreateRow,
  onUpdateRow,
  onDeleteRow,
  'data-testid': testId = 'data-table-panel'
}) => {
  const { rows, loading, error, refetch, responseKeyForColumn } = useEntityData(accessToken, definition)
  const [editing, setEditing] = useState<EditingState>(null)
  const [mutating, setMutating] = useState(false)
  const [mutationError, setMutationError] = useState<string | null>(null)

  const editableColumns = useMemo(() => definition.columns_json.filter(c => c.name !== 'id'), [definition.columns_json])

  const emptyValues = useMemo(() => Object.fromEntries(editableColumns.map(c => [c.name, ''])), [editableColumns])

  const startCreate = useCallback(() => {
    setEditing({ mode: 'create', values: { ...emptyValues } })
    setMutationError(null)
  }, [emptyValues])

  const startEdit = useCallback(
    (row: Record<string, unknown>) => {
      const values: Record<string, string> = {}
      for (const col of editableColumns) {
        const k = responseKeyForColumn(col.name)
        const raw = row[k as keyof typeof row]
        values[col.name] = raw != null ? String(raw) : ''
      }
      setEditing({ mode: 'update', rowId: String(row.id), values })
      setMutationError(null)
    },
    [editableColumns, responseKeyForColumn]
  )

  const cancelEdit = useCallback(() => {
    setEditing(null)
    setMutationError(null)
  }, [])

  const updateEditValue = useCallback((field: string, value: string) => {
    setEditing(prev => {
      if (!prev) return prev
      return { ...prev, values: { ...prev.values, [field]: value } }
    })
  }, [])

  const saveRow = useCallback(async () => {
    if (!editing) return
    setMutating(true)
    setMutationError(null)
    try {
      const parsedValues: Record<string, unknown> = {}
      for (const col of editableColumns) {
        const raw = editing.values[col.name]
        if (col.type === 'NUMBER') {
          parsedValues[col.name] = raw ? Number(raw) : null
        } else if (col.type === 'CHECKBOX') {
          parsedValues[col.name] = raw === 'true'
        } else {
          parsedValues[col.name] = raw || null
        }
      }

      let result: RowMutationResult
      if (editing.mode === 'create') {
        result = await onCreateRow(definition.namespace, definition.key, parsedValues)
      } else {
        result = await onUpdateRow(definition.namespace, definition.key, editing.rowId, parsedValues)
      }

      if (!result.success) {
        setMutationError(result.error ?? 'Operation failed')
        return
      }
      setEditing(null)
      refetch()
    } catch (saveError) {
      setMutationError(saveError instanceof Error ? saveError.message : String(saveError))
    } finally {
      setMutating(false)
    }
  }, [editing, editableColumns, definition, onCreateRow, onUpdateRow, refetch])

  const handleDelete = useCallback(
    async (rowId: string) => {
      setMutating(true)
      setMutationError(null)
      try {
        const result = await onDeleteRow(definition.namespace, definition.key, rowId)
        if (!result.success) {
          setMutationError(result.error ?? 'Delete failed')
          return
        }
        refetch()
      } catch (deleteError) {
        setMutationError(deleteError instanceof Error ? deleteError.message : String(deleteError))
      } finally {
        setMutating(false)
      }
    },
    [definition, onDeleteRow, refetch]
  )

  const tableHeadings = useMemo(
    () => [{ id: 'id' as const, label: 'ID' }, ...editableColumns.map(c => ({ id: c.name, label: c.label || c.name }))],
    [editableColumns]
  )

  const dataColumnCount = 1 + editableColumns.length

  return (
    <Card data-testid={testId}>
      <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:pb-4">
        <CardTitle className="gba:text-base">Data ({rows.length} rows)</CardTitle>
        <div className="gba:flex gba:items-center gba:gap-2">
          <Button variant="outline" size="sm" onClick={refetch} disabled={loading} data-testid={`${testId}-refresh`}>
            <RefreshCw className={`gba:h-4 gba:w-4 ${loading ? 'gba:animate-spin' : ''}`} />
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={startCreate}
            disabled={editing !== null || mutating}
            data-testid={`${testId}-add-row`}
          >
            <Plus className="gba:h-4 gba:w-4 gba:mr-1" />
            Add Row
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="gba:mb-4" data-testid={`${testId}-error`}>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {mutationError && (
          <Alert variant="destructive" className="gba:mb-4" data-testid={`${testId}-mutation-error`}>
            <AlertDescription>{mutationError}</AlertDescription>
          </Alert>
        )}

        <div className="gba:rounded-md gba:border gba:overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {tableHeadings.map(col => (
                  <TableHead key={col.id} className="gba:whitespace-nowrap">
                    {col.label}
                  </TableHead>
                ))}
                <TableHead className="gba:w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {editing?.mode === 'create' && (
                <TableRow data-testid={`${testId}-new-row`}>
                  <TableCell className="gba:text-muted-foreground gba:text-xs">auto</TableCell>
                  {editableColumns.map(col => (
                    <TableCell key={col.name}>
                      <Input
                        value={editing.values[col.name] ?? ''}
                        onChange={e => updateEditValue(col.name, e.target.value)}
                        placeholder={col.label || col.name}
                        className="gba:h-8 gba:text-sm"
                        data-testid={`${testId}-new-${col.name}`}
                      />
                    </TableCell>
                  ))}
                  <TableCell>
                    <div className="gba:flex gba:items-center gba:gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={saveRow}
                        disabled={mutating}
                        data-testid={`${testId}-save-new`}
                      >
                        {mutating ? (
                          <Loader2 className="gba:h-4 gba:w-4 gba:animate-spin" />
                        ) : (
                          <Save className="gba:h-4 gba:w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={cancelEdit}
                        disabled={mutating}
                        data-testid={`${testId}-cancel-new`}
                      >
                        <X className="gba:h-4 gba:w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {loading && rows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={dataColumnCount + 1}
                    className="gba:text-center gba:py-8 gba:text-muted-foreground"
                  >
                    <Loader2 className="gba:h-5 gba:w-5 gba:animate-spin gba:mx-auto" />
                  </TableCell>
                </TableRow>
              )}

              {!loading && rows.length === 0 && !editing && (
                <TableRow>
                  <TableCell
                    colSpan={dataColumnCount + 1}
                    className="gba:text-center gba:py-8 gba:text-muted-foreground"
                  >
                    No data yet. Click "Add Row" to insert the first record.
                  </TableCell>
                </TableRow>
              )}

              {rows.map(row => {
                const isEditingThisRow = editing?.mode === 'update' && editing.rowId === String(row.id)
                return (
                  <TableRow key={String(row.id)} data-testid={`${testId}-row-${row.id}`}>
                    <TableCell className="gba:text-xs gba:font-mono gba:text-muted-foreground gba:max-w-32 gba:truncate">
                      {String(row.id).slice(0, 8)}...
                    </TableCell>
                    {editableColumns.map(col => {
                      const displayValue = row[responseKeyForColumn(col.name) as keyof typeof row]
                      return (
                        <TableCell key={col.name}>
                          {isEditingThisRow ? (
                            <Input
                              value={editing.values[col.name] ?? ''}
                              onChange={e => updateEditValue(col.name, e.target.value)}
                              className="gba:h-8 gba:text-sm"
                              data-testid={`${testId}-edit-${col.name}`}
                            />
                          ) : (
                            <span className="gba:text-sm">{displayValue != null ? String(displayValue) : ''}</span>
                          )}
                        </TableCell>
                      )
                    })}
                    <TableCell>
                      {isEditingThisRow ? (
                        <div className="gba:flex gba:items-center gba:gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={saveRow}
                            disabled={mutating}
                            data-testid={`${testId}-save-edit`}
                          >
                            {mutating ? (
                              <Loader2 className="gba:h-4 gba:w-4 gba:animate-spin" />
                            ) : (
                              <Save className="gba:h-4 gba:w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={cancelEdit}
                            disabled={mutating}
                            data-testid={`${testId}-cancel-edit`}
                          >
                            <X className="gba:h-4 gba:w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="gba:flex gba:items-center gba:gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(row)}
                            disabled={editing !== null || mutating}
                            data-testid={`${testId}-edit-row-${row.id}`}
                          >
                            <Pencil className="gba:h-4 gba:w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(String(row.id))}
                            disabled={editing !== null || mutating}
                            data-testid={`${testId}-delete-row-${row.id}`}
                          >
                            <Trash2 className="gba:h-4 gba:w-4 gba:text-destructive" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
