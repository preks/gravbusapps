/**
 * FlowCard Component
 * Individual flow card with status and progress indicators
 */

import React, { memo, useMemo } from 'react'
import { Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/de'
import 'dayjs/locale/en'
import 'dayjs/locale/ro'
import 'dayjs/locale/fr'
import 'dayjs/locale/es'
import 'dayjs/locale/it'
import { Flow } from '../types'
import { formatFlowStatus } from '../utils/taskFormatters'
import { base64ToObjectURL } from '../utils/avatarUtils'

dayjs.extend(relativeTime)

interface FlowCardProps {
  flow: Flow
  onView: (flow: Flow) => void
  accessToken: string
  isSelected?: boolean
  employeeMap?: Map<string, any>
  t: (key: string, params?: Record<string, any>) => string
  locale: string
}

// Helper to get initials from name or flow data
const getFlowInitials = (flow: Flow, employeeData: any): string => {
  if (employeeData) {
    const first = employeeData.firstName?.[0] || ''
    const last = employeeData.lastName?.[0] || ''
    if (first || last) return `${first}${last}`.toUpperCase()
  }
  // Fallback: get initials from template name
  const parts = flow.templateName.split(' ').filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return flow.templateName.substring(0, 2).toUpperCase()
}

export const FlowCard: React.FC<FlowCardProps> = memo(
  ({ flow, onView, isSelected = false, employeeMap, t, locale }) => {
    // Date formatting function
    const baseLocale = locale?.split('-')[0]?.toLowerCase() || 'en'

    const formatRelativeTime = (date: string | Date): string => {
      return dayjs(date).locale(baseLocale).fromNow()
    }

    // Get assignee or initiator data for avatar
    const userId = flow.assignedUserId || flow.initiatorUserId
    const employeeData = userId && employeeMap ? employeeMap.get(userId) : null

    // Avatar URL from base64
    const avatarUrl = useMemo(() => {
      if (employeeData?.pictureThumbnail) {
        return base64ToObjectURL(employeeData.pictureThumbnail)
      }
      return undefined
    }, [employeeData?.pictureThumbnail])

    const initials = getFlowInitials(flow, employeeData)

    return (
      <div
        className={`gba:relative gba:cursor-pointer gba:transition-all gba:duration-150 gba:pl-10 gba:pr-3 gba:py-2.5 gba:bg-card gba:rounded-lg gba:mb-2 gba:border-2 gba:overflow-hidden ${
          isSelected ? 'gba:border-foreground gba:shadow-sm' : 'gba:border-transparent gba:hover:bg-accent/50'
        }`}
        onClick={() => onView(flow)}
        data-testid={`flow-card-${flow.id}`}
      >
        {/* Corner Avatar */}
        <div className="gba:absolute gba:left-2 gba:top-0 gba:bottom-0 gba:w-8 gba:flex gba:items-center gba:justify-center">
          <Avatar className="gba:h-6 gba:w-6">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={flow.templateName} />}
            <AvatarFallback className="gba:text-[10px] gba:font-medium">{initials}</AvatarFallback>
          </Avatar>
        </div>

        <div className="gba:flex gba:items-start gba:justify-between gba:gap-3">
          {/* Left: Name and Status */}
          <div className="gba:flex gba:flex-col gba:gap-0.5 gba:flex-1 gba:min-w-0">
            {/* Flow Name */}
            <span
              className="gba:text-sm gba:font-semibold gba:text-foreground gba:truncate gba:leading-tight"
              data-testid="flow-title"
            >
              {flow.templateName}
            </span>

            {/* Status - single line truncated */}
            <span className="gba:text-xs gba:text-muted-foreground gba:truncate gba:leading-tight">
              {formatFlowStatus(flow.status, t)}
            </span>
          </div>

          {/* Right: Timestamp */}
          <span
            className="gba:text-xs gba:text-muted-foreground gba:whitespace-nowrap gba:flex-shrink-0"
            data-testid="flow-started-at"
          >
            {formatRelativeTime(flow.startedAt)}
          </span>
        </div>
      </div>
    )
  }
)
