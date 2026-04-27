/**
 * Shape / element arrangement operations.
 *
 * Provides reusable primitives for align, distribute, flip, group/ungroup,
 * and connector-binding resolution. Kept framework-agnostic so the editor
 * can call them from the toolbar, keyboard shortcuts, and command palette
 * without duplicating geometry math.
 */

import type {
  AnySlideElement,
  ConnectorBindSite,
  ConnectorBinding,
  ConnectorElement,
  GroupElement,
  Position,
  ShapeElement,
  ShapeGeometryMetadata,
  SlideElement
} from './slideElements'
import { createGroupElement, defaultGeometryForShape, getShapeGeometry } from './slideElements'

export type AlignAxis = 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom'
export type DistributeAxis = 'horizontal' | 'vertical'

/**
 * Normalized bounding box of an element on the slide. Uses the element's
 * raw `position`/`size` and ignores rotation — align/distribute are defined
 * against the axis-aligned bounds, matching PowerPoint's behavior.
 */
export interface ElementBounds {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
  centerX: number
  centerY: number
}

export function boundsOf(element: SlideElement): ElementBounds {
  const { x, y } = element.position
  const { width, height } = element.size
  return {
    left: x,
    top: y,
    right: x + width,
    bottom: y + height,
    width,
    height,
    centerX: x + width / 2,
    centerY: y + height / 2
  }
}

/**
 * Compute the axis-aligned bounding box enclosing the given elements.
 * Returns `null` when the list is empty so callers can no-op gracefully.
 */
export function combinedBounds(elements: SlideElement[]): ElementBounds | null {
  if (elements.length === 0) return null
  let left = Infinity
  let top = Infinity
  let right = -Infinity
  let bottom = -Infinity
  for (const element of elements) {
    const b = boundsOf(element)
    if (b.left < left) left = b.left
    if (b.top < top) top = b.top
    if (b.right > right) right = b.right
    if (b.bottom > bottom) bottom = b.bottom
  }
  const width = right - left
  const height = bottom - top
  return {
    left,
    top,
    right,
    bottom,
    width,
    height,
    centerX: left + width / 2,
    centerY: top + height / 2
  }
}

/**
 * Compute new positions that align every element in `elements` along the
 * shared bounding box's `axis` edge. When only one element is provided we
 * align against the slide-level canvas bounds instead, matching PowerPoint.
 */
export function alignElements(
  elements: SlideElement[],
  axis: AlignAxis,
  canvasBounds?: ElementBounds
): Map<string, Position> {
  const result = new Map<string, Position>()
  if (elements.length === 0) return result
  const reference: ElementBounds | null = elements.length > 1 ? combinedBounds(elements) : (canvasBounds ?? null)
  if (!reference) return result

  for (const element of elements) {
    const b = boundsOf(element)
    let { x, y } = element.position
    switch (axis) {
      case 'left':
        x = reference.left
        break
      case 'center-h':
        x = reference.centerX - b.width / 2
        break
      case 'right':
        x = reference.right - b.width
        break
      case 'top':
        y = reference.top
        break
      case 'center-v':
        y = reference.centerY - b.height / 2
        break
      case 'bottom':
        y = reference.bottom - b.height
        break
    }
    result.set(element.id, { x, y })
  }
  return result
}

/**
 * Distribute elements evenly along the requested axis between the two
 * extreme elements. Fewer than three inputs return an empty map because
 * distribution is a no-op in that case (matches PowerPoint).
 */
export function distributeElements(elements: SlideElement[], axis: DistributeAxis): Map<string, Position> {
  const result = new Map<string, Position>()
  if (elements.length < 3) return result

  const sorted = [...elements].sort((a, b) => {
    const ba = boundsOf(a)
    const bb = boundsOf(b)
    return axis === 'horizontal' ? ba.centerX - bb.centerX : ba.centerY - bb.centerY
  })

  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  const firstBounds = boundsOf(first)
  const lastBounds = boundsOf(last)
  const step =
    axis === 'horizontal'
      ? (lastBounds.centerX - firstBounds.centerX) / (sorted.length - 1)
      : (lastBounds.centerY - firstBounds.centerY) / (sorted.length - 1)

  for (let i = 1; i < sorted.length - 1; i++) {
    const element = sorted[i]
    const b = boundsOf(element)
    if (axis === 'horizontal') {
      const newCenterX = firstBounds.centerX + step * i
      result.set(element.id, {
        x: newCenterX - b.width / 2,
        y: element.position.y
      })
    } else {
      const newCenterY = firstBounds.centerY + step * i
      result.set(element.id, {
        x: element.position.x,
        y: newCenterY - b.height / 2
      })
    }
  }
  return result
}

/**
 * Flip a shape along the requested axis. Native shapes get a `geometry`
 * stub lazily so flip state persists round-trip through PPTX export.
 */
export function flipShape(shape: ShapeElement, axis: 'horizontal' | 'vertical'): ShapeElement {
  const current: ShapeGeometryMetadata = getShapeGeometry(shape) ?? defaultGeometryForShape(shape.shapeType)
  const next: ShapeGeometryMetadata = {
    ...current,
    flipH: axis === 'horizontal' ? !current.flipH : current.flipH,
    flipV: axis === 'vertical' ? !current.flipV : current.flipV
  }
  return {
    ...shape,
    geometry: next,
    importMeta: current.sourceFormat === 'pptx' ? next : shape.importMeta
  }
}

