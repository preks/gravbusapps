import {
  alignElements,
  bindConnectorEndpoint,
  boundsOf,
  combinedBounds,
  distributeElements,
  flipShape,
  groupElements,
  nearestBindSite,
  refreshConnectorFromBindings,
  resolveBindSite,
  ungroupElement
} from '../shapeOperations'
import { createConnectorElement, createShapeElement, type AnySlideElement, type ShapeElement } from '../slideElements'

const makeShape = (overrides: Partial<ShapeElement> = {}): ShapeElement => {
  const shape = createShapeElement('rectangle', {
    position: { x: 0, y: 0 },
    size: { width: 100, height: 50 }
  })
  return { ...shape, ...overrides }
}

describe('shapeOperations - bounds', () => {
  it('boundsOf derives an axis-aligned box from position + size', () => {
    const shape = makeShape({ position: { x: 10, y: 20 }, size: { width: 30, height: 40 } })
    const b = boundsOf(shape)
    expect(b).toEqual({
      left: 10,
      top: 20,
      right: 40,
      bottom: 60,
      width: 30,
      height: 40,
      centerX: 25,
      centerY: 40
    })
  })

  it('combinedBounds returns null for empty input and composite bounds otherwise', () => {
    expect(combinedBounds([])).toBeNull()
    const bounds = combinedBounds([
      makeShape({ position: { x: 0, y: 0 }, size: { width: 10, height: 10 } }),
      makeShape({ position: { x: 20, y: 30 }, size: { width: 10, height: 10 } })
    ])
    expect(bounds).toEqual({
      left: 0,
      top: 0,
      right: 30,
      bottom: 40,
      width: 30,
      height: 40,
      centerX: 15,
      centerY: 20
    })
  })
})

describe('shapeOperations - align', () => {
  it('aligns to the bounding-box left edge', () => {
    const a = makeShape({ id: 'a', position: { x: 5, y: 0 }, size: { width: 10, height: 10 } })
    const b = makeShape({ id: 'b', position: { x: 20, y: 0 }, size: { width: 10, height: 10 } })
    const positions = alignElements([a, b], 'left')
    expect(positions.get('a')).toEqual({ x: 5, y: 0 })
    expect(positions.get('b')).toEqual({ x: 5, y: 0 })
  })

  it('center aligns against canvas bounds when only one element is selected', () => {
    const a = makeShape({ id: 'a', position: { x: 0, y: 0 }, size: { width: 100, height: 50 } })
    const positions = alignElements([a], 'center-h', {
      left: 0,
      top: 0,
      right: 1000,
      bottom: 1000,
      width: 1000,
      height: 1000,
      centerX: 500,
      centerY: 500
    })
    expect(positions.get('a')?.x).toBe(450)
  })
})

describe('shapeOperations - distribute', () => {
  it('returns an empty map for fewer than three elements', () => {
    const a = makeShape({ id: 'a', position: { x: 0, y: 0 } })
    const b = makeShape({ id: 'b', position: { x: 100, y: 0 } })
    const positions = distributeElements([a, b], 'horizontal')
    expect(positions.size).toBe(0)
  })

  it('distributes middle elements evenly between extremes', () => {
    const a = makeShape({ id: 'a', position: { x: 0, y: 0 }, size: { width: 10, height: 10 } })
    const b = makeShape({ id: 'b', position: { x: 50, y: 0 }, size: { width: 10, height: 10 } })
    const c = makeShape({ id: 'c', position: { x: 200, y: 0 }, size: { width: 10, height: 10 } })
    const positions = distributeElements([a, b, c], 'horizontal')
    expect(positions.get('b')?.x).toBe(100)
    expect(positions.has('a')).toBe(false)
    expect(positions.has('c')).toBe(false)
  })
})

