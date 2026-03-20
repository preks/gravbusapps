import React, { useState, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Spinner,
  Alert,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  Badge,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  ScrollArea,
  Avatar,
  AvatarImage,
  AvatarFallback
} from '@newwork/nw-design-system'
import {
  CalendarIcon,
  CaretLeftIcon,
  CaretRightIcon,
  PhoneIcon,
  EnvelopeIcon,
  UsersIcon,
  ListChecksIcon,
  UserIcon,
  LinkIcon,
  ClockCounterClockwiseIcon,
  TextAlignLeftIcon,
  TagIcon,
  ArrowSquareOutIcon
} from '@phosphor-icons/react'
import { ACTIVITY_TYPE_COLORS } from '../sales-member-performance/components/activities/types'
import { calculateActivityScore, getScoreBadgeVariant } from '../../utils/activityScoreCalculator'
import { getActivityTypeVariant } from '../../utils/activityHelpers'
import { ActivityDetailSheet } from '@/common/components/common-relations/detail-sheets/activity-detail-sheet'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'

const getInitials = (firstName: string, lastName: string): string => {
  const first = firstName?.charAt(0)?.toUpperCase() || ''
  const last = lastName?.charAt(0)?.toUpperCase() || ''
  return `${first}${last}` || '??'
}
import dayjs from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import localeData from 'dayjs/plugin/localeData'

dayjs.extend(weekday)
dayjs.extend(localeData)

// Generic activity interface that works for both individual and team
export interface CalendarActivity {
  id: string
  title: string
  activityType?: { value: string } | null
  occurredAt?: string | null
  createdAt: string
  activityScore?: number | null
  ownerEmployee?: {
    id?: string
    fullName?: string
    firstName?: string
    lastName?: string
    pictureThumbnail?: string | null
  } | null
  ownerEmployeeId?: string | null
  // Entity references
  account?: { id?: string; name?: string } | null
  contact?: { id?: string; firstName?: string; lastName?: string } | null
  lead?: { id?: string; name?: string; contact?: { firstName?: string; lastName?: string } } | null
  opportunity?: { id?: string; name?: string } | null
  description?: string | null
}

export interface MemberFilter {
  id: string
  label: string
  isManager?: boolean
}

// Absence period for calendar display
export interface CalendarAbsence {
  id: string
  employeeId: string
  startDate: string
  endDate: string
  type?: string
  status?: string
}

export interface SharedActivitiesCalendarProps {
  activities: CalendarActivity[]
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
  currentDate: dayjs.Dayjs
  onDateChange: (date: dayjs.Dayjs) => void
  // Optional member filter
  memberFilters?: MemberFilter[]
  selectedMember?: string
  onMemberChange?: (memberId: string) => void
  managerInfo?: { id: string; fullName: string } | null
  dataTestIdPrefix?: string
  showActivityScores?: boolean // Show activity score badges (default: false)
  accessToken: string // Required for loading activity details
  compact?: boolean // Use compact height for calendar cells (default: false)
  absences?: CalendarAbsence[] // Optional absences to display on calendar
}

