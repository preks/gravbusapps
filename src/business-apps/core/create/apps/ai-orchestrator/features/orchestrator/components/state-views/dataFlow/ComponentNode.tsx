/**
 * Static node card for the App Flow diagram — pure HTML, no React Flow.
 * NODE_H is generous enough for header + 2-line name + 3-line description.
 */

import React, { memo } from 'react'
import { CheckCircle2, RotateCcw, XCircle, Clock, Box } from 'lucide-react'
import { typeIcons, typeLabels } from '../../widgets/buildPlanReview/buildPlanReview.utils'
import { TYPE_COLORS, TYPE_BG_COLORS, NODE_W, NODE_H } from './dataFlowUtils'
import type { ComponentSpec } from '../../../types/components'

interface ComponentNodeProps {
  node: { component: ComponentSpec; x: number; y: number }
  selected: boolean
  onClick: (comp: ComponentSpec) => void
}

const STATUS_ICONS: Record<string, React.ElementType> = {
  completed: CheckCircle2,
  reused: RotateCcw,
  error: XCircle,
  pending: Clock,
  building: Clock,
  cancelled: Clock,
  skipped: Clock,
  analyzing: Clock,
  discovering: Clock,
  wiring: Clock
}
const STATUS_COLORS: Record<string, string> = {
  completed: '#10b981',
  reused: '#6366f1',
  error: '#ef4444',
  pending: '#9ca3af',
  building: '#f59e0b',
  cancelled: '#9ca3af',
  skipped: '#9ca3af',
  analyzing: '#f59e0b',
  discovering: '#f59e0b',
  wiring: '#f59e0b'
}

export const ComponentNodeCard: React.FC<ComponentNodeProps> = memo(({ node, selected, onClick }) => {
  const { component, x, y } = node
  const TypeIcon = typeIcons[component.type] ?? Box
  const StatusIcon = STATUS_ICONS[component.status] ?? Clock
  const accent = TYPE_COLORS[component.type]
  const bg = TYPE_BG_COLORS[component.type]
  const statusColor = STATUS_COLORS[component.status] ?? '#9ca3af'
  const description = component.userFriendlyDescription || component.description

  const borderColor = selected ? accent : `${accent}45`

  return (
    <button
      type="button"
      onClick={() => onClick(component)}
      className="gba:focus-visible:outline-2 gba:focus-visible:outline-accent gba:focus-visible:outline-offset-2"
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: NODE_W,
        height: NODE_H,
        // Solid opaque background — critical so SVG paths beneath don't show through
        backgroundColor: 'hsl(var(--background))',
        backgroundImage: `linear-gradient(135deg, ${accent}0a 0%, transparent 60%)`,
        border: `1.5px solid ${borderColor}`,
        borderRadius: 12,
        padding: '0 12px 10px',
        boxShadow: selected ? `0 0 0 3px ${accent}28, 0 4px 20px ${accent}22` : '0 1px 4px rgba(0,0,0,0.07)',
        cursor: 'pointer',
        transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
        overflow: 'hidden',
        zIndex: 1,
        boxSizing: 'border-box',
        textAlign: 'left',
        fontFamily: 'inherit',
        fontSize: 'inherit',
        outline: 'none'
      }}
    >
      {/* Top accent bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: accent,
          borderRadius: '10px 10px 0 0'
        }}
      />

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 14 }}>
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            background: bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <TypeIcon size={12} style={{ color: accent }} />
        </div>
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: accent,
            textTransform: 'uppercase',
            letterSpacing: '0.055em',
            flex: 1,
            lineHeight: 1
          }}
        >
          {typeLabels[component.type]}
        </span>
        <StatusIcon size={11} style={{ color: statusColor, flexShrink: 0 }} />
      </div>

      {/* Component name */}
      <div
        style={{
          fontSize: 12.5,
          fontWeight: 700,
          color: 'hsl(var(--foreground))',
          lineHeight: 1.3,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical'
        }}
      >
        {component.name}
      </div>

      {/* Description — 3 lines max, flex-1 so it fills remaining space */}
      {description && (
        <div
          style={{
            fontSize: 10,
            color: 'hsl(var(--muted-foreground))',
            lineHeight: 1.45,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            flex: 1
          }}
        >
          {description}
        </div>
      )}
    </button>
  )
})

ComponentNodeCard.displayName = 'ComponentNodeCard'
