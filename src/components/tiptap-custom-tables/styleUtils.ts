import type {
  TableAlignment,
  TableCellStyleAttributes,
  TableCellTextAlignment,
  TableCellVerticalAlignment,
  TableWidthMode
} from './types'
import {
  TABLE_ALIGNMENTS,
  TABLE_CELL_TEXT_ALIGNMENTS,
  TABLE_CELL_VERTICAL_ALIGNMENTS,
  TABLE_WIDTH_MODES
} from './types'

export function normalizeTableWidth(value: string | undefined | null): string | null {
  const normalized = value?.trim()
  if (!normalized) return null

  if (/^\d+(\.\d+)?$/.test(normalized)) {
    return `${normalized}pt`
  }

  if (/^\d+(\.\d+)?(px|pt|pc|cm|mm|in|%)$/i.test(normalized)) {
    return normalized
  }

  return null
}

export function normalizeTableAlign(value: string | undefined | null): TableAlignment | null {
  const normalized = value?.trim().toLowerCase()
  if (!normalized) return null
  return TABLE_ALIGNMENTS.includes(normalized as TableAlignment) ? (normalized as TableAlignment) : null
}

export function normalizeTableWidthMode(value: string | undefined | null): TableWidthMode | null {
  const normalized = value?.trim().toLowerCase()
  if (!normalized) return null
  return TABLE_WIDTH_MODES.includes(normalized as TableWidthMode) ? (normalized as TableWidthMode) : null
}

export function normalizeCellTextAlign(value: string | undefined | null): TableCellTextAlignment | null {
  const normalized = value?.trim().toLowerCase()
  if (!normalized) return null
  return TABLE_CELL_TEXT_ALIGNMENTS.includes(normalized as TableCellTextAlignment)
    ? (normalized as TableCellTextAlignment)
    : null
}

export function normalizeCellVerticalAlign(value: string | undefined | null): TableCellVerticalAlignment | null {
  const normalized = value?.trim().toLowerCase()
  if (!normalized) return null
  return TABLE_CELL_VERTICAL_ALIGNMENTS.includes(normalized as TableCellVerticalAlignment)
    ? (normalized as TableCellVerticalAlignment)
    : null
}

export function normalizeColorValue(value: string | undefined | null): string | null {
  const normalized = value?.trim()
  if (!normalized) return null

  if (/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(normalized)) return normalized
  if (/^(rgb|rgba|hsl|hsla)\(/i.test(normalized)) return normalized

  return null
}

function getAlignmentStyle(align: TableAlignment) {
  switch (align) {
    case 'center':
      return 'margin-left: auto; margin-right: auto;'
    case 'right':
      return 'margin-left: auto; margin-right: 0;'
    case 'left':
    default:
      return 'margin-left: 0; margin-right: 0;'
  }
}

export function getTableStyle(width: string, align: TableAlignment, mode: TableWidthMode) {
  const alignmentStyle = getAlignmentStyle(align)

  if (mode === 'auto-fit-window') {
    return `width: 100%; max-width: 100%; ${alignmentStyle}`
  }

  if (mode === 'auto-fit-content') {
    return `width: max-content; max-width: 100%; ${alignmentStyle}`
  }

  return `width: ${width}; ${alignmentStyle}`
}

export function getTableWrapperStyle(width: string, align: TableAlignment, mode: TableWidthMode) {
  const alignmentStyle = getAlignmentStyle(align)

  if (mode === 'auto-fit-window') {
    return `width: 100%; max-width: 100%; ${alignmentStyle}`
  }

  if (mode === 'auto-fit-content') {
    return `width: max-content; max-width: 100%; ${alignmentStyle}`
  }

  return `width: ${width}; max-width: 100%; ${alignmentStyle}`
}

export function getCellStyle(attributes: TableCellStyleAttributes) {
  const styles: string[] = []

  if (attributes.cellTextAlign) styles.push(`text-align: ${attributes.cellTextAlign}`)
  if (attributes.cellVerticalAlign) styles.push(`vertical-align: ${attributes.cellVerticalAlign}`)
  if (attributes.backgroundColor) styles.push(`background-color: ${attributes.backgroundColor}`)
  if (attributes.borderColor) styles.push(`border-color: ${attributes.borderColor}`)

  return styles.join('; ')
}
