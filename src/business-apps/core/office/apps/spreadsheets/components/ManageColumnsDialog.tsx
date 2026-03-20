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
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'
import { Columns, Eye, EyeOff, Plus, Save, Trash2 } from 'lucide-react'
import type { SpreadsheetColumn, ColumnType } from '../types'
import translations from '../_i18n'

const COLUMN_TYPE_KEYS: Partial<Record<ColumnType, string>> = {
  text: 'manage-columns-type-text',
  number: 'manage-columns-type-number',
  currency: 'manage-columns-type-currency',
  percentage: 'manage-columns-type-percentage',
  date: 'manage-columns-type-date',
  datetime: 'manage-columns-type-datetime',
  email: 'manage-columns-type-email',
  phone: 'manage-columns-type-phone',
  url: 'manage-columns-type-url',
  select: 'manage-columns-type-select',
  multiselect: 'manage-columns-type-multiselect',
  boolean: 'manage-columns-type-boolean',
  calculated: 'manage-columns-type-calculated',
  reference: 'manage-columns-type-reference'
}

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
  const { t } = useTranslation(translations)

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
            {t('manage-columns-title')}
          </DialogTitle>
        </DialogHeader>
        <div className="gba:space-y-3 gba:max-h-[500px] gba:overflow-y-auto">
          {columnsToEdit.length === 0 ? (
            <p className="gba:text-muted-foreground gba:text-center gba:py-4">{t('manage-columns-empty')}</p>
          ) : (
            columnsToEdit.map(column => (
              <Card key={column.id} className="gba:p-4">
                <div className="gba:space-y-4">
                  <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
                    <div className="gba:space-y-2">
                      <Label htmlFor={`column-label-${column.id}`}>{t('manage-columns-column-name')}</Label>
                      <Input
                        id={`column-label-${column.id}`}
                        value={column.label}
                        onChange={e => updateColumnField(column.id, 'label', e.target.value)}
                        placeholder={t('manage-columns-column-name-placeholder')}
                      />
                    </div>
                    <div className="gba:space-y-2">
                      <Label htmlFor={`column-type-${column.id}`}>{t('manage-columns-data-type')}</Label>
                      <Select
                        value={column.type}
                        onValueChange={(value: ColumnType) => updateColumnField(column.id, 'type', value)}
                      >
                        <SelectTrigger id={`column-type-${column.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(COLUMN_TYPE_KEYS) as ColumnType[]).map(type => (
                            <SelectItem key={type} value={type}>
                              {COLUMN_TYPE_KEYS[type] ? t(COLUMN_TYPE_KEYS[type]) : type}
                            </SelectItem>
                          ))}
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
                            {t('manage-columns-visible')}
                          </>
                        ) : (
                          <>
                            <EyeOff className="gba:w-3 gba:h-3 gba:mr-1" />
                            {t('manage-columns-hidden')}
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
                        {t('manage-columns-delete')}
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
            {t('manage-columns-cancel')}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
              onAddColumn()
            }}
          >
            <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
            {t('manage-columns-add-column')}
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
            {t('manage-columns-save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
