import React, { useState } from 'react'
import {
  Users,
  TrendingUp,
  Headphones,
  DollarSign,
  Package,
  Presentation,
  Database,
  Gift,
  Settings,
  Briefcase,
  LucideIcon,
  Orbit,
  PenTool,
  Shield
} from 'lucide-react'

interface DomainNode {
  id: string
  label: string
  icon: LucideIcon
  color: string
  description: string
  category: 'business' | 'create' | 'every' | 'platform'
}

interface BusinessAppsVisualizationProps {
  'data-testid'?: string
}

// Business Domains
const BUSINESS_DOMAINS: DomainNode[] = [
  {
    id: 'hr-plus',
    label: 'HR+',
    icon: Users,
    color: 'info',
    description: 'Human Resources',
    category: 'business'
  },
  {
    id: 'sales-plus',
    label: 'Sales+',
    icon: TrendingUp,
    color: 'primary',
    description: 'Sales & CRM',
    category: 'business'
  },
  {
    id: 'service-plus',
    label: 'Service+',
    icon: Headphones,
    color: 'warning',
    description: 'Service Desk',
    category: 'business'
  },
  {
    id: 'finance-plus',
    label: 'Finance+',
    icon: DollarSign,
    color: 'success',
    description: 'Finance',
    category: 'business'
  },
  {
    id: 'erp',
    label: 'ERP',
    icon: Package,
    color: 'ai',
    description: 'Enterprise Planning',
    category: 'business'
  },
  {
    id: 'board-room',
    label: 'Board Room',
    icon: Presentation,
    color: 'primary',
    description: 'Executive Hub',
    category: 'business'
  },
  {
    id: 'masterdata',
    label: 'Masterdata',
    icon: Database,
    color: 'info',
    description: 'Master Data',
    category: 'business'
  },
  {
    id: 'value-packs',
    label: 'Value Packs',
    icon: Gift,
    color: 'success',
    description: 'Value Packages',
    category: 'business'
  },
  {
    id: 'system-management',
    label: 'System Mgmt',
    icon: Settings,
    color: 'offline',
    description: 'System Management',
    category: 'business'
  }
]

// NW Create domains (left side)
const CREATE_DOMAINS: DomainNode[] = [
  {
    id: 'create-main',
    label: 'Create',
    icon: PenTool,
    color: 'destructive',
    description: 'Build anything',
    category: 'create'
  }
]

// NW Every domains (right side)
const EVERY_DOMAINS: DomainNode[] = [
  {
    id: 'every-hub',
    label: 'Every',
    icon: Orbit,
    color: 'success',
    description: 'Productivity Hub',
    category: 'every'
  }
]

// Platform (bottom center - foundation)
const PLATFORM_NODE: DomainNode = {
  id: 'platform',
  label: 'Platform',
  icon: Shield,
  color: 'primary',
  description: 'Secure • Scalable • Unified',
  category: 'platform'
}

const colorMap: Record<string, { bg: string; text: string; border: string; glow: string; line: string }> = {
  primary: {
    bg: 'gba:bg-primary/10',
    text: 'gba:text-primary',
    border: 'gba:border-primary/30',
    glow: 'rgba(59, 130, 246, 0.4)',
    line: 'rgba(59, 130, 246, 0.5)'
  },
  success: {
    bg: 'gba:bg-success/10',
    text: 'gba:text-success',
    border: 'gba:border-success/30',
    glow: 'rgba(34, 197, 94, 0.4)',
    line: 'rgba(34, 197, 94, 0.5)'
  },
  warning: {
    bg: 'gba:bg-warning/10',
    text: 'gba:text-warning',
    border: 'gba:border-warning/30',
    glow: 'rgba(245, 158, 11, 0.4)',
    line: 'rgba(245, 158, 11, 0.5)'
  },
  info: {
    bg: 'gba:bg-info/10',
    text: 'gba:text-info',
    border: 'gba:border-info/30',
    glow: 'rgba(14, 165, 233, 0.4)',
    line: 'rgba(14, 165, 233, 0.5)'
  },
  ai: {
    bg: 'gba:bg-ai/10',
    text: 'gba:text-ai',
    border: 'gba:border-ai/30',
    glow: 'rgba(139, 92, 246, 0.4)',
    line: 'rgba(139, 92, 246, 0.5)'
  },
  destructive: {
    bg: 'gba:bg-destructive/10',
    text: 'gba:text-destructive',
    border: 'gba:border-destructive/30',
    glow: 'rgba(239, 68, 68, 0.4)',
    line: 'rgba(239, 68, 68, 0.5)'
  },
  offline: {
    bg: 'gba:bg-offline/10',
    text: 'gba:text-offline',
    border: 'gba:border-offline/30',
    glow: 'rgba(107, 114, 128, 0.4)',
    line: 'rgba(107, 114, 128, 0.5)'
  }
}

