import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { SpaceHeroBackground } from '@/business-apps/platform/apps/spaces/components/SpaceHeroBackground'
import translations from '../../_i18n'

interface EveryPagesHeroProps {
  activeTab: string
  'data-testid'?: string
}

// Video background - same logic as SpaceHero and EveryOne
const hostedVideoUrl = typeof import.meta !== 'undefined' && import.meta.env?.VITE_SPACE_HERO_VIDEO_URL
const localVideoUrl = '/space-hero-background.mp4'
const useVideo = hostedVideoUrl || (typeof import.meta !== 'undefined' && import.meta.env?.DEV && localVideoUrl)
const HERO_VIDEO_SRC = hostedVideoUrl || localVideoUrl

// Tab -> FTL keys for hero title/subtitle (EveryPages and NEWWORK stay untranslated as marketing/brand names)
const tabContentKeys: Record<string, { titleKey: string; subtitleKey: string }> = {
  home: { titleKey: 'intranet-welcome-title', subtitleKey: 'intranet-welcome-subtitle' },
  news: { titleKey: 'news-welcome-title', subtitleKey: 'news-welcome-subtitle' },
  knowledge: { titleKey: 'knowledge-welcome-title', subtitleKey: 'knowledge-welcome-subtitle' },
  documents: { titleKey: 'document-welcome-title', subtitleKey: 'document-welcome-subtitle' },
  questions: { titleKey: 'question-welcome-title', subtitleKey: 'question-welcome-subtitle' },
  policies: { titleKey: 'policies-welcome-title', subtitleKey: 'policies-welcome-subtitle' },
  engagement: { titleKey: 'engagement-dashboard-title', subtitleKey: 'engagement-dashboard-subtitle' }
}

/**
 * EveryPagesHero - Premium animated hero for EveryPages (Content Portal)
 * Uses the same styling as EveryOneHero - video or animated gradient background with white text
 * Adapts content based on active tab
 */
export const EveryPagesHero: React.FC<EveryPagesHeroProps> = ({
  activeTab,
  'data-testid': testId = 'everypages-hero'
}) => {
  const { t } = useTranslation(translations)
  const keys = tabContentKeys[activeTab] || tabContentKeys.home

  return (
    <div data-testid={testId} className="gba:w-full gba:h-[200px] gba:shrink-0">
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
        <div className="gba:relative gba:h-full gba:max-w-7xl gba:mx-auto gba:px-6 gba:py-8 gba:flex gba:flex-col gba:justify-center">
          {/* Brand Badge */}
          <div className="gba:mb-4">
            <span className="gba:text-xs gba:font-medium gba:tracking-[0.3em] gba:text-white/60 gba:uppercase">
              NEWWORK
            </span>
          </div>

          {/* App Name - Funnel Display font like SpaceHero and EveryOne */}
          <h1
            className="gba:font-funnel-display gba:text-4xl gba:sm:text-5xl gba:font-semibold gba:text-white gba:tracking-tight gba:mb-3"
            data-testid={`${testId}-title`}
          >
            Every<span className="gba:font-normal">Pages</span>
          </h1>

          {/* Dynamic subtitle based on active tab */}
          <p
            className="gba:text-lg gba:text-white/90 gba:max-w-2xl gba:mb-1"
            data-testid={`${testId}-subtitle-primary`}
          >
            {t(keys.titleKey)}
          </p>

          {/* Secondary description */}
          <p
            className="gba:text-sm gba:text-white/60 gba:max-w-xl gba:transition-opacity gba:duration-300"
            data-testid={`${testId}-subtitle-secondary`}
          >
            {t(keys.subtitleKey)}
          </p>
        </div>
      </div>
    </div>
  )
}

export default EveryPagesHero
