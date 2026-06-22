import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { Sparkles } from 'lucide-react'
import translations from '../../../_i18n'

interface HeroSectionProps {
  'data-testid'?: string
}

// Keyframes styles injected directly to ensure they work in production
const keyframesStyles = `
  @keyframes gradient-shift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  @keyframes fadeInUp {
    0% { opacity: 0; transform: translateY(20px); }
    100% { opacity: 1; transform: translateY(0); }
  }
`

/**
 * HeroSection - Premium animated hero for NEWWORK CREATE
 * Features an animated gradient background with a bold headline
 */
export const HeroSection: React.FC<HeroSectionProps> = ({ 'data-testid': testId = 'create-workspace-hero' }) => {
  const { t } = useTranslation(translations)
  return (
    <>
      <style>{keyframesStyles}</style>
      <section className="gba:relative gba:py-10 gba:px-6" data-testid={testId}>
        {/* Animated gradient background */}
        <div className="gba:absolute gba:inset-0 gba:bg-linear-to-br gba:from-ai/5 gba:via-background gba:to-primary/5" />

        {/* Animated mesh gradient overlay */}
        <div
          className="gba:absolute gba:inset-0 gba:opacity-30"
          style={{
            background:
              'radial-gradient(ellipse at 30% 20%, var(--nw-ai) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, var(--nw-primary) 0%, transparent 50%)',
            animation: 'gradient-shift 15s ease infinite',
            backgroundSize: '200% 200%'
          }}
        />

        {/* Grid pattern overlay */}
        <div
          className="gba:absolute gba:inset-0 gba:opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(var(--nw-foreground) 1px, transparent 1px), linear-gradient(90deg, var(--nw-foreground) 1px, transparent 1px)',
            backgroundSize: '64px 64px'
          }}
        />

        {/* Content */}
        <div className="gba:relative gba:max-w-5xl gba:mx-auto gba:text-center">
          {/* NEWWORK CREATE Logo */}
          <div className="gba:mb-5" style={{ animation: 'fadeInUp 0.6s ease-out' }} data-testid={`${testId}-logo`}>
            <div className="gba:inline-flex gba:flex-col gba:items-center gba:gap-1">
              <span className="gba:text-sm gba:font-medium gba:tracking-[0.3em] gba:text-muted-foreground gba:uppercase">
                NEWWORK
              </span>
              <h1 className="gba:text-5xl gba:sm:text-6xl gba:lg:text-7xl gba:font-bold gba:tracking-tight">
                <span
                  className="gba:bg-linear-to-r gba:from-ai gba:via-primary gba:to-ai gba:bg-clip-text gba:text-transparent"
                  style={{
                    backgroundSize: '200% 100%',
                    animation: 'gradient-shift 4s ease infinite'
                  }}
                >
                  {t('hero-logo-title')}
                </span>
              </h1>
            </div>
          </div>

          {/* Badge */}
          <div
            className="gba:inline-flex gba:items-center gba:gap-2 gba:px-4 gba:py-2 gba:rounded-full gba:bg-ai/10 gba:text-ai gba:text-sm gba:font-medium gba:mb-5 gba:border gba:border-ai/20"
            style={{ animation: 'fadeInUp 0.6s ease-out 0.1s both' }}
            data-testid={`${testId}-badge`}
          >
            <Sparkles className="gba:h-4 gba:w-4" />
            <span>{t('hero-badge')}</span>
          </div>

          {/* Main headline */}
          <h2
            className="gba:text-3xl gba:sm:text-4xl gba:font-semibold gba:tracking-tight gba:text-foreground gba:mb-4"
            style={{ animation: 'fadeInUp 0.6s ease-out 0.15s both' }}
            data-testid={`${testId}-headline`}
          >
            {t('hero-headline-primary')}{' '}
            <span className="gba:text-muted-foreground">{t('hero-headline-secondary')}</span>
          </h2>

          {/* Subtitle */}
          <p
            className="gba:text-lg gba:text-muted-foreground gba:max-w-2xl gba:mx-auto gba:leading-relaxed"
            style={{ animation: 'fadeInUp 0.6s ease-out 0.2s both' }}
            data-testid={`${testId}-subtitle`}
          >
            {t('hero-subtitle')}
          </p>
        </div>
      </section>
    </>
  )
}

export default HeroSection
