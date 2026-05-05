import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Badge,
  Button,
  Checkbox,
  Input,
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
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Database,
  FormInput,
  GripVertical,
  Info,
  Settings,
  Trash2
} from 'lucide-react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ExpressionInput } from '@/common/components/flow/flow-expression/ExpressionInput'
import { useCatalogDiscovery } from '@/common/data/flow/hooks/useCatalogDiscovery'
import type { FlowTemplate } from '@/common/data/flow/types/flowTemplate'
import {
  fetchCustomEntityOptions,
  fetchInternalEntityOptions,
  type DiscoveredEntityOption
} from '@/common/utils/entityDiscovery'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { InputType } from '@/common/network/flows/FlowTemplateClient'
import { EntityPreview } from './EntityPreview'

interface InputFieldsConfigurationProps {
  step: any
  stepIndex?: number
  template?: FlowTemplate
  context?: BusinessAppContextProps
  testId: string
  onUpdateStep: (updates: any) => void
}

interface InputFieldsTriggerProps {
  step: any
}

type ConfiguredEntityDataSource = {
  type?: 'CUSTOM_ENTITY' | 'INTERNAL_ENTITY' | 'CATALOG'
  entity?: string
  namespace?: string
}

const getEntitySelectionValue = (entity: DiscoveredEntityOption): string =>
  entity.kind === 'CUSTOM_ENTITY' ? `${entity.namespace || 'default'}:${entity.type}` : entity.type

const getConfiguredEntitySelectionValue = (dataSource: ConfiguredEntityDataSource | undefined): string | undefined => {
  if (!dataSource?.entity) {
    return undefined
  }

  return dataSource.type === 'CUSTOM_ENTITY' ? `${dataSource.namespace || 'default'}:${dataSource.entity}` : dataSource.entity
}

const findMatchingEntityOption = (
  entities: DiscoveredEntityOption[],
  dataSource: ConfiguredEntityDataSource | undefined
): DiscoveredEntityOption | undefined => {
  if (!dataSource?.entity || (dataSource.type !== 'CUSTOM_ENTITY' && dataSource.type !== 'INTERNAL_ENTITY')) {
    return undefined
  }

  return entities.find(entity => {
    if (entity.kind !== dataSource.type || entity.type !== dataSource.entity) {
      return false
    }

    if (dataSource.type !== 'CUSTOM_ENTITY') {
      return true
    }

    return (entity.namespace || 'default') === (dataSource.namespace || 'default')
  })
}

