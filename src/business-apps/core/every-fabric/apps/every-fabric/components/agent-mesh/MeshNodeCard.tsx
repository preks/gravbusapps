// Shared 2D node card visuals used by React Flow (MeshNode) and 3D Html billboards (Mesh3DNode).

import { BrainIcon, CompassIcon, LightbulbIcon, WrenchIcon } from '@phosphor-icons/react'
import { EveryIcon } from '@newwork/icons'
import type { MeshNodeKind, MeshNodeStatus } from '../../utils/traceModel'
import { NODE_SIZE } from './meshLayout'

export const MESH_SKILL_DOT_COLORS = [
  'gba:bg-teal-500',
  'gba:bg-violet-500',
  'gba:bg-amber-500',
  'gba:bg-sky-500',
  'gba:bg-rose-500'
] as const

export const MESH_MAX_VISIBLE_SKILL_DOTS = 5

export type MeshNodeCardSurface = 'flow' | 'canvas3d'

export function meshNodeRingClass(
  status: MeshNodeStatus,
  isSelected: boolean,
  isActive: boolean,
  surface: MeshNodeCardSurface = 'flow'
): string {
  if (isSelected) {
    return surface === 'canvas3d'
      ? 'gba:border-primary gba:ring-4 gba:ring-primary/20'
      : 'gba:border-primary gba:ring-4 gba:ring-primary/15'
  }
  if (status === 'failed') return 'gba:border-destructive/70 gba:ring-2 gba:ring-destructive/15'
  if (isActive) {
    return surface === 'canvas3d'
      ? 'gba:border-primary/80 gba:ring-2 gba:ring-primary/20'
      : 'gba:border-primary/70 gba:ring-2 gba:ring-primary/15'
  }
  if (status === 'running') return 'gba:border-primary/60'
  return surface === 'canvas3d' ? 'gba:border-border/70' : 'gba:border-border'
}

export function meshNodeCardOpacityClass(
  isUpcoming: boolean,
  isDimmed: boolean,
  isHighlighted: boolean,
  isSelected: boolean
): string {
  if (isUpcoming) return 'gba:opacity-30'
  if (isDimmed) return 'gba:opacity-20'
  if (isHighlighted && !isSelected) return 'gba:opacity-100'
  return ''
}

/** Soft elevation/glow on the circle badge (3D Html cards). */
export function meshNodeCircleShadow(
  status: MeshNodeStatus,
  isSelected: boolean,
  isActive: boolean,
  primary: string,
  destructive: string
): string {
  const lift = '0 1px 2px rgba(15,23,42,0.06), 0 10px 28px -16px rgba(15,23,42,0.22)'
  if (isSelected) return `${lift}, 0 0 0 1px ${primary}33, 0 0 24px ${primary}55`
  if (status === 'failed') return `${lift}, 0 0 18px ${destructive}55`
  if (isActive) return `${lift}, 0 0 18px ${primary}66`
  if (status === 'running') return `${lift}, 0 0 14px ${primary}33`
  return lift
}

