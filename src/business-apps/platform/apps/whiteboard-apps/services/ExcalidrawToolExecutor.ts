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
    return {
      id: params.id || generateId(),
      type: params.type,
      x: params.x,
      y: params.y,
      width: params.width ?? 160,
      height: params.height ?? 80,
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
    const lastPoint = points[points.length - 1] ?? [0, 100]
    return {
      id: params.id || generateId(),
      type: params.type,
      x: params.x,
      y: params.y,
      width: Math.abs(lastPoint[0] ?? 100),
      height: Math.abs(lastPoint[1] ?? 100),
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

      if (startEl && endEl) {
        const sx = (startEl.x as number) + (startEl.width as number) / 2
        const sy = (startEl.y as number) + (startEl.height as number)
        const ex = (endEl.x as number) + (endEl.width as number) / 2
        const ey = endEl.y as number

        el.x = sx
        el.y = sy
        el.points = [
          [0, 0],
          [ex - sx, ey - sy]
        ]
      } else if (startEl) {
        const sx = (startEl.x as number) + (startEl.width as number) / 2
        const sy = (startEl.y as number) + (startEl.height as number)
        el.x = sx
        el.y = sy
      } else if (endEl) {
        const ex = (endEl.x as number) + (endEl.width as number) / 2
        const ey = endEl.y as number
        const ox = (el.x as number) ?? 0
        const oy = (el.y as number) ?? 0
        el.points = [
          [0, 0],
          [ex - ox, ey - oy]
        ]
      }

      if (startEl) {
        el.startBinding = { elementId: startId, focus: 0, gap: 4 }
        const bound = ((startEl as any).boundElements as any[]) || []
        ;(startEl as any).boundElements = [...bound, { id: el.id, type: 'arrow' }]
      }

      if (endEl) {
        el.endBinding = { elementId: endId, focus: 0, gap: 4 }
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
