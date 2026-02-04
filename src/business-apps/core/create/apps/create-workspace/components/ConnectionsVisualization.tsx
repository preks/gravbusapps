import React, { useState } from 'react'
import { Monitor, Workflow, Bot, Code2, Database, LayoutTemplate, Sparkles, LucideIcon } from 'lucide-react'

interface ToolNode {
  id: string
  label: string
  icon: LucideIcon
  color: string
  description: string
  connections: string[]
}

interface ConnectionsVisualizationProps {
  'data-testid'?: string
}

const TOOLS: ToolNode[] = [
  {
    id: 'ai-builder',
    label: 'AI Builder',
    icon: Monitor,
    color: 'ai',
    description: 'Build UI with AI',
    connections: ['flow', 'experts', 'functions', 'data', 'templates']
  },
  {
    id: 'flow',
    label: 'Flow',
    icon: Workflow,
    color: 'success',
    description: 'Automate processes',
    connections: ['ai-builder', 'experts', 'functions', 'data', 'templates']
  },
  {
    id: 'experts',
    label: 'AI Task Experts',
    icon: Bot,
    color: 'ai',
    description: 'AI assistants',
    connections: ['ai-builder', 'flow', 'functions', 'data', 'templates']
  },
  {
    id: 'functions',
    label: 'Functions',
    icon: Code2,
    color: 'warning',
    description: 'Custom logic',
    connections: ['ai-builder', 'flow', 'experts', 'data', 'templates']
  },
  {
    id: 'data',
    label: 'Data Models',
    icon: Database,
    color: 'info',
    description: 'Define structures',
    connections: ['ai-builder', 'flow', 'experts', 'functions', 'templates']
  },
  {
    id: 'templates',
    label: 'Templates',
    icon: LayoutTemplate,
    color: 'primary',
    description: 'Quick starts',
    connections: ['ai-builder', 'flow', 'experts', 'functions', 'data']
  }
]

// Calculate positions in a hexagonal pattern
const getNodePosition = (index: number, total: number, centerX: number, centerY: number, radius: number) => {
  const angle = (index * 2 * Math.PI) / total - Math.PI / 2
  return {
    x: centerX + radius * Math.cos(angle),
    y: centerY + radius * Math.sin(angle)
  }
}

/**
 * ConnectionsVisualization - Interactive visualization showing how all tools connect
 * Features animated connections, hover effects, and a central AI hub
 */
