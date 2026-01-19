import { EditorElement } from '../types'

/**
 * Validate and normalize element colSpan
 */
const validateColSpan = (el: EditorElement, index: number): number => {
  const rawSpan = el.colSpan || 12

  if (!Number.isFinite(rawSpan) || rawSpan <= 0) {
    console.warn(
      `[rowLayout] Element at index ${index} (id: ${el.id || 'unknown'}) has invalid colSpan ${rawSpan}, defaulting to 1`
    )
    return 1
  }

  if (rawSpan > 12) {
    console.warn(
      `[rowLayout] Element at index ${index} (id: ${el.id || 'unknown'}) has colSpan ${rawSpan} exceeding max of 12, clamping to 12`
    )
    return 12
  }

  return rawSpan
}

/**
 * Group elements into rows based on their total column span
 */
export const groupIntoRows = (els: EditorElement[]): EditorElement[][] => {
  const rows: EditorElement[][] = []

  // Separate elements with explicit rowIndex from auto-placed elements
  const explicitElements: Array<{ el: EditorElement; index: number }> = []
  const autoElements: Array<{ el: EditorElement; index: number }> = []

  els.forEach((el, index) => {
    if (el.rowIndex !== undefined) {
      explicitElements.push({ el, index })
    } else {
      autoElements.push({ el, index })
    }
  })

  // First, place all elements with explicit rowIndex
  explicitElements.forEach(({ el, index }) => {
    const elSpan = validateColSpan(el, index)
    const targetRow = el.rowIndex!

    // Ensure rows array is large enough
    while (rows.length <= targetRow) {
      rows.push([])
    }

    // Validate row capacity before adding
    const currentRowSpan = rows[targetRow].reduce((sum, existingEl) => sum + (existingEl.colSpan || 12), 0)

    if (currentRowSpan + elSpan > 12) {
      console.error(
        `[rowLayout] Element at index ${index} (id: ${el.id || 'unknown'}) with colSpan ${elSpan} ` +
          `cannot fit in row ${targetRow} (current usage: ${currentRowSpan}/12). ` +
          `Placing in new row instead.`
      )
      // Place in a new row at the end
      rows.push([el])
    } else {
      rows[targetRow].push(el)
    }
  })

  // Now auto-place remaining elements, starting from the last row state
  let currentRow: EditorElement[] = []
  let currentRowSpan = 0

  // Initialize from the last non-empty row if it exists
  if (rows.length > 0) {
    const lastRow = rows[rows.length - 1]
    if (lastRow.length > 0) {
      currentRow = [...lastRow]
      currentRowSpan = lastRow.reduce((sum, el) => sum + (el.colSpan || 12), 0)
      // Remove the last row since we'll re-add it after processing auto elements
      rows.pop()
    }
  }

  autoElements.forEach(({ el, index }) => {
    const elSpan = validateColSpan(el, index)

    // Check if element fits in current row
    if (currentRowSpan + elSpan <= 12) {
      currentRow.push(el)
      currentRowSpan += elSpan
    } else {
      // Start new row
      if (currentRow.length > 0) {
        rows.push([...currentRow])
      }
      currentRow = [el]
      currentRowSpan = elSpan
    }
  })

  // Add last row if any
  if (currentRow.length > 0) {
    rows.push(currentRow)
  }

  return rows
}

/**
 * Calculate available space in a row (0-12)
 */
export const getRowSpace = (row: EditorElement[]): number => {
  const used = row.reduce((sum, el) => sum + (el.colSpan || 12), 0)
  const space = 12 - used
  return Math.max(0, Math.min(12, space))
}
