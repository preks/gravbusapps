import React, { useState } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { Bot, Users, Inbox, FileText, StickyNote, Clock, Globe, LucideIcon } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
import translations from '../_i18n'

interface ToolNode {
  id: string
  label: string
  icon: LucideIcon
  color: string
  description: string
  connections: string[]
}

interface ConnectionsVisualizationProps {
  userAvatar?: string | null
  userInitials?: string
  'data-testid'?: string
}

const TOOLS: ToolNode[] = [
  {
    id: 'every-ai',
    label: 'EveryAI',
    icon: Bot,
    color: 'ai',
    description: 'Your AI assistant',
    connections: ['every-one', 'every-box', 'documents', 'notes', 'time', 'glue']
  },
  {
    id: 'every-one',
    label: 'EveryOne',
    icon: Users,
    color: 'primary',
    description: 'Messages & meetings',
    connections: ['every-ai', 'every-box', 'documents', 'notes', 'time', 'glue']
  },
  {
    id: 'every-box',
    label: 'EveryBox',
    icon: Inbox,
    color: 'warning',
    description: 'Tasks & approvals',
    connections: ['every-ai', 'every-one', 'documents', 'notes', 'time', 'glue']
  },
  {
    id: 'documents',
    label: 'MyDocuments',
    icon: FileText,
    color: 'success',
    description: 'Files & spreadsheets',
    connections: ['every-ai', 'every-one', 'every-box', 'notes', 'time', 'glue']
  },
  {
    id: 'time',
    label: 'Time',
    icon: Clock,
    color: 'info',
    description: 'Track your work',
    connections: ['every-ai', 'every-one', 'every-box', 'documents', 'notes', 'glue']
  },
  {
    id: 'glue',
    label: 'Glue',
    icon: Globe,
    color: 'success',
    description: 'Your intranet',
    connections: ['every-ai', 'every-one', 'every-box', 'documents', 'notes', 'time']
  },
  {
    id: 'notes',
    label: 'Notes',
    icon: StickyNote,
    color: 'offline',
    description: 'Coming soon',
    connections: ['every-ai', 'every-one', 'every-box', 'documents', 'time', 'glue']
  }
]

const colorMap: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  ai: {
    bg: 'gba:bg-ai/10',
    text: 'gba:text-ai',
    border: 'gba:border-ai/30',
    glow: 'rgba(139, 92, 246, 0.4)'
  },
  primary: {
    bg: 'gba:bg-primary/10',
    text: 'gba:text-primary',
    border: 'gba:border-primary/30',
    glow: 'rgba(59, 130, 246, 0.4)'
  },
  success: {
    bg: 'gba:bg-success/10',
    text: 'gba:text-success',
    border: 'gba:border-success/30',
    glow: 'rgba(34, 197, 94, 0.4)'
  },
  warning: {
    bg: 'gba:bg-warning/10',
    text: 'gba:text-warning',
    border: 'gba:border-warning/30',
    glow: 'rgba(245, 158, 11, 0.4)'
  },
  info: {
    bg: 'gba:bg-info/10',
    text: 'gba:text-info',
    border: 'gba:border-info/30',
    glow: 'rgba(14, 165, 233, 0.4)'
  },
  offline: {
    bg: 'gba:bg-offline/10',
    text: 'gba:text-offline',
    border: 'gba:border-offline/30',
    glow: 'rgba(107, 114, 128, 0.4)'
  }
}

// Keyframes for animations
const animationStyles = `
  @keyframes orbit-pulse {
    0%, 100% { transform: scale(1); opacity: 0.6; }
    50% { transform: scale(1.1); opacity: 1; }
  }
  @keyframes connection-flow {
    0% { stroke-dashoffset: 20; }
    100% { stroke-dashoffset: 0; }
  }
`

