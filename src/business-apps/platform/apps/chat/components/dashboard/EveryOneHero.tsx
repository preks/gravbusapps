import React, { useMemo } from 'react'
import { SpaceHeroBackground } from '../../../spaces/components/SpaceHeroBackground'

interface EveryOneHeroProps {
  userName?: string
  'data-testid'?: string
}

// Video background - same logic as SpaceHero
const hostedVideoUrl = typeof import.meta !== 'undefined' && import.meta.env?.VITE_SPACE_HERO_VIDEO_URL
const localVideoUrl = '/space-hero-background.mp4'
const useVideo = hostedVideoUrl || (typeof import.meta !== 'undefined' && import.meta.env?.DEV && localVideoUrl)
const HERO_VIDEO_SRC = hostedVideoUrl || localVideoUrl

/**
 * Get time-based greeting
 */
function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 17) return 'Good afternoon'
  if (hour >= 17 && hour < 21) return 'Good evening'
  return 'Good night'
}

/**
 * EveryOneHero - Premium animated hero for EveryOne Dashboard
 * Uses the same styling as SpaceHero - video or animated gradient background with white text
 */
export const EveryOneHero: React.FC<EveryOneHeroProps> = ({ userName, 'data-testid': testId = 'everyone-hero' }) => {
  const greeting = useMemo(() => getGreeting(), [])
  const firstName = useMemo(() => {
    if (!userName) return ''
    return userName.split(' ')[0]
  }, [userName])

  return (
    <div data-testid={testId}>
      <div className="gba:relative gba:overflow-hidden">
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
        <div className="gba:relative gba:max-w-7xl gba:mx-auto gba:px-6 gba:py-8">
          {/* Space Info - matches SpaceHero layout */}
          <div className="gba:pb-4">
            {/* Brand Badge */}
            <div className="gba:mb-4">
              <span className="gba:text-xs gba:font-medium gba:tracking-[0.3em] gba:text-white/60 gba:uppercase">
                NEWWORK
              </span>
            </div>

            {/* App Name - Funnel Display font like SpaceHero */}
            <h1
              className="gba:font-funnel-display gba:text-4xl gba:sm:text-5xl gba:font-semibold gba:text-white gba:tracking-tight gba:mb-3"
              data-testid={`${testId}-title`}
            >
              Every<span className="gba:font-normal">One</span>
            </h1>

            {/* Greeting with user name */}
            <p className="gba:text-lg gba:text-white/70 gba:max-w-2xl gba:mb-2" data-testid={`${testId}-greeting`}>
              {greeting}
              {firstName && <span className="gba:text-white">, {firstName}</span>}
            </p>

            {/* Tagline */}
            <p className="gba:text-sm gba:text-white/50 gba:max-w-xl" data-testid={`${testId}-tagline`}>
              Your communication hub. Connect, collaborate, and stay in sync with your team.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EveryOneHero
