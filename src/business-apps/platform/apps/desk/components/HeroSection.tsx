import React from 'react'
import { Layers } from 'lucide-react'

interface HeroSectionProps {
  'data-testid'?: string
}

// Keyframes styles injected directly
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
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }
  @keyframes pulse-ring {
    0% { transform: scale(0.95); opacity: 0.5; }
    50% { transform: scale(1); opacity: 0.8; }
    100% { transform: scale(0.95); opacity: 0.5; }
  }
`

/**
 * HeroSection - Premium animated hero for Every Desk
 * Features an animated gradient background with bold headline
 */
export const HeroSection: React.FC<HeroSectionProps> = ({ 'data-testid': testId = 'desk-hero' }) => {
  return (
    <>
      <style>{keyframesStyles}</style>
      <section className="gba:relative gba:py-12 gba:px-6 gba:overflow-hidden" data-testid={testId}>
        {/* Animated gradient background */}
        <div className="gba:absolute gba:inset-0 gba:bg-gradient-to-br gba:from-sky-500/5 gba:via-background gba:to-amber-500/5" />

        {/* Animated mesh gradient overlay */}
        <div
          className="gba:absolute gba:inset-0 gba:opacity-20"
          style={{
            background:
              'radial-gradient(ellipse at 20% 30%, var(--nw-sky-600, #0284c7) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, var(--nw-amber-600, #d97706) 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, var(--nw-teal-600, #0d9488) 0%, transparent 40%)',
            animation: 'gradient-shift 20s ease infinite',
            backgroundSize: '200% 200%'
          }}
        />

        {/* Subtle grid pattern */}
        <div
          className="gba:absolute gba:inset-0 gba:opacity-[0.02]"
          style={{
            backgroundImage:
              'linear-gradient(var(--nw-foreground) 1px, transparent 1px), linear-gradient(90deg, var(--nw-foreground) 1px, transparent 1px)',
            backgroundSize: '48px 48px'
          }}
        />

        {/* Content */}
        <div className="gba:relative gba:max-w-4xl gba:mx-auto gba:text-center">
          {/* Animated logo */}
          <div className="gba:mb-6" style={{ animation: 'fadeInUp 0.6s ease-out' }} data-testid={`${testId}-logo`}>
            <div className="gba:inline-flex gba:flex-col gba:items-center gba:gap-2">
              {/* Icon with glow effect */}
              <div className="gba:relative">
                {/* Glow ring */}
                <div
                  className="gba:absolute gba:inset-0 gba:rounded-2xl gba:bg-gradient-to-br gba:from-sky-500 gba:via-teal-500 gba:to-amber-500 gba:blur-xl"
                  style={{ animation: 'pulse-ring 3s ease-in-out infinite', transform: 'scale(1.5)' }}
                />
                {/* Icon container */}
                <div
                  className="gba:relative gba:w-16 gba:h-16 gba:rounded-2xl gba:bg-gradient-to-br gba:from-slate-900 gba:to-slate-800 gba:flex gba:items-center gba:justify-center gba:border gba:border-slate-700/50"
                  style={{ animation: 'float 4s ease-in-out infinite' }}
                >
                  <Layers className="gba:w-8 gba:h-8 gba:text-white" />
                </div>
              </div>

              {/* Brand text */}
              <span className="gba:text-xs gba:font-medium gba:tracking-[0.4em] gba:text-muted-foreground gba:uppercase gba:mt-4">
                NEWWORK
              </span>
              <h1 className="gba:text-5xl gba:sm:text-6xl gba:lg:text-7xl gba:font-bold gba:tracking-tight">
                <span className="gba:text-foreground">Every </span>
                <span
                  className="gba:bg-gradient-to-r gba:from-sky-500 gba:via-teal-500 gba:to-amber-500 gba:bg-clip-text gba:text-transparent"
                  style={{
                    backgroundSize: '200% 100%',
                    animation: 'gradient-shift 6s ease infinite'
                  }}
                >
                  Desk
                </span>
              </h1>
            </div>
          </div>

          {/* Badges */}
          <div
            className="gba:flex gba:items-center gba:justify-center gba:gap-3 gba:mb-5"
            style={{ animation: 'fadeInUp 0.6s ease-out 0.1s both' }}
          >
            <span className="gba:inline-flex gba:items-center gba:gap-1.5 gba:px-3 gba:py-1 gba:rounded-full gba:bg-sky-500/10 gba:text-sky-600 gba:text-xs gba:font-medium gba:border gba:border-sky-500/20">
              Documents
            </span>
            <span className="gba:inline-flex gba:items-center gba:gap-1.5 gba:px-3 gba:py-1 gba:rounded-full gba:bg-teal-500/10 gba:text-teal-600 gba:text-xs gba:font-medium gba:border gba:border-teal-500/20">
              Spreadsheets
            </span>
            <span className="gba:inline-flex gba:items-center gba:gap-1.5 gba:px-3 gba:py-1 gba:rounded-full gba:bg-amber-500/10 gba:text-amber-600 gba:text-xs gba:font-medium gba:border gba:border-amber-500/20">
              Notes
            </span>
          </div>

          {/* Main headline */}
          <h2
            className="gba:text-2xl gba:sm:text-3xl gba:font-semibold gba:tracking-tight gba:text-foreground gba:mb-3"
            style={{ animation: 'fadeInUp 0.6s ease-out 0.15s both' }}
            data-testid={`${testId}-headline`}
          >
            Your content.
            <span className="gba:text-muted-foreground"> Unified.</span>
          </h2>

          {/* Subtitle */}
          <p
            className="gba:text-base gba:text-muted-foreground gba:max-w-xl gba:mx-auto gba:leading-relaxed"
            style={{ animation: 'fadeInUp 0.6s ease-out 0.2s both' }}
            data-testid={`${testId}-subtitle`}
          >
            Create documents, build spreadsheets, and capture notes. All in one seamless workspace.
          </p>
        </div>
      </section>
    </>
  )
}

export default HeroSection
