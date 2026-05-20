import React, { useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { PremiumHeroBackground } from '@/common/components/premium-hero-background/PremiumHeroBackground'
import translations from '../_i18n'

interface HeroSectionProps {
  firstName?: string
  'data-testid'?: string
}

function getGreetingKey(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'hero-greeting-morning'
  if (hour < 18) return 'hero-greeting-afternoon'
  return 'hero-greeting-evening'
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  firstName,
  'data-testid': testId = 'customer-home-hero'
}) => {
  const { t } = useTranslation(translations)
  const greetingKey = useMemo(getGreetingKey, [])

  const greeting = firstName ? `${t(greetingKey)}, ${firstName}` : t(greetingKey)

  return (
    <section className="gba:relative gba:overflow-hidden" data-testid={testId}>
      <PremiumHeroBackground />
      <div className="gba:absolute gba:inset-0 gba:pointer-events-none gba:space-hero-overlay" aria-hidden />

      <div className="gba:relative gba:py-16 gba:px-6 gba:max-w-4xl gba:mx-auto gba:text-center">
        <div className="gba:mb-6" data-testid={`${testId}-logo`}>
          <div className="gba:inline-flex gba:flex-col gba:items-center gba:gap-3">
            <span className="gba:text-xs gba:font-medium gba:tracking-[0.4em] gba:text-white/60 gba:uppercase">
              {t('hero-brand')}
            </span>
            <p className="gba:text-lg gba:text-white/80 gba:font-medium" data-testid={`${testId}-greeting`}>
              {greeting}
            </p>
          </div>
        </div>

        <h1
          className="gba:font-funnel-display gba:text-4xl gba:sm:text-5xl gba:lg:text-6xl gba:tracking-tight gba:text-white gba:font-semibold gba:mb-4"
          data-testid={`${testId}-headline`}
        >
          {t('hero-headline')}
        </h1>

        <p
          className="gba:text-base gba:sm:text-lg gba:text-white/70 gba:max-w-2xl gba:mx-auto gba:leading-relaxed"
          data-testid={`${testId}-subtitle`}
        >
          {t('hero-subtitle')}
        </p>
      </div>
    </section>
  )
}

export default HeroSection
