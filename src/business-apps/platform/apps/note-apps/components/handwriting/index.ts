/**
 * Handwriting components barrel export
 */

export { PaperBackground } from './PaperBackground'
export { HandwritingCanvas } from './HandwritingCanvas'
export { HandwritingToolbar } from './HandwritingToolbar'
export { TransformMenu } from './TransformMenu'
export { SummaryPanel } from './SummaryPanel'
export { ActionItemsModal } from './ActionItemsModal'
export { ActionItemsList } from './ActionItemsList'

// Types
export type PaperStyle = 'lined' | 'grid' | 'dotted' | 'plain'

export type { StrokeData, StrokePoint } from '../../../shared/types/strokes'
