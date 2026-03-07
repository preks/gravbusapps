import React from 'react'
import { PremiumHeroWavingDotsCanvas } from './PremiumHeroWavingDotsCanvas'

export interface PremiumHeroBackgroundProps {
  className?: string
  'data-testid'?: string
}

/**
 * Shared premium animated hero background (CSS gradients + waving dotted flag overlay).
 *
 * Note: relies on global CSS utilities defined in `src/index.css`.
 */
export const PremiumHeroBackground: React.FC<PremiumHeroBackgroundProps> = ({
  className = '',
  'data-testid': testId = 'premium-hero-background'
}) => {
  return (
    <div
      className={`gba:absolute gba:inset-0 gba:pointer-events-none gba:overflow-hidden ${className}`}
      aria-hidden
      data-testid={testId}
    >
      <div className="gba:absolute gba:inset-0 gba:space-hero-bg" aria-hidden />
      <div className="gba:space-hero-glow gba:space-hero-glow-1" aria-hidden />
      <div className="gba:space-hero-glow gba:space-hero-glow-2" aria-hidden />
      <div className="gba:space-hero-glow gba:space-hero-glow-3" aria-hidden />

      <div className="gba:space-hero-dots" aria-hidden>
        <PremiumHeroWavingDotsCanvas
          dotSpacing={24}
          offsetX={12}
          offsetY={12}
          amplitude={15}
          speed={1}
          alpha={0.34}
          edgeVisibility={0.9}
        />
      </div>
    </div>
  )
}

export default PremiumHeroBackground
