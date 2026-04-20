import React, { useCallback, useMemo } from 'react'
import { Button, useTranslation } from '@newwork/nw-design-system'
import {
  FileText,
  Table,
  NotePencil,
  Presentation,
  HardDrives,
  PencilLine,
  Sparkle,
  ArrowRight
} from '@phosphor-icons/react'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { useFeature } from '@/common/hooks/useFeature'
import { Feature } from '@/common/types/constants/FeatureHub'
import { FeatureCard } from './FeatureCard'
import translations from '../_i18n'

interface EveryOfficeSectionProps {
  'data-testid'?: string
}

const OFFICE_FEATURES = [
  {
    id: 'documents',
    titleKey: 'office-documents-title',
    descKey: 'office-documents-description',
    icon: FileText,
    path: '/platform/every-office/documents'
  },
  {
    id: 'spreadsheets',
    titleKey: 'office-spreadsheets-title',
    descKey: 'office-spreadsheets-description',
    icon: Table,
    path: '/platform/every-office/spreadsheets'
  },
  {
    id: 'notes',
    titleKey: 'office-notes-title',
    descKey: 'office-notes-description',
    icon: NotePencil,
    path: '/platform/every-office/notes'
  },
  {
    id: 'slides',
    titleKey: 'office-slides-title',
    descKey: 'office-slides-description',
    icon: Presentation,
    path: '/platform/every-office/slides'
  },
  {
    id: 'drive',
    titleKey: 'office-drive-title',
    descKey: 'office-drive-description',
    icon: HardDrives,
    path: '/platform/every-office/drive'
  },
  {
    id: 'whiteboards',
    titleKey: 'office-whiteboards-title',
    descKey: 'office-whiteboards-description',
    icon: PencilLine,
    path: '/platform/every-office/whiteboards'
  },
  {
    id: 'nexus',
    titleKey: 'office-nexus-title',
    descKey: 'office-nexus-description',
    icon: Sparkle,
    path: '/platform/every-office/nexus',
    badgeKey: 'office-nexus-badge'
  }
] as const

export const EveryOfficeSection: React.FC<EveryOfficeSectionProps> = ({
  'data-testid': testId = 'customer-home-office'
}) => {
  const { t } = useTranslation(translations)
  const previewFeature = useFeature<boolean>(Feature.Preview.Enabled.Key)
  const previewEnabled = previewFeature === true

  const visibleOfficeFeatures = useMemo(
    () => OFFICE_FEATURES.filter(feature => previewEnabled || (feature.id !== 'whiteboards' && feature.id !== 'nexus')),
    [previewEnabled]
  )

  const handleFeatureClick = useCallback((path: string) => {
    navigateTo(buildPlatformUrl(path, { from: 'customer-home' }))
  }, [])

  const handleOpenOffice = useCallback(() => {
    navigateTo(buildPlatformUrl('/platform/every-office', { from: 'customer-home' }))
  }, [])

  return (
    <section
      className="gba:py-10 gba:px-6 gba:relative"
      data-testid={testId}
      style={{ animation: 'fadeInUp 0.6s ease-out 0.3s both' }}
    >
      <div className="gba:absolute gba:inset-0 gba:bg-background" />

      <div className="gba:relative gba:max-w-6xl gba:mx-auto">
        <div className="gba:mb-8">
          <h2 className="gba:font-funnel-display gba:text-3xl gba:sm:text-4xl gba:font-semibold gba:tracking-tight gba:text-foreground gba:mb-2">
            {t('office-title')}
          </h2>
          <p className="gba:text-muted-foreground gba:max-w-xl">{t('office-subtitle')}</p>
        </div>

        <div className="gba:grid gba:grid-cols-1 gba:sm:grid-cols-2 gba:lg:grid-cols-3 gba:xl:grid-cols-4 gba:gap-4 gba:mb-6">
          {visibleOfficeFeatures.map((feature, index) => (
            <FeatureCard
              key={feature.id}
              title={t(feature.titleKey)}
              description={t(feature.descKey)}
              icon={feature.icon}
              badge={feature.badgeKey ? t(feature.badgeKey) : undefined}
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
            onClick={handleOpenOffice}
            className="gba:gap-2"
            data-testid={`${testId}-cta`}
          >
            {t('office-cta')}
            <ArrowRight className="gba:w-4 gba:h-4" weight="bold" />
          </Button>
        </div>
      </div>
    </section>
  )
}

export default EveryOfficeSection
