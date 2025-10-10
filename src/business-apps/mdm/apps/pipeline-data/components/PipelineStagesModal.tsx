import React, { useState, useEffect } from 'react'
import { Modal } from 'antd'
import {
  Card,
  Badge,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { Plus, Edit, Trash2, ArrowRight, GripVertical, Eye } from 'lucide-react'
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
import { SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useForm } from 'react-hook-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useSalesPipelineStages } from '../hooks/useSalesPipelineStages'
import { useStageConditions } from '../hooks/useStageConditions'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { getPipelineCatalogConfig } from '../utils/catalogConfig'
import {
  EnhancedSalesPipeline,
  EnhancedSalesPipelineStage,
  StageType,
  STAGE_TYPE_CONFIGS,
  StageFormData
} from '../types'
import { CatalogEntry } from '@/common/types/CatalogTypes'
import { convertToScreamingSnakeCase } from '../utils'
import { StageConditionsModal } from './StageConditionsModal'

interface PipelineStagesModalProps extends BusinessAppContextProps {
  pipeline: EnhancedSalesPipeline | null
  visible: boolean
  onClose: () => void
  prefixDataTestId?: string
  sourceApp?: 'CRM' | 'IRM'
}

// Helper function to transform catalog entry to enhanced stage
const transformCatalogEntryToStage = (
  entry: CatalogEntry,
  pipeline: EnhancedSalesPipeline
): EnhancedSalesPipelineStage => {
  const rank = parseInt(entry.additionalValue1 || '0') || 0
  const stageType = entry.alternativeCode as StageType
  const config = STAGE_TYPE_CONFIGS[stageType] || STAGE_TYPE_CONFIGS[StageType.DISCOVERY]

  return {
    id: entry.id,
    parentEntryId: entry.parentEntryId || pipeline.id,
    code: entry.code,
    alternativeCode: stageType,
    value: entry.value,
    additionalValue1: entry.additionalValue1 || '0',
    objectValue:
      typeof entry.objectValue === 'object' && entry.objectValue !== null
        ? (entry.objectValue as Record<string, any>)
        : {},
    pipeline,
    rank,
    stageTypeName: config.label,
    stageTypeColor: config.color,
    isFirst: false,
    isLast: false
  }
}

// Draggable Stage Card Component
const DraggableStageCard: React.FC<{
  stage: EnhancedSalesPipelineStage
  prefixDataTestId?: string
  conditionCount: number
  isLoadingConditions: boolean
  onEdit: (stage: EnhancedSalesPipelineStage) => void
  onDelete: (stage: EnhancedSalesPipelineStage) => void
  onViewConditions: (stage: EnhancedSalesPipelineStage) => void
}> = ({ stage, prefixDataTestId, conditionCount, isLoadingConditions, onEdit, onDelete, onViewConditions }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stage.id,
    data: {
      type: 'stage',
      stage
    }
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  const getStageTypeVariant = (color: string) => {
    switch (color) {
      case 'green':
        return 'default'
      case 'blue':
        return 'secondary'
      case 'orange':
        return 'warning'
      case 'red':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const getBorderColor = (color: string) => {
    switch (color) {
      case 'green':
        return 'gba:border-t-green-500'
      case 'blue':
        return 'gba:border-t-blue-500'
      case 'orange':
        return 'gba:border-t-orange-500'
      case 'red':
        return 'gba:border-t-red-500'
      case 'cyan':
        return 'gba:border-t-cyan-500'
      default:
        return 'gba:border-t-blue-500'
    }
  }

  return (
    <div ref={setNodeRef} style={style} data-testid={`${prefixDataTestId}-draggable-stage-card-${stage.id}`}>
      <Card
        className={`gba:w-60 gba:h-52 gba:border-gray-200 hover:gba:border-blue-400 hover:gba:shadow-md gba:transition-all gba:cursor-pointer gba:border-t-4 ${getBorderColor(stage.stageTypeColor)} gba:relative`}
      >
        {/* Edit and Delete buttons in top right corner */}
        <div className="gba:absolute gba:top-2 gba:right-2 gba:flex gba:gap-1 gba:z-10">
          <Button
            variant="ghost"
            size="sm"
            onClick={e => {
              e.stopPropagation()
              onEdit(stage)
            }}
            className="gba:text-gray-400 hover:gba:text-blue-500 gba:p-1 gba:h-6 gba:w-6"
            data-testid={`${prefixDataTestId}-edit-stage-${stage.id}`}
          >
            <Edit className="gba:w-3 gba:h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={e => {
              e.stopPropagation()
              onDelete(stage)
            }}
            className="gba:text-gray-400 hover:gba:text-red-500 gba:p-1 gba:h-6 gba:w-6"
            data-testid={`${prefixDataTestId}-delete-stage-${stage.id}`}
          >
            <Trash2 className="gba:w-3 gba:h-3" />
          </Button>
        </div>

        <div className="gba:p-4 gba:pr-16 gba:flex gba:flex-col gba:h-full">
          <div className="gba:flex gba:items-start gba:gap-2 gba:mb-3">
            <div
              {...attributes}
              {...listeners}
              className="gba:cursor-grab gba:text-gray-400 hover:gba:text-gray-600 gba:p-1"
            >
              <GripVertical className="gba:w-4 gba:h-4" />
            </div>
            <div className="gba:flex-1">
              <div className="gba:text-gray-800 gba:font-medium gba:mb-2 gba:leading-tight">{stage.value}</div>
              <Badge variant={getStageTypeVariant(stage.stageTypeColor)} className="gba:text-xs gba:px-2 gba:py-1">
                {stage.stageTypeName}
              </Badge>
            </div>
          </div>

          {/* Stage Statistics */}
          <div className="gba:mt-auto gba:-mr-12">
            {/* Conditions Indicator with View Button */}
            <div className="gba:bg-gray-50 gba:rounded-lg gba:p-2 gba:border gba:border-gray-200">
              <div className="gba:flex gba:justify-between gba:items-center gba:gap-2">
                <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1">
                  <div className="gba:w-2 gba:h-2 gba:bg-orange-500 gba:rounded-full gba:flex-shrink-0"></div>
                  <span className="gba:text-xs gba:font-medium gba:text-gray-700 gba:flex-shrink-0">Conditions:</span>
                  {isLoadingConditions ? (
                    <Spinner className="gba:w-3 gba:h-3" />
                  ) : (
                    <span
                      className="gba:text-xs gba:font-semibold gba:text-orange-600"
                      data-testid={`${prefixDataTestId}-stage-condition-count-${stage.id}`}
                    >
                      {conditionCount}
                    </span>
                  )}
                </div>

                {/* View Conditions Button */}
                <Button
                  onClick={e => {
                    e.stopPropagation()
                    onViewConditions(stage)
                  }}
                  variant="outline"
                  className="gba:flex gba:items-center gba:gap-1 gba:px-2 gba:py-1 gba:h-7"
                  size="sm"
                  data-testid={`${prefixDataTestId}-view-conditions-${stage.id}`}
                >
                  <Eye className="gba:w-3 gba:h-3" />
                  <span className="gba:text-xs">View</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

export const PipelineStagesModal: React.FC<PipelineStagesModalProps> = ({
  pipeline,
  visible,
  onClose,
  prefixDataTestId,
  sourceApp,
  ...context
}) => {
  const [stages, setStages] = useState<EnhancedSalesPipelineStage[]>([])
  const [originalStageEntries, setOriginalStageEntries] = useState<CatalogEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [operationLoading, setOperationLoading] = useState(false)

  // Condition counts state
  const [conditionCounts, setConditionCounts] = useState<Record<string, number>>({})
  const [loadingConditions, setLoadingConditions] = useState<Record<string, boolean>>({})

  // Stage modal states
  const [isStageModalVisible, setIsStageModalVisible] = useState(false)
  const [editingStage, setEditingStage] = useState<EnhancedSalesPipelineStage | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [stageToDelete, setStageToDelete] = useState<EnhancedSalesPipelineStage | null>(null)

  // Conditions modal states
  const [isConditionsModalVisible, setIsConditionsModalVisible] = useState(false)
  const [selectedStageForConditions, setSelectedStageForConditions] = useState<EnhancedSalesPipelineStage | null>(null)

  const stageForm = useForm<StageFormData>({
    defaultValues: {
      code: '',
      value: '',
      alternativeCode: StageType.DISCOVERY,
      parentEntryId: '',
      rank: 1
    }
  })

  // Drag and drop states
  const [activeStage, setActiveStage] = useState<EnhancedSalesPipelineStage | null>(null)

  const { fetchSalesPipelineStagesByParent } = useSalesPipelineStages(context)
  const { fetchStageConditionsCount } = useStageConditions(context)
  const catalogClient = useCatalogManagerClient(context.accessToken)

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    })
  )

  // Load stages when pipeline changes
  useEffect(() => {
    if (pipeline && visible) {
      loadStages()
    }
  }, [pipeline, visible])

  // Load condition counts when stages change
  useEffect(() => {
    if (stages.length > 0) {
      loadConditionCounts()
    }
  }, [stages])

  const loadStages = async () => {
    if (!pipeline) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetchSalesPipelineStagesByParent(pipeline.id, {
        sourceApp: sourceApp || (pipeline.type as 'CRM' | 'IRM') || 'CRM'
      })

      const filteredEntries = response.data.filter(entry => entry.parentEntryId === pipeline.id)
      setOriginalStageEntries(filteredEntries)

      const pipelineStages = filteredEntries
        .map(entry => transformCatalogEntryToStage(entry, pipeline))
        .sort((a, b) => a.rank - b.rank)

      if (pipelineStages.length > 0) {
        pipelineStages[0].isFirst = true
        pipelineStages[pipelineStages.length - 1].isLast = true
      }

      setStages(pipelineStages)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load pipeline stages'
      setError(errorMsg)
      console.error('Error loading pipeline stages:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const loadConditionCounts = async () => {
    const counts: Record<string, number> = {}
    const loading: Record<string, boolean> = {}

    // Set loading state for all stages
    stages.forEach(stage => {
      loading[stage.id] = true
    })
    setLoadingConditions(loading)

    // Fetch condition counts for each stage
    const promises = stages.map(async stage => {
      try {
        const count = await fetchStageConditionsCount(
          stage.code,
          sourceApp || (stage.pipeline?.type as 'CRM' | 'IRM') || 'CRM'
        )
        counts[stage.id] = count
        loading[stage.id] = false
      } catch (error) {
        console.error(`Error loading conditions for stage ${stage.code}:`, error)
        counts[stage.id] = 0
        loading[stage.id] = false
      }
    })

    await Promise.all(promises)

    setConditionCounts(counts)
    setLoadingConditions(loading)
  }

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const stage = stages.find(s => s.id === active.id)
    setActiveStage(stage || null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveStage(null)

    if (!over || active.id === over.id) {
      return
    }

    const activeIndex = stages.findIndex(stage => stage.id === active.id)
    const overIndex = stages.findIndex(stage => stage.id === over.id)

    if (activeIndex === -1 || overIndex === -1) {
      return
    }

    const newStages = [...stages]
    const [movedStage] = newStages.splice(activeIndex, 1)
    newStages.splice(overIndex, 0, movedStage)

    const updatedStages = newStages.map((stage, index) => ({
      ...stage,
      rank: index + 1,
      isFirst: index === 0,
      isLast: index === newStages.length - 1
    }))
    setStages(updatedStages)

    await updateStageRanks(updatedStages)
  }

  const updateStageRanks = async (updatedStages: EnhancedSalesPipelineStage[]) => {
    try {
      setOperationLoading(true)

      for (const stage of updatedStages) {
        const originalEntry = originalStageEntries.find(entry => entry.id === stage.id)
        if (originalEntry) {
          const payload = {
            id: stage.id,
            code: stage.code,
            value: stage.value,
            alternativeCode: stage.alternativeCode,
            parentEntryId: stage.parentEntryId,
            additionalValue1: stage.rank.toString(),
            displayOrder: stage.rank,
            objectValue: stage.objectValue || {},
            translations: []
          }

          await catalogClient.updateCatalogEntry(stage.id, payload)
        }
      }
    } catch (error) {
      console.error('Error updating stage ranks:', error)
      // Reload stages to reset to server state
      await loadStages()
    } finally {
      setOperationLoading(false)
    }
  }

  const handleAddStage = () => {
    if (!pipeline) return

    setEditingStage(null)
    stageForm.reset({
      code: '',
      value: '',
      alternativeCode: StageType.DISCOVERY,
      parentEntryId: pipeline.id,
      rank: stages.length + 1
    })
    setIsStageModalVisible(true)
  }

  const handleEditStage = (stage: EnhancedSalesPipelineStage) => {
    setEditingStage(stage)
    stageForm.reset({
      code: stage.code,
      value: stage.value,
      alternativeCode: stage.alternativeCode,
      parentEntryId: stage.parentEntryId,
      rank: stage.rank
    })
    setIsStageModalVisible(true)
  }

  const handleDeleteStage = (stage: EnhancedSalesPipelineStage) => {
    setStageToDelete(stage)
    setDeleteDialogOpen(true)
  }

  const handleViewConditions = (stage: EnhancedSalesPipelineStage) => {
    setSelectedStageForConditions(stage)
    setIsConditionsModalVisible(true)
  }

  const confirmDeleteStage = async () => {
    if (!stageToDelete) return

    try {
      setOperationLoading(true)
      await catalogClient.deleteCatalogEntry(stageToDelete.id)
      console.log(`Stage "${stageToDelete.value}" deleted successfully`)
      await loadStages()
    } catch (error) {
      console.error('Error deleting stage:', error)
    } finally {
      setOperationLoading(false)
      setDeleteDialogOpen(false)
      setStageToDelete(null)
    }
  }

  const handleStageModalSubmit = async (values: StageFormData) => {
    if (!pipeline) return

    try {
      setOperationLoading(true)

      if (editingStage) {
        // Update existing stage
        const payload = {
          id: editingStage.id,
          code: values.code,
          value: values.value,
          alternativeCode: values.alternativeCode,
          parentEntryId: editingStage.parentEntryId,
          additionalValue1: values.rank.toString(),
          displayOrder: values.rank,
          objectValue: editingStage.objectValue || {},
          translations: []
        }

        await catalogClient.updateCatalogEntry(editingStage.id, payload)
        console.log(`Stage "${values.value}" updated successfully`)
      } else {
        // Create new stage
        const code = convertToScreamingSnakeCase(values.value)

        const payload = {
          code,
          value: values.value,
          alternativeCode: values.alternativeCode,
          parentEntryId: pipeline.id,
          additionalValue1: values.rank.toString(),
          displayOrder: values.rank,
          objectValue: {},
          translations: []
        }

        const cfg = getPipelineCatalogConfig((pipeline?.type as 'CRM' | 'IRM') || 'CRM')
        await catalogClient.createCatalogEntry(cfg.stageCatalog, cfg.version, payload)
        console.log(`Stage "${values.value}" created successfully`)
      }

      setIsStageModalVisible(false)
      await loadStages()
    } catch (error) {
      console.error('Error saving stage:', error)
    } finally {
      setOperationLoading(false)
    }
  }

  if (!pipeline) return null

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      width={isConditionsModalVisible ? '20vw' : '95vw'}
      centered
      maskClosable={false}
      data-testid={`${prefixDataTestId}-pipeline-stages-modal`}
      title={
        <div className="gba:flex gba:items-center gba:gap-2">
          {isConditionsModalVisible ? (
            <span className="gba:text-sm gba:truncate">Stages</span>
          ) : (
            <>
              Pipeline Stages: {pipeline.value}
              <Badge variant="secondary" className="gba:ml-2">
                {pipeline.type}
              </Badge>
            </>
          )}
        </div>
      }
    >
      <div className="gba:max-h-[80vh] gba:overflow-hidden gba:flex gba:flex-col">
        <div className="gba:flex-1 gba:overflow-y-auto gba:py-4">
          {!isConditionsModalVisible && (
            <>
              {/* Header with Add Stage Button */}
              <div className="gba:flex gba:justify-between gba:items-center gba:mb-6 gba:pb-4 gba:border-b gba:border-gray-200">
                <div>
                  <h4 className="gba:text-lg gba:font-medium gba:mb-1">Configure Pipeline Stages</h4>
                  <p className="gba:text-gray-600 gba:text-sm">
                    Drag and drop stages to reorder them. Each stage represents a step in your{' '}
                    {pipeline.type === 'CRM' ? 'sales' : 'investment'} process.
                  </p>
                </div>
                <Button
                  onClick={handleAddStage}
                  className="gba:flex gba:items-center gba:gap-2"
                  data-testid={`${prefixDataTestId}-add-stage-button`}
                >
                  <Plus className="gba:w-4 gba:h-4" />
                  Add Stage
                </Button>
              </div>
            </>
          )}

          {isConditionsModalVisible ? (
            <div className="gba:flex gba:justify-center gba:items-center gba:py-8">
              <div className="gba:text-center">
                <div className="gba:w-8 gba:h-8 gba:bg-blue-100 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:mx-auto gba:mb-2">
                  <span className="gba:text-xs gba:font-medium gba:text-blue-600">{stages.length}</span>
                </div>
                <p className="gba:text-xs gba:text-gray-500">Stages</p>
              </div>
            </div>
          ) : (
            <>
              {/* Loading State */}
              {isLoading && (
                <div className="gba:flex gba:justify-center gba:items-center gba:py-12">
                  <Spinner className="gba:w-8 gba:h-8" />
                  <span className="gba:ml-3 gba:text-gray-600">Loading stages...</span>
                </div>
              )}

              {/* Error State */}
              {error && (
                <Alert variant="destructive" className="gba:mb-6">
                  <AlertDescription>
                    Error loading stages: {error}
                    <Button variant="outline" size="sm" onClick={loadStages} className="gba:ml-2">
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* Stages Content */}
              {!isLoading && !error && (
                <>
                  {stages.length === 0 ? (
                    <div className="gba:flex gba:justify-center gba:items-center gba:py-12 gba:bg-gray-50 gba:rounded-lg gba:border-2 gba:border-dashed gba:border-gray-300">
                      <div className="gba:text-center">
                        <Plus className="gba:w-12 gba:h-12 gba:text-gray-400 gba:mb-4 gba:mx-auto" />
                        <h5 className="gba:text-lg gba:font-medium gba:text-gray-500 gba:mb-2">No Stages Configured</h5>
                        <p className="gba:text-gray-400 gba:mb-4">
                          Add the first stage to define your {pipeline.type === 'CRM' ? 'sales' : 'investment'} process
                        </p>
                        <Button onClick={handleAddStage} className="gba:flex gba:items-center gba:gap-2">
                          <Plus className="gba:w-4 gba:h-4" />
                          Add Stage
                        </Button>
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
                        <SortableContext items={stages.map(s => s.id)} strategy={rectSortingStrategy}>
                          {/* Changed to flex-wrap layout for responsive horizontal flow */}
                          <div className="gba:flex gba:flex-wrap gba:gap-4 gba:pb-4 gba:items-start">
                            {stages.map((stage, index) => (
                              <React.Fragment key={stage.id}>
                                <div className="gba:flex-shrink-0">
                                  <DraggableStageCard
                                    stage={stage}
                                    prefixDataTestId={prefixDataTestId}
                                    conditionCount={conditionCounts[stage.id] || 0}
                                    isLoadingConditions={loadingConditions[stage.id] || false}
                                    onEdit={handleEditStage}
                                    onDelete={handleDeleteStage}
                                    onViewConditions={handleViewConditions}
                                  />
                                </div>
                                {/* Arrow between stages (only if not last stage) */}
                                {index < stages.length - 1 && (
                                  <div className="gba:flex gba:items-center gba:px-2 gba:flex-shrink-0 gba:mt-8">
                                    <ArrowRight className="gba:w-5 gba:h-5 gba:text-gray-400" />
                                  </div>
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        </SortableContext>

                        <DragOverlay dropAnimation={null}>
                          {activeStage ? (
                            <div
                              style={{
                                opacity: 0.8,
                                transform: 'rotate(3deg)',
                                cursor: 'grabbing',
                                pointerEvents: 'none'
                              }}
                            >
                              <DraggableStageCard
                                stage={activeStage}
                                prefixDataTestId={prefixDataTestId}
                                conditionCount={conditionCounts[activeStage.id] || 0}
                                isLoadingConditions={loadingConditions[activeStage.id] || false}
                                onEdit={() => {}}
                                onDelete={() => {}}
                                onViewConditions={() => {}}
                              />
                            </div>
                          ) : null}
                        </DragOverlay>
                      </div>
                    </DndContext>
                  )}
                </>
              )}
            </>
          )}
        </div>

        <div className="gba:flex gba:justify-end gba:pt-4 gba:border-t gba:border-gray-200 gba:mt-4">
          <Button variant="outline" onClick={onClose} data-testid={`${prefixDataTestId}-close-stages-modal`}>
            Close
          </Button>
        </div>
      </div>

      {/* Stage Modal */}
      <Modal
        open={isStageModalVisible}
        onCancel={() => setIsStageModalVisible(false)}
        footer={null}
        width={500}
        centered
        title={editingStage ? 'Edit Stage' : 'Add New Stage'}
        data-testid={`${prefixDataTestId}-stage-modal`}
      >
        <div>
          <Form {...stageForm}>
            <form onSubmit={stageForm.handleSubmit(handleStageModalSubmit)} className="gba:space-y-4">
              <FormField
                control={stageForm.control}
                name="value"
                rules={{ required: 'Please enter a stage name' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stage Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Please Enter..."
                        data-testid={`${prefixDataTestId}-stage-name-input`}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={stageForm.control}
                name="alternativeCode"
                rules={{ required: 'Please select a stage type' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stage Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid={`${prefixDataTestId}-stage-type-select`}>
                          <SelectValue placeholder="Select Stage Type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(StageType).map(type => {
                          const config = STAGE_TYPE_CONFIGS[type]
                          return (
                            <SelectItem key={type} value={type}>
                              {config.label}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="gba:flex gba:gap-2 gba:pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsStageModalVisible(false)}
                  data-testid={`${prefixDataTestId}-stage-modal-cancel`}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={operationLoading}
                  data-testid={`${prefixDataTestId}-stage-modal-submit`}
                >
                  {operationLoading && <Spinner className="gba:w-4 gba:h-4 gba:mr-2" />}
                  {editingStage ? 'Update' : 'Create'}
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
        title="Delete Stage"
        data-testid={`${prefixDataTestId}-delete-stage-confirmation`}
      >
        <div className="gba:py-4">
          <p>Are you sure you want to delete stage "{stageToDelete?.value}"? This action cannot be undone.</p>
        </div>

        <div className="gba:flex gba:gap-2 gba:pt-4">
          <Button
            variant="outline"
            onClick={() => setDeleteDialogOpen(false)}
            data-testid={`${prefixDataTestId}-delete-stage-cancel`}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={confirmDeleteStage}
            disabled={operationLoading}
            data-testid={`${prefixDataTestId}-delete-stage-confirm`}
          >
            {operationLoading && <Spinner className="gba:w-4 gba:h-4 gba:mr-2" />}
            Delete
          </Button>
        </div>
      </Modal>

      {/* Stage Conditions Modal */}
      <StageConditionsModal
        stage={selectedStageForConditions}
        visible={isConditionsModalVisible}
        onClose={async () => {
          setIsConditionsModalVisible(false)
          setSelectedStageForConditions(null)
          // Reload condition counts when modal is closed
          await loadConditionCounts()
        }}
        prefixDataTestId={prefixDataTestId}
        {...context}
      />
    </Modal>
  )
}
