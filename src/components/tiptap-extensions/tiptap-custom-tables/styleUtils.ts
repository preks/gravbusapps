import type {
  TableAlignment,
  TableBorderSideAttributes,
  TableBorderStyle,
  TableCellStyleAttributes,
  TableCellTextAlignment,
  TableSurfaceStyleAttributes,
  TableTheme,
  TableCellVerticalAlignment,
  TableWidthMode
} from './types'
import {
  TABLE_ALIGNMENTS,
  TABLE_BORDER_STYLES,
  TABLE_CELL_TEXT_ALIGNMENTS,
  TABLE_CELL_VERTICAL_ALIGNMENTS,
  TABLE_THEMES,
  TABLE_WIDTH_MODES
} from './types'

const BORDER_SIDE_KEYS = [
  { attrPrefix: 'Top', css: 'top' },
  { attrPrefix: 'Right', css: 'right' },
  { attrPrefix: 'Bottom', css: 'bottom' },
  { attrPrefix: 'Left', css: 'left' }
] as const

export function normalizeCssLength(value: string | undefined | null): string | null {
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

export function normalizeTableWidth(value: string | undefined | null): string | null {
  return normalizeCssLength(value)
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

export function normalizeBorderStyle(value: string | undefined | null): TableBorderStyle | null {
  const normalized = value?.trim().toLowerCase()
  if (!normalized) return null
  return TABLE_BORDER_STYLES.includes(normalized as TableBorderStyle) ? (normalized as TableBorderStyle) : null
}

export function normalizeTableTheme(value: string | undefined | null): TableTheme | null {
  const normalized = value?.trim().toLowerCase()
  if (!normalized) return null
  return TABLE_THEMES.includes(normalized as TableTheme) ? (normalized as TableTheme) : null
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

export function getTableStyle(width: string | null, align: TableAlignment, mode: TableWidthMode) {
  const alignmentStyle = getAlignmentStyle(align)

  if (mode === 'auto-fit-window') {
    return `width: 100%; max-width: 100%; ${alignmentStyle}`
  }

  if (mode === 'auto-fit-content') {
    return `width: max-content; max-width: 100%; ${alignmentStyle}`
  }

  if (!width) {
    return `width: auto; max-width: 100%; ${alignmentStyle}`
  }

  return `width: ${width}; max-width: 100%; ${alignmentStyle}`
}

export function getTableWrapperStyle(width: string | null, align: TableAlignment, mode: TableWidthMode) {
  const alignmentStyle = getAlignmentStyle(align)

  if (mode === 'auto-fit-window') {
    return `width: 100%; max-width: 100%; ${alignmentStyle}`
  }

  if (mode === 'auto-fit-content') {
    return `width: 100%; max-width: 100%; ${alignmentStyle}`
  }

  if (!width) {
    return `width: 100%; max-width: 100%; ${alignmentStyle}`
  }

  return `width: ${width}; max-width: 100%; ${alignmentStyle}`
}

export function getTableSurfaceStyle(attributes: TableSurfaceStyleAttributes) {
  const styles: string[] = []

  if (attributes.tableBackgroundColor) styles.push(`background-color: ${attributes.tableBackgroundColor}`)

  if (attributes.tableBorderStyle === 'none') {
    styles.push('border: none')
  } else {
    if (attributes.tableBorderStyle) styles.push(`border-style: ${attributes.tableBorderStyle}`)
    if (attributes.tableBorderWidth) styles.push(`border-width: ${attributes.tableBorderWidth}`)
    if (attributes.tableBorderColor) styles.push(`border-color: ${attributes.tableBorderColor}`)
  }

  if (attributes.tableBorderRadius) styles.push(`border-radius: ${attributes.tableBorderRadius}`)

  return styles.join('; ')
}

export function getColStyleDeclaration(minWidth: number, width: number | undefined): [string, string] {
  if (width) {
    return ['width', `${Math.max(width, minWidth)}px`]
  }

  return ['min-width', `${minWidth}px`]
}

function getBorderSideValue<T extends keyof TableBorderSideAttributes>(
  attributes: TableCellStyleAttributes,
  side: 'Top' | 'Right' | 'Bottom' | 'Left',
  suffix: 'Style' | 'Width' | 'Color'
) {
  return attributes[`border${side}${suffix}` as T]
}

export function getCellStyle(attributes: TableCellStyleAttributes) {
  const styles: string[] = []

  if (attributes.cellTextAlign) styles.push(`text-align: ${attributes.cellTextAlign}`)
  if (attributes.cellVerticalAlign) styles.push(`vertical-align: ${attributes.cellVerticalAlign}`)
  if (attributes.backgroundColor) styles.push(`background-color: ${attributes.backgroundColor}`)
  if (attributes.borderColor) styles.push(`border-color: ${attributes.borderColor}`)

  for (const side of BORDER_SIDE_KEYS) {
    const borderStyle = normalizeBorderStyle(getBorderSideValue(attributes, side.attrPrefix, 'Style') as string | null)
    const borderWidth = normalizeCssLength(getBorderSideValue(attributes, side.attrPrefix, 'Width') as string | null)
    const borderColor =
      normalizeColorValue(getBorderSideValue(attributes, side.attrPrefix, 'Color') as string | null) ??
      normalizeColorValue(attributes.borderColor)

    if (borderStyle === 'none') {
      styles.push(`border-${side.css}: none`)
      continue
    }

    if (borderStyle) styles.push(`border-${side.css}-style: ${borderStyle}`)
    if (borderWidth) styles.push(`border-${side.css}-width: ${borderWidth}`)
    if (borderColor) styles.push(`border-${side.css}-color: ${borderColor}`)
  }

  return styles.join('; ')
}

export function getNormalizedCellStyleAttributes(attributes: Record<string, unknown>): TableCellStyleAttributes {
  return {
    cellTextAlign: normalizeCellTextAlign(attributes.cellTextAlign as string | null),
    cellVerticalAlign: normalizeCellVerticalAlign(attributes.cellVerticalAlign as string | null),
    backgroundColor: normalizeColorValue(attributes.backgroundColor as string | null),
    borderColor: normalizeColorValue(attributes.borderColor as string | null),
    borderTopStyle: normalizeBorderStyle(attributes.borderTopStyle as string | null),
    borderTopWidth: normalizeCssLength(attributes.borderTopWidth as string | null),
    borderTopColor: normalizeColorValue(attributes.borderTopColor as string | null),
    borderRightStyle: normalizeBorderStyle(attributes.borderRightStyle as string | null),
    borderRightWidth: normalizeCssLength(attributes.borderRightWidth as string | null),
    borderRightColor: normalizeColorValue(attributes.borderRightColor as string | null),
    borderBottomStyle: normalizeBorderStyle(attributes.borderBottomStyle as string | null),
    borderBottomWidth: normalizeCssLength(attributes.borderBottomWidth as string | null),
    borderBottomColor: normalizeColorValue(attributes.borderBottomColor as string | null),
    borderLeftStyle: normalizeBorderStyle(attributes.borderLeftStyle as string | null),
    borderLeftWidth: normalizeCssLength(attributes.borderLeftWidth as string | null),
    borderLeftColor: normalizeColorValue(attributes.borderLeftColor as string | null)
  }
}

export function getNormalizedTableSurfaceStyleAttributes(
  attributes: Record<string, unknown>
): TableSurfaceStyleAttributes {
  return {
    tableBackgroundColor: normalizeColorValue(attributes.tableBackgroundColor as string | null),
    tableBorderStyle: normalizeBorderStyle(attributes.tableBorderStyle as string | null),
    tableBorderWidth: normalizeCssLength(attributes.tableBorderWidth as string | null),
    tableBorderColor: normalizeColorValue(attributes.tableBorderColor as string | null),
    tableBorderRadius: normalizeCssLength(attributes.tableBorderRadius as string | null)
  }
}
