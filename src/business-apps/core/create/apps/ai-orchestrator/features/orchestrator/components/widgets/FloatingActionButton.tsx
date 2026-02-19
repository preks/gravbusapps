/**
 * FloatingActionButton - A floating action button that stays visible at bottom-right
 * Used for primary actions like "Start Build" that should always be accessible
 */

import React from 'react'
import { cn, Button } from '@newwork/nw-design-system'

export interface FloatingActionButtonProps {
  label: string
  count?: number
  onClick: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary'
  icon?: React.ReactNode
  loading?: boolean
  'data-testid'?: string
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  label,
  count,
  onClick,
  disabled = false,
  variant = 'primary',
  icon,
  loading = false,
  'data-testid': testId = 'floating-action-button'
}) => {
  return (
    <Button
      onClick={onClick}
      disabled={disabled || loading}
      size="lg"
      className={cn(
        'gba:min-w-[200px] gba:h-14 gba:text-base gba:font-semibold gba:px-6 gba:rounded-4xl',
        'gba:shadow-lg hover:gba:shadow-xl gba:transition-all gba:duration-200',
        'hover:gba:scale-105 active:gba:scale-95',
        'gba:animate-in gba:fade-in gba:slide-in-from-bottom-4 gba:duration-300',
        variant === 'primary' && 'gba:bg-foreground gba:text-background hover:gba:bg-foreground/90'
      )}
      data-testid={testId}
    >
      {loading ? (
        <>
          <span className="gba:animate-spin gba:mr-2">⏳</span>
          <span>Building...</span>
        </>
      ) : (
        <>
          {icon && <span className="gba:mr-2">{icon}</span>}
          <span>{label}</span>
          {count !== undefined && (
            <span className="gba:ml-2 gba:px-2 gba:py-0.5 gba:rounded-full gba:bg-background/20 gba:text-xs gba:font-medium">
              {count}
            </span>
          )}
        </>
      )}
    </Button>
  )
}

export default FloatingActionButton
