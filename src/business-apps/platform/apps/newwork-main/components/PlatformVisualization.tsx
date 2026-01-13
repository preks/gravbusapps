import React, { useState, useEffect, useRef } from 'react'
import { PenTool, Orbit, Briefcase, Shield, Database, Cpu, LucideIcon } from 'lucide-react'

interface PlatformVisualizationProps {
  'data-testid'?: string
}

interface PillarNode {
  id: string
  label: string
  icon: LucideIcon
  color: string
  description: string
}

interface PlatformNode {
  id: string
  label: string
  icon: LucideIcon
  description: string
}

// Keyframes for visualization animations
const keyframesStyles = `
  @keyframes node-pulse {
    0%, 100% { transform: scale(1); opacity: 0.9; }
    50% { transform: scale(1.03); opacity: 1; }
  }
  @keyframes core-glow {
    0%, 100% { filter: drop-shadow(0 0 15px rgba(6, 182, 212, 0.5)); }
    50% { filter: drop-shadow(0 0 30px rgba(6, 182, 212, 0.8)); }
  }
  @keyframes line-flow {
    0% { stroke-dashoffset: 100; }
    100% { stroke-dashoffset: 0; }
  }
  @keyframes fadeInUp {
    0% { opacity: 0; transform: translateY(20px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes orbit {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes pulseRing {
    0% { transform: scale(1); opacity: 0.6; }
    50% { transform: scale(1.1); opacity: 0.3; }
    100% { transform: scale(1); opacity: 0.6; }
  }
`

// Three pillars
const PILLARS: PillarNode[] = [
  {
    id: 'create',
    label: 'CREATE',
    icon: PenTool,
    color: 'destructive',
    description: 'Build anything'
  },
  {
    id: 'every',
    label: 'EVERY',
    icon: Orbit,
    color: 'success',
    description: 'Your productivity'
  },
  {
    id: 'business',
    label: 'BUSINESS',
    icon: Briefcase,
    color: 'info',
    description: 'Run your business'
  }
]

// Platform layer
const PLATFORM_NODES: PlatformNode[] = [
  { id: 'ai', label: 'AI Core', icon: Cpu, description: 'Intelligence engine' },
  { id: 'security', label: 'Security', icon: Shield, description: 'Enterprise-grade' },
  { id: 'data', label: 'Data Layer', icon: Database, description: 'Unified data' }
]

// Background gradient for visualization container

const VISUALIZATION_BG =
  'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.9) 50%, rgba(15, 23, 42, 0.95) 100%)'

/**
 * Neural Network Background Canvas for the visualization
 */
