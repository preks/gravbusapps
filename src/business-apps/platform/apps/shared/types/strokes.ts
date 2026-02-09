/**
 * Shared stroke types (used by handwriting editors and hybrid canvas)
 *
 * IMPORTANT: kept in `shared/` to avoid circular dependencies between apps.
 */

export interface StrokePoint {
  x: number
  y: number
  pressure?: number
}

export interface StrokeData {
  points: StrokePoint[]
  color: string
  width: number
  timestamp: number
}