describe('shapeOperations - flip', () => {
  it('toggles flipH on the shared geometry metadata', () => {
    const shape = makeShape()
    const flipped = flipShape(shape, 'horizontal')
    expect(flipped.geometry?.flipH).toBe(true)
    const unflipped = flipShape(flipped, 'horizontal')
    expect(unflipped.geometry?.flipH).toBe(false)
  })

  it('preserves imported metadata while flipping imported shapes', () => {
    const shape = makeShape({
      importMeta: { sourceFormat: 'pptx', prst: 'chevron' },
      geometry: { sourceFormat: 'pptx', prst: 'chevron' }
    })
    const flipped = flipShape(shape, 'vertical')
    expect(flipped.importMeta?.flipV).toBe(true)
    expect(flipped.geometry?.flipV).toBe(true)
    expect(flipped.geometry?.prst).toBe('chevron')
  })
})

describe('shapeOperations - connector bindings', () => {
  const shape = makeShape({ id: 'target', position: { x: 100, y: 100 }, size: { width: 200, height: 100 } })

  it('resolveBindSite returns the matching edge/center point', () => {
    expect(resolveBindSite(shape, 'left')).toEqual({ x: 100, y: 150 })
    expect(resolveBindSite(shape, 'right')).toEqual({ x: 300, y: 150 })
    expect(resolveBindSite(shape, 'top')).toEqual({ x: 200, y: 100 })
    expect(resolveBindSite(shape, 'center')).toEqual({ x: 200, y: 150 })
  })

  it('nearestBindSite picks the closest edge', () => {
    expect(nearestBindSite(shape, { x: 95, y: 150 })).toBe('left')
    expect(nearestBindSite(shape, { x: 305, y: 150 })).toBe('right')
  })

  it('refreshConnectorFromBindings re-snaps endpoints to their bound shapes', () => {
    const connector = createConnectorElement(
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { startBinding: { elementId: 'target', site: 'left' } }
    )
    const refreshed = refreshConnectorFromBindings(connector, new Map<string, ShapeElement>([['target', shape]]))
    expect(refreshed.startPoint).toEqual({ x: 100, y: 150 })
  })

  it('bindConnectorEndpoint updates binding and endpoint coordinates together', () => {
    const connector = createConnectorElement({ x: 0, y: 0 }, { x: 10, y: 10 })
    const bound = bindConnectorEndpoint(connector, 'end', { elementId: 'target', site: 'right' }, shape)
    expect(bound.endBinding?.site).toBe('right')
    expect(bound.endPoint).toEqual({ x: 300, y: 150 })
  })
})

describe('shapeOperations - group/ungroup', () => {
  it('groupElements returns null for fewer than two children', () => {
    expect(groupElements([])).toBeNull()
    expect(groupElements([makeShape()])).toBeNull()
  })

  it('groupElements reparents children into group-relative coordinates', () => {
    const a = makeShape({ id: 'a', position: { x: 50, y: 50 }, size: { width: 10, height: 10 } })
    const b = makeShape({ id: 'b', position: { x: 80, y: 90 }, size: { width: 10, height: 10 } })
    const group = groupElements([a, b])
    expect(group).not.toBeNull()
    expect(group!.position).toEqual({ x: 50, y: 50 })
    expect(group!.children.find(c => c.id === 'a')?.position).toEqual({ x: 0, y: 0 })
    expect(group!.children.find(c => c.id === 'b')?.position).toEqual({ x: 30, y: 40 })
  })

  it('ungroupElement restores slide-absolute child coordinates', () => {
    const a = makeShape({ id: 'a', position: { x: 50, y: 50 }, size: { width: 10, height: 10 } })
    const b = makeShape({ id: 'b', position: { x: 80, y: 90 }, size: { width: 10, height: 10 } })
    const group = groupElements([a, b])!
    const restored = ungroupElement(group) as AnySlideElement[]
    expect(restored.find(c => c.id === 'a')?.position).toEqual({ x: 50, y: 50 })
    expect(restored.find(c => c.id === 'b')?.position).toEqual({ x: 80, y: 90 })
  })
})
