import React, { useState, useEffect } from 'react'
import {
  Card,
  Button,
  Spinner,
  Alert,
  AlertDescription,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@newwork/nw-design-system'
import { Plus, Edit, Trash2, Eye, GripVertical, ArrowRight } from 'lucide-react'
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
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { PipelineStageEntry } from '../hooks/usePipelineSettings'
import { usePipelineUsageCheck } from '../hooks/usePipelineUsageCheck'
import StageForm from './StageForm'

interface StagesFormProps extends BusinessAppContextProps {
  pipeline: any
  catalogConfig: {
    stageCatalog: string
    conditionCatalog?: string
    version?: string
  }
  onStagesChange: (stages: PipelineStageEntry[]) => void
  onViewConditions: (stage: PipelineStageEntry) => void
  onStagesUpdated?: () => void
  prefixDataTestId?: string
}

// Stage type configurations for UI
const STAGE_TYPE_CONFIGS = {
  DISCOVERY: { label: 'Discovery', variant: 'offline' as const },
  QUALIFICATION: { label: 'Qualification', variant: 'info' as const },
  NEGOTIATION: { label: 'Negotiation', variant: 'warning' as const },
  CLOSED_WON: { label: 'Closed Won', variant: 'success' as const },
  CLOSED_LOST: { label: 'Closed Lost', variant: 'destructive' as const }
} as const

// Draggable Stage Card Component
const DraggableStageCard: React.FC<{
  stage: PipelineStageEntry
  conditionCount: number
  prefixDataTestId?: string
  onEdit: (stage: PipelineStageEntry) => void
  onDelete: (stage: PipelineStageEntry) => void
  onViewConditions: (stage: PipelineStageEntry) => void
}> = ({ stage, conditionCount, prefixDataTestId, onEdit, onDelete, onViewConditions }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stage.id
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  const stageType = stage.type || stage.alternativeCode || 'DISCOVERY'
  const stageConfig = STAGE_TYPE_CONFIGS[stageType as keyof typeof STAGE_TYPE_CONFIGS] || STAGE_TYPE_CONFIGS.DISCOVERY

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`gba:relative gba:group gba:border-2 gba:border-border gba:hover:border-primary gba:transition-all gba:duration-200 gba:w-72 ${isDragging ? 'gba:opacity-50' : ''}`}
      data-testid={`${prefixDataTestId}-stage-card-${stage.id}`}
    >
      {/* Action buttons in top right */}
      <div className="gba:absolute gba:top-2 gba:right-2 gba:flex gba:gap-1 gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity gba:z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(stage)}
          data-testid={`${prefixDataTestId}-edit-stage-${stage.id}`}
        >
          <Edit />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(stage)}
          className="gba:text-destructive gba:hover:text-destructive"
          data-testid={`${prefixDataTestId}-delete-stage-${stage.id}`}
        >
          <Trash2 />
        </Button>
      </div>

      <div className="gba:p-4">
        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
          <div
            {...attributes}
            {...listeners}
            className="gba:cursor-grab gba:text-muted-foreground gba:hover:text-foreground gba:p-1 gba:flex-shrink-0 gba:select-none"
            style={{ touchAction: 'none' }}
          >
            <GripVertical className="gba:w-4 gba:h-4" />
          </div>
          <div className="gba:flex-1 gba:min-w-0">
            <div className="gba:flex gba:items-center gba:gap-2">
              <h5 className="gba:text-foreground gba:font-medium gba:text-sm gba:leading-tight gba:truncate">
                {stage.value}
              </h5>
              <Badge variant={stageConfig.variant} className="gba:text-xs gba:px-1.5 gba:py-0.5">
                {stageConfig.label}
              </Badge>
            </div>
          </div>
        </div>

        {/* Conditions Count */}
        <div className="gba:mt-auto">
          <div className="gba:flex gba:items-center gba:justify-between gba:bg-muted gba:rounded-lg gba:p-2">
            <div className="gba:flex gba:items-center gba:gap-1">
              <div className="gba:w-2 gba:h-2 gba:bg-warning gba:rounded-full"></div>
              <span className="gba:text-xs gba:text-muted-foreground">Conditions</span>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2">
              <span className="gba:text-sm gba:font-semibold gba:text-warning">{conditionCount}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onViewConditions(stage)}
                className="gba:h-6 gba:w-6"
                data-testid={`${prefixDataTestId}-view-conditions-${stage.id}`}
              >
                <Eye className="gba:w-3 gba:h-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

