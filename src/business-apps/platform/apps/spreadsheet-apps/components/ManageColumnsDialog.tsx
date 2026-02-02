/**
 * ManageColumnsDialog Component
 *
 * Dialog for managing spreadsheet columns: add, edit, delete, reorder.
 */

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Badge,
  Card,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { Columns, Eye, EyeOff, Plus, Save, Trash2 } from 'lucide-react'
import type { SpreadsheetColumn, ColumnType } from '../types'

export interface ManageColumnsDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  columns: SpreadsheetColumn[]
  editingColumns: SpreadsheetColumn[]
  setEditingColumns: React.Dispatch<React.SetStateAction<SpreadsheetColumn[]>>
  onSave: (columns: SpreadsheetColumn[]) => void
  onAddColumn: () => void
  'data-testid'?: string
}

export const ManageColumnsDialog: React.FC<ManageColumnsDialogProps> = ({
  isOpen,
  onOpenChange,
  columns,
  editingColumns,
  setEditingColumns,
  onSave,
  onAddColumn,
  'data-testid': testId = 'manage-columns-dialog'
}) => {
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setEditingColumns(columns.map(c => ({ ...c })))
    } else {
      setEditingColumns([])
    }
    onOpenChange(open)
  }

  const columnsToEdit = editingColumns.length > 0 ? editingColumns : columns.length > 0 ? columns : []

  const updateColumnField = (columnId: string, field: keyof SpreadsheetColumn, value: unknown) => {
    setEditingColumns(prev =>
      prev.length > 0
        ? prev.map(c => (c.id === columnId ? { ...c, [field]: value } : c))
        : columns.map(c => (c.id === columnId ? { ...c, [field]: value } : c))
    )
  }

  const deleteColumn = (columnId: string) => {
    setEditingColumns(prev =>
      prev.length > 0 ? prev.filter(c => c.id !== columnId) : columns.filter(c => c.id !== columnId)
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="gba:max-w-2xl" data-testid={testId}>
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <Columns className="gba:w-5 gba:h-5" />
            Manage Columns
          </DialogTitle>
        </DialogHeader>
        <div className="gba:space-y-3 gba:max-h-[500px] gba:overflow-y-auto">
          {columnsToEdit.length === 0 ? (
            <p className="gba:text-muted-foreground gba:text-center gba:py-4">
              No custom columns. Click "Add Column" to create one.
            </p>
          ) : (
            columnsToEdit.map(column => (
              <Card key={column.id} className="gba:p-4">
                <div className="gba:space-y-4">
                  <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
                    <div className="gba:space-y-2">
                      <Label htmlFor={`column-label-${column.id}`}>Column Name</Label>
                      <Input
                        id={`column-label-${column.id}`}
                        value={column.label}
                        onChange={e => updateColumnField(column.id, 'label', e.target.value)}
                        placeholder="Column name"
                      />
                    </div>
                    <div className="gba:space-y-2">
                      <Label htmlFor={`column-type-${column.id}`}>Data Type</Label>
                      <Select
                        value={column.type}
                        onValueChange={(value: ColumnType) => updateColumnField(column.id, 'type', value)}
                      >
                        <SelectTrigger id={`column-type-${column.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="currency">Currency</SelectItem>
                          <SelectItem value="percentage">Percentage</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                          <SelectItem value="datetime">Date & Time</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="phone">Phone</SelectItem>
                          <SelectItem value="url">URL</SelectItem>
                          <SelectItem value="select">Single Select</SelectItem>
                          <SelectItem value="multiselect">Multi Select</SelectItem>
                          <SelectItem value="boolean">Checkbox</SelectItem>
                          <SelectItem value="calculated">Calculated</SelectItem>
                          <SelectItem value="reference">Reference</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="gba:flex gba:items-center gba:justify-between gba:pt-2 gba:border-t">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Badge variant="secondary" className="gba:text-xs">
                        {column.name}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateColumnField(column.id, 'isVisible', !column.isVisible)}
                        className="gba:text-xs"
                      >
                        {column.isVisible ? (
                          <>
                            <Eye className="gba:w-3 gba:h-3 gba:mr-1" />
                            Visible
                          </>
                        ) : (
                          <>
                            <EyeOff className="gba:w-3 gba:h-3 gba:mr-1" />
                            Hidden
                          </>
                        )}
                      </Button>
                    </div>
                    {columnsToEdit.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteColumn(column.id)}
                        className="gba:text-destructive hover:gba:text-destructive"
                      >
                        <Trash2 className="gba:w-4 gba:h-4 gba:mr-1" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setEditingColumns([])
              onOpenChange(false)
            }}
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
              onAddColumn()
            }}
          >
            <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
            Add Column
          </Button>
          <Button
            onClick={() => {
              const finalColumns = editingColumns.length > 0 ? editingColumns : columns
              onSave(finalColumns)
              setEditingColumns([])
              onOpenChange(false)
            }}
          >
            <Save className="gba:w-4 gba:h-4 gba:mr-2" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
