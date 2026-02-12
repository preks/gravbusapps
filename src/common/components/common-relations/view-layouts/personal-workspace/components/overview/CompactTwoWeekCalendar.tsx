import React, { useState, useMemo, useCallback } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Spinner,
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  toast
} from '@newwork/nw-design-system'
import {
  DndContext,
  DragOverlay,
  useSensors,
  useSensor,
  PointerSensor,
  DragEndEvent,
  DragStartEvent,
  useDraggable,
  useDroppable
} from '@dnd-kit/core'
import { CaretLeftIcon, CaretRightIcon, CheckSquareIcon, CalendarBlankIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { TaskDetailSheet } from '@/common/components/common-relations/detail-sheets/task-detail-sheet'
import { ActivityDetailSheet } from '@/common/components/common-relations/detail-sheets/activity-detail-sheet/ActivityDetailSheet'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { AppAction } from '@/components/app-action/AppAction'
import type { GenericActivity, GenericTask, PersonalWorkspaceConfig } from '../../types'
import { startProcess } from '@/common/utils/start-process'
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
  refetchActivities?: (dateRange?: { occurredAtFrom?: string; occurredAtTo?: string }) => void | Promise<void>
  refetchTasks?: (dateRange?: { dueDateFrom?: string; dueDateTo?: string }) => void | Promise<void>
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
  userInfo,
  refetchActivities,
  refetchTasks
}) => {
  const [weekOffset, setWeekOffset] = useState(0) // 0 = current week, 1 = next week, -1 = prev week
  const [selectedTask, setSelectedTask] = useState<GenericTask | null>(null)
  const [selectedActivity, setSelectedActivity] = useState<GenericActivity | null>(null)
  const [isInitialMount, setIsInitialMount] = useState(true)

  // Drag and drop state
  const [activeItem, setActiveItem] = useState<CalendarActivity | null>(null)
  const [recentProcessStarts, setRecentProcessStarts] = useState<Set<string>>(new Set())

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8 // Require 8px movement before drag starts (prevents accidental drags)
      }
    })
  )

  // Calculate date range for 2 weeks (weekdays only)
  const startOfTwoWeeks = useMemo(() => dayjs().add(weekOffset, 'week').startOf('week'), [weekOffset])

  // Mark as no longer initial mount after first render
  React.useEffect(() => {
    setIsInitialMount(false)
  }, [])

  // Store refetch functions in refs to prevent infinite loops
  const refetchActivitiesRef = React.useRef(refetchActivities)
  const refetchTasksRef = React.useRef(refetchTasks)

  React.useEffect(() => {
    refetchActivitiesRef.current = refetchActivities
    refetchTasksRef.current = refetchTasks
  }, [refetchActivities, refetchTasks])

  React.useEffect(() => {
    if (isInitialMount) {
      return
    }

    // Calculate date range based on current weekOffset
    const currentStartOfTwoWeeks = dayjs().add(weekOffset, 'week').startOf('week')
    const rangeStart = currentStartOfTwoWeeks.subtract(1, 'day').startOf('day').toISOString()
    const rangeEnd = currentStartOfTwoWeeks.add(2, 'week').endOf('day').toISOString()

    // Call both refetch functions (combined adapter has duplicate prevention)
    if (refetchActivitiesRef.current) {
      void refetchActivitiesRef.current({
        occurredAtFrom: rangeStart,
        occurredAtTo: rangeEnd
      })
    }

    if (refetchTasksRef.current) {
      void refetchTasksRef.current({
        dueDateFrom: rangeStart,
        dueDateTo: rangeEnd
      })
    }
  }, [weekOffset])

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
  const getActivityTypeIcon = (item: CalendarActivity, size = 12) => {
    const isTask = item.activityType?.value === 'Task'
    const isOverdue = item.isTask && item.originalTask?.status?.code === 'OVERDUE'

    if (isTask) {
      return (
        <CheckSquareIcon size={size} weight="fill" className={isOverdue ? 'gba:text-destructive' : 'gba:text-info'} />
      )
    }

    // All activities use same icon (green)
    return <CalendarBlankIcon size={size} weight="fill" className="gba:text-success" />
  }

  const getActivityColorClass = (item: CalendarActivity) => {
    const isTask = item.activityType?.value === 'Task'
    const isOverdue = item.isTask && item.originalTask?.status?.code === 'OVERDUE'

    if (isTask) {
      return isOverdue ? 'gba:bg-destructive/10' : 'gba:bg-info/10'
    }

    return 'gba:bg-success/10'
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

  // Handle drag start
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event
      const draggedItem = combinedItems.find(item => item.id === active.id)
      if (draggedItem) {
        setActiveItem(draggedItem)
      }
    },
    [combinedItems]
  )

  // Handle drag end - update task/activity date
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event

      // Clear active item
      setActiveItem(null)

      if (!over || active.id === over.id) {
        return
      }

      const draggedItem = combinedItems.find(item => item.id === active.id)
      const targetDate = over.id as string // Day cell ID in 'YYYY-MM-DD' format

      if (!draggedItem) return

      // Prevent duplicate process starts
      const processKey = `${draggedItem.id}-${targetDate}`
      if (recentProcessStarts.has(processKey)) {
        return
      }

      // Add to recent starts
      setRecentProcessStarts(prev => new Set(prev).add(processKey))

      // Remove from recent starts after 3 seconds
      setTimeout(() => {
        setRecentProcessStarts(prev => {
          const newSet = new Set(prev)
          newSet.delete(processKey)
          return newSet
        })
      }, 3000)

      try {
        if (draggedItem.isTask && draggedItem.originalTask) {
          // Update task dueDate
          const fullTask = draggedItem.originalTask as any // Has version from AUDIT_FIELDS

          startProcess({
            domain: isIRM ? 'investment-relations' : 'customer-relations',
            processName: isIRM ? 'updateInvestmentTask' : 'updateSalesTask',
            payload: {
              taskId: fullTask.id,
              dueDate: targetDate, // Pass date at top level for form to pick up
              psi_taskPayload: {
                psi_initialParameters: {
                  taskId: fullTask.id,
                  dueDate: targetDate // Also pass in initialParameters for form
                }
              }
            },
            builderType: 'NATIVE_SCREEN'
          })
        } else if (draggedItem.originalActivity) {
          // Update activity occurredAt
          const fullActivity = draggedItem.originalActivity as any // Has version from AUDIT_FIELDS
          const newOccurredAt = dayjs(targetDate).toISOString()

          startProcess({
            domain: isIRM ? 'investment-relations' : 'customer-relations',
            processName: isIRM ? 'updateInvestmentActivity' : 'updateSalesActivity',
            payload: {
              activityId: fullActivity.id,
              occurredAt: newOccurredAt, // Pass date at top level for form to pick up
              psi_activityPayload: {
                psi_initialParameters: {
                  activityId: fullActivity.id,
                  occurredAt: newOccurredAt // Also pass in initialParameters for form
                }
              }
            },
            builderType: 'NATIVE_SCREEN'
          })
        }

        // Data will be refetched automatically via process completion event listener
      } catch (e: any) {
        console.error('Failed to update date:', e)
        toast.error(e?.message || `Failed to update ${draggedItem.isTask ? 'task' : 'activity'} date`)
      }
    },
    [combinedItems, isIRM, recentProcessStarts]
  )

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
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
            onOpenChange={(open: boolean) => {
              if (!open) setSelectedTask(null)
            }}
            buildReferenceUrl={config.myTasksConfig?.buildReferenceUrl}
            data-testid="calendar-task-detail-sheet"
            businessAppContext={{ accessToken, userInfo } as BusinessAppContextProps}
            accessToken={accessToken}
            assignedUserId={selectedTask?.taskAssignees?.[0]?.assignedUserId}
            currentUserId={userInfo?.id}
            flowContext={config.myTasksConfig?.flowContexts?.entityContext}
            onTaskCompleted={() => {
              // Refetch calendar data after task completion
              setSelectedTask(null)
              if (refetchTasksRef.current) {
                const currentStartOfTwoWeeks = dayjs().add(weekOffset, 'week').startOf('week')
                const rangeStart = currentStartOfTwoWeeks.subtract(1, 'day').startOf('day').toISOString()
                const rangeEnd = currentStartOfTwoWeeks.add(2, 'week').endOf('day').toISOString()
                void refetchTasksRef.current({ dueDateFrom: rangeStart, dueDateTo: rangeEnd })
              }
            }}
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
            accessToken={accessToken}
            flowContext={config.myActivitiesConfig?.rowActionsContextArray?.[0]}
          />
        )}
      </Card>

      {/* Drag Overlay - shows item being dragged */}
      <DragOverlay>
        {activeItem ? (
          <div
            className={`gba:px-1.5 gba:py-1 gba:rounded gba:text-[11px] gba:flex gba:items-center gba:gap-1 gba:opacity-90 gba:shadow-lg ${getActivityColorClass(activeItem)}`}
          >
            {getActivityTypeIcon(activeItem, 11)}
            <span className="gba:truncate gba:text-gray-700">{activeItem.title}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

interface DayCellProps {
  day: {
    date: dayjs.Dayjs
    isToday: boolean
    items: CalendarActivity[]
  }
  getActivityTypeIcon: (item: CalendarActivity, size?: number) => React.ReactNode
  getActivityColorClass: (item: CalendarActivity) => string
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

  // Make day cell droppable
  const { setNodeRef, isOver } = useDroppable({
    id: day.date.format('YYYY-MM-DD')
  })

  return (
    <div
      ref={setNodeRef}
      className={`gba:border gba:rounded gba:p-1.5 gba:h-[140px] gba:relative gba:flex gba:flex-col gba:transition-all gba:duration-200 ${
        day.isToday ? 'gba:ring-2 gba:ring-primary gba:bg-primary/5' : 'gba:bg-background'
      } ${isOver ? 'gba:ring-4 gba:ring-info-secondary gba:bg-info-secondary/20 gba:shadow-lg gba:scale-[1.02]' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
                        className="gba:text-info gba:transition-transform gba:duration-200 gba:hover:scale-125"
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
                        className="gba:text-success gba:transition-transform gba:duration-200 gba:hover:scale-125"
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

      {/* Activities list - scrollable */}
      <div className="gba:flex-1 gba:overflow-y-auto gba:space-y-1">
        {day.items.map(activity => (
          <DraggableCalendarItem
            key={activity.id}
            activity={activity}
            onItemClick={onItemClick}
            getActivityTypeIcon={getActivityTypeIcon}
            getActivityColorClass={getActivityColorClass}
          />
        ))}
      </div>
    </div>
  )
}

// Draggable calendar item component
interface DraggableCalendarItemProps {
  activity: CalendarActivity
  onItemClick: (item: CalendarActivity) => void
  getActivityTypeIcon: (item: CalendarActivity, size?: number) => React.ReactNode
  getActivityColorClass: (item: CalendarActivity) => string
}

const DraggableCalendarItem: React.FC<DraggableCalendarItemProps> = ({
  activity,
  onItemClick,
  getActivityTypeIcon,
  getActivityColorClass
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: activity.id
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`
      }
    : undefined

  const isTask = activity.isTask

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={() => onItemClick(activity)}
      style={style}
      className={`gba:w-full gba:px-1.5 gba:py-1 gba:rounded gba:text-[11px] gba:text-left gba:border-0 gba:flex gba:items-center gba:gap-1 gba:cursor-grab active:gba:cursor-grabbing hover:gba:opacity-80 ${getActivityColorClass(activity)} ${
        isDragging ? 'gba:opacity-50' : ''
      }`}
      data-testid={`${isTask ? 'task' : 'activity'}-${activity.id}`}
      {...listeners}
      {...attributes}
    >
      {getActivityTypeIcon(activity, 11)}
      <span className="gba:truncate gba:flex-1 gba:text-gray-700">{activity.title}</span>
    </button>
  )
}

export default CompactTwoWeekCalendar
