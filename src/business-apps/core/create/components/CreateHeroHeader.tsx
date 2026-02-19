import React from 'react'
import { Badge, Button } from '@newwork/nw-design-system'
import { ArrowLeft } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { SpaceHeroBackground } from '@/business-apps/platform/apps/spaces/components/SpaceHeroBackground'

// Video background - same logic as FlowStudio
const hostedVideoUrl = typeof import.meta !== 'undefined' && import.meta.env?.VITE_SPACE_HERO_VIDEO_URL
const localVideoUrl = '/space-hero-background.mp4'
const useVideo = hostedVideoUrl || (typeof import.meta !== 'undefined' && import.meta.env?.DEV && localVideoUrl)
const HERO_VIDEO_SRC = hostedVideoUrl || localVideoUrl

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
  className,
  'data-testid': testId = 'create-hero-header'
}) => {
  return (
    <div
      className={['gba:relative gba:overflow-hidden gba:shrink-0', className].filter(Boolean).join(' ')}
      data-testid={testId}
    >
      {useVideo ? (
        <video
          src={HERO_VIDEO_SRC}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          className="gba:absolute gba:inset-0 gba:w-full gba:h-full gba:object-cover gba:pointer-events-none"
          aria-hidden
          data-testid={`${testId}-video`}
        />
      ) : (
        <SpaceHeroBackground />
      )}

      {/* Dark overlay for text readability */}
      {/* eslint-disable newwork-local/no-hardcoded-colors */}
      <div
        className="gba:absolute gba:inset-0 gba:pointer-events-none"
        style={{
          background: 'linear-gradient(105deg, rgba(15, 23, 42, 0.38) 0%, rgba(15, 23, 42, 0.12) 40%, transparent 60%)'
        }}
        aria-hidden
      />
      {/* eslint-enable newwork-local/no-hardcoded-colors */}

      <div className="gba:relative gba:px-6 gba:py-5">
        <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
          <div className="gba:flex gba:items-start gba:gap-3">
            <div className="gba:flex gba:items-center gba:justify-center gba:w-10 gba:h-10 gba:rounded-lg gba:bg-white/15">
              <Icon className="gba:h-5 gba:w-5 gba:text-white" />
            </div>
            <div className="gba:flex gba:flex-col gba:gap-0.5">
              <span className="gba:text-xs gba:font-medium gba:tracking-[0.3em] gba:text-white/60 gba:uppercase">
                {appLabel}
              </span>
              <div
                className="gba:text-xl gba:font-semibold gba:leading-tight gba:text-white"
                data-testid={`${testId}-title`}
              >
                {title}
              </div>
              {description ? (
                <span className="gba:text-sm gba:text-white/80" data-testid={`${testId}-description`}>
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
