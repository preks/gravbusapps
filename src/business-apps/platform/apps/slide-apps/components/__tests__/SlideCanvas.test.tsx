import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { SlideCanvas } from '../SlideCanvas'
import { createShapeFromPreset } from '../slideElements'
import type { CodeElement, ShapeElement, TextElement, VideoElement } from '../slideElements'
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

function makeCodeElement(overrides: Partial<CodeElement> = {}): CodeElement {
  return {
    id: 'code-1',
    type: 'code',
    position: { x: 100, y: 100 },
    size: { width: 320, height: 180 },
    rotation: 0,
    opacity: 1,
    locked: false,
    zIndex: 1,
    code: 'const answer = 42;',
    language: 'typescript',
    theme: 'dark',
    showLineNumbers: false,
    fontSize: 16,
    textColor: '#d4d4d4',
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    borderWidth: 0,
    borderColor: '#333333',
    shadow: false,
    padding: 16,
    ...overrides
  }
}

function makeGenericTriangleElement(overrides: Partial<ShapeElement> = {}): ShapeElement {
  return {
    ...makeShapeElement({
      id: 'shape-triangle',
      shapeType: 'triangle',
      geometry: { sourceFormat: 'native' }
    }),
    ...overrides
  }
}

function makeVideoElement(overrides: Partial<VideoElement> = {}): VideoElement {
  return {
    id: 'video-1',
    type: 'video',
    position: { x: 100, y: 100 },
    size: { width: 480, height: 270 },
    rotation: 0,
    opacity: 1,
    locked: false,
    zIndex: 1,
    src: 'https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0',
    sourceUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0',
    previewImageUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    videoKind: 'embed',
    provider: 'youtube',
    autoplay: false,
    loop: false,
    muted: true,
    objectFit: 'contain',
    borderRadius: 8,
    shadow: false,
    ...overrides
  }
}

