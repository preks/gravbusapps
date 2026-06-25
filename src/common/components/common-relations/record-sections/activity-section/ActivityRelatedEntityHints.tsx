import React from 'react'
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  Badge,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@newwork/nw-design-system'
import { BuildingsIcon, UserIcon, BriefcaseIcon, TargetIcon, CoinsIcon } from '@phosphor-icons/react'
import { navigateTo } from '@/common/utils/navigationUtils'
import type { ActivityRelatedEntity, ActivityRelatedEntityKind } from './getActivityRelatedEntities'

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  const first = parts[0][0] || ''
  const last = parts[parts.length - 1][0] || ''
  return `${first}${last}`.toUpperCase()
}

const KIND_ICONS: Record<ActivityRelatedEntityKind, React.FC<{ className?: string }>> = {
  account: BuildingsIcon,
  contact: UserIcon,
  opportunity: BriefcaseIcon,
  lead: TargetIcon,
  investment: CoinsIcon
}

const KIND_LABEL_KEY: Record<ActivityRelatedEntityKind, string> = {
  account: 'activities-related-account',
  contact: 'activities-related-contact',
  opportunity: 'activities-related-opportunity',
  lead: 'activities-related-lead',
  investment: 'activities-related-investment'
}

const CHIP_BASE_CLASS =
  'gba:inline-flex gba:max-w-[280px] gba:min-w-0 gba:items-center gba:gap-2 gba:overflow-hidden gba:rounded-md gba:px-2 gba:py-1 gba:text-muted-foreground'
const CHIP_BG_CLASS = 'gba:bg-muted/40'

export type ActivityRelatedEntityHintsProps = {
  activityId: string
  entities: ActivityRelatedEntity[]
  t: (key: string, params?: Record<string, string | number>) => string
  /**
   * When true, render chips without the muted background fill (used by the
   * activity detail sheet where chips sit directly on a surface card).
   */
  transparentChips?: boolean
}

export function ActivityRelatedEntityHints({
  activityId,
  entities,
  t,
  transparentChips = false
}: Readonly<ActivityRelatedEntityHintsProps>) {
  if (!entities.length) return null

  const chipClass = transparentChips ? CHIP_BASE_CLASS : `${CHIP_BASE_CLASS} ${CHIP_BG_CLASS}`
  const chipHoverClass = transparentChips
    ? 'hover:gba:text-foreground'
    : 'hover:gba:bg-muted/60 hover:gba:text-foreground'

  return (
    <TooltipProvider>
      <div
        className="gba:flex gba:w-full gba:min-w-0 gba:flex-wrap gba:items-center gba:gap-2 gba:overflow-hidden gba:-mt-0.5"
        data-testid={`activity-related-entities-${activityId}`}
      >
        {entities.map(entity => {
          const Icon = KIND_ICONS[entity.kind]
          const typeLabel = t(KIND_LABEL_KEY[entity.kind])
          const displayName = entity.name.trim()
            ? entity.name.trim()
            : t('activities-reference-unnamed', { entityType: typeLabel })
          const avatarSrc =
            entity.pictureThumbnail &&
            (entity.pictureThumbnail.startsWith('data:') || entity.pictureThumbnail.startsWith('http')
              ? entity.pictureThumbnail
              : `data:image/jpeg;base64,${entity.pictureThumbnail}`)
          const href = entity.href

          const inner = (
            <>
              <Avatar className="gba:h-7 gba:w-7 gba:flex-shrink-0">
                {avatarSrc ? <AvatarImage src={avatarSrc} alt={displayName} /> : null}
                <AvatarFallback className="gba:text-xs">
                  {entity.kind === 'account' ||
                  entity.kind === 'opportunity' ||
                  entity.kind === 'investment' ||
                  entity.kind === 'lead' ? (
                    <Icon className="gba:h-3.5 gba:w-3.5" />
                  ) : (
                    getInitials(displayName)
                  )}
                </AvatarFallback>
              </Avatar>
              <span className="gba:flex-1 gba:min-w-0 gba:truncate gba:text-xs gba:font-medium gba:text-foreground">
                {displayName}
              </span>
              <Badge
                variant="secondary"
                className="gba:h-5 gba:flex-shrink-0 gba:px-1.5 gba:text-[10px] gba:font-normal"
              >
                {typeLabel}
              </Badge>
            </>
          )

          return (
            <Tooltip key={entity.key}>
              <TooltipTrigger asChild>
                {href ? (
                  <a
                    href={href}
                    onClick={e => {
                      e.preventDefault()
                      navigateTo(href)
                    }}
                    className={`${chipClass} gba:transition-colors ${chipHoverClass}`}
                    data-testid={`activity-related-entity-${activityId}-${entity.kind}`}
                  >
                    {inner}
                  </a>
                ) : (
                  <span
                    className={`${chipClass} gba:cursor-default`}
                    data-testid={`activity-related-entity-${activityId}-${entity.kind}`}
                  >
                    {inner}
                  </span>
                )}
              </TooltipTrigger>
              <TooltipContent side="top" className="gba:max-w-xs">
                <span className="gba:break-words">{displayName}</span>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </TooltipProvider>
  )
}
