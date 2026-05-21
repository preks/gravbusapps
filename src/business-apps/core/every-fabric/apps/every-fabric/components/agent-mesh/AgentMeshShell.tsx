import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeftIcon, ArrowSquareOutIcon } from '@phosphor-icons/react'
import { Button } from '@newwork/nw-design-system'
import type { MeshNavSnapshot } from '../../utils/meshNavigationStack'
import { MeshBreadcrumbs } from './MeshBreadcrumbs'
import { MeshFloatingControls } from './MeshFloatingControls'
import { MeshFullscreenToggle } from './MeshFullscreenToggle'
import { MeshStatusPill } from './MeshStatusPill'
import { MeshScopeSwitch } from './MeshScopeSwitch'
import type { MeshScope } from './meshScopes'

interface AgentMeshShellProps {
  scope: MeshScope
  onScopeChange: (scope: MeshScope, userId?: string) => void
  disabledScopes?: MeshScope[]
  title: string
  subtitle: string
  agentCount: number
  toolCount: number
  showStatus: boolean
  onBack: () => void
  onOpenTraceExplorer?: (positionMs: number) => void
  traceExplorerPositionMs?: number
  isFullscreen: boolean
  onToggleFullscreen: () => void
  breadcrumbs: MeshNavSnapshot[]
  canGoBack: boolean
  onMeshBack: () => void
  onBreadcrumbSelect: (index: number) => void
  userNameMap?: Map<string, string>
  sessionTitleMap?: Map<string, string>
  children: React.ReactNode
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

export const AgentMeshShell: React.FC<AgentMeshShellProps> = ({
  scope,
  onScopeChange,
  disabledScopes = [],
  title,
  subtitle,
  agentCount,
  toolCount,
  showStatus,
  onBack,
  onOpenTraceExplorer,
  traceExplorerPositionMs = 0,
  isFullscreen,
  onToggleFullscreen,
  breadcrumbs,
  canGoBack,
  onMeshBack,
  onBreadcrumbSelect,
  userNameMap,
  sessionTitleMap,
  children
}) => {
  const previousScopeRef = useRef<MeshScope>(scope)
  const liveRegionRef = useRef<HTMLDivElement | null>(null)

  // Announce scope changes for screen readers.
  useEffect(() => {
    if (previousScopeRef.current === scope) return
    previousScopeRef.current = scope
    if (liveRegionRef.current) liveRegionRef.current.textContent = `View changed to ${title}`
  }, [scope, title])

  // Lock body scroll while the fullscreen overlay is mounted so background
  // content can't scroll behind it.
  useEffect(() => {
    if (!isFullscreen || typeof document === 'undefined') return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [isFullscreen])

  // Keyboard shortcuts: F = toggle fullscreen, Esc = exit fullscreen,
  // Backspace / Alt+Left = back. Skipped when focus is inside an editable.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return
      if (event.key === 'Escape' && isFullscreen) {
        event.preventDefault()
        onToggleFullscreen()
        return
      }
      if (event.key === 'f' || event.key === 'F') {
        if (event.metaKey || event.ctrlKey || event.altKey) return
        event.preventDefault()
        onToggleFullscreen()
        return
      }
      if ((event.key === 'Backspace' || (event.altKey && event.key === 'ArrowLeft')) && canGoBack) {
        event.preventDefault()
        onMeshBack()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [canGoBack, isFullscreen, onMeshBack, onToggleFullscreen])

  if (isFullscreen) {
    // Portal to document.body so the fullscreen layer escapes any ancestor
    // stacking context / overflow clipping (the platform nav and workspace
    // chrome also use high z-indices).
    const node = (
      <div
        className="gba:fixed gba:inset-0 gba:z-[9990] gba:flex gba:h-screen gba:w-screen gba:flex-col gba:bg-background gba:print:static gba:print:h-auto"
        data-testid="agent-mesh-screen"
        data-fullscreen="true"
      >
        <div ref={liveRegionRef} aria-live="polite" aria-atomic="true" className="gba:sr-only" />
        <MeshFloatingControls
          scope={scope}
          onScopeChange={onScopeChange}
          disabledScopes={disabledScopes}
          breadcrumbs={breadcrumbs}
          canGoBack={canGoBack}
          onBack={onMeshBack}
          onBreadcrumbSelect={onBreadcrumbSelect}
          isFullscreen={isFullscreen}
          onToggleFullscreen={onToggleFullscreen}
          userNameMap={userNameMap}
          sessionTitleMap={sessionTitleMap}
        />
        <div className="gba:relative gba:flex gba:flex-1 gba:min-h-0 gba:print:overflow-visible">{children}</div>
      </div>
    )
    if (typeof document === 'undefined') return node
    return createPortal(node, document.body)
  }

  return (
    <div
      className="gba:flex gba:h-full gba:w-full gba:flex-col gba:bg-background gba:p-4 sm:gba:p-5 lg:gba:p-6"
      data-testid="agent-mesh-screen"
      data-fullscreen="false"
    >
      <div ref={liveRegionRef} aria-live="polite" aria-atomic="true" className="gba:sr-only" />
      <header className="gba:flex gba:items-start gba:gap-4 gba:mb-4">
        <button
          type="button"
          onClick={canGoBack ? onMeshBack : onBack}
          aria-label={canGoBack ? 'Back to previous mesh view' : 'Back to workspace'}
          title={canGoBack ? 'Back (Backspace)' : 'Back to workspace'}
          className="gba:inline-flex gba:items-center gba:justify-center gba:h-9 gba:w-9 gba:shrink-0 gba:rounded-full gba:border gba:border-border/60 gba:bg-background gba:text-foreground gba:hover:bg-muted/60 gba:transition-colors gba:mt-1"
          data-testid={canGoBack ? 'agent-mesh-mesh-back' : 'agent-mesh-back'}
        >
          <ArrowLeftIcon className="gba:h-4 gba:w-4" />
        </button>
        <div className="gba:min-w-0 gba:flex-1">
          <h1 className="gba:text-[22px] gba:font-semibold gba:leading-tight gba:text-foreground">{title}</h1>
          <p className="gba:mt-0.5 gba:text-[13px] gba:text-muted-foreground">{subtitle}</p>
          {breadcrumbs.length > 1 && (
            <div className="gba:mt-2">
              <MeshBreadcrumbs
                breadcrumbs={breadcrumbs}
                onSelect={onBreadcrumbSelect}
                userNameMap={userNameMap}
                sessionTitleMap={sessionTitleMap}
              />
            </div>
          )}
        </div>
        <div className="gba:flex gba:items-center gba:gap-2 gba:shrink-0">
          {showStatus && <MeshStatusPill agentCount={agentCount} toolCount={toolCount} />}
          {showStatus && onOpenTraceExplorer && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenTraceExplorer(traceExplorerPositionMs)}
              data-testid="mesh-open-trace-explorer"
            >
              <ArrowSquareOutIcon className="gba:h-3.5 gba:w-3.5 gba:mr-1.5" />
              Trace Explorer
            </Button>
          )}
          <MeshFullscreenToggle isFullscreen={isFullscreen} onToggle={onToggleFullscreen} />
        </div>
      </header>

      <div className="gba:mb-4">
        <MeshScopeSwitch activeScope={scope} onChange={onScopeChange} disabledScopes={disabledScopes} />
      </div>

      <div className="gba:flex gba:flex-col gba:flex-1 gba:min-h-0">{children}</div>
    </div>
  )
}
