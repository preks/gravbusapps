/**
 * PowerPoint Export Utility
 *
 * Converts slides to PPTX format using pptxgenjs.
 * Handles text, images, shapes, code blocks, and backgrounds.
 */

import pptxgen from 'pptxgenjs'
import type {
  SlideData,
  AnySlideElement,
  TextElement,
  ImageElement,
  ShapeElement,
  CodeElement,
  VideoElement,
  TableElement,
  ChartElement,
  ConnectorElement,
  RichTextParagraph
} from '../components/slideElements'
import {
  paragraphsFromPlainText,
  textElementStubForShapeInText,
  getShapeGeometry,
  SHAPE_TYPE_TO_OOXML_PRESET
} from '../components/slideElements'
import type { SlideTheme } from '../components/slideThemes'
import {
  applyCustGeomPostProcessing,
  createCustGeomCollector,
  createCustGeomMarker,
  downloadPptxBlob,
  type CustGeomCollector
} from './custGeomPostProcessor'

/**
 * Convert pixels to inches for pptxgen (96 DPI)
 */
function pxToInches(px: number): number {
  return px / 96
}

/**
 * Convert hex color to pptxgen format (remove #)
 */
function hexToPptxColor(hex: string): string {
  return hex.replace('#', '')
}

/**
 * Get text alignment for pptxgen
 */
function getPptxAlign(align: 'left' | 'center' | 'right'): 'left' | 'center' | 'right' {
  return align
}

/**
 * Get text vertical alignment for pptxgen
 */
function getPptxValign(valign: 'top' | 'middle' | 'bottom'): 'top' | 'middle' | 'bottom' {
  return valign
}

function pxToPt(px: number): number {
  return px * 0.75
}

function richParagraphsToPptxRuns(paragraphs: RichTextParagraph[], fallback: TextElement): any[] {
  const runs: any[] = []
  for (let pi = 0; pi < paragraphs.length; pi++) {
    const paragraph = paragraphs[pi]
    const bulletOption =
      paragraph.bulletType === 'bullet'
        ? { code: paragraph.bulletChar || '25CF' }
        : paragraph.bulletType === 'number'
          ? { type: 'number' }
          : undefined
    const paragraphAlign = paragraph.alignment === 'justify' ? 'justify' : paragraph.alignment || fallback.textAlign

    for (let ri = 0; ri < paragraph.runs.length; ri++) {
      const run = paragraph.runs[ri]
      const isLastRunInParagraph = ri === paragraph.runs.length - 1
      const shouldBreak = isLastRunInParagraph && pi < paragraphs.length - 1
      runs.push({
        text: run.text,
        options: {
          breakLine: shouldBreak || undefined,
          bold: run.fontWeight ? run.fontWeight === 'bold' : fallback.fontWeight === 'bold',
          italic: run.fontStyle ? run.fontStyle === 'italic' : fallback.fontStyle === 'italic',
          underline: run.textDecoration ? run.textDecoration === 'underline' : fallback.textDecoration === 'underline',
          strike: run.textDecoration
            ? run.textDecoration === 'line-through'
            : fallback.textDecoration === 'line-through',
          fontSize: pxToPt(run.fontSize || fallback.fontSize),
          fontFace: run.fontFamily || fallback.fontFamily,
          color: hexToPptxColor(run.color || fallback.color),
          hyperlink: run.hyperlink ? { url: run.hyperlink } : undefined,
          align: paragraphAlign,
          bullet: ri === 0 && bulletOption ? bulletOption : undefined,
          indentLevel: paragraph.indentLevel ?? undefined
        }
      })
    }
  }
  return runs
}

/**
 * Convert text element to pptxgen text box
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- theme reserved for future styling
function addTextElement(pptxSlide: any, element: TextElement, theme: SlideTheme) {
  const options: any = {
    x: pxToInches(element.position.x),
    y: pxToInches(element.position.y),
    w: pxToInches(element.size.width),
    h: pxToInches(element.size.height),
    fontSize: pxToPt(element.fontSize),
    fontFace: element.fontFamily,
    bold: element.fontWeight === 'bold',
    italic: element.fontStyle === 'italic',
    underline: element.textDecoration === 'underline',
    strike: element.textDecoration === 'line-through',
    align: getPptxAlign(element.textAlign),
    valign: getPptxValign(element.verticalAlign),
    color: hexToPptxColor(element.color),
    rotate: element.rotation
  }

  if (element.backgroundColor && element.backgroundColor !== 'transparent') {
    options.fill = { color: hexToPptxColor(element.backgroundColor) }
  }

  if (element.gradient) {
    options.fill = {
      type: 'solid',
      color: hexToPptxColor(element.gradient.stops[0]?.color || element.color)
    }
  }

  const paragraphs =
    element.paragraphs && element.paragraphs.length > 0 ? element.paragraphs : paragraphsFromPlainText(element)

  if (paragraphs.length > 0) {
    const runs = richParagraphsToPptxRuns(paragraphs, element)
    pptxSlide.addText(runs, options)
  } else {
    pptxSlide.addText(element.content || '', options)
  }
}

/**
 * Convert image element to pptxgen image
 */
