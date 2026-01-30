/**
 * Case Activity Feed Component
 *
 * Displays chronological audit log of all case-related activities
 * Similar to service-desk ActivityFeed but for case management
 */

import React, { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import {
  Activity,
  CheckCircle,
  Plus,
  Minus,
  Link2,
  MessageSquare,
  User,
  FileText,
  Loader2,
  RefreshCw,
  AlertTriangle,
  PlayCircle
} from 'lucide-react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { BusinessAppContextProps } from '@/business-apps/types'
import { CaseApiClient } from '../services/CaseApiClient'
import { CaseActivity, CaseActivityType } from '../types'
import { useEmployeeNamesBatch } from '@/business-apps/ser/hooks/useEmployeeNamesBatch'

dayjs.extend(relativeTime)

interface CaseActivityFeedProps {
  caseId: string
  context: BusinessAppContextProps
  maxItems?: number
}

export const CaseActivityFeed: React.FC<CaseActivityFeedProps> = ({ caseId, context, maxItems = 20 }) => {
  const [activities, setActivities] = useState<CaseActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Extract user IDs for name resolution
  const userIds = useMemo(() => {
    return [...new Set(activities.map(a => a.userId).filter(id => id && id !== 'system'))]
  }, [activities])

  // Resolve user names
  const { displayNames: userNames, employees: userEmployees } = useEmployeeNamesBatch({
    userIds,
    accessToken: context.accessToken,
    enabled: userIds.length > 0
  })

  // Fetch activities
  const fetchActivities = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const client = new CaseApiClient(undefined, context.accessToken)
      const result = await client.getCaseAuditLog(caseId, { limit: maxItems })
      setActivities(result.activities)
    } catch (err) {
      console.error('[CaseActivityFeed] Failed to fetch activities:', err)
      setError('Failed to load activity history')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (caseId) {
      fetchActivities()
    }
  }, [caseId])

  // Get icon for activity type
  const getActivityIcon = (type: CaseActivityType) => {
    switch (type) {
      case 'case_created':
        return <PlayCircle className="gba:h-4 gba:w-4 gba:text-blue-500" />
      case 'flow_added':
        return <Plus className="gba:h-4 gba:w-4 gba:text-green-500" />
      case 'flow_linked':
        return <Link2 className="gba:h-4 gba:w-4 gba:text-green-500" />
      case 'flow_removed':
        return <Minus className="gba:h-4 gba:w-4 gba:text-orange-500" />
      case 'note_added':
        return <MessageSquare className="gba:h-4 gba:w-4 gba:text-blue-400" />
      case 'entity_linked':
        return <User className="gba:h-4 gba:w-4 gba:text-purple-500" />
      case 'case_completed':
        return <CheckCircle className="gba:h-4 gba:w-4 gba:text-green-600" />
      case 'status_changed':
        return <FileText className="gba:h-4 gba:w-4 gba:text-purple-500" />
      default:
        return <Activity className="gba:h-4 gba:w-4 gba:text-gray-500" />
    }
  }

  // Get user display info
  const getUserInfo = (userId: string) => {
    if (userId === 'system') {
      return {
        name: 'System',
        initials: 'SYS',
        photoUrl: undefined
      }
    }

    const name = userNames[userId] || userId.slice(0, 8) + '...'
    const employee = userEmployees[userId]

    return {
      name,
      initials: name
        .split(' ')
        .map(n => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
      photoUrl: employee?.photoUrl,
      employeeId: employee?.id
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className="gba:h-full">
        <CardHeader className="gba:py-3 gba:px-4">
          <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:font-semibold">
            <Loader2 className="gba:h-4 gba:w-4 gba:animate-spin gba:text-primary" />
            Activity Log
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:px-4 gba:py-2">
          <div className="gba:space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="gba:flex gba:items-start gba:gap-2">
                <div className="gba:h-6 gba:w-6 gba:bg-muted gba:rounded-full gba:animate-pulse gba:flex-shrink-0" />
                <div className="gba:flex-1 gba:space-y-1">
                  <div className="gba:h-3 gba:bg-muted gba:rounded gba:animate-pulse gba:w-3/4" />
                  <div className="gba:h-2.5 gba:bg-muted gba:rounded gba:animate-pulse gba:w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className="gba:h-full">
        <CardHeader className="gba:py-3 gba:px-4">
          <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:font-semibold">
            <AlertTriangle className="gba:h-4 gba:w-4 gba:text-destructive" />
            Activity Log
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:px-4 gba:py-2">
          <p className="gba:text-xs gba:text-muted-foreground">{error}</p>
          <button
            onClick={fetchActivities}
            className="gba:mt-2 gba:text-xs gba:text-primary hover:gba:underline gba:flex gba:items-center gba:gap-1"
          >
            <RefreshCw className="gba:h-3 gba:w-3" />
            Retry
          </button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="gba:h-full gba:flex gba:flex-col">
      <CardHeader className="gba:py-3 gba:px-4 gba:flex-shrink-0">
        <CardTitle className="gba:flex gba:items-center gba:justify-between gba:text-sm gba:font-semibold">
          <div className="gba:flex gba:items-center gba:gap-1.5">
            <Activity className="gba:h-4 gba:w-4 gba:text-primary" />
            Activity Log
          </div>
          <button
            onClick={fetchActivities}
            className="gba:p-1 gba:rounded hover:gba:bg-muted gba:transition-colors"
            title="Refresh"
          >
            <RefreshCw className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:px-4 gba:py-0 gba:flex-1 gba:overflow-hidden">
        {activities.length === 0 ? (
          <div className="gba:text-center gba:py-6">
            <Activity className="gba:h-6 gba:w-6 gba:mx-auto gba:mb-2 gba:text-muted-foreground" />
            <p className="gba:text-xs gba:text-muted-foreground">No activity recorded yet</p>
          </div>
        ) : (
          <div className="gba:space-y-0 gba:max-h-[500px] gba:overflow-y-auto gba:pr-1">
            {activities.map((activity, index) => {
              const user = getUserInfo(activity.userId)

              return (
                <div
                  key={activity.id}
                  className={`gba:flex gba:items-start gba:gap-2.5 gba:py-2.5 ${
                    index < activities.length - 1 ? 'gba:border-b gba:border-border/50' : ''
                  }`}
                >
                  {/* Activity Icon */}
                  <div className="gba:flex-shrink-0 gba:mt-0.5">{getActivityIcon(activity.type)}</div>

                  {/* Activity Content */}
                  <div className="gba:flex-1 gba:min-w-0">
                    <div className="gba:flex gba:items-baseline gba:gap-1.5 gba:flex-wrap">
                      <span
                        className={`gba:text-xs gba:font-medium ${user.employeeId ? 'gba:cursor-pointer hover:gba:text-primary hover:gba:underline' : ''}`}
                        onClick={() => {
                          if (user.employeeId) {
                            window.open(`/platform/employee/profile/${user.employeeId}`, '_blank')
                          }
                        }}
                      >
                        {user.name}
                      </span>
                      <span className="gba:text-xs gba:text-muted-foreground">{activity.description}</span>
                    </div>

                    <div className="gba:flex gba:items-center gba:gap-2 gba:mt-0.5">
                      <span className="gba:text-[10px] gba:text-muted-foreground">
                        {dayjs(activity.timestamp).fromNow()}
                      </span>
                      {activity.metadata?.workflowId && (
                        <span className="gba:text-[10px] gba:font-mono gba:text-muted-foreground">
                          REQ-{activity.metadata.workflowId.slice(-8).toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