export const InputFieldsTrigger: React.FC<InputFieldsTriggerProps> = ({ step }) => {
  const inputs = step.form || step.inputs || []
  const requiredCount = inputs.filter((input: any) => input.required).length

  return (
    <div className="gba:flex gba:items-center gba:justify-between gba:w-full gba:pr-4">
      <div className="gba:flex gba:items-center gba:gap-2">
        <FormInput className="gba:h-4 gba:w-4" />
        {getTranslationFromI18nKeyAndLabel('flow.creator.inputFields', 'Input Fields')}
      </div>
      <div className="gba:flex gba:items-center gba:gap-2">
        {inputs.length > 0 && (
          <>
            <span className="gba:text-xs gba:bg-purple-100 gba:text-purple-800 gba:px-2 gba:py-1 gba:rounded">
              {inputs.length} {inputs.length === 1 ? 'field' : 'fields'}
            </span>
            {requiredCount > 0 && (
              <span className="gba:text-xs gba:bg-red-100 gba:text-red-800 gba:px-2 gba:py-1 gba:rounded">
                {requiredCount} required
              </span>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export const InputFieldsContent: React.FC<InputFieldsConfigurationProps> = ({
  step,
  stepIndex = 0,
  template,
  context,
  testId,
  onUpdateStep
}) => {
  const inputs = step.form || step.inputs || []
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const catalogDiscovery = context ? useCatalogDiscovery(context) : null
  const [catalogs, setCatalogs] = useState<any[]>([])
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(false)
  const [availableEntities, setAvailableEntities] = useState<DiscoveredEntityOption[]>([])
  const [isLoadingEntities, setIsLoadingEntities] = useState(false)
  const [catalogPreviewCounts, setCatalogPreviewCounts] = useState<Record<string, number>>({})
  const [expandedCatalogPreviews, setExpandedCatalogPreviews] = useState<Record<string, boolean>>({})
  const [expandedEntityPreviews, setExpandedEntityPreviews] = useState<Record<string, boolean>>({})
  const hasFetchedCatalogs = useRef(false)
  const hasFetchedEntities = useRef(false)

  useEffect(() => {
    if (!catalogDiscovery || !context?.accessToken) {
      hasFetchedCatalogs.current = false
      setCatalogs([])
      return
    }

    if (hasFetchedCatalogs.current) return

    const loadCatalogs = async () => {
      setIsLoadingCatalogs(true)
      hasFetchedCatalogs.current = true
      try {
        const fetchedCatalogs = await catalogDiscovery.fetchCatalogs()
        setCatalogs(fetchedCatalogs)
      } catch (error) {
        console.error('Failed to fetch catalogs:', error)
        setCatalogs([])
      } finally {
        setIsLoadingCatalogs(false)
      }
    }

    loadCatalogs()
  }, [catalogDiscovery, context?.accessToken])

  useEffect(() => {
    if (!context?.accessToken) {
      hasFetchedEntities.current = false
      setAvailableEntities([])
      return
    }

    if (hasFetchedEntities.current) return

    const loadEntities = async () => {
      setIsLoadingEntities(true)
      hasFetchedEntities.current = true
      try {
        const [customEntities, internalEntities] = await Promise.all([
          fetchCustomEntityOptions(context.accessToken),
          fetchInternalEntityOptions({ accessToken: context.accessToken, includeFields: true })
        ])
        setAvailableEntities([...customEntities, ...internalEntities])
      } catch (error) {
        console.error('Failed to fetch entities:', error)
        setAvailableEntities([])
      } finally {
        setIsLoadingEntities(false)
      }
    }

    loadEntities()
  }, [context?.accessToken])

  const fetchCatalogCount = useCallback(
    async (inputIndex: number, catalogId: string) => {
      if (!catalogDiscovery || !catalogId) return
      const cacheKey = `${inputIndex}-${catalogId}`
      if (catalogPreviewCounts[cacheKey] !== undefined) return

      try {
        const catalog = catalogs.find(item => item.catalogIdentifier === catalogId)
        const result = await catalogDiscovery.fetchCatalogEntries(catalogId, {
          version: catalog?.version,
          limit: 1
        })
        setCatalogPreviewCounts(previous => ({
          ...previous,
          [cacheKey]: result.totalCount || result.entries.length
        }))
      } catch (error) {
        console.error(`Failed to fetch preview for ${catalogId}:`, error)
        setCatalogPreviewCounts(previous => ({ ...previous, [cacheKey]: 0 }))
      }
    },
    [catalogDiscovery, catalogs, catalogPreviewCounts]
  )

  const handleUpdateInputs = (newInputs: any[]) => {
    onUpdateStep({ form: newInputs })
  }

  const handleAddInput = () => {
    handleUpdateInputs([
      ...inputs,
      {
        id: `input-${Date.now()}`,
        type: InputType.TEXT,
        name: `field${inputs.length + 1}`,
        label: 'New Field',
        required: false
      }
    ])
  }

  const handleUpdateInput = (index: number, field: string, value: any) => {
    const newInputs = [...inputs]
    newInputs[index] = { ...newInputs[index], [field]: value }

    if (field === 'type' && ![InputType.SELECT, InputType.MULTISELECT, InputType.CHECKBOX].includes(value)) {
      delete newInputs[index].options
      delete newInputs[index].dataSource
    }

    handleUpdateInputs(newInputs)
  }

  const handleRemoveInput = (index: number) => {
    handleUpdateInputs(inputs.filter((_: any, inputIndex: number) => inputIndex !== index))
  }

  const handleAddOption = (inputIndex: number) => {
    const newInputs = [...inputs]
    const options = newInputs[inputIndex].options || []
    newInputs[inputIndex] = {
      ...newInputs[inputIndex],
      options: [...options, { label: '', value: '' }]
    }
    handleUpdateInputs(newInputs)
  }

  const handleUpdateOption = (inputIndex: number, optionIndex: number, field: string, value: string) => {
    const newInputs = [...inputs]
    const options = [...(newInputs[inputIndex].options || [])]
    options[optionIndex] = { ...options[optionIndex], [field]: value }
    newInputs[inputIndex] = { ...newInputs[inputIndex], options }
    handleUpdateInputs(newInputs)
  }

  const handleRemoveOption = (inputIndex: number, optionIndex: number) => {
    const newInputs = [...inputs]
    const options = (newInputs[inputIndex].options || []).filter(
      (_: any, currentIndex: number) => currentIndex !== optionIndex
    )
    newInputs[inputIndex] = { ...newInputs[inputIndex], options }
    handleUpdateInputs(newInputs)
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
  }

  const handleDrop = (event: React.DragEvent, dropIndex: number) => {
    event.preventDefault()
    event.stopPropagation()
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null)
      return
    }

    const newInputs = [...inputs]
    const [draggedItem] = newInputs.splice(draggedIndex, 1)
    newInputs.splice(dropIndex, 0, draggedItem)
    handleUpdateInputs(newInputs)
    setDraggedIndex(null)
  }

  const validateEntityDataSource = useCallback(
    (input: any): { errors: string[]; warnings: string[] } => {
      const errors: string[] = []
      const warnings: string[] = []

      if (input.dataSource?.type !== 'CUSTOM_ENTITY' && input.dataSource?.type !== 'INTERNAL_ENTITY') {
        return { errors, warnings }
      }

      if (!input.dataSource.entity) errors.push('Entity type is required')
      if (!input.dataSource.valueField) errors.push('Value field is required')
      if (!input.dataSource.labelField) errors.push('Label field is required')

      const entitySchema = findMatchingEntityOption(availableEntities, input.dataSource)
      const fieldNames = entitySchema?.fields || []

      if (input.dataSource.valueField && fieldNames.length > 0 && !fieldNames.includes(input.dataSource.valueField)) {
        warnings.push(`Field "${input.dataSource.valueField}" not found in entity schema`)
      }
      if (input.dataSource.labelField && fieldNames.length > 0 && !fieldNames.includes(input.dataSource.labelField)) {
        warnings.push(`Field "${input.dataSource.labelField}" not found in entity schema`)
      }

      return { errors, warnings }
    },
    [availableEntities]
  )

  const selectLikeTypes = useMemo(() => [InputType.SELECT, InputType.MULTISELECT, InputType.CHECKBOX], [])

  return (
    <div className="gba:space-y-3 gba:pt-2">
      <div className="gba:flex gba:items-center gba:justify-between">
        <span className="gba:text-sm gba:text-gray-600">
          {inputs.length === 0 ? 'No input fields added' : `${inputs.length} input field(s) configured`}
        </span>
        <Button variant="outline" size="sm" onClick={handleAddInput} data-testid={`${testId}-add-input`}>
          {getTranslationFromI18nKeyAndLabel('flow.creator.addInput', 'Add Field')}
        </Button>
      </div>

      <div className="gba:space-y-3">
        {inputs.map((input: any, index: number) => {
          const isDragging = draggedIndex === index
          const isSelectLike = selectLikeTypes.includes(input.type)
          const entityValidation = validateEntityDataSource(input)
          const catalogPreviewKey = `${index}-${input.dataSource?.catalog || ''}`
          const entityPreviewKey = `${index}-${input.dataSource?.namespace || 'default'}-${input.dataSource?.entity || ''}`
          const entitySchema = findMatchingEntityOption(availableEntities, input.dataSource)
          const entityFieldNames = entitySchema?.fields || []

          return (
            <div
              key={`input-${input.id || index}`}
              draggable
              onDragStart={() => setDraggedIndex(index)}
              onDragOver={handleDragOver}
              onDrop={event => handleDrop(event, index)}
              onDragEnd={() => setDraggedIndex(null)}
              className={`gba:space-y-3 gba:p-3 gba:border gba:rounded gba:cursor-move ${
                isDragging ? 'gba:opacity-50 gba:bg-gray-200' : 'gba:bg-gray-50'
              }`}
            >
              <div className="gba:flex gba:gap-2 gba:items-center">
                <div className="gba:cursor-grab active:gba:cursor-grabbing gba:text-gray-400 hover:gba:text-gray-600">
                  <GripVertical className="gba:h-5 gba:w-5" />
                </div>

                <Input
                  value={input.label || ''}
                  onChange={event => handleUpdateInput(index, 'label', event.target.value)}
                  className="gba:flex-1"
                  placeholder="Field label"
                  data-testid={`${testId}-input-label-${index}`}
                />

                <Input
                  value={input.name || ''}
                  onChange={event => handleUpdateInput(index, 'name', event.target.value)}
                  className="gba:w-40"
                  placeholder="fieldName"
                  data-testid={`${testId}-input-name-${index}`}
                />

                <Select
                  value={input.type || InputType.TEXT}
                  onValueChange={value => handleUpdateInput(index, 'type', value)}
                  data-testid={`${testId}-input-type-${index}`}
                >
                  <SelectTrigger className="gba:w-[140px]">
                    <SelectValue placeholder="Select input type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={InputType.TEXT}>Text</SelectItem>
                    <SelectItem value={InputType.NUMBER}>Number</SelectItem>
                    <SelectItem value={InputType.DATE}>Date</SelectItem>
                    <SelectItem value={InputType.DATETIME}>DateTime</SelectItem>
                    <SelectItem value={InputType.TEXTAREA}>Textarea</SelectItem>
                    <SelectItem value={InputType.SELECT}>Select</SelectItem>
                    <SelectItem value={InputType.MULTISELECT}>Multi-Select</SelectItem>
                    <SelectItem value={InputType.CHECKBOX}>Checkbox</SelectItem>
                    <SelectItem value={InputType.FILE}>File</SelectItem>
                  </SelectContent>
                </Select>

                <div className="gba:flex gba:items-center gba:gap-1">
                  <Checkbox
                    checked={input.required || false}
                    onCheckedChange={checked => handleUpdateInput(index, 'required', checked)}
                    data-testid={`${testId}-input-required-${index}`}
                  />
                  <label className="gba:text-xs gba:text-gray-600 gba:whitespace-nowrap">Required</label>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveInput(index)}
                  data-testid={`${testId}-remove-input-${index}`}
                >
                  <Trash2 className="gba:h-4 gba:w-4" />
                </Button>
              </div>

              <div className="gba:pl-8 gba:space-y-2">
                <Input
                  value={input.placeholder || ''}
                  onChange={event => handleUpdateInput(index, 'placeholder', event.target.value)}
                  placeholder="Placeholder text"
                  data-testid={`${testId}-input-placeholder-${index}`}
                />

                <div className="gba:flex gba:items-center gba:gap-2">
                  <Checkbox
                    checked={input.value !== undefined}
                    onCheckedChange={checked => {
                      const newInputs = [...inputs]
                      if (checked) {
                        newInputs[index] = { ...newInputs[index], value: '' }
                      } else {
                        const updatedInput = { ...newInputs[index] }
                        delete updatedInput.value
                        delete updatedInput.readOnly
                        newInputs[index] = updatedInput
                      }
                      handleUpdateInputs(newInputs)
                    }}
                    data-testid={`${testId}-enable-expression-${index}`}
                  />
                  <label className="gba:text-sm gba:text-gray-700">Set default value from expression</label>
                  <Badge variant="secondary" className="gba:text-xs">
                    Optional
                  </Badge>
                </div>

                {input.value !== undefined && (
                  <div className="gba:space-y-2 gba:border-l-2 gba:border-purple-200 gba:pl-3">
                    <ExpressionInput
                      value={input.value || ''}
                      onChange={value => handleUpdateInput(index, 'value', value)}
                      mode="expression"
                      validateOnChange={true}
                      template={template}
                      stepIndex={stepIndex}
                      context={context}
                      useTreeBuilder={true}
                      placeholder="Click tree icon to build expression..."
                      data-testid={`${testId}-expression-value-${index}`}
                    />

                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Checkbox
                        checked={input.readOnly || false}
                        onCheckedChange={checked => handleUpdateInput(index, 'readOnly', checked)}
                        data-testid={`${testId}-readonly-${index}`}
                      />
                      <label className="gba:text-sm gba:text-gray-600">Read-only (reference field)</label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="gba:h-4 gba:w-4 gba:text-gray-400 gba:cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="gba:text-xs">
                              Read-only fields show data from previous steps but cannot be edited
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                )}
              </div>

              {isSelectLike && (
                <div className="gba:pl-8 gba:space-y-3">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <Settings className="gba:h-4 gba:w-4" />
                    <span className="gba:text-sm gba:font-medium">Options Source</span>
                  </div>

                  <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-3 gba:gap-3">
                    <Button
                      variant={input.dataSource?.type === 'CATALOG' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        const newInputs = [...inputs]
                        if (input.dataSource?.type === 'CATALOG') {
                          const updatedInput = { ...newInputs[index] }
                          delete updatedInput.dataSource
                          newInputs[index] = updatedInput
                        } else {
                          newInputs[index] = {
                            ...newInputs[index],
                            dataSource: {
                              type: 'CATALOG',
                              catalog: '',
                              valueField: 'value',
                              labelField: 'value'
                            }
                          }
                          delete newInputs[index].options
                        }
                        handleUpdateInputs(newInputs)
                      }}
                    >
                      Catalog
                    </Button>
                    <Button
                      variant={input.dataSource?.type === 'CUSTOM_ENTITY' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        const newInputs = [...inputs]
                        if (input.dataSource?.type === 'CUSTOM_ENTITY') {
                          const updatedInput = { ...newInputs[index] }
                          delete updatedInput.dataSource
                          newInputs[index] = updatedInput
                        } else {
                          newInputs[index] = {
                            ...newInputs[index],
                            dataSource: {
                              type: 'CUSTOM_ENTITY',
                              entity: '',
                              valueField: 'id',
                              labelField: 'displayName'
                            }
                          }
                          delete newInputs[index].options
                        }
                        handleUpdateInputs(newInputs)
                      }}
                    >
                      Custom Entity
                    </Button>
                    <Button
                      variant={input.dataSource?.type === 'INTERNAL_ENTITY' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        const newInputs = [...inputs]
                        if (input.dataSource?.type === 'INTERNAL_ENTITY') {
                          const updatedInput = { ...newInputs[index] }
                          delete updatedInput.dataSource
                          newInputs[index] = updatedInput
                        } else {
                          newInputs[index] = {
                            ...newInputs[index],
                            dataSource: {
                              type: 'INTERNAL_ENTITY',
                              entity: '',
                              valueField: 'id',
                              labelField: 'displayName'
                            }
                          }
                          delete newInputs[index].options
                        }
                        handleUpdateInputs(newInputs)
                      }}
                    >
                      Internal Entity
                    </Button>
                  </div>

                  {input.dataSource?.type === 'CATALOG' && (
                    <div className="gba:space-y-2 gba:border gba:border-blue-200 gba:bg-blue-50 gba:rounded gba:p-3">
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Database className="gba:h-4 gba:w-4 gba:text-blue-600" />
                        <span className="gba:text-sm gba:font-medium">Catalog Source</span>
                        {isLoadingCatalogs && <Badge variant="secondary">Loading</Badge>}
                      </div>

                      <Select
                        value={input.dataSource.catalog || undefined}
                        onValueChange={value => {
                          const newInputs = [...inputs]
                          newInputs[index] = {
                            ...newInputs[index],
                            dataSource: {
                              ...newInputs[index].dataSource,
                              catalog: value
                            }
                          }
                          handleUpdateInputs(newInputs)
                          fetchCatalogCount(index, value)
                        }}
                        data-testid={`${testId}-catalog-${index}`}
                      >
                        <SelectTrigger className="gba:w-full">
                          <SelectValue placeholder="Select catalog" />
                        </SelectTrigger>
                        <SelectContent>
                          {catalogs.map((catalog: any) => (
                            <SelectItem key={catalog.catalogIdentifier} value={catalog.catalogIdentifier}>
                              {catalog.catalogIdentifier}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div className="gba:grid gba:grid-cols-2 gba:gap-2">
                        <Input
                          value={input.dataSource.valueField || ''}
                          onChange={event => {
                            const newInputs = [...inputs]
                            newInputs[index] = {
                              ...newInputs[index],
                              dataSource: {
                                ...newInputs[index].dataSource,
                                valueField: event.target.value
                              }
                            }
                            handleUpdateInputs(newInputs)
                          }}
                          placeholder="Value field"
                        />
                        <Input
                          value={input.dataSource.labelField || ''}
                          onChange={event => {
                            const newInputs = [...inputs]
                            newInputs[index] = {
                              ...newInputs[index],
                              dataSource: {
                                ...newInputs[index].dataSource,
                                labelField: event.target.value
                              }
                            }
                            handleUpdateInputs(newInputs)
                          }}
                          placeholder="Label field"
                        />
                      </div>

                      {input.dataSource.catalog && (
                        <button
                          className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-blue-700"
                          onClick={() => {
                            setExpandedCatalogPreviews(previous => ({
                              ...previous,
                              [catalogPreviewKey]: !previous[catalogPreviewKey]
                            }))
                            fetchCatalogCount(index, input.dataSource.catalog)
                          }}
                          type="button"
                        >
                          {expandedCatalogPreviews[catalogPreviewKey] ? (
                            <ChevronUp className="gba:h-3 gba:w-3" />
                          ) : (
                            <ChevronDown className="gba:h-3 gba:w-3" />
                          )}
                          Preview count: {catalogPreviewCounts[catalogPreviewKey] ?? '-'}
                        </button>
                      )}
                    </div>
                  )}

                  {(input.dataSource?.type === 'CUSTOM_ENTITY' || input.dataSource?.type === 'INTERNAL_ENTITY') && (
                    <div className="gba:space-y-2 gba:border gba:border-purple-200 gba:bg-purple-50 gba:rounded gba:p-3">
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Database className="gba:h-4 gba:w-4 gba:text-purple-600" />
                        <span className="gba:text-sm gba:font-medium">
                          {input.dataSource.type === 'INTERNAL_ENTITY' ? 'Internal Entity Source' : 'Custom Entity Source'}
                        </span>
                        {isLoadingEntities && <Badge variant="secondary">Loading</Badge>}
                      </div>

                      <Select
                        value={getConfiguredEntitySelectionValue(input.dataSource)}
                        onValueChange={value => {
                          const selectedEntity = availableEntities.find(
                            entity => entity.kind === input.dataSource?.type && getEntitySelectionValue(entity) === value
                          )
                          const newInputs = [...inputs]
                          newInputs[index] = {
                            ...newInputs[index],
                            dataSource: {
                              ...newInputs[index].dataSource,
                              entity: selectedEntity?.type || '',
                              namespace:
                                input.dataSource?.type === 'CUSTOM_ENTITY'
                                  ? selectedEntity?.namespace || 'default'
                                  : undefined
                            }
                          }
                          handleUpdateInputs(newInputs)
                        }}
                        data-testid={`${testId}-entity-${index}`}
                      >
                        <SelectTrigger className="gba:w-full">
                          <SelectValue placeholder={isLoadingEntities ? 'Loading entities' : 'Select entity'} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableEntities
                            .filter(entity => entity.kind === input.dataSource?.type)
                            .map(entity => (
                              <SelectItem key={getEntitySelectionValue(entity)} value={getEntitySelectionValue(entity)}>
                                {entity.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>

                      <div className="gba:grid gba:grid-cols-2 gba:gap-2">
                        <Select
                          value={input.dataSource.valueField || undefined}
                          onValueChange={value => {
                            const newInputs = [...inputs]
                            newInputs[index] = {
                              ...newInputs[index],
                              dataSource: {
                                ...newInputs[index].dataSource,
                                valueField: value
                              }
                            }
                            handleUpdateInputs(newInputs)
                          }}
                        >
                          <SelectTrigger className="gba:w-full">
                            <SelectValue placeholder="Value field" />
                          </SelectTrigger>
                          <SelectContent>
                            {entityFieldNames.map((fieldName: string) => (
                              <SelectItem key={fieldName} value={fieldName}>
                                {fieldName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={input.dataSource.labelField || undefined}
                          onValueChange={value => {
                            const newInputs = [...inputs]
                            newInputs[index] = {
                              ...newInputs[index],
                              dataSource: {
                                ...newInputs[index].dataSource,
                                labelField: value
                              }
                            }
                            handleUpdateInputs(newInputs)
                          }}
                        >
                          <SelectTrigger className="gba:w-full">
                            <SelectValue placeholder="Label field" />
                          </SelectTrigger>
                          <SelectContent>
                            {entityFieldNames.map((fieldName: string) => (
                              <SelectItem key={fieldName} value={fieldName}>
                                {fieldName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {entityValidation.errors.map(error => (
                        <div key={error} className="gba:flex gba:items-center gba:gap-2 gba:text-red-700 gba:text-xs">
                          <AlertCircle className="gba:h-3 gba:w-3" />
                          {error}
                        </div>
                      ))}
                      {entityValidation.warnings.map(warning => (
                        <div
                          key={warning}
                          className="gba:flex gba:items-center gba:gap-2 gba:text-amber-700 gba:text-xs"
                        >
                          <Info className="gba:h-3 gba:w-3" />
                          {warning}
                        </div>
                      ))}

                      {input.dataSource.entity && (
                        <button
                          className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-purple-700"
                          onClick={() =>
                            setExpandedEntityPreviews(previous => ({
                              ...previous,
                              [entityPreviewKey]: !previous[entityPreviewKey]
                            }))
                          }
                          type="button"
                        >
                          {expandedEntityPreviews[entityPreviewKey] ? (
                            <ChevronUp className="gba:h-3 gba:w-3" />
                          ) : (
                            <ChevronDown className="gba:h-3 gba:w-3" />
                          )}
                          Preview entity source
                        </button>
                      )}

                      {expandedEntityPreviews[entityPreviewKey] && input.dataSource.entity && (
                        <EntityPreview
                          dataSourceType={input.dataSource.type}
                          entityType={input.dataSource.entity}
                          namespace={input.dataSource.namespace}
                          accessToken={context?.accessToken}
                          valueField={input.dataSource.valueField || 'id'}
                          labelField={input.dataSource.labelField || 'displayName'}
                          isExpanded={expandedEntityPreviews[entityPreviewKey] || false}
                          onToggle={() =>
                            setExpandedEntityPreviews(previous => ({
                              ...previous,
                              [entityPreviewKey]: !previous[entityPreviewKey]
                            }))
                          }
                          data-testid={`${testId}-entity-preview-${index}`}
                        />
                      )}
                    </div>
                  )}

                  {!input.dataSource && (
                    <div className="gba:space-y-2">
                      <div className="gba:flex gba:items-center gba:justify-between">
                        <span className="gba:text-sm gba:font-medium">Manual Options</span>
                        <Button variant="outline" size="sm" onClick={() => handleAddOption(index)}>
                          Add Option
                        </Button>
                      </div>

                      {(input.options || []).map((option: any, optionIndex: number) => (
                        <div key={`${optionIndex}-${option.value}`} className="gba:flex gba:items-center gba:gap-2">
                          <Input
                            value={option.label || ''}
                            onChange={event => handleUpdateOption(index, optionIndex, 'label', event.target.value)}
                            placeholder="Label"
                          />
                          <Input
                            value={option.value || ''}
                            onChange={event => handleUpdateOption(index, optionIndex, 'value', event.target.value)}
                            placeholder="Value"
                          />
                          <Button variant="ghost" size="sm" onClick={() => handleRemoveOption(index, optionIndex)}>
                            <Trash2 className="gba:h-4 gba:w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export const InputFieldsConfiguration = InputFieldsContent
