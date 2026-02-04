/**
 * Canvas - Main work area that displays current view
 * Handles transitions between different states
 */

import React from 'react'
import { cn } from '@newwork/nw-design-system'

export interface CanvasProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  actions?: React.ReactNode
  floatingAction?: React.ReactNode
  showGradientFade?: boolean
  className?: string
  'data-testid'?: string
}

export const Canvas: React.FC<CanvasProps> = ({
  children,
  title,
  subtitle,
  actions,
  floatingAction,
  showGradientFade = false,
  className,
  'data-testid': testId = 'canvas'
}) => {
  return (
    <div className={cn('gba:flex gba:flex-col gba:h-full gba:relative', className)} data-testid={testId}>
      {/* Header - Optional, fixed height, aligned with content */}
      {(title || subtitle || actions) && (
        <div className="gba:px-8 gba:py-4 gba:bg-background gba:sticky gba:top-0 gba:z-20 gba:h-[73px] gba:flex gba:items-center gba:shrink-0">
          <div className="gba:flex gba:items-center gba:justify-between gba:w-full gba:max-w-5xl gba:mx-auto">
            <div>
              {title && (
                <h2 className="gba:text-lg gba:font-semibold gba:text-foreground gba:leading-tight">{title}</h2>
              )}
              {subtitle && (
                <p className="gba:text-sm gba:text-muted-foreground gba:mt-0.5 gba:leading-tight">{subtitle}</p>
              )}
            </div>
            {actions && <div className="gba:flex gba:items-center gba:gap-2">{actions}</div>}
          </div>
        </div>
      )}

      {/* Content - fully scrollable, no height constraints! */}
      <div className="gba:flex-1 gba:min-h-0 gba:overflow-y-auto gba:px-8 gba:py-6 gba:relative">
        <div className={cn('gba:max-w-5xl gba:mx-auto', floatingAction && 'gba:pb-24')}>{children}</div>
      </div>

      {/* Top Gradient Fade - Fixed overlay at top edge only */}
      {showGradientFade && (
        <div
          className={cn(
            'gba:absolute gba:left-0 gba:right-0 gba:pointer-events-none gba:z-10 gba:h-16 gba:bg-background',
            title || subtitle || actions ? 'gba:top-[73px]' : 'gba:top-0'
          )}
          style={{
            maskImage:
              'linear-gradient(to bottom, black 0%, rgba(0,0,0,0.9) 20%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,0.4) 65%, rgba(0,0,0,0.15) 85%, transparent 100%)',
            WebkitMaskImage:
              'linear-gradient(to bottom, black 0%, rgba(0,0,0,0.9) 20%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,0.4) 65%, rgba(0,0,0,0.15) 85%, transparent 100%)'
          }}
        />
      )}

      {/* Bottom Gradient Fade - Extends to bottom, button sits on top */}
      {showGradientFade && (
        <div
          className="gba:absolute gba:bottom-0 gba:left-0 gba:right-0 gba:h-64 gba:pointer-events-none gba:z-10 gba:bg-background"
          style={{
            maskImage:
              'linear-gradient(to top, black 0%, rgba(0,0,0,0.95) 12%, rgba(0,0,0,0.85) 25%, rgba(0,0,0,0.65) 42%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.15) 82%, transparent 100%)',
            WebkitMaskImage:
              'linear-gradient(to top, black 0%, rgba(0,0,0,0.95) 12%, rgba(0,0,0,0.85) 25%, rgba(0,0,0,0.65) 42%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.15) 82%, transparent 100%)'
          }}
        />
      )}

      {/* Floating Action Button - always visible above gradients */}
      {floatingAction && (
        <div
          className="gba:absolute gba:bottom-20 gba:right-8 gba:z-20"
          style={{
            filter: 'drop-shadow(0 4px 16px rgba(0, 0, 0, 0.12))'
          }}
        >
          {floatingAction}
        </div>
      )}
    </div>
  )
}

export default Canvas
