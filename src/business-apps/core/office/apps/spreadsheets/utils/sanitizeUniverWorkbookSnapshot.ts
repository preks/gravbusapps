import DOMPurify from 'dompurify'
import { z } from 'zod'
import { tryStructuredClone } from './tryStructuredClone'

const HTTP_LIKE_URI_REGEXP =
  /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|matrix):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
const IMAGE_URI_REGEXP =
  /^(?:(?:(?:f|ht)tps?|blob|mailto|tel|callto|sms|cid|xmpp|matrix):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
const SAFE_STYLE_ID_REGEXP = /^[\w:-]+$/i
const SAFE_COLOR_REGEXP = /^#[0-9a-f]{3,8}$/i
const INLINE_CELL_STYLE_KEYS = [
  'bl',
  'it',
  'ul',
  'st',
  'ol',
  'ff',
  'fs',
  'cl',
  'bg',
  'ht',
  'vt',
  'tb',
  'tr',
  'pd',
  'bd',
  'n'
] as const

const finiteNumberSchema = z.number().finite()
const cellScalarSchema = z.union([z.string(), finiteNumberSchema, z.boolean(), z.null()])
const workbookSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    sheetOrder: z.array(z.string()),
    appVersion: z.string().optional(),
    locale: z.string().optional(),
    styles: z.record(z.string(), z.unknown()).optional(),
    sheets: z.record(z.string(), z.unknown())
  })
  .passthrough()

const worksheetSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    hidden: finiteNumberSchema.optional(),
    cellData: z.record(z.string(), z.unknown()).optional(),
    mergeData: z.array(z.unknown()).optional(),
    rowCount: finiteNumberSchema.optional(),
    columnCount: finiteNumberSchema.optional(),
    defaultColumnWidth: finiteNumberSchema.optional(),
    defaultRowHeight: finiteNumberSchema.optional(),
    columnData: z.record(z.string(), z.unknown()).optional(),
    rowData: z.record(z.string(), z.unknown()).optional(),
    rowHeader: z.record(z.string(), z.unknown()).optional(),
    columnHeader: z.record(z.string(), z.unknown()).optional()
  })
  .passthrough()

type SanitizedWorkbookSnapshotResult = {
  snapshot: Record<string, unknown> | null
  changed: boolean
}

function cloneJson<T>(value: T): T {
  return tryStructuredClone(value) ?? value
}

function trimControlCharacters(value: string): string {
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim()
}

function isUnsafeStyleString(value: string): boolean {
  const lowerValue = value.toLowerCase()
  return (
    lowerValue.includes('expression(') ||
    lowerValue.includes('javascript:') ||
    lowerValue.includes('vbscript:') ||
    lowerValue.includes('url(') ||
    /[<>]/.test(value)
  )
}

function purifyAttribute(tag: 'a' | 'img', attr: 'href' | 'src', raw: string, uriRegexp: RegExp): string {
  if (typeof document === 'undefined') return ''
  const element = document.createElement(tag)
  element.setAttribute(attr, raw)
  const sanitizedHtml = DOMPurify.sanitize(element.outerHTML, {
    ALLOWED_TAGS: [tag],
    ALLOWED_ATTR: [attr],
    ALLOWED_URI_REGEXP: uriRegexp
  })
  const wrapper = document.createElement('div')
  wrapper.innerHTML = sanitizedHtml
  const node = wrapper.querySelector(tag)
  return node?.getAttribute(attr)?.trim() ?? ''
}

function sanitizeWorkbookHref(url: string): string {
  const trimmed = trimControlCharacters(url)
  if (!trimmed) return ''
  if (typeof document === 'undefined') {
    return /^(https?:|mailto:|tel:)/i.test(trimmed) ? trimmed : ''
  }
  return purifyAttribute('a', 'href', trimmed, HTTP_LIKE_URI_REGEXP)
}

