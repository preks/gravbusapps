import React, { useState, useMemo } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Spinner,
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@newwork/nw-design-system'
import { CaretLeftIcon, CaretRightIcon, CheckSquareIcon, CalendarBlankIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { TaskDetailSheet } from '@/common/components/common-relations/detail-sheets/task-detail-sheet'
import { ActivityDetailSheet } from '@/common/components/common-relations/detail-sheets/activity-detail-sheet/ActivityDetailSheet'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { AppAction } from '@/components/app-action/AppAction'
import type { GenericActivity, GenericTask, PersonalWorkspaceConfig } from '../../types'
import dayjs from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import weekOfYear from 'dayjs/plugin/weekOfYear'

dayjs.extend(weekday)
dayjs.extend(weekOfYear)

export interface CompactTwoWeekCalendarProps extends Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'> {
  activities: GenericActivity[]
  tasks: GenericTask[]
  activitiesLoading: boolean
  tasksLoading: boolean
  activitiesError: Error | null
  tasksError: Error | null
  config: PersonalWorkspaceConfig
}

interface CalendarActivity {
  id: string
  title: string
  activityType?: { value: string; code?: string }
  occurredAt?: string
  createdAt: string
  isTask?: boolean // Flag to identify if this is a task
  originalTask?: GenericTask // Store original task data for detail sheet
  originalActivity?: GenericActivity // Store original activity data for detail sheet
  [key: string]: any
}

/**
 * Generic Compact Two-Week Calendar
 * Displays activities and tasks in a two-week calendar view
 */