export const ConnectionsVisualization: React.FC<ConnectionsVisualizationProps> = ({
  'data-testid': testId = 'connections-visualization'
}) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [activeConnections, setActiveConnections] = useState<Set<string>>(new Set())

  const centerX = 200
  const centerY = 200
  const radius = 140

  const handleNodeHover = (nodeId: string | null) => {
    setHoveredNode(nodeId)
    if (nodeId) {
      const tool = TOOLS.find(t => t.id === nodeId)
      if (tool) {
        const connections = new Set<string>()
        tool.connections.forEach(c => {
          connections.add(`${nodeId}-${c}`)
          connections.add(`${c}-${nodeId}`)
        })
        setActiveConnections(connections)
      }
    } else {
      setActiveConnections(new Set())
    }
  }

  const getColorValue = (color: string) => {
    const colorMap: Record<string, string> = {
      ai: 'var(--nw-ai, #8b5cf6)',
      primary: 'var(--nw-primary, #3b82f6)',
      success: 'var(--nw-success, #22c55e)',
      warning: 'var(--nw-warning, #f59e0b)',
      info: 'var(--nw-info, #0ea5e9)'
    }
    return colorMap[color] || colorMap.primary
  }

  const isConnectionActive = (from: string, to: string) => {
    return activeConnections.has(`${from}-${to}`) || activeConnections.has(`${to}-${from}`)
  }

  return (
    <section className="gba:py-6 gba:px-6 gba:relative" data-testid={testId}>
      {/* Background that spans entire section */}
      <div className="gba:absolute gba:inset-0 gba:bg-gradient-to-b gba:from-muted/20 gba:via-muted/30 gba:to-muted/20" />

      <div className="gba:relative gba:max-w-6xl gba:mx-auto">
        {/* Section header */}
        <div className="gba:text-center gba:mb-6" style={{ animation: 'fadeInUp 0.6s ease-out' }}>
          <h2 className="gba:text-2xl gba:sm:text-3xl gba:font-bold gba:text-foreground gba:mb-3">
            Everything connected. Infinitely powerful.
          </h2>
          <p className="gba:text-muted-foreground gba:max-w-xl gba:mx-auto">
            Each tool in NEWWORK CREATE works seamlessly with others. Build complete solutions by combining AI Builder,
            Flow, AI Task Experts, and more.
          </p>
        </div>

        {/* Visualization */}
        <div className="gba:flex gba:justify-center" style={{ animation: 'fadeInUp 0.6s ease-out 0.2s both' }}>
          <div className="gba:relative" style={{ width: 400, height: 400 }}>
            {/* SVG for connections */}
            <svg className="gba:absolute gba:inset-0" viewBox="0 0 400 400" style={{ overflow: 'visible' }}>
              <defs>
                {/* Animated gradient for connections */}
                <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="var(--nw-ai, #8b5cf6)" stopOpacity="0.6">
                    <animate attributeName="stop-opacity" values="0.3;0.6;0.3" dur="2s" repeatCount="indefinite" />
                  </stop>
                  <stop offset="50%" stopColor="var(--nw-primary, #3b82f6)" stopOpacity="0.8">
                    <animate attributeName="stop-opacity" values="0.5;0.8;0.5" dur="2s" repeatCount="indefinite" />
                  </stop>
                  <stop offset="100%" stopColor="var(--nw-ai, #8b5cf6)" stopOpacity="0.6">
                    <animate attributeName="stop-opacity" values="0.3;0.6;0.3" dur="2s" repeatCount="indefinite" />
                  </stop>
                </linearGradient>

                {/* Glow filter */}
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Connections from each tool to central NEWWORK AI hub */}
              {TOOLS.map((tool, i) => {
                const pos = getNodePosition(i, TOOLS.length, centerX, centerY, radius)
                const isActive = hoveredNode === tool.id

                return (
                  <g key={`center-${tool.id}`}>
                    {/* Line to center */}
                    <line
                      x1={pos.x}
                      y1={pos.y}
                      x2={centerX}
                      y2={centerY}
                      stroke="url(#connectionGradient)"
                      strokeWidth={isActive ? 2.5 : 1.5}
                      strokeOpacity={isActive ? 0.8 : 0.25}
                      filter={isActive ? 'url(#glow)' : undefined}
                      style={{ transition: 'all 0.3s ease' }}
                    />
                    {/* Animated dot to center */}
                    <circle r={2} fill="var(--nw-ai, #8b5cf6)" opacity={0.5}>
                      <animateMotion
                        dur="2.5s"
                        repeatCount="indefinite"
                        begin={`${i * 0.4}s`}
                        path={`M${pos.x},${pos.y} L${centerX},${centerY}`}
                      />
                    </circle>
                  </g>
                )
              })}

              {/* Connection lines between tools - always visible */}
              {TOOLS.map((tool, i) => {
                const pos1 = getNodePosition(i, TOOLS.length, centerX, centerY, radius)
                return tool.connections.map((targetId, connIdx) => {
                  const targetIndex = TOOLS.findIndex(t => t.id === targetId)
                  if (targetIndex === -1 || targetIndex <= i) return null
                  const pos2 = getNodePosition(targetIndex, TOOLS.length, centerX, centerY, radius)
                  const isActive = isConnectionActive(tool.id, targetId)

                  // Calculate midpoint for the animated dot starting position
                  const animationDelay = (i + connIdx) * 0.2

                  return (
                    <g key={`${tool.id}-${targetId}`}>
                      {/* Connection line - always visible with gradient */}
                      <line
                        x1={pos1.x}
                        y1={pos1.y}
                        x2={pos2.x}
                        y2={pos2.y}
                        stroke="url(#connectionGradient)"
                        strokeWidth={isActive ? 2.5 : 1}
                        strokeOpacity={isActive ? 0.9 : 0.2}
                        filter={isActive ? 'url(#glow)' : undefined}
                        style={{
                          transition: 'all 0.3s ease'
                        }}
                      />
                      {/* Animated dot flowing along connection */}
                      <circle r={isActive ? 3 : 1.5} fill="var(--nw-ai, #8b5cf6)" opacity={isActive ? 0.8 : 0.4}>
                        <animateMotion
                          dur="4s"
                          repeatCount="indefinite"
                          begin={`${animationDelay}s`}
                          path={`M${pos1.x},${pos1.y} L${pos2.x},${pos2.y}`}
                        />
                      </circle>
                    </g>
                  )
                })
              })}

              {/* Central hub - larger for NEWWORK AI text */}
              <g filter="url(#glow)">
                <circle
                  cx={centerX}
                  cy={centerY}
                  r="52"
                  fill="var(--nw-card, #ffffff)"
                  stroke="url(#connectionGradient)"
                  strokeWidth="2"
                />
                <circle cx={centerX} cy={centerY} r="48" fill="url(#connectionGradient)" opacity="0.1">
                  <animate attributeName="r" values="44;48;44" dur="2s" repeatCount="indefinite" />
                </circle>
              </g>
            </svg>

            {/* Central NEWWORK AI branding */}
            <div
              className="gba:absolute gba:flex gba:flex-col gba:items-center gba:justify-center"
              style={{
                left: centerX - 44,
                top: centerY - 44,
                width: 88,
                height: 88
              }}
            >
              <Sparkles
                className="gba:h-5 gba:w-5 gba:text-ai gba:mb-1"
                style={{ animation: 'subtlePulse 2s ease-in-out infinite' }}
              />
              <span className="gba:text-[8px] gba:font-medium gba:tracking-widest gba:text-muted-foreground gba:uppercase">
                NEWWORK
              </span>
              <span className="gba:text-sm gba:font-bold gba:bg-gradient-to-r gba:from-ai gba:to-primary gba:bg-clip-text gba:text-transparent">
                AI
              </span>
            </div>

            {/* Tool nodes */}
            {TOOLS.map((tool, index) => {
              const pos = getNodePosition(index, TOOLS.length, centerX, centerY, radius)
              const Icon = tool.icon
              const isHovered = hoveredNode === tool.id

              return (
                <div
                  key={tool.id}
                  className="gba:absolute gba:cursor-pointer gba:transition-all gba:duration-300"
                  style={{
                    left: pos.x - 36,
                    top: pos.y - 36,
                    width: 72,
                    height: 72,
                    transform: isHovered ? 'scale(1.15)' : 'scale(1)',
                    zIndex: isHovered ? 10 : 1
                  }}
                  onMouseEnter={() => handleNodeHover(tool.id)}
                  onMouseLeave={() => handleNodeHover(null)}
                  data-testid={`${testId}-node-${tool.id}`}
                >
                  {/* Node background with glow */}
                  <div
                    className="gba:absolute gba:inset-0 gba:rounded-2xl gba:transition-all gba:duration-300"
                    style={{
                      background: `radial-gradient(circle, ${getColorValue(tool.color)}20 0%, transparent 70%)`,
                      transform: isHovered ? 'scale(1.5)' : 'scale(1)',
                      opacity: isHovered ? 1 : 0
                    }}
                  />

                  {/* Node card */}
                  <div
                    className={`gba:relative gba:w-full gba:h-full gba:rounded-2xl gba:bg-card gba:border gba:flex gba:flex-col gba:items-center gba:justify-center gba:transition-all gba:duration-300 ${isHovered ? 'gba:border-ai gba:shadow-lg' : 'gba:border-border'}`}
                  >
                    <div
                      className="gba:w-8 gba:h-8 gba:rounded-lg gba:flex gba:items-center gba:justify-center gba:mb-1"
                      style={{ backgroundColor: `${getColorValue(tool.color)}20` }}
                    >
                      <Icon className="gba:h-4 gba:w-4" style={{ color: getColorValue(tool.color) }} />
                    </div>
                    <span className="gba:text-[10px] gba:font-medium gba:text-card-foreground gba:text-center gba:leading-tight">
                      {tool.label}
                    </span>
                  </div>

                  {/* Tooltip on hover */}
                  {isHovered && (
                    <div
                      className="gba:absolute gba:left-1/2 gba:-translate-x-1/2 gba:top-full gba:mt-2 gba:px-3 gba:py-2 gba:rounded-lg gba:bg-popover gba:border gba:border-border gba:shadow-lg gba:whitespace-nowrap gba:z-20"
                      style={{ animation: 'fadeInUp 0.2s ease-out' }}
                    >
                      <p className="gba:text-xs gba:font-medium gba:text-popover-foreground">{tool.description}</p>
                      <p className="gba:text-[10px] gba:text-muted-foreground gba:mt-0.5">
                        Connects to {tool.connections.length} tools
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Bottom hint */}
        <p
          className="gba:text-center gba:text-sm gba:text-muted-foreground gba:mt-4"
          style={{ animation: 'fadeInUp 0.6s ease-out 0.4s both' }}
        >
          Data flows seamlessly between all tools
        </p>
      </div>
    </section>
  )
}

export default ConnectionsVisualization
