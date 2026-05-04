// Build selection-aware state for the slide context menu.

import { useCallback, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import type { AnySlideElement } from '../components/slideElements'

export type SlideContextMenuKind =
  | 'canvas-empty'
  | 'single-text'
  | 'single-shape'
  | 'single-media'
  | 'single-data'
  | 'single-group'
  | 'single-decorative'
  | 'single-other'
  | 'multi-selection'
  | 'mixed-selection'
  | 'locked-selection'

export interface SlideContextMenuCapabilities {
  canCopy: boolean
  canCut: boolean
  canPaste: boolean
  canDuplicate: boolean
  canDelete: boolean
  canEditText: boolean
  canEditPoints: boolean
  canBringForward: boolean
  canSendBackward: boolean
  canAlign: boolean
  canDistribute: boolean
  canFlip: boolean
  canGroup: boolean
  canUngroup: boolean
  canLock: boolean
  canUnlock: boolean
}

export interface SlideContextMenuState {
  kind: SlideContextMenuKind
  targetElementId: string | null
  selectionIds: string[]
  selectedElements: AnySlideElement[]
  singleElement: AnySlideElement | null
  selectionCount: number
  hasUnlockedSelection: boolean
  hasLockedSelection: boolean
  canEdit: boolean
  hasClipboardContent: boolean
  capabilities: SlideContextMenuCapabilities
}

interface BuildSlideContextMenuStateParams {
  elements: AnySlideElement[]
  selectedIds: Iterable<string>
  targetElementId: string | null
  canEdit: boolean
  hasClipboardContent: boolean
}

interface ResolveContextMenuSelectionIdsParams {
  targetElementId: string | null
  selectedIds: Iterable<string>
}

export interface UseSlideContextMenuParams {
  elements: AnySlideElement[]
  selectedIds: Set<string>
  canEdit: boolean
  hasClipboardContent: boolean
  onSelectElements: (ids: Set<string>) => void
}

export interface UseSlideContextMenuResult {
  contextMenuState: SlideContextMenuState
  handleContextMenuCapture: (event: ReactMouseEvent<HTMLElement>) => void
}

const EMPTY_CAPABILITIES: SlideContextMenuCapabilities = {
  canCopy: true,
  canCut: false,
  canPaste: false,
  canDuplicate: false,
  canDelete: false,
  canEditText: false,
  canEditPoints: false,
  canBringForward: false,
  canSendBackward: false,
  canAlign: false,
  canDistribute: false,
  canFlip: false,
  canGroup: false,
  canUngroup: false,
  canLock: false,
  canUnlock: false
}

export const INITIAL_SLIDE_CONTEXT_MENU_STATE: SlideContextMenuState = {
  kind: 'canvas-empty',
  targetElementId: null,
  selectionIds: [],
  selectedElements: [],
  singleElement: null,
  selectionCount: 0,
  hasUnlockedSelection: false,
  hasLockedSelection: false,
  canEdit: false,
  hasClipboardContent: false,
  capabilities: EMPTY_CAPABILITIES
}

function getContextMenuTargetElement(target: EventTarget | null): HTMLElement | null {
  if (target instanceof HTMLElement) {
    return target
  }

  if (target instanceof Node) {
    return target.parentElement
  }

  return null
}

export function getSlideContextMenuTargetElementId(target: EventTarget | null): string | null {
  const targetElement = getContextMenuTargetElement(target)
  if (!targetElement) {
    return null
  }

  const slideElement = targetElement.closest('[data-slide-element="true"]')
  if (!(slideElement instanceof HTMLElement)) {
    return null
  }

  return slideElement.dataset.elementId ?? null
}

function resolveSingleSelectionKind(element: AnySlideElement): SlideContextMenuKind {
  switch (element.type) {
    case 'text':
      return 'single-text'
    case 'shape':
      return 'single-shape'
    case 'image':
    case 'video':
      return 'single-media'
    case 'table':
    case 'chart':
    case 'metric-card':
    case 'code':
      return 'single-data'
    case 'group':
      return 'single-group'
    case 'icon':
    case 'logo':
    case 'footer':
    case 'badge':
    case 'connector':
    case 'layer':
      return 'single-decorative'
    default:
      return 'single-other'
  }
}

export function resolveContextMenuSelectionIds({
  targetElementId,
  selectedIds
}: ResolveContextMenuSelectionIdsParams): string[] {
  const currentSelectionIds = Array.from(selectedIds)

  if (!targetElementId) {
    return []
  }

  if (currentSelectionIds.includes(targetElementId)) {
    return currentSelectionIds
  }

  return [targetElementId]
}

function areSameSelection(currentSelection: Set<string>, nextSelectionIds: string[]): boolean {
  if (currentSelection.size !== nextSelectionIds.length) {
    return false
  }

  return nextSelectionIds.every(id => currentSelection.has(id))
}

export function buildSlideContextMenuState({
  elements,
  selectedIds,
  targetElementId,
  canEdit,
  hasClipboardContent
}: BuildSlideContextMenuStateParams): SlideContextMenuState {
  const selectionIdSet = new Set(selectedIds)
  const selectedElements = elements.filter(element => selectionIdSet.has(element.id))
  const unlockedSelectedElements = selectedElements.filter(element => !element.locked)
  const singleElement = selectedElements.length === 1 ? selectedElements[0] : null
  const hasUnlockedSelection = unlockedSelectedElements.length > 0
  const hasLockedSelection = unlockedSelectedElements.length !== selectedElements.length

  let kind: SlideContextMenuKind = 'canvas-empty'

  if (selectedElements.length > 1) {
    if (hasLockedSelection && hasUnlockedSelection) {
      kind = 'mixed-selection'
    } else if (hasLockedSelection) {
      kind = 'locked-selection'
    } else {
      kind = 'multi-selection'
    }
  } else if (singleElement) {
    kind = singleElement.locked ? 'locked-selection' : resolveSingleSelectionKind(singleElement)
  }

  return {
    kind,
    targetElementId,
    selectionIds: Array.from(selectionIdSet),
    selectedElements,
    singleElement,
    selectionCount: selectedElements.length,
    hasUnlockedSelection,
    hasLockedSelection,
    canEdit,
    hasClipboardContent,
    capabilities: {
      canCopy: true,
      canCut: canEdit && hasUnlockedSelection,
      canPaste: canEdit && hasClipboardContent,
      canDuplicate: canEdit && hasUnlockedSelection,
      canDelete: canEdit && hasUnlockedSelection,
      canEditText:
        canEdit &&
        singleElement !== null &&
        !singleElement.locked &&
        (singleElement.type === 'text' || singleElement.type === 'shape'),
      canEditPoints: canEdit && singleElement?.type === 'shape' && !singleElement.locked,
      canBringForward: canEdit && singleElement !== null && !singleElement.locked,
      canSendBackward: canEdit && singleElement !== null && !singleElement.locked,
      canAlign: canEdit && hasUnlockedSelection,
      canDistribute: canEdit && unlockedSelectedElements.length >= 3,
      canFlip: canEdit && unlockedSelectedElements.some(element => element.type === 'shape'),
      canGroup: canEdit && unlockedSelectedElements.length >= 2,
      canUngroup: canEdit && unlockedSelectedElements.some(element => element.type === 'group'),
      canLock: canEdit && selectedElements.some(element => !element.locked),
      canUnlock: canEdit && selectedElements.some(element => element.locked)
    }
  }
}

export function useSlideContextMenu({
  elements,
  selectedIds,
  canEdit,
  hasClipboardContent,
  onSelectElements
}: UseSlideContextMenuParams): UseSlideContextMenuResult {
  const [contextMenuState, setContextMenuState] = useState<SlideContextMenuState>(INITIAL_SLIDE_CONTEXT_MENU_STATE)

  const handleContextMenuCapture = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      const targetElementId = getSlideContextMenuTargetElementId(event.target)
      const nextSelectionIds = resolveContextMenuSelectionIds({
        targetElementId,
        selectedIds
      })

      if (!areSameSelection(selectedIds, nextSelectionIds)) {
        onSelectElements(new Set(nextSelectionIds))
      }

      setContextMenuState(
        buildSlideContextMenuState({
          elements,
          selectedIds: nextSelectionIds,
          targetElementId,
          canEdit,
          hasClipboardContent
        })
      )
    },
    [elements, selectedIds, canEdit, hasClipboardContent, onSelectElements]
  )

  return {
    contextMenuState,
    handleContextMenuCapture
  }
}
