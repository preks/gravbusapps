import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import type { GraphLink, GraphNode } from './memoryGraphModel'
import type { GraphPalette } from './useGraphTokens'
import { drawScene, hitRadius, nodeRadius, type DrawState } from './memoryGraphCanvas'

interface ForceGraphInputs {
  containerRef: React.RefObject<HTMLDivElement | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  nodes: GraphNode[]
  links: GraphLink[]
  palette: GraphPalette
  selectedId: string | null
  focusIds: Set<string> | null
  matchIds: Set<string> | null
  onPick: (node: GraphNode) => void
}

interface Transform {
  x: number
  y: number
  k: number
}

const MIN_K = 0.15
const MAX_K = 5
const CLICK_MOVE_TOLERANCE = 4
const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value))

export interface ForceGraphApi {
  hoverId: string | null
  fitView: () => void
  focusOn: (id: string, zoom?: number) => void
}

export const useForceGraph = (inputs: ForceGraphInputs): ForceGraphApi => {
  const { containerRef, canvasRef } = inputs
  const simRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null)
  const linkForceRef = useRef<d3.ForceLink<GraphNode, GraphLink> | null>(null)
  const transformRef = useRef<Transform>({ x: 0, y: 0, k: 1 })
  const sizeRef = useRef<{ w: number; h: number }>({ w: 1, h: 1 })
  const inputsRef = useRef(inputs)
  const hoverRef = useRef<string | null>(null)
  const rafRef = useRef<number | null>(null)
  const camAnimRef = useRef<number | null>(null)
  const seededRef = useRef<WeakSet<GraphNode>>(new WeakSet())
  const [hoverId, setHoverId] = useState<string | null>(null)

  useLayoutEffect(() => {
    inputsRef.current = inputs
  })

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const { w, h } = sizeRef.current
    const dpr = window.devicePixelRatio || 1
    const { palette, nodes, links, selectedId, focusIds, matchIds } = inputsRef.current
    const t = transformRef.current

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = palette.background
    ctx.fillRect(0, 0, w, h)
    ctx.save()
    ctx.translate(t.x, t.y)
    ctx.scale(t.k, t.k)
    const state: DrawState = {
      nodes,
      links,
      palette,
      k: t.k,
      hoverId: hoverRef.current,
      selectedId,
      focusIds,
      matchIds
    }
    drawScene(ctx, state)
    ctx.restore()
  }, [])

  const scheduleDraw = useCallback(() => {
    if (rafRef.current != null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      draw()
    })
  }, [draw])

  // Redraw whenever externally-controlled inputs change (selection/search/palette).
  useEffect(() => {
    scheduleDraw()
  }, [inputs.palette, inputs.selectedId, inputs.focusIds, inputs.matchIds, scheduleDraw])

  // One-time simulation + canvas setup.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const linkForce = d3
      .forceLink<GraphNode, GraphLink>([])
      .id(node => node.id)
      .distance(link => {
        const source = link.source as GraphNode
        const target = link.target as GraphNode
        return source?.kind === 'memory' && target?.kind === 'memory' ? 70 : 46
      })
      .strength(0.5)
    linkForceRef.current = linkForce

    const simulation = d3
      .forceSimulation<GraphNode>([])
      .force('link', linkForce)
      .force(
        'charge',
        d3.forceManyBody<GraphNode>().strength(node => (node.kind === 'memory' ? -60 : -260))
      )
      .force(
        'collide',
        d3
          .forceCollide<GraphNode>()
          .radius(node => nodeRadius(node) + 6)
          .strength(0.85)
      )
      .force('x', d3.forceX<GraphNode>().strength(0.04))
      .force('y', d3.forceY<GraphNode>().strength(0.04))
      .alphaDecay(0.035)
      .on('tick', scheduleDraw)
    simRef.current = simulation

    const resize = () => {
      const rect = container.getBoundingClientRect()
      sizeRef.current = { w: Math.max(1, rect.width), h: Math.max(1, rect.height) }
      simulation.force('x', d3.forceX<GraphNode>(sizeRef.current.w / 2).strength(0.04))
      simulation.force('y', d3.forceY<GraphNode>(sizeRef.current.h / 2).strength(0.04))
      scheduleDraw()
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(container)

    return () => {
      observer.disconnect()
      simulation.stop()
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      if (camAnimRef.current != null) cancelAnimationFrame(camAnimRef.current)
    }
  }, [scheduleDraw])

  // Reconcile simulation data when the graph grows; preserve node positions.
  useEffect(() => {
    const simulation = simRef.current
    const linkForce = linkForceRef.current
    if (!simulation || !linkForce) return
    const { w, h } = sizeRef.current
    const byId = new Map(inputs.nodes.map(n => [n.id, n]))

    for (const node of inputs.nodes) {
      if (seededRef.current.has(node) || node.x != null) {
        seededRef.current.add(node)
        continue
      }
      // Seed new nodes near a positioned neighbor for organic growth.
      let seedX = w / 2
      let seedY = h / 2
      for (const link of inputs.links) {
        const s = typeof link.source === 'string' ? byId.get(link.source) : link.source
        const tg = typeof link.target === 'string' ? byId.get(link.target) : link.target
        const other = s === node ? tg : tg === node ? s : undefined
        if (other && other.x != null && other.y != null) {
          seedX = other.x
          seedY = other.y
          break
        }
      }
      node.x = seedX + (Math.random() - 0.5) * 40
      node.y = seedY + (Math.random() - 0.5) * 40
      seededRef.current.add(node)
    }

    simulation.nodes(inputs.nodes)
    linkForce.links(inputs.links)
    simulation.alpha(0.5).restart()
  }, [inputs.nodes, inputs.links])

  const screenToWorld = useCallback((sx: number, sy: number) => {
    const t = transformRef.current
    return { x: (sx - t.x) / t.k, y: (sy - t.y) / t.k }
  }, [])

  const pointAt = (evt: PointerEvent | WheelEvent): { x: number; y: number } => {
    const rect = canvasRef.current?.getBoundingClientRect()
    return rect ? { x: evt.clientX - rect.left, y: evt.clientY - rect.top } : { x: 0, y: 0 }
  }

  const nodeAt = useCallback((wx: number, wy: number): GraphNode | null => {
    let best: { node: GraphNode; d2: number } | null = null
    for (const node of inputsRef.current.nodes) {
      if (node.x == null || node.y == null) continue
      const dx = wx - node.x
      const dy = wy - node.y
      const d2 = dx * dx + dy * dy
      const r = hitRadius(node)
      if (d2 <= r * r && (!best || d2 < best.d2)) best = { node, d2 }
    }
    return best?.node ?? null
  }, [])

  const animateTo = useCallback(
    (target: Transform) => {
      if (camAnimRef.current != null) cancelAnimationFrame(camAnimRef.current)
      const start = { ...transformRef.current }
      if (prefersReducedMotion()) {
        transformRef.current = target
        scheduleDraw()
        return
      }
      const startTime = performance.now()
      const duration = 420
      const step = (now: number) => {
        const p = Math.min(1, (now - startTime) / duration)
        const ease = 1 - Math.pow(1 - p, 3)
        transformRef.current = {
          x: start.x + (target.x - start.x) * ease,
          y: start.y + (target.y - start.y) * ease,
          k: start.k + (target.k - start.k) * ease
        }
        scheduleDraw()
        if (p < 1) camAnimRef.current = requestAnimationFrame(step)
      }
      camAnimRef.current = requestAnimationFrame(step)
    },
    [scheduleDraw]
  )

  const focusOn = useCallback(
    (id: string, zoom = 1.6) => {
      const node = inputsRef.current.nodes.find(n => n.id === id)
      if (!node || node.x == null || node.y == null) return
      const { w, h } = sizeRef.current
      const k = clamp(zoom, MIN_K, MAX_K)
      animateTo({ k, x: w / 2 - node.x * k, y: h / 2 - node.y * k })
    },
    [animateTo]
  )

  const fitView = useCallback(() => {
    const nodes = inputsRef.current.nodes.filter(n => n.x != null && n.y != null)
    if (!nodes.length) return
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const n of nodes) {
      const r = nodeRadius(n) + 12
      minX = Math.min(minX, (n.x as number) - r)
      minY = Math.min(minY, (n.y as number) - r)
      maxX = Math.max(maxX, (n.x as number) + r)
      maxY = Math.max(maxY, (n.y as number) + r)
    }
    const { w, h } = sizeRef.current
    const pad = 32
    const k = clamp(Math.min((w - pad * 2) / (maxX - minX), (h - pad * 2) / (maxY - minY)), MIN_K, MAX_K)
    animateTo({ k, x: w / 2 - ((minX + maxX) / 2) * k, y: h / 2 - ((minY + maxY) / 2) * k })
  }, [animateTo])

  // Pointer + wheel interactions.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.style.touchAction = 'none'

    const drag = {
      mode: 'none' as 'none' | 'pan' | 'node',
      id: null as string | null,
      moved: 0,
      sx: 0,
      sy: 0,
      tx: 0,
      ty: 0
    }

    const onDown = (evt: PointerEvent) => {
      if (evt.button !== 0) return
      const { x: sx, y: sy } = pointAt(evt)
      const { x: wx, y: wy } = screenToWorld(sx, sy)
      const hit = nodeAt(wx, wy)
      drag.moved = 0
      drag.sx = sx
      drag.sy = sy
      drag.tx = transformRef.current.x
      drag.ty = transformRef.current.y
      if (hit) {
        drag.mode = 'node'
        drag.id = hit.id
        hit.fx = hit.x
        hit.fy = hit.y
        simRef.current?.alphaTarget(0.2).restart()
      } else {
        drag.mode = 'pan'
      }
      canvas.setPointerCapture(evt.pointerId)
    }

    const onMove = (evt: PointerEvent) => {
      const { x: sx, y: sy } = pointAt(evt)
      if (drag.mode === 'none') {
        const { x: wx, y: wy } = screenToWorld(sx, sy)
        const hit = nodeAt(wx, wy)
        const id = hit?.id ?? null
        if (id !== hoverRef.current) {
          hoverRef.current = id
          setHoverId(id)
          canvas.style.cursor = id ? 'pointer' : 'grab'
          scheduleDraw()
        }
        return
      }
      drag.moved += Math.abs(sx - drag.sx) + Math.abs(sy - drag.sy)
      if (drag.mode === 'pan') {
        transformRef.current.x = drag.tx + (sx - drag.sx)
        transformRef.current.y = drag.ty + (sy - drag.sy)
        scheduleDraw()
      } else if (drag.mode === 'node' && drag.id) {
        const node = inputsRef.current.nodes.find(n => n.id === drag.id)
        if (node) {
          const { x: wx, y: wy } = screenToWorld(sx, sy)
          node.fx = wx
          node.fy = wy
        }
      }
    }

    const onUp = (evt: PointerEvent) => {
      const { x: sx, y: sy } = pointAt(evt)
      if (drag.mode === 'node' && drag.id) {
        const node = inputsRef.current.nodes.find(n => n.id === drag.id)
        if (node) {
          node.fx = null
          node.fy = null
        }
        simRef.current?.alphaTarget(0)
      }
      if (drag.moved <= CLICK_MOVE_TOLERANCE) {
        const { x: wx, y: wy } = screenToWorld(sx, sy)
        const hit = nodeAt(wx, wy)
        if (hit) inputsRef.current.onPick(hit)
      }
      drag.mode = 'none'
      drag.id = null
      canvas.style.cursor = 'grab'
    }

    const onWheel = (evt: WheelEvent) => {
      evt.preventDefault()
      const { x: sx, y: sy } = pointAt(evt)
      const t = transformRef.current
      const { x: wx, y: wy } = screenToWorld(sx, sy)
      const nextK = clamp(t.k * Math.exp(-evt.deltaY * 0.0015), MIN_K, MAX_K)
      t.k = nextK
      t.x = sx - wx * nextK
      t.y = sy - wy * nextK
      scheduleDraw()
    }

    const onDouble = () => fitView()

    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointercancel', onUp)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('dblclick', onDouble)
    return () => {
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onUp)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('dblclick', onDouble)
    }
  }, [fitView, nodeAt, scheduleDraw, screenToWorld])

  return { hoverId, fitView, focusOn }
}
