import React from 'react'
import { Badge } from '@newwork/nw-design-system'
import { navigateTo } from '@/common/utils/navigationUtils'
import type { GenericActivity } from '../../types'
import type { PersonalWorkspaceConfig } from '../../types/configTypes'
import { getEntityDisplayName } from '../../utils'

export interface ActivityBadgeProps {
  activity: GenericActivity
  config: PersonalWorkspaceConfig
  'data-testid'?: string
}

/**
 * Generic Activity Badge
 * Displays entity association for an activity with click navigation
 */
export const ActivityBadge: React.FC<ActivityBadgeProps> = ({ activity, config, 'data-testid': dataTestId }) => {
  const isUnlinked = !activity.accountId && !activity.contactId && !activity.leadId && !activity.opportunityId

  const handleEntityClick = (e: React.MouseEvent) => {
    e.stopPropagation()

    if (activity.accountId && activity.account) {
      const url = config.navigation.buildEntityUrl('account', activity.accountId)
      navigateTo(url)
    } else if (activity.contactId && activity.contact) {
      const url = config.navigation.buildEntityUrl('contact', activity.contactId)
      navigateTo(url)
    } else if (activity.leadId && activity.lead) {
      const url = config.navigation.buildEntityUrl('lead', activity.leadId)
      navigateTo(url)
    } else if (activity.opportunityId && activity.opportunity) {
      const url = config.navigation.buildEntityUrl('opportunity', activity.opportunityId)
      navigateTo(url)
    }
  }

  if (isUnlinked) {
    return (
      <Badge variant="secondary" data-testid={dataTestId}>
        General
      </Badge>
    )
  }

  // Show entity type badge with click handler
  if (activity.accountId && activity.account) {
    return (
      <Badge
        variant="secondary"
        data-testid={dataTestId}
        onClick={handleEntityClick}
        className="gba:cursor-pointer hover:gba:opacity-80"
      >
        {getEntityDisplayName(activity.account, 'account')}
      </Badge>
    )
  }

  if (activity.contactId && activity.contact) {
    return (
      <Badge
        variant="secondary"
        data-testid={dataTestId}
        onClick={handleEntityClick}
        className="gba:cursor-pointer hover:gba:opacity-80"
      >
        {getEntityDisplayName(activity.contact, 'contact')}
      </Badge>
    )
  }

  if (activity.leadId && activity.lead) {
    return (
      <Badge
        variant="secondary"
        data-testid={dataTestId}
        onClick={handleEntityClick}
        className="gba:cursor-pointer hover:gba:opacity-80"
      >
        {getEntityDisplayName(activity.lead, 'lead')}
      </Badge>
    )
  }

  if (activity.opportunityId && activity.opportunity) {
    return (
      <Badge
        variant="secondary"
        data-testid={dataTestId}
        onClick={handleEntityClick}
        className="gba:cursor-pointer hover:gba:opacity-80"
      >
        {getEntityDisplayName(activity.opportunity, 'opportunity')}
      </Badge>
    )
  }

  return null
}

export default ActivityBadge
