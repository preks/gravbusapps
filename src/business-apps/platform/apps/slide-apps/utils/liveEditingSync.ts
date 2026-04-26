import type { AnySlideElement, ShapeInText, TextElement } from '../components/slideElements'
import { createDefaultShapeText } from './richTextEditing'

export type LiveEditingDraft = { kind: 'text'; element: TextElement } | { kind: 'shape'; element: ShapeInText } | null

function getLiveEditingComparableValue(element: AnySlideElement | undefined): TextElement | ShapeInText | null {
  if (!element) return null
  if (element.type === 'text') return element
  if (element.type === 'shape') return element.shapeText ?? createDefaultShapeText()
  return null
}

function getDraftComparableValue(draft: LiveEditingDraft): TextElement | ShapeInText | null {
  return draft?.element ?? null
}

function serializeComparableValue(value: TextElement | ShapeInText | null): string | null {
  return value ? JSON.stringify(value) : null
}

export function serializeLiveEditingValue(element: AnySlideElement | undefined): string | null {
  return serializeComparableValue(getLiveEditingComparableValue(element))
}

export function serializeEditingDraftValue(draft: LiveEditingDraft): string | null {
  return serializeComparableValue(getDraftComparableValue(draft))
}

export function shouldRehydrateFromLiveUpdate(
  previousLiveSnapshot: string | null,
  nextLiveSnapshot: string | null,
  draftSnapshot: string | null
): boolean {
  if (!previousLiveSnapshot || !nextLiveSnapshot) return false
  if (previousLiveSnapshot === nextLiveSnapshot) return false
  return nextLiveSnapshot !== draftSnapshot
}