function addImageElement(pptxSlide: any, element: ImageElement) {
  const options: any = {
    x: pxToInches(element.position.x),
    y: pxToInches(element.position.y),
    w: pxToInches(element.size.width),
    h: pxToInches(element.size.height),
    rotate: element.rotation,
    sizing: { type: element.objectFit === 'contain' ? 'contain' : 'cover' }
  }

  if (element.borderRadius > 0) {
    options.rounding = true
  }

  // Add image (src should be data URL or http URL)
  pptxSlide.addImage({
    ...options,
    data: element.src,
    altText: element.alt || 'Image'
  })
}

/**
 * Convert shape element to pptxgen shape
 */
function addShapeElement(pptxSlide: any, element: ShapeElement, custGeomCollector?: CustGeomCollector) {
  // Prefer the original/native preset so round-tripping preserves Office
  // geometry exactly (arrows, callouts, flowcharts) instead of collapsing
  // to a generic rectangle. `SHAPE_TYPE_TO_OOXML_PRESET` keeps native shapes
  // symmetric with imported ones — both ship an OOXML preset id.
  const geometry = getShapeGeometry(element)
  const fallback = SHAPE_TYPE_TO_OOXML_PRESET[element.shapeType] || 'rect'
  const pptxShapeType = geometry?.prst || fallback

  const options: any = {
    x: pxToInches(element.position.x),
    y: pxToInches(element.position.y),
    w: pxToInches(element.size.width),
    h: pxToInches(element.size.height),
    rotate: element.rotation,
    fill: { color: hexToPptxColor(element.fill) }
  }

  // If this shape carries a custom path we still emit the preset via
  // pptxgenjs (it needs a valid prst to lay out the shape), but we tag the
  // shape with a unique name. A post-processor then rewrites the generated
  // slide XML to replace <a:prstGeom> with <a:custGeom>. This keeps our
  // export flow cleanly additive — shapes without custom paths are
  // byte-identical to the pre-feature output.
  if (geometry?.custGeomPath && custGeomCollector) {
    const marker = createCustGeomMarker()
    options.objectName = marker
    custGeomCollector.add(marker, geometry.custGeomPath)
  }

  if (geometry?.flipH) options.flipH = true
  if (geometry?.flipV) options.flipV = true

  if (element.strokeWidth > 0) {
    const line: any = {
      color: hexToPptxColor(element.strokeColor),
      width: element.strokeWidth,
      dashType: element.strokeStyle === 'dashed' ? 'dash' : element.strokeStyle === 'dotted' ? 'dot' : 'solid'
    }
    // pptxgenjs supports `beginArrowType` / `endArrowType` for line
    // shapes/connectors; autoshapes round-trip them as head/tail end tokens
    // when a post-processor rewrites the XML. We still set them so the
    // on-screen preview in PPTX viewers gets the arrowheads.
    if (element.lineHeadEnd && element.lineHeadEnd.type !== 'none') {
      line.beginArrowType = element.lineHeadEnd.type
    }
    if (element.lineTailEnd && element.lineTailEnd.type !== 'none') {
      line.endArrowType = element.lineTailEnd.type
    }
    options.line = line
  }

  if (element.gradient) {
    // Simplified gradient support
    options.fill = {
      color: hexToPptxColor(element.gradient.stops[0]?.color || element.fill)
    }
  }

  // Picture fill export: pptxgenjs exposes `fill: { type: 'none' }` but not
  // a direct `blipFill` binding for addShape. We fall back to the nominal
  // foreground color so the shape still renders in older PPTX viewers, and
  // tag the shape with an objectName so a future post-processor can rewrite
  // the generated XML with the real `<a:blipFill>`. Pattern fill follows the
  // same pattern: export the fg color for visual parity; real `a:pattFill`
  // emission is deferred.
  if (element.pictureFill) {
    options.fill = { color: hexToPptxColor(element.fill || '#FFFFFF') }
  } else if (element.patternFill) {
    options.fill = { color: hexToPptxColor(element.patternFill.fgColor) }
  }

  // Export richer effect chain via pptxgenjs's `shadow` option. pptxgenjs
  // accepts type=outer|inner plus blur/offset/angle/color, which round-trips
  // to `a:outerShdw`/`a:innerShdw` on write. Glow/softEdges/reflection have
  // no direct pptxgenjs mapping so we drop them on export today — the
  // effectLst entry is preserved in the data model for in-app rendering.
  const eff = element.effects
  if (eff?.outerShadow) {
    const os = eff.outerShadow
    options.shadow = {
      type: 'outer',
      color: hexToPptxColor(os.color),
      blur: os.blur,
      offset: Math.round(Math.sqrt(os.offsetX * os.offsetX + os.offsetY * os.offsetY)),
      angle: Math.round((Math.atan2(os.offsetY, os.offsetX) * 180) / Math.PI),
      opacity: 0.5
    }
  } else if (eff?.innerShadow) {
    const is = eff.innerShadow
    options.shadow = {
      type: 'inner',
      color: hexToPptxColor(is.color),
      blur: is.size,
      offset: Math.round(Math.sqrt(is.offsetX * is.offsetX + is.offsetY * is.offsetY)),
      angle: Math.round((Math.atan2(is.offsetY, is.offsetX) * 180) / Math.PI),
      opacity: 0.5
    }
  }

  // Alt text + hyperlink: pptxgenjs accepts `altText` (descr) and `hyperlink`
  // on addShape. When the shape is locked through spLocks.noSelect / noMove
  // we don't force the pptxgenjs `hidden` / `locked` flags because there is
  // no 1:1 mapping — the editor already honours locks via ShapeElement.locked,
  // and a future post-processor can emit the precise a:spLocks tree.
  if (element.altText?.description) options.altText = element.altText.description
  if (element.hyperlink) options.hyperlink = { url: element.hyperlink }

  pptxSlide.addShape(pptxShapeType, options)

  if (element.shapeText) {
    const st = textElementStubForShapeInText(element, element.shapeText)
    const textOptions: any = {
      x: options.x,
      y: options.y,
      w: options.w,
      h: options.h,
      fontSize: pxToPt(st.fontSize),
      fontFace: st.fontFamily,
      bold: st.fontWeight === 'bold',
      italic: st.fontStyle === 'italic',
      underline: st.textDecoration === 'underline',
      strike: st.textDecoration === 'line-through',
      align: getPptxAlign(st.textAlign),
      valign: getPptxValign(st.verticalAlign),
      color: hexToPptxColor(st.color),
      rotate: options.rotate
    }
    const paragraphs = st.paragraphs && st.paragraphs.length > 0 ? st.paragraphs : paragraphsFromPlainText(st)
    if (paragraphs.length > 0) {
      const runs = richParagraphsToPptxRuns(paragraphs, st)
      pptxSlide.addText(runs, textOptions)
    } else {
      pptxSlide.addText(st.content || '', textOptions)
    }
  }
}

