// Extract table elements from slide XML (<p:graphicFrame> with <a:tbl>).

import type { TableElement, TableCell } from '../../components/slideElements'
import { createTableElement } from '../../components/slideElements'
import type { OoxmlTheme } from './types'
import type { ParserMessage } from '../usePowerPointParser'
import {
  emuToPixels,
  extractTransform,
  getChild,
  getChildren,
  parseSolidFill,
  isInsideGroup,
  nextImportUid
} from './ooxmlUtils'

function extractCellText(tc: Element): string {
  const txBody = getChild(tc, 'a:txBody')
  if (!txBody) return ''

  const paragraphs = txBody.getElementsByTagName('a:p')
  const parts: string[] = []

  for (let i = 0; i < paragraphs.length; i++) {
    const runs = paragraphs[i].getElementsByTagName('a:t')
    const runTexts: string[] = []
    for (let j = 0; j < runs.length; j++) {
      runTexts.push(runs[j].textContent || '')
    }
    parts.push(runTexts.join(''))
  }

  return parts.join('\n').trim()
}

function extractCellMetadata(tc: Element, theme?: OoxmlTheme): Omit<TableCell, 'content'> {
  const meta: Omit<TableCell, 'content'> = {}

  const rowSpan = tc.getAttribute('rowSpan')
  if (rowSpan) meta.rowSpan = parseInt(rowSpan)
  const gridSpan = tc.getAttribute('gridSpan')
  if (gridSpan) meta.colSpan = parseInt(gridSpan)

  const tcPr = getChild(tc, 'a:tcPr')
  if (tcPr) {
    const sf = getChild(tcPr, 'a:solidFill')
    if (sf) {
      const bg = parseSolidFill(sf, theme)
      if (bg) meta.backgroundColor = bg
    }

    const anchor = tcPr.getAttribute('anchor')
    if (anchor === 't') meta.verticalAlign = 'top'
    else if (anchor === 'b') meta.verticalAlign = 'bottom'
    else if (anchor === 'ctr') meta.verticalAlign = 'middle'
  }

  const txBody = getChild(tc, 'a:txBody')
  if (txBody) {
    const firstP = getChild(txBody, 'a:p')
    const pPr = firstP ? getChild(firstP, 'a:pPr') : undefined
    const algn = pPr?.getAttribute('algn')
    if (algn === 'l') meta.horizontalAlign = 'left'
    else if (algn === 'ctr') meta.horizontalAlign = 'center'
    else if (algn === 'r') meta.horizontalAlign = 'right'
  }

  return meta
}

export function extractTableElements(
  slideXml: Document,
  theme: OoxmlTheme | undefined,
  messages: ParserMessage[],
  slideIndex: number
): TableElement[] {
  const elements: TableElement[] = []
  const graphicFrames = slideXml.getElementsByTagName('p:graphicFrame')

  for (let fi = 0; fi < graphicFrames.length; fi++) {
    const frame = graphicFrames[fi]
    if (isInsideGroup(frame)) continue

    const tbl = getChild(frame, 'a:tbl')
    if (!tbl) continue

    const transform = extractTransform(frame)
    if (!transform) continue

    const tblPr = getChild(tbl, 'a:tblPr')
    const hasFirstRow = tblPr?.getAttribute('firstRow') === '1'

    const trElements = getChildren(tbl, 'a:tr')
    if (trElements.length === 0) continue

    let headers: string[] = []
    const rows: string[][] = []
    const allCellGrid: TableCell[][] = []

    const startIdx = hasFirstRow ? 1 : 0

    if (hasFirstRow && trElements.length > 0) {
      const headerRow = trElements[0]
      const headerCells = getChildren(headerRow, 'a:tc')
      headers = headerCells.map(extractCellText)
      allCellGrid.push(headerCells.map(tc => ({ content: extractCellText(tc), ...extractCellMetadata(tc, theme) })))
    }

    for (let ri = startIdx; ri < trElements.length; ri++) {
      const tr = trElements[ri]
      const cells = getChildren(tr, 'a:tc')
      rows.push(cells.map(extractCellText))
      allCellGrid.push(cells.map(tc => ({ content: extractCellText(tc), ...extractCellMetadata(tc, theme) })))
    }

    if (!hasFirstRow && rows.length > 0) {
      headers = rows[0]
      rows.splice(0, 1)
    }

    const gridCol = getChild(tbl, 'a:tblGrid')
    const columnWidths: number[] = []
    if (gridCol) {
      const gridCols = getChildren(gridCol, 'a:gridCol')
      for (const g of gridCols) {
        const w = g.getAttribute('w')
        if (w) columnWidths.push(emuToPixels(parseInt(w)))
      }
    }

    const rowHeights: number[] = []
    for (const tr of trElements) {
      const h = tr.getAttribute('h')
      if (h) rowHeights.push(emuToPixels(parseInt(h)))
    }

    if (headers.length === 0 && rows.length === 0) continue

    let headerBackground = '#1e3a5f'
    const headerTextColor = '#ffffff'
    let rowBackground = '#ffffff'

    if (hasFirstRow && trElements.length > 0) {
      const firstCell = getChild(trElements[0], 'a:tc')
      if (firstCell) {
        const tcPr = getChild(firstCell, 'a:tcPr')
        if (tcPr) {
          const sf = getChild(tcPr, 'a:solidFill')
          if (sf) headerBackground = parseSolidFill(sf, theme) || headerBackground
        }
      }
    }

    if (trElements.length > startIdx) {
      const dataRow = trElements[startIdx]
      const firstDataCell = getChild(dataRow, 'a:tc')
      if (firstDataCell) {
        const tcPr = getChild(firstDataCell, 'a:tcPr')
        if (tcPr) {
          const sf = getChild(tcPr, 'a:solidFill')
          if (sf) rowBackground = parseSolidFill(sf, theme) || rowBackground
        }
      }
    }

    const x = emuToPixels(transform.x)
    const y = emuToPixels(transform.y)
    const width = emuToPixels(transform.cx)
    const height = emuToPixels(transform.cy)

    messages.push({
      type: 'info',
      message: 'parser-table-imported',
      params: {
        rows: String(rows.length),
        cols: String(headers.length),
        slide: String(slideIndex + 1)
      }
    })

    elements.push(
      createTableElement(headers, rows, {
        id: nextImportUid('table-import'),
        position: { x: Math.max(0, x), y: Math.max(0, y) },
        size: { width: Math.max(100, width), height: Math.max(60, height) },
        headerBackground,
        headerTextColor,
        rowBackground,
        cells: allCellGrid.length > 0 ? allCellGrid : undefined,
        columnWidths: columnWidths.length > 0 ? columnWidths : undefined,
        rowHeights: rowHeights.length > 0 ? rowHeights : undefined
      })
    )
  }

  return elements
}
