/**
 * EveryBoxHero - Premium animated hero for EveryBox
 * Uses the same styling as EveryOneHero - video or animated gradient background with white text
 */

import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { SpaceHeroBackground } from '@/business-apps/platform/apps/spaces/components/SpaceHeroBackground'
import translations from '../_i18n'

interface EveryBoxHeroProps {
  'data-testid'?: string
}

// Video background - same logic as SpaceHero and EveryOne
const hostedVideoUrl = typeof import.meta !== 'undefined' && import.meta.env?.VITE_SPACE_HERO_VIDEO_URL
const localVideoUrl = '/space-hero-background.mp4'
const useVideo = hostedVideoUrl || (typeof import.meta !== 'undefined' && import.meta.env?.DEV && localVideoUrl)
const HERO_VIDEO_SRC = hostedVideoUrl || localVideoUrl

/**
 * EveryBoxHero - Hero section with video background for EveryBox
 */
export const EveryBoxHero: React.FC<EveryBoxHeroProps> = ({ 'data-testid': testId = 'everybox-hero' }) => {
  const { t } = useTranslation(translations)

  return (
    <div data-testid={testId} className="gba:w-full gba:h-[180px] gba:shrink-0">
      <div className="gba:relative gba:overflow-hidden gba:h-full">
        {/* Video background when available, otherwise canvas animation - same as SpaceHero */}
        {useVideo ? (
          <video
            src={HERO_VIDEO_SRC}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            className="gba:absolute gba:inset-0 gba:w-full gba:h-full gba:object-cover gba:pointer-events-none"
            aria-hidden
            data-testid={`${testId}-video`}
          />
        ) : (
          <SpaceHeroBackground />
        )}

        {/* Dark overlay for text readability - same as SpaceHero */}
        {/* eslint-disable newwork-local/no-hardcoded-colors */}
        <div
          className="gba:absolute gba:inset-0 gba:pointer-events-none"
          style={{
            background: `linear-gradient(105deg, rgba(15, 23, 42, 0.38) 0%, rgba(15, 23, 42, 0.12) 40%, transparent 60%)`
          }}
          aria-hidden
        />
        {/* eslint-enable newwork-local/no-hardcoded-colors */}

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
