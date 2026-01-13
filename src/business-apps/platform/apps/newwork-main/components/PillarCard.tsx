import React from 'react'
import { LucideIcon } from 'lucide-react'
import { Badge } from '@newwork/nw-design-system'

export interface PillarCardProps {
  id: string
  title: string
  subtitle: string
  description: string
  icon: LucideIcon
  href: string
  features: string[]
  accentColor: 'ai' | 'primary' | 'info' | 'success' | 'warning'
  onClick?: () => void
  animationDelay?: number
  'data-testid'?: string
}

// Keyframes for card animations
const keyframesStyles = `
  @keyframes card-fadeIn {
    0% { opacity: 0; transform: translateY(20px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes icon-float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  }
`

/**
 * PillarCard - Large immersive card for the three NEWWORK pillars
 * Features gradient borders, hover effects, and feature previews
 */
export const PillarCard: React.FC<PillarCardProps> = ({
  title,
  subtitle,
  description,
  icon: Icon,
  features,
  accentColor,
  onClick,
  animationDelay = 0,
  'data-testid': testId
}) => {
  // Color mappings for accent colors
  const colorMap = {
    ai: {
      bg: 'gba:bg-ai/5',
      border: 'gba:border-ai/20',
      hoverBorder: 'gba:hover:border-ai/40',
      iconBg: 'gba:bg-ai/10',
      iconColor: 'gba:text-ai',
      gradient: 'gba:from-ai gba:to-ai/50'
    },
    primary: {
      bg: 'gba:bg-primary/5',
      border: 'gba:border-primary/20',
      hoverBorder: 'gba:hover:border-primary/40',
      iconBg: 'gba:bg-primary/10',
      iconColor: 'gba:text-primary',
      gradient: 'gba:from-primary gba:to-primary/50'
    },
    info: {
      bg: 'gba:bg-info/5',
      border: 'gba:border-info/20',
      hoverBorder: 'gba:hover:border-info/40',
      iconBg: 'gba:bg-info/10',
      iconColor: 'gba:text-info',
      gradient: 'gba:from-info gba:to-info/50'
    },
    success: {
      bg: 'gba:bg-success/5',
      border: 'gba:border-success/20',
      hoverBorder: 'gba:hover:border-success/40',
      iconBg: 'gba:bg-success/10',
      iconColor: 'gba:text-success',
      gradient: 'gba:from-success gba:to-success/50'
    },
    warning: {
      bg: 'gba:bg-warning/5',
      border: 'gba:border-warning/20',
      hoverBorder: 'gba:hover:border-warning/40',
      iconBg: 'gba:bg-warning/10',
      iconColor: 'gba:text-warning',
      gradient: 'gba:from-warning gba:to-warning/50'
    }
  }

  const colors = colorMap[accentColor]

  return (
    <>
      <style>{keyframesStyles}</style>
      <button
        type="button"
        onClick={onClick}
        className={`
          gba:group gba:relative gba:flex gba:flex-col gba:p-6 gba:rounded-2xl
          gba:bg-card gba:border-2 ${colors.border} ${colors.hoverBorder}
          gba:transition-all gba:duration-300 gba:ease-out
          gba:hover:scale-[1.02] gba:hover:shadow-lg
          gba:text-left gba:w-full gba:cursor-pointer
        `}
        style={{
          animation: `card-fadeIn 0.6s ease-out ${animationDelay}s both`
        }}
        data-testid={testId}
      >
        {/* Gradient overlay on hover */}
        <div
          className={`
            gba:absolute gba:inset-0 gba:rounded-2xl gba:opacity-0
            gba:group-hover:opacity-100 gba:transition-opacity gba:duration-300
            ${colors.bg}
          `}
        />

        {/* Content */}
        <div className="gba:relative gba:z-10">
          {/* Icon and badge row */}
          <div className="gba:flex gba:items-start gba:justify-between gba:mb-4">
            <div
              className={`gba:p-3 gba:rounded-xl ${colors.iconBg}`}
              style={{ animation: 'icon-float 3s ease-in-out infinite' }}
            >
              <Icon className={`gba:w-8 gba:h-8 ${colors.iconColor}`} />
            </div>
            <Badge variant="default" className="gba:text-xs">
              {subtitle}
            </Badge>
          </div>

          {/* Title */}
          <h3 className="gba:text-2xl gba:font-bold gba:text-foreground gba:mb-2 gba:group-hover:text-foreground">
            {title}
          </h3>

          {/* Description */}
          <p className="gba:text-muted-foreground gba:mb-4 gba:leading-relaxed">{description}</p>

          {/* Features list */}
          <div className="gba:space-y-2">
            {features.map((feature, index) => (
              <div key={index} className="gba:flex gba:items-center gba:gap-2">
                <div className={`gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-gradient-to-r ${colors.gradient}`} />
                <span className="gba:text-sm gba:text-muted-foreground">{feature}</span>
              </div>
            ))}
          </div>

          {/* Arrow indicator */}
          <div className="gba:mt-6 gba:flex gba:items-center gba:gap-2 gba:text-sm gba:font-medium gba:text-muted-foreground gba:group-hover:text-foreground gba:transition-colors">
            <span>Explore {title}</span>
            <svg
              className="gba:w-4 gba:h-4 gba:transform gba:group-hover:translate-x-1 gba:transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </button>
    </>
  )
}

export default PillarCard
