import React, { useState, useCallback } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Input,
  Checkbox,
  Spinner,
  Alert,
  AlertDescription,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Label
} from '@newwork/nw-design-system'
import { Plus, Edit2, Trash2, Save, X, ChevronLeft, ChevronRight, FileSpreadsheet, RefreshCw } from 'lucide-react'
import { SpreadsheetRow, ColumnDefinition, InputType } from '../types'

interface SpreadsheetGridProps {
  columns: ColumnDefinition[]
  rows: SpreadsheetRow[]
  total: number
  isLoading: boolean
  error: string | null
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  onCreate: (values: Record<string, any>) => Promise<void>
  onUpdate: (rowId: string, values: Record<string, any>) => Promise<void>
  onDelete: (rowId: string) => Promise<void>
  onRefresh: () => void
  'data-testid'?: string
}

/**
 * Spreadsheet Grid Component
 * Displays and edits spreadsheet row data with dynamic columns
 */
export const SpreadsheetGrid: React.FC<SpreadsheetGridProps> = ({
  columns,
  rows,
  total,
  isLoading,
  error,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onCreate,
  onUpdate,
  onDelete,
  onRefresh,
  'data-testid': testId = 'spreadsheet-grid'
}) => {
  const [editingRowId, setEditingRowId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, any>>({})
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newRowValues, setNewRowValues] = useState<Record<string, any>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Curried handler to reduce function nesting depth (S2004)
  const createEditValueHandler = useCallback(
    (columnName: string) => (val: any) => {
      setEditValues(prev => ({ ...prev, [columnName]: val }))
    },
    []
  )

  const totalPages = Math.ceil(total / pageSize)
  const startItem = (page - 1) * pageSize + 1
  const endItem = Math.min(page * pageSize, total)

  const formatCellValue = (value: any, column: ColumnDefinition): string => {
    if (value === null || value === undefined) return '-'

    switch (column.type) {
      case InputType.CHECKBOX:
        return value ? 'Yes' : 'No'
      case InputType.DATE:
        return value ? new Date(value).toLocaleDateString() : '-'
      case InputType.DATETIME:
        return value ? new Date(value).toLocaleString() : '-'
      case InputType.MULTISELECT:
        return Array.isArray(value) ? value.join(', ') : String(value)
      default:
        return String(value)
    }
  }

  const renderEditCell = (column: ColumnDefinition, value: any, onChange: (val: any) => void) => {
    switch (column.type) {
      case InputType.CHECKBOX:
        return <Checkbox checked={!!value} onCheckedChange={onChange} data-testid={`${testId}-edit-${column.name}`} />

      case InputType.NUMBER:
        return (
          <Input
            type="number"
            value={value ?? ''}
            onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
            className="gba:h-8 gba:text-sm"
            data-testid={`${testId}-edit-${column.name}`}
          />
        )

      case InputType.DATE:
        return (
          <Input
            type="date"
            value={value ? new Date(value).toISOString().split('T')[0] : ''}
            onChange={e => onChange(e.target.value || null)}
            className="gba:h-8 gba:text-sm"
            data-testid={`${testId}-edit-${column.name}`}
          />
        )

      case InputType.SELECT:
        return (
          <Select value={value || ''} onValueChange={onChange}>
            <SelectTrigger className="gba:h-8" data-testid={`${testId}-edit-${column.name}`}>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {(column.options || []).map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      default:
        return (
          <Input
            value={value ?? ''}
            onChange={e => onChange(e.target.value)}
            className="gba:h-8 gba:text-sm"
            data-testid={`${testId}-edit-${column.name}`}
          />
        )
    }
  }

  const startEdit = useCallback((row: SpreadsheetRow) => {
    setEditingRowId(row.id)
    setEditValues({ ...row.values })
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingRowId(null)
    setEditValues({})
  }, [])

  const saveEdit = useCallback(async () => {
    if (!editingRowId) return
    setIsSaving(true)
    try {
      await onUpdate(editingRowId, editValues)
      setEditingRowId(null)
      setEditValues({})
    } catch (err) {
      console.error('Failed to save row:', err)
    } finally {
      setIsSaving(false)
    }
  }, [editingRowId, editValues, onUpdate])

  const handleCreate = useCallback(async () => {
    setIsSaving(true)
    try {
      await onCreate(newRowValues)
      setIsCreateDialogOpen(false)
      setNewRowValues({})
    } catch (err) {
      console.error('Failed to create row:', err)
    } finally {
      setIsSaving(false)
    }
  }, [newRowValues, onCreate])

  const handleDelete = useCallback(async () => {
    if (!deleteConfirmId) return
    try {
      await onDelete(deleteConfirmId)
      setDeleteConfirmId(null)
    } catch (err) {
      console.error('Failed to delete row:', err)
    }
  }, [deleteConfirmId, onDelete])

  const openCreateDialog = useCallback(() => {
    // Initialize with default values
    const defaults: Record<string, any> = {}
    columns.forEach(col => {
      if (col.type === InputType.CHECKBOX) {
        defaults[col.name] = false
      } else {
        defaults[col.name] = ''
      }
    })
    setNewRowValues(defaults)
    setIsCreateDialogOpen(true)
  }, [columns])

  if (isLoading && rows.length === 0) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:py-16" data-testid={`${testId}-loading`}>
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid={`${testId}-error`}>
        <AlertDescription className="gba:flex gba:items-center gba:justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="gba:h-4 gba:w-4 gba:mr-1" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="gba:space-y-4" data-testid={testId}>
      {/* Toolbar */}
      <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
        <div className="gba:flex gba:items-center gba:gap-2">
          <Button variant="default" size="sm" onClick={openCreateDialog} data-testid={`${testId}-add-row`}>
            <Plus className="gba:h-4 gba:w-4 gba:mr-1" />
            Add Row
          </Button>
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
            <RefreshCw className={`gba:h-4 gba:w-4 gba:mr-1 ${isLoading ? 'gba:animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        <span className="gba:text-sm gba:text-muted-foreground">
          {total > 0 ? `${startItem}-${endItem} of ${total} rows` : 'No rows'}
        </span>
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <div
          className="gba:text-center gba:py-16 gba:text-muted-foreground gba:bg-muted/30 gba:rounded-lg"
          data-testid={`${testId}-empty`}
        >
          <FileSpreadsheet className="gba:h-12 gba:w-12 gba:mx-auto gba:mb-4 gba:opacity-50" />
          <p className="gba:text-lg gba:font-medium">No data yet</p>
          <p className="gba:text-sm gba:mb-4">Add your first row to get started</p>
          <Button variant="outline" onClick={openCreateDialog}>
            <Plus className="gba:h-4 gba:w-4 gba:mr-1" />
            Add Row
          </Button>
        </div>
      ) : (
        <div className="gba:rounded-lg gba:border gba:border-border gba:overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map(col => (
                  <TableHead key={col.name} className="gba:whitespace-nowrap">
                    {col.label}
                    {col.required && <span className="gba:text-destructive gba:ml-1">*</span>}
                  </TableHead>
                ))}
                <TableHead className="gba:w-[100px] gba:text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(row => {
                const isEditing = editingRowId === row.id
                return (
                  <TableRow key={row.id} data-testid={`${testId}-row-${row.id}`}>
                    {columns.map(col => (
                      <TableCell key={col.name} className="gba:py-2">
                        {isEditing ? (
                          renderEditCell(col, editValues[col.name], createEditValueHandler(col.name))
                        ) : (
                          <span className="gba:text-sm">{formatCellValue(row.values[col.name], col)}</span>
                        )}
                      </TableCell>
                    ))}
                    <TableCell className="gba:text-right gba:py-2">
                      <div className="gba:flex gba:justify-end gba:gap-1">
                        {isEditing ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={saveEdit}
                              disabled={isSaving}
                              className="gba:h-7 gba:w-7"
                              data-testid={`${testId}-save-${row.id}`}
                            >
                              {isSaving ? <Spinner size="sm" /> : <Save className="gba:h-4 gba:w-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={cancelEdit}
                              disabled={isSaving}
                              className="gba:h-7 gba:w-7"
                              data-testid={`${testId}-cancel-${row.id}`}
                            >
                              <X className="gba:h-4 gba:w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => startEdit(row)}
                              className="gba:h-7 gba:w-7"
                              data-testid={`${testId}-edit-${row.id}`}
                            >
                              <Edit2 className="gba:h-4 gba:w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteConfirmId(row.id)}
                              className="gba:h-7 gba:w-7 gba:text-destructive gba:hover:text-destructive"
                              data-testid={`${testId}-delete-${row.id}`}
                            >
                              <Trash2 className="gba:h-4 gba:w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="gba:flex gba:items-center gba:justify-between gba:pt-4 gba:border-t gba:border-border">
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:text-sm gba:text-muted-foreground">Rows per page:</span>
            <Select value={String(pageSize)} onValueChange={val => onPageSizeChange(Number(val))}>
              <SelectTrigger className="gba:w-20 gba:h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="gba:flex gba:items-center gba:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              data-testid={`${testId}-prev-page`}
            >
              <ChevronLeft className="gba:h-4 gba:w-4" />
            </Button>
            <span className="gba:text-sm gba:text-muted-foreground gba:px-2">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              data-testid={`${testId}-next-page`}
            >
              <ChevronRight className="gba:h-4 gba:w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="gba:max-w-lg" data-testid={`${testId}-create-dialog`}>
          <DialogHeader>
            <DialogTitle>Add New Row</DialogTitle>
          </DialogHeader>
          <div className="gba:space-y-4 gba:py-4">
            {columns.map(col => (
              <div key={col.name} className="gba:space-y-2">
                <Label>
                  {col.label}
                  {col.required && <span className="gba:text-destructive gba:ml-1">*</span>}
                </Label>
                {renderEditCell(col, newRowValues[col.name], val =>
                  setNewRowValues(prev => ({ ...prev, [col.name]: val }))
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isSaving}>
              {isSaving ? <Spinner size="sm" className="gba:mr-2" /> : <Plus className="gba:h-4 gba:w-4 gba:mr-2" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="gba:max-w-sm" data-testid={`${testId}-delete-dialog`}>
          <DialogHeader>
            <DialogTitle>Delete Row</DialogTitle>
          </DialogHeader>
          <p className="gba:text-muted-foreground">
            Are you sure you want to delete this row? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="gba:h-4 gba:w-4 gba:mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
