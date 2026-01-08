/**
 * ColumnTypeEditor Component
 *
 * Allows users to override AI-detected column types and configure
 * column properties like validation, display options, and references.
 */

import React, { useState, useCallback } from 'react'
import {
  Card,
  Button,
  Input,
  Label,
  Badge,
  Switch,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import {
  Type,
  Hash,
  Calendar,
  Mail,
  Phone,
  Link,
  List,
  CheckSquare,
  Calculator,
  Link2,
  Save,
  X,
  Plus,
  Trash2
} from 'lucide-react'
import type { SpreadsheetColumn, ColumnType, SelectOption, ColumnValidation } from '../types'

export interface ColumnTypeEditorProps {
  column: SpreadsheetColumn
  availableSheets?: Array<{ id: string; name: string; columns: Array<{ id: string; name: string }> }>
  onSave: (column: SpreadsheetColumn) => void
  onCancel: () => void
  'data-testid'?: string
}

/**
 * Get icon for column type
 */
function getTypeIcon(type: ColumnType) {
  switch (type) {
    case 'text':
      return Type
    case 'number':
    case 'currency':
    case 'percentage':
      return Hash
    case 'date':
    case 'datetime':
      return Calendar
    case 'email':
      return Mail
    case 'phone':
      return Phone
    case 'url':
      return Link
    case 'select':
    case 'multiselect':
      return List
    case 'boolean':
      return CheckSquare
    case 'calculated':
      return Calculator
    case 'reference':
      return Link2
    default:
      return Type
  }
}

const COLUMN_TYPES: Array<{ value: ColumnType; label: string }> = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'currency', label: 'Currency' },
  { value: 'percentage', label: 'Percentage' },
  { value: 'date', label: 'Date' },
  { value: 'datetime', label: 'Date & Time' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'url', label: 'URL' },
  { value: 'select', label: 'Single Select' },
  { value: 'multiselect', label: 'Multi Select' },
  { value: 'boolean', label: 'Checkbox' },
  { value: 'calculated', label: 'Calculated' },
  { value: 'reference', label: 'Reference' }
]

/**
 * ColumnTypeEditor Component
 */
