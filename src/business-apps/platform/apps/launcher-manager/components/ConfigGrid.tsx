import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button } from '@newwork/nw-design-system'
import { CatalogEntry } from '@/common/data/catalog'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowsDownUp, FloppyDisk, Pencil, Trash } from '@phosphor-icons/react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@newwork/nw-design-system'
import * as Phosphor from '@phosphor-icons/react'

// Separate delete confirmation component to avoid ref forwarding issues
const DeleteConfirmation: React.FC<{
  itemName: string
  onDelete: () => void
  dataTestId: string
}> = ({ itemName, onDelete, dataTestId }) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" data-testid={dataTestId}>
          <Trash className="gba:w-4 gba:h-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Card</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{itemName}"? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onDelete()
              setIsOpen(false)
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

interface ConfigGridProps {
  items: CatalogEntry[]
  isEditMode: boolean
  onSaveOrder: (orderedIds: string[]) => Promise<void> | void
  onEdit: (item: CatalogEntry) => void
  onDelete?: (id: string) => Promise<void> | void
  dataTestIdPrefix: string
}

const SortableItem: React.FC<{
  item: CatalogEntry
  isEdit: boolean
  prefix: string
  onEdit: (item: CatalogEntry) => void
  onDelete?: (id: string) => void | Promise<void>
}> = ({ item, isEdit, prefix, onEdit, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  const description = item.additionalValue1 || ''
  const url = item.additionalValue2 || ''
  const iconName = item.additionalValue3 || ''
  const IconComp =
    iconName && (Phosphor as any)[iconName]
      ? ((Phosphor as any)[iconName] as React.ComponentType<{ className?: string }>)
      : null

  return (
    <div ref={setNodeRef} style={style} data-testid={`${prefix}-ConfigCard-${item.id}`}>
      <Card className="gba:h-full">
        <CardHeader>
          <div className="gba:flex gba:items-center gba:justify-between">
            <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0">
              {IconComp && <IconComp className="gba:w-4 gba:h-4" />}
              <CardTitle className="gba:text-base gba:truncate">{item.value}</CardTitle>
            </div>
            <div className="gba:flex gba:items-center gba:gap-1">
              <Button variant="ghost" size="sm" onClick={() => onEdit(item)} data-testid={`${prefix}-Edit-${item.id}`}>
                <Pencil className="gba:w-4 gba:h-4" />
              </Button>
              {onDelete && (
                <DeleteConfirmation
                  itemName={item.value || 'Unnamed Card'}
                  onDelete={() => onDelete(item.id)}
                  dataTestId={`${prefix}-Delete-${item.id}`}
                />
              )}
              {isEdit && (
                <button
                  {...attributes}
                  {...listeners}
                  className="gba:text-gray-500 gba:cursor-grab"
                  data-testid={`${prefix}-DragHandle-${item.id}`}
                  title="Drag to reorder"
                >
                  <ArrowsDownUp className="gba:w-4 gba:h-4" />
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="gba:text-sm gba:text-gray-600 gba:space-y-1">
            {description && (
              <div className="gba:truncate">
                <span className="gba:text-gray-500">Description:</span> {description}
              </div>
            )}
            {url && (
              <div className="gba:truncate">
                <span className="gba:text-gray-500">Url:</span> {url}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export const ConfigGrid: React.FC<ConfigGridProps> = ({
  items,
  isEditMode,
  onSaveOrder,
  onEdit,
  onDelete,
  dataTestIdPrefix
}) => {
  const [ordered, setOrdered] = useState(items)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  )

  React.useEffect(() => {
    setOrdered(items)
  }, [items])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = ordered.findIndex(i => i.id === active.id)
    const newIndex = ordered.findIndex(i => i.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    setOrdered(arrayMove(ordered, oldIndex, newIndex))
  }

  const saveOrder = async () => {
    const ids = ordered.map(i => i.id)
    await onSaveOrder(ids)
  }

  return (
    <div data-testid={`${dataTestIdPrefix}-ConfigGrid`}>
      {isEditMode && (
        <div className="gba:flex gba:justify-end gba:mb-2">
          <Button onClick={saveOrder} data-testid={`${dataTestIdPrefix}-SaveOrderButton`}>
            <FloppyDisk className="gba:w-4 gba:h-4" />
            Save order
          </Button>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ordered.map(i => i.id)} strategy={rectSortingStrategy}>
          <div className="gba:grid gba:grid-cols-3 gba:gap-4">
            {ordered.map(item => (
              <SortableItem
                key={item.id}
                item={item}
                isEdit={isEditMode}
                prefix={dataTestIdPrefix}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {!ordered.length && (
        <div className="gba:text-sm gba:text-gray-500" data-testid={`${dataTestIdPrefix}-ConfigEmpty`}>
          No cards available
        </div>
      )}
    </div>
  )
}
