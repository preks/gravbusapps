/**
 * InboxView Component
 * Displays inbox tasks with search, filters, and grouping
 *
 * URL Parameters:
 * - taskId: ID of the selected task to open directly
 *   Example: ?taskId=abc-123 will open the task detail panel for task with ID "abc-123"
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Input,
  Button,
  Alert,
  AlertTitle,
  AlertDescription,
  Badge,
  useTranslation,
  useLocale
} from '@newwork/nw-design-system'
import translations from '../_i18n'
import { Search, RefreshCw, Zap, CheckCircle, Inbox, CheckCheck, X } from 'lucide-react'
import { UnifiedTask } from '../types'
import { TaskCard } from './TaskCard'
import { TaskDetailDialog } from './TaskDetailDialog'
import { EmptyState } from './EmptyState'
import { LoadingSkeleton } from './LoadingSkeleton'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { filterTasksBySearch } from '../utils/taskGrouping'
import { useEmployeeAvatarsBatch } from '../hooks/useEmployeeAvatarsBatch'

type TaskFilterType = 'all' | 'blinks' | 'approvals' | 'completed'

interface InboxViewProps extends BusinessAppContextProps {
  tasks: UnifiedTask[]
  totalCount: number
  isLoading: boolean
  error: string | null
  onRefresh: () => void
  onLoadMore: () => void
  hasMore: boolean
  hasNewTasks: boolean
  onLoadNewTasks: () => void
  // Completed tasks props
  completedTasks: UnifiedTask[]
  completedTotalCount: number
  completedIsLoading: boolean
  completedError: string | null
  onCompletedRefresh: () => void
  onCompletedLoadMore: () => void
  completedHasMore: boolean
  hasNewCompletedTasks: boolean
  onLoadNewCompletedTasks: () => void
}

/**
 * Get initial task ID from URL
 */
const getInitialTaskId = (): string | null => {
  const urlParams = new URLSearchParams(globalThis.location.search)
  return urlParams.get('taskId')
}

/**
 * Update URL with task ID
 */
const updateTaskUrl = (taskId: string | null) => {
  const urlParams = new URLSearchParams(globalThis.location.search)

  if (taskId) {
    urlParams.set('taskId', taskId)
  } else {
    urlParams.delete('taskId')
  }

  const newUrl = `${globalThis.location.pathname}?${urlParams.toString()}`
  globalThis.history.replaceState({}, '', newUrl)
}

/**
 * Filter active tasks (non-completed)
 */
const filterActiveTasks = (tasks: UnifiedTask[]): UnifiedTask[] => {
  return tasks.filter(task => {
    if (task.status === 'COMPLETED') return false
    // Only exclude if completedAt AND status is not active
    if (task.completedAt) {
      const activeStatuses = ['PENDING', 'IN_PROGRESS', 'SCHEDULED']
      if (!activeStatuses.includes(task.status)) {
        return false
      }
    }
    return true
  })
}

/**
 * Filter truly completed tasks
 */
const filterCompletedTasks = (tasks: UnifiedTask[]): UnifiedTask[] => {
  return tasks.filter(task => {
    if (task.status === 'COMPLETED') return true
    // Only consider completedAt if status is not an active status
    if (task.completedAt) {
      const activeStatuses = ['PENDING', 'IN_PROGRESS', 'SCHEDULED']
      if (!activeStatuses.includes(task.status)) {
        return true
      }
    }
    return false
  })
}

