import React, { useState, useEffect } from 'react'
import {
  Card,
  Button,
  Spinner,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@newwork/nw-design-system'
import {
  CheckSquareIcon,
  ClockIcon,
  DotsSixVerticalIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon
} from '@phosphor-icons/react'
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
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import ConditionForm from './ConditionForm'
import { DeleteConfirmationDialog } from '../../components/DeleteConfirmationDialog'
import { getCatalogUsageCheckSpecs, useCatalogDeleteAvailability } from '../../hooks/useCatalogDeleteAvailability'
import { type DeleteAvailability } from '../../types/catalogTypes'

interface ConditionsFormProps extends BusinessAppContextProps {
  isOpen: boolean
  onClose: () => void
  selectedStage: any
  catalogConfig: {
    conditionCatalog: string
    version?: string
  }
  onConditionsUpdated?: () => void
  prefixDataTestId?: string
}

// Draggable Condition Item Component
const DraggableConditionItem: React.FC<{
  condition: any
  index: number
  prefixDataTestId?: string
  onEdit: (condition: any) => void
  onDelete: (condition: any) => void
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
    transition
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid={`${prefixDataTestId}-draggable-condition-${condition.id}`}
      className={`${isDragging ? 'gba:opacity-50' : ''}`}
    >
      <Card className="gba:border-border gba:hover:border-primary/40 gba:hover:shadow-sm gba:transition-all gba:cursor-pointer gba:relative">
        <div className="gba:p-2 gba:flex gba:items-center gba:gap-2">
          {/* Order Number */}
          <div className="gba:flex-shrink-0 gba:w-6 gba:h-6 gba:bg-muted gba:rounded-full gba:flex gba:items-center gba:justify-center gba:text-xs gba:font-medium gba:text-muted-foreground">
            {index}
          </div>

          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="gba:cursor-grab gba:text-muted-foreground hover:gba:text-foreground gba:p-1 gba:flex-shrink-0 gba:select-none gba:touch-none"
          >
            <DotsSixVerticalIcon className="gba:w-4 gba:h-4" />
          </div>

          {/* Condition Content */}
          <div className="gba:flex-1 gba:min-w-0">
            {/* Header with name and badges */}
            <div className="gba:flex gba:items-start gba:justify-between gba:gap-2 gba:mb-1">
              <div className="gba:flex-1 gba:min-w-0">
                <h5 className="gba:text-foreground gba:font-medium gba:text-sm gba:leading-tight gba:truncate">
                  {condition.value}
                </h5>
              </div>

              {/* Configuration Badges */}
              <div className="gba:flex gba:gap-1 gba:flex-shrink-0">
                {condition.objectValue?.generateTask && (
                  <Badge
                    variant="secondary"
                    className="gba:text-xs gba:px-1.5 gba:py-0.5 gba:flex gba:items-center gba:gap-1"
                  >
                    <CheckSquareIcon className="gba:w-3 gba:h-3" />
                    Task
                  </Badge>
                )}
                {condition.objectValue?.deadline_enabled && (
                  <Badge
                    variant="outline"
                    className="gba:text-xs gba:px-1.5 gba:py-0.5 gba:flex gba:items-center gba:gap-1"
                  >
                    <ClockIcon className="gba:w-3 gba:h-3" />
                    {condition.objectValue.deadline_duration} days
                  </Badge>
                )}
              </div>
            </div>

            {/* Description and checked by info */}
            <div className="gba:flex gba:items-start gba:justify-between gba:gap-1">
              <p className="gba:text-muted-foreground gba:text-xs gba:leading-tight gba:flex-1 gba:truncate">
                {condition.objectValue?.description || condition.additionalValue1 || 'No description'}
              </p>
              <div className="gba:flex gba:items-center gba:gap-1 gba:flex-shrink-0">
                <span className="gba:text-xs gba:text-muted-foreground">Checked by:</span>
                <Badge variant="secondary" className="gba:text-xs gba:px-1.5 gba:py-0.5">
                  {condition.objectValue?.check_type || 'User'}
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
              className="gba:text-muted-foreground hover:gba:text-foreground gba:p-1 gba:h-7 gba:w-7"
              data-testid={`${prefixDataTestId}-edit-condition-${condition.id}`}
            >
              <PencilSimpleIcon className="gba:w-3.5 gba:h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={e => {
                e.stopPropagation()
                onDelete(condition.id)
              }}
              className="gba:text-muted-foreground hover:gba:text-destructive gba:p-1 gba:h-7 gba:w-7"
              data-testid={`${prefixDataTestId}-delete-condition-${condition.id}`}
            >
              <TrashIcon className="gba:w-3.5 gba:h-3.5" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

