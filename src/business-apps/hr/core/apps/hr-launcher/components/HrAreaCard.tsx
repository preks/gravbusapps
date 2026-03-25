import { Badge, Card, CardContent } from '@newwork/nw-design-system'
import { ArrowRightIcon, type Icon as PhosphorIcon } from '@phosphor-icons/react'
import type { HrAreaLink, HrAreaTone } from '../types'

interface HrAreaCardProps {
  title: string
  description: string
  icon: PhosphorIcon
  badgeLabel: string
  badgeTone: HrAreaTone
  links: HrAreaLink[]
  onExplore?: () => void
  onLinkClick: (path: string) => void
  'data-testid'?: string
}

export function HrAreaCard({
  title,
  description,
  icon: Icon,
  badgeLabel,
  badgeTone,
  links,
  onExplore,
  onLinkClick,
  'data-testid': testId = 'hr-area-card'
}: HrAreaCardProps) {
  const toneMap: Record<
    HrAreaTone,
    {
      iconTile: string
      iconColor: string
      overlay: string
      badge: string
      linkHover: string
      ctaHover: string
    }
  > = {
    core: {
      iconTile: 'gba:bg-info/10',
      iconColor: 'gba:text-info',
      overlay: 'gba:from-info/10 gba:to-info/0',
      badge: 'gba:border gba:border-info/15 gba:bg-info/10 gba:text-info',
      linkHover: 'hover:gba:bg-info/5',
      ctaHover: 'hover:gba:text-info'
    },
    payroll: {
      iconTile: 'gba:bg-success/10',
      iconColor: 'gba:text-success',
      overlay: 'gba:from-success/10 gba:to-success/0',
      badge: 'gba:border gba:border-success/15 gba:bg-success/10 gba:text-success',
      linkHover: 'hover:gba:bg-success/5',
      ctaHover: 'hover:gba:text-success'
    },
    time: {
      iconTile: 'gba:bg-primary/10',
      iconColor: 'gba:text-primary',
      overlay: 'gba:from-primary/10 gba:to-primary/0',
      badge: 'gba:border gba:border-primary/15 gba:bg-primary/10 gba:text-primary',
      linkHover: 'hover:gba:bg-primary/5',
      ctaHover: 'hover:gba:text-primary'
    },
    insights: {
      iconTile: 'gba:bg-ai/10',
      iconColor: 'gba:text-ai',
      overlay: 'gba:from-ai/10 gba:to-ai/0',
      badge: 'gba:border gba:border-ai/15 gba:bg-ai/10 gba:text-ai',
      linkHover: 'hover:gba:bg-ai/5',
      ctaHover: 'hover:gba:text-ai'
    },
    talent: {
      iconTile: 'gba:bg-success/5 gba:border gba:border-success/15',
      iconColor: 'gba:text-success',
      overlay: 'gba:from-success/12 gba:via-success/5 gba:to-transparent',
      badge: 'gba:border gba:border-success/20 gba:bg-success/12 gba:text-success',
      linkHover: 'hover:gba:bg-success/5',
      ctaHover: 'hover:gba:text-success'
    },
    performance: {
      iconTile: 'gba:bg-warning/10',
      iconColor: 'gba:text-warning',
      overlay: 'gba:from-warning/10 gba:to-warning/0',
      badge: 'gba:border gba:border-warning/15 gba:bg-warning/10 gba:text-warning',
      linkHover: 'hover:gba:bg-warning/5',
      ctaHover: 'hover:gba:text-warning'
    }
  }

  const colors = toneMap[badgeTone]

  return (
    <Card
      className="
        gba:group gba:relative gba:flex gba:h-full gba:flex-col gba:overflow-hidden
        gba:rounded-2xl gba:border gba:border-border/60 gba:bg-card/95
        gba:shadow-sm gba:transition-all gba:duration-300
        gba:hover:-translate-y-1 gba:hover:shadow-lg
      "
      data-testid={testId}
    >
      <div
        className={`
          gba:absolute gba:inset-0 gba:bg-gradient-to-br ${colors.overlay} gba:opacity-0
          gba:transition-opacity gba:duration-300 gba:group-hover:opacity-100
        `}
      />
      <CardContent className="gba:relative gba:z-10 gba:flex gba:h-full gba:flex-col gba:p-6">
        <div className="gba:mb-5 gba:flex gba:items-start gba:justify-between gba:gap-3">
          <div className={`gba:rounded-xl gba:p-2.5 ${colors.iconTile}`}>
            <Icon className={`gba:h-6 gba:w-6 ${colors.iconColor}`} weight="duotone" />
          </div>
          <Badge variant="secondary" className={`gba:text-xs gba:font-medium ${colors.badge}`}>
            {badgeLabel}
          </Badge>
        </div>

        <h3 className="gba:mb-2 gba:text-xl gba:font-semibold gba:text-foreground">{title}</h3>
        <p className="gba:mb-5 gba:text-sm gba:leading-6 gba:text-muted-foreground">{description}</p>

        <div className="gba:flex-1 gba:space-y-2.5">
          {links.map(link => (
            <div key={link.label}>
              {link.path ? (
                <button
                  type="button"
                  className={`
                    gba:-mx-1.5 gba:flex gba:w-full gba:items-center gba:justify-between gba:gap-3
                    gba:rounded-lg gba:px-2 gba:py-2
                    gba:text-sm gba:text-muted-foreground
                    gba:transition-colors gba:duration-200
                    hover:gba:text-foreground ${colors.linkHover}
                  `}
                  onClick={() => {
                    if (link.path) {
                      onLinkClick(link.path)
                    }
                  }}
                  data-testid={`${testId}-${link.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                >
                  <span>{link.label}</span>
                  <ArrowRightIcon className="gba:h-3.5 gba:w-3.5 gba:opacity-40" />
                </button>
              ) : (
                <div
                  className="
                    gba:-mx-1.5 gba:flex gba:items-center gba:justify-between gba:gap-3
                    gba:rounded-lg gba:px-2 gba:py-2
                    gba:text-sm gba:text-muted-foreground/70
                  "
                  data-testid={`${testId}-${link.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                >
                  <span>{link.label}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {onExplore ? (
          <button
            type="button"
            onClick={onExplore}
            className={`
              gba:mt-7 gba:flex gba:items-center gba:gap-2 gba:text-sm gba:font-medium
              gba:text-muted-foreground gba:transition-colors gba:group-hover:text-foreground
              ${colors.ctaHover}
            `}
            data-testid={`${testId}-explore`}
          >
            <span>Explore {title}</span>
            <ArrowRightIcon className="gba:h-3.5 gba:w-3.5 gba:transition-transform gba:group-hover:translate-x-1" />
          </button>
        ) : (
          <div
            className="
              gba:mt-7 gba:flex gba:items-center gba:gap-2 gba:text-sm gba:font-medium
              gba:text-muted-foreground/70
            "
            data-testid={`${testId}-explore`}
          >
            <span>Explore {title}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default HrAreaCard
