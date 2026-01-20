import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
  Button,
  Input,
  Checkbox,
  Badge,
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent
} from '@newwork/nw-design-system'
import { Select } from 'antd'
import {
  FormInput,
  Trash2,
  GripVertical,
  Info,
  Database,
  ChevronDown,
  ChevronUp,
  Settings,
  AlertCircle
} from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { InputType } from '@/common/network/flows/FlowTemplateClient'
import { FlowTemplate } from '../../types/flowTemplate'
import { ExpressionInput } from '../shared/ExpressionInput'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogDiscovery } from '../../hooks/useCatalogDiscovery'
import { env } from '@/common/env/EnvUtils'
import { EntityPreview } from './EntityPreview'

interface InputFieldsConfigurationProps {
  step: any
  stepIndex?: number
  template?: FlowTemplate // For expression builder
  context?: BusinessAppContextProps // For catalog fetching
  testId: string
  onUpdateStep: (updates: any) => void
}

interface InputFieldsTriggerProps {
  step: any
  testId: string
  onUpdateStep: (updates: any) => void
}

interface InputFieldsContentProps {
  step: any
  stepIndex?: number
  template?: FlowTemplate
  context?: BusinessAppContextProps // For catalog fetching
  testId: string
  onUpdateStep: (updates: any) => void
}

