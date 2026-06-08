import React from 'react'
import { Megaphone } from 'lucide-react'
import { useTranslation } from '@newwork/nw-design-system'
import { SpaceHeroBackground } from '@/business-apps/platform/apps/spaces/components/SpaceHeroBackground'
import translations from '../../../_i18n'

const heroHostedVideoUrl = import.meta?.env?.VITE_SPACE_HERO_VIDEO_URL
const heroLocalVideoUrl = '/space-hero-background.mp4'
const heroUseVideo = heroHostedVideoUrl || (import.meta?.env?.DEV && heroLocalVideoUrl)
const heroVideoSrc = heroHostedVideoUrl || heroLocalVideoUrl

interface CampaignHeroSectionProps {
  'data-testid'?: string
}

export const CampaignHeroSection: React.FC<CampaignHeroSectionProps> = ({
  'data-testid': testId = 'campaign-hero'
}) => {
  const { t } = useTranslation(translations)
  return (
    <section className="gba:relative gba:overflow-hidden gba:min-h-72" data-testid={testId}>
      {heroUseVideo ? (
        <video
          src={heroVideoSrc}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          className="gba:absolute gba:inset-0 gba:w-full gba:h-full gba:object-cover gba:pointer-events-none"
        />
      ) : (
        <SpaceHeroBackground />
      )}

      <div
        className="gba:absolute gba:inset-0 gba:pointer-events-none"
        style={{
          background: `linear-gradient(105deg, color-mix(in srgb, var(--color-foreground) 38%, transparent) 0%, color-mix(in srgb, var(--color-foreground) 12%, transparent) 40%, transparent 60%)`
        }}
        aria-hidden
      />

      <div className="gba:relative gba:py-10 gba:px-6 gba:max-w-4xl gba:mx-auto gba:text-center">
        <div className="gba:mb-5" data-testid={`${testId}-logo`}>
          <div className="gba:inline-flex gba:flex-col gba:items-center gba:gap-2">
            <div className="gba:relative gba:w-14 gba:h-14 gba:rounded-2xl gba:bg-white/10 gba:flex gba:items-center gba:justify-center gba:border gba:border-white/20">
              <Megaphone className="gba:w-7 gba:h-7 gba:text-white" />
            </div>
            <span className="gba:text-xs gba:font-medium gba:tracking-[0.4em] gba:text-white/60 gba:uppercase gba:mt-3">
              NEWWORK CRM
            </span>
            <h1 className="gba:font-funnel-display gba:text-4xl gba:sm:text-5xl gba:lg:text-6xl gba:tracking-tight gba:text-white gba:font-semibold">
              {t('campaign-hero-title')} <span className="gba:text-white/90">{t('campaign-hero-titleSuffix')}</span>
            </h1>
          </div>
        </div>

        <div className="gba:flex gba:items-center gba:justify-center gba:gap-3 gba:mb-4">
          <span className="gba:inline-flex gba:items-center gba:gap-1.5 gba:px-3 gba:py-1 gba:rounded-full gba:bg-white/10 gba:text-white/90 gba:text-xs gba:font-medium gba:border gba:border-white/20">
            {t('campaign-hero-badgeCampaigns')}
          </span>
          <span className="gba:inline-flex gba:items-center gba:gap-1.5 gba:px-3 gba:py-1 gba:rounded-full gba:bg-white/10 gba:text-white/90 gba:text-xs gba:font-medium gba:border gba:border-white/20">
            {t('campaign-hero-badgeEvents')}
          </span>
          <span className="gba:inline-flex gba:items-center gba:gap-1.5 gba:px-3 gba:py-1 gba:rounded-full gba:bg-white/10 gba:text-white/90 gba:text-xs gba:font-medium gba:border gba:border-white/20">
            {t('campaign-hero-badgeAnalytics')}
          </span>
        </div>

        <p
          className="gba:text-base gba:text-white/70 gba:max-w-xl gba:mx-auto gba:leading-relaxed"
          data-testid={`${testId}-subtitle`}
        >
          {t('campaign-hero-subtitle')}
        </p>
      </div>
    </section>
  )
}

export default CampaignHeroSection
