'use client'

import React, { useState, useRef } from 'react'
import { Card, CardContent, Alert, Badge, Icon, Button } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel, formatDate } from '@/common/utils/windowUtils'
import { useTimeInterventions } from '../hooks/useTimeInterventions'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { CalendarXIcon, WarningCircleIcon, ArrowsClockwiseIcon, LightningIcon } from '@phosphor-icons/react'

interface InterventionsTableProps {
  employeeId: string
  accessToken: string
  workingHours?: {
    sundayHours?: number
    mondayHours?: number
    tuesdayHours?: number
    wednesdayHours?: number
    thursdayHours?: number
    fridayHours?: number
    saturdayHours?: number
  }
  onReviewClick?: () => void
  defaultExpanded?: boolean
}

const formatHm = (minutes: number) => {
  const h = Math.floor(Math.max(0, minutes) / 60)
  const m = Math.max(0, minutes) % 60
  return `${h}:${String(m).padStart(2, '0')}`
}

export const InterventionsTable: React.FC<InterventionsTableProps> = ({
  employeeId,
  accessToken,
  workingHours,
  onReviewClick,
  defaultExpanded = false
}) => {
  const { items, isLoading, error } = useTimeInterventions({
    employeeId,
    accessToken,
    workingHours
  })

  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const headerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Show only entries up to "today" (hide future dates within the month)
  const visibleItems = React.useMemo(() => {
    const now = new Date()
    // Normalize to the start of day; exclude today's items
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    return items.filter(item => {
      try {
        const d = new Date(item.date)
        return d.getTime() < todayStart.getTime()
      } catch {
        return true
      }
    })
  }, [items])

  const toggleExpanded = () => {
    setIsExpanded(prev => {
      const next = !prev
      if (!prev) {
        // Scroll header into view after expansion renders
        setTimeout(() => {
          headerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 0)
      }
      return next
    })
  }

  const getReason = (reason: string) => {
    if (reason === 'MISSING_HOURS')
      return getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.interventions.missing_hours', 'Missing hours')
    if (reason === 'NO_ATTENDANCE')
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:time_tracking.interventions.no_attendance',
        'No attendance recorded'
      )
    return getTranslationFromI18nKeyAndLabel(
      'lowcoder:time_tracking.interventions.absence_with_attendance',
      'Absence and attendance overlap'
    )
  }

  const getBadgeVariant = (reason: string): any => {
    switch (reason) {
      case 'MISSING_HOURS':
        return 'warning'
      case 'NO_ATTENDANCE':
        return 'info'
      case 'ABSENCE_WITH_ATTENDANCE':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  const getReasonIcon = (reason: string) => {
    switch (reason) {
      case 'MISSING_HOURS':
        return WarningCircleIcon
      case 'NO_ATTENDANCE':
        return CalendarXIcon
      case 'ABSENCE_WITH_ATTENDANCE':
        return ArrowsClockwiseIcon
      default:
        return WarningCircleIcon
    }
  }

  return (
    <Card className="" data-testid="time-interventions-card">
      <CardContent className="gba:p-4">
        <div className="gba:mb-3" data-testid="time-interventions-header" ref={headerRef}>
          <div className="gba:flex gba:items-start gba:gap-2">
            <div
              className="gba:flex gba:h-10 gba:w-10 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-full gba:bg-ai/10 gba:text-ai"
              data-testid="time-interventions-assistant-icon"
            >
              <Icon icon={isExpanded ? LightningIcon : WarningCircleIcon} />
            </div>
            <div className="gba:text-base gba:font-semibold">
              {isExpanded ? (
                <>
                  <span>NEWWORK </span>
                  <span className="gba:text-ai">EveryAI Assistant</span>
                  <span>
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:time_tracking.interventions.header_expanded_suffix',
                      ' noticed ...'
                    )}
                  </span>
                </>
              ) : (
                <>
                  <span>NEWWORK </span>
                  <span className="gba:text-ai">EveryAI Assistant</span>
                  <span>
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:time_tracking.interventions.header_collapsed_suffix',
                      ' noticed data that need your attention!'
                    )}
                  </span>
                </>
              )}
            </div>
          </div>
          {!defaultExpanded && (
            <Button
              variant="outline"
              className="gba:w-full gba:mt-3"
              onClick={onReviewClick ?? toggleExpanded}
              data-testid="time-interventions-toggle-button"
            >
              {isExpanded
                ? getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.interventions.hide', 'Hide')
                : getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.interventions.review', 'Review')}
            </Button>
          )}
        </div>

        {isExpanded && (
          <>
            {error && (
              <Alert variant="destructive" className="gba:w-full gba:whitespace-normal gba:!inline-block gba:mb-3">
                {error}
              </Alert>
            )}

            <div className="gba:w-full" data-testid="time-interventions-list" ref={listRef}>
              {isLoading && (
                <div className="gba:py-3">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:common.loading', 'Loading...')}
                </div>
              )}
              {!isLoading && visibleItems.length === 0 && (
                <div className="gba:py-3">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.interventions.empty', 'No issues found')}
                </div>
              )}
              {!isLoading && visibleItems.length > 0 && (
                <div className="gba:grid gba:grid-cols-1 gba:sm:grid-cols-2 gba:lg:grid-cols-3 gba:gap-3">
                  {visibleItems.map(item => {
                    const IconCmp = getReasonIcon(item.reason)
                    // Prefer platform formatter; if it returns ISO, fall back to local-only date
                    let dateText = String(formatDate(item.date, 'date.short') || '')
                    if (dateText.includes('T')) {
                      try {
                        dateText = new Date(item.date).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit'
                        })
                      } catch {
                        dateText = String(item.date).split('T')[0]
                      }
                    }
                    const deficit = Math.max(0, item.plannedMinutes - item.workedMinutes)
                    return (
                      <Card key={item.date} data-testid={`time-interventions-item-${item.date}`}>
                        <CardContent className="gba:p-3">
                          <div className="gba:flex gba:items-start gba:justify-between gba:gap-3">
                            <div className="gba:flex gba:items-center gba:gap-3">
                              <div className="gba:flex gba:h-9 gba:w-9 gba:items-center gba:justify-center gba:rounded-full gba:bg-muted gba:text-muted-foreground">
                                <Icon icon={IconCmp} />
                              </div>
                              <div className="gba:flex gba:flex-col">
                                <div className="gba:flex gba:items-center gba:gap-2">
                                  <div className="gba:font-medium">{dateText}</div>
                                  <Badge
                                    variant={getBadgeVariant(item.reason)}
                                    data-testid={`time-interventions-reason-${item.date}`}
                                  >
                                    {getReason(item.reason)}
                                  </Badge>
                                </div>
                                <div className="gba:text-sm gba:text-muted-foreground">
                                  {getTranslationFromI18nKeyAndLabel(
                                    'lowcoder:time_tracking.interventions.planned',
                                    'Planned'
                                  )}{' '}
                                  {formatHm(item.plannedMinutes)} •{' '}
                                  {getTranslationFromI18nKeyAndLabel(
                                    'lowcoder:time_tracking.interventions.worked',
                                    'Worked'
                                  )}{' '}
                                  {formatHm(item.workedMinutes)}
                                  {deficit > 0
                                    ? ` • ${getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.interventions.ballance', 'Balance')} -${formatHm(deficit)}`
                                    : ''}
                                </div>
                              </div>
                            </div>
                            <div className="gba:flex gba:justify-start">
                              <AppAction
                                variant="update-secondary"
                                data-testid={`time-interventions-update-button-${item.date}`}
                                contexts={[
                                  {
                                    context: FlowContextName.employeeAttendanceCorrectionRequest,
                                    contextData: {
                                      employeeId,
                                      attendanceDateISO: new Date(item.date).toISOString().slice(0, 10),
                                      reason: item.reason
                                    }
                                  }
                                ]}
                                prefixDataTestId="time-interventions-update"
                                accessToken={accessToken}
                                onClick={e => e.stopPropagation()}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default InterventionsTable
