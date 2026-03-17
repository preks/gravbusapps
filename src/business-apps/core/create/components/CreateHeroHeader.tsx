import React from 'react'
import { Badge, Button } from '@newwork/nw-design-system'
import { ArrowLeft } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PremiumHeroBackground } from '@/common/components/premium-hero-background'

export type CreateHeroBadge = {
  label: string
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  className?: string
  'data-testid'?: string
}

export interface CreateHeroHeaderProps {
  icon: LucideIcon
  appLabel: string
  title: string
  description?: string
  onBack?: () => void
  actions?: React.ReactNode
  badges?: CreateHeroBadge[]
  size?: 'default' | 'large'
  className?: string
  'data-testid'?: string
}

export const CreateHeroHeader: React.FC<CreateHeroHeaderProps> = ({
  icon: Icon,
  appLabel,
  title,
  description,
  onBack,
  actions,
  badges,
  size = 'default',
  className,
  'data-testid': testId = 'create-hero-header'
}) => {
  const isLarge = size === 'large'

  return (
    <div
      className={['gba:relative gba:overflow-hidden gba:shrink-0', className].filter(Boolean).join(' ')}
      data-testid={testId}
    >
      <PremiumHeroBackground data-testid={`${testId}-background`} />
      <div className="gba:absolute gba:inset-0 gba:pointer-events-none gba:space-hero-overlay" aria-hidden />

      <div className={`gba:relative gba:px-6 ${isLarge ? 'gba:py-8' : 'gba:py-5'}`}>
        <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
          <div className={`gba:flex gba:items-start ${isLarge ? 'gba:gap-4' : 'gba:gap-3'}`}>
            <div
              className={`gba:flex gba:items-center gba:justify-center gba:rounded-lg gba:bg-white/15 ${
                isLarge ? 'gba:w-14 gba:h-14 gba:rounded-xl' : 'gba:w-10 gba:h-10'
              }`}
            >
              <Icon className={isLarge ? 'gba:h-7 gba:w-7 gba:text-white' : 'gba:h-5 gba:w-5 gba:text-white'} />
            </div>
            <div className={`gba:flex gba:flex-col ${isLarge ? 'gba:gap-1' : 'gba:gap-0.5'}`}>
              <span className="gba:text-xs gba:font-medium gba:tracking-[0.3em] gba:text-white/60 gba:uppercase">
                {appLabel}
              </span>
              <div
                className={
                  isLarge
                    ? 'gba:font-funnel-display gba:text-3xl gba:sm:text-4xl gba:font-semibold gba:leading-tight gba:text-white gba:tracking-tight'
                    : 'gba:text-xl gba:font-semibold gba:leading-tight gba:text-white'
                }
                data-testid={`${testId}-title`}
              >
                {title}
              </div>
              {description ? (
                <span
                  className={isLarge ? 'gba:text-base gba:text-white/70 gba:mt-1' : 'gba:text-sm gba:text-white/80'}
                  data-testid={`${testId}-description`}
                >
                  {description}
                </span>
              ) : null}
            </div>
          </div>

          <div className="gba:flex gba:items-center gba:gap-2">
            {onBack ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onBack}
                className="gba:bg-white/10 gba:border-white/20 gba:text-white gba:hover:bg-white/15"
                data-testid={`${testId}-back`}
              >
                <ArrowLeft className="gba:h-4 gba:w-4 gba:mr-2" />
                Back
              </Button>
            ) : null}
            {actions}
          </div>
        </div>

        {badges && badges.length > 0 ? (
          <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2 gba:mt-3" data-testid={`${testId}-badges`}>
            {badges.map((b, idx) => (
              <Badge
                key={`${b.label}-${idx}`}
                variant={b.variant || 'secondary'}
                className={['gba:bg-white/15 gba:text-white gba:border-none', b.className].filter(Boolean).join(' ')}
                data-testid={b['data-testid'] || `${testId}-badge-${idx}`}
              >
                {b.label}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default CreateHeroHeader
