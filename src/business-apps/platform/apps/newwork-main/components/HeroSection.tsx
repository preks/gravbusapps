/**
 * HeroSection - Premium hero for NEWWORK - THE ENTERPRISE AI
 * Uses same title font as Every Office (desk): Funnel Display.
 */

import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { Hexagon } from 'lucide-react'
import translations from '../_i18n'

// Keyframes for premium animations
const keyframesStyles = `
  @keyframes gradient-shift-enterprise {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  @keyframes fadeInUp {
    0% { opacity: 0; transform: translateY(30px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse-glow {
    0%, 100% { opacity: 0.6; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.05); }
  }
  @keyframes rotate-slow {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes float-subtle {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }
`

interface HeroSectionProps {
  'data-testid'?: string
}

export const HeroSection: React.FC<HeroSectionProps> = ({ 'data-testid': testId = 'newwork-main-hero' }) => {
  const { t } = useTranslation(translations)

  return (
    <>
      <style>{keyframesStyles}</style>
      <section className="gba:relative gba:py-16 gba:px-6" data-testid={testId}>
        {/* Animated gradient background */}
        <div className="gba:absolute gba:inset-0 gba:bg-gradient-to-br gba:from-ai/8 gba:via-background gba:to-primary/8" />

        {/* Animated mesh gradient overlay */}
        <div
          className="gba:absolute gba:inset-0 gba:opacity-40"
          style={{
            background:
              'radial-gradient(ellipse at 50% 30%, var(--nw-ai) 0%, transparent 50%), radial-gradient(ellipse at 30% 70%, var(--nw-primary) 0%, transparent 40%), radial-gradient(ellipse at 70% 60%, var(--nw-info) 0%, transparent 40%)',
            animation: 'gradient-shift-enterprise 20s ease infinite',
            backgroundSize: '200% 200%'
          }}
        />

        {/* Grid pattern overlay */}
        <div
          className="gba:absolute gba:inset-0 gba:opacity-[0.02]"
          style={{
            backgroundImage:
              'linear-gradient(var(--nw-foreground) 1px, transparent 1px), linear-gradient(90deg, var(--nw-foreground) 1px, transparent 1px)',
            backgroundSize: '48px 48px'
          }}
        />

        {/* Content */}
        <div className="gba:relative gba:max-w-6xl gba:mx-auto gba:text-center">
          <div className="gba:mb-6" style={{ animation: 'fadeInUp 0.8s ease-out' }} data-testid={`${testId}-branding`}>
            <span className="gba:text-base gba:font-semibold gba:tracking-[0.4em] gba:text-muted-foreground gba:uppercase">
              NEWWORK
            </span>
          </div>

          {/* Main title – same font as desk (Funnel Display) */}
          <div
            className="gba:mb-8"
            style={{ animation: 'fadeInUp 0.8s ease-out 0.1s both' }}
            data-testid={`${testId}-title`}
          >
            <h1 className="gba:font-funnel-display gba:text-5xl gba:sm:text-6xl gba:lg:text-7xl gba:font-semibold gba:tracking-tight gba:leading-none">
              <span
                className="gba:bg-gradient-to-r gba:from-ai gba:via-primary gba:to-info gba:bg-clip-text gba:text-transparent"
                style={{
                  backgroundSize: '200% 100%',
                  animation: 'gradient-shift-enterprise 6s ease infinite'
                }}
              >
                {t('hero-title')}
              </span>
            </h1>
          </div>

          {/* Animated AI Core Icon */}
          <div
            className="gba:flex gba:justify-center gba:mb-8"
            style={{ animation: 'fadeInUp 0.8s ease-out 0.2s both' }}
            data-testid={`${testId}-icon`}
          >
            <div className="gba:relative">
              <div
                className="gba:absolute gba:inset-0 gba:flex gba:items-center gba:justify-center"
                style={{ animation: 'rotate-slow 30s linear infinite' }}
              >
                <div className="gba:w-24 gba:h-24 gba:rounded-full gba:border gba:border-ai/30 gba:border-dashed" />
              </div>
              <div
                className="gba:absolute gba:inset-0 gba:flex gba:items-center gba:justify-center"
                style={{ animation: 'pulse-glow 3s ease-in-out infinite' }}
              >
                <div className="gba:w-20 gba:h-20 gba:rounded-full gba:bg-gradient-to-br gba:from-ai/20 gba:to-primary/20 gba:blur-sm" />
              </div>
              <div
                className="gba:relative gba:w-24 gba:h-24 gba:flex gba:items-center gba:justify-center"
                style={{ animation: 'float-subtle 4s ease-in-out infinite' }}
              >
                <Hexagon className="gba:w-12 gba:h-12 gba:text-ai" strokeWidth={1.5} />
                <div
                  className="gba:absolute gba:w-3 gba:h-3 gba:rounded-full gba:bg-ai"
                  style={{ animation: 'pulse-glow 2s ease-in-out infinite' }}
                />
              </div>
            </div>
          </div>

          <h2
            className="gba:text-2xl gba:sm:text-3xl gba:font-semibold gba:tracking-tight gba:text-foreground gba:mb-4"
            style={{ animation: 'fadeInUp 0.8s ease-out 0.3s both' }}
            data-testid={`${testId}-tagline`}
          >
            Where AI meets enterprise
          </h2>

          <p
            className="gba:text-lg gba:sm:text-xl gba:text-muted-foreground gba:max-w-3xl gba:mx-auto gba:leading-relaxed"
            style={{ animation: 'fadeInUp 0.8s ease-out 0.4s both' }}
            data-testid={`${testId}-description`}
          >
            {t('hero-three-pillars-line')}
          </p>
        </div>
      </section>
    </>
  )
}

export default HeroSection