export function meshNodeTinyInitials(label: string): string {
  if (!label) return '·'
  const cleaned = label.replace(/[_\-:]+/g, ' ').trim()
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return cleaned.slice(0, 2).toUpperCase()
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export function meshNodeHitRadius(kind: MeshNodeKind): number {
  return (NODE_SIZE[kind] ?? 60) * 0.5
}

export function MeshNodeKindIcon({ kind, size }: Readonly<{ kind: MeshNodeKind; size: number }>) {
  const className = 'gba:text-foreground/80'
  const style = { width: size * 0.42, height: size * 0.42 }
  switch (kind) {
    case 'orchestrator':
      return <EveryIcon className="gba:text-foreground/80" style={style} gradient="gba:bg-ai" />
    case 'subagent':
    case 'expert':
      return <BrainIcon className={className} style={style} weight="bold" />
    case 'skill':
      return <LightbulbIcon className={className} style={style} weight="bold" />
    case 'tool':
      return <WrenchIcon className={className} style={style} weight="bold" />
    default:
      return <CompassIcon className={className} style={style} weight="bold" />
  }
}

export interface MeshNodeCardContentProps {
  kind: MeshNodeKind
  label: string
  category?: string
  status: MeshNodeStatus
  size: number
  isSelected: boolean
  isActive: boolean
  skillNames: string[]
  liveCount?: number
  activityHeat?: number
  badgeClassName: string
  badgeStyle?: React.CSSProperties
  ringSurface?: MeshNodeCardSurface
  reducedMotion?: boolean
}

export function MeshNodeCardContent({
  kind,
  label,
  category,
  status,
  size,
  isSelected,
  isActive,
  skillNames,
  liveCount = 0,
  activityHeat = 0,
  badgeClassName,
  badgeStyle,
  ringSurface = 'flow',
  reducedMotion = false
}: Readonly<MeshNodeCardContentProps>) {
  const isTool = kind === 'tool'
  const showInitialsOnly = isTool && size <= 44
  const isAgent = kind === 'orchestrator' || kind === 'subagent' || kind === 'expert'
  const showSkillDots = isAgent && skillNames.length > 0
  const ring = meshNodeRingClass(status, isSelected, isActive, ringSurface)
  const liveBadge = liveCount >= 2 ? `•${liveCount}` : null
  const heatShadow =
    activityHeat > 0
      ? `0 0 ${Math.round(10 + activityHeat * 16)}px rgba(var(--primary),${0.2 + activityHeat * 0.25})`
      : undefined

  return (
    <>
      <span
        className={`${badgeClassName} ${ring}`}
        style={heatShadow ? { ...badgeStyle, boxShadow: heatShadow } : badgeStyle}
      >
        {showInitialsOnly ? (
          <span className="gba:text-[10px] gba:font-semibold gba:tracking-wide gba:text-muted-foreground">
            {meshNodeTinyInitials(label)}
          </span>
        ) : (
          <MeshNodeKindIcon kind={kind} size={size} />
        )}
        {status === 'running' && !reducedMotion && (
          <span
            className="gba:absolute gba:inset-0 gba:rounded-full gba:border-2 gba:border-primary/40 gba:animate-ping"
            aria-hidden
          />
        )}
        {liveBadge && (
          <span
            className="gba:absolute gba:-right-1 gba:-top-1 gba:flex gba:min-w-5 gba:h-5 gba:items-center gba:justify-center gba:rounded-full gba:border gba:border-primary/30 gba:bg-primary gba:px-1 gba:text-[10px] gba:font-bold gba:text-primary-foreground gba:shadow-sm"
            title={`${liveCount} live sessions`}
          >
            {liveBadge}
          </span>
        )}
      </span>
      <span
        className="gba:mt-2 gba:max-w-[140px] gba:truncate gba:text-center gba:text-[12px] gba:font-semibold gba:text-foreground"
        title={label}
      >
        {label}
      </span>
      {category && (
        <span className="gba:mt-0.5 gba:text-[10px] gba:font-medium gba:uppercase gba:tracking-[0.1em] gba:text-muted-foreground">
          {category}
        </span>
      )}
      {showSkillDots && (
        <span
          className="gba:mt-1.5 gba:flex gba:items-center gba:gap-1"
          aria-label={`${skillNames.length} skill${skillNames.length === 1 ? '' : 's'}`}
        >
          {skillNames.slice(0, MESH_MAX_VISIBLE_SKILL_DOTS).map((name, i) => (
            <span
              key={name}
              title={name}
              className={`gba:inline-block gba:h-2 gba:w-2 gba:rounded-full ${MESH_SKILL_DOT_COLORS[i % MESH_SKILL_DOT_COLORS.length]}`}
            />
          ))}
          {skillNames.length > MESH_MAX_VISIBLE_SKILL_DOTS && (
            <span
              className="gba:text-[9px] gba:font-medium gba:text-muted-foreground"
              title={skillNames.slice(MESH_MAX_VISIBLE_SKILL_DOTS).join(', ')}
            >
              +{skillNames.length - MESH_MAX_VISIBLE_SKILL_DOTS}
            </span>
          )}
        </span>
      )}
    </>
  )
}
