import React from 'react'
import { Card, CardHeader, CardTitle, CardDescription, Badge } from '@newwork/nw-design-system'
import { LucideIcon, ArrowRight } from 'lucide-react'

export interface ToolCardProps {
  title: string
  description: string
  icon: LucideIcon
  href: string
  badge?: string
  badgeVariant?: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'info' | 'offline'
  isComingSoon?: boolean
  accentColor?: 'primary' | 'success' | 'warning' | 'info' | 'ai' | 'destructive' | 'offline'
  onClick?: () => void
  animationDelay?: number
  featured?: boolean
  'data-testid'?: string
}

const accentColorMap = {
  primary: 'gba:from-primary/20 gba:to-primary/5',
  success: 'gba:from-success/20 gba:to-success/5',
  warning: 'gba:from-warning/20 gba:to-warning/5',
  info: 'gba:from-info/20 gba:to-info/5',
  ai: 'gba:from-ai/20 gba:to-ai/5',
  destructive: 'gba:from-destructive/20 gba:to-destructive/5',
  offline: 'gba:from-offline/20 gba:to-offline/5'
}

const iconColorMap = {
  primary: 'gba:text-primary',
  success: 'gba:text-success',
  warning: 'gba:text-warning',
  info: 'gba:text-info',
  ai: 'gba:text-ai',
  destructive: 'gba:text-destructive',
  offline: 'gba:text-offline'
}

export const ToolCard: React.FC<ToolCardProps> = ({
  title,
  description,
  icon: Icon,
  badge,
  badgeVariant = 'default',
  isComingSoon = false,
  accentColor = 'primary',
  onClick,
  animationDelay = 0,
  featured = false,
  'data-testid': testId
}) => {
  // Featured card - horizontal hero layout
  if (featured) {
    return (
      <Card
        className={`gba:group gba:relative gba:overflow-hidden gba:transition-all gba:duration-300 gba:hover:shadow-xl gba:cursor-pointer gba:hover:-translate-y-1 gba:bg-gradient-to-r ${accentColorMap[accentColor]}`}
        onClick={onClick}
        data-testid={testId}
        style={{ animation: `fadeInUp 0.5s ease-out ${animationDelay}s both` }}
      >
        {/* Animated gradient overlay */}
        <div className="gba:absolute gba:inset-0 gba:bg-gradient-to-r gba:from-ai/10 gba:via-transparent gba:to-ai/10 gba:opacity-50" />

        <CardHeader className="gba:relative gba:py-6 gba:px-6">
          <div className="gba:flex gba:flex-col gba:md:flex-row gba:items-start gba:md:items-center gba:gap-4">
            {/* Large icon */}
            <div
              className={`gba:p-4 gba:rounded-xl gba:bg-background/80 gba:shadow-lg gba:group-hover:scale-110 gba:transition-transform gba:duration-300`}
            >
              <Icon className={`gba:h-10 gba:w-10 ${iconColorMap[accentColor]}`} />
            </div>

            {/* Content */}
            <div className="gba:flex-1">
              <div className="gba:flex gba:items-center gba:gap-3 gba:mb-2">
                <CardTitle className="gba:text-2xl gba:font-bold gba:flex gba:items-center gba:gap-2">
                  {title}
                  <ArrowRight className="gba:h-5 gba:w-5 gba:opacity-0 gba:group-hover:opacity-100 gba:transition-all gba:duration-300 gba:transform gba:group-hover:translate-x-1" />
                </CardTitle>
                {badge && (
                  <Badge variant={badgeVariant} className="gba:text-xs">
                    {badge}
                  </Badge>
                )}
              </div>
              <CardDescription className="gba:text-base gba:text-muted-foreground gba:max-w-2xl">
                {description}
              </CardDescription>
            </div>

            {/* CTA hint */}
            <div className="gba:hidden gba:md:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground gba:group-hover:text-foreground gba:transition-colors">
              <span>Start chatting</span>
              <ArrowRight className="gba:h-4 gba:w-4" />
            </div>
          </div>
        </CardHeader>
      </Card>
    )
  }

  // Standard card layout
  return (
    <Card
      className={`gba:group gba:relative gba:overflow-hidden gba:transition-all gba:duration-300 gba:hover:shadow-lg ${
        isComingSoon ? 'gba:opacity-60 gba:cursor-not-allowed' : 'gba:cursor-pointer gba:hover:-translate-y-1'
      }`}
      onClick={isComingSoon ? undefined : onClick}
      data-testid={testId}
      style={{ animation: `fadeInUp 0.5s ease-out ${animationDelay}s both` }}
    >
      {/* Gradient accent background */}
      <div
        className={`gba:absolute gba:inset-0 gba:bg-gradient-to-br ${accentColorMap[accentColor]} gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity gba:duration-300`}
      />

      <CardHeader className="gba:relative gba:pb-4">
        <div className="gba:flex gba:items-start gba:justify-between gba:mb-3">
          {/* Icon with accent color */}
          <div
            className={`gba:p-2 gba:rounded-lg gba:bg-muted/50 gba:group-hover:bg-background/80 gba:transition-colors`}
          >
            <Icon className={`gba:h-6 gba:w-6 ${iconColorMap[accentColor]}`} />
          </div>

          {/* Badge */}
          {badge && (
            <Badge variant={badgeVariant} className="gba:text-xs">
              {badge}
            </Badge>
          )}
        </div>

        <CardTitle className="gba:text-lg gba:font-semibold gba:mb-2 gba:flex gba:items-center gba:gap-2">
          {title}
          {!isComingSoon && (
            <ArrowRight className="gba:h-4 gba:w-4 gba:opacity-0 gba:group-hover:opacity-100 gba:transition-all gba:duration-300 gba:transform gba:group-hover:translate-x-1" />
          )}
        </CardTitle>

        <CardDescription className="gba:text-sm gba:text-muted-foreground">{description}</CardDescription>
      </CardHeader>
    </Card>
  )
}
