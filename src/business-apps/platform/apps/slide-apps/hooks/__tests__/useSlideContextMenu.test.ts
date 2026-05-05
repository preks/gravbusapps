import React from 'react'
import {
  buildSlideContextMenuState,
  getSlideContextMenuTargetElementId,
  resolveContextMenuSelectionIds
} from '../useSlideContextMenu'
import { createShapeFromPreset } from '../../components/slideElements'
import type { ShapeElement, TextElement } from '../../components/slideElements'
import { createDefaultShapeText } from '../../utils/richTextEditing'

void React

function makeTextElement(overrides: Partial<TextElement> = {}): TextElement {
  return {
    id: 'text-1',
    type: 'text',
    position: { x: 80, y: 80 },
    size: { width: 280, height: 120 },
    rotation: 0,
    opacity: 1,
    locked: false,
    zIndex: 1,
    content: 'Editable text',
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    textAlign: 'left',
    verticalAlign: 'top',
    color: '#111111',
    backgroundColor: 'transparent',
    lineHeight: 1.2,
    letterSpacing: 0,
    padding: 16,
    ...overrides
  }
}

function makeShapeElement(overrides: Partial<ShapeElement> = {}): ShapeElement {
  return createShapeFromPreset('rect', {
    id: 'shape-1',
    position: { x: 120, y: 120 },
    size: { width: 240, height: 120 },
    shapeText: createDefaultShapeText({
      content: 'Shape label',
      padding: 16
    }),
    ...overrides
  })
}

describe('useSlideContextMenu helpers', () => {
  it('resolves the clicked slide element id from DOM targets', () => {
    document.body.innerHTML =
      '<div data-slide-element="true" data-element-id="shape-1"><span data-testid="inner-target">Inner</span></div>'

    const target = document.querySelector('[data-testid="inner-target"]')
    expect(getSlideContextMenuTargetElementId(target)).toBe('shape-1')
  })

  it('updates selection for right-click targets like PowerPoint', () => {
    expect(resolveContextMenuSelectionIds({ targetElementId: 'shape-1', selectedIds: new Set(['text-1']) })).toEqual([
      'shape-1'
    ])

    expect(
      resolveContextMenuSelectionIds({
        targetElementId: 'shape-1',
        selectedIds: new Set(['text-1', 'shape-1'])
      })
    ).toEqual(['text-1', 'shape-1'])

    expect(resolveContextMenuSelectionIds({ targetElementId: null, selectedIds: new Set(['text-1']) })).toEqual([])
  })

  it('builds single-selection capabilities for editable text', () => {
    const textElement = makeTextElement()
    const state = buildSlideContextMenuState({
      elements: [textElement],
      selectedIds: ['text-1'],
      targetElementId: 'text-1',
      canEdit: true,
      hasClipboardContent: true
    })

    expect(state.kind).toBe('single-text')
    expect(state.capabilities.canCopy).toBe(true)
    expect(state.capabilities.canCut).toBe(true)
    expect(state.capabilities.canPaste).toBe(true)
    expect(state.capabilities.canEditText).toBe(true)
    expect(state.capabilities.canDelete).toBe(true)
  })

  it('builds mixed and locked selection capabilities correctly', () => {
    const textElement = makeTextElement()
    const lockedShape = makeShapeElement({ id: 'shape-1', locked: true })
    const state = buildSlideContextMenuState({
      elements: [textElement, lockedShape],
      selectedIds: ['text-1', 'shape-1'],
      targetElementId: 'text-1',
      canEdit: true,
      hasClipboardContent: false
    })

    expect(state.kind).toBe('mixed-selection')
    expect(state.hasUnlockedSelection).toBe(true)
    expect(state.hasLockedSelection).toBe(true)
    expect(state.capabilities.canLock).toBe(true)
    expect(state.capabilities.canUnlock).toBe(true)
    expect(state.capabilities.canGroup).toBe(false)
  })

  it('keeps locked shapes viewable but not editable', () => {
    const lockedShape = makeShapeElement({ locked: true })
    const state = buildSlideContextMenuState({
      elements: [lockedShape],
      selectedIds: ['shape-1'],
      targetElementId: 'shape-1',
      canEdit: true,
      hasClipboardContent: false
    })

    expect(state.kind).toBe('locked-selection')
    expect(state.capabilities.canEditPoints).toBe(false)
    expect(state.capabilities.canUnlock).toBe(true)
    expect(state.capabilities.canDelete).toBe(false)
  })
})
