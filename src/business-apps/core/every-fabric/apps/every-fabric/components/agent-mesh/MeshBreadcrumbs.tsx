import React, { useCallback } from 'react'
import { CaretRightIcon } from '@phosphor-icons/react'
import type { MeshNavSnapshot } from '../../utils/meshNavigationStack'
import { useAgentMeshI18n } from './useAgentMeshI18n'

interface MeshBreadcrumbsProps {
  breadcrumbs: MeshNavSnapshot[]
  onSelect: (index: number) => void
  /** Resolved display names (userId -> "Maria Popescu") used when snapshot lacks a label. */
  userNameMap?: Map<string, string>
  /** Resolved session titles (sessionId -> "Create video for onboarding") used when snapshot lacks a label. */
  sessionTitleMap?: Map<string, string>
  variant?: 'header' | 'floating'
}

const MAX_VISIBLE = 4

export const MeshBreadcrumbs: React.FC<MeshBreadcrumbsProps> = ({
  breadcrumbs,
  onSelect,
  userNameMap,
  sessionTitleMap
}) => {
  const { t, scopeLabel } = useAgentMeshI18n()

  const labelFor = useCallback(
    (snap: MeshNavSnapshot): string => {
      if (snap.label) return snap.label
      if (snap.scope === 'user' && snap.userId) {
        return (
          userNameMap?.get(snap.userId) ?? t('agent-mesh-breadcrumb-user-fallback', { id: snap.userId.slice(0, 6) })
        )
      }
      if (snap.scope === 'session' && snap.sessionId) {
        return (
          sessionTitleMap?.get(snap.sessionId) ??
          t('agent-mesh-breadcrumb-session-fallback', { id: snap.sessionId.slice(0, 6) })
        )
      }
      return scopeLabel(snap.scope)
    },
    [scopeLabel, sessionTitleMap, t, userNameMap]
  )

  if (breadcrumbs.length <= 1) return null

  // Collapse middle when very deep. Always keep first + last few.
  let visible: { snap: MeshNavSnapshot; index: number; isEllipsis?: boolean }[] = breadcrumbs.map((snap, index) => ({
    snap,
    index
  }))
  if (visible.length > MAX_VISIBLE) {
    const tail = visible.slice(-MAX_VISIBLE + 1)
    visible = [{ snap: breadcrumbs[0], index: 0 }, { snap: breadcrumbs[1], index: 1, isEllipsis: true }, ...tail]
  }

  // In floating variant the parent bar already provides the glass background.
  const containerClass = 'gba:flex gba:items-center gba:gap-0.5'

  const lastIndex = visible.length - 1

  return (
    <nav aria-label={t('agent-mesh-breadcrumb-nav-aria')} className={containerClass} data-testid="mesh-breadcrumbs">
      <ol className="gba:flex gba:items-center gba:gap-0.5 gba:min-w-0">
        {visible.map((entry, i) => {
          const isLast = i === lastIndex
          const isEllipsis = entry.isEllipsis
          const label = isEllipsis ? '…' : labelFor(entry.snap)
          return (
            <li key={`${entry.index}-${entry.snap.scope}`} className="gba:flex gba:items-center gba:min-w-0">
              {i > 0 && (
                <CaretRightIcon
                  className="gba:h-3 gba:w-3 gba:shrink-0 gba:text-muted-foreground/60 gba:mx-0.5"
                  weight="bold"
                  aria-hidden
                />
              )}
              {isLast ? (
                <span
                  aria-current="page"
                  className="gba:max-w-[180px] gba:truncate gba:text-[12px] gba:font-semibold gba:text-foreground gba:px-1.5 gba:py-0.5"
                  title={label}
                >
                  {label}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onSelect(entry.index)}
                  disabled={isEllipsis}
                  className="gba:max-w-[140px] gba:truncate gba:text-[12px] gba:font-medium gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:rounded gba:px-1.5 gba:py-0.5 gba:transition-colors gba:disabled:cursor-default gba:disabled:hover:bg-transparent"
                  title={label}
                  data-testid={`mesh-breadcrumb-${entry.index}`}
                >
                  {label}
                </button>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
