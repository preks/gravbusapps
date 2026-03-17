/**
 * NoteHero – Compact hero banner replacing the left sidebar.
 * Shows the Every Office parent link, Notes title, a slot for the "New" button,
 * and section tabs styled as glass-morphism pills.
 */

import React, { useCallback } from 'react'
import { StickyNote, ChevronRight, Layers } from 'lucide-react'
import { PremiumHeroBackground } from '@/common/components/premium-hero-background/PremiumHeroBackground'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'

export type NoteSection = 'home' | 'my-notes' | 'shared' | 'pinned' | 'recent' | 'archived'

interface SectionTab {
  id: NoteSection
  labelKey: string
}

const SECTION_TABS: SectionTab[] = [
  { id: 'my-notes', labelKey: 'nh-tab-my-notes' },
  { id: 'shared', labelKey: 'nh-tab-shared' },
  { id: 'pinned', labelKey: 'nh-tab-pinned' },
  { id: 'recent', labelKey: 'nh-tab-recent' },
  { id: 'archived', labelKey: 'nh-tab-archived' }
]

export interface NoteHeroProps {
  activeSection: NoteSection
  onSectionChange: (section: NoteSection) => void
  newButton?: React.ReactNode
  t: (key: string) => string
  'data-testid'?: string
}

export const NoteHero: React.FC<NoteHeroProps> = ({
  activeSection,
  onSectionChange,
  newButton,
  t,
  'data-testid': testId = 'note-hero'
}) => {
  const goToEveryOffice = useCallback(() => {
    navigateTo(buildPlatformUrl('/platform/every-office', { from: 'notes' }))
  }, [])

  return (
    <header className="gba:relative gba:overflow-hidden gba:flex-shrink-0" data-testid={testId}>
      <PremiumHeroBackground />
      <div className="gba:absolute gba:inset-0 gba:pointer-events-none gba:space-hero-overlay" aria-hidden />

      <div className="gba:relative gba:max-w-6xl gba:mx-auto gba:px-6 gba:pt-5 gba:pb-4">
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
            <span>{t('nh-parent-label')}</span>
          </button>
          <ChevronRight className="gba:w-3.5 gba:h-3.5 gba:text-white/30" aria-hidden />
          <span className="gba:text-white gba:font-medium">{t('nh-title')}</span>
        </nav>

        <div className="gba:flex gba:items-center gba:justify-between gba:gap-4 gba:mb-5">
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:w-10 gba:h-10 gba:rounded-xl gba:bg-white/10 gba:border gba:border-white/15 gba:flex gba:items-center gba:justify-center">
              <StickyNote className="gba:w-5 gba:h-5 gba:text-white" />
            </div>
            <h1 className="gba:font-funnel-display gba:text-3xl gba:sm:text-4xl gba:font-semibold gba:text-white gba:tracking-tight">
              {t('nh-title')}
            </h1>
          </div>
          {newButton}
        </div>

        <nav
          className="gba:flex gba:items-center gba:gap-1 gba:flex-wrap"
          role="tablist"
          aria-label={t('nh-tabs-aria-label')}
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
