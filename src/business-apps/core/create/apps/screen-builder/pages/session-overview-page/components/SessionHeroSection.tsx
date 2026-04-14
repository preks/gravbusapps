import React from 'react'
import { Sparkles } from 'lucide-react'
import { PremiumHeroBackground } from '@/common/components/premium-hero-background'

interface SessionHeroSectionProps {
  'data-testid'?: string
}

export const SessionHeroSection: React.FC<SessionHeroSectionProps> = ({
  'data-testid': testId = 'ai-builder-hero'
}) => {
  return (
    <section className="gba:relative gba:overflow-hidden gba:min-h-96" data-testid={testId}>
      <PremiumHeroBackground data-testid={`${testId}-background`} />
      <div className="gba:absolute gba:inset-0 gba:pointer-events-none gba:space-hero-overlay" aria-hidden />

      {/* Content */}
      <div className="gba:relative gba:py-12 gba:px-6 gba:max-w-4xl gba:mx-auto gba:text-center">
        <div className="gba:mb-6" data-testid={`${testId}-logo`}>
          <div className="gba:inline-flex gba:flex-col gba:items-center gba:gap-2">
            <div className="gba:relative">
              <div className="gba:relative gba:w-16 gba:h-16 gba:rounded-2xl gba:bg-white/10 gba:flex gba:items-center gba:justify-center gba:border gba:border-white/20">
                <Sparkles className="gba:w-8 gba:h-8 gba:text-white" />
              </div>
            </div>
            <span className="gba:text-xs gba:font-medium gba:tracking-[0.4em] gba:text-white/60 gba:uppercase gba:mt-4">
              NEWWORK
            </span>
            <h1 className="gba:font-funnel-display gba:text-5xl gba:sm:text-6xl gba:lg:text-7xl gba:tracking-tight gba:text-white gba:font-semibold">
              Screen <span className="gba:text-white/90">Builder</span>
            </h1>
          </div>
        </div>

        <div className="gba:flex gba:items-center gba:justify-center gba:gap-3 gba:mb-5">
          <span className="gba:inline-flex gba:items-center gba:gap-1.5 gba:px-3 gba:py-1 gba:rounded-full gba:bg-white/10 gba:text-white/90 gba:text-xs gba:font-medium gba:border gba:border-white/20">
            Sessions
          </span>
          <span className="gba:inline-flex gba:items-center gba:gap-1.5 gba:px-3 gba:py-1 gba:rounded-full gba:bg-white/10 gba:text-white/90 gba:text-xs gba:font-medium gba:border gba:border-white/20">
            AI-Powered
          </span>
          <span className="gba:inline-flex gba:items-center gba:gap-1.5 gba:px-3 gba:py-1 gba:rounded-full gba:bg-white/10 gba:text-white/90 gba:text-xs gba:font-medium gba:border gba:border-white/20">
            Code Generation
          </span>
        </div>

        <h2
          className="gba:text-2xl gba:sm:text-3xl gba:font-semibold gba:tracking-tight gba:text-white gba:mb-3"
          data-testid={`${testId}-headline`}
        >
          Build screens. <span className="gba:text-white/80">Powered by AI.</span>
        </h2>

        <p
          className="gba:text-base gba:text-white/70 gba:max-w-xl gba:mx-auto gba:leading-relaxed"
          data-testid={`${testId}-subtitle`}
        >
          Create and iterate on application screens with Screen Builder. Start a new session or continue where you left
          off.
        </p>
      </div>
    </section>
  )
}

export default SessionHeroSection
