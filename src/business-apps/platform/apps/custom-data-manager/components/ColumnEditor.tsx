import React, { useState } from 'react'
import {
  Button,
  Input,
  Checkbox,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@newwork/nw-design-system'
import { Plus, Trash2, GripVertical, Info, Database, ChevronDown, ChevronUp } from 'lucide-react'
import { InputType, InputOption } from '../types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { UiColumnDefinition } from '../utils/columnUiIds'
import { createNewColumn } from '../utils/columnUiIds'

interface ColumnEditorProps {
  columns: UiColumnDefinition[]
  onChange: (columns: UiColumnDefinition[]) => void
  'data-testid'?: string
}

const INPUT_TYPE_OPTIONS: { value: InputType; label: string; description: string }[] = [
  { value: InputType.TEXT, label: 'Text', description: 'Single line text input' },
  { value: InputType.TEXTAREA, label: 'Long Text', description: 'Multi-line text input' },
  { value: InputType.NUMBER, label: 'Number', description: 'Numeric input' },
  { value: InputType.DATE, label: 'Date', description: 'Date picker' },
  { value: InputType.DATETIME, label: 'Date & Time', description: 'Date and time picker' },
  { value: InputType.CHECKBOX, label: 'Checkbox', description: 'Boolean true/false' },
  { value: InputType.SELECT, label: 'Dropdown', description: 'Single selection from options' },
  { value: InputType.MULTISELECT, label: 'Multi-Select', description: 'Multiple selections from options' },
  { value: InputType.FILE, label: 'File', description: 'File attachment' }
]

/**
 * Column Editor component - adapted from flow creator's InputFieldsConfiguration
 * Allows defining columns/fields for custom data definitions
 */
export const ColumnEditor: React.FC<ColumnEditorProps> = ({
  columns,
  onChange,
  'data-testid': testId = 'column-editor'
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [expandedOptions, setExpandedOptions] = useState<Record<number, boolean>>({})

  const handleAddColumn = () => {
    onChange([...columns, createNewColumn(columns.length)])
  }

  const handleUpdateColumn = (index: number, field: keyof UiColumnDefinition, value: any) => {
    const newColumns = [...columns]
    newColumns[index] = { ...newColumns[index], [field]: value }

    // Clear options when changing to non-option types
    if (field === 'type' && ![InputType.SELECT, InputType.MULTISELECT].includes(value)) {
      delete newColumns[index].options
      delete newColumns[index].dataSource
    }

    onChange(newColumns)
  }

  const handleRemoveColumn = (index: number) => {
    const newColumns = columns.filter((_, i) => i !== index)
    onChange(newColumns)
  }

  const handleAddOption = (columnIndex: number) => {
    const newColumns = [...columns]
    const options = newColumns[columnIndex].options || []
    newColumns[columnIndex] = {
      ...newColumns[columnIndex],
      options: [...options, { label: '', value: '' }]
    }
    onChange(newColumns)
  }

  const handleUpdateOption = (columnIndex: number, optionIndex: number, field: keyof InputOption, value: string) => {
    const newColumns = [...columns]
    const options = [...(newColumns[columnIndex].options || [])]
    options[optionIndex] = { ...options[optionIndex], [field]: value }
    newColumns[columnIndex] = { ...newColumns[columnIndex], options }
    onChange(newColumns)
  }

  const handleRemoveOption = (columnIndex: number, optionIndex: number) => {
    const newColumns = [...columns]
    const options = (newColumns[columnIndex].options || []).filter((_, i) => i !== optionIndex)
    newColumns[columnIndex] = { ...newColumns[columnIndex], options }
    onChange(newColumns)
  }

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    e.stopPropagation()

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null)
      return
    }

    const newColumns = [...columns]
    const [draggedItem] = newColumns.splice(draggedIndex, 1)
    newColumns.splice(dropIndex, 0, draggedItem)

    onChange(newColumns)
    setDraggedIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const toggleDataSource = (columnIndex: number, enabled: boolean) => {
    const newColumns = [...columns]
    if (enabled) {
      newColumns[columnIndex] = {
        ...newColumns[columnIndex],
        dataSource: {
          type: 'CATALOG',
          catalog: '',
          valueField: 'value',
          labelField: 'value'
        }
      }
      delete newColumns[columnIndex].options
    } else {
      delete newColumns[columnIndex].dataSource
    }
    onChange(newColumns)
  }

  const toggleOptions = (index: number) => {
    setExpandedOptions(prev => ({ ...prev, [index]: !prev[index] }))
  }

  return (
    <div className="gba:space-y-4" data-testid={testId}>
      {/* Header */}
      <div className="gba:flex gba:items-center gba:justify-between">
        <div>
          <h3 className="gba:text-sm gba:font-medium gba:text-foreground">
            {getTranslationFromI18nKeyAndLabel('customData.columns', 'Columns')}
          </h3>
          <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
            {columns.length === 0 ? 'No columns defined' : `${columns.length} column(s) defined`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleAddColumn} data-testid={`${testId}-add-column`}>
          <Plus className="gba:h-4 gba:w-4 gba:mr-1" />
          Add Column
        </Button>
      </div>

      {/* Column List */}
      <div className="gba:space-y-3">
        {columns.map((column, index) => {
          const isDragging = draggedIndex === index
          const isOptionType = [InputType.SELECT, InputType.MULTISELECT].includes(column.type)
          const hasDataSource = !!column.dataSource
          const optionsExpanded = expandedOptions[index]

          return (
            <article
              key={column.uiId}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={handleDragOver}
              onDrop={e => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={`gba:p-4 gba:border gba:rounded-lg gba:space-y-3 ${
                isDragging ? 'gba:opacity-50 gba:bg-muted' : 'gba:bg-card'
              }`}
              data-testid={`${testId}-column-${index}`}
              aria-label={`Column ${column.label || column.name}`}
            >
              {/* Main Row */}
              <div className="gba:flex gba:gap-3 gba:items-start">
                {/* Drag Handle */}
                <div className="gba:cursor-grab gba:active:cursor-grabbing gba:text-muted-foreground gba:hover:text-foreground gba:pt-2">
                  <GripVertical className="gba:h-5 gba:w-5" />
                </div>

                {/* Column Fields */}
                <div className="gba:flex-1 gba:grid gba:grid-cols-1 gba:md:grid-cols-4 gba:gap-3">
                  {/* Label */}
                  <div className="gba:space-y-1">
                    <Label htmlFor={`${testId}-label-${index}`} className="gba:text-xs">
                      Label
                    </Label>
                    <Input
                      id={`${testId}-label-${index}`}
                      value={column.label || ''}
                      onChange={e => handleUpdateColumn(index, 'label', e.target.value)}
                      placeholder="Display label"
                      data-testid={`${testId}-label-${index}`}
                    />
                  </div>

                  {/* Name (Key) */}
                  <div className="gba:space-y-1">
                    <Label htmlFor={`${testId}-name-${index}`} className="gba:text-xs">
                      Key
                    </Label>
                    <Input
                      id={`${testId}-name-${index}`}
                      value={column.name || ''}
                      onChange={e =>
                        handleUpdateColumn(index, 'name', e.target.value.replaceAll(/\s/g, '_').toLowerCase())
                      }
                      placeholder="field_name"
                      className="gba:font-mono"
                      data-testid={`${testId}-name-${index}`}
                    />
                  </div>

                  {/* Type */}
                  <div className="gba:space-y-1">
                    <Label htmlFor={`${testId}-type-${index}`} className="gba:text-xs">
                      Type
                    </Label>
                    <Select
                      value={column.type}
                      onValueChange={value => handleUpdateColumn(index, 'type', value as InputType)}
                    >
                      <SelectTrigger data-testid={`${testId}-type-${index}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INPUT_TYPE_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Required + Actions */}
                  <div className="gba:flex gba:items-end gba:gap-2">
                    <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1">
                      <Checkbox
                        id={`${testId}-required-${index}`}
                        checked={column.required || false}
                        onCheckedChange={checked => handleUpdateColumn(index, 'required', checked)}
                        data-testid={`${testId}-required-${index}`}
                      />
                      <Label htmlFor={`${testId}-required-${index}`} className="gba:text-xs gba:cursor-pointer">
                        Required
                      </Label>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveColumn(index)}
                      className="gba:text-destructive gba:hover:text-destructive"
                      data-testid={`${testId}-remove-${index}`}
                    >
                      <Trash2 className="gba:h-4 gba:w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Options for SELECT/MULTISELECT */}
              {isOptionType && (
                <div className="gba:pl-8 gba:space-y-3 gba:border-l-2 gba:border-info gba:ml-2">
                  {/* Data Source Toggle */}
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <Checkbox
                      id={`${testId}-datasource-${index}`}
                      checked={hasDataSource}
                      onCheckedChange={checked => toggleDataSource(index, checked as boolean)}
                      data-testid={`${testId}-datasource-${index}`}
                    />
                    <Database className="gba:h-4 gba:w-4 gba:text-info" />
                    <Label htmlFor={`${testId}-datasource-${index}`} className="gba:text-xs gba:cursor-pointer">
                      Use Catalog Data Source
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="gba:text-xs gba:max-w-xs">
                            Automatically populate options from a catalog. Options stay up-to-date without schema
                            changes.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  {hasDataSource ? (
                    /* Catalog Data Source Config */
                    <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-3">
                      <div className="gba:space-y-1">
                        <Label className="gba:text-xs">Catalog ID</Label>
                        <Input
                          value={column.dataSource?.catalog || ''}
                          onChange={e =>
                            handleUpdateColumn(index, 'dataSource', {
                              ...column.dataSource,
                              catalog: e.target.value
                            })
                          }
                          placeholder="catalog_id"
                          data-testid={`${testId}-catalog-${index}`}
                        />
                      </div>
                      <div className="gba:space-y-1">
                        <Label className="gba:text-xs">Value Field</Label>
                        <Input
                          value={column.dataSource?.valueField || 'value'}
                          onChange={e =>
                            handleUpdateColumn(index, 'dataSource', {
                              ...column.dataSource,
                              valueField: e.target.value
                            })
                          }
                          placeholder="value"
                          data-testid={`${testId}-value-field-${index}`}
                        />
                      </div>
                      <div className="gba:space-y-1">
                        <Label className="gba:text-xs">Label Field</Label>
                        <Input
                          value={column.dataSource?.labelField || 'value'}
                          onChange={e =>
                            handleUpdateColumn(index, 'dataSource', {
                              ...column.dataSource,
                              labelField: e.target.value
                            })
                          }
                          placeholder="value"
                          data-testid={`${testId}-label-field-${index}`}
                        />
                      </div>
                    </div>
                  ) : (
                    /* Manual Options */
                    <div className="gba:space-y-2">
                      <div className="gba:flex gba:items-center gba:justify-between">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleOptions(index)}
                          className="gba:text-xs gba:h-7"
                        >
                          {optionsExpanded ? (
                            <ChevronUp className="gba:h-3 gba:w-3 gba:mr-1" />
                          ) : (
                            <ChevronDown className="gba:h-3 gba:w-3 gba:mr-1" />
                          )}
                          {column.options?.length || 0} Options
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddOption(index)}
                          className="gba:text-xs gba:h-7"
                          data-testid={`${testId}-add-option-${index}`}
                        >
                          <Plus className="gba:h-3 gba:w-3 gba:mr-1" />
                          Add Option
                        </Button>
                      </div>

                      {optionsExpanded && (column.options || []).length > 0 && (
                        <div className="gba:space-y-2">
                          <div className="gba:grid gba:grid-cols-[1fr_1fr_auto] gba:gap-2 gba:text-xs gba:text-muted-foreground gba:px-1">
                            <span>Label</span>
                            <span>Value</span>
                            <span></span>
                          </div>
                          {(column.options || []).map((option, optIndex) => (
                            <div
                              key={`option-${index}-${optIndex}`}
                              className="gba:grid gba:grid-cols-[1fr_1fr_auto] gba:gap-2 gba:items-center"
                            >
                              <Input
                                value={option.label || ''}
                                onChange={e => handleUpdateOption(index, optIndex, 'label', e.target.value)}
                                placeholder="Display text"
                                className="gba:h-8 gba:text-sm"
                                data-testid={`${testId}-option-label-${index}-${optIndex}`}
                              />
                              <Input
                                value={option.value || ''}
                                onChange={e => handleUpdateOption(index, optIndex, 'value', e.target.value)}
                                placeholder="Stored value"
                                className="gba:h-8 gba:text-sm gba:font-mono"
                                data-testid={`${testId}-option-value-${index}-${optIndex}`}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="gba:h-8 gba:w-8"
                                onClick={() => handleRemoveOption(index, optIndex)}
                                data-testid={`${testId}-remove-option-${index}-${optIndex}`}
                              >
                                <Trash2 className="gba:h-3 gba:w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </article>
          )
        })}
      </div>

      {/* Empty State */}
      {columns.length === 0 && (
        <div
          className="gba:text-center gba:py-12 gba:border-2 gba:border-dashed gba:border-border gba:rounded-lg"
          data-testid={`${testId}-empty`}
        >
          <Database className="gba:h-8 gba:w-8 gba:mx-auto gba:mb-3 gba:text-muted-foreground" />
          <p className="gba:text-sm gba:text-muted-foreground gba:mb-3">No columns defined yet</p>
          <Button variant="outline" size="sm" onClick={handleAddColumn}>
            <Plus className="gba:h-4 gba:w-4 gba:mr-1" />
            Add Your First Column
          </Button>
        </div>
      )}
    </div>
  )
}
