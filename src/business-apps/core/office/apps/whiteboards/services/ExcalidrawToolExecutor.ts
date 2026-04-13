import { restoreElements } from '@excalidraw/excalidraw'
import type { ExcalidrawImperativeAPI, ExcalidrawElement } from '@excalidraw/excalidraw/types'
import * as Y from 'yjs'

const WB_YJS_ORIGIN = 'nw-whiteboard-local'

export interface ToolCall {
  name: string
  arguments: string
}

interface CreateElementParams {
  id?: string
  type: string
  x: number
  y: number
  width?: number
  height?: number
  backgroundColor?: string
  strokeColor?: string
  strokeWidth?: number
  strokeStyle?: string
  roughness?: number
  opacity?: number
  label?: string
  text?: string
  fontSize?: number
  fontFamily?: number
  fillStyle?: string
  roundness?: { type: number; value?: number } | null
  startElementId?: string
  endElementId?: string
  startArrowhead?: string | null
  endArrowhead?: string | null
  points?: number[][]
  groupIds?: string[]
}

function generateId(): string {
  return `ai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function randomSeed(): number {
  return Math.floor(Math.random() * 2000000000)
}

function estimateTextBounds(text: string, fontSize: number, lineHeight: number): { width: number; height: number } {
  const lines = (text || '').split('\n')
  const longest = lines.reduce((max, line) => Math.max(max, line.length), 0)
  return {
    width: Math.max(32, Math.round(longest * fontSize * 0.6)),
    height: Math.max(fontSize, Math.round(lines.length * fontSize * lineHeight))
  }
}

function edgeCenter(el: Record<string, unknown>, side: 'left' | 'right' | 'top' | 'bottom'): [number, number] {
  const x = el.x as number
  const y = el.y as number
  const w = el.width as number
  const h = el.height as number
  switch (side) {
    case 'right':
      return [x + w, y + h / 2]
    case 'left':
      return [x, y + h / 2]
    case 'bottom':
      return [x + w / 2, y + h]
    case 'top':
      return [x + w / 2, y]
  }
}

function sideFromDelta(dx: number, dy: number): 'left' | 'right' | 'top' | 'bottom' {
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? 'right' : 'left'
  }
  return dy >= 0 ? 'bottom' : 'top'
}

function computeEdgePoints(
  startEl: Record<string, unknown>,
  endEl: Record<string, unknown>
): [number, number, number, number] {
  const scx = (startEl.x as number) + (startEl.width as number) / 2
  const scy = (startEl.y as number) + (startEl.height as number) / 2
  const ecx = (endEl.x as number) + (endEl.width as number) / 2
  const ecy = (endEl.y as number) + (endEl.height as number) / 2

  const startSide = sideFromDelta(ecx - scx, ecy - scy)
  const endSide =
    startSide === 'right' ? 'left' : startSide === 'left' ? 'right' : startSide === 'bottom' ? 'top' : 'bottom'

  const [sx, sy] = edgeCenter(startEl, startSide)
  const [ex, ey] = edgeCenter(endEl, endSide)
  return [sx, sy, ex, ey]
}

function computeMultiPointEdges(
  startEl: Record<string, unknown>,
  endEl: Record<string, unknown>,
  aiPoints: number[][]
): [number, number, number, number] {
  const firstSeg = aiPoints.length >= 2 ? [aiPoints[1][0] - aiPoints[0][0], aiPoints[1][1] - aiPoints[0][1]] : [0, 1]
  const lastIdx = aiPoints.length - 1
  const lastSeg =
    lastIdx >= 1
      ? [aiPoints[lastIdx][0] - aiPoints[lastIdx - 1][0], aiPoints[lastIdx][1] - aiPoints[lastIdx - 1][1]]
      : [0, -1]

  const exitSide = sideFromDelta(firstSeg[0], firstSeg[1])
  const entrySide = sideFromDelta(-lastSeg[0], -lastSeg[1])

  const [sx, sy] = edgeCenter(startEl, exitSide)
  const [ex, ey] = edgeCenter(endEl, entrySide)
  return [sx, sy, ex, ey]
}

export class ExcalidrawToolExecutor {
  private api: ExcalidrawImperativeAPI
  private ydoc: Y.Doc
  private yElements: Y.Array<Y.Map<unknown>>
  private yFiles: Y.Map<string>

  constructor(api: ExcalidrawImperativeAPI, ydoc: Y.Doc, yElements: Y.Array<Y.Map<unknown>>, yFiles: Y.Map<string>) {
    this.api = api
    this.ydoc = ydoc
    this.yElements = yElements
    this.yFiles = yFiles
  }

  execute(toolCall: ToolCall): void {
    console.log('[ExcalidrawToolExecutor] Executing:', toolCall.name)
    let args: Record<string, unknown>
    try {
      args = JSON.parse(toolCall.arguments)
    } catch {
      console.error('[ExcalidrawToolExecutor] Failed to parse arguments:', toolCall.arguments)
      return
    }

    try {
      switch (toolCall.name) {
        case 'batch_create_elements':
          console.log('[ExcalidrawToolExecutor] Creating', (args.elements as unknown[])?.length, 'elements')
          this.batchCreate(args.elements as CreateElementParams[])
          break
        case 'update_elements':
          this.updateElements(args.updates as Array<{ id: string } & Partial<CreateElementParams>>)
          break
        case 'delete_elements':
          this.deleteElements(args.elementIds as string[])
          break
        case 'clear_canvas':
          this.clearCanvas()
          break
        default:
          console.warn('[ExcalidrawToolExecutor] Unknown tool call:', toolCall.name)
      }
      console.log('[ExcalidrawToolExecutor] Completed:', toolCall.name)
    } catch (error) {
      console.error('[ExcalidrawToolExecutor] Error executing', toolCall.name, error)
    }
  }

  describeScene(): string {
    const elements = this.api.getSceneElements()
    if (elements.length === 0) return 'Canvas is empty.'

    const summary: string[] = [`${elements.length} elements on canvas:`]

    for (const el of elements) {
      if ((el as any).isDeleted) continue
      const parts = [`- [${el.id}] ${el.type} at (${Math.round(el.x)}, ${Math.round(el.y)})`]
      if (el.width) parts.push(`${Math.round(el.width)}×${Math.round(el.height)}`)
      if ((el as any).text) parts.push(`text="${(el as any).text}"`)
      if ((el as any).containerId) parts.push(`in=${(el as any).containerId}`)
      if (el.backgroundColor && el.backgroundColor !== 'transparent') parts.push(`fill=${el.backgroundColor}`)
      summary.push(parts.join(' '))
    }

    return summary.join('\n')
  }

  private batchCreate(elements: CreateElementParams[]): void {
    if (!elements?.length) return

    const existingElements = this.api.getSceneElements()
    const existingMap = new Map<string, ExcalidrawElement>()
    existingElements.forEach(el => existingMap.set(el.id, el))

    const outputElements: Record<string, unknown>[] = []
    const newById = new Map<string, Record<string, unknown>>()
    const paramsMap = new Map<string, CreateElementParams>()

    for (const params of elements) {
      if (params.type === 'arrow' || params.type === 'line') {
        const el = this.buildArrow(params)
        outputElements.push(el)
        newById.set(el.id as string, el)
        paramsMap.set(el.id as string, params)
        continue
      }

      if (params.type === 'text') {
        const el = this.buildText(params)
        outputElements.push(el)
        newById.set(el.id as string, el)
        continue
      }

      const shapeEl = this.buildShape(params)
      outputElements.push(shapeEl)
      newById.set(shapeEl.id as string, shapeEl)
      paramsMap.set(shapeEl.id as string, params)

      const labelText = params.label || params.text
      if (labelText) {
        const textEl = this.buildBoundText(shapeEl, labelText, params.fontSize, params.fontFamily)
        outputElements.push(textEl)
        newById.set(textEl.id as string, textEl)
      }
    }

    this.fixOverlappingShapes(outputElements)
    this.autoConnectIfNoArrows(outputElements, newById, paramsMap)

    this.resolveArrowBindings(outputElements, existingMap, paramsMap, newById)

    const allElements = [...existingElements.map(el => JSON.parse(JSON.stringify(el))), ...outputElements]
    const normalizedElements = this.normalizeElements(allElements, existingElements)

    Y.transact(
      this.ydoc,
      () => {
        this.yElements.delete(0, this.yElements.length)
        for (const el of normalizedElements) {
          const yEl = new Y.Map()
          Object.entries(el).forEach(([k, v]) => {
            if (v !== undefined && typeof v !== 'function') {
              yEl.set(k, JSON.parse(JSON.stringify(v)))
            }
          })
          this.yElements.push([yEl])
        }
      },
      WB_YJS_ORIGIN
    )

    this.api.updateScene({ elements: normalizedElements as any })

    if (outputElements.length > 0) {
      requestAnimationFrame(() => {
        this.api.scrollToContent(normalizedElements as any, {
          fitToViewport: true,
          viewportZoomFactor: 0.85,
          animate: true
        })
      })
    }
  }

  private updateElements(updates: Array<{ id: string } & Partial<CreateElementParams>>): void {
    if (!updates?.length) return

    const elements = this.api.getSceneElements().map(el => JSON.parse(JSON.stringify(el)))

    for (const update of updates) {
      const idx = elements.findIndex((el: any) => el.id === update.id)
      if (idx === -1) continue
      const { label, ...changes } = update as any
      Object.assign(elements[idx], changes)
      if (label !== undefined && elements[idx].type !== 'text') {
        const textIdx = elements.findIndex((el: any) => el.containerId === update.id)
        if (textIdx !== -1) {
          elements[textIdx].text = label
          elements[textIdx].originalText = label
        }
      }
    }

    const normalizedElements = this.normalizeElements(elements)

    Y.transact(
      this.ydoc,
      () => {
        this.yElements.delete(0, this.yElements.length)
        for (const el of normalizedElements) {
          const yEl = new Y.Map()
          Object.entries(el).forEach(([k, v]) => {
            if (v !== undefined && typeof v !== 'function') {
              yEl.set(k, JSON.parse(JSON.stringify(v)))
            }
          })
          this.yElements.push([yEl])
        }
      },
      WB_YJS_ORIGIN
    )

    this.api.updateScene({ elements: normalizedElements as any })
  }

  private deleteElements(elementIds: string[]): void {
    if (!elementIds?.length) return

    const idsToDelete = new Set(elementIds)
    const elements = this.api
      .getSceneElements()
      .map(el => JSON.parse(JSON.stringify(el)))
      .map((el: any) => {
        if (idsToDelete.has(el.id) || idsToDelete.has(el.containerId)) {
          return { ...el, isDeleted: true }
        }
        return el
      })

    const normalizedElements = this.normalizeElements(elements)

    Y.transact(
      this.ydoc,
      () => {
        this.yElements.delete(0, this.yElements.length)
        for (const el of normalizedElements) {
          const yEl = new Y.Map()
          Object.entries(el).forEach(([k, v]) => {
            if (v !== undefined && typeof v !== 'function') {
              yEl.set(k, JSON.parse(JSON.stringify(v)))
            }
          })
          this.yElements.push([yEl])
        }
      },
      WB_YJS_ORIGIN
    )

    this.api.updateScene({ elements: normalizedElements as any })
  }

  private clearCanvas(): void {
    Y.transact(
      this.ydoc,
      () => {
        this.yElements.delete(0, this.yElements.length)
        this.yFiles.forEach((_, id) => this.yFiles.delete(id))
      },
      WB_YJS_ORIGIN
    )

    this.api.updateScene({ elements: [] })
  }

  private buildShape(params: CreateElementParams): Record<string, unknown> {
    const labelText = params.label || params.text || ''
    const labelFontSize = params.fontSize ?? 16
    const minWidth = 160
    const minHeight = 70
    let shapeWidth = params.width ?? minWidth
    let shapeHeight = params.height ?? minHeight

    if (labelText) {
      const padding = 40
      const textBounds = estimateTextBounds(labelText, labelFontSize, 1.25)
      shapeWidth = Math.max(shapeWidth, textBounds.width + padding)
      shapeHeight = Math.max(shapeHeight, textBounds.height + padding)
    }

    return {
      id: params.id || generateId(),
      type: params.type,
      x: params.x,
      y: params.y,
      width: shapeWidth,
      height: shapeHeight,
      angle: 0,
      strokeColor: params.strokeColor ?? '#1e1e1e',
      backgroundColor: params.backgroundColor ?? 'transparent',
      fillStyle: params.fillStyle ?? 'solid',
      strokeWidth: params.strokeWidth ?? 2,
      strokeStyle: params.strokeStyle ?? 'solid',
      roughness: params.roughness ?? 1,
      opacity: params.opacity ?? 100,
      seed: randomSeed(),
      version: 1,
      versionNonce: randomSeed(),
      isDeleted: false,
      groupIds: params.groupIds ?? [],
      boundElements: null,
      updated: Date.now(),
      link: null,
      locked: false,
      frameId: null,
      index: null,
      roundness: params.roundness ?? (params.type === 'rectangle' ? { type: 3 } : null)
    }
  }

  private buildBoundText(
    shapeEl: Record<string, unknown>,
    label: string,
    fontSize?: number,
    fontFamily?: number
  ): Record<string, unknown> {
    const fontSizeValue = fontSize ?? 16
    const lineHeight = 1.25
    const bounds = estimateTextBounds(label, fontSizeValue, lineHeight)
    const shapeX = shapeEl.x as number
    const shapeY = shapeEl.y as number
    const shapeWidth = shapeEl.width as number
    const shapeHeight = shapeEl.height as number
    const textEl = {
      id: `${shapeEl.id}-label`,
      type: 'text',
      x: shapeX + shapeWidth / 2 - bounds.width / 2,
      y: shapeY + shapeHeight / 2 - bounds.height / 2,
      width: bounds.width,
      height: bounds.height,
      text: label,
      originalText: label,
      fontSize: fontSizeValue,
      fontFamily: fontFamily ?? 2,
      textAlign: 'center',
      verticalAlign: 'middle',
      containerId: shapeEl.id as string,
      lineHeight,
      autoResize: true,
      angle: 0,
      strokeColor: shapeEl.strokeColor ?? '#1e1e1e',
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      seed: randomSeed(),
      version: 1,
      versionNonce: randomSeed(),
      isDeleted: false,
      groupIds: [],
      boundElements: null,
      updated: Date.now(),
      link: null,
      locked: false,
      frameId: null,
      index: null,
      roundness: null
    }

    shapeEl.boundElements = [...((shapeEl.boundElements as any[]) || []), { id: textEl.id, type: 'text' }]
    return textEl
  }

  private buildText(params: CreateElementParams): Record<string, unknown> {
    const fontSize = params.fontSize ?? 20
    const lineHeight = 1.25
    const text = params.text ?? params.label ?? ''
    const bounds = estimateTextBounds(text, fontSize, lineHeight)
    return {
      id: params.id || generateId(),
      type: 'text',
      x: params.x,
      y: params.y,
      width: bounds.width,
      height: bounds.height,
      text,
      originalText: text,
      fontSize,
      fontFamily: params.fontFamily ?? 2,
      textAlign: 'center',
      verticalAlign: 'middle',
      containerId: null,
      lineHeight,
      autoResize: true,
      angle: 0,
      strokeColor: params.strokeColor ?? '#1e1e1e',
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: params.opacity ?? 100,
      seed: randomSeed(),
      version: 1,
      versionNonce: randomSeed(),
      isDeleted: false,
      groupIds: params.groupIds ?? [],
      boundElements: null,
      updated: Date.now(),
      link: null,
      locked: false,
      frameId: null,
      index: null,
      roundness: null
    }
  }

  private buildArrow(params: CreateElementParams): Record<string, unknown> {
    const points = params.points ?? [
      [0, 0],
      [0, 100]
    ]
    let minX = 0,
      maxX = 0,
      minY = 0,
      maxY = 0
    for (const [px, py] of points) {
      if (px < minX) minX = px
      if (px > maxX) maxX = px
      if (py < minY) minY = py
      if (py > maxY) maxY = py
    }
    return {
      id: params.id || generateId(),
      type: params.type,
      x: params.x,
      y: params.y,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY),
      angle: 0,
      strokeColor: params.strokeColor ?? '#1e1e1e',
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: params.strokeWidth ?? 2,
      strokeStyle: params.strokeStyle ?? 'solid',
      roughness: params.roughness ?? 1,
      opacity: params.opacity ?? 100,
      seed: randomSeed(),
      version: 1,
      versionNonce: randomSeed(),
      isDeleted: false,
      groupIds: params.groupIds ?? [],
      boundElements: null,
      updated: Date.now(),
      link: null,
      locked: false,
      frameId: null,
      index: null,
      roundness: null,
      points,
      lastCommittedPoint: null,
      startBinding: null,
      endBinding: null,
      startArrowhead: params.type === 'arrow' ? (params.startArrowhead ?? null) : null,
      endArrowhead: params.type === 'arrow' ? (params.endArrowhead ?? 'arrow') : null,
      ...(params.type === 'arrow' ? { elbowed: false } : {})
    }
  }

  private fixOverlappingShapes(elements: Record<string, unknown>[]): void {
    const minGap = 40
    const shapeTypes = new Set(['rectangle', 'ellipse', 'diamond'])
    const shapes = elements.filter(el => shapeTypes.has(el.type as string))
    if (shapes.length < 2) return

    const rowTolerance = 20
    const rows = new Map<number, Record<string, unknown>[]>()
    for (const s of shapes) {
      const cy = (s.y as number) + (s.height as number) / 2
      let assignedRow: number | undefined
      for (const rowY of rows.keys()) {
        if (Math.abs(cy - rowY) < rowTolerance) {
          assignedRow = rowY
          break
        }
      }
      if (assignedRow !== undefined) {
        rows.get(assignedRow)!.push(s)
      } else {
        rows.set(cy, [s])
      }
    }

    for (const rowShapes of rows.values()) {
      if (rowShapes.length < 2) continue
      rowShapes.sort((a, b) => (a.x as number) - (b.x as number))
      for (let i = 1; i < rowShapes.length; i++) {
        const prev = rowShapes[i - 1]
        const curr = rowShapes[i]
        const prevRight = (prev.x as number) + (prev.width as number)
        const currLeft = curr.x as number
        const overlap = prevRight + minGap - currLeft
        if (overlap > 0) {
          const shift = overlap
          for (let j = i; j < rowShapes.length; j++) {
            const el = rowShapes[j]
            el.x = (el.x as number) + shift
            const boundTextId = `${el.id}-label`
            const boundText = elements.find(e => e.id === boundTextId)
            if (boundText) {
              boundText.x = (boundText.x as number) + shift
            }
          }
        }
      }
    }
  }

  private autoConnectIfNoArrows(
    elements: Record<string, unknown>[],
    newById: Map<string, Record<string, unknown>>,
    paramsMap: Map<string, CreateElementParams>
  ): void {
    const hasArrows = elements.some(el => el.type === 'arrow' || el.type === 'line')
    if (hasArrows) return

    const shapeTypes = new Set(['rectangle', 'ellipse', 'diamond'])
    const shapes = elements.filter(el => shapeTypes.has(el.type as string))
    if (shapes.length < 2) return

    const rowTolerance = 30
    const rowMap = new Map<number, Record<string, unknown>[]>()
    for (const s of shapes) {
      const cy = (s.y as number) + (s.height as number) / 2
      let rowKey: number | undefined
      for (const ry of rowMap.keys()) {
        if (Math.abs(cy - ry) < rowTolerance) {
          rowKey = ry
          break
        }
      }
      if (rowKey !== undefined) {
        rowMap.get(rowKey)!.push(s)
      } else {
        rowMap.set(cy, [s])
      }
    }

    const sortedRows = [...rowMap.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, nodes]) => {
        nodes.sort((a, b) => (a.x as number) - (b.x as number))
        return nodes
      })

    if (sortedRows.length < 2) return

    for (let r = 0; r < sortedRows.length - 1; r++) {
      const parentRow = sortedRows[r]
      const childRow = sortedRows[r + 1]
      for (const child of childRow) {
        const childCx = (child.x as number) + (child.width as number) / 2
        let closest = parentRow[0]
        let closestDist = Infinity
        for (const parent of parentRow) {
          const parentCx = (parent.x as number) + (parent.width as number) / 2
          const dist = Math.abs(parentCx - childCx)
          if (dist < closestDist) {
            closestDist = dist
            closest = parent
          }
        }
        const arrowParams: CreateElementParams = {
          type: 'arrow',
          x: 0,
          y: 0,
          startElementId: closest.id as string,
          endElementId: child.id as string
        }
        const arrowEl = this.buildArrow(arrowParams)
        elements.push(arrowEl)
        newById.set(arrowEl.id as string, arrowEl)
        paramsMap.set(arrowEl.id as string, arrowParams)
      }
    }
  }

  private resolveArrowBindings(
    allElements: Record<string, unknown>[],
    existingMap: Map<string, ExcalidrawElement>,
    paramsMap: Map<string, CreateElementParams>,
    newById: Map<string, Record<string, unknown>>
  ): void {
    const findElement = (id: string): Record<string, unknown> | undefined =>
      newById.get(id) || (existingMap.get(id) as unknown as Record<string, unknown>)

    for (const el of allElements) {
      const params = paramsMap.get(el.id as string)
      if (!params) continue
      if (el.type !== 'arrow' && el.type !== 'line') continue

      const startId = params.startElementId
      const endId = params.endElementId
      if (!startId && !endId) continue

      const startEl = startId ? findElement(startId) : undefined
      const endEl = endId ? findElement(endId) : undefined

      if (startEl && endEl && startId === endId) {
        el.x = (startEl.x as number) + (startEl.width as number)
        el.y = (startEl.y as number) + (startEl.height as number) / 2
        const loopOffset = 60
        el.points = params.points ?? [
          [0, 0],
          [loopOffset, -loopOffset],
          [0, -(loopOffset * 2)],
          [-loopOffset, -loopOffset],
          [0, 0]
        ]
      } else if (startEl && endEl) {
        const aiPoints = params.points
        const hasMulti = !!aiPoints && aiPoints.length > 2
        if (hasMulti) {
          const [sx, sy, ex, ey] = computeMultiPointEdges(startEl, endEl, aiPoints)
          el.x = sx
          el.y = sy
          const totalDx = ex - sx
          const totalDy = ey - sy

          const origFirst = aiPoints[0]
          const origLast = aiPoints[aiPoints.length - 1]
          const origDx = origLast[0] - origFirst[0]
          const origDy = origLast[1] - origFirst[1]
          const scaleX = origDx !== 0 ? totalDx / origDx : 1
          const scaleY = origDy !== 0 ? totalDy / origDy : 1

          el.points = aiPoints.map((p: number[], i: number) => {
            if (i === 0) return [0, 0]
            if (i === aiPoints.length - 1) return [totalDx, totalDy]
            return [(p[0] - origFirst[0]) * scaleX, (p[1] - origFirst[1]) * (origDy !== 0 ? scaleY : 1)]
          })
        } else {
          const [sx, sy, ex, ey] = computeEdgePoints(startEl, endEl)
          el.x = sx
          el.y = sy
          el.points = [
            [0, 0],
            [ex - sx, ey - sy]
          ]
        }
      } else if (startEl) {
        const cx = (startEl.x as number) + (startEl.width as number) / 2
        const cy = (startEl.y as number) + (startEl.height as number) / 2
        el.x = cx
        el.y = cy
      } else if (endEl) {
        const ex = (endEl.x as number) + (endEl.width as number) / 2
        const ey = (endEl.y as number) + (endEl.height as number) / 2
        const ox = (el.x as number) ?? 0
        const oy = (el.y as number) ?? 0
        el.points = [
          [0, 0],
          [ex - ox, ey - oy]
        ]
      }

      const isMultiPoint = Array.isArray(el.points) && (el.points as number[][]).length > 2
      const isSelfLoop = startId === endId

      if (startEl && !isMultiPoint && !isSelfLoop) {
        el.startBinding = { elementId: startId, focus: 0, gap: 4, fixedPoint: null }
        const bound = ((startEl as any).boundElements as any[]) || []
        ;(startEl as any).boundElements = [...bound, { id: el.id, type: 'arrow' }]
      }

      if (endEl && !isMultiPoint && !isSelfLoop) {
        el.endBinding = { elementId: endId, focus: 0, gap: 4, fixedPoint: null }
        const bound = ((endEl as any).boundElements as any[]) || []
        ;(endEl as any).boundElements = [...bound, { id: el.id, type: 'arrow' }]
      }
    }
  }

  private normalizeElements(
    elements: Record<string, unknown>[],
    localElements?: readonly ExcalidrawElement[]
  ): ExcalidrawElement[] {
    try {
      return restoreElements(elements as never, localElements ?? null, {
        refreshDimensions: true,
        repairBindings: true
      }) as unknown as ExcalidrawElement[]
    } catch (error) {
      console.error('[ExcalidrawToolExecutor] Failed to normalize elements', error)
      return elements as ExcalidrawElement[]
    }
  }
}
