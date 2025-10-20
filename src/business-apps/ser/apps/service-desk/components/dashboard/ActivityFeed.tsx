import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { navigateTo } from '@/common/utils/navigationUtils'
import { formatRequestId } from '../../../../utils'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Badge
} from '@newwork/nw-design-system'
import {
  Activity,
  Clock,
  CheckCircle,
  AlertTriangle,
  UserPlus,
  MessageCircle,
  ArrowUpCircle,
  FileText,
  Loader2,
  RefreshCw
} from 'lucide-react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useActivityFeedData, type ActivityItem } from './hooks/useActivityFeedData'

dayjs.extend(relativeTime)

/**
 * Activity Feed Component - Displays real-time activity feed using live service desk data
 */
export interface ActivityFeedProps extends BusinessAppContextProps {
  onTaskSelect?: (taskId: string, deskKey: string) => void
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ accessToken, userInfo, onTaskSelect }) => {
  // Get real activity data from service desk APIs
  const { activities, isLoading, error, refetch } = useActivityFeedData({
    accessToken,
    userInfo
  })

  // Get appropriate icon for activity type
  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'ticket_created':
        return <Activity className="gba:h-4 gba:w-4 gba:text-blue-500" />
      case 'ticket_assigned':
        return <UserPlus className="gba:h-4 gba:w-4 gba:text-green-500" />
      case 'ticket_resolved':
        return <CheckCircle className="gba:h-4 gba:w-4 gba:text-green-600" />
      case 'ticket_escalated':
        return <AlertTriangle className="gba:h-4 gba:w-4 gba:text-red-500" />
      case 'comment_added':
        return <MessageCircle className="gba:h-4 gba:w-4 gba:text-blue-400" />
      case 'priority_changed':
        return <ArrowUpCircle className="gba:h-4 gba:w-4 gba:text-orange-500" />
      case 'status_changed':
        return <FileText className="gba:h-4 gba:w-4 gba:text-purple-500" />
      case 'claim':
        return <UserPlus className="gba:h-4 gba:w-4 gba:text-green-500" />
      case 'complete':
        return <CheckCircle className="gba:h-4 gba:w-4 gba:text-green-600" />
      case 'unclaim':
        return <UserPlus className="gba:h-4 gba:w-4 gba:text-orange-500" />
      case 'reassign':
        return <ArrowUpCircle className="gba:h-4 gba:w-4 gba:text-blue-500" />
      case 'updated':
        return <FileText className="gba:h-4 gba:w-4 gba:text-purple-500" />
      default:
        return <Activity className="gba:h-4 gba:w-4 gba:text-gray-500" />
    }
  }

  // Get priority badge variant
  const getPriorityVariant = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'critical':
        return 'destructive'
      case 'high':
        return 'secondary'
      case 'medium':
        return 'outline'
      case 'low':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  // Show loading state
  if (isLoading) {
    return (
      <Card className="gba:border gba:bg-card gba:shadow-sm">
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-lg gba:font-semibold">
            <Loader2 className="gba:h-5 gba:w-5 gba:animate-spin gba:text-primary" />
            {getTranslationFromI18nKeyAndLabel('services.dashboard.activity.title', 'Recent Activity')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="gba:flex gba:items-start gba:gap-3">
                <div className="gba:h-8 gba:w-8 gba:bg-muted gba:rounded-full gba:animate-pulse" />
                <div className="gba:flex-1 gba:space-y-2">
                  <div className="gba:h-4 gba:bg-muted gba:rounded gba:animate-pulse gba:w-3/4" />
                  <div className="gba:h-3 gba:bg-muted gba:rounded gba:animate-pulse gba:w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show error state
  if (error) {
    return (
      <Card className="gba:border gba:bg-card gba:shadow-sm">
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-lg gba:font-semibold">
            <AlertTriangle className="gba:h-5 gba:w-5 gba:text-destructive" />
            {getTranslationFromI18nKeyAndLabel('services.dashboard.activity.error_title', 'Activity Feed Error')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="gba:text-sm gba:text-muted-foreground">{error}</p>
          <button
            onClick={refetch}
            className="gba:mt-2 gba:text-sm gba:text-primary gba:hover:underline gba:flex gba:items-center gba:gap-1"
          >
            <RefreshCw className="gba:h-3 gba:w-3" />
            Retry
          </button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="gba:border gba:bg-card gba:shadow-sm" data-testid="activity-feed">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:justify-between gba:text-lg gba:font-semibold">
          <div className="gba:flex gba:items-center gba:gap-2">
            <Activity className="gba:h-5 gba:w-5 gba:text-primary" />
            {getTranslationFromI18nKeyAndLabel('services.dashboard.activity.title', 'Recent Activity')}
          </div>
          <div className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground">
            <Clock className="gba:h-3 gba:w-3" />
            Live
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="gba:text-center gba:py-8">
            <Activity className="gba:h-8 gba:w-8 gba:mx-auto gba:mb-2 gba:text-muted-foreground" />
            <p className="gba:text-sm gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel('services.dashboard.activity.no_activities', 'No recent activities')}
            </p>
          </div>
        ) : (
          <div className="gba:space-y-4 gba:max-h-[720px] gba:overflow-y-auto">
            {activities.map((activity, index) => (
              <div
                key={activity.id}
                className={`gba:flex gba:items-start gba:gap-3 gba:pb-3 ${
                  index < activities.length - 1 ? 'gba:border-b gba:border-border' : ''
                }`}
                data-testid={`activity-item-${activity.id}`}
              >
                {/* User Avatar */}
                <div
                  className={`${activity.user.employeeId && activity.user.userId !== 'SYSTEM' ? 'gba:cursor-pointer hover:gba:opacity-80 gba:transition-opacity' : ''}`}
                  onClick={e => {
                    if (activity.user.employeeId && activity.user.userId !== 'SYSTEM') {
                      e.stopPropagation()
                      navigateTo(`/platform/employee-record?employeeId=${activity.user.employeeId}`)
                    }
                  }}
                  title={activity.user.employeeId ? 'View employee profile' : undefined}
                >
                  <Avatar className="gba:h-8 gba:w-8 gba:border">
                    {activity.user.pictureThumbnail && (
                      <AvatarImage
                        src={`data:image/png;base64,${activity.user.pictureThumbnail}`}
                        alt={activity.user.name}
                        onError={e => {
                          // Try different image formats if PNG fails
                          const target = e.target as HTMLImageElement
                          if (target.src.includes('png')) {
                            target.src = `data:image/jpeg;base64,${activity.user.pictureThumbnail}`
                          } else if (target.src.includes('jpeg')) {
                            target.src = `data:image/gif;base64,${activity.user.pictureThumbnail}`
                          }
                        }}
                      />
                    )}
                    <AvatarFallback className="gba:text-xs gba:font-medium">
                      {activity.user.avatarFallback}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Activity Content */}
                <div className="gba:flex-1 gba:min-w-0">
                  <div className="gba:flex gba:items-start gba:justify-between gba:gap-2">
                    <div className="gba:flex-1">
                      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                        {getActivityIcon(activity.type)}
                        <span className="gba:text-sm gba:font-medium gba:text-foreground">{activity.user.name}</span>
                        {activity.priority && (
                          <Badge variant={getPriorityVariant(activity.priority)} className="gba:text-xs">
                            {activity.priority}
                          </Badge>
                        )}
                      </div>
                      <p
                        className={`gba:text-sm gba:text-muted-foreground gba:line-clamp-2 ${
                          activity.ticketId && onTaskSelect
                            ? 'gba:cursor-pointer hover:gba:text-primary hover:gba:underline gba:transition-colors'
                            : ''
                        }`}
                        onClick={e => {
                          if (activity.ticketId && onTaskSelect) {
                            e.stopPropagation()
                            onTaskSelect(activity.ticketId, '')
                          }
                        }}
                      >
                        {activity.description}
                      </p>
                      <div className="gba:flex gba:items-baseline gba:flex-wrap gba:gap-2 gba:mt-2">
                        <span className="gba:text-xs gba:text-muted-foreground gba:leading-none">
                          {dayjs(activity.timestamp).fromNow()}
                        </span>
                        {activity.requestId && (
                          <span className="gba:text-xs gba:text-primary gba:font-mono gba:leading-none">
                            {formatRequestId(activity.requestId)}
                          </span>
                        )}
                        {activity.flowName && (
                          <span className="gba:text-xs gba:text-muted-foreground gba:leading-none">
                            • {activity.flowName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer with refresh hint */}
        <div className="gba:mt-4 gba:pt-3 gba:border-t gba:border-border">
          <p className="gba:text-xs gba:text-muted-foreground gba:text-center gba:flex gba:items-center gba:justify-center gba:gap-1">
            <Clock className="gba:h-3 gba:w-3" />
            {getTranslationFromI18nKeyAndLabel(
              'services.dashboard.activity.auto_refresh',
              'Updates automatically every 30 seconds'
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
