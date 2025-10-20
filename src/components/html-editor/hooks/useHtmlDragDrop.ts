import { useState } from 'react'
import { useSensor, useSensors, PointerSensor, KeyboardSensor, DragOverEvent } from '@dnd-kit/core'
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable'
import { EditorElement, ColSpan } from '../types'
import { toColSpan, elementsToHtml } from '../utils/htmlParser'
import { groupIntoRows, getRowSpace } from '../utils/rowLayout'

interface UseDragDropProps {
  elements: EditorElement[]
  onElementsChange: (elements: EditorElement[], html: string) => void
}

export const useHtmlDragDrop = ({ elements, onElementsChange }: UseDragDropProps) => {
  const [dragOverRowIndex, setDragOverRowIndex] = useState<number | null>(null)
  const [suggestedResizes, setSuggestedResizes] = useState<Record<string, ColSpan>>({})
  const [originalSizes, setOriginalSizes] = useState<Record<string, ColSpan>>({})

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  const handleDragStart = (event: any) => {
    const draggedElement = elements.find(el => el.id === event.active.id)
    if (!draggedElement) return

    // Compute all potentially affected elements (all resizable elements from all rows)
    const rows = groupIntoRows(elements)
    const collectedOriginals: Record<string, ColSpan> = {}

    // Save the dragged element's original size
    collectedOriginals[draggedElement.id] = toColSpan(draggedElement.colSpan || 12)

    // Save all resizable elements' original sizes (they might need to shrink to make room)
    rows.forEach(row => {
      row.forEach(el => {
        if ((el.colSpan || 12) > 1 && el.id !== draggedElement.id) {
          collectedOriginals[el.id] = toColSpan(el.colSpan || 12)
        }
      })
    })

    // Save all original sizes in one deterministic functional update
    setOriginalSizes(prev => ({ ...prev, ...collectedOriginals }))
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) {
      setDragOverRowIndex(null)
      setSuggestedResizes({})
      return
    }

    // Find which row the "over" element belongs to
    const rows = groupIntoRows(elements)
    let targetRowIndex = -1

    for (let i = 0; i < rows.length; i++) {
      if (rows[i].some(el => el.id === over.id)) {
        targetRowIndex = i
        break
      }
    }

    if (targetRowIndex === -1) return

    const targetRow = rows[targetRowIndex]
    const draggedElement = elements.find(el => el.id === active.id)

    if (!draggedElement) return

    const draggedSpan = draggedElement.colSpan || 12
    const availableSpace = getRowSpace(targetRow)

    setDragOverRowIndex(targetRowIndex)

    // If element doesn't fit, calculate suggested resizes
    if (draggedSpan > availableSpace) {
      const totalNeeded = draggedSpan - availableSpace
      const resizableElements = targetRow.filter(el => (el.colSpan || 12) > 1)

      if (resizableElements.length === 0) {
        setSuggestedResizes({})
        return
      }

      // Distribute shrinkage evenly
      const shrinkPerElement = Math.ceil(totalNeeded / resizableElements.length)
      const newSizes: Record<string, ColSpan> = {}

      resizableElements.forEach(el => {
        const currentSpan = el.colSpan || 12
        const newSpan = toColSpan(currentSpan - shrinkPerElement)
        newSizes[el.id] = newSpan
      })

      setSuggestedResizes(newSizes)
    } else {
      setSuggestedResizes({})
    }
  }

  const handleDragEnd = (event: any) => {
    const { active, over } = event

    setDragOverRowIndex(null)

    if (over && active.id !== over.id) {
      const oldIndex = elements.findIndex(item => item.id === active.id)
      const newIndex = elements.findIndex(item => item.id === over.id)

      let newItems = arrayMove(elements, oldIndex, newIndex)

      // Apply suggested resizes if any
      if (Object.keys(suggestedResizes).length > 0) {
        newItems = newItems.map(el => {
          if (suggestedResizes[el.id]) {
            return { ...el, colSpan: suggestedResizes[el.id] }
          }
          return el
        })
      }

      const newHtml = elementsToHtml(newItems)
      onElementsChange(newItems, newHtml)
    } else {
      // Drag cancelled - revert suggested resizes
      if (Object.keys(suggestedResizes).length > 0) {
        const revertedItems = elements.map(el => {
          if (originalSizes[el.id]) {
            return { ...el, colSpan: originalSizes[el.id] }
          }
          return el
        })
        const newHtml = elementsToHtml(revertedItems)
        onElementsChange(revertedItems, newHtml)
      }
    }

    // Clear suggestions and originals
    setSuggestedResizes({})
    setOriginalSizes({})
  }

  return {
    sensors,
    dragOverRowIndex,
    suggestedResizes,
    handleDragStart,
    handleDragOver,
    handleDragEnd
  }
}