/**
 * Convert code element to pptxgen text box with code formatting
 */
function addCodeElement(pptxSlide: any, element: CodeElement) {
  const defaultBg = element.theme === 'dark' ? '1E1E1E' : 'F5F5F5'
  const bgColor = element.backgroundColor ? hexToPptxColor(element.backgroundColor) : defaultBg

  const options: any = {
    x: pxToInches(element.position.x),
    y: pxToInches(element.position.y),
    w: pxToInches(element.size.width),
    h: pxToInches(element.size.height),
    fontSize: element.fontSize / 2,
    fontFace: 'Courier New',
    align: 'left',
    valign: 'top',
    color: element.textColor ? hexToPptxColor(element.textColor) : element.theme === 'dark' ? 'FFFFFF' : '000000',
    fill: { color: bgColor },
    rotate: element.rotation,
    margin: element.padding ? pxToInches(element.padding) : undefined,
    shadow: element.shadow ? { type: 'outer', blur: 6, offset: 3, opacity: 0.2, color: '000000' } : undefined
  }

  if ((element.borderRadius ?? 0) > 0) {
    options.rectRadius = pxToInches(element.borderRadius)
  }

  if ((element.borderWidth ?? 0) > 0) {
    options.border = {
      pt: element.borderWidth,
      color: hexToPptxColor(element.borderColor || '#333333')
    }
  }

  const codeLines = element.code.split('\n')
  const displayCode = element.showLineNumbers
    ? codeLines.map((line, i) => `${(i + 1).toString().padStart(3, ' ')} | ${line}`).join('\n')
    : element.code

  pptxSlide.addText(displayCode, options)
}