const StagesForm: React.FC<StagesFormProps> = ({
  pipeline,
  catalogConfig,
  onStagesChange,
  onViewConditions,
  onStagesUpdated,
  prefixDataTestId = 'stages-form',
  accessToken
}) => {
  const [stages, setStages] = useState<PipelineStageEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [operationLoading, setOperationLoading] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingStage, setEditingStage] = useState<PipelineStageEntry | null>(null)
  const [conditionCounts, setConditionCounts] = useState<Record<string, number>>({})
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [stageToDelete, setStageToDelete] = useState<PipelineStageEntry | null>(null)
  const [isCannotDeleteDialogOpen, setIsCannotDeleteDialogOpen] = useState(false)
  const [stageCannotDelete, setStageCannotDelete] = useState<
    (PipelineStageEntry & { totalOpportunityCount?: number }) | null
  >(null)

  const catalogClient = useCatalogManagerClient(accessToken)
  const { checkStageUsage } = usePipelineUsageCheck(accessToken, 'CRM')

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5
      }
    })
  )

  // Fetch stages for the pipeline
  const fetchStages = async () => {
    if (!pipeline) return

    try {
      setIsLoading(true)
      setError(null)

      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: catalogConfig.stageCatalog,
          version: catalogConfig.version || 'v1'
        },
        {
          limit: 1000,
          offset: 0,
          returnTotalRecords: true,
          includeChildCatalogEntries: true
        }
      )

      // Filter stages for this pipeline and transform
      const pipelineStages = response.data
        .filter(entry => entry.parentEntryId === pipeline.id)
        .map(entry => ({
          id: entry.id,
          parentEntryId: entry.parentEntryId || '',
          code: entry.code || '',
          value: entry.value,
          displayOrder: entry.displayOrder || Number.parseInt(entry.additionalValue1 || '0') || 0,
          alternativeCode: entry.alternativeCode || 'DISCOVERY',
          type: entry.type || entry.alternativeCode || 'DISCOVERY',
          additionalValue1: entry.additionalValue1 || '0',
          additionalValue2: entry.additionalValue2 || undefined,
          additionalValue3: entry.additionalValue3 || undefined,
          objectValue: entry.objectValue as Record<string, any>
        }))
        .sort((a, b) => a.displayOrder - b.displayOrder)

      setStages(pipelineStages)
      onStagesChange(pipelineStages)

      // Fetch condition counts for all stages
      const stageIds = pipelineStages.map(stage => stage.id)
      await fetchConditionCounts(stageIds)
    } catch (err) {
      console.error('Error fetching stages:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch stages')
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch condition counts for stages
  const fetchConditionCounts = async (stageIds: string[]) => {
    if (!catalogConfig.conditionCatalog) return

    try {
      const counts: Record<string, number> = {}

      // Fetch conditions for all stages in parallel
      await Promise.all(
        stageIds.map(async stageId => {
          try {
            const response = await catalogClient.getCatalogEntriesList(
              {
                catalogIdentifier: catalogConfig.conditionCatalog!,
                version: catalogConfig.version || 'v1'
              },
              {
                limit: 1000,
                offset: 0,
                returnTotalRecords: true,
                includeChildCatalogEntries: true
              }
            )

            // Count conditions for this stage
            const stageConditions = response.data.filter(entry => entry.parentEntryId === stageId)
            counts[stageId] = stageConditions.length
          } catch (err) {
            console.error(`Error fetching conditions for stage ${stageId}:`, err)
            counts[stageId] = 0
          }
        })
      )

      setConditionCounts(counts)
    } catch (err) {
      console.error('Error fetching condition counts:', err)
    }
  }

  // Load stages when pipeline changes
  useEffect(() => {
    if (pipeline) {
      fetchStages()
    }
  }, [pipeline])

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    setActiveId(active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) return

    const oldIndex = stages.findIndex(stage => stage.id === active.id)
    const newIndex = stages.findIndex(stage => stage.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    // Reorder stages locally
    const newStages = [...stages]
    const [movedStage] = newStages.splice(oldIndex, 1)
    newStages.splice(newIndex, 0, movedStage)

    // Update display orders
    const updatedStages = newStages.map((stage, index) => ({
      ...stage,
      displayOrder: index + 1
    }))

    setStages(updatedStages)
    onStagesChange(updatedStages)

    // Update on server
    try {
      setOperationLoading(true)
      await Promise.all(
        updatedStages.map(async stage => {
          // Fetch current stage data to preserve all fields
          const currentStage = await catalogClient.getCatalogEntryById(stage.id)

          const updateData = {
            // Required fields
            id: stage.id,
            code: stage.code,
            value: stage.value,
            type: stage.type || stage.alternativeCode,
            alternativeCode: stage.type || stage.alternativeCode,
            parentEntryId: stage.parentEntryId || currentStage.parentEntryId,
            displayOrder: stage.displayOrder,

            // Additional fields - preserve existing values
            additionalValue1: stage.displayOrder.toString().padStart(2, '0'),
            additionalValue2: currentStage.additionalValue2 || undefined,
            additionalValue3: currentStage.additionalValue3 || undefined,
            objectValue: stage.objectValue || currentStage.objectValue || {}
          }

          return catalogClient.updateCatalogEntry(
            catalogConfig.stageCatalog,
            catalogConfig.version || 'v1',
            stage.id,
            updateData
          )
        })
      )
    } catch (err) {
      console.error('Error updating stage order:', err)
      // Revert on error
      fetchStages()
    } finally {
      setOperationLoading(false)
      onStagesUpdated?.()
    }
  }

  // Stage management handlers
  const handleDeleteStage = async (stage: PipelineStageEntry) => {
    // Check usage before proceeding
    const usage = await checkStageUsage(stage.id)

    if (usage.isInUse) {
      // Stage is in use - show "cannot delete" dialog
      setStageCannotDelete({
        ...stage,
        totalOpportunityCount: usage.totalCount
      })
      setIsCannotDeleteDialogOpen(true)
    } else {
      // Stage is NOT in use - show delete confirmation
      setStageToDelete(stage)
      setIsDeleteConfirmOpen(true)
    }
  }

  const confirmDeleteStage = async () => {
    if (!stageToDelete) return

    try {
      setOperationLoading(true)

      // First, delete all conditions for this stage
      if (catalogConfig.conditionCatalog) {
        try {
          const response = await catalogClient.getCatalogEntriesList(
            {
              catalogIdentifier: catalogConfig.conditionCatalog,
              version: catalogConfig.version || 'v1'
            },
            {
              limit: 1000,
              offset: 0,
              returnTotalRecords: true,
              includeChildCatalogEntries: true
            }
          )

          // Filter conditions for this stage
          const stageConditions = response.data.filter(entry => entry.parentEntryId === stageToDelete.id)

          // Delete all conditions in parallel
          if (stageConditions.length > 0) {
            await Promise.all(
              stageConditions.map(condition =>
                catalogClient.deleteCatalogEntry(
                  catalogConfig.conditionCatalog!,
                  catalogConfig.version || 'v1',
                  condition.id
                )
              )
            )
          }
        } catch (err) {
          console.error('Error deleting stage conditions:', err)
          // Continue with stage deletion even if conditions fail
        }
      }

      // Then delete the stage
      await catalogClient.deleteCatalogEntry(
        catalogConfig.stageCatalog,
        catalogConfig.version || 'v1',
        stageToDelete.id
      )

      setIsDeleteConfirmOpen(false)
      setStageToDelete(null)
      await fetchStages()
      onStagesUpdated?.()
    } catch (err) {
      console.error('Error deleting stage:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete stage')
    } finally {
      setOperationLoading(false)
    }
  }

  const openCreateModal = () => {
    setIsCreateModalOpen(true)
  }

  const openEditModal = (stage: PipelineStageEntry) => {
    setEditingStage(stage)
    setIsEditModalOpen(true)
  }

  const handleStageSuccess = () => {
    fetchStages()
    onStagesUpdated?.()
  }

  const activeStage = stages.find(stage => stage.id === activeId)

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:py-8">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" className="gba:border-destructive-secondary gba:bg-destructive-secondary">
        <AlertDescription>
          {error}
          <Button variant="outline" size="sm" onClick={fetchStages} className="gba:ml-2">
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <>
      <div className="gba:space-y-4">
        <div className="gba:flex gba:justify-between gba:items-center">
          <h3 className="gba:text-lg gba:font-semibold">Stages ({stages.length})</h3>
          <Button
            onClick={openCreateModal}
            disabled={operationLoading}
            data-testid={`${prefixDataTestId}-add-stage-button`}
          >
            <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
            Add Stage
          </Button>
        </div>

        {stages.length === 0 ? (
          <div className="gba:min-h-32 gba:flex gba:items-center gba:justify-center gba:bg-muted gba:rounded-lg gba:p-8">
            <p className="gba:text-muted-foreground gba:text-center">
              No stages defined for this pipeline yet.
              <br />
              Click "Add Stage" to create the first one.
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="gba:flex gba:flex-wrap gba:gap-4">
              <SortableContext items={stages.map(s => s.id)} strategy={rectSortingStrategy}>
                {stages.map((stage, index) => (
                  <React.Fragment key={stage.id}>
                    <DraggableStageCard
                      stage={stage}
                      conditionCount={conditionCounts[stage.id] || 0}
                      prefixDataTestId={prefixDataTestId}
                      onEdit={openEditModal}
                      onDelete={handleDeleteStage}
                      onViewConditions={onViewConditions}
                    />

                    {index < stages.length - 1 && (
                      <div className="gba:flex gba:items-center gba:px-2 gba:flex-shrink-0 gba:mt-8">
                        <ArrowRight className="gba:w-5 gba:h-5 gba:text-muted-foreground" />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </SortableContext>
            </div>
            <DragOverlay dropAnimation={null}>
              {activeStage ? (
                <DraggableStageCard
                  stage={activeStage}
                  conditionCount={conditionCounts[activeStage.id] || 0}
                  prefixDataTestId={prefixDataTestId}
                  onEdit={() => {}}
                  onDelete={() => {}}
                  onViewConditions={() => {}}
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Create Stage Modal */}
      <StageForm
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleStageSuccess}
        pipeline={pipeline}
        catalogConfig={catalogConfig}
        prefixDataTestId={prefixDataTestId}
        accessToken={accessToken}
      />

      {/* Edit Stage Modal */}
      <StageForm
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setEditingStage(null)
        }}
        onSuccess={handleStageSuccess}
        editingStage={editingStage}
        pipeline={pipeline}
        catalogConfig={catalogConfig}
        prefixDataTestId={prefixDataTestId}
        accessToken={accessToken}
      />

      {/* Delete Confirmation Dialog - Only shown when NOT in use */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Stage</DialogTitle>
            <DialogDescription>Are you sure you want to delete "{stageToDelete?.value}"?</DialogDescription>
          </DialogHeader>
          <div className="gba:space-y-4">
            <div className="gba:p-3 gba:bg-success-secondary gba:rounded-lg gba:border gba:border-success">
              <span className="gba:block gba:text-success-secondary-foreground gba:font-semibold">
                ✓ Stage is not currently in use
              </span>
              <span className="gba:block gba:mt-1 gba:text-success-secondary-foreground gba:text-sm">
                This stage can be safely deleted.
              </span>
            </div>
            <div>
              <span className="gba:block gba:text-warning gba:font-semibold gba:mb-2">
                This will permanently delete:
              </span>
              <ul className="gba:list-disc gba:list-inside gba:space-y-1 gba:text-sm">
                <li>The stage itself</li>
                <li>All {conditionCounts[stageToDelete?.id || ''] || 0} conditions</li>
              </ul>
              <span className="gba:block gba:mt-2 gba:text-destructive gba:font-semibold">
                This action cannot be undone.
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteConfirmOpen(false)
                setStageToDelete(null)
              }}
              disabled={operationLoading}
              data-testid={`${prefixDataTestId}-delete-cancel-button`}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteStage}
              disabled={operationLoading}
              data-testid={`${prefixDataTestId}-delete-confirm-button`}
            >
              {operationLoading ? 'Deleting...' : 'Delete Stage'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cannot Delete Dialog - Shown when stage is in use */}
      <Dialog open={isCannotDeleteDialogOpen} onOpenChange={setIsCannotDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cannot Delete Stage</DialogTitle>
            <DialogDescription>
              The stage "{stageCannotDelete?.value}" cannot be deleted because it is currently in use.
            </DialogDescription>
          </DialogHeader>
          <div className="gba:space-y-4">
            <div className="gba:p-3 gba:bg-destructive-secondary gba:rounded-lg gba:border gba:border-destructive">
              <span className="gba:block gba:text-destructive-secondary-foreground gba:font-semibold gba:mb-2">
                ⚠️ Stage is Currently in Use
              </span>
              <ul className="gba:list-disc gba:list-inside gba:space-y-1 gba:text-sm gba:text-destructive-secondary-foreground">
                <li>{stageCannotDelete?.totalOpportunityCount || 0} opportunities are using this stage</li>
              </ul>
              <span className="gba:block gba:mt-2 gba:text-destructive-secondary-foreground gba:text-sm">
                To delete this stage, you must first move or delete all opportunities that reference it.
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="default"
              onClick={() => {
                setIsCannotDeleteDialogOpen(false)
                setStageCannotDelete(null)
              }}
              data-testid={`${prefixDataTestId}-cannot-delete-confirm-button`}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default StagesForm
