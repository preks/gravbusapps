import React, { useState, useEffect } from 'react'
import { Modal } from 'antd'
import {
  Card,
  Button,
  Spinner,
  Alert,
  AlertDescription,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Checkbox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Badge
} from '@newwork/nw-design-system'
import { Plus, Edit, Trash2, GripVertical, Clock, CheckSquare } from 'lucide-react'
import {
  DndContext,
  closestCorners,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useForm } from 'react-hook-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useStageConditions } from '../hooks/useStageConditions'
import { useMeasurementUnits, MeasurementUnit } from '../hooks/useMeasurementUnits'
import { EnhancedSalesPipelineStage } from '../types'
import { getPipelineCatalogConfig } from '../utils/catalogConfig'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

// Catalog constants are dynamic based on CRM/IRM selection

interface StageConditionObjectValue {
  description?: string
  generateTask?: boolean
  check_type?: 'Automated' | 'User' | 'Manager' | 'Owner'
  deadline_enabled?: boolean
  deadline_duration?: number
  deadline_duration_measurement_unit_ref?: string
}

interface StageCondition {
  id: string
  name: string
  description: string
  rank: number
  code: string
  alternativeCode: string
  objectValue: StageConditionObjectValue
  additionalValue1?: string
  additionalValue2?: string
  additionalValue3?: string
  generateTask?: boolean
  checkedType?: 'Automated' | 'User' | 'Manager' | 'Owner'
  deadlineEnabled?: boolean
  deadlineDuration?: number
  deadlineUnit?: string
}

interface ConditionFormData {
  name: string
  description: string
  generate_task: boolean
  checked_type: 'Automated' | 'User' | 'Manager' | 'Owner'
  deadline_enabled: boolean
  deadline_duration: number
  deadline_duration_measurement_unit_ref: string // CatalogRef for Catalog_MeasurementUnit
  rank: number
}

interface StageConditionsModalProps extends BusinessAppContextProps {
  stage: EnhancedSalesPipelineStage | null
  visible: boolean
  onClose: () => void
  prefixDataTestId?: string
  sourceApp?: 'CRM' | 'IRM'
}

// Draggable Condition Item Component
const DraggableConditionItem: React.FC<{
  condition: StageCondition
  index: number
  prefixDataTestId?: string
  onEdit: (condition: StageCondition) => void
  onDelete: (condition: StageCondition) => void
}> = ({ condition, index, prefixDataTestId, onEdit, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: condition.id,
    data: {
      type: 'condition',
      condition
    }
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  return (
    <div ref={setNodeRef} style={style} data-testid={`${prefixDataTestId}-draggable-condition-${condition.id}`}>
      <Card className="gba:border-gray-200 hover:gba:border-blue-400 hover:gba:shadow-md gba:transition-all gba:cursor-pointer gba:relative">
        <div className="gba:p-2 gba:flex gba:items-start gba:gap-2">
          {/* Order Number */}
          <div className="gba:flex-shrink-0 gba:w-6 gba:h-6 gba:bg-blue-100 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:text-xs gba:font-medium gba:text-blue-600">
            {index}
          </div>

          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="gba:cursor-grab gba:text-gray-400 hover:gba:text-gray-600 gba:p-0.5"
          >
            <GripVertical className="gba:w-4 gba:h-4" />
          </div>

          {/* Condition Content */}
          <div className="gba:flex-1 gba:min-w-0">
            {/* Header with name and badges */}
            <div className="gba:flex gba:items-start gba:justify-between gba:gap-2 gba:mb-1">
              <div className="gba:flex-1 gba:min-w-0">
                <h5 className="gba:text-gray-800 gba:font-medium gba:text-sm gba:leading-tight gba:truncate">
                  {condition.name}
                </h5>
              </div>

              {/* Configuration Badges */}
              <div className="gba:flex gba:gap-1 gba:flex-shrink-0">
                {condition.generateTask && (
                  <Badge
                    variant="secondary"
                    className="gba:text-xs gba:px-1.5 gba:py-0.5 gba:flex gba:items-center gba:gap-1"
                  >
                    <CheckSquare className="gba:w-3 gba:h-3" />
                    Task
                  </Badge>
                )}
                {condition.deadlineEnabled && (
                  <Badge
                    variant="outline"
                    className="gba:text-xs gba:px-1.5 gba:py-0.5 gba:flex gba:items-center gba:gap-1"
                  >
                    <Clock className="gba:w-3 gba:h-3" />
                    {condition.deadlineDuration} {condition.deadlineUnit}
                  </Badge>
                )}
              </div>
            </div>

            {/* Description and checked by info */}
            <div className="gba:flex gba:items-start gba:justify-between gba:gap-1">
              <p
                className="gba:text-gray-500 gba:text-xs gba:leading-tight gba:flex-1"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}
              >
                {condition.description}
              </p>
              <div className="gba:flex gba:items-center gba:gap-1 gba:flex-shrink-0">
                <span className="gba:text-xs gba:text-gray-400">Checked by:</span>
                <Badge variant="default" className="gba:text-xs gba:px-1.5 gba:py-0.5">
                  {condition.checkedType}
                </Badge>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="gba:flex gba:gap-1 gba:flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={e => {
                e.stopPropagation()
                onEdit(condition)
              }}
              className="gba:text-gray-400 hover:gba:text-blue-500 gba:p-1 gba:h-7 gba:w-7"
              data-testid={`${prefixDataTestId}-edit-condition-${condition.id}`}
            >
              <Edit className="gba:w-3.5 gba:h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={e => {
                e.stopPropagation()
                onDelete(condition)
              }}
              className="gba:text-gray-400 hover:gba:text-red-500 gba:p-1 gba:h-7 gba:w-7"
              data-testid={`${prefixDataTestId}-delete-condition-${condition.id}`}
            >
              <Trash2 className="gba:w-3.5 gba:h-3.5" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

