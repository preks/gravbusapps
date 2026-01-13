import React, { useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@newwork/nw-design-system'
import { Calendar } from 'lucide-react'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { usePagination } from '../../hooks/usePagination'
import { PaginationControls } from './PaginationControls'

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

/**
 * Navigation configuration for activity-related entities
 * Each module (CRM, IRM, etc.) provides its specific URL patterns
 */
export interface ActivityNavigationConfig {
  opportunityUrl: string
  leadUrl: string
  contactUrl: string
  accountUrl: string
  sourceParam: string
}

export interface ActivitySummaryProps {
  activities: ActivityItem[]
  totalCount?: number
  navigationConfig: ActivityNavigationConfig
  onPageChange?: (page: number, pageSize: number) => void
}

export const ActivitySummary: React.FC<ActivitySummaryProps> = ({
  activities,
  totalCount = 0,
  navigationConfig,
  onPageChange
}) => {
  const { currentPage, totalPages, handleNextPage, handlePrevPage, getPaginationInfo } = usePagination({
    totalCount,
    pageSize: 20,
    onPageChange
  })

  const { startItem, endItem, totalItems } = getPaginationInfo()

  // Navigation handler for activity clicks
  const handleActivityClick = useCallback(
    (activity: ActivityItem) => {
      if (!activity.relatedEntity) {
        return
      }

      const { type, id } = activity.relatedEntity
      let url: string

      switch (type) {
        case 'opportunity':
          url = buildPlatformUrl(navigationConfig.opportunityUrl, {
            opportunityId: id,
            source: navigationConfig.sourceParam,
            fromView: 'dashboard',
            fromActivity: activity.id
          })
          break
        case 'lead':
          url = buildPlatformUrl(navigationConfig.leadUrl, {
            leadId: id,
            source: navigationConfig.sourceParam,
            fromView: 'dashboard',
            fromActivity: activity.id
          })
          break
        case 'contact':
          url = buildPlatformUrl(navigationConfig.contactUrl, {
            contactId: id,
            source: navigationConfig.sourceParam,
            fromView: 'dashboard',
            fromActivity: activity.id
          })
          break
        case 'account':
          url = buildPlatformUrl(navigationConfig.accountUrl, {
            accountId: id,
            source: navigationConfig.sourceParam,
            fromView: 'dashboard',
            fromActivity: activity.id
          })
          break
        default:
          return
      }

      navigateTo(url)
    },
    [navigationConfig]
  )
  return (
    <Card className="gba:h-full">
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:p-2 gba:bg-blue-100 gba:rounded-lg">
              <Calendar className="gba:h-6 gba:w-6 gba:text-blue-600" />
            </div>
            <CardTitle>My Day's Activities</CardTitle>
          </div>
          {totalCount > 0 && <Badge variant="secondary">{totalCount} total</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        {activities.length > 0 ? (
          <>
            <div className="gba:space-y-4 gba:max-h-96 gba:overflow-y-auto">
              {activities.map(activity => (
                <Card
                  key={activity.id}
                  className="gba:transition-all gba:duration-200 gba:hover:shadow-md gba:hover:bg-accent gba:cursor-pointer"
                  data-testid={`activity-item-${activity.id}`}
                  onClick={e => {
                    e.stopPropagation()
                    handleActivityClick(activity)
                  }}
                >
                  <CardHeader className="gba:pb-2">
                    <div className="gba:flex gba:items-center gba:gap-3">
                      <div
                        className={`gba:w-8 gba:h-8 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:shrink-0 ${
                          activity.completedAt ? 'gba:bg-green-100' : 'gba:bg-blue-100'
                        }`}
                      >
                        <span
                          className={`gba:text-xs gba:font-medium ${
                            activity.completedAt ? 'gba:text-green-600' : 'gba:text-blue-600'
                          }`}
                        >
                          {activity.type.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1 gba:min-w-0">
                        <CardTitle className="gba:text-sm gba:truncate">{activity.title}</CardTitle>
                        <Badge variant="outline">{activity.type}</Badge>
                      </div>
                      {activity.completedAt && <Badge variant="default">Completed</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="gba:text-xs gba:text-gray-500 gba:mb-1">
                      {activity.owner} • {activity.relatedTo}
                    </div>
                    <div className="gba:text-xs gba:text-gray-400">
                      {new Date(activity.createdAt).toLocaleTimeString()}
                      {activity.completedAt && (
                        <span className="gba:ml-2">
                          • Completed at {new Date(activity.completedAt).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination Controls */}
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              startItem={startItem}
              endItem={endItem}
              totalItems={totalItems}
              itemLabel="activities"
              onPrevPage={handlePrevPage}
              onNextPage={handleNextPage}
              dataTestIdPrefix="activities"
            />
          </>
        ) : (
          <div className="gba:h-64 gba:flex gba:items-center gba:justify-center">
            <div className="gba:text-center">
              <div className="gba:w-16 gba:h-16 gba:mx-auto gba:bg-blue-100 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:mb-4">
                <Calendar className="gba:h-8 gba:w-8 gba:text-blue-500" />
              </div>
              <div className="gba:text-gray-600 gba:text-lg">No activities scheduled for today.</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ActivitySummary
