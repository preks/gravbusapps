/**
 * HeroSection - Hero for Every Office (Desk)
 * Same background as Space detail: video or canvas wave, Funnel Display title.
 * Includes a row of glass-morphism app navigation icons.
 */

import React, { useCallback, type LucideIcon } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { Layers, FileText, FileSpreadsheet, StickyNote, Presentation, HardDrive, Users, Mail } from 'lucide-react'
import { SpaceHeroBackground } from '@/business-apps/platform/apps/spaces/components/SpaceHeroBackground'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import deskTranslations from '../_i18n'

const deskHostedVideoUrl = import.meta.env?.VITE_SPACE_HERO_VIDEO_URL
const deskLocalVideoUrl = '/space-hero-background.mp4'
const deskUseVideo = deskHostedVideoUrl || (import.meta.env?.DEV ? deskLocalVideoUrl : false)
const deskVideoSrc = deskHostedVideoUrl || deskLocalVideoUrl

interface AppNavItem {
  id: string
  labelKey: string
  icon: LucideIcon
  path: string
}

const APP_NAV_ITEMS: AppNavItem[] = [
  { id: 'documents', labelKey: 'hero-nav-documents', icon: FileText, path: '/platform/every-office/documents' },
  {
    id: 'spreadsheets',
    labelKey: 'hero-nav-spreadsheets',
    icon: FileSpreadsheet,
    path: '/platform/every-office/spreadsheets'
  },
  { id: 'notes', labelKey: 'hero-nav-notes', icon: StickyNote, path: '/platform/every-office/notes' },
  { id: 'slides', labelKey: 'hero-nav-slides', icon: Presentation, path: '/platform/every-office/slides' },
  { id: 'drive', labelKey: 'hero-nav-drive', icon: HardDrive, path: '/platform/every-office/drive' },
  { id: 'spaces', labelKey: 'hero-nav-spaces', icon: Users, path: '/platform/every-office/spaces' },
  { id: 'emails', labelKey: 'hero-nav-emails', icon: Mail, path: '/platform/every-office/emails' }
]

interface HeroSectionProps {
  'data-testid'?: string
}

export const HeroSection: React.FC<HeroSectionProps> = ({ 'data-testid': testId = 'desk-hero' }) => {
  const { t } = useTranslation(deskTranslations)

  const handleAppClick = useCallback((path: string) => {
    navigateTo(buildPlatformUrl(path, { from: 'desk' }))
  }, [])

  return (
    <section className="gba:relative gba:overflow-hidden" data-testid={testId}>
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
      {/* eslint-disable newwork-local/no-hardcoded-colors */}
      <div
        className="gba:absolute gba:inset-0 gba:pointer-events-none"
        style={{
          background: `linear-gradient(105deg, rgba(15, 23, 42, 0.38) 0%, rgba(15, 23, 42, 0.12) 40%, transparent 60%)`
        }}
        aria-hidden
      />
      {/* eslint-enable newwork-local/no-hardcoded-colors */}

      <div className="gba:relative gba:py-12 gba:px-6 gba:max-w-4xl gba:mx-auto gba:text-center">
        <div className="gba:mb-6" data-testid={`${testId}-logo`}>
          <div className="gba:inline-flex gba:flex-col gba:items-center gba:gap-2">
            <div className="gba:relative gba:w-16 gba:h-16 gba:rounded-2xl gba:bg-white/10 gba:flex gba:items-center gba:justify-center gba:border gba:border-white/20">
              <Layers className="gba:w-8 gba:h-8 gba:text-white" />
            </div>
            <span className="gba:text-xs gba:font-medium gba:tracking-[0.4em] gba:text-white/60 gba:uppercase gba:mt-4">
              {t('hero-brand')}
            </span>
            <h1 className="gba:font-funnel-display gba:text-5xl gba:sm:text-6xl gba:lg:text-7xl gba:tracking-tight gba:text-white gba:font-semibold">
              {t('hero-title')}
            </h1>
          </div>
        </div>

        <h2
          className="gba:text-2xl gba:sm:text-3xl gba:font-semibold gba:tracking-tight gba:text-white gba:mb-3"
          data-testid={`${testId}-headline`}
        >
          {t('hero-headline')}
        </h2>

        <p
          className="gba:text-base gba:text-white/70 gba:max-w-xl gba:mx-auto gba:leading-relaxed gba:mb-8"
          data-testid={`${testId}-subtitle`}
        >
          {t('hero-subtitle')}
        </p>

        {/* App navigation icons */}
        <nav
          className="gba:flex gba:items-center gba:justify-center gba:gap-3 gba:sm:gap-5"
          aria-label={t('hero-nav-aria-label')}
          data-testid={`${testId}-app-nav`}
        >
          {APP_NAV_ITEMS.map(item => (
            <HeroAppIcon
              key={item.id}
              item={item}
              label={t(item.labelKey)}
              onClick={handleAppClick}
              data-testid={`${testId}-nav-${item.id}`}
            />
          ))}
        </nav>
      </div>
    </section>
  )
}

interface HeroAppIconProps {
  item: AppNavItem
  label: string
  onClick: (path: string) => void
  'data-testid'?: string
}

const HeroAppIcon: React.FC<HeroAppIconProps> = ({ item, label, onClick, 'data-testid': iconTestId }) => {
  const Icon = item.icon
  return (
    <button
      type="button"
      onClick={() => onClick(item.path)}
      className="gba:group gba:flex gba:flex-col gba:items-center gba:gap-2 gba:bg-transparent gba:border-0 gba:cursor-pointer gba:outline-none gba:p-0"
      data-testid={iconTestId}
    >
      <span className="gba:relative gba:flex gba:items-center gba:justify-center gba:w-11 gba:h-11 gba:sm:w-12 gba:sm:h-12 gba:rounded-xl gba:bg-white/10 gba:border gba:border-white/15 gba:backdrop-blur-sm gba:transition-all gba:duration-200 group-hover:gba:bg-white/20 group-hover:gba:border-white/30 group-hover:gba:scale-110 group-focus-visible:gba:ring-2 group-focus-visible:gba:ring-white/50 group-focus-visible:gba:ring-offset-2 group-focus-visible:gba:ring-offset-transparent">
        <Icon className="gba:w-5 gba:h-5 gba:text-white/80 gba:transition-colors gba:duration-200 group-hover:gba:text-white" />
      </span>
      <span className="gba:text-[11px] gba:font-medium gba:text-white/50 gba:transition-colors gba:duration-200 group-hover:gba:text-white/90 gba:tracking-wide">
        {label}
      </span>
    </button>
  )
}

export default HeroSection
