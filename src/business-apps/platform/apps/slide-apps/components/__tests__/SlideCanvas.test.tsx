import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { SlideCanvas } from '../SlideCanvas'
import { createShapeFromPreset } from '../slideElements'
import type { ShapeElement, TextElement } from '../slideElements'
import { createDefaultShapeText } from '../../utils/richTextEditing'

function makeTextElement(overrides: Partial<TextElement> = {}): TextElement {
  return {
    id: 'text-1',
    type: 'text',
    position: { x: 100, y: 100 },
    size: { width: 320, height: 140 },
    rotation: 0,
    opacity: 1,
    locked: false,
    zIndex: 1,
    content: 'Editable text',
    fontFamily: 'Inter',
    fontSize: 16,
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
    position: { x: 100, y: 100 },
    size: { width: 320, height: 140 },
    shapeText: createDefaultShapeText({
      content: 'Shape label',
      padding: 16
    }),
    ...overrides
  })
}

function renderInlineEditingCanvas(element: TextElement | ShapeElement) {
  const onSelectElements = jest.fn()
  const onUpdateElement = jest.fn()
  const onUpdateMultipleElements = jest.fn()
  const onEditText = jest.fn()
  const onDragStart = jest.fn()
  const onDragEnd = jest.fn()
  const editingTextId = element.id

  render(
    <SlideCanvas
      elements={[element]}
      selectedIds={new Set([element.id])}
      background={{ type: 'solid', color: '#ffffff' }}
      onSelectElements={onSelectElements}
      onUpdateElement={onUpdateElement}
      onUpdateMultipleElements={onUpdateMultipleElements}
      onEditText={onEditText}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      inlineEditing={{
        editingTextId,
        onTextChange: () => {},
        onSelectionChange: () => {},
        onFinishEditing: () => {}
      }}
    />
  )

  return {
    onDragStart,
    onDragEnd,
    onUpdateElement,
    editor:
      element.type === 'text'
        ? screen.getByTestId(`slide-text-editor-${editingTextId}`)
        : screen.getByTestId(`slide-shape-text-editor-${editingTextId}`)
  }
}

function dragFrom(source: Element, start: { x: number; y: number }, end: { x: number; y: number }) {
  act(() => {
    fireEvent.mouseDown(source, { clientX: start.x, clientY: start.y })
  })
  act(() => {
    fireEvent.mouseMove(window, { clientX: end.x, clientY: end.y })
  })
  act(() => {
    fireEvent.mouseUp(window, { clientX: end.x, clientY: end.y })
  })
}

describe('SlideCanvas inline editing drag behavior', () => {
  it('keeps text editor body interactions inside the inline editor', () => {
    const { editor, onDragStart, onDragEnd, onUpdateElement } = renderInlineEditingCanvas(makeTextElement())

    dragFrom(editor, { x: 150, y: 150 }, { x: 187, y: 173 })

    expect(onDragStart).not.toHaveBeenCalled()
    expect(onUpdateElement).not.toHaveBeenCalled()
    expect(onDragEnd).not.toHaveBeenCalled()
  })

  it('allows dragging a text element from its chrome while editing', () => {
    const { editor, onDragStart, onDragEnd, onUpdateElement } = renderInlineEditingCanvas(makeTextElement())
    const chrome = editor.parentElement

    expect(chrome).not.toBeNull()

    dragFrom(chrome as HTMLElement, { x: 150, y: 150 }, { x: 187, y: 173 })

    expect(onDragStart).toHaveBeenCalledTimes(1)
    expect(onDragEnd).toHaveBeenCalledTimes(1)
    expect(onUpdateElement).toHaveBeenCalled()
    expect(onUpdateElement.mock.calls[onUpdateElement.mock.calls.length - 1]).toEqual([
      'text-1',
      { position: { x: 137, y: 123 } }
    ])
  })

  it('keeps shape label editor body interactions inside the inline editor', () => {
    const { editor, onDragStart, onDragEnd, onUpdateElement } = renderInlineEditingCanvas(makeShapeElement())

    dragFrom(editor, { x: 150, y: 150 }, { x: 187, y: 173 })

    expect(onDragStart).not.toHaveBeenCalled()
    expect(onUpdateElement).not.toHaveBeenCalled()
    expect(onDragEnd).not.toHaveBeenCalled()
  })
})
