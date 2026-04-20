import React, { useState } from 'react'
import { Card, CardHeader, CardContent, CardTitle, Button, Alert, Badge } from '@newwork/nw-design-system'
import { EyeIcon, EyeSlashIcon } from '@phosphor-icons/react'
import { DashboardStats, RecentActivity } from '../types'
// import { formatNumberFunction } from '@/common/utils/windowUtils';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { getExpenseRequestStatusDisplay, type StatusDisplayConfig } from '../../../../utils'

interface ActionFeedProps {
  stats: DashboardStats | undefined
  isLoading: boolean
  error: Error | null
}

export const ActionFeed: React.FC<ActionFeedProps> = ({ stats, isLoading, error }) => {
  const [showAll, setShowAll] = useState(false)

  if (isLoading) {
    return (
      <Card className="gba:action-feed-card" data-testid="action-feed-loading">
        <CardContent>
          <div className="gba:py-8 gba:text-center">
            <div className="gba:text-gray-500">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:personal_expenses.no_activity_data_available',
                'No activity data available.'
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="gba:action-feed-card" data-testid="action-feed-error">
        <Alert variant="destructive">
          <h4 className="gba:font-semibold">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:personal_expenses.error_loading_action_feed',
              'Error loading action feed'
            )}
          </h4>
          <p>{error.message}</p>
        </Alert>
      </Card>
    )
  }

  const recentActivity = stats?.recentActivity || []
  const activitiesToShow = showAll ? recentActivity : recentActivity.slice(0, 10)

  return (
    <Card className="gba:action-feed-card" data-testid="action-feed-card">
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle className="gba:text-sm">
            {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.action_feed', 'Action Feed')}
          </CardTitle>
          {recentActivity.length > 10 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className="gba:text-xs gba:h-auto gba:p-1"
              data-testid="action-feed-toggle"
            >
              {showAll ? (
                <>
                  <EyeSlashIcon size={16} className="gba:mr-1" />
                  {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.view_less', 'View Less')}
                </>
              ) : (
                <>
                  <EyeIcon size={16} className="gba:mr-1" />
                  {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.view_all', 'View All')}
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="gba:py-1 gba:px-2 gba:pr-6 gba:pl-6">
        {recentActivity.length > 0 ? (
          <div className={showAll ? 'gba:max-h-[300px] gba:overflow-y-auto gba:pr-2' : ''} data-testid="activity-list">
            {/* Header Row */}
            <div className="gba:grid gba:grid-cols-10 gba:gap-2 gba:items-center gba:py-1 gba:border-b gba:border-gray-200 gba:mb-2">
              <div className="gba:col-span-5 gba:text-xs gba:font-semibold gba:text-gray-600">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:create_expense_item.change_expense_item_container.current_description_label',
                  'Description'
                )}
              </div>
              <div className="gba:col-span-2 gba:text-xs gba:font-semibold gba:text-gray-600 gba:text-center">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:manager_expense_request_list.expense_table.status',
                  'Status'
                )}
              </div>
              <div className="gba:col-span-3 gba:text-xs gba:font-semibold gba:text-gray-600 gba:text-right">
                {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.date', 'Date')}
              </div>
            </div>
            <div className="gba:space-y-1">
              {activitiesToShow.map((item: RecentActivity, index: number) => (
                <div
                  key={index}
                  className="gba:grid gba:grid-cols-10 gba:gap-2 gba:items-center gba:py-1"
                  data-testid={`activity-item-${index}`}
                >
                  <div className="gba:col-span-5 gba:text-xs gba:font-medium gba:truncate">{item.title}</div>
                  <div className="gba:col-span-2 gba:flex gba:justify-center">
                    {(() => {
                      const statusConfig: StatusDisplayConfig = getExpenseRequestStatusDisplay(item.status)
                      return (
                        <Badge variant={statusConfig.badgeVariant ?? 'outline'} data-testid="expense-status-cell">
                          {statusConfig.label}
                        </Badge>
                      )
                    })()}
                  </div>
                  <div className="gba:col-span-3 gba:text-xs gba:text-gray-500 gba:flex gba:items-center gba:justify-end">
                    {new Date(item.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="gba:text-center gba:py-4 gba:text-gray-500" data-testid="empty-activity">
            <p className="gba:text-sm">
              {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.no_recent_activity', 'No recent activity')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ActionFeed