export const InputFieldsTrigger: React.FC<InputFieldsTriggerProps> = ({ step }) => {
  const inputs = step.form || step.inputs || [] // Handle both form and inputs
  const requiredCount = inputs.filter((input: any) => input.required).length

  return (
    <div className="gba:flex gba:items-center gba:justify-between gba:w-full gba:pr-4">
      <div className="gba:flex gba:items-center gba:gap-2">
        <FormInput className="gba:h-4 gba:w-4" />
        {getTranslationFromI18nKeyAndLabel('flow.creator.inputFields', 'Input Fields')}
      </div>
      <div className="gba:flex gba:items-center gba:gap-2">
        {inputs && inputs.length > 0 && (
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

export const InputFieldsContent: React.FC<InputFieldsContentProps> = ({
  step,
  stepIndex = 0,
  template,
  context,
  testId,
  onUpdateStep
}) => {
  const inputs = step.form || step.inputs || [] // Handle both form and inputs
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  // Catalog discovery - only if context is available
  const catalogDiscovery = context ? useCatalogDiscovery(context) : null
  const [catalogs, setCatalogs] = useState<any[]>([])
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(false)
  const [catalogPreviews, setCatalogPreviews] = useState<
    Record<string, { count: number; loading: boolean; entries?: any[] }>
  >({})
  const [expandedPreviews, setExpandedPreviews] = useState<Record<string, boolean>>({})
  const [advancedModeEnabled, setAdvancedModeEnabled] = useState<Record<number, boolean>>({})
  const hasFetchedCatalogs = useRef(false)

  // Entity data source state
  const [availableEntities, setAvailableEntities] = useState<any[]>([])
  const [isLoadingEntities, setIsLoadingEntities] = useState(false)
  const [advancedEntityModeEnabled, setAdvancedEntityModeEnabled] = useState<Record<number, boolean>>({})
  const [expandedEntityPreviews, setExpandedEntityPreviews] = useState<Record<string, boolean>>({})
  const hasFetchedEntities = useRef(false)

  // Custom data (namespace-scoped) data source state
  const [customDataNamespaces, setCustomDataNamespaces] = useState<string[]>([])
  const [isLoadingCustomDataNamespaces, setIsLoadingCustomDataNamespaces] = useState(false)
  const [customDataKeysByNamespace, setCustomDataKeysByNamespace] = useState<Record<string, string[]>>({})
  const [isLoadingCustomDataKeys, setIsLoadingCustomDataKeys] = useState<Record<string, boolean>>({})
  const hasFetchedCustomDataNamespaces = useRef(false)

  // Fetch catalogs when accessToken becomes available
  useEffect(() => {
    // Reset and fetch when accessToken changes
    if (!catalogDiscovery || !context?.accessToken) {
      hasFetchedCatalogs.current = false
      return
    }

    // Prevent duplicate fetches
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
  }, [context?.accessToken]) // Only depend on accessToken to prevent infinite loop

  // Fetch available entities on mount
  useEffect(() => {
    if (hasFetchedEntities.current) return

    const fetchEntities = async () => {
      setIsLoadingEntities(true)
      hasFetchedEntities.current = true
      try {
        const apiUrl = env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || env('NEXT_PUBLIC_BASE_URL') + '/flow-engine'
        const response = await fetch(`${apiUrl}/api/entities?includeFields=true`)
        if (!response.ok) {
          throw new Error(`Failed to fetch entities: ${response.statusText}`)
        }
        const data = await response.json()
        setAvailableEntities(Object.values(data.entities || {}))
      } catch (error) {
        console.error('Failed to fetch entities:', error)
        setAvailableEntities([])
      } finally {
        setIsLoadingEntities(false)
      }
    }

    fetchEntities()
  }, [])

  // Fetch registered custom-data namespaces (for CUSTOM_DATA data sources)
  useEffect(() => {
    if (!context?.accessToken) {
      hasFetchedCustomDataNamespaces.current = false
      setCustomDataNamespaces([])
      return
    }

    if (hasFetchedCustomDataNamespaces.current) return

    const fetchNamespaces = async () => {
      setIsLoadingCustomDataNamespaces(true)
      hasFetchedCustomDataNamespaces.current = true
      try {
        const apiUrl = env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || env('NEXT_PUBLIC_BASE_URL') + '/flow-engine'
        const response = await fetch(`${apiUrl}/api/custom-data/namespaces`, {
          headers: {
            Authorization: `Bearer ${context.accessToken}`,
            'Content-Type': 'application/json'
          }
        })
        if (!response.ok) {
          throw new Error(`Failed to fetch custom data namespaces: ${response.statusText}`)
        }
        const data = await response.json()
        const list = Array.isArray(data) ? data : []
        setCustomDataNamespaces(list.map((n: any) => String(n.namespace)).filter(Boolean))
      } catch (error) {
        console.error('Failed to fetch custom data namespaces:', error)
        setCustomDataNamespaces([])
      } finally {
        setIsLoadingCustomDataNamespaces(false)
      }
    }

    fetchNamespaces()
  }, [context?.accessToken])

  const fetchCustomDataKeys = useCallback(
    async (namespace: string) => {
      const ns = String(namespace || '').trim() || 'default'
      if (isLoadingCustomDataKeys[ns]) return
      if (customDataKeysByNamespace[ns]) return
      if (!context?.accessToken) return

      setIsLoadingCustomDataKeys(prev => ({ ...prev, [ns]: true }))
      try {
        const apiUrl = env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || env('NEXT_PUBLIC_BASE_URL') + '/flow-engine'
        const response = await fetch(`${apiUrl}/api/custom-data-sources/schema`, {
          headers: {
            Authorization: `Bearer ${context.accessToken}`,
            'Content-Type': 'application/json',
            'x-schema-namespace': ns
          }
        })
        if (!response.ok) {
          throw new Error(`Failed to fetch custom data schema: ${response.statusText}`)
        }
        const data = await response.json()
        const keys = Object.keys((data && data.dataSources) || {})
        setCustomDataKeysByNamespace(prev => ({ ...prev, [ns]: keys }))
      } catch (error) {
        console.error('Failed to fetch custom data sources schema:', error)
        setCustomDataKeysByNamespace(prev => ({ ...prev, [ns]: [] }))
      } finally {
        setIsLoadingCustomDataKeys(prev => ({ ...prev, [ns]: false }))
      }
    },
    [context?.accessToken, customDataKeysByNamespace, isLoadingCustomDataKeys]
  )

  // Fetch catalog preview when catalog is selected or expanded
  const fetchCatalogPreview = useCallback(
    async (inputIndex: number, catalogId: string) => {
      if (!catalogId || !context?.accessToken || !catalogDiscovery) return

      const key = `${inputIndex}-${catalogId}`

      // Skip if already loading
      if (catalogPreviews[key]?.loading) return

      setCatalogPreviews(prev => ({ ...prev, [key]: { count: 0, loading: true } }))

      try {
        // Find catalog to get version
        const catalog = catalogs.find(c => c.catalogIdentifier === catalogId)
        const result = await catalogDiscovery.fetchCatalogEntries(catalogId, {
          version: catalog?.version,
          limit: 100
        })

        setCatalogPreviews(prev => ({
          ...prev,
          [key]: {
            count: result.totalCount || result.entries.length,
            loading: false,
            entries: result.entries // Store entries for preview
          }
        }))
      } catch (error) {
        console.error(`Failed to fetch preview for ${catalogId}:`, error)
        setCatalogPreviews(prev => ({ ...prev, [key]: { count: 0, loading: false } }))
      }
    },
    [catalogs, context?.accessToken, catalogDiscovery, catalogPreviews]
  )

  // Toggle preview expansion and fetch if needed
  const togglePreviewExpansion = useCallback(
    (inputIndex: number, catalogId: string) => {
      const key = `${inputIndex}-${catalogId}`
      const isExpanded = expandedPreviews[key]

      // Toggle expansion state
      setExpandedPreviews(prev => ({ ...prev, [key]: !isExpanded }))

      // Fetch entries if expanding and not already loaded
      if (!isExpanded && !catalogPreviews[key]?.entries) {
        fetchCatalogPreview(inputIndex, catalogId)
      }
    },
    [expandedPreviews, catalogPreviews, fetchCatalogPreview]
  )

  // Toggle advanced mode for field mapping
  const toggleAdvancedMode = useCallback((index: number) => {
    setAdvancedModeEnabled(prev => ({ ...prev, [index]: !prev[index] }))
  }, [])

  const toggleAdvancedEntityMode = useCallback((index: number) => {
    setAdvancedEntityModeEnabled(prev => ({ ...prev, [index]: !prev[index] }))
  }, [])

  const toggleEntityPreviewExpansion = useCallback((index: number, entityType: string) => {
    const key = `${index}-${entityType}`
    setExpandedEntityPreviews(prev => ({ ...prev, [key]: !prev[key] }))
  }, [])

  // Validation helper for entity data source configuration
  const validateEntityDataSource = useCallback(
    (input: any): { isValid: boolean; errors: string[]; warnings: string[] } => {
      const errors: string[] = []
      const warnings: string[] = []

      if (input.dataSource?.type === 'ENTITY') {
        if (!input.dataSource.entity) {
          errors.push('Entity type is required')
        }
        if (!input.dataSource.valueField) {
          errors.push('Value field is required')
        }
        if (!input.dataSource.labelField) {
          errors.push('Label field is required')
        }

        // Field existence validation (if entity is selected and fields are specified)
        if (input.dataSource.entity && availableEntities.length > 0) {
          const entitySchema = availableEntities.find((e: any) => e.type === input.dataSource.entity)

          if (entitySchema && entitySchema.fields && Array.isArray(entitySchema.fields)) {
            const fieldNames = entitySchema.fields.map((f: any) => f.name)

            // Check valueField existence
            if (
              input.dataSource.valueField &&
              !fieldNames.includes(input.dataSource.valueField) &&
              input.dataSource.valueField !== 'id'
            ) {
              warnings.push(
                `Field "${input.dataSource.valueField}" not found in ${entitySchema.displayName} schema. Available: ${fieldNames.join(', ')}`
              )
            }

            // Check labelField existence
            if (
              input.dataSource.labelField &&
              !fieldNames.includes(input.dataSource.labelField) &&
              input.dataSource.labelField !== 'displayName'
            ) {
              warnings.push(
                `Field "${input.dataSource.labelField}" not found in ${entitySchema.displayName} schema. Available: ${fieldNames.join(', ')}`
              )
            }
          }
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      }
    },
    [availableEntities]
  )

  const handleAddInput = () => {
    const newInputs = [
      ...inputs,
      {
        id: `input-${Date.now()}`,
        type: InputType.TEXT,
        name: `field${inputs.length + 1}`,
        label: 'New Field',
        required: false
      }
    ]
    onUpdateStep({ form: newInputs }) // Use 'form' to match backend
  }

  const handleUpdateInput = (index: number, field: string, value: any) => {
    const newInputs = [...inputs]
    newInputs[index] = { ...newInputs[index], [field]: value }

    // Clear options when changing away from multi-option types
    if (field === 'type' && ![InputType.SELECT, InputType.MULTISELECT, InputType.CHECKBOX].includes(value)) {
      delete newInputs[index].options
    }

    onUpdateStep({ form: newInputs }) // Use 'form' to match backend
  }

  const handleRemoveInput = (index: number) => {
    const newInputs = inputs.filter((_: any, i: number) => i !== index)
    onUpdateStep({ form: newInputs }) // Use 'form' to match backend
  }

  const handleAddOption = (inputIndex: number) => {
    const newInputs = [...inputs]
    const options = newInputs[inputIndex].options || []
    newInputs[inputIndex] = {
      ...newInputs[inputIndex],
      options: [...options, { label: '', value: '' }]
    }
    onUpdateStep({ form: newInputs }) // Use 'form' to match backend
  }

  const handleUpdateOption = (inputIndex: number, optionIndex: number, field: string, value: string) => {
    const newInputs = [...inputs]
    const options = [...(newInputs[inputIndex].options || [])]
    options[optionIndex] = { ...options[optionIndex], [field]: value }
    newInputs[inputIndex] = { ...newInputs[inputIndex], options }
    onUpdateStep({ form: newInputs }) // Use 'form' to match backend
  }

  const handleRemoveOption = (inputIndex: number, optionIndex: number) => {
    const newInputs = [...inputs]
    const options = (newInputs[inputIndex].options || []).filter((_: any, i: number) => i !== optionIndex)
    newInputs[inputIndex] = { ...newInputs[inputIndex], options }
    onUpdateStep({ form: newInputs }) // Use 'form' to match backend
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

    const newInputs = [...inputs]
    const [draggedItem] = newInputs.splice(draggedIndex, 1)
    newInputs.splice(dropIndex, 0, draggedItem)

    onUpdateStep({ form: newInputs })
    setDraggedIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

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
        {inputs.length > 0 &&
          inputs.map((input: any, index: number) => {
            const isDragging = draggedIndex === index

            return (
              <div
                key={`input-${input.id || index}`}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={handleDragOver}
                onDrop={e => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`gba:space-y-2 gba:p-3 gba:border gba:rounded gba:cursor-move ${
                  isDragging ? 'gba:opacity-50 gba:bg-gray-200' : 'gba:bg-gray-50'
                }`}
              >
                <div className="gba:flex gba:gap-2 gba:items-center">
                  {/* Drag Handle */}
                  <div className="gba:cursor-grab active:gba:cursor-grabbing gba:text-gray-400 hover:gba:text-gray-600">
                    <GripVertical className="gba:h-5 gba:w-5" />
                  </div>

                  <Input
                    value={input.label || ''}
                    onChange={e => handleUpdateInput(index, 'label', e.target.value)}
                    className="gba:flex-1"
                    placeholder="Field label"
                    data-testid={`${testId}-input-label-${index}`}
                  />
                  <Select
                    value={input.type || InputType.TEXT}
                    onChange={value => handleUpdateInput(index, 'type', value)}
                    style={{ width: '120px' }}
                    data-testid={`${testId}-input-type-${index}`}
                  >
                    <Select.Option value={InputType.TEXT}>Text</Select.Option>
                    <Select.Option value={InputType.NUMBER}>Number</Select.Option>
                    <Select.Option value={InputType.DATE}>Date</Select.Option>
                    <Select.Option value={InputType.DATETIME}>DateTime</Select.Option>
                    <Select.Option value={InputType.TEXTAREA}>Textarea</Select.Option>
                    <Select.Option value={InputType.SELECT}>Select</Select.Option>
                    <Select.Option value={InputType.MULTISELECT}>Multi-Select</Select.Option>
                    <Select.Option value={InputType.CHECKBOX}>Checkbox</Select.Option>
                    <Select.Option value={InputType.FILE}>File</Select.Option>
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

                {/* Expression-based default value */}
                <div className="gba:pl-8 gba:space-y-2 gba:border-l-2 gba:border-purple-200">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <Checkbox
                      checked={input.value !== undefined}
                      onCheckedChange={checked => {
                        const newInputs = [...inputs]
                        if (checked) {
                          // Enable expression mode - start with empty value
                          newInputs[index] = { ...newInputs[index], value: '' }
                        } else {
                          // Disable expression mode - properly remove properties
                          const updated = { ...newInputs[index] }
                          delete updated.value
                          delete updated.readOnly
                          newInputs[index] = updated
                        }
                        onUpdateStep({ form: newInputs })
                      }}
                      data-testid={`${testId}-enable-expression-${index}`}
                    />
                    <label className="gba:text-sm gba:text-gray-700">Set default value from expression</label>
                    <Badge variant="secondary" className="gba:text-xs">
                      Optional
                    </Badge>
                  </div>

                  {input.value !== undefined && (
                    <div className="gba:space-y-2">
                      <ExpressionInput
                        value={input.value}
                        onChange={val => handleUpdateInput(index, 'value', val)}
                        mode="expression"
                        validateOnChange={true}
                        template={template}
                        stepIndex={stepIndex}
                        context={context}
                        useTreeBuilder={true}
                        placeholder="Click tree icon to build expression..."
                        data-testid={`${testId}-expression-value-${index}`}
                      />

                      {/* Read-only option */}
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

                {/* Dynamic Data Source Configuration */}
                {[InputType.SELECT, InputType.MULTISELECT].includes(input.type) && (
                  <div className="gba:pl-8 gba:space-y-3">
                    <div className="gba:flex gba:items-center gba:gap-2 gba:pb-1">
                      <label className="gba:text-sm gba:font-medium gba:text-gray-700">Dynamic Data Source</label>
                      <Badge variant="secondary" className="gba:text-xs">
                        Optional
                      </Badge>
                    </div>

                    <div className="gba:space-y-3">
                      {/* Catalog Checkbox */}
                      <div className="gba:space-y-2 gba:border-l-2 gba:border-blue-200 gba:pl-3">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Checkbox
                            checked={input.dataSource?.type === 'CATALOG'}
                            disabled={input.dataSource?.type === 'ENTITY' || input.dataSource?.type === 'CUSTOM_DATA'}
                            onCheckedChange={checked => {
                              const newInputs = [...inputs]
                              if (checked) {
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
                              } else {
                                const updated = { ...newInputs[index] }
                                delete updated.dataSource
                                newInputs[index] = updated
                              }
                              onUpdateStep({ form: newInputs })
                            }}
                            data-testid={`${testId}-enable-catalog-${index}`}
                          />
                          <Database className="gba:h-4 gba:w-4 gba:text-blue-600" />
                          <label className="gba:text-sm gba:text-gray-700 gba:font-medium">Catalog</label>
                          <Badge variant="secondary" className="gba:text-xs gba:bg-blue-100 gba:text-blue-800">
                            Dynamic
                          </Badge>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="gba:h-4 gba:w-4 gba:text-gray-400 gba:cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="gba:text-xs gba:max-w-xs">
                                  Automatically populate dropdown options from a catalog. Options stay up-to-date
                                  without template changes.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        {input.dataSource?.type === 'ENTITY' && (
                          <div className="gba:text-xs gba:text-gray-500 gba:italic gba:pl-6">
                            Disabled (Entity data source is active)
                          </div>
                        )}
                        {input.dataSource?.type === 'CUSTOM_DATA' && (
                          <div className="gba:text-xs gba:text-gray-500 gba:italic gba:pl-6">
                            Disabled (Custom Data data source is active)
                          </div>
                        )}
                      </div>

                      {/* Entity Checkbox */}
                      <div className="gba:space-y-2 gba:border-l-2 gba:border-purple-200 gba:pl-3">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Checkbox
                            checked={input.dataSource?.type === 'ENTITY'}
                            disabled={input.dataSource?.type === 'CATALOG' || input.dataSource?.type === 'CUSTOM_DATA'}
                            onCheckedChange={checked => {
                              const newInputs = [...inputs]
                              if (checked) {
                                newInputs[index] = {
                                  ...newInputs[index],
                                  dataSource: {
                                    type: 'ENTITY',
                                    entity: '',
                                    valueField: 'id',
                                    labelField: 'displayName'
                                  }
                                }
                                delete newInputs[index].options
                              } else {
                                const updated = { ...newInputs[index] }
                                delete updated.dataSource
                                newInputs[index] = updated
                              }
                              onUpdateStep({ form: newInputs })
                            }}
                            data-testid={`${testId}-enable-entity-${index}`}
                          />
                          <Database className="gba:h-4 gba:w-4 gba:text-purple-600" />
                          <label className="gba:text-sm gba:text-gray-700 gba:font-medium">Entity</label>
                          <Badge variant="secondary" className="gba:text-xs gba:bg-purple-100 gba:text-purple-800">
                            Dynamic
                          </Badge>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="gba:h-4 gba:w-4 gba:text-gray-400 gba:cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="gba:text-xs gba:max-w-xs">
                                  Automatically populate dropdown options from entities. Options stay up-to-date without
                                  template changes.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        {input.dataSource?.type === 'CATALOG' && (
                          <div className="gba:text-xs gba:text-gray-500 gba:italic gba:pl-6">
                            Disabled (Catalog data source is active)
                          </div>
                        )}
                        {input.dataSource?.type === 'CUSTOM_DATA' && (
                          <div className="gba:text-xs gba:text-gray-500 gba:italic gba:pl-6">
                            Disabled (Custom Data data source is active)
                          </div>
                        )}
                      </div>

                      {/* Custom Data Checkbox */}
                      <div className="gba:space-y-2 gba:border-l-2 gba:border-green-200 gba:pl-3">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Checkbox
                            checked={input.dataSource?.type === 'CUSTOM_DATA'}
                            disabled={input.dataSource?.type === 'CATALOG' || input.dataSource?.type === 'ENTITY'}
                            onCheckedChange={checked => {
                              const newInputs = [...inputs]
                              if (checked) {
                                const defaultNs = customDataNamespaces.includes('default')
                                  ? 'default'
                                  : customDataNamespaces[0] || 'default'
                                newInputs[index] = {
                                  ...newInputs[index],
                                  dataSource: {
                                    type: 'CUSTOM_DATA',
                                    namespace: defaultNs,
                                    key: '',
                                    valueField: 'id',
                                    labelField: 'id'
                                  }
                                }
                                delete newInputs[index].options
                                // Preload keys for default namespace
                                fetchCustomDataKeys(defaultNs)
                              } else {
                                const updated = { ...newInputs[index] }
                                delete updated.dataSource
                                newInputs[index] = updated
                              }
                              onUpdateStep({ form: newInputs })
                            }}
                            data-testid={`${testId}-enable-custom-data-${index}`}
                          />
                          <Database className="gba:h-4 gba:w-4 gba:text-green-600" />
                          <label className="gba:text-sm gba:text-gray-700 gba:font-medium">Custom Data</label>
                          <Badge variant="secondary" className="gba:text-xs gba:bg-green-100 gba:text-green-800">
                            Dynamic
                          </Badge>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="gba:h-4 gba:w-4 gba:text-gray-400 gba:cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="gba:text-xs gba:max-w-xs">
                                  Populate dropdown options from namespace-scoped custom data sources.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        {input.dataSource?.type === 'CATALOG' && (
                          <div className="gba:text-xs gba:text-gray-500 gba:italic gba:pl-6">
                            Disabled (Catalog data source is active)
                          </div>
                        )}
                        {input.dataSource?.type === 'ENTITY' && (
                          <div className="gba:text-xs gba:text-gray-500 gba:italic gba:pl-6">
                            Disabled (Entity data source is active)
                          </div>
                        )}
                        {isLoadingCustomDataNamespaces && (
                          <div className="gba:text-xs gba:text-gray-500 gba:italic gba:pl-6">Loading namespaces...</div>
                        )}
                      </div>
                    </div>

                    {input.dataSource?.type === 'CATALOG' && (
                      <div className="gba:space-y-3 gba:pt-2">
                        {/* Catalog Selector */}
                        <div className="gba:space-y-1">
                          <label className="gba:text-xs gba:font-medium gba:text-gray-700">Catalog</label>
                          <Select
                            value={input.dataSource.catalog || undefined}
                            onChange={value => {
                              handleUpdateInput(index, 'dataSource', {
                                ...input.dataSource,
                                catalog: value
                              })
                              // Note: Preview will load when user expands it
                            }}
                            placeholder={isLoadingCatalogs ? 'Loading catalogs...' : 'Select catalog'}
                            style={{ width: '100%' }}
                            showSearch
                            filterOption={(input, option) => {
                              const children = option?.children
                              const childStr = typeof children === 'string' ? children : String(children || '')
                              return childStr.toLowerCase().includes(input.toLowerCase())
                            }}
                            data-testid={`${testId}-catalog-select-${index}`}
                            loading={isLoadingCatalogs}
                          >
                            {catalogs.map(catalog => (
                              <Select.Option key={catalog.catalogIdentifier} value={catalog.catalogIdentifier}>
                                {catalog.catalogIdentifier}
                                {catalog.version && (
                                  <span className="gba:text-xs gba:text-gray-500 gba:ml-2">
                                    Version: {catalog.version}
                                  </span>
                                )}
                              </Select.Option>
                            ))}
                          </Select>
                        </div>

                        {/* Advanced Mode Toggle */}
                        <div className="gba:flex gba:justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleAdvancedMode(index)}
                            className="gba:text-xs gba:h-7"
                            data-testid={`${testId}-advanced-toggle-${index}`}
                          >
                            <Settings className="gba:h-3 gba:w-3 gba:mr-1" />
                            {advancedModeEnabled[index] ? 'Hide' : 'Show'} Advanced Settings
                            {advancedModeEnabled[index] ? (
                              <ChevronUp className="gba:h-3 gba:w-3 gba:ml-1" />
                            ) : (
                              <ChevronDown className="gba:h-3 gba:w-3 gba:ml-1" />
                            )}
                          </Button>
                        </div>

                        {/* Field Mapping - Only shown in Advanced Mode */}
                        {advancedModeEnabled[index] && (
                          <div className="gba:grid gba:grid-cols-2 gba:gap-2">
                            <div className="gba:space-y-1">
                              <label className="gba:text-xs gba:font-medium gba:text-gray-700">Value Field</label>
                              <Input
                                value={input.dataSource.valueField || 'value'}
                                onChange={e =>
                                  handleUpdateInput(index, 'dataSource', {
                                    ...input.dataSource,
                                    valueField: e.target.value
                                  })
                                }
                                placeholder="value"
                                className="gba:text-sm"
                                data-testid={`${testId}-value-field-${index}`}
                              />
                              <p className="gba:text-xs gba:text-gray-500">Field to use as option value</p>
                            </div>

                            <div className="gba:space-y-1">
                              <label className="gba:text-xs gba:font-medium gba:text-gray-700">Label Field</label>
                              <Input
                                value={input.dataSource.labelField || 'value'}
                                onChange={e =>
                                  handleUpdateInput(index, 'dataSource', {
                                    ...input.dataSource,
                                    labelField: e.target.value
                                  })
                                }
                                placeholder="value"
                                className="gba:text-sm"
                                data-testid={`${testId}-label-field-${index}`}
                              />
                              <p className="gba:text-xs gba:text-gray-500">Field to display to users</p>
                            </div>
                          </div>
                        )}

                        {/* Preview with Collapsible Entries */}
                        {input.dataSource.catalog &&
                          (() => {
                            const key = `${index}-${input.dataSource.catalog}`
                            const preview = catalogPreviews[key]
                            const isExpanded = expandedPreviews[key]
                            const entries = preview?.entries || []
                            const valueField = input.dataSource.valueField || 'code'
                            const labelField = input.dataSource.labelField || 'value'

                            return (
                              <div className="gba:space-y-2">
                                {/* Connection Status Header */}
                                <div className="gba:p-2 gba:bg-blue-50 gba:rounded gba:border gba:border-blue-200">
                                  <div className="gba:flex gba:items-center gba:justify-between">
                                    <div className="gba:flex gba:items-center gba:gap-2">
                                      {preview && preview.count > 0 && (
                                        <span className="gba:text-xs gba:text-gray-700">
                                          {preview.count} {preview.count === 1 ? 'entry' : 'entries'} available
                                        </span>
                                      )}
                                      {!preview && (
                                        <span className="gba:text-xs gba:text-gray-500 gba:italic">
                                          Catalog connected
                                        </span>
                                      )}
                                    </div>

                                    <div className="gba:flex gba:items-center gba:gap-2">
                                      <Badge
                                        variant="outline"
                                        className="gba:text-xs gba:bg-green-100 gba:text-green-800 gba:border-green-300"
                                      >
                                        ✓ Connected
                                      </Badge>

                                      {/* Expand/Collapse Button */}
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => togglePreviewExpansion(index, input.dataSource.catalog)}
                                        className="gba:h-6 gba:px-2 gba:text-xs"
                                        data-testid={`${testId}-preview-toggle-${index}`}
                                      >
                                        {isExpanded ? (
                                          <>
                                            <ChevronUp className="gba:w-3 gba:h-3 gba:mr-1" />
                                            Hide
                                          </>
                                        ) : (
                                          <>
                                            <ChevronDown className="gba:w-3 gba:h-3 gba:mr-1" />
                                            Preview
                                          </>
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                </div>

                                {/* Collapsible Entry Preview */}
                                {isExpanded && (
                                  <div className="gba:space-y-1">
                                    {preview?.loading && (
                                      <div className="gba:p-3 gba:text-center gba:text-xs gba:text-gray-600">
                                        Loading entries...
                                      </div>
                                    )}

                                    {!preview?.loading && entries.length > 0 && (
                                      <>
                                        <div className="gba:flex gba:items-center gba:justify-between gba:px-2">
                                          <span className="gba:text-xs gba:font-medium gba:text-gray-700">
                                            What users will see:
                                          </span>
                                          {entries.length > 5 && (
                                            <span className="gba:text-xs gba:text-gray-500">
                                              Showing first 5 of {entries.length}
                                            </span>
                                          )}
                                        </div>

                                        {/* Entry List - Optimized horizontal layout */}
                                        <div className="gba:space-y-1.5">
                                          {entries.slice(0, 5).map((entry: any, entryIndex: number) => (
                                            <div
                                              key={entryIndex}
                                              className="gba:p-2.5 gba:bg-white gba:rounded gba:border gba:border-gray-200"
                                            >
                                              {/* Title - Full width */}
                                              <div className="gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-1.5 gba:truncate">
                                                {entry.data?.[labelField] ||
                                                  entry[labelField] ||
                                                  entry.displayName ||
                                                  '(no label)'}
                                              </div>
                                              {/* Code and Value - Side by side */}
                                              <div className="gba:grid gba:grid-cols-2 gba:gap-3">
                                                <div className="gba:flex gba:items-center gba:gap-1.5">
                                                  <span className="gba:text-xs gba:font-medium gba:text-gray-500">
                                                    Code:
                                                  </span>
                                                  <span className="gba:text-xs gba:text-gray-700 gba:font-mono gba:truncate">
                                                    {entry.code || entry.data?.code || '(no code)'}
                                                  </span>
                                                </div>
                                                <div className="gba:flex gba:items-center gba:gap-1.5">
                                                  <span className="gba:text-xs gba:font-medium gba:text-gray-500">
                                                    Value:
                                                  </span>
                                                  <span className="gba:text-xs gba:text-gray-700 gba:truncate">
                                                    {entry.data?.[valueField] ||
                                                      entry[valueField] ||
                                                      entry.id ||
                                                      '(no value)'}
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </>
                                    )}

                                    {!preview?.loading && entries.length === 0 && preview && (
                                      <div className="gba:p-3 gba:text-center gba:text-xs gba:text-gray-500 gba:italic">
                                        No entries found in this catalog
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })()}
                      </div>
                    )}
                  </div>
                )}

                {/* Entity Configuration (shown when ENTITY is selected in radio group) */}
                {[InputType.SELECT, InputType.MULTISELECT].includes(input.type) &&
                  input.dataSource?.type === 'ENTITY' && (
                    <div className="gba:pl-8 gba:space-y-3 gba:pt-2">
                      {/* Validation Errors and Warnings */}
                      {(() => {
                        const validation = validateEntityDataSource(input)
                        const hasErrors = !validation.isValid
                        const hasWarnings = validation.warnings && validation.warnings.length > 0

                        if (!hasErrors && !hasWarnings) return null

                        return (
                          <div className="gba:space-y-2">
                            {/* Errors */}
                            {hasErrors && (
                              <div className="gba:p-2 gba:bg-destructive-secondary gba:border gba:border-destructive gba:rounded gba:text-xs">
                                <div className="gba:flex gba:items-start gba:gap-2">
                                  <AlertCircle className="gba:h-4 gba:w-4 gba:text-destructive gba:flex-shrink-0 gba:mt-0.5" />
                                  <div className="gba:space-y-1">
                                    <div className="gba:font-medium gba:text-destructive">
                                      Invalid Entity Configuration
                                    </div>
                                    <ul className="gba:list-disc gba:list-inside gba:text-destructive-secondary-foreground">
                                      {validation.errors.map((error, idx) => (
                                        <li key={idx}>{error}</li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Warnings */}
                            {hasWarnings && (
                              <div className="gba:p-2 gba:bg-warning-secondary gba:border gba:border-warning gba:rounded gba:text-xs">
                                <div className="gba:flex gba:items-start gba:gap-2">
                                  <AlertCircle className="gba:h-4 gba:w-4 gba:text-warning gba:flex-shrink-0 gba:mt-0.5" />
                                  <div className="gba:space-y-1">
                                    <div className="gba:font-medium gba:text-warning">Field Validation Warnings</div>
                                    <ul className="gba:list-disc gba:list-inside gba:text-warning-secondary-foreground">
                                      {validation.warnings.map((warning, idx) => (
                                        <li key={idx}>{warning}</li>
                                      ))}
                                    </ul>
                                    <div className="gba:text-warning-secondary-foreground gba:italic gba:mt-1">
                                      These fields may not exist on the entity. The system will fallback to default
                                      fields (id/displayName) at runtime.
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })()}

                      {/* Entity Type Selector */}
                      <div className="gba:space-y-1">
                        <label className="gba:text-xs gba:font-medium gba:text-gray-700">
                          Entity Type
                          <span className="gba:text-destructive gba:ml-1">*</span>
                        </label>
                        <Select
                          value={input.dataSource.entity || undefined}
                          onChange={value => {
                            handleUpdateInput(index, 'dataSource', {
                              ...input.dataSource,
                              entity: value
                            })
                          }}
                          placeholder={isLoadingEntities ? 'Loading entities...' : 'Select entity type'}
                          style={{ width: '100%' }}
                          showSearch
                          filterOption={(input, option) => {
                            const children = option?.children
                            const childStr = typeof children === 'string' ? children : String(children || '')
                            return childStr.toLowerCase().includes(input.toLowerCase())
                          }}
                          data-testid={`${testId}-entity-select-${index}`}
                          loading={isLoadingEntities}
                        >
                          {availableEntities.map((entity: any) => (
                            <Select.Option key={entity.type} value={entity.type}>
                              {entity.displayName}
                              {entity.description && (
                                <span className="gba:text-xs gba:text-gray-500 gba:ml-2">({entity.description})</span>
                              )}
                            </Select.Option>
                          ))}
                        </Select>
                      </div>

                      {/* Advanced Mode Toggle */}
                      <div className="gba:flex gba:justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleAdvancedEntityMode(index)}
                          className="gba:text-xs gba:h-7"
                          data-testid={`${testId}-entity-advanced-toggle-${index}`}
                        >
                          <Settings className="gba:h-3 gba:w-3 gba:mr-1" />
                          {advancedEntityModeEnabled[index] ? 'Hide' : 'Show'} Advanced Settings
                          {advancedEntityModeEnabled[index] ? (
                            <ChevronUp className="gba:h-3 gba:w-3 gba:ml-1" />
                          ) : (
                            <ChevronDown className="gba:h-3 gba:w-3 gba:ml-1" />
                          )}
                        </Button>
                      </div>

                      {/* Field Mapping (Advanced Settings) */}
                      {advancedEntityModeEnabled[index] && (
                        <div className="gba:grid gba:grid-cols-2 gba:gap-2">
                          <div className="gba:space-y-1">
                            <label className="gba:text-xs gba:font-medium gba:text-gray-700">
                              Value Field
                              <span className="gba:text-destructive gba:ml-1">*</span>
                            </label>
                            <Input
                              value={input.dataSource.valueField || 'id'}
                              onChange={e => {
                                handleUpdateInput(index, 'dataSource', {
                                  ...input.dataSource,
                                  valueField: e.target.value
                                })
                              }}
                              placeholder="id"
                              className={`gba:text-xs ${!input.dataSource.valueField ? 'gba:border-destructive' : ''}`}
                              data-testid={`${testId}-entity-value-field-${index}`}
                            />
                          </div>
                          <div className="gba:space-y-1">
                            <label className="gba:text-xs gba:font-medium gba:text-gray-700">
                              Label Field
                              <span className="gba:text-destructive gba:ml-1">*</span>
                            </label>
                            <Input
                              value={input.dataSource.labelField || 'displayName'}
                              onChange={e => {
                                handleUpdateInput(index, 'dataSource', {
                                  ...input.dataSource,
                                  labelField: e.target.value
                                })
                              }}
                              placeholder="displayName"
                              className={`gba:text-xs ${!input.dataSource.labelField ? 'gba:border-destructive' : ''}`}
                              data-testid={`${testId}-entity-label-field-${index}`}
                            />
                          </div>
                        </div>
                      )}

                      {/* Entity Preview with Search */}
                      {input.dataSource.entity && (
                        <EntityPreview
                          entityType={input.dataSource.entity}
                          valueField={input.dataSource.valueField || 'id'}
                          labelField={input.dataSource.labelField || 'displayName'}
                          isExpanded={expandedEntityPreviews[`${index}-${input.dataSource.entity}`] || false}
                          onToggle={() => toggleEntityPreviewExpansion(index, input.dataSource.entity)}
                          data-testid={`${testId}-entity-preview-${index}`}
                        />
                      )}
                    </div>
                  )}

                {/* Custom Data Configuration (namespace-scoped) */}
                {[InputType.SELECT, InputType.MULTISELECT].includes(input.type) &&
                  input.dataSource?.type === 'CUSTOM_DATA' && (
                    <div className="gba:pl-8 gba:space-y-3 gba:pt-2">
                      <div className="gba:space-y-1">
                        <label className="gba:text-xs gba:font-medium gba:text-gray-700">
                          Namespace <span className="gba:text-destructive gba:ml-1">*</span>
                        </label>
                        <Select
                          value={input.dataSource.namespace || undefined}
                          onChange={value => {
                            const ns = String(value || 'default')
                            handleUpdateInput(index, 'dataSource', {
                              ...input.dataSource,
                              namespace: ns,
                              key: ''
                            })
                            fetchCustomDataKeys(ns)
                          }}
                          placeholder={isLoadingCustomDataNamespaces ? 'Loading namespaces...' : 'Select namespace'}
                          style={{ width: '100%' }}
                          showSearch
                          filterOption={(input, option) => {
                            const children = option?.children
                            const childStr = typeof children === 'string' ? children : String(children || '')
                            return childStr.toLowerCase().includes(input.toLowerCase())
                          }}
                          data-testid={`${testId}-custom-data-namespace-${index}`}
                          loading={isLoadingCustomDataNamespaces}
                        >
                          {customDataNamespaces.map(ns => (
                            <Select.Option key={ns} value={ns}>
                              {ns}
                            </Select.Option>
                          ))}
                        </Select>
                      </div>

                      <div className="gba:space-y-1">
                        <label className="gba:text-xs gba:font-medium gba:text-gray-700">
                          Data Source Key <span className="gba:text-destructive gba:ml-1">*</span>
                        </label>
                        <Select
                          value={input.dataSource.key || undefined}
                          onChange={value => {
                            handleUpdateInput(index, 'dataSource', {
                              ...input.dataSource,
                              key: String(value || '')
                            })
                          }}
                          placeholder={
                            input.dataSource.namespace
                              ? isLoadingCustomDataKeys[input.dataSource.namespace]
                                ? 'Loading data sources...'
                                : 'Select data source'
                              : 'Select namespace first'
                          }
                          style={{ width: '100%' }}
                          showSearch
                          disabled={!input.dataSource.namespace}
                          filterOption={(input, option) => {
                            const children = option?.children
                            const childStr = typeof children === 'string' ? children : String(children || '')
                            return childStr.toLowerCase().includes(input.toLowerCase())
                          }}
                          data-testid={`${testId}-custom-data-key-${index}`}
                          loading={Boolean(
                            input.dataSource.namespace && isLoadingCustomDataKeys[input.dataSource.namespace]
                          )}
                        >
                          {(input.dataSource.namespace
                            ? customDataKeysByNamespace[input.dataSource.namespace] || []
                            : []
                          ).map(k => (
                            <Select.Option key={k} value={k}>
                              {k}
                            </Select.Option>
                          ))}
                        </Select>
                      </div>

                      <div className="gba:grid gba:grid-cols-2 gba:gap-2">
                        <div className="gba:space-y-1">
                          <label className="gba:text-xs gba:font-medium gba:text-gray-700">
                            Value Field <span className="gba:text-destructive gba:ml-1">*</span>
                          </label>
                          <Input
                            value={input.dataSource.valueField || 'id'}
                            onChange={e => {
                              handleUpdateInput(index, 'dataSource', {
                                ...input.dataSource,
                                valueField: e.target.value
                              })
                            }}
                            placeholder="id"
                            className="gba:text-xs"
                            data-testid={`${testId}-custom-data-value-field-${index}`}
                          />
                        </div>
                        <div className="gba:space-y-1">
                          <label className="gba:text-xs gba:font-medium gba:text-gray-700">
                            Label Field <span className="gba:text-destructive gba:ml-1">*</span>
                          </label>
                          <Input
                            value={input.dataSource.labelField || 'id'}
                            onChange={e => {
                              handleUpdateInput(index, 'dataSource', {
                                ...input.dataSource,
                                labelField: e.target.value
                              })
                            }}
                            placeholder="id"
                            className="gba:text-xs"
                            data-testid={`${testId}-custom-data-label-field-${index}`}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                {/* Options for multi-value inputs (manual mode only) */}
                {[InputType.SELECT, InputType.MULTISELECT, InputType.CHECKBOX].includes(input.type) &&
                  input.dataSource?.type !== 'CATALOG' &&
                  input.dataSource?.type !== 'ENTITY' &&
                  input.dataSource?.type !== 'CUSTOM_DATA' && (
                    <div className="gba:space-y-2">
                      <div className="gba:flex gba:items-center gba:justify-between">
                        <span className="gba:text-xs gba:text-gray-600">Options:</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddOption(index)}
                          data-testid={`${testId}-add-option-${index}`}
                        >
                          Add Option
                        </Button>
                      </div>

                      {/* Column Headers */}
                      {(input.options || []).length > 0 && (
                        <div className="gba:flex gba:gap-2 gba:items-center gba:pl-4">
                          <div className="gba:flex-1">
                            <span className="gba:text-xs gba:font-medium gba:text-gray-700">Label</span>
                          </div>
                          <div className="gba:flex-1">
                            <span className="gba:text-xs gba:font-medium gba:text-gray-700">Value</span>
                          </div>
                          <div className="gba:w-8"></div>
                        </div>
                      )}

                      {(input.options || []).map((option: any, optionIndex: number) => (
                        <div
                          key={`option-${index}-${optionIndex}`}
                          className="gba:flex gba:gap-2 gba:items-center gba:pl-4"
                        >
                          <Input
                            value={option.label || ''}
                            onChange={e => handleUpdateOption(index, optionIndex, 'label', e.target.value)}
                            className="gba:flex-1"
                            placeholder="Display text"
                            data-testid={`${testId}-option-label-${index}-${optionIndex}`}
                          />
                          <Input
                            value={option.value || ''}
                            onChange={e => handleUpdateOption(index, optionIndex, 'value', e.target.value)}
                            className="gba:flex-1"
                            placeholder="Stored value"
                            data-testid={`${testId}-option-value-${index}-${optionIndex}`}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveOption(index, optionIndex)}
                            data-testid={`${testId}-remove-option-${index}-${optionIndex}`}
                          >
                            <Trash2 className="gba:h-4 gba:w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            )
          })}
      </div>
    </div>
  )
}

export const InputFieldsConfiguration: React.FC<InputFieldsConfigurationProps> = props => {
  return (
    <>
      <InputFieldsTrigger {...props} />
      <InputFieldsContent {...props} />
    </>
  )
}
