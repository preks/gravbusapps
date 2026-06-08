import React, { useCallback, useMemo } from 'react'
import { Button, useTranslation } from '@newwork/nw-design-system'
import { ChatCircle, CalendarBlank, Bell, EnvelopeIcon, ArrowRight } from '@phosphor-icons/react'
import { useFeature } from '@/common/hooks/useFeature'
import { Feature } from '@/common/types/constants/FeatureHub'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { FeatureCard } from './FeatureCard'
import translations from '../_i18n'

interface EveryOneSectionProps {
  'data-testid'?: string
}

const ONE_FEATURES = [
  {
    id: 'chat',
    titleKey: 'one-chat-title',
    descKey: 'one-chat-description',
    icon: ChatCircle,
    path: '/platform/chat'
  },
  {
    id: 'calendar',
    titleKey: 'one-calendar-title',
    descKey: 'one-calendar-description',
    icon: CalendarBlank,
    path: '/platform/chat?view=calendar'
  },
  {
    id: 'reminders',
    titleKey: 'one-reminders-title',
    descKey: 'one-reminders-description',
    icon: Bell,
    path: '/platform/chat?view=reminders'
  },
  {
    id: 'mail',
    titleKey: 'one-mail-title',
    descKey: 'one-mail-description',
    icon: EnvelopeIcon,
    path: '/platform/chat?view=mail'
  }
] as const

export const EveryOneSection: React.FC<EveryOneSectionProps> = ({ 'data-testid': testId = 'customer-home-one' }) => {
  const { t } = useTranslation(translations)
  const previewFeature = useFeature<boolean>(Feature.Preview.Enabled.Key)
  const visibleFeatures = useMemo(
    () => ONE_FEATURES.filter(feature => feature.id !== 'mail' || previewFeature === true),
    [previewFeature]
  )

  const handleFeatureClick = useCallback((path: string) => {
    navigateTo(path)
  }, [])

  const handleOpenOne = useCallback(() => {
    navigateTo(buildPlatformUrl('/platform/chat', { from: 'customer-home' }))
  }, [])

  return (
    <section
      className="gba:py-10 gba:px-6 gba:relative"
      data-testid={testId}
      style={{ animation: 'fadeInUp 0.6s ease-out 0.5s both' }}
    >
      <div className="gba:absolute gba:inset-0 gba:bg-muted/30" />

      <div className="gba:relative gba:max-w-6xl gba:mx-auto">
        <div className="gba:mb-8">
          <h2 className="gba:font-funnel-display gba:text-3xl gba:sm:text-4xl gba:font-semibold gba:tracking-tight gba:text-foreground gba:mb-2">
            {t('one-title')}
          </h2>
          <p className="gba:text-muted-foreground gba:max-w-xl">{t('one-subtitle')}</p>
        </div>

        <div className="gba:grid gba:grid-cols-1 gba:sm:grid-cols-2 gba:lg:grid-cols-3 gba:gap-4 gba:mb-6">
          {visibleFeatures.map((feature, index) => (
            <FeatureCard
              key={feature.id}
              title={t(feature.titleKey)}
              description={t(feature.descKey)}
              icon={feature.icon}
              onClick={() => handleFeatureClick(feature.path)}
              animationDelay={0.1 * (index + 1)}
              data-testid={`${testId}-${feature.id}`}
            />
          ))}
        </div>

        <div className="gba:flex gba:justify-center">
          <Button
            variant="outline"
            size="lg"
            onClick={handleOpenOne}
            className="gba:gap-2"
            data-testid={`${testId}-cta`}
          >
            {t('one-cta')}
            <ArrowRight className="gba:w-4 gba:h-4" weight="bold" />
          </Button>
        </div>
      </div>
    </section>
  )
}

export default EveryOneSection
