import React, { useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, EmptyState } from '@newwork/nw-design-system'
import { Calendar } from 'lucide-react'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'

export interface ActivityItem {
  id: string
  title: string
  type: string
  owner?: string
  relatedTo?: string
  createdAt: string | number | Date
  completedAt?: string | number | Date
  relatedEntity?: {
    type: 'opportunity' | 'lead' | 'contact' | 'account'
    id: string
    name: string
  }
}

export interface ActivitySummaryProps {
  activities: ActivityItem[]
  moduleColor?: string
  source?: 'investments' | 'customer-relations'
}

export const ActivitySummary: React.FC<ActivitySummaryProps> = ({ activities, source = 'investments' }) => {
  // Navigation handler for activity clicks
  const handleActivityClick = useCallback(
    (activity: ActivityItem) => {
      if (!activity.relatedEntity) {
        return
      }

      const { type, id } = activity.relatedEntity
      const isInvestmentSource = source === 'investments'
      let url: string

      switch (type) {
        case 'opportunity':
          url = buildPlatformUrl(
            isInvestmentSource ? '/platform/irm/opportunity-record' : '/platform/crm/opportunity-record',
            {
              opportunityId: id,
              source: source,
              fromView: 'dashboard',
              fromActivity: activity.id
            }
          )
          break
        case 'lead':
          url = buildPlatformUrl(isInvestmentSource ? '/platform/irm/lead-record' : '/platform/crm/lead-record', {
            leadId: id,
            source: source,
            fromView: 'dashboard',
            fromActivity: activity.id
          })
          break
        case 'contact':
          url = buildPlatformUrl(isInvestmentSource ? '/platform/irm/contact-record' : '/platform/crm/contact-record', {
            contactId: id,
            source: source,
            fromView: 'dashboard',
            fromActivity: activity.id
          })
          break
        case 'account':
          url = buildPlatformUrl(isInvestmentSource ? '/platform/irm/account-record' : '/platform/crm/account-record', {
            accountId: id,
            source: source,
            fromView: 'dashboard',
            fromActivity: activity.id
          })
          break
        default:
          return
      }

      navigateTo(url)
    },
    [source]
  )
  return (
    <Card className="gba:h-full">
      <CardHeader>
        <div className="gba:flex gba:items-center gba:gap-3">
          <div className="gba:p-2 gba:bg-blue-100 gba:rounded-lg">
            <Calendar className="gba:h-6 gba:w-6 gba:text-blue-600" />
          </div>
          <CardTitle>Today's Activities</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {activities.length > 0 ? (
          <div className="gba:space-y-4 gba:max-h-64 gba:overflow-y-auto">
            {activities.slice(0, 5).map(activity => (
              <Card
                key={activity.id}
                className={`gba:transition-all gba:duration-200 gba:hover:shadow-md ${
                  activity.relatedEntity ? 'gba:cursor-pointer gba:hover:bg-accent' : ''
                }`}
                onClick={() => activity.relatedEntity && handleActivityClick(activity)}
                data-testid={`activity-item-${activity.id}`}
              >
                <CardHeader className="gba:pb-2">
                  <div className="gba:flex gba:items-center gba:gap-3">
                    <div className="gba:w-8 gba:h-8 gba:bg-orange-100 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
                      <span className="gba:text-orange-600 gba:text-xs gba:font-medium">
                        {activity.type.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <CardTitle className="gba:text-sm gba:truncate">{activity.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="gba:mb-2">
                    {activity.type} • {activity.owner}
                  </CardDescription>
                  {activity.relatedTo !== 'No relation' && (
                    <div className="gba:text-xs gba:text-blue-600 gba:mb-1">Related to: {activity.relatedTo}</div>
                  )}
                  <div className="gba:text-xs gba:text-gray-400">
                    {new Date(activity.createdAt).toLocaleTimeString()}
                    {activity.completedAt && <span className="gba:text-green-600 gba:ml-2">✓ Completed</span>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            type="no-data"
            title="No Activities"
            description="No activities scheduled for today."
            data-testid="activity-summary-empty-state"
          />
        )}
      </CardContent>
    </Card>
  )
}

export default ActivitySummary
