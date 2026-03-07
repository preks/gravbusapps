import React from 'react'
import { PremiumHeroBackground } from '@/common/components/premium-hero-background'

export interface PremiumHeroShellProps {
  /** Hero height in CSS (e.g. "520px", "420px", "auto") */
  height?: string
  /** Enable smooth height transition between values */
  animated?: boolean
  /** Content to render inside the hero */
  children: React.ReactNode
  /** Optional class for the outer wrapper */
  className?: string
  'data-testid'?: string
}

/**
 * Shared hero shell: gradient background + overlay + content slot.
 * Uses PremiumHeroBackground and design tokens only.
 *
 * When `animated` is true the outer container transitions its height
 * so callers can swap between expanded / compact modes smoothly.
 */
export const PremiumHeroShell: React.FC<PremiumHeroShellProps> = ({
  height = '520px',
  animated = false,
  children,
  className = '',
  'data-testid': testId = 'premium-hero-shell'
}) => {
  return (
    <div
      className={`gba:relative gba:overflow-hidden gba:w-full gba:shrink-0 gba:rounded-b-[32px] ${className}`}
      style={animated ? { height, transition: 'height 450ms cubic-bezier(0.4,0,0.2,1)' } : { minHeight: height }}
      data-testid={testId}
    >
      <PremiumHeroBackground data-testid={`${testId}-background`} />
      <div className="gba:absolute gba:inset-0 gba:pointer-events-none gba:space-hero-overlay" aria-hidden />
      <div className="gba:relative gba:z-10 gba:h-full">{children}</div>
    </div>
  )
}

export default PremiumHeroShell