/**
 * Convert video element to placeholder image (videos can't be embedded in PPTX via pptxgenjs)
 */
function addVideoPlaceholder(pptxSlide: any, element: VideoElement) {
  const options: any = {
    x: pxToInches(element.position.x),
    y: pxToInches(element.position.y),
    w: pxToInches(element.size.width),
    h: pxToInches(element.size.height),
    fill: { color: '000000' },
    rotate: element.rotation
  }

  // Add a dark rectangle with text indicating video
  pptxSlide.addShape('rect', options)

  pptxSlide.addText('🎥 Video', {
    x: pxToInches(element.position.x),
    y: pxToInches(element.position.y + element.size.height / 2 - 20),
    w: pxToInches(element.size.width),
    h: pxToInches(40),
    fontSize: 24,
    color: 'FFFFFF',
    align: 'center',
    valign: 'middle'
  })

  // Add URL as text below
  pptxSlide.addText(element.src, {
    x: pxToInches(element.position.x),
    y: pxToInches(element.position.y + element.size.height / 2 + 20),
    w: pxToInches(element.size.width),
    h: pxToInches(30),
    fontSize: 12,
    color: 'CCCCCC',
    align: 'center',
    valign: 'middle'
  })
}

function addTableElement(pptxSlide: any, element: TableElement) {
  const options: any = {
    x: pxToInches(element.position.x),
    y: pxToInches(element.position.y),
    w: pxToInches(element.size.width),
    h: pxToInches(element.size.height),
    border: {
      type: 'solid',
      pt: Math.max(0.25, element.borderWidth * 0.5),
      color: hexToPptxColor(element.borderColor)
    },
    fontSize: pxToPt(element.fontSize),
    fontFace: 'Inter',
    colW: element.columnWidths?.map(w => pxToInches(w))
  }

  const headerRow = element.headers.map(header => ({
    text: header,
    options: {
      bold: true,
      color: hexToPptxColor(element.headerTextColor),
      fill: { color: hexToPptxColor(element.headerBackground) },
      fontSize: pxToPt(element.headerFontSize),
      valign: 'middle'
    }
  }))

  const dataRows = element.rows.map((row, rowIdx) =>
    row.map(cellText => ({
      text: cellText,
      options: {
        color: hexToPptxColor(element.rowTextColor),
        fill: {
          color: hexToPptxColor(
            rowIdx % 2 === 0 ? element.rowBackground : element.rowAlternateBackground || element.rowBackground
          )
        },
        valign: 'middle'
      }
    }))
  )

  const tableRows = headerRow.length > 0 ? [headerRow, ...dataRows] : dataRows
  if (tableRows.length === 0 || tableRows[0].length === 0) return
  pptxSlide.addTable(tableRows, options)
}

const CHART_TYPE_MAP: Record<string, string> = {
  bar: 'bar',
  line: 'line',
  area: 'area',
  pie: 'pie',
  radar: 'radar',
  radial: 'doughnut'
}

function addChartElement(pptx: pptxgen, pptxSlide: any, element: ChartElement) {
  const pptxType = CHART_TYPE_MAP[element.chartType] || 'bar'
  const chartTypeEnum = (pptx.ChartType as any)[pptxType] ?? pptxType

  const labels = element.data.map(d => d.label)
  const chartData = element.series.map(series => ({
    name: series.label,
    labels,
    values: element.data.map(d => {
      const v = d[series.key]
      return typeof v === 'number' ? v : Number(v) || 0
    })
  }))

  pptxSlide.addChart(chartTypeEnum, chartData, {
    x: pxToInches(element.position.x),
    y: pxToInches(element.position.y),
    w: pxToInches(element.size.width),
    h: pxToInches(element.size.height),
    showLegend: element.showLegend,
    showTitle: !!element.title,
    title: element.title,
    chartColors: element.series.map(s => hexToPptxColor(s.color || '#3b82f6'))
  })
}

