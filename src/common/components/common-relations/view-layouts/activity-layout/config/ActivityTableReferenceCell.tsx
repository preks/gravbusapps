'use client'

import React from 'react'
import { Badge, useTranslation } from '@newwork/nw-design-system'
import {
  getActivityRelatedEntities,
  type ActivityRelatedEntityKind,
  type ActivityWithInvestment
} from '@/common/components/common-relations/record-sections/activity-section/getActivityRelatedEntities'
import activitySectionTranslations from '@/common/components/common-relations/record-sections/activity-section/_i18n'
import { UserIcon, BuildingIcon, TargetIcon, HandshakeIcon } from '@phosphor-icons/react'

export type ActivityTableReferenceEmptyVariant = 'general' | 'no-reference' | 'unlinked'

function kindToDisplayType(kind: ActivityRelatedEntityKind): string {
  const map: Record<ActivityRelatedEntityKind, string> = {
    account: 'Account',
    contact: 'Contact',
    lead: 'Lead',
    opportunity: 'Opportunity',
    investment: 'Investment'
  }
  return map[kind]
}

function getEntityTypeIcon(entityType: string) {
  switch (entityType) {
    case 'Contact':
      return <UserIcon size={14} />
    case 'Lead':
      return <TargetIcon size={14} />
    case 'Opportunity':
      return <HandshakeIcon size={14} />
    case 'Account':
      return <BuildingIcon size={14} />
    case 'Investment':
      return <HandshakeIcon size={14} />
    default:
      return <UserIcon size={14} />
  }
}

export interface ActivityTableReferenceCellProps<TActivity> {
  activity: TActivity
  onReferenceClick: (activity: TActivity) => void
  emptyVariant: ActivityTableReferenceEmptyVariant
  dataTestId?: string
  /** Preserves legacy test id for activity360 unlinked badge */
  unlinkedBadgeTestId?: string
  singleReferenceButtonClassName?: string
}

export function ActivityTableReferenceCell<TActivity>({
  activity,
  onReferenceClick,
  emptyVariant,
  dataTestId,
  unlinkedBadgeTestId,
  singleReferenceButtonClassName
}: Readonly<ActivityTableReferenceCellProps<TActivity>>) {
  const { t } = useTranslation(activitySectionTranslations)
  const inv = activity as unknown as ActivityWithInvestment
  const entities = getActivityRelatedEntities(inv, { showAllRelatedEntityChips: true })
  const linkCount = entities.length

  if (linkCount === 0) {
    if (emptyVariant === 'general') {
      return (
        <div className="gba:flex gba:items-center gba:gap-1.5">
          <Badge variant="outline" className="gba:text-xs">
            {t('activities-detail-general')}
          </Badge>
        </div>
      )
    }
    if (emptyVariant === 'unlinked') {
      return (
        <Badge variant="secondary" data-testid={unlinkedBadgeTestId ?? dataTestId}>
          {t('activities-reference-unlinked')}
        </Badge>
      )
    }
    return (
      <span className="gba:text-sm gba:text-muted-foreground gba:italic" data-testid={dataTestId}>
        {t('activities-reference-none')}
      </span>
    )
  }

  if (linkCount > 1) {
    return (
      <span
        className="gba:text-sm gba:text-muted-foreground"
        title={t('activities-reference-multiple-hint')}
        data-testid={dataTestId}
      >
        {t('activities-reference-multiple')}
      </span>
    )
  }

  const single = entities[0]
  const displayType = kindToDisplayType(single.kind)
  const displayName = single.name.trim()
  const resolvedName = displayName.length > 0 ? displayName : null

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onReferenceClick(activity)
  }

  const baseButton =
    'gba:flex gba:flex-col gba:gap-1 gba:cursor-pointer gba:hover:bg-accent gba:rounded gba:transition-colors gba:border-0 gba:bg-transparent gba:text-left gba:overflow-hidden gba:max-w-[200px]'
  const buttonClass = singleReferenceButtonClassName
    ? `${baseButton} ${singleReferenceButtonClassName.trim()}`
    : `${baseButton} gba:p-1 gba:-m-1`

  return (
    <button type="button" className={buttonClass} onClick={handleClick} data-testid={dataTestId}>
      {resolvedName ? (
        <span
          className="gba:text-sm gba:font-medium gba:text-primary gba:truncate gba:hover:gba:underline"
          title={resolvedName}
        >
          {resolvedName}
        </span>
      ) : (
        <span className="gba:text-sm gba:italic gba:text-muted-foreground gba:truncate">
          {t('activities-reference-unnamed', { entityType: displayType })}
        </span>
      )}
      <div className="gba:flex gba:items-center gba:gap-1.5 gba:text-xs gba:text-muted-foreground">
        {getEntityTypeIcon(displayType)}
        <span>{displayType}</span>
      </div>
    </button>
  )
}
