import { useState } from 'react'
import { useSensor, useSensors, PointerSensor, KeyboardSensor, DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { FieldGroup, FieldDefinition } from '../types'
import { parseDisplayOrder, groupFieldsIntoRows, recalculateDisplayOrders } from '../utils/displayOrderUtils'

interface UseFieldDragDropProps {
  fieldGroups: FieldGroup[]
  selectedGroupIndex: number
  onChange: (fieldGroups: FieldGroup[]) => void
}

export const useFieldDragDrop = ({ fieldGroups, selectedGroupIndex, onChange }: UseFieldDragDropProps) => {
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) return

    const currentGroup = fieldGroups[selectedGroupIndex]
    if (!currentGroup) return

    const oldField = currentGroup.fields.find(f => f.id === active.id)
    const newField = currentGroup.fields.find(f => f.id === over.id)

    if (!oldField || !newField) return

    const oldPos = parseDisplayOrder(oldField.displayOrder)
    const newPos = parseDisplayOrder(newField.displayOrder)

    // Get current rows
    const rows = groupFieldsIntoRows(currentGroup.fields)

    // Find the old and new positions
    const oldRowIndex = rows.findIndex(r => r.row === oldPos.row)
    const oldColIndex = rows[oldRowIndex]?.fields.findIndex(f => f.id === oldField.id) ?? -1

    const newRowIndex = rows.findIndex(r => r.row === newPos.row)
    const newColIndex = rows[newRowIndex]?.fields.findIndex(f => f.id === newField.id) ?? -1

    if (oldRowIndex === -1 || oldColIndex === -1 || newRowIndex === -1 || newColIndex === -1) return

    // Remove from old position
    const [movedField] = rows[oldRowIndex].fields.splice(oldColIndex, 1)

    // Insert at new position
    rows[newRowIndex].fields.splice(newColIndex, 0, movedField)

    // Recalculate all display orders
    const updatedFields = recalculateDisplayOrders(rows)

    const updatedGroups = [...fieldGroups]
    updatedGroups[selectedGroupIndex] = {
      ...currentGroup,
      fields: updatedFields
    }

    onChange(updatedGroups)
  }

  const getActiveField = (fieldGroups: FieldGroup[], selectedGroupIndex: number): FieldDefinition | null => {
    if (!activeId) return null
    const currentGroup = fieldGroups[selectedGroupIndex]
    return currentGroup?.fields.find(f => f.id === activeId) || null
  }

  return {
    sensors,
    activeId,
    handleDragStart,
    handleDragEnd,
    getActiveField
  }
}
