import * as Y from 'yjs'

// Targeted whiteboard Yjs helpers to avoid full-array rewrites.

export const WHITEBOARD_LOCAL_YJS_ORIGIN = 'nw-whiteboard-local'
export const WHITEBOARD_SCENE_BOOTSTRAP_ORIGIN = 'nw-whiteboard-scene-bootstrap'

type WhiteboardElementRecord = Record<string, unknown> & { id?: string }

function cloneJsonValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function getElementId(yElement: Y.Map<unknown> | undefined): string | null {
  const id = yElement?.get('id')
  return typeof id === 'string' && id.length > 0 ? id : null
}

function getElementRecordId(element: WhiteboardElementRecord): string | null {
  return typeof element.id === 'string' && element.id.length > 0 ? element.id : null
}

function getFrameId(element: WhiteboardElementRecord): string | null {
  return typeof element.frameId === 'string' && element.frameId.length > 0 ? element.frameId : null
}

function isFrameElement(element: WhiteboardElementRecord): boolean {
  return element.type === 'frame'
}

function createYElement(record: WhiteboardElementRecord): Y.Map<unknown> {
  const yElement = new Y.Map<unknown>()
  Object.entries(record).forEach(([key, value]) => {
    if (value === undefined || typeof value === 'function') {
      return
    }

    yElement.set(key, cloneJsonValue(value))
  })
  return yElement
}

export function applyRecordToYMap(yMap: Y.Map<unknown>, record: Record<string, unknown>) {
  const nextKeys = new Set<string>()

  Object.entries(record).forEach(([key, value]) => {
    if (value === undefined || typeof value === 'function') {
      return
    }

    nextKeys.add(key)
    const nextValue = cloneJsonValue(value)
    const currentValue = yMap.get(key)
    if (JSON.stringify(currentValue) !== JSON.stringify(nextValue)) {
      yMap.set(key, nextValue)
    }
  })

  Array.from(yMap.keys()).forEach(key => {
    if (!nextKeys.has(key)) {
      yMap.delete(key)
    }
  })
}

function removeDuplicateOrInvalidElements(yElements: Y.Array<Y.Map<unknown>>): void {
  const seen = new Set<string>()

  for (let index = yElements.length - 1; index >= 0; index -= 1) {
    const elementId = getElementId(yElements.get(index))
    if (!elementId || seen.has(elementId)) {
      yElements.delete(index, 1)
      continue
    }

    seen.add(elementId)
  }
}

function findElementIndexById(yElements: Y.Array<Y.Map<unknown>>, elementId: string): number {
  for (let index = 0; index < yElements.length; index += 1) {
    if (getElementId(yElements.get(index)) === elementId) {
      return index
    }
  }

  return -1
}

export function dedupeWhiteboardElementRecords(
  elements: readonly WhiteboardElementRecord[]
): WhiteboardElementRecord[] {
  const seen = new Set<string>()
  const deduped: WhiteboardElementRecord[] = []

  for (let index = elements.length - 1; index >= 0; index -= 1) {
    const element = elements[index]
    const elementId = typeof element.id === 'string' ? element.id : null
    if (!elementId || seen.has(elementId)) {
      continue
    }

    seen.add(elementId)
    deduped.unshift(element)
  }

  return deduped
}

/**
 * Excalidraw expects frame children to appear before their containing frame in the
 * element array. If collaborative updates persist a different order, frames can
 * render incorrectly or collapse during restore/replay.
 */
export function normalizeWhiteboardElementOrder(
  elements: readonly WhiteboardElementRecord[]
): WhiteboardElementRecord[] {
  const deduped = dedupeWhiteboardElementRecords(elements)
  const frameIds = new Set(
    deduped
      .filter(isFrameElement)
      .map(getElementRecordId)
      .filter((elementId): elementId is string => Boolean(elementId))
  )
  const childrenByFrameId = new Map<string, WhiteboardElementRecord[]>()

  deduped.forEach(element => {
    const frameId = getFrameId(element)
    if (!frameId || !frameIds.has(frameId)) {
      return
    }

    const currentChildren = childrenByFrameId.get(frameId) || []
    currentChildren.push(element)
    childrenByFrameId.set(frameId, currentChildren)
  })

  const normalized: WhiteboardElementRecord[] = []
  const emittedIds = new Set<string>()
  const activeFrameStack = new Set<string>()

  const emitElement = (element: WhiteboardElementRecord) => {
    const elementId = getElementRecordId(element)
    if (elementId && emittedIds.has(elementId)) {
      return
    }

    if (isFrameElement(element) && elementId) {
      if (activeFrameStack.has(elementId)) {
        return
      }

      activeFrameStack.add(elementId)
      ;(childrenByFrameId.get(elementId) || []).forEach(child => {
        emitElement(child)
      })
      activeFrameStack.delete(elementId)
    }

    normalized.push(element)
    if (elementId) {
      emittedIds.add(elementId)
    }
  }

  deduped.forEach(element => {
    const frameId = getFrameId(element)
    if (frameId && frameIds.has(frameId)) {
      return
    }

    emitElement(element)
  })

  return normalized
}