export const InboxView: React.FC<InboxViewProps> = ({
  tasks,
  totalCount,
  isLoading,
  error,
  onRefresh,
  onLoadMore,
  hasMore,
  hasNewTasks,
  onLoadNewTasks,
  completedTasks,
  completedTotalCount,
  completedIsLoading,
  completedError,
  onCompletedRefresh,
  onCompletedLoadMore,
  completedHasMore,
  hasNewCompletedTasks,
  onLoadNewCompletedTasks,
  ...context
}) => {
  const { t } = useTranslation(translations)
  const { locale } = useLocale()

  /**
   * Get empty state message based on search query and filter type
   */
  const getEmptyStateMessage = useCallback(
    (query: string, filter: TaskFilterType): string => {
      if (query.trim()) {
        return t('inbox-empty-no-results', { query })
      }

      switch (filter) {
        case 'blinks':
          return t('inbox-empty-no-blinks')
        case 'approvals':
          return t('inbox-empty-no-approvals')
        case 'completed':
          return t('inbox-empty-no-completed')
        default:
          return t('inbox-empty-no-tasks')
      }
    },
    [t]
  )

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTask, setSelectedTask] = useState<UnifiedTask | null>(null)
  const [filterType, setFilterType] = useState<TaskFilterType>('all')
  const [localTasks, setLocalTasks] = useState<UnifiedTask[]>(tasks)
  const [localCompletedTasks, setLocalCompletedTasks] = useState<UnifiedTask[]>(completedTasks)
  const [isInitialized, setIsInitialized] = useState(false)

  // Get logged-in user info
  const loggedInUserId = context.userInfo?.id || context.userInfo?.employeeDetails?.employeeId || 'user-001'

  // Sync local tasks with props
  // Filter out completed tasks from active tasks to prevent duplicates
  useEffect(() => {
    setLocalTasks(filterActiveTasks(tasks))
  }, [tasks])

  useEffect(() => {
    // Ensure completed tasks only include truly completed tasks
    setLocalCompletedTasks(filterCompletedTasks(completedTasks))
  }, [completedTasks])

  // Initialize selected task from URL when tasks are loaded
  useEffect(() => {
    if (!isInitialized && tasks.length > 0 && !isLoading) {
      const taskIdFromUrl = getInitialTaskId()
      if (taskIdFromUrl) {
        // Search in both active and completed tasks
        const allTasks = [...tasks, ...completedTasks]
        const taskToSelect = allTasks.find(t => t.id === taskIdFromUrl)
        if (taskToSelect) {
          setSelectedTask(taskToSelect)
          // Switch to completed filter if the task is completed
          if (taskToSelect.status === 'COMPLETED' && completedTasks.some(t => t.id === taskIdFromUrl)) {
            setFilterType('completed')
          }
        }
      }
      setIsInitialized(true)
    }
  }, [tasks, completedTasks, isLoading, isInitialized])

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const taskIdFromUrl = getInitialTaskId()
      if (taskIdFromUrl) {
        const allTasks = [...localTasks, ...localCompletedTasks]
        const taskToSelect = allTasks.find(t => t.id === taskIdFromUrl)
        if (taskToSelect) {
          setSelectedTask(taskToSelect)
        } else {
          setSelectedTask(null)
        }
      } else {
        setSelectedTask(null)
      }
    }

    globalThis.addEventListener('popstate', handlePopState)
    return () => globalThis.removeEventListener('popstate', handlePopState)
  }, [localTasks, localCompletedTasks])

  // Handler to select a task and update URL
  const handleSelectTask = useCallback((task: UnifiedTask | null) => {
    setSelectedTask(task)
    updateTaskUrl(task?.id || null)
  }, [])

  // Handler to close task detail
  const handleCloseTask = useCallback(() => {
    setSelectedTask(null)
    updateTaskUrl(null)
  }, [])

  /**
   * Helper function to check if a task is a Blink (quick direct task)
   */
  const isBlinkTask = (task: UnifiedTask): boolean => {
    return task.source === 'cflow' && task.tags?.app === 'quick-task'
  }

  /**
   * Helper function to check if a task is an Approval task
   */
  const isApprovalTask = (task: UnifiedTask): boolean => {
    const taskName = (task.referenceTaskName || task.name || task.title || '').toLowerCase()
    const taskType = (task.type || '').toLowerCase()
    const taskCategory = (task.taskCategory || '').toLowerCase()

    // Check for common approval keywords
    return (
      taskName.includes('approval') ||
      taskName.includes('approve') ||
      taskType.includes('approval') ||
      taskCategory.includes('approval') ||
      task.tags?.category === 'approval'
    )
  }

  /**
   * Helper function to check if a cFlow task should be included
   */
  const shouldIncludeCflowTask = useCallback(
    (task: UnifiedTask): boolean => {
      if (task.source !== 'cflow') return true

      const assignmentMode = task.assignment?.assignmentMode?.toLowerCase()
      if (assignmentMode !== 'assign') return false

      return task.assignment?.assignedTo === loggedInUserId
    },
    [loggedInUserId]
  )

  /**
   * Helper function to check if a task is completed
   */
  const isTaskCompleted = useCallback((task: UnifiedTask): boolean => {
    if (task.status === 'COMPLETED') return true

    if (task.completedAt) {
      const activeStatuses = ['PENDING', 'IN_PROGRESS', 'SCHEDULED']
      return !activeStatuses.includes(task.status)
    }

    return false
  }, [])

  /**
   * Apply type-specific filtering (blinks, approvals)
   */
  const applyTypeFilter = useCallback(
    (tasks: UnifiedTask[], filter: TaskFilterType): UnifiedTask[] => {
      if (filter === 'blinks') {
        return tasks.filter(isBlinkTask)
      }
      if (filter === 'approvals') {
        return tasks.filter(isApprovalTask)
      }
      return tasks
    },
    [isBlinkTask, isApprovalTask]
  )

  // Use appropriate data source based on filter type
  const currentTasks = filterType === 'completed' ? localCompletedTasks : localTasks
  const currentTotalCount = filterType === 'completed' ? completedTotalCount : totalCount
  const currentIsLoading = filterType === 'completed' ? completedIsLoading : isLoading
  const currentError = filterType === 'completed' ? completedError : error
  const currentOnRefresh = filterType === 'completed' ? onCompletedRefresh : onRefresh
  const currentOnLoadMore = filterType === 'completed' ? onCompletedLoadMore : onLoadMore
  const currentHasMore = filterType === 'completed' ? completedHasMore : hasMore

  // Extract user IDs and employee IDs separately
  const { userIds, employeeIds } = useMemo(() => {
    const uIds: string[] = []
    const eIds: string[] = []

    currentTasks.forEach(task => {
      // Both Kogito and CFlow tasks have creatorUserId (user ID)
      if (task.sourceMetadata?.creatorUserId) {
        uIds.push(task.sourceMetadata.creatorUserId)
      }
      // Legacy: Some tasks might still have creatorEmployeeId (employee ID)
      if (task.sourceMetadata?.creatorEmployeeId) {
        eIds.push(task.sourceMetadata.creatorEmployeeId)
      }
    })

    return {
      userIds: [...new Set(uIds)], // Remove duplicates
      employeeIds: [...new Set(eIds)] // Remove duplicates
    }
  }, [currentTasks])

  // Batch fetch all employee avatars in one request (handles both userIds and employeeIds)
  const { employeeMap, isLoading: areAvatarsLoading } = useEmployeeAvatarsBatch(
    context.accessToken || '',
    userIds,
    employeeIds
  )

  // Helper: Get navigable tasks after applying all filters
  const getNavigableTasks = useCallback((): UnifiedTask[] => {
    // Note: localTasks and localCompletedTasks are already filtered by completion status
    // (filterActiveTasks and filterCompletedTasks), so no additional completion check needed
    const currentFilteredTasks = filterType === 'completed' ? localCompletedTasks : localTasks
    let tasksToNavigate = currentFilteredTasks.filter(shouldIncludeCflowTask)

    // Apply type-specific filtering (only for non-completed views)
    if (filterType !== 'completed') {
      tasksToNavigate = applyTypeFilter(tasksToNavigate, filterType)
    }

    // Apply search filter if active
    if (searchQuery.trim()) {
      tasksToNavigate = filterTasksBySearch(tasksToNavigate, searchQuery, employeeMap)
    }

    return tasksToNavigate
  }, [localTasks, localCompletedTasks, filterType, searchQuery, employeeMap, shouldIncludeCflowTask, applyTypeFilter])

  // Helper: Calculate next task index for keyboard navigation
  const getNextTaskIndex = (currentIndex: number, direction: 'up' | 'down', maxIndex: number): number => {
    if (direction === 'up') {
      return currentIndex > 0 ? currentIndex - 1 : currentIndex
    }
    return currentIndex < maxIndex ? currentIndex + 1 : currentIndex
  }

  // Keyboard navigation: Arrow keys to navigate through tasks
  useEffect(() => {
    if (!selectedTask) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle arrow keys when a task is selected
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return

      // Don't interfere if user is typing in an input/textarea
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      e.preventDefault()

      const tasksToNavigate = getNavigableTasks()
      const currentIndex = tasksToNavigate.findIndex(t => t.id === selectedTask.id)
      if (currentIndex === -1) return

      const direction = e.key === 'ArrowUp' ? 'up' : 'down'
      const nextIndex = getNextTaskIndex(currentIndex, direction, tasksToNavigate.length - 1)
      const nextTask = tasksToNavigate[nextIndex]

      if (nextTask) {
        handleSelectTask(nextTask)
      }
    }

    globalThis.addEventListener('keydown', handleKeyDown)
    return () => globalThis.removeEventListener('keydown', handleKeyDown)
  }, [selectedTask, handleSelectTask, getNavigableTasks])

  // Filter tasks (tasks are already sorted by date from the API)
  const filteredTasks = useMemo(() => {
    // Note: currentTasks is either localTasks or localCompletedTasks, both already filtered
    // by completion status (filterActiveTasks and filterCompletedTasks), so no additional
    // completion check needed here
    let result = currentTasks

    // Filter cFlow tasks: only show tasks assigned to current user
    result = result.filter(shouldIncludeCflowTask)

    // Apply type-specific filtering (only for non-completed views)
    if (filterType !== 'completed') {
      result = applyTypeFilter(result, filterType)
    }

    // Apply search filter (including sender name search)
    if (searchQuery.trim()) {
      result = filterTasksBySearch(result, searchQuery, employeeMap)
    }

    // Tasks are already sorted by createdAt (desc) from the unified API
    // No additional sorting needed here

    return result
  }, [currentTasks, searchQuery, filterType, employeeMap, shouldIncludeCflowTask, applyTypeFilter])

  // Handler to remove task immediately after completion and refresh completed tasks
  // AUTO-ADVANCE: Opens the next task in the list after completing current one
  const handleTaskCompleted = useCallback(
    (taskId: string) => {
      // Use the ACTUAL displayed list from filteredTasks
      const displayedTasks = filteredTasks

      // Find the completed task's index in the DISPLAYED list
      const completedTaskIndex = displayedTasks.findIndex(t => t.id === taskId)

      // Calculate next task BEFORE removing from state
      let nextTask: UnifiedTask | null = null
      if (completedTaskIndex !== -1 && displayedTasks.length > 1) {
        // Try to get the next task after the completed one
        if (completedTaskIndex < displayedTasks.length - 1) {
          nextTask = displayedTasks[completedTaskIndex + 1]
        } else if (completedTaskIndex > 0) {
          // If completed task was last, get the previous one
          nextTask = displayedTasks[completedTaskIndex - 1]
        }
      }

      // Remove completed task from local state (immediate UI feedback)
      setLocalTasks(prev => prev.filter(t => t.id !== taskId))
      setLocalCompletedTasks(prev => prev.filter(t => t.id !== taskId))

      // Auto-advance to next task or close if none available
      if (nextTask && nextTask.id !== taskId) {
        // Use setTimeout to ensure this runs AFTER any pending onClose() calls from child components
        // This prevents cFlow's onClose() from closing the newly selected task
        setTimeout(() => {
          setSelectedTask(nextTask)
          updateTaskUrl(nextTask.id)
        }, 0)
      } else {
        // No more tasks in filtered list - close detail panel
        handleCloseTask()
      }

      // Refresh completed tasks from backend
      onCompletedRefresh()
    },
    [filteredTasks, onCompletedRefresh, handleCloseTask, filterType]
  )

  // Count tasks by type for badges
  // Note: Shows counts from loaded tasks. Adds "+" suffix if more tasks exist
  const taskCounts = useMemo(() => {
    const activeTasks = tasks.filter(task => !isTaskCompleted(task)).filter(shouldIncludeCflowTask)

    return {
      all: activeTasks.length,
      allHasMore: hasMore,
      blinks: activeTasks.filter(isBlinkTask).length,
      blinksHasMore: hasMore, // Blinks might exist in un-fetched tasks
      approvals: activeTasks.filter(isApprovalTask).length,
      approvalsHasMore: hasMore, // Approvals might exist in un-fetched tasks
      completed: completedTotalCount,
      completedHasMore: completedHasMore
    }
  }, [tasks, hasMore, completedTotalCount, completedHasMore, isTaskCompleted, shouldIncludeCflowTask])

  if (currentIsLoading && currentTasks.length === 0) {
    return <LoadingSkeleton type="task" />
  }

  return (
    <div className="gba:flex gba:gap-3 gba:h-full gba:overflow-hidden" data-testid="inbox-view">
      {/* Master Panel - Task List */}
      <div
        className={`gba:flex gba:flex-col gba:gap-3 gba:h-full gba:transition-all gba:duration-500 gba:ease-in-out ${
          selectedTask ? 'gba:w-[40%]' : 'gba:w-full'
        }`}
      >
        {/* New Tasks Notification Banner */}
        {((filterType === 'all' && hasNewTasks) || (filterType === 'completed' && hasNewCompletedTasks)) && (
          <Alert className="gba:border-info gba:bg-info-secondary" data-testid="new-tasks-banner">
            <AlertTitle className="gba:flex gba:items-center gba:justify-between">
              <span className="gba:flex gba:items-center gba:gap-2">
                <Zap className="gba:h-4 gba:w-4 gba:text-info-foreground" />
                <span className="gba:text-info-foreground">{t('inbox-new-tasks-title')}</span>
              </span>
              <Button
                size="sm"
                variant="default"
                onClick={filterType === 'completed' ? onLoadNewCompletedTasks : onLoadNewTasks}
                data-testid="load-new-tasks-button"
              >
                {t('inbox-new-tasks-button')}
              </Button>
            </AlertTitle>
            <AlertDescription className="gba:text-info-secondary-foreground">
              {filterType === 'completed'
                ? t('inbox-new-completed-tasks-description')
                : t('inbox-new-tasks-description')}
            </AlertDescription>
          </Alert>
        )}

        {/* Search and Actions */}
        <div className="gba:flex gba:items-center gba:gap-4">
          <div className="gba:relative gba:flex-1">
            <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:h-4 gba:w-4 gba:text-muted-foreground gba:pointer-events-none gba:z-10" />
            <Input
              placeholder={t('inbox-search-placeholder')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="gba:pl-11 gba:pr-9"
              style={{ paddingLeft: '2.75rem' }}
              data-testid="inbox-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="gba:absolute gba:right-3 gba:top-1/2 gba:-translate-y-1/2 gba:h-4 gba:w-4 gba:text-muted-foreground hover:gba:text-foreground gba:cursor-pointer gba:z-10"
                data-testid="inbox-search-clear-button"
                aria-label={t('inbox-clear-search')}
              >
                <X className="gba:h-4 gba:w-4" />
              </button>
            )}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={currentOnRefresh}
            disabled={currentIsLoading}
            data-testid="inbox-refresh-button"
          >
            <RefreshCw className={`gba:h-4 gba:w-4 ${currentIsLoading ? 'gba:animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Task Type Filters */}
        <div className="gba:flex gba:items-center gba:gap-1 gba:max-w-[40%]" data-testid="inbox-filter-buttons">
          <Button
            variant={filterType === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('all')}
            data-testid="inbox-filter-all"
            className="gba:flex gba:items-center gba:gap-1 gba:px-2 gba:flex-shrink-0"
          >
            <Inbox className="gba:h-3.5 gba:w-3.5" />
            <span>{t('inbox-filter-all')}</span>
            <Badge variant="secondary" className="gba:px-1.5 gba:py-0 gba:text-xs">
              {taskCounts.all}
              {taskCounts.allHasMore ? '+' : ''}
            </Badge>
          </Button>
          <Button
            variant={filterType === 'blinks' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('blinks')}
            data-testid="inbox-filter-blinks"
            className="gba:flex gba:items-center gba:gap-1 gba:px-2 gba:flex-shrink-0"
          >
            <Zap className="gba:h-3.5 gba:w-3.5" />
            <span>{t('inbox-filter-blinks')}</span>
            {taskCounts.blinks > 0 && (
              <Badge variant="secondary" className="gba:px-1.5 gba:py-0 gba:text-xs">
                {taskCounts.blinks}
                {taskCounts.blinksHasMore ? '+' : ''}
              </Badge>
            )}
          </Button>
          <Button
            variant={filterType === 'approvals' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('approvals')}
            data-testid="inbox-filter-approvals"
            className="gba:flex gba:items-center gba:gap-1 gba:px-2 gba:flex-shrink-0"
          >
            <CheckCircle className="gba:h-3.5 gba:w-3.5" />
            <span>{t('inbox-filter-approvals')}</span>
            {taskCounts.approvals > 0 && (
              <Badge variant="secondary" className="gba:px-1.5 gba:py-0 gba:text-xs">
                {taskCounts.approvals}
                {taskCounts.approvalsHasMore ? '+' : ''}
              </Badge>
            )}
          </Button>
          <Button
            variant={filterType === 'completed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('completed')}
            data-testid="inbox-filter-completed"
            className="gba:flex gba:items-center gba:gap-1 gba:px-2 gba:flex-shrink-0"
          >
            <CheckCheck className="gba:h-3.5 gba:w-3.5" />
            <span>{t('inbox-filter-completed')}</span>
            {taskCounts.completed > 0 && (
              <Badge variant="secondary" className="gba:px-1.5 gba:py-0 gba:text-xs">
                {taskCounts.completed}
                {taskCounts.completedHasMore ? '+' : ''}
              </Badge>
            )}
          </Button>
        </div>

        {/* Error Alert */}
        {currentError && (
          <Alert variant="destructive">
            <AlertTitle>{t('inbox-error-title')}</AlertTitle>
            <AlertDescription>{currentError}</AlertDescription>
          </Alert>
        )}

        {/* Task List - Scrollable */}
        <div className="gba:flex-1 gba:overflow-y-auto gba:pr-2">
          {filteredTasks.length === 0 ? (
            <EmptyState type="inbox" message={getEmptyStateMessage(searchQuery, filterType)} />
          ) : (
            <>
              <div className="gba:divide-y gba:divide-border/50" data-testid="inbox-task-list">
                {filteredTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onView={handleSelectTask}
                    employeeMap={employeeMap}
                    areAvatarsLoading={areAvatarsLoading}
                    isSelected={selectedTask?.id === task.id}
                    isDetailViewOpen={!!selectedTask}
                    t={t}
                    locale={locale}
                  />
                ))}
              </div>

              {/* Pagination Info and Load More */}
              {!searchQuery.trim() && (
                <div className="gba:flex gba:items-center gba:justify-between gba:pt-4 gba:border-t gba:mt-4">
                  <p className="gba:text-sm gba:text-muted-foreground">
                    {t('inbox-showing-tasks', {
                      current: filteredTasks.length.toString(),
                      total: currentTotalCount.toString(),
                      hasMore: currentHasMore ? '+' : ''
                    })}
                  </p>
                  {currentHasMore && (
                    <Button
                      variant="outline"
                      onClick={currentOnLoadMore}
                      disabled={currentIsLoading}
                      data-testid="inbox-load-more-button"
                    >
                      {t('inbox-load-more')}
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Detail Panel - Task Details */}
      <div
        className={`gba:flex-1 gba:transition-all gba:duration-500 gba:ease-in-out gba:overflow-hidden ${
          selectedTask
            ? 'gba:translate-x-0 gba:opacity-100 gba:w-[60%]'
            : 'gba:translate-x-full gba:opacity-0 gba:w-0 gba:pointer-events-none'
        }`}
      >
        {selectedTask && (
          <TaskDetailDialog
            task={selectedTask}
            onClose={handleCloseTask}
            onTaskUpdated={onRefresh}
            onTaskCompleted={handleTaskCompleted}
            accessToken={context.accessToken}
            userId={context.userInfo?.id}
            userInfo={context.userInfo}
          />
        )}
      </div>
    </div>
  )
}
