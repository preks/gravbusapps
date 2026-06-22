import React from 'react'
import { ArrowsInIcon, ArrowsOutIcon } from '@phosphor-icons/react'
import { useAgentMeshI18n } from './useAgentMeshI18n'

// CSS fullscreen (fixed inset-0 z-50) — predictable styling, no permission prompts,
// works in iframes. We avoid the Fullscreen API because the host app already runs
// inside another shell that owns OS chrome.

interface MeshFullscreenToggleProps {
  isFullscreen: boolean
  onToggle: () => void
  variant?: 'header' | 'floating'
}

export const MeshFullscreenToggle: React.FC<MeshFullscreenToggleProps> = ({
  isFullscreen,
  onToggle,
  variant = 'header'
}) => {
  const { t } = useAgentMeshI18n()
  const Icon = isFullscreen ? ArrowsInIcon : ArrowsOutIcon
  const label = isFullscreen ? t('agent-mesh-fullscreen-exit') : t('agent-mesh-fullscreen-enter')

  if (variant === 'floating') {
    // Compact icon-only in the header, but in the floating bar we make the
    // exit affordance explicit (icon + label) so users always know how to
    // leave fullscreen mode.
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-label={label}
        aria-pressed={isFullscreen}
        title={t('agent-mesh-fullscreen-shortcut-esc', { label })}
        className="gba:inline-flex gba:h-9 gba:items-center gba:gap-1.5 gba:rounded-lg gba:border gba:border-border gba:bg-card gba:px-3 gba:text-[12px] gba:font-semibold gba:text-foreground gba:shadow-md gba:hover:bg-muted/60 gba:transition-colors"
        data-testid="mesh-fullscreen-toggle"
      >
        <Icon className="gba:h-4 gba:w-4" weight="bold" />
        <span className="gba:hidden sm:gba:inline">{label}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-pressed={isFullscreen}
      title={t('agent-mesh-fullscreen-shortcut', { label })}
      className="gba:inline-flex gba:h-8 gba:w-8 gba:items-center gba:justify-center gba:rounded-lg gba:border gba:border-border/60 gba:bg-background gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:shadow-sm gba:transition-colors"
      data-testid="mesh-fullscreen-toggle"
    >
      <Icon className="gba:h-4 gba:w-4" weight="bold" />
    </button>
  )
}