export function syncWhiteboardElements(
  yElements: Y.Array<Y.Map<unknown>>,
  elements: readonly WhiteboardElementRecord[]
): void {
  removeDuplicateOrInvalidElements(yElements)
  const normalizedElements = normalizeWhiteboardElementOrder(elements)
  const desiredIds = new Set<string>()

  normalizedElements.forEach((element, targetIndex) => {
    const elementId = getElementRecordId(element)
    if (!elementId) {
      return
    }

    desiredIds.add(elementId)
    const currentIndex = findElementIndexById(yElements, elementId)
    if (currentIndex === -1) {
      yElements.insert(targetIndex, [createYElement(element)])
      return
    }

    const currentElement = yElements.get(currentIndex)
    if (!currentElement) {
      yElements.insert(targetIndex, [createYElement(element)])
      return
    }

    applyRecordToYMap(currentElement, element)
    if (currentIndex !== targetIndex) {
      const movedElement = createYElement(element)
      yElements.delete(currentIndex, 1)
      yElements.insert(targetIndex, [movedElement])
    }
  })

  for (let index = yElements.length - 1; index >= 0; index -= 1) {
    const elementId = getElementId(yElements.get(index))
    if (!elementId || !desiredIds.has(elementId)) {
      yElements.delete(index, 1)
    }
  }
}

export function upsertWhiteboardElement(yElements: Y.Array<Y.Map<unknown>>, element: WhiteboardElementRecord): void {
  const elementId = typeof element.id === 'string' ? element.id : null
  if (!elementId) {
    return
  }

  removeDuplicateOrInvalidElements(yElements)
  const currentIndex = findElementIndexById(yElements, elementId)
  if (currentIndex === -1) {
    yElements.push([createYElement(element)])
    return
  }

  const currentElement = yElements.get(currentIndex)
  if (currentElement) {
    applyRecordToYMap(currentElement, element)
  }
}

export function markWhiteboardElementsDeleted(yElements: Y.Array<Y.Map<unknown>>, elementIds: Iterable<string>): void {
  const idsToDelete = new Set(elementIds)
  if (idsToDelete.size === 0) {
    return
  }

  removeDuplicateOrInvalidElements(yElements)
  for (let index = 0; index < yElements.length; index += 1) {
    const yElement = yElements.get(index)
    const elementId = getElementId(yElement)
    const containerId = yElement?.get('containerId')
    if (
      yElement &&
      elementId &&
      (idsToDelete.has(elementId) || (typeof containerId === 'string' && idsToDelete.has(containerId)))
    ) {
      yElement.set('isDeleted', true)
      yElement.set('updated', Date.now())
    }
  }
}

export function syncWhiteboardFiles(yFiles: Y.Map<string>, files: Record<string, unknown>): void {
  const nextIds = new Set(Object.keys(files))

  Array.from(yFiles.keys()).forEach(fileId => {
    if (!nextIds.has(fileId)) {
      yFiles.delete(fileId)
    }
  })

  Object.entries(files).forEach(([fileId, fileValue]) => {
    if (!isRecord(fileValue)) {
      return
    }

    const nextValue = JSON.stringify(cloneJsonValue(fileValue))
    if (yFiles.get(fileId) !== nextValue) {
      yFiles.set(fileId, nextValue)
    }
  })
}

export function syncWhiteboardAppState(yAppState: Y.Map<unknown>, appState: Record<string, unknown>): void {
  const nextKeys = new Set<string>()

  Object.entries(appState).forEach(([key, value]) => {
    if (value === undefined) {
      return
    }

    nextKeys.add(key)
    const nextValue = cloneJsonValue(value)
    const currentValue = yAppState.get(key)
    if (JSON.stringify(currentValue) !== JSON.stringify(nextValue)) {
      yAppState.set(key, nextValue)
    }
  })

  Array.from(yAppState.keys()).forEach(key => {
    if (!nextKeys.has(key)) {
      yAppState.delete(key)
    }
  })
}

export function clearWhiteboardScene(yElements: Y.Array<Y.Map<unknown>>, yFiles: Y.Map<string>): void {
  if (yElements.length > 0) {
    yElements.delete(0, yElements.length)
  }

  Array.from(yFiles.keys()).forEach(fileId => {
    yFiles.delete(fileId)
  })
}

export function readWhiteboardElements(yElements: Y.Array<Y.Map<unknown>>): WhiteboardElementRecord[] {
  const elements: WhiteboardElementRecord[] = []

  yElements.forEach(yElement => {
    const element = cloneJsonValue(Object.fromEntries(yElement.entries()) as WhiteboardElementRecord)
    elements.push(element)
  })

  return normalizeWhiteboardElementOrder(elements)
}
