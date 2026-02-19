import React from 'react'
import { Card, CardContent, Badge } from '@newwork/nw-design-system'
import { ArrowRight, LucideIcon } from 'lucide-react'

export interface ToolCardProps {
  title: string
  description: string
  icon: LucideIcon
  href: string
  badge?: string
  badgeVariant?: 'default' | 'secondary' | 'success' | 'destructive' | 'warning' | 'info'
  isComingSoon?: boolean
  accentColor?: 'ai' | 'primary' | 'success' | 'warning' | 'info'
  onClick?: () => void
  'data-testid'?: string
  animationDelay?: number
}

/**
 * ToolCard - A premium card component for NEWWORK CREATE tools
 * Features hover effects, gradient accents, and smooth animations
 */
export const ToolCard: React.FC<ToolCardProps> = ({
  title,
  description,
  icon: Icon,
  href,
  badge,
  badgeVariant = 'secondary',
  isComingSoon = false,
  accentColor = 'primary',
  onClick,
  'data-testid': testId,
  animationDelay = 0
}) => {
  const colorMap = {
    ai: {
      iconBg: 'gba:bg-ai/10',
      iconText: 'gba:text-ai',
      hoverBorder: 'hover:gba:border-ai/50',
      gradient: 'gba:from-ai/5 gba:to-transparent'
    },
    primary: {
      iconBg: 'gba:bg-primary/10',
      iconText: 'gba:text-primary',
      hoverBorder: 'hover:gba:border-primary/50',
      gradient: 'gba:from-primary/5 gba:to-transparent'
    },
    success: {
      iconBg: 'gba:bg-success/10',
      iconText: 'gba:text-success',
      hoverBorder: 'hover:gba:border-success/50',
      gradient: 'gba:from-success/5 gba:to-transparent'
    },
    warning: {
      iconBg: 'gba:bg-warning/10',
      iconText: 'gba:text-warning',
      hoverBorder: 'hover:gba:border-warning/50',
      gradient: 'gba:from-warning/5 gba:to-transparent'
    },
    info: {
      iconBg: 'gba:bg-info/10',
      iconText: 'gba:text-info',
      hoverBorder: 'hover:gba:border-info/50',
      gradient: 'gba:from-info/5 gba:to-transparent'
    }
  }

  const colors = colorMap[accentColor]

  const handleClick = () => {
    if (isComingSoon) return
    if (onClick) {
      onClick()
    } else if (href) {
      // Use platform navigation
      globalThis.location.href = href
    }
  }

  return (
    <Card
      className={`gba:group gba:relative gba:overflow-hidden gba:border gba:border-border gba:bg-card gba:transition-all gba:duration-300 ${colors.hoverBorder} hover:gba:shadow-lg ${isComingSoon ? 'gba:opacity-60 gba:cursor-not-allowed' : 'gba:cursor-pointer'}`}
      onClick={handleClick}
      data-testid={testId}
      style={{ animation: `fadeInUp 0.5s ease-out ${animationDelay}s both` }}
    >
      {/* Hover gradient overlay */}
      <div
        className={`gba:absolute gba:inset-0 gba:bg-gradient-to-br ${colors.gradient} gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity gba:duration-300`}
      />

      <CardContent className="gba:relative gba:p-6">
        <div className="gba:flex gba:items-start gba:justify-between gba:mb-4">
          {/* Icon container */}
          <div
            className={`gba:w-12 gba:h-12 gba:rounded-xl ${colors.iconBg} gba:flex gba:items-center gba:justify-center gba:transition-transform gba:duration-300 group-hover:gba:scale-110`}
          >
            <Icon className={`gba:h-6 gba:w-6 ${colors.iconText}`} />
          </div>

          {/* Badge */}
          {badge && (
            <Badge variant={isComingSoon ? 'secondary' : badgeVariant} className="gba:text-xs">
              {badge}
            </Badge>
          )}
        </div>

        {/* Title */}
        <h3 className="gba:text-lg gba:font-semibold gba:text-card-foreground gba:mb-2">{title}</h3>

        {/* Description */}
        <p className="gba:text-sm gba:text-muted-foreground gba:leading-relaxed gba:mb-4">{description}</p>

        {/* Action hint */}
        <div className="gba:flex gba:items-center gba:text-sm gba:font-medium gba:text-muted-foreground group-hover:gba:text-foreground gba:transition-colors">
          {isComingSoon ? (
            <span className="gba:text-muted-foreground">Coming soon</span>
          ) : (
            <>
              <span>Get started</span>
              <ArrowRight className="gba:h-4 gba:w-4 gba:ml-1 gba:transition-transform group-hover:gba:translate-x-1" />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default ToolCard