export const CompactTwoWeekCalendar: React.FC<CompactTwoWeekCalendarProps> = ({
  activities,
  tasks,
  activitiesLoading,
  tasksLoading,
  activitiesError,
  tasksError,
  config,
  accessToken,
  userInfo
}) => {
  const [weekOffset, setWeekOffset] = useState(0) // 0 = current week, 1 = next week, -1 = prev week
  const [selectedTask, setSelectedTask] = useState<GenericTask | null>(null)
  const [selectedActivity, setSelectedActivity] = useState<GenericActivity | null>(null)

  // Calculate date range for 2 weeks (weekdays only)
  const startOfTwoWeeks = dayjs().add(weekOffset, 'week').startOf('week')

  // Calculate display range (Monday to Friday)
  const displayStartDate = startOfTwoWeeks.day(1) // Monday of first week
  const displayEndDate = startOfTwoWeeks.add(1, 'week').day(5) // Friday of second week

  // Transform tasks to calendar activities
  const tasksAsActivities: CalendarActivity[] = useMemo(() => {
    return tasks
      .filter(task => task.dueDate || task.startDate)
      .map(task => ({
        id: task.id,
        title: task.name || 'Untitled Task',
        activityType: { value: 'Task' },
        occurredAt: task.dueDate || task.startDate || task.createdAt,
        createdAt: task.createdAt,
        description: task.description || undefined,
        account: task.account || null,
        contact: task.contact || null,
        lead: task.lead || null,
        opportunity: task.opportunity || null,
        isTask: true, // Mark as task
        originalTask: task // Store original task data
      }))
  }, [tasks])

  // Transform activities to include original data
  const activitiesWithMeta: CalendarActivity[] = useMemo(() => {
    return activities.map(activity => ({
      ...activity,
      originalActivity: activity // Store original activity data
    }))
  }, [activities])

  // Combine activities and tasks
  const combinedItems = useMemo(() => {
    return [...activitiesWithMeta, ...tasksAsActivities]
  }, [activitiesWithMeta, tasksAsActivities])

  // Helper functions
  const getActivityTypeIcon = (type: string, size = 12) => {
    switch (type) {
      case 'Task':
        return <CheckSquareIcon size={size} weight="fill" className="gba:text-warning" />
      // All activities use same icon
      case 'Call':
      case 'Email':
      case 'Meeting':
      default:
        return <CalendarBlankIcon size={size} weight="fill" className="gba:text-info" />
    }
  }

  const getActivityColorClass = (activityType: string) => {
    const normalizedType = activityType?.trim() || 'Task'
    return normalizedType === 'Task' ? 'gba:bg-warning/10' : 'gba:bg-info/10'
  }

  // Generate 10 weekdays (2 weeks, excluding weekends)
  const calendarDays = useMemo(() => {
    const days = []
    for (let i = 0; i < 14; i++) {
      const date = startOfTwoWeeks.add(i, 'day')
      const dayOfWeek = date.day() // 0 = Sunday, 6 = Saturday

      // Skip weekends
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        continue
      }

      const dayItems = combinedItems.filter(item => {
        const itemDate = dayjs(item.occurredAt || item.createdAt).format('YYYY-MM-DD')
        return itemDate === date.format('YYYY-MM-DD')
      })
      days.push({
        date,
        isToday: date.isSame(dayjs(), 'day'),
        items: dayItems
      })
    }
    return days
  }, [startOfTwoWeeks, combinedItems])

  const isLoading = activitiesLoading || tasksLoading
  const error = activitiesError || tasksError

  // Determine flow contexts based on module
  const isIRM = config.module === 'irm'
  const taskCreateContext = isIRM ? FlowContextName.investmentTaskCreate : FlowContextName.customerTaskCreate
  const activityCreateContext = isIRM
    ? FlowContextName.investmentActivityCreate
    : FlowContextName.customerActivityCreate

  const handlePrevWeek = () => setWeekOffset(weekOffset - 1)
  const handleNextWeek = () => setWeekOffset(weekOffset + 1)
  const handleToday = () => setWeekOffset(0)

  // Handle item click - open detail sheet for both tasks and activities
  const handleItemClick = (item: CalendarActivity) => {
    if (item.isTask && item.originalTask) {
      setSelectedTask(item.originalTask)
    } else if (item.originalActivity) {
      setSelectedActivity(item.originalActivity)
    }
  }

  if (error) {
    return (
      <Card data-testid="compact-two-week-calendar-error">
        <CardHeader>
          <CardTitle>
            {config.entities.activity.pluralName} & {config.entities.task.pluralName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="gba:text-destructive gba:text-sm">{error.message}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid="compact-two-week-calendar">
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle>
            {config.entities.activity.pluralName} & {config.entities.task.pluralName}
          </CardTitle>
          <div className="gba:flex gba:items-center gba:gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleToday}
              disabled={weekOffset === 0}
              data-testid="calendar-today-button"
            >
              Today
            </Button>
            <Button size="icon" variant="ghost" onClick={handlePrevWeek} data-testid="calendar-prev-week">
              <CaretLeftIcon size={16} />
            </Button>
            <span className="gba:text-sm gba:font-medium gba:min-w-[120px] gba:text-center">
              {displayStartDate.format('MMM D')} - {displayEndDate.format('MMM D')}
            </span>
            <Button size="icon" variant="ghost" onClick={handleNextWeek} data-testid="calendar-next-week">
              <CaretRightIcon size={16} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
            <Spinner size="md" />
          </div>
        ) : (
          <div className="gba:space-y-4">
            {/* Week 1 */}
            <div>
              <div className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-2 gba:uppercase">
                Week {startOfTwoWeeks.week()}
              </div>
              <div className="gba:grid gba:grid-cols-5 gba:gap-2">
                {calendarDays.slice(0, 5).map(day => (
                  <DayCell
                    key={day.date.format('YYYY-MM-DD')}
                    day={day}
                    getActivityTypeIcon={getActivityTypeIcon}
                    getActivityColorClass={getActivityColorClass}
                    onItemClick={handleItemClick}
                    taskEnabled={config.entities.task.enabled}
                    activityEnabled={config.entities.activity.enabled}
                    accessToken={accessToken || ''}
                    taskCreateContext={taskCreateContext}
                    activityCreateContext={activityCreateContext}
                  />
                ))}
              </div>
            </div>

            {/* Week 2 */}
            <div>
              <div className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-2 gba:uppercase">
                Week {startOfTwoWeeks.add(7, 'days').week()}
              </div>
              <div className="gba:grid gba:grid-cols-5 gba:gap-2">
                {calendarDays.slice(5, 10).map(day => (
                  <DayCell
                    key={day.date.format('YYYY-MM-DD')}
                    day={day}
                    getActivityTypeIcon={getActivityTypeIcon}
                    getActivityColorClass={getActivityColorClass}
                    onItemClick={handleItemClick}
                    taskEnabled={config.entities.task.enabled}
                    activityEnabled={config.entities.activity.enabled}
                    accessToken={accessToken || ''}
                    taskCreateContext={taskCreateContext}
                    activityCreateContext={activityCreateContext}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {/* Task Detail Sheet */}
      {selectedTask && (
        <TaskDetailSheet
          task={selectedTask as any}
          open={!!selectedTask}
          onOpenChange={open => {
            if (!open) setSelectedTask(null)
          }}
          buildReferenceUrl={config.myTasksConfig?.buildReferenceUrl}
          data-testid="calendar-task-detail-sheet"
          businessAppContext={{ accessToken, userInfo } as BusinessAppContextProps}
        />
      )}

      {/* Activity Detail Sheet */}
      {selectedActivity && (
        <ActivityDetailSheet
          activity={selectedActivity as any}
          open={!!selectedActivity}
          onOpenChange={(open: boolean) => {
            if (!open) setSelectedActivity(null)
          }}
          data-testid="calendar-activity-detail-sheet"
        />
      )}
    </Card>
  )
}

interface DayCellProps {
  day: {
    date: dayjs.Dayjs
    isToday: boolean
    items: CalendarActivity[]
  }
  getActivityTypeIcon: (type: string, size?: number) => React.ReactNode
  getActivityColorClass: (activityType: string) => string
  onItemClick: (item: CalendarActivity) => void
  taskEnabled: boolean
  activityEnabled: boolean
  accessToken: string
  taskCreateContext: FlowContextName
  activityCreateContext: FlowContextName
}

const DayCell: React.FC<DayCellProps> = ({
  day,
  getActivityTypeIcon,
  getActivityColorClass,
  onItemClick,
  taskEnabled,
  activityEnabled,
  accessToken,
  taskCreateContext,
  activityCreateContext
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const maxActivities = 3
  const hasMore = day.items.length > maxActivities
  const displayedActivities = day.items.slice(0, maxActivities)

  return (
    <div
      className={`gba:border gba:rounded gba:p-1.5 gba:h-[130px] gba:relative gba:flex gba:flex-col ${
        day.isToday ? 'gba:ring-2 gba:ring-primary gba:bg-primary/5' : 'gba:bg-background'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      data-testid={`day-cell-${day.date.format('YYYY-MM-DD')}`}
    >
      {/* Hover Action Icons - Top Right Corner */}
      {isHovered && (taskEnabled || activityEnabled) && (
        <div className="gba:absolute gba:top-1 gba:right-1 gba:flex gba:gap-0.5 gba:z-10">
          {taskEnabled && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <AppAction
                    contexts={[{ context: taskCreateContext, contextData: { dueDate: day.date.format('YYYY-MM-DD') } }]}
                    accessToken={accessToken}
                    emptyState="hide"
                    lazyLoad
                    prefixDataTestId={`calendar-quick-task-${day.date.format('YYYY-MM-DD')}`}
                  >
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation()
                      }}
                      className="gba:w-7 gba:h-7 gba:flex gba:items-center gba:justify-center gba:rounded gba:bg-background/90 gba:border gba:border-border/50 hover:gba:bg-accent hover:gba:shadow-md gba:transition-all gba:duration-200 gba:shadow-sm gba:cursor-pointer"
                      data-testid={`create-task-${day.date.format('YYYY-MM-DD')}`}
                      title="Add Task"
                    >
                      <CheckSquareIcon
                        size={16}
                        weight="fill"
                        className="gba:text-warning gba:transition-transform gba:duration-200 gba:hover:scale-125"
                      />
                    </button>
                  </AppAction>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">Add Task</TooltipContent>
            </Tooltip>
          )}

          {activityEnabled && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <AppAction
                    contexts={[{ context: activityCreateContext, contextData: { occurredAt: day.date.toISOString() } }]}
                    accessToken={accessToken}
                    emptyState="hide"
                    lazyLoad
                    prefixDataTestId={`calendar-quick-activity-${day.date.format('YYYY-MM-DD')}`}
                  >
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation()
                      }}
                      className="gba:w-7 gba:h-7 gba:flex gba:items-center gba:justify-center gba:rounded gba:bg-background/90 gba:border gba:border-border/50 hover:gba:bg-accent hover:gba:shadow-md gba:transition-all gba:duration-200 gba:shadow-sm gba:cursor-pointer"
                      data-testid={`create-activity-${day.date.format('YYYY-MM-DD')}`}
                      title="Add Activity"
                    >
                      <CalendarBlankIcon
                        size={16}
                        weight="fill"
                        className="gba:text-info gba:transition-transform gba:duration-200 gba:hover:scale-125"
                      />
                    </button>
                  </AppAction>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">Add Activity</TooltipContent>
            </Tooltip>
          )}
        </div>
      )}

      {/* Day header */}
      <div className="gba:flex gba:flex-col gba:mb-1 gba:shrink-0">
        <span
          className={`gba:text-[10px] gba:font-medium gba:uppercase ${
            day.isToday ? 'gba:text-primary' : 'gba:text-muted-foreground'
          }`}
        >
          {day.date.format('ddd')}
        </span>
        <span className={`gba:text-sm gba:font-semibold ${day.isToday ? 'gba:text-primary' : 'gba:text-gray-700'}`}>
          {day.date.date()}
        </span>
      </div>

      {/* Activities list */}
      <div className="gba:flex-1 gba:flex gba:flex-col gba:overflow-hidden">
        <div className="gba:space-y-1 gba:flex-1">
          {displayedActivities.map(activity => {
            const activityType = activity.activityType?.value || 'Task'
            const isTask = activity.isTask
            return (
              <button
                type="button"
                key={activity.id}
                onClick={() => onItemClick(activity)}
                className={`gba:w-full gba:px-1.5 gba:py-1 gba:rounded gba:text-[11px] gba:text-left gba:border-0 gba:flex gba:items-center gba:gap-1 gba:cursor-pointer hover:gba:opacity-80 ${getActivityColorClass(activityType)}`}
                data-testid={`${isTask ? 'task' : 'activity'}-${activity.id}`}
              >
                {getActivityTypeIcon(activityType, 11)}
                <span className="gba:truncate gba:flex-1 gba:text-gray-700">{activity.title}</span>
              </button>
            )
          })}
        </div>
        {hasMore && (
          <button
            type="button"
            className="gba:text-xs gba:text-center gba:text-primary gba:font-medium gba:mt-1 gba:shrink-0 gba:w-full gba:bg-transparent gba:border-0 gba:cursor-pointer hover:gba:underline gba:p-0"
            data-testid={`show-more-${day.date.format('YYYY-MM-DD')}`}
          >
            +{day.items.length - maxActivities} more
          </button>
        )}
      </div>
    </div>
  )
}

export default CompactTwoWeekCalendar
