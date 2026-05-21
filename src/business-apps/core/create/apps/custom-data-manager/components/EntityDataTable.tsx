import React, { useCallback, useMemo, useState } from 'react'
import {
  Alert,
  AlertDescription,
  Table,
  TableHead,
  TableHeader,
  TableRow
} from '@newwork/nw-design-system'
import type { ColumnDefinition, CustomDataDefinition, RowMutationResult } from '../types'
import { InputType } from '../types'
import { useEntityData } from '../hooks/useEntityData'
import { useEntityDataSelectOptions } from '../hooks/useEntityDataSelectOptions'
import { EntityDataTableBody, type EntityDataDraftRow } from './EntityDataTableBody'
import { EntityDataTableCell, hasEditedEntityDataValues } from './EntityDataTableCell'
import { EntityDataTableToolbar } from './EntityDataTableToolbar'
import {
  createEmptyEntityDataEditValues,
  getInitialEntityDataEditValue,
  serializeEntityDataEditValues,
  type EntityDataEditValue,
  type EntityDataEditValues
} from '../utils/entityDataRowValues'

interface EntityDataTableProps {
  definition: CustomDataDefinition
  allDefinitions: CustomDataDefinition[]
  accessToken: string
  onCreateRow: (
    namespace: string,
    entityName: string,
    values: Record<string, unknown>
  ) => Promise<RowMutationResult>
  onUpdateRow: (
    namespace: string,
    entityName: string,
    rowId: string,
    values: Record<string, unknown>
  ) => Promise<RowMutationResult>
  onDeleteRow: (namespace: string, entityName: string, rowId: string) => Promise<RowMutationResult>
  'data-testid'?: string
}

function getEntityDataColumnWidth(column: ColumnDefinition): string {
  if (column.type === InputType.CHECKBOX) {
    return 'gba:w-16'
  }
  if (column.type === InputType.NUMBER) {
    return 'gba:w-28'
  }
  if (column.type === InputType.DATE || column.type === InputType.DATETIME) {
    return 'gba:w-36'
  }
  if (column.type === InputType.SELECT) {
    return 'gba:w-40'
  }
  if (column.type === InputType.MULTISELECT || column.type === InputType.TEXTAREA) {
    return 'gba:w-48'
  }
  return 'gba:w-36'
}

