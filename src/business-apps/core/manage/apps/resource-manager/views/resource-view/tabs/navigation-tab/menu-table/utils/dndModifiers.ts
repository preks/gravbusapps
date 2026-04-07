import type { Modifier } from '@dnd-kit/core'

/**
 * Custom modifier that constrains drag overlay horizontal position based on tree depth
 * while allowing free vertical movement.
 * Hubs (level === 0) always stay at depth 0 regardless of horizontal movement.
 */
export const createTreeModifier = (
  projected: { depth: number; visualParentId: string | null } | null,
  isHub: boolean,
  baseDepth: number,
  indentationWidth: number = 24
): Modifier => {
  return ({ transform }) => {
    // Hubs always stay at depth 0, cannot be moved horizontally
    if (isHub) {
      return {
        ...transform,
        x: 0,
        y: transform.y
      }
    }

    // Calculate the depth change from base depth and use ONLY that for x position
    const targetDepth = projected ? projected.depth : baseDepth
    const depthDelta = targetDepth - baseDepth
    const horizontalOffset = depthDelta * indentationWidth

    // Set x to ONLY the horizontal offset (ignore transform.x from mouse movement)
    return {
      ...transform,
      x: horizontalOffset,
      y: transform.y
    }
  }
}
