import { useState, useEffect, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { CUSTOM_FLOW_ENGINE_API_URL } from '@/common/utils/serviceResolver'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useEmployeeNamesBatch } from '../../../../../hooks/useEmployeeNamesBatch'

dayjs.extend(relativeTime)

/**
 * Activity Feed Data Hook - Fetches real activity data from audit logs API
 */

export interface ActivityItem {
  id: string
  type:
    | 'ticket_created'
    | 'ticket_assigned'
    | 'ticket_resolved'
    | 'ticket_escalated'
    | 'comment_added'
    | 'status_changed'
    | 'priority_changed'
    | 'claim'
    | 'complete'
    | 'updated'
    | 'unclaim'
    | 'reassign'
  user: {
    name: string
    avatarFallback: string
    userId: string
    pictureThumbnail?: string
    employeeId?: string
  }
  timestamp: Date
  description: string
  ticketId?: string
  ticketName?: string
  flowName?: string
  requestId?: string
  priority?: 'Critical' | 'High' | 'Medium' | 'Low'
  status?: string
  action?: string
  taskType?: string
}

export interface AuditLogEntry {
  id: string
  timestamp: string
  userId: string
  flowId: string
  flowName: string
  taskId: string
  taskName: string
  taskType: 'TASK' | 'APPROVAL'
  action: string // Changed to string to accept any action type from API
  assignmentChange: any
  status: string
  previousStatus: string | null
  newStatus: string
  details: {
    reason?: string | null
    comment?: string | null
    completed?: string | null
    timestamp: string
    executedBy?: string | null
  }
}

export interface UseActivityFeedDataProps extends BusinessAppContextProps {
  limit?: number
}

