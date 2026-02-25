/**
 * Single source of truth for FlowViewer node dimensions (display sizes).
 * Used by FlowViewer for node wrapper size and by ELK layout for positioning.
 */

/** Offset in px by which connection handles are placed outside the node edge (so edges don't touch the border). */
export const HANDLE_OFFSET = 4

export const CIRCULAR_NODE_SIZE = 140
export const DECISION_NODE_SIZE = 170
export const TASK_NODE_WIDTH = 260
export const TASK_NODE_HEIGHT = 140
export const BAR_NODE_WIDTH = 200
export const BAR_NODE_HEIGHT = 40

export function getNodeDimensions(nodeType: string): { width: number; height: number } {
  switch (nodeType) {
    case 'start':
    case 'end':
      return { width: CIRCULAR_NODE_SIZE, height: CIRCULAR_NODE_SIZE }
    case 'decision':
      return { width: DECISION_NODE_SIZE, height: DECISION_NODE_SIZE }
    case 'fork':
    case 'join':
      return { width: BAR_NODE_WIDTH, height: BAR_NODE_HEIGHT }
    default:
      return { width: TASK_NODE_WIDTH, height: TASK_NODE_HEIGHT }
  }
}
