/**
 * EveryBoxHero - Premium animated hero for EveryBox
 * Uses the same styling as EveryOneHero - CSS-only animated background with white text
 */

import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { PremiumHeroBackground } from '@/common/components/premium-hero-background'
import translations from '../_i18n'

interface EveryBoxHeroProps {
  'data-testid'?: string
}
export const EveryBoxHero: React.FC<EveryBoxHeroProps> = ({ 'data-testid': testId = 'everybox-hero' }) => {
  const { t } = useTranslation(translations)

  return (
    <div data-testid={testId} className="gba:w-full gba:h-[180px] gba:shrink-0">
      <div className="gba:relative gba:overflow-hidden gba:h-full">
        <PremiumHeroBackground data-testid={`${testId}-background`} />
        <div className="gba:absolute gba:inset-0 gba:pointer-events-none gba:space-hero-overlay" aria-hidden />

        {/* Content */}
        <div className="gba:relative gba:h-full gba:max-w-7xl gba:mx-auto gba:px-6 gba:py-6 gba:flex gba:flex-col gba:justify-center">
          {/* Brand Badge */}
          <div className="gba:mb-3">
            <span className="gba:text-xs gba:font-medium gba:tracking-[0.3em] gba:text-white/60 gba:uppercase">
              NEWWORK
            </span>
          </div>

          {/* App Name - Funnel Display font like SpaceHero and EveryOne */}
          <h1
            className="gba:font-funnel-display gba:text-3xl gba:sm:text-4xl gba:font-semibold gba:text-white gba:tracking-tight gba:mb-2"
            data-testid={`${testId}-title`}
          >
            Every<span className="gba:font-normal">Box</span>
          </h1>

          {/* Tagline */}
          <p className="gba:text-sm gba:text-white/60 gba:max-w-xl" data-testid={`${testId}-tagline`}>
            {t('every-box-hero-tagline')}
          </p>
        </div>
      </div>
    </div>
  )
}

export default EveryBoxHero
