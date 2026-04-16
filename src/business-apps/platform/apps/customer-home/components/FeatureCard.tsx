import React from 'react'
import { Card, CardContent } from '@newwork/nw-design-system'
import { ArrowRight } from '@phosphor-icons/react'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'

export interface FeatureCardProps {
  title: string
  description: string
  icon: PhosphorIcon
  onClick: () => void
  badge?: string
  animationDelay?: number
  'data-testid'?: string
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  icon: Icon,
  onClick,
  badge,
  animationDelay = 0,
  'data-testid': testId
}) => {
  return (
    <Card
      className="gba:group gba:relative gba:overflow-hidden gba:border gba:border-border gba:bg-card gba:transition-all gba:duration-300 hover:gba:shadow-lg hover:gba:scale-[1.02] gba:cursor-pointer"
      onClick={onClick}
      data-testid={testId}
      style={{ animation: `fadeInUp 0.5s ease-out ${animationDelay}s both` }}
    >
      <div className="gba:absolute gba:inset-0 gba:bg-gradient-to-br gba:from-primary/5 gba:to-transparent gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity gba:duration-300" />

      <CardContent className="gba:relative gba:p-5">
        <div className="gba:flex gba:items-start gba:justify-between gba:gap-3 gba:mb-3">
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:w-10 gba:h-10 gba:rounded-xl gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:flex-shrink-0 group-hover:gba:bg-primary/15 gba:transition-colors gba:duration-300">
              <Icon className="gba:w-5 gba:h-5 gba:text-primary" weight="duotone" />
            </div>
            <h3 className="gba:font-funnel-display gba:text-lg gba:font-semibold gba:tracking-tight gba:text-foreground">
              {title}
            </h3>
          </div>
          {badge && (
            <span className="gba:text-[9px] gba:font-semibold gba:tracking-[0.1em] gba:uppercase gba:text-primary/70 gba:bg-primary/10 gba:px-2 gba:py-0.5 gba:rounded-full gba:flex-shrink-0">
              {badge}
            </span>
          )}
        </div>

        <p className="gba:text-sm gba:text-muted-foreground gba:leading-relaxed gba:mb-4">{description}</p>

        <div className="gba:flex gba:items-center gba:text-sm gba:font-medium gba:text-muted-foreground group-hover:gba:text-primary gba:transition-colors">
          <ArrowRight
            className="gba:w-4 gba:h-4 gba:transition-transform group-hover:gba:translate-x-1"
            weight="bold"
          />
        </div>
      </CardContent>
    </Card>
  )
}

export default FeatureCard
