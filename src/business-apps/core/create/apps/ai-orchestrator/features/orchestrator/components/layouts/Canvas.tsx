/**
 * Canvas - Main work area that displays current view
 * Handles transitions between different states
 */

import React from 'react'
import { cn } from '@newwork/nw-design-system'

const GRADIENT_TOP =
  'linear-gradient(to bottom, black 0%, rgba(0,0,0,0.9) 20%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,0.4) 65%, rgba(0,0,0,0.15) 85%, transparent 100%)'
const GRADIENT_BOTTOM =
  'linear-gradient(to top, black 0%, rgba(0,0,0,0.95) 12%, rgba(0,0,0,0.85) 25%, rgba(0,0,0,0.65) 42%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.15) 82%, transparent 100%)'

const maskStyle = (gradient: string) => ({
  maskImage: gradient,
  WebkitMaskImage: gradient
})

const GradientFadeOverlay: React.FC<{
  gradient: string
  className: string
}> = ({ gradient, className }) => <div className={className} style={maskStyle(gradient)} />

const HEADER_HEIGHT_CLASS = 'gba:h-[73px]'
const hasHeader = (title?: string, subtitle?: string, actions?: React.ReactNode) =>
  Boolean(title || subtitle || actions)

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
  const withHeader = hasHeader(title, subtitle, actions)
  return (
    <div className={cn('gba:flex gba:flex-col gba:h-full gba:relative', className)} data-testid={testId}>
      {withHeader && (
        <div
          className={cn(
            'gba:px-8 gba:py-4 gba:bg-background gba:sticky gba:top-0 gba:z-20',
            HEADER_HEIGHT_CLASS,
            'gba:flex gba:items-center gba:shrink-0'
          )}
        >
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

      <div className="gba:flex-1 gba:min-h-0 gba:overflow-y-auto gba:px-8 gba:py-6 gba:relative">
        <div className={cn('gba:max-w-5xl gba:mx-auto', floatingAction && 'gba:pb-24')}>{children}</div>
      </div>

      {showGradientFade && (
        <>
          <GradientFadeOverlay
            gradient={GRADIENT_TOP}
            className={cn(
              'gba:absolute gba:left-0 gba:right-0 gba:pointer-events-none gba:z-10 gba:h-16 gba:bg-background',
              withHeader ? 'gba:top-[73px]' : 'gba:top-0'
            )}
          />
          <GradientFadeOverlay
            gradient={GRADIENT_BOTTOM}
            className="gba:absolute gba:bottom-0 gba:left-0 gba:right-0 gba:h-32 gba:pointer-events-none gba:z-10 gba:bg-background"
          />
        </>
      )}

      {floatingAction && (
        <div
          className="gba:absolute gba:bottom-20 gba:right-8 gba:z-20"
          style={{ filter: 'drop-shadow(0 4px 16px rgba(0, 0, 0, 0.12))' }}
        >
          {floatingAction}
        </div>
      )}
    </div>
  )
}

export default Canvas
