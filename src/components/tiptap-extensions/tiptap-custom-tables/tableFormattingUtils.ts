import type { EditorState, Transaction } from '@tiptap/pm/state'
import {
  getLinkedSelectedTableContext,
  getSelectedTableRectContext,
  type SelectedTableRectContext,
  type TableFragmentContext
} from './tableLinkedFragments'
import type { TableBorderStyle } from './types'
import { normalizeBorderStyle, normalizeColorValue, normalizeCssLength } from './styleUtils'

export {
  getSelectedTableRectContext,
  type SelectedTableRectContext,
  type TableFragmentContext
} from './tableLinkedFragments'

const BORDER_SIDE_CONFIG = [
  {
    side: 'top',
    styleKey: 'borderTopStyle',
    widthKey: 'borderTopWidth',
    colorKey: 'borderTopColor'
  },
  {
    side: 'right',
    styleKey: 'borderRightStyle',
    widthKey: 'borderRightWidth',
    colorKey: 'borderRightColor'
  },
  {
    side: 'bottom',
    styleKey: 'borderBottomStyle',
    widthKey: 'borderBottomWidth',
    colorKey: 'borderBottomColor'
  },
  {
    side: 'left',
    styleKey: 'borderLeftStyle',
    widthKey: 'borderLeftWidth',
    colorKey: 'borderLeftColor'
  }
] as const

export type TableBorderPreset =
  | 'all'
  | 'none'
  | 'outside'
  | 'inside'
  | 'insideHorizontal'
  | 'insideVertical'
  | 'top'
  | 'right'
  | 'bottom'
  | 'left'

interface ApplyBorderPresetOptions {
  preset: TableBorderPreset
  style?: TableBorderStyle | null
  width?: string | null
  color?: string | null
}

interface TableCellEntry {
  absolutePos: number
  rect: { left: number; top: number; right: number; bottom: number }
  logicalRect: { left: number; top: number; right: number; bottom: number }
}

function getTableCellEntries(fragment: TableFragmentContext): TableCellEntry[] {
  const entries: TableCellEntry[] = []

  fragment.table.descendants((node, pos) => {
    if (node.type.name !== 'tableCell' && node.type.name !== 'tableHeader') {
      return true
    }

    const rect = fragment.map.findCell(pos)
    entries.push({
      absolutePos: fragment.tableStart + pos,
      rect,
      logicalRect: {
        left: rect.left,
        top: fragment.logicalRowStart + rect.top,
        right: rect.right,
        bottom: fragment.logicalRowStart + rect.bottom
      }
    })

    return false
  })

  return entries
}

function updateCellNode(
  tr: Transaction,
  pos: number,
  updater: (attrs: Record<string, unknown>) => Record<string, unknown>
) {
  const node = tr.doc.nodeAt(pos)
  if (!node) return false
  if (node.isText || (node.type.name !== 'tableCell' && node.type.name !== 'tableHeader')) {
    return false
  }
  const nextAttrs = updater(node.attrs)
  tr.setNodeMarkup(pos, node.type, nextAttrs)
  return true
}

export function updateSelectedTableFragments(
  state: EditorState,
  tr: Transaction,
  tableNodeName: string,
  updater: (attrs: Record<string, unknown>) => Record<string, unknown>
) {
  const linkedContext = getLinkedSelectedTableContext(state, tableNodeName)
  if (!linkedContext) return false

  for (const fragment of linkedContext.fragments) {
    const tableNode = tr.doc.nodeAt(fragment.tablePos)
    if (tableNode?.type.name !== tableNodeName) {
      continue
    }

    tr.setNodeMarkup(fragment.tablePos, tableNode.type, updater(tableNode.attrs))
  }

  return tr.steps.length > 0
}

function getSelectedColumnsRect(context: SelectedTableRectContext) {
  return {
    left: context.rect.left,
    right: context.rect.right,
    top: 0,
    bottom: context.map.height
  }
}

function setBorderSide(
  attrs: Record<string, unknown>,
  side: (typeof BORDER_SIDE_CONFIG)[number],
  value: { style?: TableBorderStyle | null; width?: string | null; color?: string | null }
) {
  attrs[side.styleKey] = value.style ?? null
  attrs[side.widthKey] = value.width ?? null
  attrs[side.colorKey] = value.color ?? null
}

function clearBorderSide(attrs: Record<string, unknown>, side: (typeof BORDER_SIDE_CONFIG)[number]) {
  setBorderSide(attrs, side, { style: 'none', width: null, color: null })
}

function applyActiveBorderSide(
  attrs: Record<string, unknown>,
  side: (typeof BORDER_SIDE_CONFIG)[number],
  style: TableBorderStyle,
  width: string,
  color: string | null
) {
  setBorderSide(attrs, side, { style, width, color })
}

