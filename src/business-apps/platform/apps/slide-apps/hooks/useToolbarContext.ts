/**
 * useToolbarContext Hook
 *
 * Determines the active toolbar context based on element selection.
 * Used by SlideToolbarRibbon to show contextual formatting tools.
 */

import { useMemo } from 'react'
import type {
  AnySlideElement,
  TextElement,
  ShapeElement,
  ImageElement,
  VideoElement,
  ChartElement,
  CodeElement,
  TableElement
} from '../components/slideElements'

export type ToolbarContextType = 'none' | 'text' | 'shape' | 'image' | 'video' | 'chart' | 'code' | 'table' | 'multi'

export type ToolbarContext =
  | { type: 'none' }
  | { type: 'text'; element: TextElement }
  | { type: 'shape'; element: ShapeElement }
  | { type: 'image'; element: ImageElement }
  | { type: 'video'; element: VideoElement }
  | { type: 'chart'; element: ChartElement }
  | { type: 'code'; element: CodeElement }
  | { type: 'table'; element: TableElement }
  | { type: 'multi'; count: number; elements: AnySlideElement[] }

export interface UseToolbarContextOptions {
  selectedElement: AnySlideElement | null
  selectedElements?: AnySlideElement[]
  selectedCount: number
}

export interface UseToolbarContextReturn {
  context: ToolbarContext
  contextType: ToolbarContextType
  hasSelection: boolean
  isMultiSelect: boolean
}

export function useToolbarContext({
  selectedElement,
  selectedElements = [],
  selectedCount
}: UseToolbarContextOptions): UseToolbarContextReturn {
  return useMemo(() => {
    if (selectedCount > 1) {
      const allSameType =
        selectedElements.length > 0 && selectedElements.every(e => e.type === selectedElements[0].type)
      if (allSameType) {
        const elementType = selectedElements[0].type
        const context = { type: elementType, element: selectedElements[0] } as ToolbarContext
        return {
          context,
          contextType: elementType as ToolbarContextType,
          hasSelection: true,
          isMultiSelect: true
        }
      }
      return {
        context: { type: 'multi', count: selectedCount, elements: selectedElements },
        contextType: 'multi' as const,
        hasSelection: true,
        isMultiSelect: true
      }
    }

    if (!selectedElement) {
      return {
        context: { type: 'none' },
        contextType: 'none' as const,
        hasSelection: false,
        isMultiSelect: false
      }
    }

    const elementType = selectedElement.type
    const context = { type: elementType, element: selectedElement } as ToolbarContext

    return {
      context,
      contextType: elementType as ToolbarContextType,
      hasSelection: true,
      isMultiSelect: false
    }
  }, [selectedElement, selectedElements, selectedCount])
}
