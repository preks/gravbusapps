import React from 'react'
import { act, fireEvent, render } from '@testing-library/react'
import { ShapePointEditor } from '../ShapePointEditor'
import { createShapeFromPreset } from '../slideElements'
import type { ShapeElement } from '../slideElements'
import { customPathToNodes } from '../shapePathGeometry'

function makeRectShape(): ShapeElement {
  return createShapeFromPreset('rect', {
    id: 'shape-1',
    position: { x: 0, y: 0 },
    size: { width: 200, height: 100 }
  })
}

describe('ShapePointEditor', () => {
  it('renders one draggable anchor per node seeded from the preset', () => {
    const element = makeRectShape()
    const { container } = render(<ShapePointEditor element={element} onChangePath={() => {}} onExit={() => {}} />)
    const anchors = container.querySelectorAll('rect[data-testid^="shape-point-editor-"]')
    expect(anchors.length).toBe(4)
  })

  it('dragging an anchor emits an updated custGeomPath that moves the right anchor', () => {
    const element = makeRectShape()
    const onChangePath = jest.fn()
    const { container } = render(<ShapePointEditor element={element} onChangePath={onChangePath} onExit={() => {}} />)
    const anchors = container.querySelectorAll('rect[data-testid^="shape-point-editor-"]')
    const first = anchors[0] as SVGRectElement

    // Start dragging the top-left anchor and move it 20px right / 10px down.
    act(() => {
      fireEvent.mouseDown(first, { clientX: 0, clientY: 0, bubbles: true })
    })
    act(() => {
      fireEvent.mouseMove(window, { clientX: 20, clientY: 10 })
    })
    act(() => {
      fireEvent.mouseUp(window)
    })

    expect(onChangePath).toHaveBeenCalled()
    const last = onChangePath.mock.calls[onChangePath.mock.calls.length - 1][0] as string
    const data = customPathToNodes(last)
    const movedAnchor = data.subpaths[0].nodes[0].point
    // Shape is 200px wide × 100px tall, so 20px = 0.1 in x, 10px = 0.1 in y.
    expect(movedAnchor.x).toBeCloseTo(0.1, 2)
    expect(movedAnchor.y).toBeCloseTo(0.1, 2)
  })

  it('Escape key exits the editor', () => {
    const element = makeRectShape()
    const onExit = jest.fn()
    render(<ShapePointEditor element={element} onChangePath={() => {}} onExit={onExit} />)
    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' })
    })
    expect(onExit).toHaveBeenCalled()
  })

  it('Delete removes the selected anchor when the subpath has room', () => {
    const element = makeRectShape()
    const onChangePath = jest.fn()
    const { container } = render(<ShapePointEditor element={element} onChangePath={onChangePath} onExit={() => {}} />)
    const anchors = container.querySelectorAll('rect[data-testid^="shape-point-editor-"]')
    // Select an anchor by mouse-down; then release without moving so it's purely a selection.
    act(() => {
      fireEvent.mouseDown(anchors[0], { clientX: 0, clientY: 0 })
    })
    act(() => {
      fireEvent.mouseUp(window)
    })
    act(() => {
      fireEvent.keyDown(window, { key: 'Delete' })
    })
    const last = onChangePath.mock.calls[onChangePath.mock.calls.length - 1]
    expect(last).toBeTruthy()
    const data = customPathToNodes(last[0] as string)
    expect(data.subpaths[0].nodes.length).toBe(3)
  })
})