export function applyBorderPresetToSelection(
  state: EditorState,
  tr: Transaction,
  tableNodeName: string,
  options: ApplyBorderPresetOptions
) {
  const linkedContext = getLinkedSelectedTableContext(state, tableNodeName)
  if (!linkedContext) return false
  const targetRect = {
    left: 0,
    top: 0,
    right: linkedContext.current.map.width,
    bottom: linkedContext.totalRows
  }
  const requestedStyle = normalizeBorderStyle(options.style)

  let style: TableBorderStyle = 'solid'
  if (options.preset === 'none') {
    style = 'none'
  } else if (requestedStyle && requestedStyle !== 'none') {
    style = requestedStyle
  }
  const width = normalizeCssLength(options.width) ?? '1pt'
  const color = normalizeColorValue(options.color) ?? null

  for (const fragment of linkedContext.fragments) {
    const cellEntries = getTableCellEntries(fragment)

    for (const entry of cellEntries) {
      const cellRect = entry.logicalRect

      updateCellNode(tr, entry.absolutePos, attrs => {
        const nextAttrs = { ...attrs }

        if (options.preset === 'none') {
          for (const side of BORDER_SIDE_CONFIG) {
            clearBorderSide(nextAttrs, side)
          }
          return nextAttrs
        }

        const isTop = cellRect.top === targetRect.top
        const isBottom = cellRect.bottom === targetRect.bottom
        const isLeft = cellRect.left === targetRect.left
        const isRight = cellRect.right === targetRect.right

        const activateSides = new Set<string>()
        switch (options.preset) {
          case 'all':
            activateSides.add('top')
            activateSides.add('right')
            activateSides.add('bottom')
            activateSides.add('left')
            break
          case 'outside':
            if (isTop) activateSides.add('top')
            if (isRight) activateSides.add('right')
            if (isBottom) activateSides.add('bottom')
            if (isLeft) activateSides.add('left')
            break
          case 'inside':
            if (!isTop) activateSides.add('top')
            if (!isRight) activateSides.add('right')
            if (!isBottom) activateSides.add('bottom')
            if (!isLeft) activateSides.add('left')
            break
          case 'insideHorizontal':
            if (!isTop) activateSides.add('top')
            if (!isBottom) activateSides.add('bottom')
            break
          case 'insideVertical':
            if (!isLeft) activateSides.add('left')
            if (!isRight) activateSides.add('right')
            break
          default:
            activateSides.add(options.preset)
        }

        for (const side of BORDER_SIDE_CONFIG) {
          const shouldActivate = activateSides.has(side.side)
          if (
            options.preset === 'outside' ||
            options.preset === 'inside' ||
            options.preset === 'insideHorizontal' ||
            options.preset === 'insideVertical' ||
            options.preset === 'all'
          ) {
            if (!shouldActivate) {
              clearBorderSide(nextAttrs, side)
              continue
            }
          } else if (!shouldActivate) {
            continue
          }

          applyActiveBorderSide(nextAttrs, side, style, width, color)
        }

        return nextAttrs
      })
    }
  }

  return tr.steps.length > 0
}

export function setSelectedColumnsWidthPx(
  state: EditorState,
  tr: Transaction,
  tableNodeName: string,
  widthPx: number | null
) {
  const linkedContext = getLinkedSelectedTableContext(state, tableNodeName)
  if (!linkedContext) return false

  const selectedColumnsRect = getSelectedColumnsRect(linkedContext.current)

  for (const fragment of linkedContext.fragments) {
    const relativePositions = fragment.map.cellsInRect({
      left: selectedColumnsRect.left,
      right: selectedColumnsRect.right,
      top: 0,
      bottom: fragment.map.height
    })

    for (const relativePos of relativePositions) {
      const cellPos = fragment.tableStart + relativePos
      updateCellNode(tr, cellPos, attrs => {
        const colspan = Number(attrs.colspan ?? 1)
        if (colspan > 1) return attrs

        return {
          ...attrs,
          colwidth: widthPx == null ? null : [Math.max(1, Math.round(widthPx))]
        }
      })
    }
  }

  return tr.steps.length > 0
}

export function setSelectedRowsHeight(
  state: EditorState,
  tr: Transaction,
  tableNodeName: string,
  rowHeight: string | null
) {
  const context = getSelectedTableRectContext(state, tableNodeName)
  if (!context) return false

  const normalizedHeight = rowHeight == null ? null : normalizeCssLength(rowHeight)
  const table = tr.doc.nodeAt(context.tablePos)
  if (table?.type.name !== tableNodeName) return false

  const rowOffset = context.tablePos + 1
  table.forEach((rowNode, offset, index) => {
    if (index < context.rect.top || index >= context.rect.bottom) return
    tr.setNodeMarkup(rowOffset + offset, null, {
      ...rowNode.attrs,
      rowHeight: normalizedHeight
    })
  })

  return tr.steps.length > 0
}
