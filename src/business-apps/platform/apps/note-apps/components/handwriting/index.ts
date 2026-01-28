/**
 * Handwriting components barrel export
 */

export { PaperBackground } from './PaperBackground'
export { HandwritingCanvas } from './HandwritingCanvas'
export { HandwritingToolbar } from './HandwritingToolbar'
export { TransformMenu } from './TransformMenu'

// Types
export type PaperStyle = 'lined' | 'grid' | 'dotted' | 'plain'

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