export const ColumnTypeEditor: React.FC<ColumnTypeEditorProps> = ({
  column: initialColumn,
  availableSheets = [],
  onSave,
  onCancel,
  'data-testid': testId = 'column-type-editor'
}) => {
  const [column, setColumn] = useState<SpreadsheetColumn>(initialColumn)
  const [newOption, setNewOption] = useState('')

  const TypeIcon = getTypeIcon(column.type)

  /**
   * Update column property
   */
  const updateColumn = useCallback(<K extends keyof SpreadsheetColumn>(
    key: K,
    value: SpreadsheetColumn[K]
  ) => {
    setColumn(prev => ({ ...prev, [key]: value }))
  }, [])

  /**
   * Update validation property
   */
  const updateValidation = useCallback(<K extends keyof ColumnValidation>(
    key: K,
    value: ColumnValidation[K]
  ) => {
    setColumn(prev => ({
      ...prev,
      validation: {
        ...prev.validation,
        [key]: value
      }
    }))
  }, [])

  /**
   * Add select option
   */
  const addSelectOption = useCallback(() => {
    if (!newOption.trim()) return

    const option: SelectOption = {
      value: newOption.trim().toLowerCase().replace(/\s+/g, '_'),
      label: newOption.trim()
    }

    setColumn(prev => ({
      ...prev,
      selectOptions: [...(prev.selectOptions || []), option]
    }))
    setNewOption('')
  }, [newOption])

  /**
   * Remove select option
   */
  const removeSelectOption = useCallback((value: string) => {
    setColumn(prev => ({
      ...prev,
      selectOptions: prev.selectOptions?.filter(o => o.value !== value)
    }))
  }, [])

  /**
   * Handle save
   */
  const handleSave = useCallback(() => {
    onSave(column)
  }, [column, onSave])

  return (
    <Card className="gba:p-6" data-testid={testId}>
      <div className="gba:space-y-6">
        {/* Header */}
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:w-10 gba:h-10 gba:rounded-lg gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
              <TypeIcon className="gba:w-5 gba:h-5 gba:text-primary" />
            </div>
            <div>
              <h3 className="gba:font-semibold gba:text-foreground">Edit Column</h3>
              <p className="gba:text-sm gba:text-muted-foreground">{column.name}</p>
            </div>
          </div>
          <Badge variant="outline" className="gba:capitalize">
            {column.type}
          </Badge>
        </div>

        {/* Basic Settings */}
        <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
          <div className="gba:space-y-2">
            <Label htmlFor="label">Display Label</Label>
            <Input
              id="label"
              value={column.label}
              onChange={e => updateColumn('label', e.target.value)}
              placeholder="Column label"
            />
          </div>

          <div className="gba:space-y-2">
            <Label htmlFor="type">Column Type</Label>
            <Select
              value={column.type}
              onValueChange={(value: ColumnType) => updateColumn('type', value)}
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLUMN_TYPES.map(type => {
                  const Icon = getTypeIcon(type.value)
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Icon className="gba:w-4 gba:h-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Toggle Options */}
        <div className="gba:grid gba:grid-cols-2 gba:md:grid-cols-4 gba:gap-4">
          <div className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:bg-muted/30 gba:rounded-lg">
            <Label htmlFor="visible" className="gba:text-sm">Visible</Label>
            <Switch
              id="visible"
              checked={column.isVisible}
              onCheckedChange={checked => updateColumn('isVisible', checked)}
            />
          </div>
          <div className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:bg-muted/30 gba:rounded-lg">
            <Label htmlFor="editable" className="gba:text-sm">Editable</Label>
            <Switch
              id="editable"
              checked={column.isEditable}
              onCheckedChange={checked => updateColumn('isEditable', checked)}
            />
          </div>
          <div className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:bg-muted/30 gba:rounded-lg">
            <Label htmlFor="required" className="gba:text-sm">Required</Label>
            <Switch
              id="required"
              checked={column.isRequired}
              onCheckedChange={checked => updateColumn('isRequired', checked)}
            />
          </div>
          <div className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:bg-muted/30 gba:rounded-lg">
            <Label htmlFor="unique" className="gba:text-sm">Unique</Label>
            <Switch
              id="unique"
              checked={column.isUnique}
              onCheckedChange={checked => updateColumn('isUnique', checked)}
            />
          </div>
        </div>

        {/* Select Options (for select/multiselect types) */}
        {(column.type === 'select' || column.type === 'multiselect') && (
          <div className="gba:space-y-3">
            <Label>Options</Label>
            <div className="gba:flex gba:gap-2">
              <Input
                value={newOption}
                onChange={e => setNewOption(e.target.value)}
                placeholder="Add new option"
                onKeyDown={e => e.key === 'Enter' && addSelectOption()}
              />
              <Button variant="outline" onClick={addSelectOption}>
                <Plus className="gba:w-4 gba:h-4" />
              </Button>
            </div>
            <div className="gba:flex gba:flex-wrap gba:gap-2">
              {column.selectOptions?.map(option => (
                <Badge
                  key={option.value}
                  variant="secondary"
                  className="gba:pl-3 gba:pr-1 gba:py-1"
                >
                  {option.label}
                  <button
                    type="button"
                    className="gba:ml-2 gba:p-0.5 gba:rounded-full gba:hover:bg-destructive/20"
                    onClick={() => removeSelectOption(option.value)}
                  >
                    <X className="gba:w-3 gba:h-3" />
                  </button>
                </Badge>
              ))}
              {(!column.selectOptions || column.selectOptions.length === 0) && (
                <p className="gba:text-sm gba:text-muted-foreground">No options defined</p>
              )}
            </div>
          </div>
        )}

        {/* Reference Settings (for reference type) */}
        {column.type === 'reference' && availableSheets.length > 0 && (
          <div className="gba:space-y-3 gba:p-4 gba:bg-muted/30 gba:rounded-lg">
            <Label>Reference Configuration</Label>
            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <div className="gba:space-y-2">
                <Label htmlFor="refSheet" className="gba:text-sm">Reference Sheet</Label>
                <Select
                  value={column.referenceTo?.sheetId || ''}
                  onValueChange={(value: string) =>
                    updateColumn('referenceTo', {
                      ...column.referenceTo,
                      sheetId: value,
                      columnId: ''
                    })
                  }
                >
                  <SelectTrigger id="refSheet">
                    <SelectValue placeholder="Select sheet" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSheets.map(sheet => (
                      <SelectItem key={sheet.id} value={sheet.id}>
                        {sheet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {column.referenceTo?.sheetId && (
                <div className="gba:space-y-2">
                  <Label htmlFor="refColumn" className="gba:text-sm">Reference Column</Label>
                  <Select
                    value={column.referenceTo?.columnId || ''}
                    onValueChange={(value: string) =>
                      updateColumn('referenceTo', {
                        ...column.referenceTo!,
                        columnId: value
                      })
                    }
                  >
                    <SelectTrigger id="refColumn">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSheets
                        .find(s => s.id === column.referenceTo?.sheetId)
                        ?.columns.map(col => (
                          <SelectItem key={col.id} value={col.id}>
                            {col.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Validation Settings (for number types) */}
        {(column.type === 'number' || column.type === 'currency' || column.type === 'percentage') && (
          <div className="gba:space-y-3 gba:p-4 gba:bg-muted/30 gba:rounded-lg">
            <Label>Validation</Label>
            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <div className="gba:space-y-2">
                <Label htmlFor="min" className="gba:text-sm">Minimum Value</Label>
                <Input
                  id="min"
                  type="number"
                  value={column.validation?.min ?? ''}
                  onChange={e =>
                    updateValidation('min', e.target.value ? Number(e.target.value) : undefined)
                  }
                  placeholder="No minimum"
                />
              </div>
              <div className="gba:space-y-2">
                <Label htmlFor="max" className="gba:text-sm">Maximum Value</Label>
                <Input
                  id="max"
                  type="number"
                  value={column.validation?.max ?? ''}
                  onChange={e =>
                    updateValidation('max', e.target.value ? Number(e.target.value) : undefined)
                  }
                  placeholder="No maximum"
                />
              </div>
            </div>
          </div>
        )}

        {/* Calculated Field Formula (for calculated type) */}
        {column.type === 'calculated' && (
          <div className="gba:space-y-2">
            <Label htmlFor="formula">Formula</Label>
            <Input
              id="formula"
              value={column.formula || ''}
              onChange={e => updateColumn('formula', e.target.value)}
              placeholder="e.g., =price * quantity"
              className="gba:font-mono"
            />
            <p className="gba:text-xs gba:text-muted-foreground">
              Use column names to reference other fields. Basic arithmetic operations are supported.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="gba:flex gba:items-center gba:justify-end gba:gap-3 gba:pt-4 gba:border-t">
          <Button variant="outline" onClick={onCancel}>
            <X className="gba:w-4 gba:h-4 gba:mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="gba:w-4 gba:h-4 gba:mr-2" />
            Save Changes
          </Button>
        </div>
      </div>
    </Card>
  )
}