// Keyframes for animations
const animationStyles = `
  @keyframes connection-flow {
    0% { stroke-dashoffset: 20; }
    100% { stroke-dashoffset: 0; }
  }
  @keyframes pulse-node {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
  @keyframes data-flow {
    0% { stroke-dashoffset: 30; opacity: 0.3; }
    50% { opacity: 0.8; }
    100% { stroke-dashoffset: 0; opacity: 0.3; }
  }
  @keyframes platform-pulse {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.6; }
  }
`

export const BusinessAppsVisualization: React.FC<BusinessAppsVisualizationProps> = ({
  'data-testid': testId = 'business-domains-visualization'
}) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)

  // SVG dimensions - wider for better horizontal spread
  const width = 950
  const height = 480
  const centerX = width / 2
  const centerY = 90 // Center hub near top

  // Position calculations
  // Business apps in a grid layout below center hub
  const businessBaseY = 200 // Base row for business apps
  const businessSpacing = 110 // Horizontal spacing between business apps
  const businessStartX = centerX - businessSpacing * 2 // Start from left (for 5 columns)

  // Grid layout: 5 columns, 2 rows
  const getBusinessPosition = (index: number) => {
    const col = index % 5
    const row = Math.floor(index / 5)
    return {
      x: businessStartX + col * businessSpacing,
      y: businessBaseY + row * 80 // 80px vertical spacing between rows
    }
  }

  // Create nodes positioned on left side - aligned with Every
  const getCreatePosition = () => {
    return {
      x: 100,
      y: 130 // Same horizontal level as Every
    }
  }

  // Every nodes positioned on right side - aligned with Create
  const getEveryPosition = () => {
    return {
      x: width - 100,
      y: 130 // Same horizontal level as Create
    }
  }

  // Platform position (bottom center)
  const platformPosition = {
    x: centerX,
    y: height - 60
  }

  const businessPositions = BUSINESS_DOMAINS.map((node, i) => ({
    ...node,
    ...getBusinessPosition(i)
  }))

  const createPositions = CREATE_DOMAINS.map(node => ({
    ...node,
    ...getCreatePosition()
  }))

  const everyPositions = EVERY_DOMAINS.map(node => ({
    ...node,
    ...getEveryPosition()
  }))

  const platformNode = {
    ...PLATFORM_NODE,
    ...platformPosition
  }

  // Generate connections
  const connections: Array<{
    from: string
    to: string
    fromPos: { x: number; y: number }
    toPos: { x: number; y: number }
    color: string
    type: 'normal' | 'platform'
  }> = []

  // Business to Create connections
  businessPositions.forEach(business => {
    createPositions.forEach(create => {
      connections.push({
        from: business.id,
        to: create.id,
        fromPos: { x: business.x, y: business.y },
        toPos: { x: create.x, y: create.y },
        color: colorMap[create.color]?.line || colorMap.primary.line,
        type: 'normal'
      })
    })
  })

  // Business to Every connections
  businessPositions.forEach(business => {
    everyPositions.forEach(every => {
      connections.push({
        from: business.id,
        to: every.id,
        fromPos: { x: business.x, y: business.y },
        toPos: { x: every.x, y: every.y },
        color: colorMap[every.color]?.line || colorMap.success.line,
        type: 'normal'
      })
    })
  })

  // Platform connections to everything
  ;[...businessPositions, ...createPositions, ...everyPositions].forEach(node => {
    connections.push({
      from: 'platform',
      to: node.id,
      fromPos: platformPosition,
      toPos: { x: node.x, y: node.y },
      color: colorMap.primary.line,
      type: 'platform'
    })
  })

  // Also connect platform to center
  connections.push({
    from: 'platform',
    to: 'business-center',
    fromPos: platformPosition,
    toPos: { x: centerX, y: centerY },
    color: colorMap.primary.line,
    type: 'platform'
  })

  const isConnectionHighlighted = (from: string, to: string) => {
    if (!hoveredNode) return true
    return from === hoveredNode || to === hoveredNode
  }

  const renderNode = (node: DomainNode & { x: number; y: number }, nodeRadius: number, labelOffset: number) => {
    const colors = colorMap[node.color] || colorMap.primary
    const Icon = node.icon
    const isHovered = hoveredNode === node.id
    const isConnected = hoveredNode
      ? connections.some(
          c => (c.from === hoveredNode && c.to === node.id) || (c.to === hoveredNode && c.from === node.id)
        )
      : false
    const shouldHighlight = !hoveredNode || isHovered || isConnected

    return (
      <g
        key={node.id}
        onMouseEnter={() => setHoveredNode(node.id)}
        onMouseLeave={() => setHoveredNode(null)}
        style={{ cursor: 'pointer' }}
      >
        {/* Glow effect */}
        {isHovered && (
          <circle cx={node.x} cy={node.y} r={nodeRadius + 12} fill={colors.glow} style={{ filter: 'blur(12px)' }} />
        )}

        {/* Node circle */}
        <circle
          cx={node.x}
          cy={node.y}
          r={nodeRadius}
          className={`gba:fill-background gba:transition-all gba:duration-300 ${shouldHighlight ? 'gba:opacity-100' : 'gba:opacity-40'}`}
          stroke={isHovered ? colors.glow : 'currentColor'}
          strokeWidth={isHovered ? 2.5 : 1.5}
        />

        {/* Icon */}
        <foreignObject x={node.x - nodeRadius / 2} y={node.y - nodeRadius / 2} width={nodeRadius} height={nodeRadius}>
          <div className="gba:flex gba:items-center gba:justify-center gba:w-full gba:h-full">
            <Icon
              className={`gba:transition-all gba:duration-300 ${colors.text} ${shouldHighlight ? 'gba:opacity-100' : 'gba:opacity-40'}`}
              style={{ width: nodeRadius * 0.5, height: nodeRadius * 0.5 }}
            />
          </div>
        </foreignObject>

        {/* Label */}
        <text
          x={node.x}
          y={node.y + labelOffset}
          textAnchor="middle"
          className={`gba:text-xs gba:fill-current gba:font-semibold gba:transition-all gba:duration-300 ${shouldHighlight ? 'gba:text-foreground' : 'gba:text-muted-foreground/50'}`}
        >
          {node.label}
        </text>
        <text
          x={node.x}
          y={node.y + labelOffset + 12}
          textAnchor="middle"
          className={`gba:text-[10px] gba:fill-current gba:transition-all gba:duration-300 ${shouldHighlight ? 'gba:text-muted-foreground' : 'gba:text-muted-foreground/30'}`}
        >
          {node.description}
        </text>
      </g>
    )
  }

  return (
    <section className="gba:py-8 gba:px-6 gba:relative" data-testid={testId}>
      <style>{animationStyles}</style>

      {/* Background gradient */}
      <div className="gba:absolute gba:inset-0 gba:bg-gradient-to-b gba:from-muted/20 gba:via-muted/30 gba:to-muted/20" />

      <div className="gba:relative gba:max-w-6xl gba:mx-auto">
        {/* Section header */}
        <div className="gba:text-center gba:mb-6" style={{ animation: 'fadeInUp 0.6s ease-out' }}>
          <h2 className="gba:text-2xl gba:sm:text-3xl gba:font-bold gba:text-foreground gba:mb-3">
            Connected to your entire ecosystem
          </h2>
          <p className="gba:text-muted-foreground gba:max-w-xl gba:mx-auto">
            Business Domains integrate with NW Create for building, NW Every for collaboration — all powered by the
            NEWWORK Platform
          </p>
        </div>

        {/* Visualization */}
        <div
          className="gba:flex gba:justify-center gba:items-center"
          style={{ animation: 'fadeInUp 0.6s ease-out 0.2s both' }}
        >
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="gba:max-w-full gba:h-auto">
            {/* Platform foundation bar */}
            <rect
              x={150}
              y={height - 95}
              width={width - 300}
              height={60}
              rx={8}
              fill="url(#platformGradient)"
              className="gba:opacity-20"
              style={{ animation: 'platform-pulse 3s ease-in-out infinite' }}
            />
            <defs>
              <linearGradient id="platformGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                {/* eslint-disable-next-line newwork-local/no-hardcoded-colors */}
                <stop offset="0%" stopColor="rgba(59, 130, 246, 0.3)" />
                {/* eslint-disable-next-line newwork-local/no-hardcoded-colors */}
                <stop offset="50%" stopColor="rgba(99, 102, 241, 0.4)" />
                {/* eslint-disable-next-line newwork-local/no-hardcoded-colors */}
                <stop offset="100%" stopColor="rgba(59, 130, 246, 0.3)" />
              </linearGradient>
            </defs>

            {/* Connection lines */}
            {connections.map((conn, index) => {
              const isHighlighted = isConnectionHighlighted(conn.from, conn.to)
              const isPlatformConn = conn.type === 'platform'

              // Create curved path
              const midX = (conn.fromPos.x + conn.toPos.x) / 2
              const midY = (conn.fromPos.y + conn.toPos.y) / 2
              const curveFactor = isPlatformConn ? 0.05 : 0.15
              const dx = conn.toPos.x - conn.fromPos.x
              const dy = conn.toPos.y - conn.fromPos.y
              const controlX = midX - dy * curveFactor
              const controlY = midY + dx * curveFactor

              return (
                <path
                  key={`${conn.from}-${conn.to}`}
                  d={`M ${conn.fromPos.x} ${conn.fromPos.y} Q ${controlX} ${controlY} ${conn.toPos.x} ${conn.toPos.y}`}
                  fill="none"
                  stroke={conn.color}
                  strokeWidth={isHighlighted ? (isPlatformConn ? 1.5 : 2) : isPlatformConn ? 0.5 : 1}
                  className={`gba:transition-all gba:duration-300 ${isHighlighted ? (isPlatformConn ? 'gba:opacity-40' : 'gba:opacity-60') : 'gba:opacity-10'}`}
                  strokeDasharray={isHighlighted ? (isPlatformConn ? '4 4' : '6 3') : 'none'}
                  style={
                    isHighlighted
                      ? {
                          animation: `data-flow 2s linear infinite`,
                          animationDelay: `${index * 0.15}s`
                        }
                      : undefined
                  }
                />
              )
            })}

            {/* Center hub - BUSINESS DOMAINS */}
            <g>
              <circle
                cx={centerX}
                cy={centerY}
                r={42}
                className="gba:fill-primary/10"
                style={{ animation: 'pulse-node 3s ease-in-out infinite' }}
              />
              <circle
                cx={centerX}
                cy={centerY}
                r={35}
                className="gba:fill-background gba:stroke-primary"
                strokeWidth="2"
              />
              <foreignObject x={centerX - 14} y={centerY - 14} width={28} height={28}>
                <div className="gba:flex gba:items-center gba:justify-center gba:w-full gba:h-full">
                  <Briefcase className="gba:w-5 gba:h-5 gba:text-primary" />
                </div>
              </foreignObject>
              <text
                x={centerX}
                y={centerY + 52}
                textAnchor="middle"
                className="gba:text-xs gba:fill-primary gba:font-bold"
              >
                BUSINESS DOMAINS
              </text>
            </g>

            {/* Create nodes (left) */}
            {createPositions.map(node => renderNode(node, 32, 45))}

            {/* Every nodes (right) */}
            {everyPositions.map(node => renderNode(node, 32, 45))}

            {/* Business domain nodes */}
            {businessPositions.map(node => renderNode(node, 28, 42))}

            {/* Platform node (bottom) */}
            {renderNode(platformNode, 36, 48)}

            {/* Labels for Create and Every sections */}
            <text x={100} y={85} textAnchor="middle" className="gba:text-sm gba:fill-destructive gba:font-bold">
              NW CREATE
            </text>
            <text x={width - 100} y={85} textAnchor="middle" className="gba:text-sm gba:fill-success gba:font-bold">
              NW EVERY
            </text>
          </svg>
        </div>

        {/* Legend */}
        <div
          className="gba:flex gba:flex-wrap gba:justify-center gba:gap-4 gba:mt-6"
          style={{ animation: 'fadeInUp 0.6s ease-out 0.4s both' }}
        >
          <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground">
            <div className="gba:w-3 gba:h-3 gba:rounded-full gba:bg-primary" />
            <span>Business Domains</span>
          </div>
          <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground">
            <div className="gba:w-3 gba:h-3 gba:rounded-full gba:bg-destructive" />
            <span>NW Create</span>
          </div>
          <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground">
            <div className="gba:w-3 gba:h-3 gba:rounded-full gba:bg-success" />
            <span>NW Every</span>
          </div>
          <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground">
            <div className="gba:w-3 gba:h-3 gba:rounded-full gba:bg-gradient-to-r gba:from-primary gba:to-ai" />
            <span>NEWWORK Platform</span>
          </div>
        </div>
      </div>
    </section>
  )
}
