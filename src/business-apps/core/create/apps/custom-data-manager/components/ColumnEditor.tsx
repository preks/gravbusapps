import React, { useMemo, useState } from 'react'
import {
  Button,
  Combobox,
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
import { Plus, GripVertical, Info, Database, ChevronDown, ChevronUp } from 'lucide-react'
import { TrashIcon } from '@phosphor-icons/react'
import { InputType, InputOption } from '../types'
import { useInternalEntityTypes } from '../hooks/useInternalEntityTypes'
import type { UiColumnDefinition } from '../utils/columnUiIds'
import { createNewColumn } from '../utils/columnUiIds'
import {
  getColumnNameValidationError,
  isEntityReferenceColumn,
  syncColumnNameWithLabel
} from '../utils/definitionFormUtils'

interface CustomEntityOption {
  namespace: string
  entityName: string
  displayName?: string
}

interface ColumnEditorProps {
  columns: UiColumnDefinition[]
  onChange: (columns: UiColumnDefinition[]) => void
  accessToken: string
  currentNamespace: string
  availableNamespaces?: string[]
  customEntityOptions?: CustomEntityOption[]
  showTechnicalFieldNames?: boolean
  'data-testid'?: string
}

const INPUT_TYPE_OPTIONS: { value: InputType; label: string }[] = [
  { value: InputType.TEXT, label: 'Text' },
  { value: InputType.TEXTAREA, label: 'Long Text' },
  { value: InputType.NUMBER, label: 'Number' },
  { value: InputType.DATE, label: 'Date' },
  { value: InputType.DATETIME, label: 'Date & Time' },
  { value: InputType.CHECKBOX, label: 'Checkbox' },
  { value: InputType.SELECT, label: 'Dropdown' },
  { value: InputType.MULTISELECT, label: 'Multi-Select' },
  { value: InputType.FILE, label: 'File' }
]

export const ColumnEditor: React.FC<ColumnEditorProps> = ({
  columns,
  onChange,
  accessToken,
  currentNamespace,
  availableNamespaces = [],
  customEntityOptions = [],
  showTechnicalFieldNames = false,
  'data-testid': testId = 'column-editor'
}) => {
  const { internalEntityTypes } = useInternalEntityTypes(accessToken)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [expandedCards, setExpandedCards] = useState<Record<number, boolean>>({})
  const [expandedOptions, setExpandedOptions] = useState<Record<number, boolean>>({})

  const internalEntityOptions = useMemo(
    () => internalEntityTypes.map(entity => ({ value: entity.name, label: entity.displayName || entity.name })),
    [internalEntityTypes]
  )

  const customEntityComboboxOptions = useMemo(
    () =>
      customEntityOptions.map(entity => ({
        namespace: entity.namespace || 'default',
        value: entity.entityName,
        label: entity.displayName || entity.entityName
      })),
    [customEntityOptions]
  )

  const selectableNamespaces = useMemo(
    () =>
      Array.from(
        new Set([
          currentNamespace,
          ...availableNamespaces,
          ...customEntityOptions.map(entity => entity.namespace || 'default')
        ])
      )
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right)),
    [availableNamespaces, currentNamespace, customEntityOptions]
  )

  const handleAddColumn = () => {
    const newIndex = columns.length
    onChange([...columns, createNewColumn(newIndex)])
    setExpandedCards(prev => ({ ...prev, [newIndex]: true }))
  }

  const handleUpdateColumn = (index: number, field: keyof UiColumnDefinition, value: any) => {
    const newColumns = [...columns]
    let updatedColumn = { ...newColumns[index], [field]: value }

    if (field === 'type' && ![InputType.SELECT, InputType.MULTISELECT].includes(value)) {
      delete updatedColumn.options
      delete updatedColumn.dataSource
    }

    if (field === 'label' || field === 'type' || field === 'dataSource') {
      updatedColumn = syncColumnNameWithLabel(updatedColumn)
    }

    newColumns[index] = updatedColumn

    onChange(newColumns)
  }

  const handleRemoveColumn = (index: number) => {
    onChange(columns.filter((_, i) => i !== index))
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

  const handleDragStart = (index: number) => setDraggedIndex(index)
  const handleDragOver = (e: React.DragEvent) => e.preventDefault()
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
  const handleDragEnd = () => setDraggedIndex(null)

  const toggleDataSource = (columnIndex: number, enabled: boolean) => {
    const newColumns = [...columns]
    if (enabled) {
      newColumns[columnIndex] = {
        ...newColumns[columnIndex],
        dataSource: { type: 'CATALOG', catalog: '', valueField: 'value', labelField: 'value' }
      }
      delete newColumns[columnIndex].options
    } else {
      delete newColumns[columnIndex].dataSource
    }
    newColumns[columnIndex] = syncColumnNameWithLabel(newColumns[columnIndex])
    onChange(newColumns)
  }

  const setDataSourceType = (columnIndex: number, dsType: 'CATALOG' | 'CUSTOM_ENTITY' | 'INTERNAL_ENTITY') => {
    const newColumns = [...columns]
    if (dsType === 'INTERNAL_ENTITY') {
      newColumns[columnIndex] = { ...newColumns[columnIndex], dataSource: { type: 'INTERNAL_ENTITY', entity: '' } }
    } else if (dsType === 'CUSTOM_ENTITY') {
      newColumns[columnIndex] = {
        ...newColumns[columnIndex],
        dataSource: { type: 'CUSTOM_ENTITY', entity: '', namespace: currentNamespace }
      }
    } else {
      newColumns[columnIndex] = {
        ...newColumns[columnIndex],
        dataSource: { type: 'CATALOG', catalog: '', valueField: 'value', labelField: 'value' }
      }
    }
    delete newColumns[columnIndex].options
    newColumns[columnIndex] = syncColumnNameWithLabel(newColumns[columnIndex])
    onChange(newColumns)
  }

  const toggleCard = (index: number) => {
    setExpandedCards(prev => ({ ...prev, [index]: !prev[index] }))
  }

  const toggleOptions = (index: number) => {
    setExpandedOptions(prev => ({ ...prev, [index]: !prev[index] }))
  }

  const typeLabel = (type: InputType) => INPUT_TYPE_OPTIONS.find(o => o.value === type)?.label ?? type

  return (
    <div className="gba:space-y-2" data-testid={testId}>
      {/* Header */}
      <div className="gba:flex gba:items-center gba:justify-between">
        <span className="gba:text-xs gba:text-muted-foreground">
          {columns.length === 0 ? 'No columns' : `${columns.length} column(s)`}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddColumn}
          data-testid={`${testId}-add-column`}
          className="gba:h-7 gba:text-xs"
        >
          <Plus className="gba:h-3 gba:w-3 gba:mr-1" />
          Add Column
        </Button>
      </div>

      {/* Column Cards */}
      <div className="gba:space-y-2">
        {columns.map((column, index) => {
          const isDragging = draggedIndex === index
          const isExpanded = expandedCards[index] ?? false
          const isOptionType = [InputType.SELECT, InputType.MULTISELECT].includes(column.type)
          const hasDataSource = !!column.dataSource
          const optionsExpanded = expandedOptions[index]
          const isReferenceColumn = isEntityReferenceColumn(column)
          const columnNameValidationError = getColumnNameValidationError(column, index)

          return (
            <article
              key={column.uiId}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={handleDragOver}
              onDrop={e => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={`gba:border gba:rounded-lg gba:overflow-hidden ${isDragging ? 'gba:opacity-50 gba:bg-muted' : 'gba:bg-card'}`}
              data-testid={`${testId}-column-${index}`}
              aria-label={`Column ${column.label || column.fieldName}`}
            >
              {/* Compact header row -- always visible */}
              <div
                className="gba:flex gba:items-center gba:gap-1.5 gba:px-2 gba:py-1.5 gba:cursor-pointer gba:hover:bg-muted/30"
                onClick={() => toggleCard(index)}
              >
                <div
                  className="gba:cursor-grab gba:active:cursor-grabbing gba:text-muted-foreground gba:hover:text-foreground gba:shrink-0"
                  onClick={e => e.stopPropagation()}
                >
                  <GripVertical className="gba:h-3.5 gba:w-3.5" />
                </div>
                <span className="gba:text-xs gba:font-medium gba:truncate gba:flex-1">
                  {column.label || column.fieldName || 'Untitled'}
                </span>
                <span className="gba:text-[10px] gba:text-muted-foreground gba:font-mono gba:shrink-0">
                  {typeLabel(column.type)}
                </span>
                {column.required && <span className="gba:text-[10px] gba:text-destructive gba:shrink-0">*</span>}
                <Button
                  variant="ghost"
                  size="iconSm"
                  onClick={e => {
                    e.stopPropagation()
                    handleRemoveColumn(index)
                  }}
                  className="gba:text-muted-foreground gba:hover:text-destructive gba:h-5 gba:w-5 gba:shrink-0"
                  data-testid={`${testId}-remove-${index}`}
                >
                  <TrashIcon className="gba:h-3 gba:w-3" />
                </Button>
                {isExpanded ? (
                  <ChevronUp className="gba:h-3 gba:w-3 gba:text-muted-foreground gba:shrink-0" />
                ) : (
                  <ChevronDown className="gba:h-3 gba:w-3 gba:text-muted-foreground gba:shrink-0" />
                )}
              </div>
              {showTechnicalFieldNames && (
                <p
                  className="gba:px-2 gba:pb-1 gba:pl-7 gba:font-mono gba:text-[10px] gba:text-muted-foreground"
                  data-testid={`${testId}-field-name-${index}`}
                >
                  Field: {column.fieldName || '-'}
                </p>
              )}

              {/* Expanded detail -- stacked fields */}
              {isExpanded && (
                <div className="gba:px-3 gba:pb-3 gba:pt-1 gba:space-y-2 gba:border-t gba:border-border">
                  <div className="gba:space-y-1">
                    <Label htmlFor={`${testId}-label-${index}`} className="gba:text-[10px]">
                      Label
                    </Label>
                    <Input
                      id={`${testId}-label-${index}`}
                      value={column.label || ''}
                      onChange={e => handleUpdateColumn(index, 'label', e.target.value)}
                      placeholder="Display label"
                      className="gba:h-7 gba:text-xs"
                      data-testid={`${testId}-label-${index}`}
                    />
                    {columnNameValidationError ? (
                      <p className="gba:text-[10px] gba:text-destructive">{columnNameValidationError}</p>
                    ) : isReferenceColumn ? (
                      <p className="gba:text-[10px] gba:text-muted-foreground">
                        Select the target entity; the backend derives writable and relation names.
                      </p>
                    ) : null}
                  </div>

                  <div className="gba:grid gba:grid-cols-2 gba:gap-2 gba:items-end">
                    <div className="gba:space-y-1">
                      <Label className="gba:text-[10px]">Type</Label>
                      <Select
                        value={column.type}
                        onValueChange={value => handleUpdateColumn(index, 'type', value as InputType)}
                      >
                        <SelectTrigger className="gba:h-7 gba:text-xs" data-testid={`${testId}-type-${index}`}>
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
                    <div className="gba:flex gba:items-center gba:gap-2 gba:pb-0.5">
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
                  </div>

                  {/* Data source / options for SELECT/MULTISELECT */}
                  {isOptionType && (
                    <div className="gba:space-y-2 gba:pt-1 gba:border-t gba:border-border">
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Checkbox
                          id={`${testId}-datasource-${index}`}
                          checked={hasDataSource}
                          onCheckedChange={checked => toggleDataSource(index, checked as boolean)}
                          data-testid={`${testId}-datasource-${index}`}
                        />
                        <Database className="gba:h-3 gba:w-3 gba:text-info" />
                        <Label htmlFor={`${testId}-datasource-${index}`} className="gba:text-xs gba:cursor-pointer">
                          Data Source
                        </Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="gba:h-3 gba:w-3 gba:text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="gba:text-xs gba:max-w-xs">
                                Populate options from a catalog, custom entity, or internal entity.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>

                      {hasDataSource ? (
                        <DataSourceConfig
                          column={column}
                          index={index}
                          testId={testId}
                          internalEntityOptions={internalEntityOptions}
                          currentNamespace={currentNamespace}
                          selectableNamespaces={selectableNamespaces}
                          customEntityComboboxOptions={customEntityComboboxOptions}
                          onUpdate={handleUpdateColumn}
                          onSetType={setDataSourceType}
                        />
                      ) : (
                        <ManualOptions
                          column={column}
                          index={index}
                          testId={testId}
                          optionsExpanded={optionsExpanded}
                          onToggle={() => toggleOptions(index)}
                          onAdd={() => handleAddOption(index)}
                          onUpdate={handleUpdateOption}
                          onRemove={handleRemoveOption}
                        />
                      )}
                    </div>
                  )}
                  <div className="gba:flex gba:justify-end gba:border-t gba:border-border gba:pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveColumn(index)}
                      className="gba:h-7 gba:text-xs gba:text-destructive gba:hover:text-destructive"
                      data-testid={`${testId}-remove-expanded-${index}`}
                    >
                      <TrashIcon className="gba:h-3 gba:w-3 gba:mr-1" />
                      Remove column
                    </Button>
                  </div>
                </div>
              )}
            </article>
          )
        })}
      </div>

      {columns.length === 0 && (
        <div
          className="gba:text-center gba:py-8 gba:border-2 gba:border-dashed gba:border-border gba:rounded-lg"
          data-testid={`${testId}-empty`}
        >
          <Database className="gba:h-6 gba:w-6 gba:mx-auto gba:mb-2 gba:text-muted-foreground" />
          <p className="gba:text-xs gba:text-muted-foreground gba:mb-2">No columns defined yet</p>
          <Button variant="outline" size="sm" onClick={handleAddColumn} className="gba:h-7 gba:text-xs">
            <Plus className="gba:h-3 gba:w-3 gba:mr-1" />
            Add Column
          </Button>
        </div>
      )}
    </div>
  )
}

