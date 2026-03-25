/**
 * DriveHero – Compact hero banner that replaces the left sidebar.
 * Shows the Every Office parent link, Drive title, "New" button,
 * and section tabs styled as glass-morphism pills.
 */

import React, { useCallback } from 'react'
import { Button } from '@newwork/nw-design-system'
import { HardDrive, Plus, ChevronRight, Layers } from 'lucide-react'
import { PremiumHeroBackground } from '@/common/components/premium-hero-background/PremiumHeroBackground'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import type { DriveSection } from '../types/drive.types'

interface SectionTab {
  id: DriveSection
  labelKey: string
}

const SECTION_TABS: SectionTab[] = [
  { id: 'my-drive', labelKey: 'hero-tab-my-drive' },
  { id: 'shared', labelKey: 'hero-tab-shared' },
  { id: 'recent', labelKey: 'hero-tab-recent' },
  { id: 'favorites', labelKey: 'hero-tab-favorites' },
  { id: 'trash', labelKey: 'hero-tab-trash' }
]

export interface DriveHeroProps {
  activeSection: DriveSection
  onSectionChange: (section: DriveSection) => void
  onCreateNew: () => void
  t: (key: string) => string
  'data-testid'?: string
}

export const DriveHero: React.FC<DriveHeroProps> = ({
  activeSection,
  onSectionChange,
  onCreateNew,
  t,
  'data-testid': testId = 'drive-hero'
}) => {
  const goToEveryOffice = useCallback(() => {
    navigateTo(buildPlatformUrl('/platform/every-office', { from: 'drive' }))
  }, [])

  return (
    <header className="gba:relative gba:overflow-hidden gba:flex-shrink-0" data-testid={testId}>
      <PremiumHeroBackground />
      <div className="gba:absolute gba:inset-0 gba:pointer-events-none gba:space-hero-overlay" aria-hidden />

      <div className="gba:relative gba:max-w-6xl gba:mx-auto gba:px-6 gba:pt-5 gba:pb-4">
        {/* Parent breadcrumb */}
        <nav
          className="gba:flex gba:items-center gba:gap-1.5 gba:text-sm gba:mb-4"
          aria-label="Breadcrumb"
          data-testid={`${testId}-breadcrumb`}
        >
          <button
            type="button"
            onClick={goToEveryOffice}
            className="gba:flex gba:items-center gba:gap-1.5 gba:text-white/60 hover:gba:text-white gba:transition-colors gba:bg-transparent gba:border-0 gba:cursor-pointer gba:p-0"
            data-testid={`${testId}-parent-link`}
          >
            <Layers className="gba:w-3.5 gba:h-3.5" />
            <span>{t('hero-parent-label')}</span>
          </button>
          <ChevronRight className="gba:w-3.5 gba:h-3.5 gba:text-white/30" aria-hidden />
          <span className="gba:text-white gba:font-medium">{t('hero-drive-title')}</span>
        </nav>

        {/* Title row */}
        <div className="gba:flex gba:items-center gba:justify-between gba:gap-4 gba:mb-5">
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:w-10 gba:h-10 gba:rounded-xl gba:bg-white/10 gba:border gba:border-white/15 gba:flex gba:items-center gba:justify-center">
              <HardDrive className="gba:w-5 gba:h-5 gba:text-white" />
            </div>
            <h1 className="gba:font-funnel-display gba:text-3xl gba:sm:text-4xl gba:font-semibold gba:text-white gba:tracking-tight">
              {t('hero-drive-title')}
            </h1>
          </div>

          <Button
            size="sm"
            onClick={onCreateNew}
            className="gba:gap-1.5 gba:bg-white/15 gba:text-white gba:border gba:border-white/20 hover:gba:bg-white/25 gba:backdrop-blur-sm"
            data-testid={`${testId}-new-btn`}
          >
            <Plus className="gba:w-4 gba:h-4" />
            {t('hero-new-button')}
          </Button>
        </div>

        {/* Section tabs */}
        <nav
          className="gba:flex gba:items-center gba:gap-1"
          role="tablist"
          aria-label={t('hero-tabs-aria-label')}
          data-testid={`${testId}-tabs`}
        >
          {SECTION_TABS.map(tab => {
            const isActive = activeSection === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onSectionChange(tab.id)}
                className={[
                  'gba:px-4 gba:py-2 gba:rounded-lg gba:text-sm gba:font-medium gba:transition-all gba:duration-200 gba:border gba:cursor-pointer',
                  isActive
                    ? 'gba:bg-white/20 gba:text-white gba:border-white/30 gba:backdrop-blur-sm gba:shadow-sm'
                    : 'gba:bg-transparent gba:text-white/55 gba:border-transparent hover:gba:text-white/90 hover:gba:bg-white/10'
                ].join(' ')}
                data-testid={`${testId}-tab-${tab.id}`}
              >
                {t(tab.labelKey)}
              </button>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