export interface UseActivityFeedDataReturn {
  activities: ActivityItem[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export const useActivityFeedData = ({
  accessToken,
  userInfo,
  limit = 20
}: UseActivityFeedDataProps): UseActivityFeedDataReturn => {
  const [auditEntries, setAuditEntries] = useState<AuditLogEntry[]>([])
  const [isLoadingAudit, setIsLoadingAudit] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const currentUserId = userInfo?.id

  // Extract all unique user IDs from audit entries
  const userIds = useMemo(() => {
    const ids = new Set<string>()
    auditEntries.forEach(entry => {
      const executedBy = entry.details?.executedBy || entry.userId
      if (executedBy && executedBy !== 'SYSTEM') {
        ids.add(executedBy)
      }
    })
    return Array.from(ids)
  }, [auditEntries])

  // Fetch employee names and data for all users in the audit log
  const {
    displayNames,
    employees,
    isLoading: isLoadingNames
  } = useEmployeeNamesBatch({
    userIds,
    accessToken,
    enabled: userIds.length > 0
  })

  // Helper: Get user display name from userId
  const getUserDisplayName = (userId: string): string => {
    if (userId === 'SYSTEM') return 'System'
    return displayNames.get(userId) || userId.substring(0, 8)
  }

  // Helper: Get initials from name or userId
  const getInitials = (userId: string, firstName?: string, lastName?: string): string => {
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
    }
    if (firstName) {
      return firstName.substring(0, 2).toUpperCase()
    }
    // Get initials from display name if available
    const displayName = displayNames.get(userId)
    if (displayName && displayName !== 'Unknown User') {
      const parts = displayName.split(' ')
      if (parts.length >= 2) {
        return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase()
      }
      return displayName.substring(0, 2).toUpperCase()
    }
    return 'U'
  }

  // Transform audit log entry to activity item
  const transformAuditLogToActivity = (entry: AuditLogEntry, currentUserId: string): ActivityItem => {
    // Determine who performed the action
    const executedBy = entry.details?.executedBy || entry.userId
    const isMyAction = executedBy === currentUserId

    // Get employee data for avatar image
    const employeeData = employees.get(executedBy)

    // Generate user info
    const user = {
      name: isMyAction ? 'You' : getUserDisplayName(executedBy),
      avatarFallback: isMyAction
        ? getInitials(currentUserId, userInfo?.givenName, userInfo?.familyName)
        : getInitials(executedBy),
      userId: executedBy,
      pictureThumbnail: employeeData?.pictureThumbnail || undefined,
      employeeId: employeeData?.id || undefined
    }

    // Map action to activity type and description
    let type: ActivityItem['type'] = 'updated'
    let description = ''

    switch (entry.action) {
      case 'CLAIM':
        type = 'claim'
        description = `Claimed "${entry.taskName}"`
        break

      case 'COMPLETE':
        type = 'complete'
        description = `Completed "${entry.taskName}"`
        // Add comment if it's meaningful (not the default message)
        if (
          entry.details?.comment &&
          entry.details.comment !== 'Completed via Service Desk' &&
          entry.details.comment !== 'Ticket completed successfully'
        ) {
          description += ` - ${entry.details.comment}`
        }
        break

      case 'UNCLAIM':
        type = 'unclaim'
        description = `Unclaimed "${entry.taskName}"`
        break

      case 'COMMENT':
        type = 'comment_added'
        description = `Commented on "${entry.taskName}"`
        if (entry.details?.comment) {
          description += `: "${entry.details.comment}"`
        }
        break

      case 'REASSIGN':
        type = 'reassign'
        description = `"${entry.taskName}" was reassigned`
        break

      case 'UPDATED':
        type = 'status_changed'
        if (entry.previousStatus && entry.newStatus) {
          description = `"${entry.taskName}" status changed from ${entry.previousStatus} to ${entry.newStatus}`
        } else {
          description = `"${entry.taskName}" status changed to ${entry.newStatus}`
        }
        break

      case 'ASSIGNED':
        type = 'ticket_assigned'
        description = `Assigned to "${entry.taskName}"`
        break

      case 'CREATED':
        type = 'ticket_created'
        description = `Created "${entry.taskName}"`
        break

      default:
        // Handle unknown action types
        console.log('[useActivityFeedData] Unknown action type:', entry.action, 'for task:', entry.taskName)
        type = 'updated'
        description = `${String(entry.action).toLowerCase()} "${entry.taskName}"`
    }

    return {
      id: entry.id,
      type,
      user,
      timestamp: new Date(entry.timestamp),
      description,
      ticketId: entry.taskId,
      ticketName: entry.taskName,
      flowName: entry.flowName,
      requestId: entry.flowId,
      status: entry.newStatus,
      action: entry.action,
      taskType: entry.taskType
    }
  }

  // Fetch audit logs from API
  const fetchAuditLogs = async () => {
    if (!accessToken || !currentUserId) {
      setError('Missing authentication or user information')
      setIsLoadingAudit(false)
      return
    }

    try {
      setIsLoadingAudit(true)
      setError(null)

      const response = await fetch(`${CUSTOM_FLOW_ENGINE_API_URL}/audit/logs?limit=${limit}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch audit logs: ${response.statusText}`)
      }

      const data = await response.json()
      const entries: AuditLogEntry[] = data.data?.entries || []

      // Show all activities (user requested to see all users)
      setAuditEntries(entries)
    } catch (err) {
      console.error('[useActivityFeedData] Error fetching audit logs:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch activity data')
    } finally {
      setIsLoadingAudit(false)
    }
  }

  useEffect(() => {
    fetchAuditLogs()

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchAuditLogs()
    }, 30000)

    return () => clearInterval(interval)
  }, [accessToken, currentUserId, limit])

  // Transform audit entries to activities once employee names are loaded
  const activities = useMemo(() => {
    if (!currentUserId) return []

    return auditEntries.map(entry => transformAuditLogToActivity(entry, currentUserId))
  }, [auditEntries, currentUserId, displayNames])

  const refetch = () => {
    fetchAuditLogs()
  }

  return {
    activities,
    isLoading: isLoadingAudit || isLoadingNames,
    error,
    refetch
  }
}
