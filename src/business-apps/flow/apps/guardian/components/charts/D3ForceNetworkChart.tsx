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

      particlesRef.current = links
        .filter(link => link.animated)
        .flatMap(link =>
          Array.from({ length: 3 }, (_, i) => ({
            id: `${link.id}-particle-${i}`,
            link,
            progress: i * 0.33, // Stagger particles
            speed: 0.5 + Math.random() * 0.5, // Variable speed
            size: 2 + Math.random() * 2,
            color: link.color
          }))
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

    // Set canvas dimensions
    const devicePixelRatio = window.devicePixelRatio || 1
    canvas.width = width * devicePixelRatio
    canvas.height = height * devicePixelRatio
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    context.scale(devicePixelRatio, devicePixelRatio)

    // Clear canvas with card background color
    context.fillStyle = 'rgba(15, 23, 42, 0.3)' // Match card background
    context.fillRect(0, 0, width, height)

    // Render links with glow effect (optionally with density trails)
    links.forEach(link => {
      const sourceNode = link.source as D3Node
      const targetNode = link.target as D3Node

      if (!sourceNode.x || !sourceNode.y || !targetNode.x || !targetNode.y) return

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
        const controlX = (sourceNode.x + targetNode.x) / 2 + (Math.random() - 0.5) * 50
        const controlY = (sourceNode.y + targetNode.y) / 2 + (Math.random() - 0.5) * 50
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

        if (!sourceNode.x || !sourceNode.y || !targetNode.x || !targetNode.y) return

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
      if (!node.x || !node.y) return

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
  }, [transformData, dimensions, showParticles, edgeBundling, heatmapMode, animationSpeed, filters.showLabels])

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
          height: '100%'
        }}
        data-testid={`${prefixDataTestId}-canvas`}
      />
    </div>
  )
}
