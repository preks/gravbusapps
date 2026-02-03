import React from 'react'
import { SpaceHeroBackground } from '@/business-apps/platform/apps/spaces/components/SpaceHeroBackground'

interface EveryPagesHeroProps {
  activeTab: string
  'data-testid'?: string
}

// Video background - same logic as SpaceHero and EveryOne
const hostedVideoUrl = typeof import.meta !== 'undefined' && import.meta.env?.VITE_SPACE_HERO_VIDEO_URL
const localVideoUrl = '/space-hero-background.mp4'
const useVideo = hostedVideoUrl || (typeof import.meta !== 'undefined' && import.meta.env?.DEV && localVideoUrl)
const HERO_VIDEO_SRC = hostedVideoUrl || localVideoUrl

// Tab-specific content configuration
const tabContent: Record<string, { title: string; subtitle: string }> = {
  home: {
    title: 'Welcome to Your Intranet',
    subtitle: 'Stay informed with company news, updates, and resources'
  },
  news: {
    title: 'Company News',
    subtitle: 'Latest updates and announcements from across the organization'
  },
  knowledge: {
    title: 'Knowledge Base',
    subtitle: 'Access articles, guides, and resources to help you succeed'
  },
  documents: {
    title: 'Documents',
    subtitle: 'Browse and manage important company documents'
  },
  questions: {
    title: 'Questions & Answers',
    subtitle: 'Get answers to your questions from the community'
  },
  engagement: {
    title: 'Engagement Dashboard',
    subtitle: 'Track your contributions and community impact'
  }
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
  const content = tabContent[activeTab] || tabContent.home

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
            {content.title}
          </p>

          {/* Secondary description */}
          <p
            className="gba:text-sm gba:text-white/60 gba:max-w-xl gba:transition-opacity gba:duration-300"
            data-testid={`${testId}-subtitle-secondary`}
          >
            {content.subtitle}
          </p>
        </div>
      </div>
    </div>
  )
}

export default EveryPagesHero
