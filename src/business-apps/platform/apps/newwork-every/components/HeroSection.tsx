import React from 'react'

interface HeroSectionProps {
  'data-testid'?: string
}

// Keyframes styles injected directly to ensure they work in production
const keyframesStyles = `
  @keyframes gradient-shift-warm {
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
    50% { transform: translateY(-10px); }
  }
`

export const HeroSection: React.FC<HeroSectionProps> = ({ 'data-testid': testId = 'newwork-every-hero' }) => {
  return (
    <>
      <style>{keyframesStyles}</style>
      <section className="gba:relative gba:py-10 gba:px-6" data-testid={testId}>
        {/* Warm gradient background */}
        <div className="gba:absolute gba:inset-0 gba:bg-gradient-to-br gba:from-success/5 gba:via-background gba:to-warning/5" />

        {/* Animated warm mesh gradient overlay */}
        <div
          className="gba:absolute gba:inset-0 gba:opacity-20"
          style={{
            background:
              'radial-gradient(ellipse at 20% 30%, var(--nw-success) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, var(--nw-warning) 0%, transparent 50%)',
            animation: 'gradient-shift-warm 20s ease infinite',
            backgroundSize: '200% 200%'
          }}
        />

        {/* Subtle dot pattern overlay */}
        <div
          className="gba:absolute gba:inset-0 gba:opacity-[0.02]"
          style={{
            backgroundImage: 'radial-gradient(var(--nw-foreground) 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}
        />

        {/* Content */}
        <div className="gba:relative gba:max-w-5xl gba:mx-auto gba:text-center">
          {/* NEWWORK EVERY Logo */}
          <div className="gba:mb-5" style={{ animation: 'fadeInUp 0.6s ease-out' }} data-testid={`${testId}-logo`}>
            <div className="gba:inline-flex gba:flex-col gba:items-center gba:gap-1">
              <span className="gba:text-sm gba:font-medium gba:tracking-[0.3em] gba:text-muted-foreground gba:uppercase">
                NEWWORK
              </span>
              <h1 className="gba:text-5xl gba:sm:text-6xl gba:lg:text-7xl gba:font-bold gba:tracking-tight">
                <span
                  className="gba:bg-gradient-to-r gba:from-success gba:via-warning gba:to-success gba:bg-clip-text gba:text-transparent"
                  style={{
                    backgroundSize: '200% 100%',
                    animation: 'gradient-shift-warm 4s ease infinite'
                  }}
                >
                  EVERY
                </span>
              </h1>
            </div>
          </div>

          {/* Tagline */}
          <p
            className="gba:text-lg gba:sm:text-xl gba:text-muted-foreground gba:max-w-2xl gba:mx-auto gba:mb-4"
            style={{ animation: 'fadeInUp 0.6s ease-out 0.2s both' }}
            data-testid={`${testId}-tagline`}
          >
            Your personal productivity universe. AI assistant, documents, time tracking, and everything you need to work
            smarter, not harder.
          </p>

          {/* Floating productivity icons hint */}
          <div
            className="gba:flex gba:justify-center gba:gap-6 gba:text-muted-foreground/50"
            style={{ animation: 'fadeInUp 0.6s ease-out 0.3s both' }}
          >
            <span className="gba:text-2xl" style={{ animation: 'float 3s ease-in-out infinite' }}></span>
            <span className="gba:text-2xl" style={{ animation: 'float 3s ease-in-out 0.5s infinite' }}></span>
            <span className="gba:text-2xl" style={{ animation: 'float 3s ease-in-out 1s infinite' }}></span>
            <span className="gba:text-2xl" style={{ animation: 'float 3s ease-in-out 1.5s infinite' }}></span>
          </div>
        </div>
      </section>
    </>
  )
}