export const ConnectionsVisualization: React.FC<ConnectionsVisualizationProps> = ({
  userAvatar,
  userInitials = 'U',
  'data-testid': testId = 'newwork-every-connections'
}) => {
  const { t } = useTranslation(translations)
  const [hoveredTool, setHoveredTool] = useState<string | null>(null)
  // Calculate positions in a circle around center
  const centerX = 200
  const centerY = 200
  const radius = 140

  const getToolPosition = (index: number) => {
    const angle = index * ((2 * Math.PI) / TOOLS.length) - Math.PI / 2
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    }
  }

  const toolPositions = TOOLS.map((tool, index) => ({
    ...tool,
    ...getToolPosition(index)
  }))

  // Generate all connections
  const connections: Array<{
    from: string
    to: string
    fromPos: { x: number; y: number }
    toPos: { x: number; y: number }
  }> = []

  toolPositions.forEach(tool => {
    tool.connections.forEach(connId => {
      const targetTool = toolPositions.find(t => t.id === connId)
      if (targetTool && tool.id < connId) {
        // Avoid duplicates
        connections.push({
          from: tool.id,
          to: connId,
          fromPos: { x: tool.x, y: tool.y },
          toPos: { x: targetTool.x, y: targetTool.y }
        })
      }
    })
  })

  const isConnectionHighlighted = (from: string, to: string) => {
    if (!hoveredTool) return true
    return from === hoveredTool || to === hoveredTool
  }

  return (
    <section className="gba:py-6 gba:px-6 gba:relative" data-testid={testId}>
      <style>{animationStyles}</style>

      {/* Background gradient */}
      <div className="gba:absolute gba:inset-0 gba:bg-gradient-to-b gba:from-muted/20 gba:via-muted/30 gba:to-muted/20" />

      <div className="gba:relative gba:max-w-6xl gba:mx-auto">
        {/* Section header */}
        <div className="gba:text-center gba:mb-6" style={{ animation: 'fadeInUp 0.6s ease-out' }}>
          <h2 className="gba:text-2xl gba:sm:text-3xl gba:font-bold gba:text-foreground gba:mb-3">
            {t('connections-section-title')}
          </h2>
          <p className="gba:text-muted-foreground gba:max-w-xl gba:mx-auto">{t('connections-section-subtitle')}</p>
        </div>

        {/* Visualization */}
        <div
          className="gba:flex gba:justify-center gba:items-center"
          style={{ animation: 'fadeInUp 0.6s ease-out 0.2s both' }}
        >
          <svg width="400" height="400" viewBox="0 0 400 400" className="gba:max-w-full gba:h-auto">
            {/* Orbit rings */}
            <circle
              cx={centerX}
              cy={centerY}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className="gba:text-border gba:opacity-30"
              strokeDasharray="4 4"
            />
            <circle
              cx={centerX}
              cy={centerY}
              r={radius * 0.5}
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className="gba:text-border gba:opacity-20"
              strokeDasharray="2 2"
            />

            {/* Connection lines */}
            {connections.map((conn, index) => {
              const isHighlighted = isConnectionHighlighted(conn.from, conn.to)
              return (
                <g key={`${conn.from}-${conn.to}`}>
                  <line
                    x1={conn.fromPos.x}
                    y1={conn.fromPos.y}
                    x2={conn.toPos.x}
                    y2={conn.toPos.y}
                    stroke="currentColor"
                    strokeWidth={isHighlighted ? 1.5 : 0.5}
                    className={`gba:text-success gba:transition-all gba:duration-300 ${isHighlighted ? 'gba:opacity-40' : 'gba:opacity-10'}`}
                    strokeDasharray={isHighlighted ? '4 2' : 'none'}
                    style={
                      isHighlighted
                        ? {
                            animation: `connection-flow 1s linear infinite`,
                            animationDelay: `${index * 0.1}s`
                          }
                        : undefined
                    }
                  />
                </g>
              )
            })}

            {/* Center hub - User Avatar */}
            <g>
              <circle
                cx={centerX}
                cy={centerY}
                r={35}
                className="gba:fill-success/20"
                style={{ animation: 'orbit-pulse 3s ease-in-out infinite' }}
              />
              <circle
                cx={centerX}
                cy={centerY}
                r={28}
                className="gba:fill-background gba:stroke-success"
                strokeWidth="2"
              />
              <foreignObject x={centerX - 20} y={centerY - 20} width={40} height={40}>
                <div className="gba:flex gba:items-center gba:justify-center gba:w-full gba:h-full">
                  <Avatar className="gba:h-10 gba:w-10 gba:ring-2 gba:ring-success/30">
                    {userAvatar &&
                    typeof userAvatar === 'string' &&
                    userAvatar.trim().length > 0 &&
                    !userAvatar.startsWith('{') ? (
                      <AvatarImage
                        src={userAvatar.startsWith('data:') ? userAvatar : `data:image/jpeg;base64,${userAvatar}`}
                        alt="User avatar"
                        onError={e => {
                          console.error('[ConnectionsVisualization] Avatar image failed to load:', e)
                          // Try different image formats if JPEG fails
                          const target = e.target as HTMLImageElement
                          const imageData = userAvatar.startsWith('data:')
                            ? userAvatar.split('base64,')[1] || userAvatar
                            : userAvatar
                          if (target.src.includes('jpeg')) {
                            target.src = `data:image/png;base64,${imageData}`
                          } else if (target.src.includes('png')) {
                            target.src = `data:image/gif;base64,${imageData}`
                          }
                        }}
                        onLoad={() => {
                          console.log('[ConnectionsVisualization] Avatar image loaded successfully')
                        }}
                      />
                    ) : null}
                    <AvatarFallback className="gba:text-sm gba:bg-success gba:text-success-foreground">
                      {userInitials || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </foreignObject>
            </g>

            {/* Tool nodes */}
            {toolPositions.map(tool => {
              const colors = colorMap[tool.color] || colorMap.primary
              const Icon = tool.icon
              const isHovered = hoveredTool === tool.id
              const isRelated = hoveredTool
                ? TOOLS.find(t => t.id === hoveredTool)?.connections.includes(tool.id)
                : false
              const shouldHighlight = !hoveredTool || isHovered || isRelated

              return (
                <g
                  key={tool.id}
                  onMouseEnter={() => setHoveredTool(tool.id)}
                  onMouseLeave={() => setHoveredTool(null)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Glow effect */}
                  {isHovered && (
                    <circle cx={tool.x} cy={tool.y} r={32} fill={colors.glow} style={{ filter: 'blur(8px)' }} />
                  )}

                  {/* Node circle */}
                  <circle
                    cx={tool.x}
                    cy={tool.y}
                    r={24}
                    className={`gba:fill-background gba:transition-all gba:duration-300 ${shouldHighlight ? 'gba:opacity-100' : 'gba:opacity-40'}`}
                    stroke={isHovered ? colors.glow : 'currentColor'}
                    strokeWidth={isHovered ? 2 : 1}
                  />

                  {/* Icon */}
                  <foreignObject x={tool.x - 12} y={tool.y - 12} width={24} height={24}>
                    <div className="gba:flex gba:items-center gba:justify-center gba:w-full gba:h-full">
                      <Icon
                        className={`gba:w-4 gba:h-4 ${colors.text} gba:transition-all gba:duration-300 ${shouldHighlight ? 'gba:opacity-100' : 'gba:opacity-40'}`}
                      />
                    </div>
                  </foreignObject>

                  {/* Label */}
                  <text
                    x={tool.x}
                    y={tool.y + 40}
                    textAnchor="middle"
                    className={`gba:text-xs gba:fill-current gba:font-medium gba:transition-all gba:duration-300 ${shouldHighlight ? 'gba:text-foreground' : 'gba:text-muted-foreground/50'}`}
                  >
                    {tool.label}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>

        {/* Tool descriptions */}
        <div
          className="gba:grid gba:grid-cols-2 gba:sm:grid-cols-3 gba:lg:grid-cols-6 gba:gap-3 gba:mt-6"
          style={{ animation: 'fadeInUp 0.6s ease-out 0.4s both' }}
        >
          {TOOLS.map(tool => {
            const colors = colorMap[tool.color] || colorMap.primary
            const Icon = tool.icon
            const isHovered = hoveredTool === tool.id

            return (
              <div
                key={tool.id}
                className={`gba:text-center gba:p-2 gba:rounded-lg gba:transition-all gba:duration-300 ${
                  isHovered ? `${colors.bg} gba:scale-105` : ''
                }`}
                onMouseEnter={() => setHoveredTool(tool.id)}
                onMouseLeave={() => setHoveredTool(null)}
              >
                <Icon className={`gba:w-5 gba:h-5 gba:mx-auto gba:mb-1 ${colors.text}`} />
                <div className="gba:text-xs gba:font-medium gba:text-foreground">{tool.label}</div>
                <div className="gba:text-xs gba:text-muted-foreground">{tool.description}</div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
