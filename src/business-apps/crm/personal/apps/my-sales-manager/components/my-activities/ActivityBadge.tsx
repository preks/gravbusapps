import React from 'react'
import { Badge } from '@newwork/nw-design-system'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import type { MySalesActivity } from '../../types'

export interface ActivityBadgeProps {
  activity: MySalesActivity
  'data-testid'?: string
}

export const ActivityBadge: React.FC<ActivityBadgeProps> = ({ activity, 'data-testid': dataTestId }) => {
  const isUnlinked = !activity.accountId && !activity.contactId && !activity.leadId && !activity.opportunityId

  const handleEntityClick = (e: React.MouseEvent) => {
    e.stopPropagation()

    if (activity.accountId && activity.account) {
      const url = buildPlatformUrl('/platform/crm/account-record', { accountId: activity.accountId })
      navigateTo(url)
    } else if (activity.contactId && activity.contact) {
      const url = buildPlatformUrl('/platform/crm/contact-record', { contactId: activity.contactId })
      navigateTo(url)
    } else if (activity.leadId && activity.lead) {
      const url = buildPlatformUrl('/platform/crm/lead-record', { leadId: activity.leadId })
      navigateTo(url)
    } else if (activity.opportunityId && activity.opportunity) {
      const url = buildPlatformUrl('/platform/crm/opportunity-record', { opportunityId: activity.opportunityId })
      navigateTo(url)
    }
  }

  if (isUnlinked) {
    return (
      <Badge variant="outline" data-testid={dataTestId}>
        General
      </Badge>
    )
  }

  // Show entity type badge with click handler
  if (activity.accountId && activity.account) {
    return (
      <Badge
        variant="default"
        data-testid={dataTestId}
        onClick={handleEntityClick}
        className="gba:cursor-pointer hover:gba:opacity-80"
      >
        {activity.account.name}
      </Badge>
    )
  }

  if (activity.contactId && activity.contact) {
    return (
      <Badge
        variant="default"
        data-testid={dataTestId}
        onClick={handleEntityClick}
        className="gba:cursor-pointer hover:gba:opacity-80"
      >
        {activity.contact.firstName} {activity.contact.lastName}
      </Badge>
    )
  }

  if (activity.leadId && activity.lead) {
    return (
      <Badge
        variant="default"
        data-testid={dataTestId}
        onClick={handleEntityClick}
        className="gba:cursor-pointer hover:gba:opacity-80"
      >
        {activity.lead.name}
      </Badge>
    )
  }

  if (activity.opportunityId && activity.opportunity) {
    return (
      <Badge
        variant="default"
        data-testid={dataTestId}
        onClick={handleEntityClick}
        className="gba:cursor-pointer hover:gba:opacity-80"
      >
        {activity.opportunity.name}
      </Badge>
    )
  }

  return null
}

export default ActivityBadge
