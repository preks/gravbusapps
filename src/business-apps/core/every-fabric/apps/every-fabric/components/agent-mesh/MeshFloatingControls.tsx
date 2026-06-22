import React from 'react'
import { ArrowLeftIcon } from '@phosphor-icons/react'
import type { MeshNavSnapshot } from '../../utils/meshNavigationStack'
import { MeshBreadcrumbs } from './MeshBreadcrumbs'
import { MeshFullscreenToggle } from './MeshFullscreenToggle'
import { MeshScopeSwitch } from './MeshScopeSwitch'
import type { MeshScope } from './meshScopes'
import { useAgentMeshI18n } from './useAgentMeshI18n'

interface MeshFloatingControlsProps {
  scope: MeshScope
  onScopeChange: (scope: MeshScope) => void
  disabledScopes?: MeshScope[]
  breadcrumbs: MeshNavSnapshot[]
  canGoBack: boolean
  onBack: () => void
  onBreadcrumbSelect: (index: number) => void
  isFullscreen: boolean
  onToggleFullscreen: () => void
  userNameMap?: Map<string, string>
  sessionTitleMap?: Map<string, string>
}

/**
 * Floating glass-style control bar shown above the canvas in fullscreen mode.
 * Hosts: back button (when applicable), breadcrumbs, scope switch, fullscreen toggle.
 */
export const MeshFloatingControls: React.FC<MeshFloatingControlsProps> = ({
  scope,
  onScopeChange,
  disabledScopes,
  breadcrumbs,
  canGoBack,
  onBack,
  onBreadcrumbSelect,
  isFullscreen,
  onToggleFullscreen,
  userNameMap,
  sessionTitleMap
}) => {
  const { t, scopeLabel } = useAgentMeshI18n()
  const hasBreadcrumbs = breadcrumbs.length > 1

  return (
    <div
      className="gba:pointer-events-none gba:absolute gba:inset-x-0 gba:top-0 gba:z-20 gba:p-3"
      data-testid="mesh-floating-controls"
    >
      <div className="gba:pointer-events-auto gba:inline-flex gba:items-center gba:gap-2 gba:rounded-xl gba:border gba:border-border/60 gba:bg-card/95 gba:backdrop-blur gba:px-2 gba:py-1.5 gba:shadow-md">
        {canGoBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label={t('agent-mesh-back-previous-view')}
            title={t('agent-mesh-back-shortcut')}
            className="gba:inline-flex gba:h-8 gba:w-8 gba:items-center gba:justify-center gba:rounded-lg gba:text-foreground gba:hover:bg-muted/60 gba:transition-colors gba:shrink-0"
            data-testid="mesh-floating-back"
          >
            <ArrowLeftIcon className="gba:h-4 gba:w-4" />
          </button>
        )}

        {hasBreadcrumbs ? (
          <MeshBreadcrumbs
            breadcrumbs={breadcrumbs}
            onSelect={onBreadcrumbSelect}
            userNameMap={userNameMap}
            sessionTitleMap={sessionTitleMap}
            variant="floating"
          />
        ) : (
          <span className="gba:text-[12px] gba:font-semibold gba:text-foreground gba:px-1.5">{scopeLabel(scope)}</span>
        )}

        <div className="gba:h-4 gba:w-px gba:bg-border/60 gba:mx-0.5" />

        <div className="gba:hidden md:gba:block">
          <MeshScopeSwitch activeScope={scope} onChange={onScopeChange} disabledScopes={disabledScopes} />
        </div>

        <MeshFullscreenToggle isFullscreen={isFullscreen} onToggle={onToggleFullscreen} variant="floating" />
      </div>
    </div>
  )
}
