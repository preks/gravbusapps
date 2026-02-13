/**
 * Reusable call control bar icon button (mute, video, screen share, etc.).
 */

import React from 'react'

export type ControlBarButtonVariant = 'accent' | 'destructive' | 'primary' | 'warning'

export interface ControlBarButtonProps {
  variant: ControlBarButtonVariant
  size?: 'desktop' | 'mobile'
  icon: React.ReactNode
  onClick: () => void
  'aria-label': string
  title?: string
  'data-testid': string
  disabled?: boolean
  className?: string
  children?: React.ReactNode
}

const variantClasses: Record<ControlBarButtonVariant, string> = {
  accent: 'gba:bg-accent gba:text-accent-foreground hover:gba:bg-accent/90',
  destructive: 'gba:bg-destructive gba:text-destructive-foreground hover:gba:bg-destructive/90',
  primary: 'gba:bg-primary gba:text-primary-foreground hover:gba:bg-primary/90',
  warning: 'gba:bg-warning gba:text-warning-foreground hover:gba:bg-warning/90'
}

export const ControlBarButton: React.FC<ControlBarButtonProps> = ({
  variant,
  size = 'desktop',
  icon,
  onClick,
  'aria-label': ariaLabel,
  title,
  'data-testid': dataTestId,
  disabled = false,
  className = '',
  children
}) => {
  const padding = size === 'desktop' ? 'gba:p-3' : 'gba:p-2.5'
  const base = 'gba:rounded-full gba:transition-all disabled:gba:opacity-50 disabled:gba:cursor-not-allowed'
  const layout = children ? 'gba:flex gba:items-center gba:gap-2' : ''

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${padding} ${variantClasses[variant]} ${base} ${layout} ${className}`}
      aria-label={ariaLabel}
      title={title ?? ariaLabel}
      data-testid={dataTestId}
    >
      {icon}
      {children}
    </button>
  )
}