export const SharedActivitiesCalendar: React.FC<SharedActivitiesCalendarProps> = ({
  activities,
  isLoading,
  error,
  onRetry,
  currentDate,
  onDateChange,
  memberFilters,
  selectedMember,
  onMemberChange,
  managerInfo,
  dataTestIdPrefix = 'SharedActivitiesCalendar',
  showActivityScores = false,
  accessToken,
  compact = false,
  absences = []
}) => {
  const [selectedActivity, setSelectedActivity] = useState<CalendarActivity | null>(null)
  const [activityDetailOpen, setActivityDetailOpen] = useState(false)
  const [dayActivities, setDayActivities] = useState<CalendarActivity[]>([])
  const [dayLabel, setDayLabel] = useState<string>('')
  const [dayListOpen, setDayListOpen] = useState(false)

  // Helper to check if a day falls within any absence period
  const getAbsenceForDay = (day: dayjs.Dayjs): CalendarAbsence | undefined => {
    return absences.find(absence => {
      const start = dayjs(absence.startDate).startOf('day')
      const end = dayjs(absence.endDate).endOf('day')
      return day.isSame(start, 'day') || day.isSame(end, 'day') || (day.isAfter(start) && day.isBefore(end))
    })
  }

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const startOfMonth = currentDate.startOf('month')
    const endOfMonth = currentDate.endOf('month')
    const startDate = startOfMonth.startOf('week')
    const endDate = endOfMonth.endOf('week')

    const days: Array<{
      date: dayjs.Dayjs
      isCurrentMonth: boolean
      isToday: boolean
      activities: CalendarActivity[]
      absence?: CalendarAbsence
    }> = []

    let day = startDate

    while (day.isBefore(endDate) || day.isSame(endDate, 'day')) {
      const dayActivities = activities.filter(activity => {
        // Use occurredAt for calendar display, fallback to createdAt if not available
        const activityDate = dayjs(activity.occurredAt || activity.createdAt).format('YYYY-MM-DD')
        return activityDate === day.format('YYYY-MM-DD')
      })

      days.push({
        date: day,
        isCurrentMonth: day.month() === currentDate.month(),
        isToday: day.isSame(dayjs(), 'day'),
        activities: dayActivities,
        absence: getAbsenceForDay(day)
      })
      day = day.add(1, 'day')
    }

    return days
  }, [currentDate, activities, absences])

  // Helper functions
  const getActivityTypeIcon = (type: string, size = 12) => {
    switch (type) {
      case 'Call':
        return <PhoneIcon size={size} />
      case 'Email':
        return <EnvelopeIcon size={size} />
      case 'Meeting':
        return <UsersIcon size={size} />
      case 'Task':
        return <ListChecksIcon size={size} />
      default:
        return <ListChecksIcon size={size} />
    }
  }

  const getActivityColor = (activityType: string) => {
    const normalizedType = activityType?.trim() || 'Task'
    return ACTIVITY_TYPE_COLORS[normalizedType] || ACTIVITY_TYPE_COLORS['Task']
  }

  const getEntityName = (activity: CalendarActivity): string => {
    if (activity.account?.name) return activity.account.name
    if (activity.contact?.firstName || activity.contact?.lastName) {
      return `${activity.contact.firstName || ''} ${activity.contact.lastName || ''}`.trim()
    }
    if (activity.lead?.name) return activity.lead.name
    if (activity.lead?.contact?.firstName || activity.lead?.contact?.lastName) {
      return `${activity.lead.contact.firstName || ''} ${activity.lead.contact.lastName || ''}`.trim()
    }
    if (activity.opportunity?.name) return activity.opportunity.name
    return 'No reference'
  }

  const handlePreviousMonth = () => {
    onDateChange(currentDate.subtract(1, 'month'))
  }

  const handleNextMonth = () => {
    onDateChange(currentDate.add(1, 'month'))
  }

  const handleActivityClick = (activity: CalendarActivity) => {
    setSelectedActivity(activity)
    setActivityDetailOpen(true)
  }

  const handleActivityDetailClose = (open: boolean) => {
    setActivityDetailOpen(open)
    if (!open) {
      setSelectedActivity(null)
    }
  }

  const handleDayClick = (dayInfo: (typeof calendarDays)[0]) => {
    setDayActivities(dayInfo.activities)
    setDayLabel(dayInfo.date.format('MMMM D, YYYY'))
    setDayListOpen(true)
  }

  // Map CalendarActivity to the shape ActivityDetailSheet expects
  const toActivityDetail = (activity: CalendarActivity | null) => {
    if (!activity) return null
    return {
      ...activity,
      accountId: activity.account?.id || null,
      contactId: activity.contact?.id || null,
      leadId: activity.lead?.id || null,
      opportunityId: activity.opportunity?.id || null,
      ownerEmployee: activity.ownerEmployee
        ? {
            ...activity.ownerEmployee,
            displayName:
              activity.ownerEmployee.fullName ||
              `${activity.ownerEmployee.firstName || ''} ${activity.ownerEmployee.lastName || ''}`.trim()
          }
        : null
    }
  }

  if (error) {
    return (
      <Card>
        <CardContent className="gba:p-6">
          <Alert variant="destructive" className="gba:mb-4">
            <p>{error}</p>
          </Alert>
          {onRetry && (
            <Button onClick={onRetry} variant="outline" size="sm">
              Retry
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card data-testid={`${dataTestIdPrefix}-card`}>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:justify-between gba:flex-wrap gba:gap-4">
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <CalendarIcon size={20} />
              Activities Calendar
            </CardTitle>
            <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
              {memberFilters && memberFilters.length > 0 && onMemberChange && (
                <Select value={selectedMember || 'all'} onValueChange={onMemberChange}>
                  <SelectTrigger className="gba:w-[200px]">
                    <SelectValue placeholder="Select member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Team Members</SelectItem>
                    {managerInfo && <SelectItem value="manager">{managerInfo.fullName} (Manager)</SelectItem>}
                    {memberFilters.map(member => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="gba:flex gba:items-center gba:gap-2">
                <Button variant="outline" size="icon" onClick={handlePreviousMonth} disabled={isLoading}>
                  <CaretLeftIcon size={20} />
                </Button>
                <span className="gba:min-w-[140px] gba:text-center gba:font-medium">
                  {currentDate.format('MMMM YYYY')}
                </span>
                <Button variant="outline" size="icon" onClick={handleNextMonth} disabled={isLoading}>
                  <CaretRightIcon size={20} />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="gba:flex gba:justify-center gba:items-center gba:py-12">
              <Spinner size="lg" />
            </div>
          ) : (
            <div className="gba:grid gba:grid-cols-7 gba:gap-1">
              {/* Day headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="gba:text-center gba:font-semibold gba:text-sm gba:text-gray-700 gba:py-2">
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              {calendarDays.map(dayInfo => {
                // In compact mode, show 3 activities, then "more" link
                const maxActivities = compact ? 3 : 3
                const hasMore = dayInfo.activities.length > maxActivities
                const displayedActivities = dayInfo.activities.slice(0, maxActivities)

                return (
                  <div
                    key={dayInfo.date.format('YYYY-MM-DD')}
                    className={`${compact ? 'gba:h-[130px]' : 'gba:h-[270px]'} gba:border gba:rounded gba:p-1.5 gba:relative gba:flex gba:flex-col ${
                      dayInfo.isCurrentMonth ? 'gba:bg-hsl(var(--background))' : 'gba:bg-gray-50'
                    } ${dayInfo.isToday ? 'gba:ring-2 gba:ring-primary' : ''} ${
                      dayInfo.absence ? 'gba:bg-info/10 gba:border-info/30' : ''
                    }`}
                    data-testid={`${dataTestIdPrefix}-day-${dayInfo.date.format('YYYY-MM-DD')}`}
                  >
                    <div className="gba:flex gba:items-center gba:justify-between gba:mb-1 gba:shrink-0">
                      <span
                        className={`gba:text-sm gba:font-medium ${
                          dayInfo.isToday ? 'gba:text-primary' : 'gba:text-gray-700'
                        }`}
                      >
                        {dayInfo.date.date()}
                      </span>
                      {/* Absence indicator */}
                      {dayInfo.absence && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="gba:flex gba:items-center gba:gap-0.5 gba:px-1 gba:py-0.5 gba:rounded gba:bg-info/20 gba:text-info gba:text-[9px] gba:font-medium">
                              <CalendarIcon size={10} />
                              <span>{compact ? 'Out' : dayInfo.absence.type || 'Absence'}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {dayInfo.absence.type || 'Absence'} ({dayInfo.absence.status || 'Approved'})
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>

                    {/* Show activities */}
                    <div className="gba:flex-1 gba:flex gba:flex-col gba:overflow-hidden">
                      <div className={`${compact ? 'gba:space-y-0.5' : 'gba:space-y-1'} gba:flex-1`}>
                        {displayedActivities.map(activity => {
                          const activityType = activity.activityType?.value || 'Task'
                          // Calculate score dynamically using the formula
                          const activityScore = calculateActivityScore(activity.createdAt, activity.occurredAt)
                          const formatTime = (dateStr: string) => dayjs(dateStr).format('HH:mm')
                          const isManagerActivity = managerInfo && activity.ownerEmployeeId === managerInfo.id

                          // Compact mode: simplified display
                          if (compact) {
                            return (
                              <button
                                type="button"
                                key={activity.id}
                                onClick={e => {
                                  e.stopPropagation()
                                  handleActivityClick(activity)
                                }}
                                className="gba:w-full gba:px-1 gba:py-0.5 gba:rounded gba:text-[10px] gba:cursor-pointer hover:gba:opacity-80 gba:text-left gba:border-0 gba:bg-transparent gba:flex gba:items-center gba:gap-1"
                                style={{
                                  backgroundColor: `${getActivityColor(activityType)}15`
                                }}
                                data-testid={`${dataTestIdPrefix}-activity-${activity.id}`}
                              >
                                <div style={{ color: getActivityColor(activityType) }}>
                                  {getActivityTypeIcon(activityType, 10)}
                                </div>
                                <span className="gba:truncate gba:flex-1 gba:text-gray-700">{activity.title}</span>
                              </button>
                            )
                          }

                          // Regular mode: full display
                          return (
                            <button
                              type="button"
                              key={activity.id}
                              onClick={() => handleActivityClick(activity)}
                              className="gba:w-full gba:p-1 gba:rounded gba:text-xs gba:relative gba:cursor-pointer gba:transition-opacity hover:gba:opacity-80 gba:text-left gba:border-0 gba:bg-transparent"
                              style={{
                                backgroundColor: `${getActivityColor(activityType)}15`
                              }}
                              data-testid={`${dataTestIdPrefix}-activity-${activity.id}`}
                            >
                              <div className="gba:flex gba:items-center gba:gap-1 gba:mb-1">
                                <div style={{ color: getActivityColor(activityType) }}>
                                  {getActivityTypeIcon(activityType, 10)}
                                </div>
                                <span
                                  className="gba:font-medium gba:truncate gba:flex-1"
                                  style={{ color: getActivityColor(activityType) }}
                                >
                                  {activity.occurredAt ? formatTime(activity.occurredAt) : 'No time'}
                                </span>
                                {showActivityScores && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge
                                        variant={getScoreBadgeVariant(activityScore)}
                                        className="gba:text-[10px] gba:px-1"
                                      >
                                        {activityScore}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>Activity Score: {activityScore}%</TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                              <div className="gba:truncate gba:text-gray-700">
                                {isManagerActivity && <span className="gba:text-yellow-600">[MGR] </span>}
                                {activity.title}
                              </div>
                              <div className="gba:text-[10px] gba:text-gray-500 gba:truncate">
                                {getEntityName(activity)}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                      {hasMore && (
                        <button
                          type="button"
                          onClick={() => handleDayClick(dayInfo)}
                          className="gba:text-xs gba:text-center gba:text-primary gba:font-medium gba:mt-1 gba:shrink-0 gba:w-full gba:bg-transparent gba:border-0 gba:cursor-pointer hover:gba:underline gba:p-0"
                          data-testid={`${dataTestIdPrefix}-show-more-${dayInfo.date.format('YYYY-MM-DD')}`}
                        >
                          +{dayInfo.activities.length - maxActivities} more
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Day Activities Sheet — same style as ActivityDetailSheet, one card per activity */}
      <Sheet open={dayListOpen} onOpenChange={setDayListOpen}>
        <SheetContent className="gba:w-[500px]! gba:sm:w-[500px]! gba:max-w-[90vw]! gba:p-0 gba:flex gba:flex-col gba:overflow-hidden">
          <SheetHeader className="gba:px-6 gba:py-6 gba:border-b gba:border-border gba:shrink-0">
            <SheetTitle className="gba:text-xl gba:font-semibold gba:text-left gba:mb-3">
              {dayLabel} · {dayActivities.length} {dayActivities.length === 1 ? 'activity' : 'activities'}
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="gba:flex-1 gba:min-h-0">
            <div className="gba:flex gba:flex-col gba:gap-6 gba:px-6 gba:py-6">
              {dayActivities.map(activity => {
                const activityType = activity.activityType?.value || 'Other'
                const ownerName =
                  activity.ownerEmployee?.fullName ||
                  `${activity.ownerEmployee?.firstName || ''} ${activity.ownerEmployee?.lastName || ''}`.trim() ||
                  null
                const entityName = getEntityName(activity)
                const referenceName = entityName === 'No reference' ? null : entityName

                return (
                  <div
                    key={activity.id}
                    className="gba:space-y-4"
                    data-testid={`${dataTestIdPrefix}-day-activity-${activity.id}`}
                  >
                    {/* Title — matches SheetTitle in ActivityDetailSheet */}
                    <p className="gba:text-xl gba:font-semibold">{activity.title}</p>

                    {/* Overview Card — identical structure to ActivityDetailSheet */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="gba:text-base">Overview</CardTitle>
                      </CardHeader>
                      <CardContent className="gba:space-y-3">
                        {/* Type */}
                        <div className="gba:flex gba:items-start gba:gap-3 gba:py-2">
                          <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-[100px] gba:text-sm gba:text-muted-foreground">
                            <TagIcon size={14} className="gba:text-muted-foreground" />
                            <span>Type</span>
                          </div>
                          <div className="gba:flex-1">
                            <Badge variant={getActivityTypeVariant(activityType)}>{activityType}</Badge>
                          </div>
                        </div>

                        {/* Reference */}
                        {referenceName && (
                          <div className="gba:flex gba:items-start gba:gap-3 gba:py-2">
                            <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-[100px] gba:text-sm gba:text-muted-foreground">
                              <LinkIcon size={14} className="gba:text-muted-foreground" />
                              <span>Reference</span>
                            </div>
                            <div className="gba:flex-1">
                              <span className="gba:text-sm gba:font-medium">{referenceName}</span>
                            </div>
                          </div>
                        )}

                        {/* Created By — same as ActivityDetailSheet: Avatar + Tooltip + ArrowSquareOut */}
                        {activity.ownerEmployee && (
                          <div className="gba:flex gba:items-start gba:gap-3 gba:py-2">
                            <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-[100px] gba:text-sm gba:text-muted-foreground">
                              <UserIcon size={14} className="gba:text-muted-foreground" />
                              <span>Created By</span>
                            </div>
                            <div className="gba:flex-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer hover:gba:bg-accent gba:rounded gba:p-1 gba:-m-1 gba:transition-colors gba:border-0 gba:bg-transparent gba:min-w-0 gba:max-w-full"
                                    onClick={() => {
                                      if (activity.ownerEmployeeId) {
                                        navigateTo(
                                          buildPlatformUrl('/platform/employee-record', {
                                            employeeId: activity.ownerEmployeeId
                                          })
                                        )
                                      }
                                    }}
                                  >
                                    <Avatar size="sm" className="gba:size-6 gba:shrink-0">
                                      {activity.ownerEmployee.pictureThumbnail && (
                                        <AvatarImage
                                          src={`data:image/gif;base64,${activity.ownerEmployee.pictureThumbnail}`}
                                          alt={activity.ownerEmployee.fullName || ownerName || ''}
                                        />
                                      )}
                                      <AvatarFallback className="gba:text-xs">
                                        {getInitials(
                                          activity.ownerEmployee.firstName || '',
                                          activity.ownerEmployee.lastName || ''
                                        )}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="gba:text-sm gba:font-medium gba:truncate">{ownerName}</span>
                                    <ArrowSquareOutIcon size={12} className="gba:text-muted-foreground gba:shrink-0" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>View employee profile</TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        )}

                        {/* Created */}
                        <div className="gba:flex gba:items-start gba:gap-3 gba:py-2">
                          <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-[100px] gba:text-sm gba:text-muted-foreground">
                            <CalendarIcon size={14} className="gba:text-muted-foreground" />
                            <span>Created</span>
                          </div>
                          <div className="gba:flex-1">
                            <span className="gba:text-sm gba:text-foreground">
                              {dayjs(activity.createdAt).format('MMM D, YYYY h:mm A')}
                            </span>
                          </div>
                        </div>

                        {/* Occurred */}
                        {activity.occurredAt && (
                          <div className="gba:flex gba:items-start gba:gap-3 gba:py-2">
                            <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-[100px] gba:text-sm gba:text-muted-foreground">
                              <ClockCounterClockwiseIcon size={14} className="gba:text-muted-foreground" />
                              <span>Occurred</span>
                            </div>
                            <div className="gba:flex-1">
                              <span className="gba:text-sm gba:text-foreground">
                                {dayjs(activity.occurredAt).format('MMM D, YYYY h:mm A')}
                              </span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Description Card */}
                    {activity.description && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="gba:text-base">Description</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="gba:flex gba:items-start gba:gap-3">
                            <TextAlignLeftIcon size={14} className="gba:text-muted-foreground gba:mt-0.5" />
                            <p className="gba:text-sm gba:text-foreground gba:whitespace-pre-wrap gba:flex-1">
                              {activity.description}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Divider between activities */}
                    <div className="gba:border-t gba:border-border" />
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Activity Detail Sheet */}
      <ActivityDetailSheet
        activity={toActivityDetail(selectedActivity) as any}
        open={activityDetailOpen}
        onOpenChange={handleActivityDetailClose}
        accessToken={accessToken}
        data-testid={`${dataTestIdPrefix}-activity-detail`}
      />
    </>
  )
}

export default SharedActivitiesCalendar
