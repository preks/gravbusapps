import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { SlideCanvas } from '../SlideCanvas'
import { createShapeFromPreset } from '../slideElements'
import type { ShapeElement, TextElement } from '../slideElements'
import { createDefaultShapeText } from '../../utils/richTextEditing'

void React

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

  it('selects a locked element without starting drag or inline editing', () => {
    const onSelectElements = jest.fn()
    const onUpdateElement = jest.fn()
    const onUpdateMultipleElements = jest.fn()
    const onEditText = jest.fn()
    const onDragStart = jest.fn()

    render(
      <SlideCanvas
        elements={[makeTextElement({ locked: true })]}
        selectedIds={new Set()}
        background={{ type: 'solid', color: '#ffffff' }}
        onSelectElements={onSelectElements}
        onUpdateElement={onUpdateElement}
        onUpdateMultipleElements={onUpdateMultipleElements}
        onEditText={onEditText}
        onDragStart={onDragStart}
      />
    )

    const lockedElement = document.querySelector('[data-element-id="text-1"]')

    expect(lockedElement).not.toBeNull()

    fireEvent.mouseDown(lockedElement as HTMLElement, { clientX: 150, clientY: 150 })
    fireEvent.doubleClick(lockedElement as HTMLElement, { clientX: 150, clientY: 150 })
    fireEvent.mouseMove(window, { clientX: 190, clientY: 190 })
    fireEvent.mouseUp(window, { clientX: 190, clientY: 190 })

    expect(onSelectElements).toHaveBeenCalledWith(new Set(['text-1']))
    expect(onDragStart).not.toHaveBeenCalled()
    expect(onUpdateElement).not.toHaveBeenCalled()
    expect(onUpdateMultipleElements).not.toHaveBeenCalled()
    expect(onEditText).not.toHaveBeenCalled()
  })

  it('keeps locked elements stationary during mixed-selection drag', () => {
    const onUpdateElement = jest.fn()
    const onUpdateMultipleElements = jest.fn()
    const onDragStart = jest.fn()
    const onDragEnd = jest.fn()

    render(
      <SlideCanvas
        elements={[
          makeTextElement({ locked: true }),
          makeTextElement({
            id: 'text-2',
            locked: false,
            position: { x: 320, y: 100 }
          })
        ]}
        selectedIds={new Set(['text-1', 'text-2'])}
        background={{ type: 'solid', color: '#ffffff' }}
        onSelectElements={() => {}}
        onUpdateElement={onUpdateElement}
        onUpdateMultipleElements={onUpdateMultipleElements}
        onEditText={() => {}}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      />
    )

    const unlockedElement = document.querySelector('[data-element-id="text-2"]')

    expect(unlockedElement).not.toBeNull()

    dragFrom(unlockedElement as HTMLElement, { x: 340, y: 120 }, { x: 380, y: 150 })

    expect(onDragStart).toHaveBeenCalledTimes(1)
    expect(onDragEnd).toHaveBeenCalledTimes(1)
    expect(onUpdateMultipleElements).not.toHaveBeenCalled()
    expect(onUpdateElement).toHaveBeenCalled()
    expect(onUpdateElement).not.toHaveBeenCalledWith('text-1', expect.anything())
    expect(onUpdateElement).toHaveBeenLastCalledWith(
      'text-2',
      expect.objectContaining({ position: expect.any(Object) })
    )
  })
})
