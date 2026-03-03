/**
 * Extends the first and last point of an edge polyline outward by the given offset
 * so the drawn path connects at the handle position (outside the node) instead of the node boundary.
 */
export function extendEdgePointsByHandleOffset(
  points: Array<{ x: number; y: number }>,
  offset: number
): Array<{ x: number; y: number }> {
  if (points.length < 2 || offset <= 0) return points

  const result = [...points]
  const n = points.length

  // Move first point outward from source node (along path direction: points[0] -> points[1])
  const dx0 = points[1].x - points[0].x
  const dy0 = points[1].y - points[0].y
  const len0 = Math.hypot(dx0, dy0)
  if (len0 > 1e-6) {
    result[0] = {
      x: points[0].x + (dx0 / len0) * offset,
      y: points[0].y + (dy0 / len0) * offset
    }
  }

  // Move last point outward from target node (along path direction: points[n-1] -> points[n-2])
  const dx1 = points[n - 2].x - points[n - 1].x
  const dy1 = points[n - 2].y - points[n - 1].y
  const len1 = Math.hypot(dx1, dy1)
  if (len1 > 1e-6) {
    result[n - 1] = {
      x: points[n - 1].x + (dx1 / len1) * offset,
      y: points[n - 1].y + (dy1 / len1) * offset
    }
  }

  return result
}