export const StageConditionsModal: React.FC<StageConditionsModalProps> = ({
  stage,
  visible,
  onClose,
  prefixDataTestId,
  sourceApp,
  ...context
}) => {
  const [conditions, setConditions] = useState<StageCondition[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [operationLoading, setOperationLoading] = useState(false)

  // Condition modal states
  const [isConditionModalVisible, setIsConditionModalVisible] = useState(false)
  const [editingCondition, setEditingCondition] = useState<StageCondition | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [conditionToDelete, setConditionToDelete] = useState<StageCondition | null>(null)

  // Measurement units state
  const [measurementUnits, setMeasurementUnits] = useState<MeasurementUnit[]>([])
  const [loadingMeasurementUnits, setLoadingMeasurementUnits] = useState(false)

  const { fetchStageConditions } = useStageConditions(context)
  const { fetchTimeMeasurementUnits } = useMeasurementUnits(context)
  const catalogClient = useCatalogManagerClient(context.accessToken)

  const conditionForm = useForm<ConditionFormData>({
    defaultValues: {
      name: '',
      description: '',
      generate_task: false,
      checked_type: 'User',
      deadline_enabled: false,
      deadline_duration: 1,
      deadline_duration_measurement_unit_ref: '',
      rank: 1
    }
  })

  // Drag and drop states
  const [activeCondition, setActiveCondition] = useState<StageCondition | null>(null)

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    })
  )

  // Load conditions when stage changes
  useEffect(() => {
    if (stage && visible) {
      loadConditions()
    }
  }, [stage, visible])

  // Load measurement units when modal becomes visible
  useEffect(() => {
    if (visible && measurementUnits.length === 0) {
      loadMeasurementUnits()
    }
  }, [visible])

  // Load measurement units when condition modal becomes visible
  useEffect(() => {
    if (isConditionModalVisible && measurementUnits.length === 0) {
      loadMeasurementUnits()
    }
  }, [isConditionModalVisible])

  const loadMeasurementUnits = async () => {
    setLoadingMeasurementUnits(true)
    try {
      const units = await fetchTimeMeasurementUnits()
      console.log('Loaded measurement units:', units)
      setMeasurementUnits(units)
    } catch (error) {
      console.error('Error loading measurement units:', error)
    } finally {
      setLoadingMeasurementUnits(false)
    }
  }

  const loadConditions = async () => {
    if (!stage) return

    setIsLoading(true)
    setError(null)

    try {
      // Ensure measurement units are loaded first
      if (measurementUnits.length === 0) {
        await loadMeasurementUnits()
      }

      // Fetch real condition data from GraphQL
      const conditionEntries = await fetchStageConditions(
        stage.code,
        sourceApp || (stage.pipeline?.type as 'CRM' | 'IRM') || 'CRM'
      )

      // Transform GraphQL data to StageCondition format
      const transformedConditions: StageCondition[] = conditionEntries.map((entry, index) => {
        // Parse additional values for enhanced fields
        const additionalValue1 = entry.additionalValue1 || ''
        const additionalValue2 = entry.additionalValue2 || ''
        const additionalValue3 = entry.additionalValue3 || ''

        // Try to parse objectValue for extended configuration
        let objectValue: StageConditionObjectValue = {}
        try {
          objectValue = typeof entry.objectValue === 'string' ? JSON.parse(entry.objectValue) : entry.objectValue || {}
          console.log('Parsed objectValue for condition:', entry.value, objectValue)
        } catch (e) {
          objectValue = {}
          console.error('Error parsing objectValue for condition:', entry.value, e)
        }

        // Resolve measurement unit value from catalog
        const measurementUnitRef = objectValue.deadline_duration_measurement_unit_ref
        let resolvedDeadlineUnit = 'Days' // Default fallback

        if (measurementUnitRef && measurementUnits.length > 0) {
          const foundUnit = measurementUnits.find(unit => unit.id === measurementUnitRef)
          if (foundUnit) {
            resolvedDeadlineUnit = foundUnit.value
          }
        }

        return {
          id: entry.id,
          name: entry.value || `Condition ${index + 1}`,
          description: objectValue.description || additionalValue1 || 'No description provided',
          rank: parseInt(additionalValue1) || index + 1, // Use additionalValue1 for rank, fallback to index
          code: entry.code,
          alternativeCode: entry.alternativeCode,
          objectValue: objectValue,
          additionalValue1: additionalValue1,
          additionalValue2: additionalValue2,
          additionalValue3: additionalValue3,
          // Extract configuration from objectValue if available
          generateTask: objectValue.generateTask || false,
          checkedType: objectValue.check_type || 'User',
          deadlineEnabled: objectValue.deadline_enabled || false,
          deadlineDuration: objectValue.deadline_duration || 1,
          deadlineUnit: resolvedDeadlineUnit
        }
      })

      // Sort conditions by their rank
      const sortedConditions = transformedConditions.sort((a, b) => a.rank - b.rank)
      setConditions(sortedConditions)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load stage conditions'
      setError(errorMsg)
      console.error('Error loading stage conditions:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const condition = conditions.find(c => c.id === active.id)
    setActiveCondition(condition || null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveCondition(null)

    if (!over || active.id === over.id) {
      return
    }

    const activeIndex = conditions.findIndex(condition => condition.id === active.id)
    const overIndex = conditions.findIndex(condition => condition.id === over.id)

    if (activeIndex === -1 || overIndex === -1) {
      return
    }

    const newConditions = [...conditions]
    const [movedCondition] = newConditions.splice(activeIndex, 1)
    newConditions.splice(overIndex, 0, movedCondition)

    const updatedConditions = newConditions.map((condition, index) => ({
      ...condition,
      rank: index + 1
    }))
    setConditions(updatedConditions)

    // Update condition ranks via API
    try {
      setOperationLoading(true)

      if (!stage) {
        throw new Error('Stage is required for updating conditions')
      }

      console.log(
        'Updating condition order:',
        updatedConditions.map(c => ({ id: c.id, name: c.name, rank: c.rank }))
      )

      for (const condition of updatedConditions) {
        const cfg = getPipelineCatalogConfig(
          sourceApp || (stage.type as 'CRM' | 'IRM') || (stage.pipeline?.type as 'CRM' | 'IRM') || 'CRM'
        )
        const payload = {
          id: condition.id,
          code: condition.code,
          value: condition.name,
          alternativeCode: condition.alternativeCode,
          parentEntryId: `${cfg.stageCatalog}:${cfg.version}:${stage.code}`,
          additionalValue1: condition.rank.toString(), // Order stored here
          displayOrder: condition.rank,
          objectValue: condition.objectValue as any, // Convert to JSONValue
          translations: []
        }

        console.log(`Updating condition ${condition.name} with rank ${condition.rank}`)

        await catalogClient.updateCatalogEntry(cfg.conditionCatalog, cfg.version, condition.id, payload)
      }

      console.log('Condition order updated successfully')
    } catch (error) {
      console.error('Error updating condition order:', error)
      // Reload conditions to reset to server state
      await loadConditions()
    } finally {
      setOperationLoading(false)
    }
  }

  const handleAddCondition = () => {
    if (!stage) return

    console.log('Opening add condition modal, measurement units:', measurementUnits)

    // Ensure measurement units are loaded before opening modal
    if (measurementUnits.length === 0) {
      loadMeasurementUnits()
    }

    setEditingCondition(null)
    conditionForm.reset({
      name: '',
      description: '',
      generate_task: false,
      checked_type: 'User',
      deadline_enabled: false,
      deadline_duration: 1,
      deadline_duration_measurement_unit_ref: '',
      rank: conditions.length + 1
    })
    setIsConditionModalVisible(true)
  }

  const handleEditCondition = (condition: StageCondition) => {
    console.log('Opening edit condition modal, measurement units:', measurementUnits)
    console.log(
      'Condition deadline_duration_measurement_unit_ref:',
      condition.objectValue.deadline_duration_measurement_unit_ref
    )
    console.log('Condition objectValue:', condition.objectValue)

    // Ensure measurement units are loaded before opening modal
    if (measurementUnits.length === 0) {
      loadMeasurementUnits()
    }

    setEditingCondition(condition)
    conditionForm.reset({
      name: condition.name,
      description: condition.description,
      generate_task: condition.objectValue.generateTask || false,
      checked_type: condition.objectValue.check_type || 'User',
      deadline_enabled: condition.objectValue.deadline_enabled || false,
      deadline_duration: condition.objectValue.deadline_duration || 1,
      deadline_duration_measurement_unit_ref: condition.objectValue.deadline_duration_measurement_unit_ref || '',
      rank: condition.rank
    })
    setIsConditionModalVisible(true)
  }

  const handleDeleteCondition = (condition: StageCondition) => {
    setConditionToDelete(condition)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteCondition = async () => {
    if (!conditionToDelete) return

    try {
      setOperationLoading(true)

      await catalogClient.deleteCatalogEntry(
        SALES_PIPELINE_STAGE_CONDITION_CATALOG,
        SALES_PIPELINE_STAGE_CONDITION_VERSION,
        conditionToDelete.id
      )

      console.log(`Condition "${conditionToDelete.name}" deleted successfully`)

      // Remove from local state
      setConditions(prev => prev.filter(c => c.id !== conditionToDelete.id))
    } catch (error) {
      console.error('Error deleting condition:', error)
      // Reload conditions to reset to server state
      await loadConditions()
    } finally {
      setOperationLoading(false)
      setDeleteDialogOpen(false)
      setConditionToDelete(null)
    }
  }

  const handleConditionModalSubmit = async (values: ConditionFormData) => {
    if (!stage) return

    try {
      setOperationLoading(true)

      if (editingCondition) {
        const cfg = getPipelineCatalogConfig(
          (stage.type as 'CRM' | 'IRM') || (stage.pipeline?.type as 'CRM' | 'IRM') || 'CRM'
        )
        // Update existing condition
        const payload = {
          id: editingCondition.id,
          code: editingCondition.code,
          value: values.name,
          alternativeCode: editingCondition.alternativeCode,
          parentEntryId: `${cfg.stageCatalog}:${cfg.version}:${stage.code}`,
          additionalValue1: values.rank.toString(),
          objectValue: {
            description: values.description,
            generateTask: values.generate_task,
            check_type: values.checked_type,
            deadline_enabled: values.deadline_enabled,
            deadline_duration: values.deadline_duration,
            deadline_duration_measurement_unit_ref: values.deadline_duration_measurement_unit_ref
          } as any,
          translations: []
        }

        await catalogClient.updateCatalogEntry(cfg.conditionCatalog, cfg.version, editingCondition.id, payload)

        console.log(`Condition "${values.name}" updated successfully`)
      } else {
        // Create new condition
        const cfg = getPipelineCatalogConfig(
          sourceApp || (stage.type as 'CRM' | 'IRM') || (stage.pipeline?.type as 'CRM' | 'IRM') || 'CRM'
        )
        const code = `CONDITION_${Date.now()}` // Generate a unique code

        const payload = {
          code,
          value: values.name,
          alternativeCode: 'CONDITION',
          parentEntryId: `${cfg.stageCatalog}:${cfg.version}:${stage.code}`,
          additionalValue1: values.rank.toString(),
          displayOrder: values.rank,
          objectValue: {
            description: values.description,
            generateTask: values.generate_task,
            check_type: values.checked_type,
            deadline_enabled: values.deadline_enabled,
            deadline_duration: values.deadline_duration,
            deadline_duration_measurement_unit_ref: values.deadline_duration_measurement_unit_ref
          } as any,
          translations: []
        }

        await catalogClient.createCatalogEntry(cfg.conditionCatalog, cfg.version, payload)

        console.log(`Condition "${values.name}" created successfully`)
      }

      setIsConditionModalVisible(false)
      await loadConditions() // Reload conditions to get updated data
    } catch (error) {
      console.error('Error saving condition:', error)
    } finally {
      setOperationLoading(false)
    }
  }

  if (!stage) return null

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      width="50vw"
      centered
      maskClosable={false}
      title={<div className="gba:flex gba:items-center gba:gap-2">Stage Conditions: {stage.value}</div>}
      data-testid={`${prefixDataTestId}-stage-conditions-modal`}
    >
      <div className="gba:max-h-[80vh] gba:overflow-hidden gba:flex gba:flex-col">
        {/* Header with Add Condition Button - Outside scrollable area */}
        <div className="gba:flex gba:justify-between gba:items-center gba:px-6 gba:pb-4 gba:border-b gba:border-gray-200">
          <div>
            <h4 className="gba:text-lg gba:font-medium gba:mb-1">Configure Stage Conditions</h4>
            <p className="gba:text-gray-600 gba:text-sm">
              Drag and drop conditions to reorder them. Each condition represents a requirement for this stage.
            </p>
          </div>
          <Button
            onClick={handleAddCondition}
            className="gba:flex gba:items-center gba:gap-2"
            data-testid={`${prefixDataTestId}-add-condition-button`}
          >
            <Plus className="gba:w-4 gba:h-4" />
            Add Condition
          </Button>
        </div>

        <div className="gba:flex-1 gba:overflow-y-auto gba:p-6">
          {/* Loading State */}
          {isLoading && (
            <div className="gba:flex gba:justify-center gba:items-center gba:py-12">
              <Spinner className="gba:w-8 gba:h-8" />
              <span className="gba:ml-3 gba:text-gray-600">Loading conditions...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <Alert variant="destructive" className="gba:mb-6">
              <AlertDescription>
                Error loading conditions: {error}
                <Button variant="outline" size="sm" onClick={loadConditions} className="gba:ml-2">
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Conditions Content */}
          {!isLoading && !error && (
            <>
              {conditions.length === 0 ? (
                <div className="gba:flex gba:justify-center gba:items-center gba:py-12 gba:bg-gray-50 gba:rounded-lg gba:border-2 gba:border-dashed gba:border-gray-300">
                  <div className="gba:text-center">
                    <Plus className="gba:w-12 gba:h-12 gba:text-gray-400 gba:mb-4 gba:mx-auto" />
                    <h5 className="gba:text-lg gba:font-medium gba:text-gray-500 gba:mb-2">No Conditions Configured</h5>
                    <p className="gba:text-gray-400 gba:mb-4">
                      Add the first condition to define requirements for this stage
                    </p>
                  </div>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCorners}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <div className="gba:relative">
                    <SortableContext items={conditions.map(c => c.id)} strategy={verticalListSortingStrategy}>
                      <div className="gba:space-y-1">
                        {conditions.map((condition, index) => (
                          <DraggableConditionItem
                            key={condition.id}
                            condition={condition}
                            index={index + 1}
                            prefixDataTestId={prefixDataTestId}
                            onEdit={handleEditCondition}
                            onDelete={handleDeleteCondition}
                          />
                        ))}
                      </div>
                    </SortableContext>

                    <DragOverlay>
                      {activeCondition ? (
                        <div
                          style={{
                            opacity: 0.8,
                            transform: 'rotate(1deg)',
                            cursor: 'grabbing',
                            pointerEvents: 'none'
                          }}
                        >
                          <DraggableConditionItem
                            condition={activeCondition}
                            index={conditions.findIndex(c => c.id === activeCondition.id) + 1}
                            prefixDataTestId={prefixDataTestId}
                            onEdit={() => {}}
                            onDelete={() => {}}
                          />
                        </div>
                      ) : null}
                    </DragOverlay>
                  </div>
                </DndContext>
              )}
            </>
          )}
        </div>

        <div className="gba:flex gba:justify-end gba:pt-4 gba:border-t gba:border-gray-200 gba:mt-4">
          <Button variant="outline" onClick={onClose} data-testid={`${prefixDataTestId}-close-conditions-modal`}>
            Close
          </Button>
        </div>
      </div>

      {/* Condition Modal */}
      <Modal
        open={isConditionModalVisible}
        onCancel={() => setIsConditionModalVisible(false)}
        footer={null}
        width={800}
        centered
        title={editingCondition ? 'Edit Condition' : 'Add New Condition'}
        data-testid={`${prefixDataTestId}-condition-modal`}
      >
        <div>
          <Form {...conditionForm}>
            <form onSubmit={conditionForm.handleSubmit(handleConditionModalSubmit)} className="gba:space-y-6">
              {/* Basic Information Section */}
              <div className="gba:space-y-4">
                <h4 className="gba:font-medium gba:text-gray-900 gba:text-sm gba:border-b gba:border-gray-200 gba:pb-2">
                  Basic Information
                </h4>

                <FormField
                  control={conditionForm.control}
                  name="name"
                  rules={{ required: 'Please enter a condition name' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Condition Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Please Enter..."
                          data-testid={`${prefixDataTestId}-condition-name-input`}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={conditionForm.control}
                  name="description"
                  rules={{ required: 'Please enter a description' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Describe what this condition requires..."
                          rows={3}
                          data-testid={`${prefixDataTestId}-condition-description-input`}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Task Configuration Section */}
              <div className="gba:space-y-4 gba:border gba:border-gray-200 gba:rounded-lg gba:p-4 gba:bg-gray-50">
                <h4 className="gba:font-medium gba:text-gray-900 gba:text-sm">Task Configuration</h4>

                <FormField
                  control={conditionForm.control}
                  name="generate_task"
                  render={({ field }) => (
                    <FormItem className="gba:flex gba:flex-row gba:items-start gba:space-x-3 gba:space-y-0 gba:rounded-md gba:border gba:border-gray-200 gba:p-3 gba:bg-white">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid={`${prefixDataTestId}-condition-generate-task-checkbox`}
                        />
                      </FormControl>
                      <div className="gba:space-y-1 gba:leading-none">
                        <FormLabel className="gba:text-sm gba:font-medium">Generate Task</FormLabel>
                        <p className="gba:text-xs gba:text-gray-500">
                          Automatically create a task when this condition needs to be checked
                        </p>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={conditionForm.control}
                  name="checked_type"
                  rules={{ required: 'Please select who checks this condition' }}
                  render={({ field }) => (
                    <FormItem className="gba:flex gba:items-center gba:gap-4">
                      <FormLabel className="gba:w-24 gba:flex-shrink-0 gba:text-sm gba:font-medium">
                        Checked By
                      </FormLabel>
                      <div className="gba:flex-1">
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid={`${prefixDataTestId}-condition-checked-type-select`}>
                              <SelectValue placeholder="Select who checks this condition" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={field.value}>{field.value}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              {/* Deadline Configuration Section */}
              <div className="gba:space-y-4 gba:border gba:border-gray-200 gba:rounded-lg gba:p-4 gba:bg-gray-50">
                <div>
                  <h4 className="gba:font-medium gba:text-gray-900 gba:text-sm gba:mb-2">Deadline Configuration</h4>
                  <p className="gba:text-xs gba:text-gray-600 gba:leading-relaxed">
                    Deadlines are calculated from when the opportunity enters the current stage.
                    <br />
                    Set a time limit for completing this condition.
                  </p>
                </div>

                <FormField
                  control={conditionForm.control}
                  name="deadline_enabled"
                  render={({ field }) => (
                    <FormItem className="gba:flex gba:flex-row gba:items-start gba:space-x-3 gba:space-y-0 gba:rounded-md gba:border gba:border-gray-200 gba:p-3 gba:bg-white">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid={`${prefixDataTestId}-condition-deadline-enabled-checkbox`}
                        />
                      </FormControl>
                      <div className="gba:space-y-1 gba:leading-none">
                        <FormLabel className="gba:text-sm gba:font-medium">Enable Deadline</FormLabel>
                        <p className="gba:text-xs gba:text-gray-500">Set a deadline for completing this condition</p>
                      </div>
                    </FormItem>
                  )}
                />

                {conditionForm.watch('deadline_enabled') && (
                  <div className="gba:grid gba:grid-cols-2 gba:gap-4 gba:bg-white gba:p-3 gba:rounded-md gba:border gba:border-gray-200">
                    <FormField
                      control={conditionForm.control}
                      name="deadline_duration"
                      rules={{
                        required: 'Please enter deadline duration',
                        min: { value: 1, message: 'Duration must be at least 1' }
                      }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duration</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              min="1"
                              placeholder="1"
                              onChange={e => field.onChange(parseInt(e.target.value) || 1)}
                              data-testid={`${prefixDataTestId}-condition-deadline-duration-input`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={conditionForm.control}
                      name="deadline_duration_measurement_unit_ref"
                      rules={{ required: 'Please select measurement unit' }}
                      render={({ field }) => {
                        console.log(
                          'Rendering measurement unit dropdown. Field value:',
                          field.value,
                          'Available units:',
                          measurementUnits
                        )
                        return (
                          <FormItem>
                            <FormLabel>Unit</FormLabel>
                            <FormControl>
                              <select
                                value={field.value}
                                onChange={field.onChange}
                                className="gba:flex gba:h-10 gba:w-full gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:ring-offset-background gba:file:border-0 gba:file:bg-transparent gba:file:text-sm gba:file:font-medium gba:placeholder:text-muted-foreground gba:focus-visible:outline-none gba:focus-visible:ring-2 gba:focus-visible:ring-ring gba:focus-visible:ring-offset-2 gba:disabled:cursor-not-allowed gba:disabled:opacity-50"
                                data-testid={`${prefixDataTestId}-condition-measurement-unit-select`}
                              >
                                <option value="">Select unit</option>
                                {measurementUnits.map(unit => (
                                  <option key={unit.id} value={unit.id}>
                                    {unit.value}
                                  </option>
                                ))}
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="gba:flex gba:gap-3 gba:pt-6 gba:border-t gba:border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsConditionModalVisible(false)}
                  data-testid={`${prefixDataTestId}-condition-modal-cancel`}
                  className="gba:flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={operationLoading}
                  data-testid={`${prefixDataTestId}-condition-modal-submit`}
                  className="gba:flex-1"
                >
                  {operationLoading && <Spinner className="gba:w-4 gba:h-4 gba:mr-2" />}
                  {editingCondition ? 'Update Condition' : 'Create Condition'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteDialogOpen}
        onCancel={() => setDeleteDialogOpen(false)}
        footer={null}
        width={500}
        centered
        title="Delete Condition"
        data-testid={`${prefixDataTestId}-delete-condition-confirmation`}
      >
        <div className="gba:py-4">
          <p>Are you sure you want to delete condition "{conditionToDelete?.name}"? This action cannot be undone.</p>
        </div>

        <div className="gba:flex gba:gap-2 gba:pt-4">
          <Button
            variant="outline"
            onClick={() => setDeleteDialogOpen(false)}
            data-testid={`${prefixDataTestId}-delete-condition-cancel`}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={confirmDeleteCondition}
            disabled={operationLoading}
            data-testid={`${prefixDataTestId}-delete-condition-confirm`}
          >
            {operationLoading && <Spinner className="gba:w-4 gba:h-4 gba:mr-2" />}
            Delete
          </Button>
        </div>
      </Modal>
    </Modal>
  )
}
