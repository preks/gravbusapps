import React from 'react'
import { navigateTo } from '@/common/utils/navigationUtils'

export interface BaseEntityLinkChipProps {
  url: string
  children: React.ReactNode // Link text from markdown [text](url)
  icon?: React.ReactNode // Optional icon/image (emoji, SVG, or image)
  variant?: 'default' | 'ai' | 'success' | 'info'
  showBorder?: boolean
  className?: string
  onClick?: (e: React.MouseEvent) => void
  /** When true, same-URL navigations still refresh (e.g. Flow Studio workflow already open). */
  forceReload?: boolean
  /**
   * When true, the chip opens the resolved URL in a new browser tab
   * (`target="_blank"`) instead of doing an in-app SPA navigation. Used by
   * the every-fabric chat surface so workspace document / PDF chips in the
   * agent reply never replace the current chat session.
   */
  newTab?: boolean
}

/**
 * Base component for all entity link chips.
 * Uses the link text from markdown [text](url) and optionally displays an icon/image.
 */
export const BaseEntityLinkChip: React.FC<BaseEntityLinkChipProps> = ({
  url,
  children,
  icon,
  variant = 'default',
  showBorder = false,
  className = '',
  onClick,
  forceReload = false,
  newTab = false
}) => {
  const variantStyles = {
    default: 'gba:bg-muted hover:gba:bg-accent',
    ai: 'gba:bg-ai-secondary hover:gba:bg-ai-secondary/80',
    success: 'gba:bg-success-secondary hover:gba:bg-success-secondary/80',
    info: 'gba:bg-info-secondary hover:gba:bg-info-secondary/80'
  }

  const variantTextColors = {
    default: '',
    ai: 'gba:text-ai',
    success: 'gba:text-success',
    info: 'gba:text-info'
  }

  const borderClass = showBorder
    ? variant === 'ai'
      ? 'gba:border gba:border-ai'
      : variant === 'success'
        ? 'gba:border gba:border-success'
        : variant === 'info'
          ? 'gba:border gba:border-info'
          : ''
    : ''

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick(e)
      return
    }
    // When newTab is set, let the browser handle the click natively via the
    // anchor's target="_blank" — no preventDefault, no SPA navigation. This
    // keeps cmd/ctrl/middle-click behaviour consistent and means the current
    // chat session is never replaced.
    if (newTab) {
      return
    }
    e.preventDefault()
    navigateTo(url, forceReload ? { forceReload: true } : undefined)
  }

  return (
    <a
      href={url}
      target={newTab ? '_blank' : undefined}
      rel={newTab ? 'noopener noreferrer' : undefined}
      className={`gba:inline-flex gba:items-center gba:gap-1 gba:px-2 gba:py-0.5 gba:rounded-full gba:text-sm gba:cursor-pointer gba:transition-colors ${variantStyles[variant]} ${borderClass} ${variantTextColors[variant]} ${className}`}
      onClick={handleClick}
    >
      {icon && <span className="gba:flex gba:items-center">{icon}</span>}
      <span className="gba:leading-none">{children}</span>
    </a>
  )
}
