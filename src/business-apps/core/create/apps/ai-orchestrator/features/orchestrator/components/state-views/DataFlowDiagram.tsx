/**
 * DataFlowDiagram — static App Flow diagram.
 *
 * Fixes in this version:
 *  1. Left-aligned scroll container (no flex centering that clips left side)
 *  2. Cross-layer edges arc through the highway zone between header pills and
 *     nodes — they never pass over any component box
 *  3. Node cards have a solid opaque background so SVG paths don't show through
 *  4. Edge labels appear at a readable size (12px bold, colored pill)
 *  5. Detail panel anchored above the legend bar, not over the nodes
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { X, CheckCircle2, RotateCcw, XCircle, Clock, Box, GitFork } from 'lucide-react'
import { ComponentNodeCard } from './dataFlow/ComponentNode'
import {
  buildDiagram,
  getEdgePath,
  getEdgeMidpoint,
  TYPE_COLORS,
  TYPE_BG_COLORS,
  TYPE_LAYER_LABELS,
  NODE_W,
  PAD_X,
  LAYER_H_GAP
} from './dataFlow/dataFlowUtils'
import { typeIcons, typeLabels } from '../widgets/buildPlanReview/buildPlanReview.utils'
import type { ComponentSpec, ComponentType } from '../../types/components'

const MIN_SCALE = 0.55

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  completed: 'Built',
  reused: 'Reused',
  error: 'Failed',
  pending: 'Pending',
  building: 'Building',
  cancelled: 'Cancelled',
  skipped: 'Skipped',
  analyzing: 'Analyzing',
  discovering: 'Discovering',
  wiring: 'Wiring'
}
const STATUS_ICON: Record<string, React.ElementType> = {
  completed: CheckCircle2,
  reused: RotateCcw,
  error: XCircle
}
const STATUS_COLOR: Record<string, string> = {
  completed: '#10b981',
  reused: '#6366f1',
  error: '#ef4444'
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

function DetailPanel({
  component,
  componentsById,
  onClose,
  legendHeight
}: {
  component: ComponentSpec
  componentsById: Map<string, ComponentSpec>
  onClose: () => void
  legendHeight: number
}) {
  const accent = TYPE_COLORS[component.type]
  const TypeIcon = typeIcons[component.type] ?? Box
  const StatusIcon = STATUS_ICON[component.status] ?? Clock
  const statusColor = STATUS_COLOR[component.status] ?? '#9ca3af'
  const description = component.userFriendlyDescription || component.description

  return (
    <div
      style={{
        position: 'absolute',
        bottom: legendHeight + 10,
        right: 16,
        width: 240,
        zIndex: 40,
        background: 'hsl(var(--background))',
        border: `1.5px solid ${accent}55`,
        borderRadius: 14,
        boxShadow: `0 -4px 24px rgba(0,0,0,0.10), 0 0 0 1px ${accent}1a`,
        overflow: 'hidden',
        animation: 'panelIn 0.16s ease'
      }}
    >
      <div style={{ height: 3, background: accent }} />
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 9 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 9,
                background: TYPE_BG_COLORS[component.type],
                border: `1.5px solid ${accent}44`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <TypeIcon size={15} style={{ color: accent }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: accent,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                {typeLabels[component.type]}
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: 'hsl(var(--foreground))',
                  lineHeight: 1.3,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis'
                }}
              >
                {component.name}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 2,
              color: 'hsl(var(--muted-foreground))',
              display: 'flex',
              alignItems: 'center',
              borderRadius: 4,
              flexShrink: 0
            }}
          >
            <X size={13} />
          </button>
        </div>

        {description && (
          <p style={{ fontSize: 10.5, color: 'hsl(var(--muted-foreground))', lineHeight: 1.5, margin: 0 }}>
            {description}
          </p>
        )}

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            background: `${statusColor}18`,
            border: `1px solid ${statusColor}44`,
            borderRadius: 20,
            padding: '2px 8px',
            width: 'fit-content'
          }}
        >
          <StatusIcon size={10} style={{ color: statusColor }} />
          <span style={{ fontSize: 10, fontWeight: 600, color: statusColor }}>
            {STATUS_LABEL[component.status] ?? component.status}
          </span>
        </div>

        {(component.dependencies?.length ?? 0) > 0 && (
          <div>
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: 'hsl(var(--muted-foreground))',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 5
              }}
            >
              Receives from
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {component.dependencies.slice(0, 5).map(depId => {
                const dep = componentsById.get(depId)
                const c = dep ? TYPE_COLORS[dep.type] : '#9ca3af'
                return (
                  <div
                    key={depId}
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      color: c,
                      background: `${c}14`,
                      border: `1px solid ${c}30`,
                      borderRadius: 6,
                      padding: '2px 8px'
                    }}
                  >
                    {dep?.name ?? depId}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes panelIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }`}</style>
    </div>
  )
}

// ─── Layer header pill ────────────────────────────────────────────────────────

function LayerHeader({ type, x, count }: { type: ComponentType; x: number; count: number }) {
  const color = TYPE_COLORS[type]
  const TypeIcon = typeIcons[type] ?? Box
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: 0,
        width: NODE_W,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        padding: '5px 8px',
        background: TYPE_BG_COLORS[type],
        border: `1px solid ${color}40`,
        borderRadius: 8,
        boxSizing: 'border-box'
      }}
    >
      <TypeIcon size={11} style={{ color }} />
      <span style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {TYPE_LAYER_LABELS[type]}
      </span>
      <span style={{ fontSize: 9, color: `${color}99`, fontWeight: 500 }}>({count})</span>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: 12,
        color: 'hsl(var(--muted-foreground))'
      }}
    >
      <GitFork size={32} style={{ opacity: 0.25 }} />
      <span style={{ fontSize: 13 }}>No components to display.</span>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface DataFlowDiagramProps {
  components: ComponentSpec[]
}

export const DataFlowDiagram: React.FC<DataFlowDiagramProps> = ({ components }) => {
  const [selected, setSelected] = useState<ComponentSpec | null>(null)
  const outerRef = useRef<HTMLDivElement>(null)
  const legendRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [legendHeight, setLegendHeight] = useState(44)

  useEffect(() => {
    const el = outerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => setContainerWidth(entries[0].contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (legendRef.current) setLegendHeight(legendRef.current.offsetHeight)
  })

  const layout = useMemo(() => buildDiagram(components), [components])
  const componentsById = useMemo(() => new Map(components.map(c => [c.id, c])), [components])
  const nodeById = useMemo(() => {
    const m = new Map<string, (typeof layout.nodes)[0]>()
    for (const n of layout.nodes) m.set(n.id, n)
    return m
  }, [layout.nodes])

  const handleNodeClick = useCallback((comp: ComponentSpec) => {
    setSelected(prev => (prev?.id === comp.id ? null : comp))
  }, [])

  if (components.length === 0) return <EmptyState />

  const { nodes, edges, presentLayers, totalWidth, totalHeight } = layout

  // Auto-scale to fit container width (min 55%)
  const available = containerWidth > 0 ? containerWidth - 40 : totalWidth
  const scale = Math.max(MIN_SCALE, Math.min(1, available / totalWidth))
  const scaledW = Math.ceil(totalWidth * scale)
  const scaledH = Math.ceil(totalHeight * scale)

  return (
    <div
      ref={outerRef}
      style={{
        // Absolute inset — fills parent without contributing to parent layout.
        // This prevents the diagram from ever pushing/expanding the parent width.
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* ── Scroll area ── */}
      <div
        style={{ flex: 1, overflow: 'auto' }}
        onClick={e => {
          if (e.target === e.currentTarget) setSelected(null)
        }}
      >
        {/*
          Wrapper is exactly the VISUAL size of the scaled diagram.
          overflow:hidden clips the inner div whose LAYOUT is totalWidth×totalHeight
          (CSS transforms are visual-only; layout dims stay at native size).
          Without this clip, the native-size layout leaks into the scroll area.
        */}
        <div style={{ width: scaledW, height: scaledH, position: 'relative', margin: '20px auto', overflow: 'hidden' }}>
          {/* Inner canvas at native size, CSS-scaled from top-left */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: totalWidth,
              height: totalHeight,
              transform: `scale(${scale})`,
              transformOrigin: 'top left'
            }}
          >
            {/* ── SVG: MUST be first in DOM so it renders beneath HTML nodes ── */}
            <svg
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: totalWidth,
                height: totalHeight,
                overflow: 'visible',
                pointerEvents: 'none',
                zIndex: 0
              }}
              aria-hidden="true"
            >
              <defs>
                {edges.map((edge, i) => (
                  <marker
                    key={`mk-${i}`}
                    id={`mk-${i}`}
                    markerWidth="8"
                    markerHeight="8"
                    refX="6"
                    refY="3.5"
                    orient="auto"
                  >
                    <path d="M 0 0 L 7 3.5 L 0 7 z" fill={edge.color} opacity="0.9" />
                  </marker>
                ))}
              </defs>

              {edges.map((edge, i) => {
                const srcNode = nodeById.get(edge.sourceId)
                const tgtNode = nodeById.get(edge.targetId)
                if (!srcNode || !tgtNode) return null

                const d = getEdgePath(edge, srcNode, tgtNode)
                const mid = getEdgeMidpoint(edge, srcNode, tgtNode)
                const dimmed = selected !== null && selected.id !== edge.sourceId && selected.id !== edge.targetId
                const highlighted =
                  selected !== null && (selected.id === edge.sourceId || selected.id === edge.targetId)

                return (
                  <g key={edge.id} opacity={dimmed ? 0.06 : 1} style={{ transition: 'opacity 0.2s ease' }}>
                    {/* Faint static track */}
                    <path d={d} fill="none" stroke={edge.color} strokeWidth="2.5" opacity="0.14" />
                    {/* Animated flowing dashes */}
                    <path
                      d={d}
                      fill="none"
                      stroke={edge.color}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeDasharray="7 5"
                      opacity="0.72"
                      markerEnd={`url(#mk-${i})`}
                      style={{ animation: 'flowDash 1.6s linear infinite', animationDelay: `${i * -0.3}s` }}
                    />
                    {/* Edge label pill — only when this edge's endpoint is selected */}
                    {highlighted && (
                      <g>
                        {/* Measure approximate text width (8px per char at 12px font) */}
                        <rect
                          x={mid.x - (edge.label.length * 4 + 10)}
                          y={mid.y - 9}
                          width={edge.label.length * 8 + 20}
                          height={20}
                          rx={10}
                          fill={edge.color}
                          opacity="0.15"
                        />
                        <rect
                          x={mid.x - (edge.label.length * 4 + 10)}
                          y={mid.y - 9}
                          width={edge.label.length * 8 + 20}
                          height={20}
                          rx={10}
                          fill="none"
                          stroke={edge.color}
                          strokeWidth="1"
                          opacity="0.4"
                        />
                        <text
                          x={mid.x}
                          y={mid.y + 2}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize="12"
                          fontWeight="700"
                          fontFamily="inherit"
                          fill={edge.color}
                        >
                          {edge.label}
                        </text>
                      </g>
                    )}
                  </g>
                )
              })}
            </svg>

            {/* ── Layer header pills (above SVG, below node cards) ── */}
            {presentLayers.map((type, layerIndex) => {
              const x = PAD_X + layerIndex * (NODE_W + LAYER_H_GAP)
              const count = nodes.filter(n => n.component.type === type).length
              return <LayerHeader key={type} type={type} x={x} count={count} />
            })}

            {/* ── Node cards (z-index:1 — topmost layer) ── */}
            {nodes.map(node => (
              <ComponentNodeCard
                key={node.id}
                node={node}
                selected={selected?.id === node.id}
                onClick={handleNodeClick}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Detail panel: anchored above the legend, never overlapping diagram ── */}
      {selected && (
        <DetailPanel
          component={selected}
          componentsById={componentsById}
          onClose={() => setSelected(null)}
          legendHeight={legendHeight}
        />
      )}

      {/* ── Legend bar ── */}
      <div
        ref={legendRef}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          padding: '8px 16px',
          borderTop: '1px solid hsl(var(--border))',
          background: 'hsl(var(--background))',
          flexShrink: 0,
          flexWrap: 'wrap'
        }}
      >
        {presentLayers.map(type => {
          const color = TYPE_COLORS[type]
          const TypeIcon = typeIcons[type] ?? Box
          return (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div
                style={{
                  width: 17,
                  height: 17,
                  borderRadius: 5,
                  background: TYPE_BG_COLORS[type],
                  border: `1.5px solid ${color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <TypeIcon size={10} style={{ color }} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 500, color: 'hsl(var(--foreground))' }}>{typeLabels[type]}</span>
            </div>
          )
        })}
        {edges.length === 0 && (
          <span style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))' }}>No connections detected</span>
        )}
        {scale < 1 && (
          <span style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))', opacity: 0.6 }}>
            {Math.round(scale * 100)}% zoom to fit
          </span>
        )}
      </div>

      <style>{`@keyframes flowDash { to { stroke-dashoffset: -48; } }`}</style>
    </div>
  )
}