const ConditionsForm: React.FC<ConditionsFormProps> = ({
  isOpen,
  onClose,
  selectedStage,
  catalogConfig,
  onConditionsUpdated,
  prefixDataTestId = 'conditions-form',
  accessToken
}) => {
  const [conditions, setConditions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [operationLoading, setOperationLoading] = useState(false)
  const [activeCondition, setActiveCondition] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingCondition, setEditingCondition] = useState<any>(null)
  const [conditionToDelete, setConditionToDelete] = useState<any>(null)
  const [deleteAvailability, setDeleteAvailability] = useState<DeleteAvailability | undefined>()

  const catalogClient = useCatalogManagerClient(accessToken)
  const getConditionDeleteAvailability = useCatalogDeleteAvailability(
    accessToken,
    'Condition',
    getCatalogUsageCheckSpecs(catalogConfig.conditionCatalog)
  )

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5
      }
    })
  )

  // Fetch conditions for the selected stage
  const fetchConditions = async (stageId: string) => {
    if (!catalogConfig.conditionCatalog || !stageId) return

    setIsLoading(true)
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
          includeTranslations: true,
          includeChildCatalogEntries: true
        }
      )

      // Filter conditions for this stage
      const stageConditions = response.data.filter(entry => entry.parentEntryId === stageId)
      const sortedConditions = stageConditions.toSorted((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
      setConditions(sortedConditions)
    } catch (err) {
      console.error('Error fetching conditions:', err)
      setConditions([])
    } finally {
      setIsLoading(false)
    }
  }

  // Load conditions when stage changes
  useEffect(() => {
    if (isOpen && selectedStage) {
      fetchConditions(selectedStage.id)
    }
  }, [isOpen, selectedStage])

  // Drag and drop handlers
  const handleConditionDragStart = (event: DragStartEvent) => {
    const { active } = event
    setActiveCondition(active.id as string)
  }

  const handleConditionDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveCondition(null)

    if (!over || active.id === over.id || !selectedStage) {
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

    // Update display order for all conditions
    const updatedConditions = newConditions.map((condition, index) => ({
      ...condition,
      displayOrder: index + 1,
      additionalValue1: (index + 1).toString()
    }))

    setConditions(updatedConditions)

    // Update ranks on server
    try {
      setOperationLoading(true)
      await Promise.all(
        updatedConditions.map(async condition => {
          // Fetch current condition data to preserve all fields
          const currentCondition = await catalogClient.readCatalogEntryById(condition.id, { includeTranslations: true })

          const updateData = {
            // Required fields
            id: condition.id,
            code: condition.code,
            value: condition.value,
            localeCode: currentCondition.localeCode,
            alternativeCode: condition.alternativeCode,
            parentEntryId: condition.parentEntryId || currentCondition.parentEntryId,
            displayOrder: condition.displayOrder,

            // Additional fields - preserve existing values
            additionalValue1: condition.displayOrder.toString(),
            additionalValue2: currentCondition.additionalValue2 || undefined,
            additionalValue3: currentCondition.additionalValue3 || undefined,
            objectValue: condition.objectValue || currentCondition.objectValue || {},
            translations: currentCondition.translations || condition.translations || []
          }

          return catalogClient.updateCatalogEntry(
            catalogConfig.conditionCatalog,
            catalogConfig.version || 'v1',
            condition.id,
            updateData
          )
        })
      )
    } catch (err) {
      console.error('Error updating condition ranks:', err)
      // Reload conditions to reset to server state
      await fetchConditions(selectedStage.id)
    } finally {
      setOperationLoading(false)
      onConditionsUpdated?.()
    }
  }

  // Condition management handlers
  const handleDeleteCondition = async (conditionId: string) => {
    const condition = conditions.find(item => item.id === conditionId)
    if (!condition) return

    setConditionToDelete(condition)
    setDeleteAvailability(undefined)
    setOperationLoading(true)

    try {
      setDeleteAvailability(await getConditionDeleteAvailability(condition))
    } catch (error) {
      console.error('Failed to check condition delete availability:', error)
      setDeleteAvailability({
        status: 'blocked',
        reason: 'Unable to verify whether this condition can be deleted.'
      })
    } finally {
      setOperationLoading(false)
    }
  }

  const handleCancelDeleteCondition = () => {
    if (operationLoading) return
    setConditionToDelete(null)
    setDeleteAvailability(undefined)
  }

  const confirmDeleteCondition = async () => {
    if (!selectedStage || !conditionToDelete || deleteAvailability?.status === 'blocked') return

    try {
      setOperationLoading(true)
      await catalogClient.deleteCatalogEntry(
        catalogConfig.conditionCatalog,
        catalogConfig.version || 'v1',
        conditionToDelete.id
      )
      await fetchConditions(selectedStage.id)
      onConditionsUpdated?.()
      handleCancelDeleteCondition()
    } catch (err) {
      console.error('Error deleting condition:', err)
    } finally {
      setOperationLoading(false)
    }
  }

  const renderConditionsContent = () => {
    if (isLoading) {
      return (
        <div className="gba:flex gba:justify-center gba:py-8" data-testid={`${prefixDataTestId}-loading`}>
          <Spinner size="lg" />
        </div>
      )
    }

    if (conditions.length === 0) {
      return (
        <div className="gba:min-h-32 gba:flex gba:items-center gba:justify-center gba:bg-muted gba:rounded-lg gba:p-8">
          <p className="gba:text-muted-foreground gba:text-center">
            No conditions defined for this stage yet.
            <br />
            Click "Add Condition" to create the first one.
          </p>
        </div>
      )
    }

    const activeConditionData = conditions.find(c => c.id === activeCondition)
    const activeConditionIndex = activeConditionData ? conditions.findIndex(c => c.id === activeCondition) + 1 : 0

    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleConditionDragStart}
        onDragEnd={handleConditionDragEnd}
      >
        <div className="gba:space-y-2">
          <SortableContext items={conditions.map(c => c.id)} strategy={verticalListSortingStrategy}>
            {conditions.map((condition, index) => (
              <DraggableConditionItem
                key={condition.id}
                condition={condition}
                index={index + 1}
                prefixDataTestId={prefixDataTestId}
                onEdit={openEditModal}
                onDelete={handleDeleteCondition}
              />
            ))}
          </SortableContext>

          <DragOverlay dropAnimation={null}>
            {activeConditionData ? (
              <div className="gba:opacity-80 gba:rotate-1 gba:cursor-grabbing gba:pointer-events-none">
                <DraggableConditionItem
                  condition={activeConditionData}
                  index={activeConditionIndex}
                  prefixDataTestId={prefixDataTestId}
                  onEdit={() => {}}
                  onDelete={() => {}}
                />
              </div>
            ) : null}
          </DragOverlay>
        </div>
      </DndContext>
    )
  }

  const openCreateModal = () => {
    setIsCreateModalOpen(true)
  }

  const openEditModal = (condition: any) => {
    setEditingCondition(condition)
    setIsEditModalOpen(true)
  }

  const handleConditionSuccess = () => {
    if (selectedStage) {
      fetchConditions(selectedStage.id)
      onConditionsUpdated?.()
    }
  }

  if (!selectedStage) {
    return null
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          className="gba:flex gba:flex-col gba:max-h-screen gba:overflow-hidden"
          data-testid={`${prefixDataTestId}-dialog`}
        >
          <DialogHeader className="gba:flex-shrink-0">
            <DialogTitle>Conditions for: {selectedStage?.value}</DialogTitle>
            <DialogDescription>Manage conditions for this stage.</DialogDescription>
          </DialogHeader>

          <div className="gba:flex gba:flex-shrink-0 gba:justify-between gba:items-center gba:gap-2 gba:pb-2">
            <h3 className="gba:text-lg gba:font-semibold">Conditions ({conditions.length})</h3>
            <Button
              onClick={openCreateModal}
              disabled={operationLoading}
              data-testid={`${prefixDataTestId}-add-condition-button`}
            >
              <PlusIcon className="gba:w-4 gba:h-4 gba:mr-2" />
              Add Condition
            </Button>
          </div>

          <div
            className="gba:min-h-0 gba:flex-1 gba:overflow-y-auto gba:pr-1"
            data-testid={`${prefixDataTestId}-conditions-scroll`}
          >
            {renderConditionsContent()}
          </div>

          <DialogFooter className="gba:flex-shrink-0">
            <Button variant="outline" onClick={onClose} data-testid={`${prefixDataTestId}-close-button`}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Condition Modal */}
      <ConditionForm
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleConditionSuccess}
        selectedStage={selectedStage}
        catalogConfig={catalogConfig}
        prefixDataTestId={prefixDataTestId}
        accessToken={accessToken}
      />

      {/* Edit Condition Modal */}
      <ConditionForm
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setEditingCondition(null)
        }}
        onSuccess={handleConditionSuccess}
        editingCondition={editingCondition}
        selectedStage={selectedStage}
        catalogConfig={catalogConfig}
        prefixDataTestId={prefixDataTestId}
        accessToken={accessToken}
      />

      <DeleteConfirmationDialog
        open={!!conditionToDelete}
        itemName={conditionToDelete?.value || ''}
        itemType="Condition"
        availability={deleteAvailability}
        isChecking={operationLoading && !deleteAvailability}
        isDeleting={operationLoading}
        onCancel={handleCancelDeleteCondition}
        onConfirm={confirmDeleteCondition}
        dataTestId={`${prefixDataTestId}-delete-dialog`}
      />
    </>
  )
}

export default ConditionsForm