/**
 * Snap the given axis-aligned bind site on a shape to slide-absolute
 * coordinates. Rotation is intentionally ignored to match PowerPoint's
 * "connect to unrotated bounding box" behavior so connectors stay
 * attached to a stable anchor while the user rotates the target.
 */
export function resolveBindSite(target: Pick<SlideElement, 'position' | 'size'>, site: ConnectorBindSite): Position {
  const { x, y } = target.position
  const { width, height } = target.size
  switch (site) {
    case 'top':
      return { x: x + width / 2, y }
    case 'right':
      return { x: x + width, y: y + height / 2 }
    case 'bottom':
      return { x: x + width / 2, y: y + height }
    case 'left':
      return { x, y: y + height / 2 }
    case 'center':
    default:
      return { x: x + width / 2, y: y + height / 2 }
  }
}

/**
 * Pick the nearest bind site on a shape to the given slide-absolute point.
 * Used by interactive connector authoring when the user hovers an endpoint
 * over a shape.
 */
export function nearestBindSite(target: Pick<SlideElement, 'position' | 'size'>, point: Position): ConnectorBindSite {
  const sites: ConnectorBindSite[] = ['top', 'right', 'bottom', 'left']
  let best: ConnectorBindSite = 'center'
  let bestDist = Infinity
  for (const site of sites) {
    const p = resolveBindSite(target, site)
    const d = Math.hypot(p.x - point.x, p.y - point.y)
    if (d < bestDist) {
      bestDist = d
      best = site
    }
  }
  return best
}

/**
 * Refresh both connector endpoints from their bindings (when set). Returns
 * the connector unchanged when no bindings exist, or when the bound elements
 * cannot be resolved on the current slide (e.g. after deletion).
 */
export function refreshConnectorFromBindings(
  connector: ConnectorElement,
  elementsById: Map<string, Pick<SlideElement, 'position' | 'size'>>
): ConnectorElement {
  let startPoint = connector.startPoint
  let endPoint = connector.endPoint
  if (connector.startBinding) {
    const target = elementsById.get(connector.startBinding.elementId)
    if (target) startPoint = resolveBindSite(target, connector.startBinding.site)
  }
  if (connector.endBinding) {
    const target = elementsById.get(connector.endBinding.elementId)
    if (target) endPoint = resolveBindSite(target, connector.endBinding.site)
  }
  if (startPoint === connector.startPoint && endPoint === connector.endPoint) {
    return connector
  }
  return {
    ...connector,
    startPoint,
    endPoint,
    position: { x: Math.min(startPoint.x, endPoint.x), y: Math.min(startPoint.y, endPoint.y) },
    size: {
      width: Math.max(1, Math.abs(endPoint.x - startPoint.x)),
      height: Math.max(1, Math.abs(endPoint.y - startPoint.y))
    }
  }
}

/** Bind a connector endpoint to a shape. Keeps absolute coordinates in sync. */
export function bindConnectorEndpoint(
  connector: ConnectorElement,
  endpoint: 'start' | 'end',
  binding: ConnectorBinding | undefined,
  target?: Pick<SlideElement, 'position' | 'size'>
): ConnectorElement {
  const next: ConnectorElement = { ...connector }
  if (endpoint === 'start') {
    next.startBinding = binding
    if (binding && target) next.startPoint = resolveBindSite(target, binding.site)
  } else {
    next.endBinding = binding
    if (binding && target) next.endPoint = resolveBindSite(target, binding.site)
  }
  next.position = {
    x: Math.min(next.startPoint.x, next.endPoint.x),
    y: Math.min(next.startPoint.y, next.endPoint.y)
  }
  next.size = {
    width: Math.max(1, Math.abs(next.endPoint.x - next.startPoint.x)),
    height: Math.max(1, Math.abs(next.endPoint.y - next.startPoint.y))
  }
  return next
}

/**
 * Build a {@link GroupElement} from the given children, moving each child
 * into coordinates relative to the new group origin so moving the group
 * keeps its contents cohesive.
 */
export function groupElements(children: AnySlideElement[]): GroupElement | null {
  if (children.length < 2) return null
  const bounds = combinedBounds(children)
  if (!bounds) return null
  const reparented = children.map(child => ({
    ...child,
    position: {
      x: child.position.x - bounds.left,
      y: child.position.y - bounds.top
    }
  })) as AnySlideElement[]
  return createGroupElement(reparented, {
    position: { x: bounds.left, y: bounds.top },
    size: { width: Math.max(10, bounds.width), height: Math.max(10, bounds.height) }
  })
}

/**
 * Explode a group back into its individual children using slide-absolute
 * coordinates. Callers typically splice the result in place of the group
 * element in the slide's elements array.
 */
export function ungroupElement(group: GroupElement): AnySlideElement[] {
  return group.children.map(child => ({
    ...child,
    position: {
      x: group.position.x + child.position.x,
      y: group.position.y + child.position.y
    }
  })) as AnySlideElement[]
}