function addConnectorElement(pptxSlide: any, element: ConnectorElement) {
  const shapeType = element.lineType === 'elbow' ? 'bentConnector3' : 'line'
  const minX = Math.min(element.startPoint.x, element.endPoint.x)
  const minY = Math.min(element.startPoint.y, element.endPoint.y)
  const width = Math.max(1, Math.abs(element.endPoint.x - element.startPoint.x))
  const height = Math.max(1, Math.abs(element.endPoint.y - element.startPoint.y))

  pptxSlide.addShape(shapeType, {
    x: pxToInches(minX),
    y: pxToInches(minY),
    w: pxToInches(width),
    h: pxToInches(height),
    line: {
      color: hexToPptxColor(element.strokeColor),
      width: element.strokeWidth,
      dashType: element.strokeStyle === 'dashed' ? 'dash' : element.strokeStyle === 'dotted' ? 'dot' : 'solid',
      endArrowType: element.endArrow ? 'triangle' : undefined,
      beginArrowType: element.startArrow ? 'triangle' : undefined
    }
  })
}

/**
 * Add background to slide
 */
function addBackground(pptxSlide: any, background: SlideData['background']) {
  if (background.type === 'solid' && background.color) {
    pptxSlide.background = { color: hexToPptxColor(background.color) }
  } else if (background.type === 'gradient' && background.gradient) {
    // Simplified: use first color from gradient
    const firstColor = background.gradient.stops[0]?.color || '#ffffff'
    pptxSlide.background = { color: hexToPptxColor(firstColor) }
  } else if (background.type === 'image' && background.imageUrl) {
    pptxSlide.background = { data: background.imageUrl }
  }
  // Video backgrounds not supported - use solid color fallback
}

/**
 * Export slides to PowerPoint (.pptx)
 */
export async function exportToPptx(slides: SlideData[], theme: SlideTheme, title: string): Promise<boolean> {
  try {
    const pptx = new pptxgen()
    const custGeomCollector = createCustGeomCollector()

    // Set presentation properties
    pptx.author = 'NEWWORK Slides'
    pptx.company = 'NEWWORK'
    pptx.subject = title
    pptx.title = title

    // Set default slide size (16:9 widescreen)
    pptx.layout = 'LAYOUT_WIDE'

    // Process each slide
    slides.forEach(slideData => {
      const pptxSlide = pptx.addSlide()

      // Add background
      addBackground(pptxSlide, slideData.background)

      // Add all elements sorted by zIndex
      const sortedElements = [...slideData.elements].sort((a, b) => a.zIndex - b.zIndex)

      sortedElements.forEach((element: AnySlideElement) => {
        switch (element.type) {
          case 'text':
            addTextElement(pptxSlide, element as TextElement, theme)
            break
          case 'image':
            addImageElement(pptxSlide, element as ImageElement)
            break
          case 'shape':
            addShapeElement(pptxSlide, element as ShapeElement, custGeomCollector)
            break
          case 'code':
            addCodeElement(pptxSlide, element as CodeElement)
            break
          case 'video':
            addVideoPlaceholder(pptxSlide, element as VideoElement)
            break
          case 'table':
            addTableElement(pptxSlide, element as TableElement)
            break
          case 'chart':
            addChartElement(pptx, pptxSlide, element as ChartElement)
            break
          case 'connector':
            addConnectorElement(pptxSlide, element as ConnectorElement)
            break
        }
      })

      // Add speaker notes if present
      if (slideData.notes) {
        pptxSlide.addNotes(slideData.notes)
      }
    })

    const fileName = `${sanitizeFilename(title)}.pptx`

    // When any shape carries a custom path, post-process the generated zip
    // to swap prstGeom for custGeom. This is additive — decks without
    // custom-geometry shapes use the original `writeFile` path and keep the
    // fastest export latency.
    if (custGeomCollector.size() > 0) {
      const buffer = (await pptx.write({ outputType: 'arraybuffer' })) as ArrayBuffer
      const blob = await applyCustGeomPostProcessing(buffer, custGeomCollector)
      downloadPptxBlob(blob, fileName)
    } else {
      await pptx.writeFile({ fileName })
    }

    return true
  } catch (err) {
    console.error('[pptxExport] Export error:', err)
    return false
  }
}

/**
 * Sanitize filename for download
 */
function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-z0-9_\-\.]/gi, '_')
}
