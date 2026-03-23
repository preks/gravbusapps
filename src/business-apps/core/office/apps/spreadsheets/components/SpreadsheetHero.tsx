/**
 * SpreadsheetHero – Compact hero banner replacing the left sidebar.
 * Shows the Every Office parent link, Spreadsheets title, a slot for the "New" button,
 * and section tabs styled as glass-morphism pills.
 */

import React, { useCallback } from 'react'
import { FileSpreadsheet, ChevronRight, Layers } from 'lucide-react'
import { PremiumHeroBackground } from '@/common/components/premium-hero-background/PremiumHeroBackground'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'

export type SpreadsheetSection =
  | 'home'
  | 'my-files'
  | 'shared'
  | 'favorites'
  | 'recent'
  | 'automations'
  | 'tasks'
  | 'trash'

interface SectionTab {
  id: SpreadsheetSection
  labelKey: string
}

const SECTION_TABS: SectionTab[] = [
  { id: 'my-files', labelKey: 'sh-tab-my-files' },
  { id: 'shared', labelKey: 'sh-tab-shared' },
  { id: 'tasks', labelKey: 'sh-tab-tasks' },
  { id: 'recent', labelKey: 'sh-tab-recent' },
  { id: 'automations', labelKey: 'sh-tab-automations' },
  { id: 'favorites', labelKey: 'sh-tab-favorites' }
]

export interface SpreadsheetHeroProps {
  activeSection: SpreadsheetSection
  onSectionChange: (section: SpreadsheetSection) => void
  tabBadges?: Partial<Record<SpreadsheetSection, { count: number; highlight?: boolean }>>
  newButton?: React.ReactNode
  t: (key: string) => string
  'data-testid'?: string
}

export const SpreadsheetHero: React.FC<SpreadsheetHeroProps> = ({
  activeSection,
  onSectionChange,
  tabBadges,
  newButton,
  t,
  'data-testid': testId = 'spreadsheet-hero'
}) => {
  const goToEveryOffice = useCallback(() => {
    navigateTo(buildPlatformUrl('/platform/every-office', { from: 'spreadsheets' }))
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
            <span>{t('sh-parent-label')}</span>
          </button>
          <ChevronRight className="gba:w-3.5 gba:h-3.5 gba:text-white/30" aria-hidden />
          <span className="gba:text-white gba:font-medium">{t('sh-title')}</span>
        </nav>

        {/* Title row */}
        <div className="gba:flex gba:items-center gba:justify-between gba:gap-4 gba:mb-5">
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:w-10 gba:h-10 gba:rounded-xl gba:bg-white/10 gba:border gba:border-white/15 gba:flex gba:items-center gba:justify-center">
              <FileSpreadsheet className="gba:w-5 gba:h-5 gba:text-white" />
            </div>
            <h1 className="gba:font-funnel-display gba:text-3xl gba:sm:text-4xl gba:font-semibold gba:text-white gba:tracking-tight">
              {t('sh-title')}
            </h1>
          </div>

          {newButton}
        </div>

        {/* Section tabs */}
        <nav
          className="gba:flex gba:items-center gba:gap-1 gba:flex-wrap"
          role="tablist"
          aria-label={t('sh-tabs-aria-label')}
          data-testid={`${testId}-tabs`}
        >
          {SECTION_TABS.map(tab => {
            const isActive = activeSection === tab.id
            const badge = tabBadges?.[tab.id]
            const hasBadge = typeof badge?.count === 'number' && badge.count > 0
            const shouldHighlight = Boolean(badge?.highlight && hasBadge)
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
                    : shouldHighlight
                      ? 'gba:bg-white/10 gba:text-white gba:border-white/20 hover:gba:bg-white/20'
                      : 'gba:bg-transparent gba:text-white/55 gba:border-transparent hover:gba:text-white/90 hover:gba:bg-white/10'
                ].join(' ')}
                data-testid={`${testId}-tab-${tab.id}`}
              >
                <span className="gba:flex gba:items-center gba:gap-2">
                  <span>{t(tab.labelKey)}</span>
                  {hasBadge && (
                    <span
                      className={[
                        'gba:inline-flex gba:min-w-5 gba:h-5 gba:px-1.5 gba:items-center gba:justify-center gba:rounded-full gba:text-[11px] gba:font-semibold',
                        shouldHighlight
                          ? 'gba:bg-warning gba:text-warning-foreground'
                          : 'gba:bg-white/20 gba:text-white'
                      ].join(' ')}
                      data-testid={`${testId}-tab-${tab.id}-badge`}
                    >
                      {badge?.count}
                    </span>
                  )}
                </span>
              </button>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
