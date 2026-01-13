import React from 'react'
import { Card, CardHeader, CardTitle, CardDescription, Badge } from '@newwork/nw-design-system'
import { LucideIcon, ArrowRight } from 'lucide-react'

export interface DomainCardProps {
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

export const DomainCard: React.FC<DomainCardProps> = ({
  title,
  description,
  icon: Icon,
  badge,
  badgeVariant = 'default',
  isComingSoon = false,
  accentColor = 'primary',
  onClick,
  animationDelay = 0,
  'data-testid': testId
}) => {
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
