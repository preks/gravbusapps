import React, { useEffect, useRef, useCallback } from 'react'
import * as d3 from 'd3'
import { GuardianNetworkData, GuardianFilter } from '../../types/guardianTypes'

interface D3ForceNetworkChartProps {
  data: GuardianNetworkData
  dimensions: { width: number; height: number }
  filters: GuardianFilter
  animationSpeed: number
  isRealTime: boolean
  showParticles?: boolean
  enableClustering?: boolean
  edgeBundling?: boolean
  heatmapMode?: boolean
  onError: (error: string) => void
  prefixDataTestId: string
}

interface D3Node extends d3.SimulationNodeDatum {
  id: string
  type: string
  label: string
  data: any
  size: number
  color: string
  cluster?: number
  halo?: number
}

interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  id: string
  type: string
  data: any
  animated: boolean
  color: string
  strokeWidth: number
}

interface Particle {
  id: string
  link: D3Link
  progress: number
  speed: number
  size: number
  color: string
}

export const D3ForceNetworkChart: React.FC<D3ForceNetworkChartProps> = ({
  data,
  dimensions,
  filters,
  animationSpeed,
  isRealTime,
  showParticles = true,
  enableClustering = true,
  edgeBundling = false,
  heatmapMode = false,
  onError,
  prefixDataTestId
}) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const simulationRef = useRef<d3.Simulation<D3Node, D3Link> | null>(null)
  const particlesRef = useRef<Particle[]>([])
  const animationFrameRef = useRef<number | null>(null)
  const mountedRef = useRef(true)
  const nodesRef = useRef<D3Node[]>([])
  const linksRef = useRef<D3Link[]>([])

  // View transform (pan + zoom) in screen-space pixels (CSS px) and scale factor.
  const viewTransformRef = useRef<{ x: number; y: number; k: number }>({ x: 0, y: 0, k: 1 })
  const interactionRef = useRef<{
    mode: 'none' | 'pan' | 'drag-node'
    pointerId: number | null
    startX: number
    startY: number
    startTx: number
    startTy: number
    nodeId: string | null
  }>({ mode: 'none', pointerId: null, startX: 0, startY: 0, startTx: 0, startTy: 0, nodeId: null })

  // Transform data for D3
  const transformData = useCallback(() => {
    const nodes: D3Node[] = data.nodes.map(node => ({
      id: node.id,
      type: node.type,
      label: node.label,
      data: node.data,
      size:
        node.data.size ||
        (node.type === 'workflow' ? 12 : node.type === 'department' ? 15 : node.type === 'user' ? 8 : 10),
      color: node.data.color || getNodeColor(node.type, node.data.status),
      cluster: node.type === 'department' ? 1 : node.type === 'workflow' ? 2 : node.type === 'user' ? 3 : 0,
      halo: typeof node.data?.halo === 'number' ? node.data.halo : undefined,
      x: node.position.x,
      y: node.position.y
    }))

    const links: D3Link[] = data.edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
      data: edge.data,
      animated: edge.animated || false,
      color: edge.data.color || getLinkColor(edge.type, edge.data.status),
      strokeWidth: edge.data.strokeWidth || (edge.data.weight ? edge.data.weight * 2 : 1)
    }))

    return { nodes, links }
  }, [data])

  const getNodeColor = (type: string, status?: string) => {
    if (heatmapMode) {
      return status === 'active'
        ? '#00ff88'
        : status === 'in-progress'
          ? '#ffd700'
          : status === 'completed'
            ? '#60a5fa'
            : '#6b7280'
    }

    switch (type) {
      case 'workflow':
        return status === 'active' ? '#00ff88' : '#60a5fa'
      case 'department':
        return '#f97316'
      case 'user':
        return '#8b5cf6'
      case 'task':
        return '#06b6d4'
      default:
        return '#6b7280'
    }
  }

  const getLinkColor = (type: string, status?: string) => {
    if (heatmapMode && status === 'active') return '#00ff88'

    switch (type) {
      case 'workflow-flow':
        return '#60a5fa'
      case 'assignment':
        return '#f59e0b'
      case 'reporting':
        return '#8b5cf6'
      case 'dependency':
        return '#ef4444'
      default:
        return '#374151'
    }
  }

  // Initialize particles for flowing animation
  const initializeParticles = useCallback(
    (links: D3Link[]) => {
      if (!showParticles) return

      const seedFromId = (id: string) => {
        // small deterministic hash (stable across renders)
        let h = 0
        for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
        return h
      }

      particlesRef.current = links
        .filter(link => link.animated)
        .flatMap(link =>
          Array.from({ length: 3 }, (_, i) => {
            const seed = seedFromId(`${link.id}:${i}`)
            return {
              id: `${link.id}-particle-${i}`,
              link,
              progress: i * 0.33, // Stagger particles
              speed: 0.55 + (seed % 45) / 100, // 0.55..0.99
              size: 2 + (seed % 20) / 10, // 2..4
              color: link.color
            }
          })
        )
    },
    [showParticles]
  )

  // Set up D3 force simulation
  const setupSimulation = useCallback(
    (nodes: D3Node[], links: D3Link[]) => {
      const { width, height } = dimensions

      if (simulationRef.current) {
        simulationRef.current.stop()
      }

      const simulation = d3
        .forceSimulation<D3Node>(nodes)
        .force(
          'link',
          d3
            .forceLink<D3Node, D3Link>(links)
            .id(d => d.id)
            .distance(d => {
              // Adaptive link distance based on node types
              const sourceNode = d.source as D3Node
              const targetNode = d.target as D3Node
              if (sourceNode.type === 'department' && targetNode.type === 'department') return 150
              if (d.type === 'workflow-flow') return 100
              return 80
            })
            .strength(0.3)
        )
        .force(
          'charge',
          d3.forceManyBody().strength(d => {
            // Stronger repulsion for larger nodes
            const base = d.type === 'department' ? -300 : d.type === 'workflow' ? -200 : -100
            return base * (d.size / 10)
          })
        )
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force(
          'collision',
          d3
            .forceCollide()
            .radius(d => d.size + 5)
            .strength(0.7)
        )

      // Add clustering force if enabled
      if (enableClustering) {
        simulation.force(
          'cluster',
          d3
            .forceX()
            .x(d => {
              switch (d.cluster) {
                case 1:
                  return width * 0.3 // Departments left
                case 2:
                  return width * 0.5 // Workflows center
                case 3:
                  return width * 0.7 // Users right
                default:
                  return width * 0.5
              }
            })
            .strength(0.1)
        )
      }

      simulationRef.current = simulation
      return simulation
    },
    [dimensions, enableClustering]
  )

  // Canvas rendering for performance
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    const nodes = nodesRef.current
    const links = linksRef.current
    const { width, height } = dimensions
    const t = viewTransformRef.current

    // Set canvas dimensions
    const devicePixelRatio = window.devicePixelRatio || 1
    canvas.width = width * devicePixelRatio
    canvas.height = height * devicePixelRatio
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    // Reset any existing transforms (important when called frequently)
    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)

    // Clear canvas with card background color
    context.fillStyle = 'rgba(15, 23, 42, 0.3)' // Match card background
    context.fillRect(0, 0, width, height)

    // Apply pan + zoom transform for drawing the "world"
    context.save()
    context.translate(t.x, t.y)
    context.scale(t.k, t.k)

    // Render links with glow effect (optionally with density trails)
    links.forEach(link => {
      const sourceNode = link.source as D3Node
      const targetNode = link.target as D3Node

      if (sourceNode.x == null || sourceNode.y == null || targetNode.x == null || targetNode.y == null) return

      context.beginPath()
      // Color code by latency bucket when available
      const latencyBucket = (link.data && link.data.latencyBucket) || undefined
      const colorByLatency =
        latencyBucket === 'fast'
          ? '#10b981'
          : latencyBucket === 'normal'
            ? '#60a5fa'
            : latencyBucket === 'slow'
              ? '#f59e0b'
              : latencyBucket === 'very-slow'
                ? '#ef4444'
                : link.color
      context.strokeStyle = colorByLatency
      context.lineWidth = Math.max(1.5, link.strokeWidth)
      context.globalAlpha = link.animated ? 0.85 : 0.55

      // Add glow effect for active links
      if (link.animated) {
        context.shadowColor = colorByLatency
        context.shadowBlur = 10
      }

      if (edgeBundling) {
        // Curved links for bundling effect
        const linkSeed = parseInt(link.id.slice(-3), 16) || 1
        const controlX = (sourceNode.x + targetNode.x) / 2 + Math.cos(linkSeed) * 25
        const controlY = (sourceNode.y + targetNode.y) / 2 + Math.sin(linkSeed) * 25
        context.moveTo(sourceNode.x, sourceNode.y)
        context.quadraticCurveTo(controlX, controlY, targetNode.x, targetNode.y)
      } else {
        context.moveTo(sourceNode.x, sourceNode.y)
        context.lineTo(targetNode.x, targetNode.y)
      }

      // If density trails enabled, draw multiple static strokes to show flow volume
      if (filters.showDensityTrails) {
        context.globalCompositeOperation = 'lighter'
        // Use deterministic offsets based on link ID to prevent flickering
        const linkSeed = parseInt(link.id.slice(-3), 16) || 1
        for (let i = 0; i < 6; i++) {
          const jitter = Math.sin(linkSeed + i * 0.5) * 15
          context.beginPath()
          if (edgeBundling) {
            const controlX = (sourceNode.x + targetNode.x) / 2 + Math.cos(linkSeed + i) * 40
            const controlY = (sourceNode.y + targetNode.y) / 2 + Math.sin(linkSeed + i) * 40 + jitter
            context.moveTo(sourceNode.x, sourceNode.y)
            context.quadraticCurveTo(controlX, controlY, targetNode.x, targetNode.y)
          } else {
            context.moveTo(sourceNode.x, sourceNode.y)
            context.lineTo(targetNode.x + jitter, targetNode.y + jitter)
          }
          context.stroke()
        }
        context.globalCompositeOperation = 'source-over'
      } else {
        context.stroke()
      }
      context.shadowBlur = 0
    })

    // Render particles
    if (showParticles) {
      particlesRef.current.forEach(particle => {
        const sourceNode = particle.link.source as D3Node
        const targetNode = particle.link.target as D3Node

        if (sourceNode.x == null || sourceNode.y == null || targetNode.x == null || targetNode.y == null) return

        const x = sourceNode.x + (targetNode.x - sourceNode.x) * particle.progress
        const y = sourceNode.y + (targetNode.y - sourceNode.y) * particle.progress

        context.beginPath()
        context.fillStyle = particle.color
        context.globalAlpha = 1
        context.shadowColor = particle.color
        context.shadowBlur = 5
        context.arc(x, y, particle.size, 0, 2 * Math.PI)
        context.fill()
        context.shadowBlur = 0

        // Update particle progress
        particle.progress += particle.speed * animationSpeed * 0.01
        if (particle.progress > 1) {
          particle.progress = 0
        }
      })
    }

    // Render nodes
    nodes.forEach(node => {
      if (node.x == null || node.y == null) return

      // Draw halo ring indicating governance/SLA adherence when provided
      if (typeof node.halo === 'number' && node.halo >= 0) {
        const radius = node.size + 6
        const haloIntensity = Math.max(0.2, Math.min(1, node.halo))
        const haloColor = d3.interpolateRgb('#ef4444', '#10b981')(haloIntensity) as string
        context.beginPath()
        context.strokeStyle = haloColor
        context.lineWidth = 3
        context.globalAlpha = 0.6
        context.shadowColor = haloColor
        context.shadowBlur = 12
        context.arc(node.x, node.y, radius, 0, 2 * Math.PI)
        context.stroke()
        context.shadowBlur = 0
        context.globalAlpha = 1
      }

      context.beginPath()
      context.fillStyle = node.color
      context.globalAlpha = 1

      // Add glow effect for active nodes
      if (node.data.status === 'active') {
        context.shadowColor = node.color
        context.shadowBlur = 15
      }

      // Different shapes for different node types
      if (node.type === 'department') {
        // Larger circles for departments
        context.arc(node.x, node.y, node.size, 0, 2 * Math.PI)
      } else if (node.type === 'workflow') {
        // Hexagons for workflows
        const hexRadius = node.size
        context.moveTo(node.x + hexRadius, node.y)
        for (let i = 1; i <= 6; i++) {
          const angle = (i * Math.PI) / 3
          context.lineTo(node.x + hexRadius * Math.cos(angle), node.y + hexRadius * Math.sin(angle))
        }
        context.closePath()
      } else {
        // Regular circles for other types
        context.arc(node.x, node.y, node.size, 0, 2 * Math.PI)
      }

      context.fill()
      context.shadowBlur = 0

      // Add labels for larger nodes
      if (node.size > 10 && filters.showLabels) {
        context.fillStyle = '#ffffff'
        context.font = '10px Arial'
        context.textAlign = 'center'
        context.globalAlpha = 0.8
        context.fillText(node.label, node.x, node.y + node.size + 15)
      }
    })

    context.globalAlpha = 1
    context.restore()
  }, [dimensions, showParticles, edgeBundling, heatmapMode, animationSpeed, filters.showLabels])

  const getCanvasPoint = (evt: PointerEvent | WheelEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top
    }
  }

  const invertToWorld = (sx: number, sy: number) => {
    const t = viewTransformRef.current
    return { x: (sx - t.x) / t.k, y: (sy - t.y) / t.k }
  }

  const findClosestNode = (wx: number, wy: number): D3Node | null => {
    const nodes = nodesRef.current
    let best: { node: D3Node; dist2: number } | null = null
    for (const n of nodes) {
      if (n.x == null || n.y == null) continue
      const dx = wx - n.x
      const dy = wy - n.y
      const dist2 = dx * dx + dy * dy
      const r = (n.size || 10) + 6
      if (dist2 <= r * r) {
        if (!best || dist2 < best.dist2) best = { node: n, dist2 }
      }
    }
    return best?.node || null
  }

  const zoomAtScreenPoint = useCallback(
    (sx: number, sy: number, nextK: number) => {
      const t = viewTransformRef.current
      const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))
      const k = clamp(nextK, 0.2, 6)
      // Keep world point under cursor stationary
      const wx = (sx - t.x) / t.k
      const wy = (sy - t.y) / t.k
      t.k = k
      t.x = sx - wx * k
      t.y = sy - wy * k
      renderCanvas()
    },
    [renderCanvas]
  )

  const resetView = useCallback(() => {
    viewTransformRef.current = { x: 0, y: 0, k: 1 }
    renderCanvas()
  }, [renderCanvas])

  const fitToView = useCallback(() => {
    const nodes = nodesRef.current
    const { width, height } = dimensions
    const pts = nodes.filter(n => n.x != null && n.y != null) as Array<D3Node & { x: number; y: number }>
    if (!pts.length) return

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity
    for (const n of pts) {
      minX = Math.min(minX, n.x - (n.size || 10))
      minY = Math.min(minY, n.y - (n.size || 10))
      maxX = Math.max(maxX, n.x + (n.size || 10))
      maxY = Math.max(maxY, n.y + (n.size || 10))
    }

    const pad = 24
    const bw = Math.max(1, maxX - minX)
    const bh = Math.max(1, maxY - minY)
    const k = Math.max(0.2, Math.min(6, Math.min((width - pad * 2) / bw, (height - pad * 2) / bh)))

    viewTransformRef.current.k = k
    viewTransformRef.current.x = width / 2 - ((minX + maxX) / 2) * k
    viewTransformRef.current.y = height / 2 - ((minY + maxY) / 2) * k
    renderCanvas()
  }, [dimensions, renderCanvas])

  // Pointer interactions: drag nodes, pan background, zoom wheel
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.style.touchAction = 'none'

    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

    const onPointerDown = (evt: PointerEvent) => {
      if (!mountedRef.current) return
      // Only left button for pan/drag (avoid context menu conflicts)
      if (evt.button !== 0) return

      const { x: sx, y: sy } = getCanvasPoint(evt)
      const { x: wx, y: wy } = invertToWorld(sx, sy)
      const hit = findClosestNode(wx, wy)

      const state = interactionRef.current
      state.pointerId = evt.pointerId
      state.startX = sx
      state.startY = sy
      state.startTx = viewTransformRef.current.x
      state.startTy = viewTransformRef.current.y

      if (hit) {
        state.mode = 'drag-node'
        state.nodeId = hit.id
        // Fix node to pointer
        hit.fx = hit.x
        hit.fy = hit.y
        simulationRef.current?.alphaTarget(0.15).restart()
        canvas.style.cursor = 'grabbing'
      } else {
        state.mode = 'pan'
        state.nodeId = null
        canvas.style.cursor = 'grabbing'
      }

      try {
        canvas.setPointerCapture(evt.pointerId)
      } catch {
        // ignore
      }
      evt.preventDefault()
    }

    const onPointerMove = (evt: PointerEvent) => {
      if (!mountedRef.current) return
      const { x: sx, y: sy } = getCanvasPoint(evt)

      const state = interactionRef.current
      if (state.pointerId !== null && evt.pointerId === state.pointerId && state.mode !== 'none') {
        if (state.mode === 'pan') {
          viewTransformRef.current.x = state.startTx + (sx - state.startX)
          viewTransformRef.current.y = state.startTy + (sy - state.startY)
          renderCanvas()
        } else if (state.mode === 'drag-node' && state.nodeId) {
          const { x: wx, y: wy } = invertToWorld(sx, sy)
          const node = nodesRef.current.find(n => n.id === state.nodeId)
          if (node) {
            node.fx = wx
            node.fy = wy
            renderCanvas()
          }
        }
        evt.preventDefault()
        return
      }

      // Hover cursor (when not actively dragging/panning)
      const { x: wx, y: wy } = invertToWorld(sx, sy)
      const hit = findClosestNode(wx, wy)
      canvas.style.cursor = hit ? 'grab' : 'default'
    }

    const endInteraction = (evt: PointerEvent) => {
      const state = interactionRef.current
      if (state.pointerId !== null && evt.pointerId === state.pointerId) {
        if (state.mode === 'drag-node' && state.nodeId) {
          const node = nodesRef.current.find(n => n.id === state.nodeId)
          if (node) {
            node.fx = null
            node.fy = null
          }
          simulationRef.current?.alphaTarget(0)
        }
        state.mode = 'none'
        state.pointerId = null
        state.nodeId = null
        canvas.style.cursor = 'default'
      }
    }

    const onWheel = (evt: WheelEvent) => {
      if (!mountedRef.current) return
      // Allow normal page scrolling unless the user explicitly indicates zoom intent.
      // - Trackpad pinch-to-zoom typically sets ctrlKey on most browsers.
      // - Users can also hold Ctrl/Cmd to zoom on the canvas.
      if (!evt.ctrlKey && !evt.metaKey) return

      // Zoom around cursor (trackpad + mouse wheel)
      const { x: sx, y: sy } = getCanvasPoint(evt)
      const t = viewTransformRef.current
      const { x: wx, y: wy } = invertToWorld(sx, sy)

      const delta = evt.deltaY
      const zoomFactor = Math.exp(-delta * 0.002)
      const nextK = clamp(t.k * zoomFactor, 0.2, 6)

      // Keep (wx,wy) under the cursor after zoom
      t.k = nextK
      t.x = sx - wx * nextK
      t.y = sy - wy * nextK

      renderCanvas()
      evt.preventDefault()
    }

    const onDblClick = () => {
      resetView()
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', endInteraction)
    canvas.addEventListener('pointercancel', endInteraction)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('dblclick', onDblClick)

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', endInteraction)
      canvas.removeEventListener('pointercancel', endInteraction)
      canvas.removeEventListener('wheel', onWheel as any)
      canvas.removeEventListener('dblclick', onDblClick)
    }
  }, [renderCanvas])

  // Animation loop with throttling
  const animate = useCallback(() => {
    if (!canvasRef.current || !mountedRef.current) return

    renderCanvas()

    // Only continue animation if needed and with throttling
    if ((isRealTime || showParticles) && mountedRef.current) {
      // Throttle to ~30 FPS for better performance
      setTimeout(() => {
        if (mountedRef.current) {
          animationFrameRef.current = requestAnimationFrame(animate)
        }
      }, 33) // ~30 FPS
    }
  }, [isRealTime, showParticles])

  // Initialize visualization
  useEffect(() => {
    try {
      const { nodes, links } = transformData()
      nodesRef.current = nodes
      linksRef.current = links

      if (nodes.length === 0) return

      const simulation = setupSimulation(nodesRef.current, linksRef.current)
      initializeParticles(linksRef.current)

      simulation.on('tick', renderCanvas)

      // Start animation if needed
      if (isRealTime || showParticles) {
        animate()
      }

      return () => {
        simulation.stop()
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }
      }
    } catch (error) {
      console.error('Error setting up D3 force network:', error)
      onError(error instanceof Error ? error.message : 'Failed to render network')
    }
  }, [
    data,
    dimensions,
    filters,
    transformData,
    setupSimulation,
    initializeParticles,
    renderCanvas,
    animate,
    isRealTime,
    showParticles,
    onError
  ])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (simulationRef.current) {
        simulationRef.current.stop()
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 1
        }}
        data-testid={`${prefixDataTestId}-canvas`}
      />
    </div>
  )
}