const DataSourceConfig: React.FC<{
  column: UiColumnDefinition
  index: number
  testId: string
  internalEntityOptions: { value: string; label: string }[]
  currentNamespace: string
  selectableNamespaces: string[]
  customEntityComboboxOptions: { namespace: string; value: string; label: string }[]
  onUpdate: (index: number, field: keyof UiColumnDefinition, value: any) => void
  onSetType: (index: number, dsType: 'CATALOG' | 'CUSTOM_ENTITY' | 'INTERNAL_ENTITY') => void
}> = ({
  column,
  index,
  testId,
  internalEntityOptions,
  currentNamespace,
  selectableNamespaces,
  customEntityComboboxOptions,
  onUpdate,
  onSetType
}) => {
  const selectedCustomEntityNamespace =
    column.dataSource?.type === 'CUSTOM_ENTITY' ? column.dataSource.namespace || currentNamespace : currentNamespace
  const filteredCustomEntityOptions = customEntityComboboxOptions.filter(
    option => option.namespace === selectedCustomEntityNamespace
  )

  return (
    <div className="gba:space-y-2">
      <div className="gba:space-y-1">
        <Label className="gba:text-[10px]">Source Type</Label>
        <Select
          value={column.dataSource?.type || 'CATALOG'}
          onValueChange={value => onSetType(index, value as 'CATALOG' | 'CUSTOM_ENTITY' | 'INTERNAL_ENTITY')}
        >
          <SelectTrigger className="gba:h-7 gba:text-xs" data-testid={`${testId}-ds-type-${index}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CATALOG">Catalog</SelectItem>
            <SelectItem value="CUSTOM_ENTITY">Custom Entity</SelectItem>
            <SelectItem value="INTERNAL_ENTITY">Internal Entity</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {column.dataSource?.type === 'INTERNAL_ENTITY' ? (
        <div className="gba:space-y-1">
          <Label className="gba:text-[10px]">Entity Type</Label>
          <Combobox
            options={internalEntityOptions}
            value={column.dataSource?.entity || ''}
            onValueChange={value => onUpdate(index, 'dataSource', { ...column.dataSource, entity: value ?? '' })}
            placeholder="Select entity..."
            searchPlaceholder="Search entities..."
            emptyText="No matching entities"
            data-testid={`${testId}-internal-entity-${index}`}
          />
        </div>
      ) : column.dataSource?.type === 'CUSTOM_ENTITY' ? (
        <div className="gba:space-y-2">
          <div className="gba:space-y-1">
            <Label className="gba:text-[10px]">Custom Entity Namespace</Label>
            <Select
              value={selectedCustomEntityNamespace}
              onValueChange={value =>
                onUpdate(index, 'dataSource', { ...column.dataSource, namespace: value, entity: '' })
              }
            >
              <SelectTrigger className="gba:h-7 gba:text-xs" data-testid={`${testId}-entity-namespace-${index}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {selectableNamespaces.map(namespace => (
                  <SelectItem key={namespace} value={namespace}>
                    {namespace}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="gba:space-y-1">
            <Label className="gba:text-[10px]">Custom Entity</Label>
            <Combobox
              options={filteredCustomEntityOptions}
              value={column.dataSource?.entity || ''}
              onValueChange={value =>
                onUpdate(index, 'dataSource', {
                  ...column.dataSource,
                  namespace: selectedCustomEntityNamespace,
                  entity: value ?? ''
                })
              }
              placeholder="Select entity..."
              searchPlaceholder="Search custom entities..."
              emptyText="No custom entities available"
              data-testid={`${testId}-entity-${index}`}
            />
          </div>
        </div>
      ) : (
        <div className="gba:space-y-2">
          <div className="gba:space-y-1">
            <Label className="gba:text-[10px]">Catalog ID</Label>
            <Input
              value={column.dataSource?.catalog || ''}
              onChange={e => onUpdate(index, 'dataSource', { ...column.dataSource, catalog: e.target.value })}
              placeholder="catalog_id"
              className="gba:h-7 gba:text-xs"
              data-testid={`${testId}-catalog-${index}`}
            />
          </div>
          <div className="gba:grid gba:grid-cols-2 gba:gap-2">
            <div className="gba:space-y-1">
              <Label className="gba:text-[10px]">Value Field</Label>
              <Input
                value={column.dataSource?.valueField || 'value'}
                onChange={e => onUpdate(index, 'dataSource', { ...column.dataSource, valueField: e.target.value })}
                placeholder="value"
                className="gba:h-7 gba:text-xs"
                data-testid={`${testId}-value-field-${index}`}
              />
            </div>
            <div className="gba:space-y-1">
              <Label className="gba:text-[10px]">Label Field</Label>
              <Input
                value={column.dataSource?.labelField || 'value'}
                onChange={e => onUpdate(index, 'dataSource', { ...column.dataSource, labelField: e.target.value })}
                placeholder="value"
                className="gba:h-7 gba:text-xs"
                data-testid={`${testId}-label-field-${index}`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const ManualOptions: React.FC<{
  column: UiColumnDefinition
  index: number
  testId: string
  optionsExpanded?: boolean
  onToggle: () => void
  onAdd: () => void
  onUpdate: (columnIndex: number, optionIndex: number, field: keyof InputOption, value: string) => void
  onRemove: (columnIndex: number, optionIndex: number) => void
}> = ({ column, index, testId, optionsExpanded, onToggle, onAdd, onUpdate, onRemove }) => (
  <div className="gba:space-y-2">
    <div className="gba:flex gba:items-center gba:justify-between">
      <Button variant="ghost" size="sm" onClick={onToggle} className="gba:text-xs gba:h-6 gba:px-1">
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
        onClick={onAdd}
        className="gba:text-xs gba:h-6 gba:px-2"
        data-testid={`${testId}-add-option-${index}`}
      >
        <Plus className="gba:h-3 gba:w-3 gba:mr-1" />
        Add
      </Button>
    </div>

    {optionsExpanded && (column.options || []).length > 0 && (
      <div className="gba:space-y-1.5">
        {(column.options || []).map((option, optIndex) => (
          <div key={`option-${index}-${optIndex}`} className="gba:flex gba:gap-1.5 gba:items-center">
            <Input
              value={option.label || ''}
              onChange={e => onUpdate(index, optIndex, 'label', e.target.value)}
              placeholder="Label"
              className="gba:h-6 gba:text-xs gba:flex-1"
              data-testid={`${testId}-option-label-${index}-${optIndex}`}
            />
            <Input
              value={option.value || ''}
              onChange={e => onUpdate(index, optIndex, 'value', e.target.value)}
              placeholder="Value"
              className="gba:h-6 gba:text-xs gba:font-mono gba:flex-1"
              data-testid={`${testId}-option-value-${index}-${optIndex}`}
            />
            <Button
              variant="ghost"
              size="iconSm"
              className="gba:h-6 gba:w-6 gba:shrink-0"
              onClick={() => onRemove(index, optIndex)}
              data-testid={`${testId}-remove-option-${index}-${optIndex}`}
            >
              <TrashIcon className="gba:h-2.5 gba:w-2.5" />
            </Button>
          </div>
        ))}
      </div>
    )}
  </div>
)
