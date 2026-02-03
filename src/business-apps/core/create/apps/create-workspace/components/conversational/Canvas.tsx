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
      {/* Header - Optional, fixed height to align with ChatPanel, NO BORDER */}
      {(title || subtitle || actions) && (
        <div className="gba:px-8 gba:py-4 gba:bg-background gba:sticky gba:top-0 gba:z-20 gba:h-[73px] gba:flex gba:items-center gba:shrink-0">
          <div className="gba:flex gba:items-center gba:justify-between gba:w-full">
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

      {/* Top Gradient Fade - Sticky overlay below header */}
      {showGradientFade && (title || subtitle || actions) && (
        <div
          className="gba:sticky gba:top-[73px] gba:left-0 gba:right-0 gba:h-32 gba:pointer-events-none gba:z-10 gba:-mt-32"
          style={{
            background:
              'linear-gradient(to bottom, hsl(var(--nw-background) / 1) 0%, hsl(var(--nw-background) / 0.95) 15%, hsl(var(--nw-background) / 0.8) 30%, hsl(var(--nw-background) / 0.5) 50%, hsl(var(--nw-background) / 0.2) 75%, hsl(var(--nw-background) / 0) 100%)'
          }}
        />
      )}

      {/* Content - fully scrollable, no height constraints! */}
      <div className="gba:flex-1 gba:min-h-0 gba:overflow-y-auto gba:px-8 gba:py-6 gba:relative">
        <div className={cn('gba:max-w-5xl gba:mx-auto', floatingAction && 'gba:pb-24')}>{children}</div>

        {/* Bottom Gradient Fade Overlay - prominent, dreamy effect */}
        {showGradientFade && (
          <div
            className="gba:absolute gba:bottom-0 gba:left-0 gba:right-0 gba:h-48 gba:pointer-events-none gba:z-10"
            style={{
              background:
                'linear-gradient(to top, hsl(var(--nw-background) / 1) 0%, hsl(var(--nw-background) / 1) 10%, hsl(var(--nw-background) / 0.98) 20%, hsl(var(--nw-background) / 0.9) 35%, hsl(var(--nw-background) / 0.7) 50%, hsl(var(--nw-background) / 0.4) 70%, hsl(var(--nw-background) / 0) 100%)'
            }}
          />
        )}
      </div>

      {/* Floating Action Button - always visible */}
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
