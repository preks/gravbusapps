// Extract chart elements from slide XML and referenced chart XML files.

import type JSZip from 'jszip'
import type { ChartElement, ChartType, ChartDataPoint, ChartSeries } from '../../components/slideElements'
import { createChartElement } from '../../components/slideElements'
import type { SlideRelationships } from './types'
import type { ParserMessage } from '../usePowerPointParser'
import { emuToPixels, extractTransform, parseXML, getChild, getChildren, isInsideGroup } from './ooxmlUtils'

const CHART_TYPE_MAP: Record<string, ChartType> = {
  'c:barChart': 'bar',
  'c:bar3DChart': 'bar',
  'c:lineChart': 'line',
  'c:line3DChart': 'line',
  'c:pieChart': 'pie',
  'c:pie3DChart': 'pie',
  'c:areaChart': 'area',
  'c:area3DChart': 'area',
  'c:radarChart': 'radar',
  'c:doughnutChart': 'radial'
}

const UNSUPPORTED_CHART_TYPES = [
  'c:scatterChart',
  'c:bubbleChart',
  'c:stockChart',
  'c:surface3DChart',
  'c:surfaceChart',
  'c:ofPieChart'
]

function extractNumericValues(serEl: Element, tagName: string): number[] {
  const ref = getChild(serEl, tagName)
  if (!ref) return []

  const numCache = getChild(ref, 'c:numCache')
  if (numCache) {
    const pts = getChildren(numCache, 'c:pt')
    return pts
      .sort((a, b) => parseInt(a.getAttribute('idx') || '0') - parseInt(b.getAttribute('idx') || '0'))
      .map(pt => {
        const v = getChild(pt, 'c:v')
        return v ? parseFloat(v.textContent || '0') : 0
      })
  }

  return []
}

function extractStringValues(serEl: Element, tagName: string): string[] {
  const ref = getChild(serEl, tagName)
  if (!ref) return []

  const strCache = getChild(ref, 'c:strCache') || getChild(ref, 'c:numCache')
  if (strCache) {
    const pts = getChildren(strCache, 'c:pt')
    return pts
      .sort((a, b) => parseInt(a.getAttribute('idx') || '0') - parseInt(b.getAttribute('idx') || '0'))
      .map(pt => {
        const v = getChild(pt, 'c:v')
        return v?.textContent || ''
      })
  }

  return []
}

function extractSeriesName(serEl: Element): string {
  const tx = getChild(serEl, 'c:tx')
  if (!tx) return 'Series'

  const strRef = getChild(tx, 'c:strRef')
  if (strRef) {
    const strCache = getChild(strRef, 'c:strCache')
    if (strCache) {
      const pt = getChild(strCache, 'c:pt')
      if (pt) {
        const v = getChild(pt, 'c:v')
        if (v?.textContent) return v.textContent
      }
    }
  }

  const v = getChild(tx, 'c:v')
  return v?.textContent || 'Series'
}

function extractChartTitle(plotArea: Element, chartXml: Document): string {
  const title = chartXml.getElementsByTagName('c:title')[0]
  if (!title) return 'Chart'

  const txBody = title.getElementsByTagName('a:t')
  const parts: string[] = []
  for (let i = 0; i < txBody.length; i++) {
    parts.push(txBody[i].textContent || '')
  }
  return parts.join(' ').trim() || 'Chart'
}

async function parseChartXml(
  chartPath: string,
  zip: JSZip,
  messages: ParserMessage[],
  slideIndex: number
): Promise<{ chartType: ChartType; title: string; data: ChartDataPoint[]; series: ChartSeries[] } | null> {
  const chartFile = zip.file(chartPath)
  if (!chartFile) return null

  const chartContent = await chartFile.async('text')
  const chartXml = parseXML(chartContent)

  const plotArea = chartXml.getElementsByTagName('c:plotArea')[0]
  if (!plotArea) return null

  let chartType: ChartType | null = null
  let chartElement: Element | null = null

  for (const [tag, type] of Object.entries(CHART_TYPE_MAP)) {
    const el = getChild(plotArea, tag)
    if (el) {
      chartType = type
      chartElement = el
      break
    }
  }

  if (!chartType || !chartElement) {
    for (const tag of UNSUPPORTED_CHART_TYPES) {
      if (getChild(plotArea, tag)) {
        messages.push({
          type: 'warning',
          message: 'parser-chart-unsupported',
          params: { type: tag.replace('c:', ''), slide: String(slideIndex + 1) }
        })
        return null
      }
    }
    return null
  }

  const serElements = getChildren(chartElement, 'c:ser')
  if (serElements.length === 0) return null

  const title = extractChartTitle(plotArea, chartXml)

  let labels = extractStringValues(serElements[0], 'c:cat')
  if (labels.length === 0) {
    const valCount = extractNumericValues(serElements[0], 'c:val').length
    labels = Array.from({ length: valCount }, (_, i) => `Item ${i + 1}`)
  }

  const series: ChartSeries[] = []
  const dataMap: Map<number, Record<string, string | number>> = new Map()

  for (let i = 0; i < labels.length; i++) {
    dataMap.set(i, { label: labels[i] })
  }

  for (let si = 0; si < serElements.length; si++) {
    const serEl = serElements[si]
    const name = extractSeriesName(serEl)
    const key = `value${si + 1}`
    series.push({ key, label: name })

    const values = extractNumericValues(serEl, 'c:val')
    for (let vi = 0; vi < values.length; vi++) {
      const entry = dataMap.get(vi) || { label: labels[vi] || `Item ${vi + 1}` }
      entry[key] = values[vi]
      dataMap.set(vi, entry)
    }
  }

  const data: ChartDataPoint[] = Array.from(dataMap.values()) as ChartDataPoint[]

  messages.push({
    type: 'info',
    message: 'parser-chart-imported',
    params: { type: chartType, slide: String(slideIndex + 1) }
  })

  return { chartType, title, data, series }
}

export async function extractChartElements(
  slideXml: Document,
  relationships: SlideRelationships,
  zip: JSZip,
  messages: ParserMessage[],
  slideIndex: number
): Promise<ChartElement[]> {
  const elements: ChartElement[] = []
  const graphicFrames = slideXml.getElementsByTagName('p:graphicFrame')

  for (let fi = 0; fi < graphicFrames.length; fi++) {
    const frame = graphicFrames[fi]
    if (isInsideGroup(frame)) continue

    const graphic = getChild(frame, 'a:graphic')
    if (!graphic) continue
    const graphicData = getChild(graphic, 'a:graphicData')
    if (!graphicData) continue

    const chartRef = getChild(graphicData, 'c:chart')
    if (!chartRef) continue

    const relId =
      chartRef.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') ||
      chartRef.getAttribute('r:id')

    if (!relId) continue

    const chartPath = relationships.chartPaths.get(relId)
    if (!chartPath) continue

    const transform = extractTransform(frame)
    if (!transform) continue

    const parsed = await parseChartXml(chartPath, zip, messages, slideIndex)
    if (!parsed) continue

    const x = emuToPixels(transform.x)
    const y = emuToPixels(transform.y)
    const width = emuToPixels(transform.cx)
    const height = emuToPixels(transform.cy)

    elements.push(
      createChartElement(parsed.chartType, {
        id: `chart-import-${Date.now()}-${fi}`,
        position: { x: Math.max(0, x), y: Math.max(0, y) },
        size: { width: Math.max(200, width), height: Math.max(150, height) },
        title: parsed.title,
        data: parsed.data,
        series: parsed.series
      })
    )
  }

  return elements
}
