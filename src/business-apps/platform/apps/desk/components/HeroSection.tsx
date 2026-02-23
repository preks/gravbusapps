/**
 * HeroSection - Hero for Every Office (Desk)
 * Same background as Space detail: video or canvas wave, Funnel Display title.
 */

import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { Layers } from 'lucide-react'
import { SpaceHeroBackground } from '@/business-apps/platform/apps/spaces/components/SpaceHeroBackground'
import deskTranslations from '../_i18n'

const deskHostedVideoUrl = typeof import.meta !== 'undefined' && import.meta.env?.VITE_SPACE_HERO_VIDEO_URL
const deskLocalVideoUrl = '/space-hero-background.mp4'
const deskUseVideo =
  deskHostedVideoUrl || (typeof import.meta !== 'undefined' && import.meta.env?.DEV && deskLocalVideoUrl)
const deskVideoSrc = deskHostedVideoUrl || deskLocalVideoUrl

interface HeroSectionProps {
  'data-testid'?: string
}

export const HeroSection: React.FC<HeroSectionProps> = ({ 'data-testid': testId = 'desk-hero' }) => {
  const { t } = useTranslation(deskTranslations)
  return (
    <section className="gba:relative gba:overflow-hidden gba:min-h-96" data-testid={testId}>
      {/* Same background as Space detail – video or canvas */}
      {deskUseVideo ? (
        <video
          src={deskVideoSrc}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          className="gba:absolute gba:inset-0 gba:w-full gba:h-full gba:object-cover gba:pointer-events-none"
          aria-hidden
        />
      ) : (
        <SpaceHeroBackground />
      )}
      {/* Overlay for text readability */}
      {/* eslint-disable newwork-local/no-hardcoded-colors */}
      <div
        className="gba:absolute gba:inset-0 gba:pointer-events-none"
        style={{
          background: `linear-gradient(105deg, rgba(15, 23, 42, 0.38) 0%, rgba(15, 23, 42, 0.12) 40%, transparent 60%)`
        }}
        aria-hidden
      />
      {/* eslint-enable newwork-local/no-hardcoded-colors */}

      {/* Content – white text, Funnel Display title */}
      <div className="gba:relative gba:py-12 gba:px-6 gba:max-w-4xl gba:mx-auto gba:text-center">
        <div className="gba:mb-6" data-testid={`${testId}-logo`}>
          <div className="gba:inline-flex gba:flex-col gba:items-center gba:gap-2">
            <div className="gba:relative">
              <div className="gba:relative gba:w-16 gba:h-16 gba:rounded-2xl gba:bg-white/10 gba:flex gba:items-center gba:justify-center gba:border gba:border-white/20">
                <Layers className="gba:w-8 gba:h-8 gba:text-white" />
              </div>
            </div>
            <span className="gba:text-xs gba:font-medium gba:tracking-[0.4em] gba:text-white/60 gba:uppercase gba:mt-4">
              {t('hero-brand')}
            </span>
            <h1 className="gba:font-funnel-display gba:text-5xl gba:sm:text-6xl gba:lg:text-7xl gba:tracking-tight gba:text-white gba:font-semibold">
              {t('hero-title')}
            </h1>
          </div>
        </div>

        <div className="gba:flex gba:items-center gba:justify-center gba:gap-3 gba:mb-5">
          <span className="gba:inline-flex gba:items-center gba:gap-1.5 gba:px-3 gba:py-1 gba:rounded-full gba:bg-white/10 gba:text-white/90 gba:text-xs gba:font-medium gba:border gba:border-white/20">
            {t('hero-tag-documents')}
          </span>
          <span className="gba:inline-flex gba:items-center gba:gap-1.5 gba:px-3 gba:py-1 gba:rounded-full gba:bg-white/10 gba:text-white/90 gba:text-xs gba:font-medium gba:border gba:border-white/20">
            {t('hero-tag-spreadsheets')}
          </span>
          <span className="gba:inline-flex gba:items-center gba:gap-1.5 gba:px-3 gba:py-1 gba:rounded-full gba:bg-white/10 gba:text-white/90 gba:text-xs gba:font-medium gba:border gba:border-white/20">
            {t('hero-tag-notes')}
          </span>
        </div>

        <h2
          className="gba:text-2xl gba:sm:text-3xl gba:font-semibold gba:tracking-tight gba:text-white gba:mb-3"
          data-testid={`${testId}-headline`}
        >
          {t('hero-headline')}
        </h2>

        <p
          className="gba:text-base gba:text-white/70 gba:max-w-xl gba:mx-auto gba:leading-relaxed"
          data-testid={`${testId}-subtitle`}
        >
          {t('hero-subtitle')}
        </p>
      </div>
    </section>
  )
}

export default HeroSection