const NeuralBackgroundCanvas: React.FC<{ width: number; height: number }> = ({ width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = width
    canvas.height = height

    // Neural network nodes
    interface NeuralNode {
      x: number
      y: number
      vx: number
      vy: number
      radius: number
      pulsePhase: number
    }

    const nodes: NeuralNode[] = []
    const nodeCount = 50

    // Initialize nodes
    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 2 + 1,
        pulsePhase: Math.random() * Math.PI * 2
      })
    }

    // Colors - Cyan/Teal theme
    const primaryColor = { r: 6, g: 182, b: 212 } // Cyan
    const secondaryColor = { r: 20, g: 184, b: 166 } // Teal

    let time = 0
    let animationId: number

    const animate = () => {
      time += 0.01
      ctx.clearRect(0, 0, width, height)

      // Central glow
      const centerX = width / 2
      const centerY = height / 2
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, height * 0.6)
      gradient.addColorStop(0, `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, 0.15)`)
      gradient.addColorStop(0.5, `rgba(${secondaryColor.r}, ${secondaryColor.g}, ${secondaryColor.b}, 0.05)`)
      gradient.addColorStop(1, 'transparent')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)

      // Update and draw nodes
      nodes.forEach(node => {
        node.x += node.vx
        node.y += node.vy

        // Bounce off edges
        if (node.x < 0 || node.x > width) node.vx *= -1
        if (node.y < 0 || node.y > height) node.vy *= -1

        node.x = Math.max(0, Math.min(width, node.x))
        node.y = Math.max(0, Math.min(height, node.y))
      })

      // Draw connections
      nodes.forEach((node, i) => {
        nodes.forEach((other, j) => {
          if (i >= j) return

          const dx = other.x - node.x
          const dy = other.y - node.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          const maxDist = 80

          if (distance < maxDist && distance > 0) {
            const opacity = (1 - distance / maxDist) * 0.2

            ctx.beginPath()
            ctx.moveTo(node.x, node.y)
            ctx.lineTo(other.x, other.y)
            ctx.strokeStyle = `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, ${opacity})`
            ctx.lineWidth = 1
            ctx.stroke()
          }
        })
      })

      // Draw nodes
      nodes.forEach(node => {
        const pulse = Math.sin(time * 2 + node.pulsePhase) * 0.3 + 0.7
        const radius = node.radius * pulse

        // Glow
        const nodeGlow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, radius * 4)
        nodeGlow.addColorStop(0, `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, 0.3)`)
        nodeGlow.addColorStop(1, 'transparent')
        ctx.beginPath()
        ctx.arc(node.x, node.y, radius * 4, 0, Math.PI * 2)
        ctx.fillStyle = nodeGlow
        ctx.fill()

        // Core
        ctx.beginPath()
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, 0.6)`
        ctx.fill()
      })

      animationId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
    }
  }, [width, height])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none'
      }}
    />
  )
}

/**
 * PlatformVisualization - Shows the convergence of three pillars into the NEWWORK platform
 * Now with beautiful neural network background
 */
export const PlatformVisualization: React.FC<PlatformVisualizationProps> = ({
  'data-testid': testId = 'platform-visualization'
}) => {
  const [hoveredPillar, setHoveredPillar] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 450 })

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setDimensions({ width: rect.width, height: Math.max(450, rect.width * 0.5) })
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // SVG dimensions - increased height for more spacing
  const width = 800
  const height = 520
  const centerX = width / 2
  const centerY = height / 2 - 20

  // Pillar positions (top arc)
  const pillarPositions = PILLARS.map((_, index) => {
    const angle = -Math.PI / 2 + ((index - 1) * Math.PI) / 4
    return {
      x: centerX + Math.cos(angle) * 180,
      y: 90
    }
  })

  // Platform nodes positions (bottom) - moved up for more space
  const platformPositions = PLATFORM_NODES.map((_, index) => ({
    x: centerX + (index - 1) * 140,
    y: height - 100
  }))

  // AI Core position (center)
  const aiCorePosition = { x: centerX, y: centerY }

  return (
    <>
      <style>{keyframesStyles}</style>
      <section
        className="gba:py-12 gba:px-6 gba:relative gba:bg-gradient-to-b gba:from-background gba:via-muted/20 gba:to-background"
        data-testid={testId}
        style={{ animation: 'fadeInUp 0.6s ease-out 0.6s both' }}
      >
        <div className="gba:max-w-5xl gba:mx-auto">
          {/* Header */}
          <div className="gba:text-center gba:mb-8">
            <h2 className="gba:text-2xl gba:sm:text-3xl gba:font-bold gba:text-foreground gba:mb-2">
              One unified platform
            </h2>
            <p className="gba:text-muted-foreground gba:max-w-2xl gba:mx-auto">
              Three powerful pillars converging into a single enterprise AI platform
            </p>
          </div>

          {/* Visualization Container */}
          <div
            ref={containerRef}
            className="gba:relative gba:w-full gba:overflow-hidden gba:rounded-3xl gba:border gba:border-border/50"
            style={{
              background: VISUALIZATION_BG,
              minHeight: '450px'
            }}
          >
            {/* Neural Network Background */}
            <NeuralBackgroundCanvas width={dimensions.width} height={dimensions.height} />

            {/* SVG Visualization */}
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="gba:w-full gba:h-auto gba:relative"
              style={{ maxHeight: '500px', zIndex: 10 }}
            >
              <defs>
                {/* Enhanced Gradients */}
                {/* eslint-disable newwork-local/no-hardcoded-colors */}
                <linearGradient id="createToCore" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.9" />
                </linearGradient>
                <linearGradient id="everyToCore" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.9" />
                </linearGradient>
                <linearGradient id="businessToCore" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.9" />
                </linearGradient>
                <linearGradient id="coreToPlatform" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.5" />
                </linearGradient>
                {/* eslint-enable newwork-local/no-hardcoded-colors */}

                {/* Glow filters */}
                <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="6" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Radial gradients for nodes */}
                {/* eslint-disable newwork-local/no-hardcoded-colors */}
                <radialGradient id="coreGradient" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="70%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#0891b2" />
                </radialGradient>
                <radialGradient id="createGradient" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fb7185" />
                  <stop offset="100%" stopColor="#f43f5e" />
                </radialGradient>
                <radialGradient id="everyGradient" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#10b981" />
                </radialGradient>
                <radialGradient id="businessGradient" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </radialGradient>
                {/* eslint-enable newwork-local/no-hardcoded-colors */}
              </defs>

              {/* Orbital rings around AI Core */}
              {/* eslint-disable newwork-local/no-hardcoded-colors */}
              <g style={{ transformOrigin: `${aiCorePosition.x}px ${aiCorePosition.y}px` }}>
                <ellipse
                  cx={aiCorePosition.x}
                  cy={aiCorePosition.y}
                  rx={100}
                  ry={40}
                  fill="none"
                  stroke="rgba(6, 182, 212, 0.25)"
                  strokeWidth={1}
                  style={{ animation: 'pulseRing 4s ease-in-out infinite' }}
                />
                <ellipse
                  cx={aiCorePosition.x}
                  cy={aiCorePosition.y}
                  rx={130}
                  ry={50}
                  fill="none"
                  stroke="rgba(6, 182, 212, 0.15)"
                  strokeWidth={1}
                  style={{ animation: 'pulseRing 5s ease-in-out infinite 0.5s' }}
                />
              </g>
              {/* eslint-enable newwork-local/no-hardcoded-colors */}

              {/* Connection lines from pillars to AI Core - Enhanced */}
              {pillarPositions.map((pos, index) => {
                const gradientId = ['createToCore', 'everyToCore', 'businessToCore'][index]
                const isHovered = hoveredPillar === PILLARS[index].id
                return (
                  <g key={`pillar-connection-${index}`}>
                    {/* Glow line */}
                    <path
                      d={`M ${pos.x} ${pos.y + 40} Q ${(pos.x + aiCorePosition.x) / 2} ${(pos.y + aiCorePosition.y) / 2 - 20} ${aiCorePosition.x} ${aiCorePosition.y - 50}`}
                      fill="none"
                      stroke={`url(#${gradientId})`}
                      strokeWidth={isHovered ? 6 : 4}
                      strokeLinecap="round"
                      opacity={0.2}
                      filter="url(#softGlow)"
                    />
                    {/* Main line */}
                    <path
                      d={`M ${pos.x} ${pos.y + 40} Q ${(pos.x + aiCorePosition.x) / 2} ${(pos.y + aiCorePosition.y) / 2 - 20} ${aiCorePosition.x} ${aiCorePosition.y - 50}`}
                      fill="none"
                      stroke={`url(#${gradientId})`}
                      strokeWidth={isHovered ? 3 : 2}
                      strokeDasharray="8 4"
                      strokeLinecap="round"
                      className="gba:transition-all gba:duration-300"
                      style={{
                        animation: 'line-flow 2s linear infinite',
                        opacity: isHovered ? 1 : 0.7
                      }}
                    />
                  </g>
                )
              })}

              {/* Connection lines from AI Core to Platform nodes */}
              {platformPositions.map((pos, index) => (
                <g key={`platform-connection-${index}`}>
                  <path
                    d={`M ${aiCorePosition.x} ${aiCorePosition.y + 50} Q ${(pos.x + aiCorePosition.x) / 2} ${(pos.y + aiCorePosition.y) / 2 + 10} ${pos.x} ${pos.y - 35}`}
                    fill="none"
                    stroke="url(#coreToPlatform)"
                    strokeWidth={3}
                    opacity={0.2}
                    filter="url(#softGlow)"
                  />
                  <path
                    d={`M ${aiCorePosition.x} ${aiCorePosition.y + 50} Q ${(pos.x + aiCorePosition.x) / 2} ${(pos.y + aiCorePosition.y) / 2 + 10} ${pos.x} ${pos.y - 35}`}
                    fill="none"
                    stroke="url(#coreToPlatform)"
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    style={{ animation: 'line-flow 3s linear infinite', opacity: 0.6 }}
                  />
                </g>
              ))}

              {/* Pillar nodes - Enhanced */}
              {PILLARS.map((pillar, index) => {
                const pos = pillarPositions[index]
                const isHovered = hoveredPillar === pillar.id
                const Icon = pillar.icon
                const gradientId = ['createGradient', 'everyGradient', 'businessGradient'][index]

                return (
                  <g
                    key={pillar.id}
                    onMouseEnter={() => setHoveredPillar(pillar.id)}
                    onMouseLeave={() => setHoveredPillar(null)}
                    className="gba:cursor-pointer"
                    style={{ animation: 'node-pulse 4s ease-in-out infinite' }}
                  >
                    {/* Outer glow */}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={isHovered ? 55 : 45}
                      fill={`url(#${gradientId})`}
                      opacity={isHovered ? 0.25 : 0.15}
                      filter="url(#softGlow)"
                      className="gba:transition-all gba:duration-300"
                    />
                    {/* Main circle with gradient border */}
                    {/* eslint-disable newwork-local/no-hardcoded-colors */}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={38}
                      fill="rgba(15, 23, 42, 0.9)"
                      stroke={`url(#${gradientId})`}
                      strokeWidth={isHovered ? 3 : 2}
                      className="gba:transition-all gba:duration-300"
                    />
                    {/* Inner highlight */}
                    <circle cx={pos.x} cy={pos.y - 10} r={20} fill={`url(#${gradientId})`} opacity={0.1} />
                    {/* Icon */}
                    <foreignObject x={pos.x - 14} y={pos.y - 14} width={28} height={28}>
                      <div className="gba:flex gba:items-center gba:justify-center gba:w-full gba:h-full">
                        <Icon
                          className="gba:w-6 gba:h-6"
                          style={{
                            color:
                              pillar.color === 'destructive'
                                ? '#f43f5e'
                                : pillar.color === 'success'
                                  ? '#10b981'
                                  : '#3b82f6'
                          }}
                        />
                      </div>
                    </foreignObject>
                    {/* Label */}
                    <text x={pos.x} y={pos.y + 58} textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">
                      {pillar.label}
                    </text>
                    <text x={pos.x} y={pos.y + 74} textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="11">
                      {pillar.description}
                    </text>
                    {/* eslint-enable newwork-local/no-hardcoded-colors */}
                  </g>
                )
              })}

              {/* AI Core (center) - Enhanced */}
              {/* eslint-disable newwork-local/no-hardcoded-colors */}
              <g style={{ animation: 'core-glow 3s ease-in-out infinite' }}>
                {/* Outer rings */}
                <circle
                  cx={aiCorePosition.x}
                  cy={aiCorePosition.y}
                  r={70}
                  fill="none"
                  stroke="rgba(6, 182, 212, 0.2)"
                  strokeWidth={1}
                />
                <circle
                  cx={aiCorePosition.x}
                  cy={aiCorePosition.y}
                  r={60}
                  fill="none"
                  stroke="rgba(6, 182, 212, 0.3)"
                  strokeWidth={1}
                />
                {/* Glow */}
                <circle
                  cx={aiCorePosition.x}
                  cy={aiCorePosition.y}
                  r={55}
                  fill="url(#coreGradient)"
                  opacity={0.2}
                  filter="url(#glow)"
                />
                {/* Main circle */}
                <circle
                  cx={aiCorePosition.x}
                  cy={aiCorePosition.y}
                  r={50}
                  fill="rgba(15, 23, 42, 0.95)"
                  stroke="url(#coreGradient)"
                  strokeWidth={3}
                />
                {/* Inner glow */}
                <circle
                  cx={aiCorePosition.x}
                  cy={aiCorePosition.y - 15}
                  r={25}
                  fill="url(#coreGradient)"
                  opacity={0.15}
                />
                {/* AI Core icon */}
                <foreignObject x={aiCorePosition.x - 20} y={aiCorePosition.y - 20} width={40} height={40}>
                  <div className="gba:flex gba:items-center gba:justify-center gba:w-full gba:h-full">
                    <Cpu className="gba:w-9 gba:h-9" style={{ color: '#22d3ee' }} />
                  </div>
                </foreignObject>
                {/* Label */}
                <text
                  x={aiCorePosition.x}
                  y={aiCorePosition.y + 75}
                  textAnchor="middle"
                  fill="#22d3ee"
                  fontSize="14"
                  fontWeight="bold"
                >
                  AI CORE
                </text>
              </g>
              {/* eslint-enable newwork-local/no-hardcoded-colors */}

              {/* Platform nodes - Enhanced */}
              {/* eslint-disable newwork-local/no-hardcoded-colors */}
              {PLATFORM_NODES.map((node, index) => {
                const pos = platformPositions[index]
                const Icon = node.icon

                return (
                  <g key={node.id}>
                    {/* Glow */}
                    <circle cx={pos.x} cy={pos.y} r={35} fill="rgba(20, 184, 166, 0.1)" filter="url(#softGlow)" />
                    {/* Background */}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={30}
                      fill="rgba(15, 23, 42, 0.9)"
                      stroke="rgba(20, 184, 166, 0.5)"
                      strokeWidth={1.5}
                    />
                    {/* Icon */}
                    <foreignObject x={pos.x - 12} y={pos.y - 12} width={24} height={24}>
                      <div className="gba:flex gba:items-center gba:justify-center gba:w-full gba:h-full">
                        <Icon className="gba:w-5 gba:h-5" style={{ color: '#2dd4bf' }} />
                      </div>
                    </foreignObject>
                    {/* Label */}
                    <text
                      x={pos.x}
                      y={pos.y + 48}
                      textAnchor="middle"
                      fill="rgba(255,255,255,0.8)"
                      fontSize="11"
                      fontWeight="500"
                    >
                      {node.label}
                    </text>
                  </g>
                )
              })}
              {/* eslint-enable newwork-local/no-hardcoded-colors */}

              {/* Platform bar at bottom - Enhanced */}
              {/* eslint-disable newwork-local/no-hardcoded-colors */}
              <rect
                x={centerX - 220}
                y={height - 35}
                width={440}
                height={28}
                rx={14}
                fill="rgba(20, 184, 166, 0.1)"
                stroke="rgba(20, 184, 166, 0.3)"
                strokeWidth={1}
              />
              <text
                x={centerX}
                y={height - 16}
                textAnchor="middle"
                fill="#2dd4bf"
                fontSize="12"
                fontWeight="600"
                letterSpacing="2"
              >
                NEWWORK PLATFORM
              </text>
              {/* eslint-enable newwork-local/no-hardcoded-colors */}
            </svg>
          </div>

          {/* Legend */}
          <div className="gba:mt-6 gba:flex gba:justify-center gba:gap-8 gba:flex-wrap">
            <div className="gba:flex gba:items-center gba:gap-2">
              <div className="gba:w-3 gba:h-3 gba:rounded-full gba:bg-destructive" />
              <span className="gba:text-sm gba:text-muted-foreground">Create</span>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2">
              <div className="gba:w-3 gba:h-3 gba:rounded-full gba:bg-success" />
              <span className="gba:text-sm gba:text-muted-foreground">Every</span>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2">
              <div className="gba:w-3 gba:h-3 gba:rounded-full gba:bg-info" />
              <span className="gba:text-sm gba:text-muted-foreground">Business Apps</span>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2">
              <div className="gba:w-3 gba:h-3 gba:rounded-full gba:bg-ai" />
              <span className="gba:text-sm gba:text-muted-foreground">AI Core</span>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default PlatformVisualization
