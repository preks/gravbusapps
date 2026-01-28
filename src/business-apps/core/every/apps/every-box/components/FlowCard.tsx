/**
 * FlowCard Component
 * Individual flow card with status and progress indicators
 */

import React, { memo } from 'react'
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

export const FlowCard: React.FC<FlowCardProps> = memo(({ flow, onView, isSelected = false, t, locale }) => {
  // Date formatting function
  const baseLocale = locale?.split('-')[0]?.toLowerCase() || 'en'

  const formatRelativeTime = (date: string | Date): string => {
    return dayjs(date).locale(baseLocale).fromNow()
  }

  return (
    <div
      className={`gba:cursor-pointer gba:transition-all gba:duration-150 gba:px-3 gba:py-2.5 gba:bg-card gba:rounded-lg gba:mb-2 gba:border-2 ${
        isSelected ? 'gba:border-foreground gba:shadow-sm' : 'gba:border-transparent hover:gba:bg-accent/50'
      }`}
      onClick={() => onView(flow)}
      data-testid={`flow-card-${flow.id}`}
    >
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
})
