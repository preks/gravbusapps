import React, { useState, useCallback } from 'react'
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  Button,
  Alert,
  Badge,
  useTranslation
} from '@newwork/nw-design-system'
import { EyeIcon, EyeSlashIcon } from '@phosphor-icons/react'
import { DashboardStats, RecentActivity, RecentActivityKind } from '../types'
import { getExpenseRequestStatusDisplay, type StatusDisplayConfig } from '../../../../utils'
import personalTranslations from '../../../../_i18n'

const ACTIVITY_TITLE_KEY: Record<RecentActivityKind, string> = {
  'request-approved': 'dashboard-activity-request-approved',
  'request-returned': 'dashboard-activity-request-returned',
  'plan-approved': 'dashboard-activity-plan-approved',
  'plan-returned': 'dashboard-activity-plan-returned'
}

function getActivityRowTitle(item: RecentActivity, t: (key: string) => string): string {
  const prefix = t(ACTIVITY_TITLE_KEY[item.activityKind])
  if (item.relatedTitle) {
    return `${prefix}: ${item.relatedTitle}`
  }
  return prefix
}

function getActivityRowKey(item: RecentActivity): string {
  return `${String(item.id)}-${item.updatedAt}`
}

interface ActionFeedProps {
  stats: DashboardStats | undefined
  isLoading: boolean
  error: Error | null
}

export const ActionFeed: React.FC<ActionFeedProps> = ({ stats, isLoading, error }) => {
  const { t } = useTranslation(personalTranslations)
  const [showAll, setShowAll] = useState(false)

  const toggleShowAll = useCallback(() => {
    setShowAll(v => !v)
  }, [])

  if (isLoading) {
    return (
      <Card className="gba:action-feed-card" data-testid="action-feed-loading">
        <CardContent>
          <div className="gba:py-8 gba:text-center">
            <div className="gba:text-gray-500">{t('dashboard-action-feed-no-data')}</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="gba:action-feed-card" data-testid="action-feed-error">
        <Alert variant="destructive">
          <h4 className="gba:font-semibold">{t('dashboard-action-feed-error')}</h4>
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
          <CardTitle className="gba:text-sm">{t('dashboard-action-feed-title')}</CardTitle>
          {recentActivity.length > 10 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleShowAll}
              className="gba:text-xs gba:h-auto gba:p-1"
              data-testid="action-feed-toggle"
            >
              {showAll ? (
                <>
                  <EyeSlashIcon size={16} className="gba:mr-1" />
                  {t('dashboard-action-feed-view-less')}
                </>
              ) : (
                <>
                  <EyeIcon size={16} className="gba:mr-1" />
                  {t('dashboard-action-feed-view-all')}
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="gba:py-1 gba:px-2 gba:pr-6 gba:pl-6">
        {recentActivity.length > 0 ? (
          <div className={showAll ? 'gba:max-h-[300px] gba:overflow-y-auto gba:pr-2' : ''} data-testid="activity-list">
            <div className="gba:grid gba:grid-cols-10 gba:gap-2 gba:items-center gba:py-1 gba:border-b gba:border-gray-200 gba:mb-2">
              <div className="gba:col-span-5 gba:text-xs gba:font-semibold gba:text-gray-600">
                {t('dashboard-action-feed-col-description')}
              </div>
              <div className="gba:col-span-2 gba:text-xs gba:font-semibold gba:text-gray-600 gba:text-center">
                {t('dashboard-action-feed-col-status')}
              </div>
              <div className="gba:col-span-3 gba:text-xs gba:font-semibold gba:text-gray-600 gba:text-right">
                {t('expense-items-date-label')}
              </div>
            </div>
            <div className="gba:space-y-1">
              {activitiesToShow.map((item: RecentActivity) => (
                <div
                  key={getActivityRowKey(item)}
                  className="gba:grid gba:grid-cols-10 gba:gap-2 gba:items-center gba:py-1"
                  data-testid={`activity-item-${getActivityRowKey(item)}`}
                >
                  <div className="gba:col-span-5 gba:text-xs gba:font-medium gba:truncate">
                    {getActivityRowTitle(item, t)}
                  </div>
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
            <p className="gba:text-sm">{t('dashboard-action-feed-no-recent')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ActionFeed