function sanitizeWorkbookImageSrc(url: string): string {
  const trimmed = trimControlCharacters(url)
  if (!trimmed) return ''
  if (typeof document === 'undefined') {
    return /^(https?:|blob:|data:image\/[a-z0-9.+-]+;base64,)/i.test(trimmed) ? trimmed : ''
  }
  const purified = purifyAttribute('img', 'src', trimmed, IMAGE_URI_REGEXP)
  if (!purified) return ''
  return /^(https?:|blob:|data:image\/[a-z0-9.+-]+;base64,)/i.test(purified) ? purified : ''
}

function replaceFirstFormulaStringArgument(formula: string, sanitizer: (value: string) => string): string {
  const openQuoteIndex = formula.indexOf('"')
  if (openQuoteIndex === -1) return ''

  let idx = openQuoteIndex + 1
  let encodedValue = ''
  while (idx < formula.length) {
    const char = formula[idx]
    if (char === '"') {
      if (formula[idx + 1] === '"') {
        encodedValue += '"'
        idx += 2
        continue
      }
      break
    }
    encodedValue += char
    idx += 1
  }

  if (idx >= formula.length || formula[idx] !== '"') return ''
  const sanitizedValue = sanitizer(encodedValue)
  if (!sanitizedValue) return ''

  const escapedValue = sanitizedValue.replaceAll('"', '""')
  return `${formula.slice(0, openQuoteIndex + 1)}${escapedValue}${formula.slice(idx)}`
}