export const EntityDataTable: React.FC<EntityDataTableProps> = ({
  definition,
  allDefinitions,
  accessToken,
  onCreateRow,
  onUpdateRow,
  onDeleteRow,
  'data-testid': testId = 'entity-data-table'
}) => {
  const { rows, loading, error, refetch, responseKeyForColumn } = useEntityData(accessToken, definition)
  const [draftRows, setDraftRows] = useState<EntityDataDraftRow[]>([])
  const [editedRows, setEditedRows] = useState<Map<string, EntityDataEditValues>>(new Map())
  const [mutating, setMutating] = useState(false)
  const [mutationError, setMutationError] = useState<string | null>(null)
  const editableColumns = useMemo(() => definition.columns.filter(column => column.fieldName !== 'id'), [definition])
  const { optionsByColumn, loadingByColumn, errorByColumn } = useEntityDataSelectOptions({
    accessToken,
    columns: editableColumns,
    currentNamespace: definition.namespace,
    allDefinitions
  })

  const startCreate = useCallback(() => {
    setDraftRows(previousDraftRows => [
      { mode: 'create', rowId: `draft:${Date.now()}`, values: createEmptyEntityDataEditValues(editableColumns) },
      ...previousDraftRows
    ])
    setMutationError(null)
  }, [editableColumns])

  const getRowValues = useCallback(
    (row: Record<string, unknown>) => {
      const values: EntityDataEditValues = {}
      for (const column of editableColumns) {
        const responseKey = responseKeyForColumn(column.fieldName)
        values[column.fieldName] = getInitialEntityDataEditValue(row[responseKey], column)
      }
      return values
    },
    [editableColumns, responseKeyForColumn]
  )

  const discardRow = useCallback((rowId: string) => {
    setDraftRows(previousDraftRows => previousDraftRows.filter(draftRow => draftRow.rowId !== rowId))
    setEditedRows(previousEditedRows => {
      const nextEditedRows = new Map(previousEditedRows)
      nextEditedRows.delete(rowId)
      return nextEditedRows
    })
    setMutationError(null)
  }, [])

  const updateDraftValue = useCallback((rowId: string, field: string, value: EntityDataEditValue) => {
    setDraftRows(previousDraftRows =>
      previousDraftRows.map(draftRow =>
        draftRow.rowId === rowId ? { ...draftRow, values: { ...draftRow.values, [field]: value } } : draftRow
      )
    )
  }, [])

  const updatePersistedValue = useCallback(
    (row: Record<string, unknown>, field: string, value: EntityDataEditValue) => {
      const rowId = String(row.id)
      setEditedRows(previousEditedRows => {
        const originalValues = getRowValues(row)
        const currentValues = previousEditedRows.get(rowId) ?? originalValues
        const nextValues = { ...currentValues, [field]: value }
        const hasChanges = hasEditedEntityDataValues(editableColumns, nextValues, originalValues)
        const nextEditedRows = new Map(previousEditedRows)
        if (hasChanges) {
          nextEditedRows.set(rowId, nextValues)
        } else {
          nextEditedRows.delete(rowId)
        }
        return nextEditedRows
      })
    },
    [editableColumns, getRowValues]
  )

  const saveRow = useCallback(
    async (rowId: string) => {
      const draftRow = draftRows.find(row => row.rowId === rowId)
      const values = draftRow?.values ?? editedRows.get(rowId)
      if (!values) {
        return
      }
      setMutating(true)
      setMutationError(null)
      try {
        const parsedValues = serializeEntityDataEditValues(editableColumns, values)
        const result = draftRow
          ? await onCreateRow(definition.namespace, definition.entityName, parsedValues)
          : await onUpdateRow(definition.namespace, definition.entityName, rowId, parsedValues)

        if (!result.success) {
          setMutationError(result.error ?? 'Operation failed')
          return
        }
        discardRow(rowId)
        refetch()
      } catch (saveError) {
        setMutationError(saveError instanceof Error ? saveError.message : String(saveError))
      } finally {
        setMutating(false)
      }
    },
    [definition, discardRow, draftRows, editableColumns, editedRows, onCreateRow, onUpdateRow, refetch]
  )

  const handleDelete = useCallback(
    async (rowId: string) => {
      setMutating(true)
      setMutationError(null)
      try {
        const result = await onDeleteRow(definition.namespace, definition.entityName, rowId)
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
    () => [{ id: 'id', label: 'ID' }, ...editableColumns.map(column => ({ id: column.fieldName, label: column.label }))],
    [editableColumns]
  )
  const columnCount = tableHeadings.length + 1

  const renderDataCell = (params: {
    row: Record<string, unknown> | EntityDataDraftRow
    fieldName: string
    isDraft: boolean
  }) => {
    const { row, fieldName, isDraft } = params
    const column = editableColumns.find(currentColumn => currentColumn.fieldName === fieldName)
    if (!column) {
      return null
    }
    const rowId = isDraft ? (row as EntityDataDraftRow).rowId : String((row as Record<string, unknown>).id)
    const originalValues = isDraft ? null : getRowValues(row as Record<string, unknown>)
    const values = isDraft
      ? (row as EntityDataDraftRow).values
      : (editedRows.get(rowId) ?? originalValues ?? createEmptyEntityDataEditValues(editableColumns))
    const value = values[column.fieldName]
    return (
      <EntityDataTableCell
        column={column}
        value={value}
        originalValue={originalValues?.[column.fieldName] ?? null}
        isDraft={isDraft}
        options={optionsByColumn[column.fieldName]}
        loading={loadingByColumn[column.fieldName] === true}
        optionError={errorByColumn[column.fieldName]}
        onChange={nextValue =>
          isDraft
            ? updateDraftValue(rowId, column.fieldName, nextValue)
            : updatePersistedValue(row as Record<string, unknown>, column.fieldName, nextValue)
        }
        data-testid={`${testId}-edit-${column.fieldName}`}
      />
    )
  }

  return (
    <div className="gba:flex gba:min-h-0 gba:flex-1 gba:flex-col gba:gap-3" data-testid={testId}>
      <EntityDataTableToolbar
        rowCount={rows.length}
        loading={loading}
        mutating={mutating}
        onRefresh={refetch}
        onAddRow={startCreate}
        testId={testId}
      />

      {error && (
        <Alert variant="destructive" data-testid={`${testId}-error`}>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {mutationError && (
        <Alert variant="destructive" data-testid={`${testId}-mutation-error`}>
          <AlertDescription>{mutationError}</AlertDescription>
        </Alert>
      )}

      <div className="gba:min-h-0 gba:flex-1 gba:overflow-auto gba:rounded-md gba:border gba:bg-background">
        <Table className="gba:w-max gba:table-fixed">
          <colgroup>
            <col className="gba:w-16" />
            {editableColumns.map(column => (
              <col key={column.fieldName} className={getEntityDataColumnWidth(column)} />
            ))}
            <col className="gba:w-20" />
          </colgroup>
          <TableHeader>
            <TableRow>
              {tableHeadings.map(column => (
                <TableHead key={column.id} className="gba:h-8 gba:whitespace-nowrap gba:px-1.5 gba:text-xs">
                  {column.label}
                </TableHead>
              ))}
              <TableHead className="gba:h-8 gba:px-1.5 gba:text-xs">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <EntityDataTableBody
            rows={rows}
            draftRows={draftRows}
            editableColumns={editableColumns}
            editedRows={editedRows}
            loading={loading}
            mutating={mutating}
            columnCount={columnCount}
            renderDataCell={renderDataCell}
            onSaveRow={saveRow}
            onDiscardRow={discardRow}
            onDeleteRow={handleDelete}
            testId={testId}
          />
        </Table>
      </div>
    </div>
  )
}
