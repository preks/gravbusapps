import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { Briefcase, Users, Building2, Receipt, Headphones, TrendingUp } from 'lucide-react'
import translations from '../_i18n'

interface HeroSectionProps {
  'data-testid'?: string
}

// Keyframes styles injected directly to ensure they work in production
const keyframesStyles = `
  @keyframes gradient-shift-business {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  @keyframes fadeInUp {
    0% { opacity: 0; transform: translateY(20px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-8px); }
  }
`

/**
 * HeroSection - Premium animated hero for NEWWORK BUSINESS DOMAINS
 * Matches the NEWWORK CREATE hero style
 */
export const HeroSection: React.FC<HeroSectionProps> = ({
  'data-testid': testId = 'newwork-business-domains-hero'
}) => {
  const { t } = useTranslation(translations)

  return (
    <>
      <style>{keyframesStyles}</style>
      <section className="gba:relative gba:py-10 gba:px-6" data-testid={testId}>
        {/* Animated gradient background */}
        <div className="gba:absolute gba:inset-0 gba:bg-gradient-to-br gba:from-primary/5 gba:via-background gba:to-info/5" />

        {/* Animated mesh gradient overlay */}
        <div
          className="gba:absolute gba:inset-0 gba:opacity-30"
          style={{
            background:
              'radial-gradient(ellipse at 30% 20%, var(--nw-primary) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, var(--nw-info) 0%, transparent 50%)',
            animation: 'gradient-shift-business 15s ease infinite',
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
          {/* NEWWORK BUSINESS DOMAINS Logo */}
          <div className="gba:mb-5" style={{ animation: 'fadeInUp 0.6s ease-out' }} data-testid={`${testId}-logo`}>
            <div className="gba:inline-flex gba:flex-col gba:items-center gba:gap-1">
              <span className="gba:text-sm gba:font-medium gba:tracking-[0.3em] gba:text-muted-foreground gba:uppercase">
                NEWWORK
              </span>
              <h1 className="gba:text-5xl gba:sm:text-6xl gba:lg:text-7xl gba:font-bold gba:tracking-tight">
                <span
                  className="gba:bg-gradient-to-r gba:from-primary gba:via-info gba:to-primary gba:bg-clip-text gba:text-transparent"
                  style={{
                    backgroundSize: '200% 100%',
                    animation: 'gradient-shift-business 4s ease infinite'
                  }}
                >
                  {t('hero-title')}
                </span>
              </h1>
            </div>
          </div>

          {/* Badge */}
          <div
            className="gba:inline-flex gba:items-center gba:gap-2 gba:px-4 gba:py-2 gba:rounded-full gba:bg-primary/10 gba:text-primary gba:text-sm gba:font-medium gba:mb-5 gba:border gba:border-primary/20"
            style={{ animation: 'fadeInUp 0.6s ease-out 0.1s both' }}
            data-testid={`${testId}-badge`}
          >
            <Briefcase className="gba:h-4 gba:w-4" />
            <span>{t('hero-badge')}</span>
          </div>

          {/* Main headline */}
          <h2
            className="gba:text-3xl gba:sm:text-4xl gba:font-semibold gba:tracking-tight gba:text-foreground gba:mb-4"
            style={{ animation: 'fadeInUp 0.6s ease-out 0.15s both' }}
            data-testid={`${testId}-headline`}
          >
            {t('hero-headline')}
            <span className="gba:text-muted-foreground"> {t('hero-headline-muted')}</span>
          </h2>

          {/* Subtitle */}
          <p
            className="gba:text-lg gba:text-muted-foreground gba:max-w-2xl gba:mx-auto gba:leading-relaxed gba:mb-6"
            style={{ animation: 'fadeInUp 0.6s ease-out 0.2s both' }}
            data-testid={`${testId}-subtitle`}
          >
            {t('hero-subtitle')}
          </p>

          {/* Floating business icons */}
          <div
            className="gba:flex gba:justify-center gba:items-center gba:gap-8"
            style={{ animation: 'fadeInUp 0.6s ease-out 0.25s both' }}
          >
            <div
              className="gba:p-2 gba:rounded-lg gba:bg-info/10 gba:text-info"
              style={{ animation: 'float 3s ease-in-out infinite' }}
            >
              <Users className="gba:w-5 gba:h-5" />
            </div>
            <div
              className="gba:p-2 gba:rounded-lg gba:bg-primary/10 gba:text-primary"
              style={{ animation: 'float 3s ease-in-out 0.5s infinite' }}
            >
              <Building2 className="gba:w-5 gba:h-5" />
            </div>
            <div
              className="gba:p-2 gba:rounded-lg gba:bg-success/10 gba:text-success"
              style={{ animation: 'float 3s ease-in-out 1s infinite' }}
            >
              <Receipt className="gba:w-5 gba:h-5" />
            </div>
            <div
              className="gba:p-2 gba:rounded-lg gba:bg-warning/10 gba:text-warning"
              style={{ animation: 'float 3s ease-in-out 1.5s infinite' }}
            >
              <Headphones className="gba:w-5 gba:h-5" />
            </div>
            <div
              className="gba:p-2 gba:rounded-lg gba:bg-ai/10 gba:text-ai"
              style={{ animation: 'float 3s ease-in-out 2s infinite' }}
            >
              <TrendingUp className="gba:w-5 gba:h-5" />
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default HeroSection