function makeFileVideoElement(overrides: Partial<VideoElement> = {}): VideoElement {
  return makeVideoElement({
    src: 'https://example.com/demo.mp4',
    sourceUrl: 'https://example.com/demo.mp4',
    embedUrl: undefined,
    previewImageUrl: 'https://example.com/demo.jpg',
    videoKind: 'file',
    provider: undefined,
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
    dragEdge: screen.getByTestId(`slide-inline-editor-move-edge-${editingTextId}-top`),
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

  it('allows dragging a text element from its inline edit edge', () => {
    const { dragEdge, onDragStart, onDragEnd, onUpdateElement } = renderInlineEditingCanvas(makeTextElement())

    dragFrom(dragEdge, { x: 150, y: 150 }, { x: 187, y: 173 })

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

  it('does not cancel Space or Enter while editing a code element', () => {
    const onSelectElements = jest.fn()
    const onFinishEditing = jest.fn()

    render(
      <SlideCanvas
        elements={[makeCodeElement()]}
        selectedIds={new Set(['code-1'])}
        background={{ type: 'solid', color: '#ffffff' }}
        onSelectElements={onSelectElements}
        onUpdateElement={() => {}}
        onUpdateMultipleElements={() => {}}
        onEditText={() => {}}
        inlineEditing={{
          editingTextId: 'code-1',
          onTextChange: () => {},
          onSelectionChange: () => {},
          onFinishEditing
        }}
      />
    )

    const editor = screen.getByRole('textbox')

    expect(fireEvent.keyDown(editor, { key: ' ' })).toBe(true)
    expect(fireEvent.keyDown(editor, { key: 'Enter' })).toBe(true)
    expect(onSelectElements).not.toHaveBeenCalled()
    expect(onFinishEditing).not.toHaveBeenCalled()
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

  it('allows imported explicit textbox shape labels to overflow like PowerPoint', () => {
    render(
      <SlideCanvas
        elements={[
          makeShapeElement({
            size: { width: 120, height: 12 },
            shapeText: createDefaultShapeText({
              content: 'Agents',
              fontSize: 16,
              fontWeight: 'bold',
              padding: 0,
              verticalAlign: 'middle',
              allowOverflow: true
            })
          })
        ]}
        selectedIds={new Set()}
        background={{ type: 'solid', color: '#ffffff' }}
        onSelectElements={() => {}}
        onUpdateElement={() => {}}
        onUpdateMultipleElements={() => {}}
        onEditText={() => {}}
      />
    )

    const linkText = document.querySelector(
      '[data-element-id="shape-1"] [data-testid="text-with-links"]'
    ) as HTMLElement | null

    expect(linkText).not.toBeNull()
    expect(linkText?.parentElement?.parentElement).not.toBeNull()
    expect((linkText?.parentElement?.parentElement as HTMLElement).style.overflow).toBe('visible')
  })

  it('keeps normal shape labels clipped to the shape bounds', () => {
    render(
      <SlideCanvas
        elements={[makeShapeElement({ shapeText: createDefaultShapeText({ content: 'Shape label', padding: 0 }) })]}
        selectedIds={new Set()}
        background={{ type: 'solid', color: '#ffffff' }}
        onSelectElements={() => {}}
        onUpdateElement={() => {}}
        onUpdateMultipleElements={() => {}}
        onEditText={() => {}}
      />
    )

    const linkText = document.querySelector(
      '[data-element-id="shape-1"] [data-testid="text-with-links"]'
    ) as HTMLElement | null

    expect(linkText).not.toBeNull()
    expect(linkText?.parentElement?.parentElement).not.toBeNull()
    expect((linkText?.parentElement?.parentElement as HTMLElement).style.overflow).toBe('hidden')
  })

  it('renders generic SVG shape gradients via SVG defs instead of a black fallback', () => {
    render(
      <SlideCanvas
        elements={[
          makeGenericTriangleElement({
            fill: 'transparent',
            gradient: {
              type: 'linear',
              angle: 90,
              stops: [
                { color: '#EA5929', position: 0 },
                { color: '#54275F', position: 100 }
              ]
            },
            strokeWidth: 0
          })
        ]}
        selectedIds={new Set()}
        background={{ type: 'solid', color: '#ffffff' }}
        onSelectElements={() => {}}
        onUpdateElement={() => {}}
        onUpdateMultipleElements={() => {}}
        onEditText={() => {}}
      />
    )

    const shapeRoot = document.querySelector('[data-element-id="shape-triangle"]')
    const gradient = shapeRoot?.querySelector('linearGradient')
    const filledPrimitive = shapeRoot?.querySelector(
      'polygon[fill], path[fill], rect[fill], circle[fill], ellipse[fill]'
    )

    expect(gradient).not.toBeNull()
    expect(filledPrimitive).not.toBeNull()
    expect(filledPrimitive?.getAttribute('fill')).toMatch(/^url\(#.+\)$/)
    expect(filledPrimitive?.getAttribute('fill')).not.toContain('linear-gradient(')
  })
})

describe('SlideCanvas video rendering', () => {
  it('keeps unselected embedded videos selectable from the canvas surface', () => {
    render(
      <SlideCanvas
        elements={[makeVideoElement()]}
        selectedIds={new Set()}
        background={{ type: 'solid', color: '#ffffff' }}
        onSelectElements={() => {}}
        onUpdateElement={() => {}}
        onUpdateMultipleElements={() => {}}
        onEditText={() => {}}
      />
    )

    expect(screen.getByTestId('slide-video-embed-video-1')).toHaveStyle({ pointerEvents: 'none' })
  })

  it('lets selected embedded videos stay playable and movable', () => {
    const onUpdateElement = jest.fn()
    const onDragStart = jest.fn()
    const onDragEnd = jest.fn()

    render(
      <SlideCanvas
        elements={[makeVideoElement()]}
        selectedIds={new Set(['video-1'])}
        background={{ type: 'solid', color: '#ffffff' }}
        onSelectElements={() => {}}
        onUpdateElement={onUpdateElement}
        onUpdateMultipleElements={() => {}}
        onEditText={() => {}}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      />
    )

    expect(screen.getByTestId('slide-video-embed-video-1')).toHaveStyle({ pointerEvents: 'auto' })

    dragFrom(screen.getByTestId('slide-video-move-edge-video-1-top'), { x: 150, y: 100 }, { x: 190, y: 130 })

    expect(onDragStart).toHaveBeenCalledTimes(1)
    expect(onDragEnd).toHaveBeenCalledTimes(1)
    expect(onUpdateElement).toHaveBeenLastCalledWith('video-1', { position: { x: 140, y: 130 } })
  })

  it('temporarily disables selected embedded video pointer events while dragging from the edge', () => {
    render(
      <SlideCanvas
        elements={[makeVideoElement()]}
        selectedIds={new Set(['video-1'])}
        background={{ type: 'solid', color: '#ffffff' }}
        onSelectElements={() => {}}
        onUpdateElement={() => {}}
        onUpdateMultipleElements={() => {}}
        onEditText={() => {}}
      />
    )

    const embed = screen.getByTestId('slide-video-embed-video-1')
    const moveEdge = screen.getByTestId('slide-video-move-edge-video-1-top')

    expect(embed).toHaveStyle({ pointerEvents: 'auto' })

    fireEvent.mouseDown(moveEdge, { clientX: 150, clientY: 100 })
    expect(embed).toHaveStyle({ pointerEvents: 'none' })

    fireEvent.mouseUp(window, { clientX: 150, clientY: 100 })
    expect(embed).toHaveStyle({ pointerEvents: 'auto' })
  })

  it('does not start dragging when interacting with a selected file video player', () => {
    const onDragStart = jest.fn()
    const onDragEnd = jest.fn()
    const onUpdateElement = jest.fn()

    render(
      <SlideCanvas
        elements={[makeFileVideoElement()]}
        selectedIds={new Set(['video-1'])}
        background={{ type: 'solid', color: '#ffffff' }}
        onSelectElements={() => {}}
        onUpdateElement={onUpdateElement}
        onUpdateMultipleElements={() => {}}
        onEditText={() => {}}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      />
    )

    const videoPlayer = screen.getByTestId('slide-video-element-video-1')
    expect(videoPlayer).toHaveStyle({ cursor: 'auto' })

    fireEvent.mouseDown(videoPlayer, { clientX: 150, clientY: 150 })
    fireEvent.mouseMove(window, { clientX: 190, clientY: 180 })
    fireEvent.mouseUp(window, { clientX: 190, clientY: 180 })

    expect(onDragStart).not.toHaveBeenCalled()
    expect(onDragEnd).not.toHaveBeenCalled()
    expect(onUpdateElement).not.toHaveBeenCalled()
  })
})
