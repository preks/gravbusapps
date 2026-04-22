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
  SelectValue,
  useTranslation
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
  Plus
} from 'lucide-react'
import type { SpreadsheetColumn, ColumnType, SelectOption, ColumnValidation } from '../types'
import translations from '../_i18n'

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

const COLUMN_TYPES: ColumnType[] = [
  'text',
  'number',
  'currency',
  'percentage',
  'date',
  'datetime',
  'email',
  'phone',
  'url',
  'select',
  'multiselect',
  'boolean',
  'calculated',
  'reference'
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
  const { t } = useTranslation(translations)
  const [column, setColumn] = useState<SpreadsheetColumn>(initialColumn)
  const [newOption, setNewOption] = useState('')
  const getColumnTypeLabel = useCallback((type: ColumnType) => t(`manage-columns-type-${type}`), [t])

  const TypeIcon = getTypeIcon(column.type)

  /**
   * Update column property
   */
  const updateColumn = useCallback(<K extends keyof SpreadsheetColumn>(key: K, value: SpreadsheetColumn[K]) => {
    setColumn(prev => ({ ...prev, [key]: value }))
  }, [])

  /**
   * Update validation property
   */
  const updateValidation = useCallback(<K extends keyof ColumnValidation>(key: K, value: ColumnValidation[K]) => {
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
              <h3 className="gba:font-semibold gba:text-foreground">{t('column-type-edit-column')}</h3>
              <p className="gba:text-sm gba:text-muted-foreground">{column.name}</p>
            </div>
          </div>
          <Badge variant="outline" className="gba:capitalize">
            {getColumnTypeLabel(column.type)}
          </Badge>
        </div>

        {/* Basic Settings */}
        <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
          <div className="gba:space-y-2">
            <Label htmlFor="label">{t('column-type-display-label')}</Label>
            <Input
              id="label"
              value={column.label}
              onChange={e => updateColumn('label', e.target.value)}
              placeholder={t('column-type-column-label-placeholder')}
            />
          </div>

          <div className="gba:space-y-2">
            <Label htmlFor="type">{t('column-type-column-type')}</Label>
            <Select value={column.type} onValueChange={(value: ColumnType) => updateColumn('type', value)}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLUMN_TYPES.map(type => {
                  const Icon = getTypeIcon(type)
                  return (
                    <SelectItem key={type} value={type}>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Icon className="gba:w-4 gba:h-4" />
                        {getColumnTypeLabel(type)}
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
            <Label htmlFor="visible" className="gba:text-sm">
              {t('manage-columns-visible')}
            </Label>
            <Switch
              id="visible"
              checked={column.isVisible}
              onCheckedChange={checked => updateColumn('isVisible', checked)}
            />
          </div>
          <div className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:bg-muted/30 gba:rounded-lg">
            <Label htmlFor="editable" className="gba:text-sm">
              {t('column-type-editable')}
            </Label>
            <Switch
              id="editable"
              checked={column.isEditable}
              onCheckedChange={checked => updateColumn('isEditable', checked)}
            />
          </div>
          <div className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:bg-muted/30 gba:rounded-lg">
            <Label htmlFor="required" className="gba:text-sm">
              {t('settings-required-header')}
            </Label>
            <Switch
              id="required"
              checked={column.isRequired}
              onCheckedChange={checked => updateColumn('isRequired', checked)}
            />
          </div>
          <div className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:bg-muted/30 gba:rounded-lg">
            <Label htmlFor="unique" className="gba:text-sm">
              {t('column-type-unique')}
            </Label>
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
            <Label>{t('column-type-options')}</Label>
            <div className="gba:flex gba:gap-2">
              <Input
                value={newOption}
                onChange={e => setNewOption(e.target.value)}
                placeholder={t('column-type-add-option')}
                onKeyDown={e => e.key === 'Enter' && addSelectOption()}
              />
              <Button variant="outline" onClick={addSelectOption}>
                <Plus className="gba:w-4 gba:h-4" />
              </Button>
            </div>
            <div className="gba:flex gba:flex-wrap gba:gap-2">
              {column.selectOptions?.map(option => (
                <Badge key={option.value} variant="secondary" className="gba:pl-3 gba:pr-1 gba:py-1">
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
                <p className="gba:text-sm gba:text-muted-foreground">{t('column-type-no-options')}</p>
              )}
            </div>
          </div>
        )}

        {/* Reference Settings (for reference type) */}
        {column.type === 'reference' && availableSheets.length > 0 && (
          <div className="gba:space-y-3 gba:p-4 gba:bg-muted/30 gba:rounded-lg">
            <Label>{t('column-type-reference-configuration')}</Label>
            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <div className="gba:space-y-2">
                <Label htmlFor="refSheet" className="gba:text-sm">
                  {t('column-type-reference-sheet')}
                </Label>
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
                    <SelectValue placeholder={t('column-type-select-sheet')} />
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
                  <Label htmlFor="refColumn" className="gba:text-sm">
                    {t('column-type-reference-column')}
                  </Label>
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
                      <SelectValue placeholder={t('column-type-select-column')} />
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
            <Label>{t('column-type-validation')}</Label>
            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <div className="gba:space-y-2">
                <Label htmlFor="min" className="gba:text-sm">
                  {t('column-type-minimum-value')}
                </Label>
                <Input
                  id="min"
                  type="number"
                  value={column.validation?.min ?? ''}
                  onChange={e => updateValidation('min', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder={t('column-type-no-minimum')}
                />
              </div>
              <div className="gba:space-y-2">
                <Label htmlFor="max" className="gba:text-sm">
                  {t('column-type-maximum-value')}
                </Label>
                <Input
                  id="max"
                  type="number"
                  value={column.validation?.max ?? ''}
                  onChange={e => updateValidation('max', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder={t('column-type-no-maximum')}
                />
              </div>
            </div>
          </div>
        )}

        {/* Calculated Field Formula (for calculated type) */}
        {column.type === 'calculated' && (
          <div className="gba:space-y-2">
            <Label htmlFor="formula">{t('column-type-formula')}</Label>
            <Input
              id="formula"
              value={column.formula || ''}
              onChange={e => updateColumn('formula', e.target.value)}
              placeholder={t('column-type-formula-placeholder')}
              className="gba:font-mono"
            />
            <p className="gba:text-xs gba:text-muted-foreground">{t('column-type-formula-help')}</p>
          </div>
        )}

        {/* Actions */}
        <div className="gba:flex gba:items-center gba:justify-end gba:gap-3 gba:pt-4 gba:border-t">
          <Button variant="outline" onClick={onCancel}>
            <X className="gba:w-4 gba:h-4 gba:mr-2" />
            {t('checkpoint-cancel')}
          </Button>
          <Button onClick={handleSave}>
            <Save className="gba:w-4 gba:h-4 gba:mr-2" />
            {t('manage-columns-save')}
          </Button>
        </div>
      </div>
    </Card>
  )
}