function sanitizeFormula(formula: string): string {
  const trimmed = trimControlCharacters(formula)
  if (!trimmed) return ''
  if (/^=?\s*HYPERLINK\(/i.test(trimmed)) {
    return replaceFirstFormulaStringArgument(trimmed, sanitizeWorkbookHref)
  }
  if (/^=?\s*IMAGE\(/i.test(trimmed)) {
    return replaceFirstFormulaStringArgument(trimmed, sanitizeWorkbookImageSrc)
  }
  return trimmed
}

function sanitizeStyleValue(value: unknown): unknown | undefined {
  if (typeof value === 'string') {
    const trimmed = trimControlCharacters(value)
    if (!trimmed || isUnsafeStyleString(trimmed)) return undefined
    if (/^#/.test(trimmed)) return SAFE_COLOR_REGEXP.test(trimmed) ? trimmed : undefined
    return trimmed
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (typeof value === 'boolean' || value === null) return value
  if (Array.isArray(value)) {
    const sanitizedItems = value.map(sanitizeStyleValue).filter(item => item !== undefined)
    return sanitizedItems.length > 0 ? sanitizedItems : undefined
  }
  if (!value || typeof value !== 'object') return undefined

  const sanitizedObject: Record<string, unknown> = {}
  for (const [key, nestedValue] of Object.entries(value)) {
    const sanitizedValue = sanitizeStyleValue(nestedValue)
    if (sanitizedValue !== undefined) {
      sanitizedObject[key] = sanitizedValue
    }
  }
  return Object.keys(sanitizedObject).length > 0 ? sanitizedObject : undefined
}

function normalizeStyleRefId(value: unknown): string | null {
  if (typeof value === 'string') {
    const normalized = trimControlCharacters(value)
    return normalized.length > 0 ? normalized : null
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  return null
}

function sanitizeStyles(styles: Record<string, unknown> | undefined): {
  styles?: Record<string, unknown>
  changed: boolean
} {
  if (!styles) return { styles: undefined, changed: false }
  const sanitizedStyles: Record<string, unknown> = {}
  let changed = false

  for (const [styleId, styleValue] of Object.entries(styles)) {
    if (!SAFE_STYLE_ID_REGEXP.test(styleId)) {
      changed = true
      continue
    }
    const sanitizedValue = sanitizeStyleValue(styleValue)
    if (sanitizedValue === undefined) {
      changed = true
      continue
    }
    sanitizedStyles[styleId] = sanitizedValue
    if (sanitizedValue !== styleValue) changed = true
  }

  return { styles: sanitizedStyles, changed }
}

function styleValuesEqual(left: unknown, right: unknown): boolean {
  try {
    return JSON.stringify(left) === JSON.stringify(right)
  } catch {
    return left === right
  }
}

function sanitizeDimensionRecord(
  record: Record<string, unknown> | undefined,
  sizeKey: 'w' | 'h'
): Record<string, unknown> | undefined {
  if (!record) return undefined
  const sanitizedRecord: Record<string, unknown> = {}

  for (const [indexKey, rawMeta] of Object.entries(record)) {
    if (!/^\d+$/.test(indexKey) || !rawMeta || typeof rawMeta !== 'object' || Array.isArray(rawMeta)) continue
    const meta = rawMeta as Record<string, unknown>
    const sanitizedMeta: Record<string, unknown> = {}
    if (typeof meta[sizeKey] === 'number' && Number.isFinite(meta[sizeKey])) {
      sanitizedMeta[sizeKey] = meta[sizeKey]
    }
    if (typeof meta.hd === 'number' && Number.isFinite(meta.hd)) {
      sanitizedMeta.hd = meta.hd !== 0 ? 1 : 0
    }
    if (Object.keys(sanitizedMeta).length > 0) sanitizedRecord[indexKey] = sanitizedMeta
  }

  return Object.keys(sanitizedRecord).length > 0 ? sanitizedRecord : undefined
}

function sanitizeMergeData(rawMergeData: unknown[] | undefined): Array<Record<string, number>> | undefined {
  if (!rawMergeData) return undefined
  const mergeSchema = z
    .object({
      startRow: finiteNumberSchema,
      endRow: finiteNumberSchema,
      startColumn: finiteNumberSchema,
      endColumn: finiteNumberSchema
    })
    .strict()

  const sanitized = rawMergeData
    .map(entry => mergeSchema.safeParse(entry))
    .filter(
      (
        result
      ): result is {
        success: true
        data: { startRow: number; endRow: number; startColumn: number; endColumn: number }
      } => result.success
    )
    .map(result => ({
      startRow: Math.max(0, Math.trunc(result.data.startRow)),
      endRow: Math.max(0, Math.trunc(result.data.endRow)),
      startColumn: Math.max(0, Math.trunc(result.data.startColumn)),
      endColumn: Math.max(0, Math.trunc(result.data.endColumn))
    }))
    .filter(entry => entry.endRow >= entry.startRow && entry.endColumn >= entry.startColumn)

  return sanitized.length > 0 ? sanitized : undefined
}

function sanitizeCellRecord(rawCell: unknown): Record<string, unknown> | null {
  if (!rawCell || typeof rawCell !== 'object' || Array.isArray(rawCell)) return null
  const parsed = z
    .object({
      v: cellScalarSchema.optional(),
      f: z.union([z.string(), z.null()]).optional(),
      s: z.union([z.string(), finiteNumberSchema, z.record(z.string(), z.unknown())]).optional(),
      t: finiteNumberSchema.optional()
    })
    .passthrough()
    .safeParse(rawCell)
  if (!parsed.success) return null

  const sanitizedCell = cloneJson(parsed.data) as Record<string, unknown>

  if (typeof sanitizedCell.v === 'string') {
    sanitizedCell.v = trimControlCharacters(sanitizedCell.v)
  }
  if (typeof sanitizedCell.f === 'string') {
    const sanitizedFormula = sanitizeFormula(sanitizedCell.f)
    if (sanitizedFormula) sanitizedCell.f = sanitizedFormula
    else delete sanitizedCell.f
  } else if (sanitizedCell.f === null) {
    delete sanitizedCell.f
  }
  const styleRefId = normalizeStyleRefId(sanitizedCell.s)
  if (styleRefId) {
    if (!SAFE_STYLE_ID_REGEXP.test(styleRefId)) delete sanitizedCell.s
    else sanitizedCell.s = styleRefId
  } else if (sanitizedCell.s && typeof sanitizedCell.s === 'object') {
    const sanitizedInlineStyle = sanitizeStyleValue(sanitizedCell.s)
    if (sanitizedInlineStyle && typeof sanitizedInlineStyle === 'object') sanitizedCell.s = sanitizedInlineStyle
    else delete sanitizedCell.s
  }
  for (const key of INLINE_CELL_STYLE_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(sanitizedCell, key)) continue
    const sanitizedValue = sanitizeStyleValue(sanitizedCell[key])
    if (sanitizedValue !== undefined) sanitizedCell[key] = sanitizedValue
    else delete sanitizedCell[key]
  }
  for (const [key, value] of Object.entries(sanitizedCell)) {
    if (value === undefined) delete sanitizedCell[key]
  }

  return Object.keys(sanitizedCell).length > 0 ? sanitizedCell : null
}

function sanitizeCellData(cellData: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!cellData) return undefined
  const sanitizedCellData: Record<string, unknown> = {}

  for (const [rowKey, rawRow] of Object.entries(cellData)) {
    if (!/^\d+$/.test(rowKey) || !rawRow || typeof rawRow !== 'object' || Array.isArray(rawRow)) continue
    const sanitizedRow: Record<string, unknown> = {}
    for (const [colKey, rawCell] of Object.entries(rawRow as Record<string, unknown>)) {
      if (!/^\d+$/.test(colKey)) continue
      const sanitizedCell = sanitizeCellRecord(rawCell)
      if (sanitizedCell) sanitizedRow[colKey] = sanitizedCell
    }
    if (Object.keys(sanitizedRow).length > 0) sanitizedCellData[rowKey] = sanitizedRow
  }

  return Object.keys(sanitizedCellData).length > 0 ? sanitizedCellData : undefined
}

function sanitizeWorksheet(rawWorksheet: unknown): Record<string, unknown> | null {
  const parsed = worksheetSchema.safeParse(rawWorksheet)
  if (!parsed.success) return null

  const worksheet = cloneJson(parsed.data) as Record<string, unknown>
  worksheet.cellData = sanitizeCellData(parsed.data.cellData)
  worksheet.mergeData = sanitizeMergeData(parsed.data.mergeData)
  worksheet.columnData = sanitizeDimensionRecord(parsed.data.columnData, 'w')
  worksheet.rowData = sanitizeDimensionRecord(parsed.data.rowData, 'h')
  return worksheet
}

function canonicalizeWorksheetCellStyles(
  sheets: Record<string, unknown>,
  styleDefinitions: Record<string, unknown> | undefined
): boolean {
  let changed = false
  for (const worksheet of Object.values(sheets)) {
    if (!worksheet || typeof worksheet !== 'object' || Array.isArray(worksheet)) continue
    const cellData = (worksheet as { cellData?: Record<string, Record<string, Record<string, unknown>>> }).cellData
    if (!cellData || typeof cellData !== 'object') continue
    for (const rowCells of Object.values(cellData)) {
      if (!rowCells || typeof rowCells !== 'object') continue
      for (const cell of Object.values(rowCells)) {
        if (!cell || typeof cell !== 'object' || Array.isArray(cell)) continue
        const nextCell = cloneJson(cell) as Record<string, unknown>
        const inlineEntries = INLINE_CELL_STYLE_KEYS.flatMap(key => {
          if (!Object.prototype.hasOwnProperty.call(nextCell, key)) return []
          return [[key, nextCell[key]] as const]
        })
        if (inlineEntries.length === 0) continue
        for (const [key] of inlineEntries) {
          delete nextCell[key]
        }
        const inlineOverrides = Object.fromEntries(inlineEntries)
        const baseStyleId = normalizeStyleRefId(nextCell.s) ?? ''
        const baseStyle =
          baseStyleId &&
          styleDefinitions &&
          typeof styleDefinitions[baseStyleId] === 'object' &&
          styleDefinitions[baseStyleId] != null &&
          !Array.isArray(styleDefinitions[baseStyleId])
            ? (cloneJson(styleDefinitions[baseStyleId]) as Record<string, unknown>)
            : null
        if (baseStyle) {
          const nonRedundantOverrides = Object.fromEntries(
            Object.entries(inlineOverrides).filter(([key, value]) => !styleValuesEqual(baseStyle[key], value))
          )
          nextCell.s =
            Object.keys(nonRedundantOverrides).length > 0 ? { ...baseStyle, ...nonRedundantOverrides } : baseStyleId
        } else {
          const existingInlineStyle =
            nextCell.s && typeof nextCell.s === 'object' && !Array.isArray(nextCell.s)
              ? (nextCell.s as Record<string, unknown>)
              : {}
          const mergedInlineStyle = { ...existingInlineStyle, ...inlineOverrides }
          if (Object.keys(mergedInlineStyle).length > 0) {
            nextCell.s = mergedInlineStyle
          } else {
            delete nextCell.s
          }
        }
        if (!styleValuesEqual(cell, nextCell)) {
          Object.keys(cell).forEach(key => delete cell[key])
          Object.assign(cell, nextCell)
          changed = true
        }
      }
    }
  }
  return changed
}

function dropDanglingStyleReferences(
  sheets: Record<string, unknown>,
  styleDefinitions: Record<string, unknown> | undefined
): void {
  const validStyleIds = new Set(Object.keys(styleDefinitions ?? {}))

  for (const worksheet of Object.values(sheets)) {
    if (!worksheet || typeof worksheet !== 'object' || Array.isArray(worksheet)) continue
    const cellData = (worksheet as { cellData?: Record<string, Record<string, Record<string, unknown>>> }).cellData
    if (!cellData || typeof cellData !== 'object') continue
    for (const [rowKey, rowCells] of Object.entries(cellData)) {
      if (!rowCells || typeof rowCells !== 'object') continue
      for (const [colKey, cell] of Object.entries(rowCells)) {
        if (!cell || typeof cell !== 'object') continue
        const styleId = normalizeStyleRefId(cell.s)
        if (styleId) {
          if (!validStyleIds.has(styleId)) delete cell.s
          else cell.s = styleId
        }
        for (const [key, value] of Object.entries(cell)) {
          if (value === undefined) delete cell[key]
        }
        if (Object.keys(cell).length === 0) {
          delete rowCells[colKey]
        }
      }
      if (Object.keys(rowCells).length === 0) {
        delete cellData[rowKey]
      }
    }
  }
}

export function sanitizeUniverWorkbookSnapshotForBootstrap(
  rawSnapshot: Record<string, unknown>
): SanitizedWorkbookSnapshotResult {
  const parsed = workbookSchema.safeParse(rawSnapshot)
  if (!parsed.success) return { snapshot: null, changed: false }

  const clonedSnapshot = cloneJson(parsed.data) as Record<string, unknown>
  const sanitizedSheets: Record<string, unknown> = {}
  let changed = false

  for (const [sheetId, rawWorksheet] of Object.entries(parsed.data.sheets)) {
    const sanitizedWorksheet = sanitizeWorksheet(rawWorksheet)
    if (!sanitizedWorksheet) {
      changed = true
      continue
    }
    sanitizedSheets[sheetId] = sanitizedWorksheet
    if (sanitizedWorksheet !== rawWorksheet) changed = true
  }

  if (Object.keys(sanitizedSheets).length === 0) {
    return { snapshot: null, changed: true }
  }

  const sanitizedSheetOrder = parsed.data.sheetOrder.filter(sheetId => sanitizedSheets[sheetId] != null)
  if (sanitizedSheetOrder.length === 0) {
    clonedSnapshot.sheetOrder = Object.keys(sanitizedSheets)
    changed = true
  } else {
    clonedSnapshot.sheetOrder = sanitizedSheetOrder
  }

  const sanitizedStyles = sanitizeStyles(parsed.data.styles)
  if (sanitizedStyles.changed) changed = true
  if (sanitizedStyles.styles && Object.keys(sanitizedStyles.styles).length > 0) {
    clonedSnapshot.styles = sanitizedStyles.styles
  } else {
    delete clonedSnapshot.styles
  }

  clonedSnapshot.sheets = sanitizedSheets
  dropDanglingStyleReferences(sanitizedSheets, sanitizedStyles.styles)
  if (canonicalizeWorksheetCellStyles(sanitizedSheets, sanitizedStyles.styles)) {
    changed = true
  }

  return { snapshot: clonedSnapshot, changed }
}
