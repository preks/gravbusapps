/**
 * InboxView Component
 * Displays inbox tasks with search, filters, and grouping
 *
 * URL Parameters:
 * - taskId: ID of the selected task to open directly
 *   Example: ?taskId=abc-123 will open the task detail panel for task with ID "abc-123"
 */

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import {
  Button,
  Alert,
  AlertTitle,
  AlertDescription,
  EmptyState as DesignEmptyState,
  useTranslation,
  useLocale,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  Badge
} from '@newwork/nw-design-system'
import translations from '../_i18n'
import { Pin, Mail } from 'lucide-react'
import { UnifiedTask } from '../types'
import { TaskCard } from './TaskCard'
import { TaskDetailContent } from './TaskDetailContent'
import { EmptyState } from './EmptyState'
import { LoadingSkeleton } from './LoadingSkeleton'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useEmployeeAvatarsBatch } from '../hooks/useEmployeeAvatarsBatch'
import { FilterType } from './FiltersDropdown'
import { markTaskRead, markTaskUnread, patchTaskState } from '@/business-apps/core/every/apps/every-api'

type TaskFilterType = 'all' | 'blinks' | 'approvals' | 'completed'

interface InboxViewProps extends BusinessAppContextProps {
  tasks: UnifiedTask[]
  totalCount: number
  isLoading: boolean
  error: string | null
  onRefresh: () => void
  onLoadMore: () => void
  hasMore: boolean
  sortBy?: 'createdAt' | 'dueDate' | 'priority' | 'status' | 'title'
  sortOrder?: 'asc' | 'desc'
  // Blink tasks from dedicated API endpoint
  blinkCount?: number
  blinkCountLoading?: boolean
  blinkTasks?: UnifiedTask[]
  blinkTasksLoading?: boolean
  blinkHasMore?: boolean
  onBlinkLoadMore?: () => void
  onBlinkRefresh?: () => void
  // Completed tasks props
  completedTasks: UnifiedTask[]
  completedTotalCount: number
  completedIsLoading: boolean
  completedError: string | null
  onCompletedRefresh: () => void
  onCompletedLoadMore: () => void
  completedHasMore: boolean
  // Global search and filters from parent
  globalSearch?: string
  selectedFilters?: FilterType[]
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
  isLoading,
  error,
  onRefresh,
  onLoadMore,
  hasMore,
  sortBy = 'createdAt',
  sortOrder = 'desc',
  blinkTasks,
  blinkTasksLoading,
  blinkHasMore,
  onBlinkLoadMore,
  completedTasks,
  completedIsLoading,
  completedError,
  onCompletedRefresh,
  onCompletedLoadMore,
  completedHasMore,
  globalSearch = '',
  selectedFilters = ['all'],
  accessToken,
  userInfo
}) => {
  const { t } = useTranslation(translations)
  const { locale } = useLocale()

  const formatUserPriorityLabel = useCallback(
    (value: number | null | undefined): string => {
      if (value === null || value === undefined) return t('task-meta-priority-none')
      if (value === 0) return t('task-meta-priority-high')
      if (value === 10) return t('task-meta-priority-medium')
      if (value === 20) return t('task-meta-priority-low')
      return `P${value}`
    },
    [t]
  )

  /**
   * Get empty state message based on search query and filter type
   */
  const getEmptyStateMessage = useCallback(
    (filter: TaskFilterType): string => {
      if (globalSearch.trim()) {
        return t('inbox-empty-no-results', { query: globalSearch })
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
    [t, globalSearch]
  )

  const [selectedTask, setSelectedTask] = useState<UnifiedTask | null>(null)
  const lastAutoReadKeyRef = useRef<string>('')
  const autoReadTimeoutRef = useRef<number | null>(null)
  // Map selectedFilters from parent to local filterType
  const filterType: TaskFilterType = selectedFilters.includes('all')
    ? 'all'
    : selectedFilters.includes('blinks')
      ? 'blinks'
      : selectedFilters.includes('approvals')
        ? 'approvals'
        : selectedFilters.includes('completed')
          ? 'completed'
          : 'all'
  const [localTasks, setLocalTasks] = useState<UnifiedTask[]>(tasks)
  const [localCompletedTasks, setLocalCompletedTasks] = useState<UnifiedTask[]>(completedTasks)
  const [isInitialized, setIsInitialized] = useState(false)
  const [displayedCount, setDisplayedCount] = useState(20) // Show 20 tasks initially

  const TASKS_PER_PAGE = 20

  // Reset displayedCount when filter changes
  useEffect(() => {
    setDisplayedCount(20)
  }, [filterType])

  // Track previous tasks length to detect when new data is fetched
  const prevTasksLengthRef = useRef(0)
  useEffect(() => {
    const currentTasksLength = filterType === 'completed' ? localCompletedTasks.length : localTasks.length
    const prevLength = prevTasksLengthRef.current

    // If tasks array grew (new data fetched), update displayedCount to show all tasks
    if (currentTasksLength > prevLength) {
      setDisplayedCount(currentTasksLength)
      prevTasksLengthRef.current = currentTasksLength
    }
  }, [localCompletedTasks.length, localTasks.length, filterType])

  // Sync local tasks with props
  // Filter out completed tasks from active tasks to prevent duplicates
  useEffect(() => {
    setLocalTasks(filterActiveTasks(tasks))
  }, [tasks])

  useEffect(() => {
    // Ensure completed tasks only include truly completed tasks
    setLocalCompletedTasks(filterCompletedTasks(completedTasks))
  }, [completedTasks])

  // Keep selectedTask in sync with latest task data (important for auto-refresh updates)
  useEffect(() => {
    if (!selectedTask) return
    const all = [...localTasks, ...localCompletedTasks]
    const next = all.find(t => t.id === selectedTask.id && t.source === selectedTask.source)
    if (next) {
      setSelectedTask(next)
    }
  }, [localTasks, localCompletedTasks, selectedTask?.id, selectedTask?.source])

  // Initialize selected task from URL when tasks are loaded, or auto-select first task
  useEffect(() => {
    if (!isInitialized && tasks.length > 0 && !isLoading) {
      const taskIdFromUrl = getInitialTaskId()
      if (taskIdFromUrl) {
        // Search in both active and completed tasks
        const allTasks = [...tasks, ...completedTasks]
        const taskToSelect = allTasks.find(t => t.id === taskIdFromUrl)
        if (taskToSelect) {
          setSelectedTask(taskToSelect)
        } else {
          // If task from URL not found, select first task
          setSelectedTask(tasks[0])
          updateTaskUrl(tasks[0].id)
        }
      } else {
        // No task in URL, auto-select first task
        setSelectedTask(tasks[0])
        updateTaskUrl(tasks[0].id)
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
  // Toggle behavior: clicking on already selected task will deselect it
  const handleSelectTask = useCallback(
    (task: UnifiedTask | null) => {
      // If clicking on the currently selected task, deselect it (close detail panel)
      if (task && selectedTask?.id === task.id) {
        setSelectedTask(null)
        updateTaskUrl(null)
      } else {
        // Otherwise, select the new task
        setSelectedTask(task)
        updateTaskUrl(task?.id || null)
      }
    },
    [selectedTask]
  )

  // Handler to close task detail
  const handleCloseTask = useCallback(() => {
    setSelectedTask(null)
    updateTaskUrl(null)
  }, [])

  const updateTaskUserStateLocally = useCallback(
    (
      taskKey: { id: string; source: string },
      patch: Partial<NonNullable<UnifiedTask['userState']>>,
      options?: { resort?: boolean }
    ) => {
      const getSortValue = (t: UnifiedTask): string | number => {
        switch (sortBy) {
          case 'priority':
            return t.userState?.userPriority ?? t.priority ?? 999999
          case 'dueDate':
            return t.dueDate ? new Date(t.dueDate).getTime() : 0
          case 'status':
            return t.status || ''
          case 'title':
            return (t.title || t.name || '').toLowerCase()
          case 'createdAt':
          default: {
            const dt = t.status === 'COMPLETED' && t.completedAt ? t.completedAt : t.createdAt || t.scheduledAt
            return dt ? new Date(dt).getTime() : 0
          }
        }
      }

      const getStableTime = (t: UnifiedTask): number => {
        const dt = t.status === 'COMPLETED' && t.completedAt ? t.completedAt : t.createdAt || t.scheduledAt
        return dt ? new Date(dt).getTime() : 0
      }

      const compare = (a: UnifiedTask, b: UnifiedTask): number => {
        const aPinned = a.userState?.isPinned ? 1 : 0
        const bPinned = b.userState?.isPinned ? 1 : 0
        if (aPinned !== bPinned) return bPinned - aPinned

        if (sortBy === 'priority') {
          const aUp = a.userState?.userPriority
          const bUp = b.userState?.userPriority
          const aHas = aUp !== null && aUp !== undefined
          const bHas = bUp !== null && bUp !== undefined
          if (aHas && !bHas) return -1
          if (bHas && !aHas) return 1
          if (aHas && bHas && aUp !== bUp) return aUp - bUp
        }

        const av = getSortValue(a)
        const bv = getSortValue(b)

        const cmp = av > bv ? 1 : av < bv ? -1 : 0
        if (cmp !== 0) return sortOrder === 'asc' ? cmp : -cmp

        // stable tie-breakers (same idea as backend)
        const at = getStableTime(a)
        const bt = getStableTime(b)
        if (at !== bt) return bt - at

        const aKey = `${a.source}:${a.id}`
        const bKey = `${b.source}:${b.id}`
        return aKey.localeCompare(bKey)
      }

      const apply = (t: UnifiedTask) => {
        if (t.id !== taskKey.id || t.source !== taskKey.source) return t
        return {
          ...t,
          userState: {
            isRead: false,
            isPinned: false,
            userPriority: null,
            readAt: null,
            pinnedAt: null,
            ...(t.userState || {}),
            ...patch
          }
        }
      }

      setLocalTasks(prev => {
        const next = prev.map(apply)
        return options?.resort ? [...next].sort(compare) : next
      })
      setLocalCompletedTasks(prev => {
        const next = prev.map(apply)
        return options?.resort ? [...next].sort(compare) : next
      })
      setSelectedTask(prev => (prev ? apply(prev) : prev))
    },
    [sortBy, sortOrder]
  )

  const togglePinnedForTask = useCallback(
    async (task: UnifiedTask) => {
      if (!accessToken) return

      const prevPinned = Boolean(task.userState?.isPinned)
      const prevPinnedAt = task.userState?.pinnedAt ?? null

      const nextPinned = !prevPinned
      const nextPinnedAt = nextPinned ? new Date().toISOString() : null

      updateTaskUserStateLocally(
        { id: task.id, source: task.source },
        { isPinned: nextPinned, pinnedAt: nextPinnedAt },
        { resort: true }
      )

      try {
        await patchTaskState(accessToken, {
          source: task.source,
          taskId: task.id,
          isPinned: nextPinned
        })
      } catch {
        updateTaskUserStateLocally(
          { id: task.id, source: task.source },
          { isPinned: prevPinned, pinnedAt: prevPinnedAt },
          { resort: true }
        )
      }
    },
    [accessToken, updateTaskUserStateLocally]
  )

  const markUnreadForTask = useCallback(
    async (task: UnifiedTask) => {
      if (!accessToken) return

      // If an auto-mark-as-read is pending for this task, cancel it so "mark unread" sticks immediately.
      if (selectedTask && selectedTask.id === task.id && selectedTask.source === task.source) {
        const key = `${selectedTask.source}:${selectedTask.id}`
        lastAutoReadKeyRef.current = key
        if (autoReadTimeoutRef.current) {
          globalThis.clearTimeout(autoReadTimeoutRef.current)
          autoReadTimeoutRef.current = null
        }
      }

      const prevIsRead = Boolean(task.userState?.isRead)
      const prevReadAt = task.userState?.readAt ?? null

      updateTaskUserStateLocally({ id: task.id, source: task.source }, { isRead: false, readAt: null })
      try {
        await markTaskUnread(accessToken, { source: task.source, taskId: task.id })
      } catch {
        updateTaskUserStateLocally({ id: task.id, source: task.source }, { isRead: prevIsRead, readAt: prevReadAt })
      }
    },
    [accessToken, selectedTask, updateTaskUserStateLocally]
  )

  const setPriorityForTask = useCallback(
    async (task: UnifiedTask, next: number | null) => {
      if (!accessToken) return

      const prev = task.userState?.userPriority ?? null
      updateTaskUserStateLocally(
        { id: task.id, source: task.source },
        { userPriority: next },
        { resort: sortBy === 'priority' }
      )
      try {
        await patchTaskState(accessToken, {
          source: task.source,
          taskId: task.id,
          userPriority: next
        })
      } catch {
        updateTaskUserStateLocally(
          { id: task.id, source: task.source },
          { userPriority: prev },
          { resort: sortBy === 'priority' }
        )
      }
    },
    [accessToken, sortBy, updateTaskUserStateLocally]
  )

  const handleTogglePinned = useCallback(() => {
    if (!selectedTask) return
    void togglePinnedForTask(selectedTask)
  }, [selectedTask, togglePinnedForTask])

  const handleMarkUnread = useCallback(() => {
    if (!selectedTask) return
    void markUnreadForTask(selectedTask)
  }, [selectedTask, markUnreadForTask])

  const handleSetUserPriority = useCallback(
    (value: string) => {
      if (!selectedTask) return
      const next = value === 'none' ? null : Number.parseInt(value, 10)
      void setPriorityForTask(selectedTask, next)
    },
    [selectedTask, setPriorityForTask]
  )

  // Auto-mark as read when the task is opened/selected (idempotent + debounced)
  useEffect(() => {
    if (!selectedTask) return
    if (!accessToken) return
    if (selectedTask.userState?.isRead) return

    const key = `${selectedTask.source}:${selectedTask.id}`
    if (lastAutoReadKeyRef.current === key) return

    if (autoReadTimeoutRef.current) {
      globalThis.clearTimeout(autoReadTimeoutRef.current)
    }

    autoReadTimeoutRef.current = globalThis.setTimeout(async () => {
      try {
        await markTaskRead(accessToken, { source: selectedTask.source, taskId: selectedTask.id })
        lastAutoReadKeyRef.current = key
        updateTaskUserStateLocally(
          { id: selectedTask.id, source: selectedTask.source },
          { isRead: true, readAt: new Date().toISOString() }
        )
      } catch {
        // Non-blocking; keep UI responsive if service isn't reachable
      }
    }, 250) as unknown as number

    return () => {
      if (autoReadTimeoutRef.current) {
        globalThis.clearTimeout(autoReadTimeoutRef.current)
      }
    }
  }, [selectedTask?.id, selectedTask?.source, selectedTask?.userState?.isRead, accessToken, updateTaskUserStateLocally])

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
   * Apply type-specific filtering (blinks, approvals)
   */
  // Check if we're using dedicated blink tasks from API (already filtered)
  const usingBlinkApiTasks = filterType === 'blinks' && blinkTasks && blinkTasks.length > 0

  const applyTypeFilter = useCallback(
    (tasks: UnifiedTask[], filter: TaskFilterType): UnifiedTask[] => {
      // Skip filtering for blinks if we're already using dedicated blink tasks from API
      if (filter === 'blinks') {
        // If using API blink tasks, they're already filtered - no need to filter again
        if (usingBlinkApiTasks) return tasks
        return tasks.filter(isBlinkTask)
      }
      if (filter === 'approvals') {
        return tasks.filter(isApprovalTask)
      }
      return tasks
    },
    [isBlinkTask, isApprovalTask, usingBlinkApiTasks]
  )

  // Use appropriate data source based on filter type
  // For blinks, use dedicated blink tasks from API if available
  const currentTasks = useMemo(() => {
    if (filterType === 'completed') return localCompletedTasks
    if (filterType === 'blinks' && blinkTasks && blinkTasks.length > 0) return blinkTasks
    return localTasks
  }, [filterType, localCompletedTasks, localTasks, blinkTasks])

  const currentIsLoading = useMemo(() => {
    if (filterType === 'completed') return completedIsLoading
    if (filterType === 'blinks') return blinkTasksLoading || false
    return isLoading
  }, [filterType, completedIsLoading, blinkTasksLoading, isLoading])

  const currentError = filterType === 'completed' ? completedError : error

  const currentOnLoadMore = useMemo(() => {
    if (filterType === 'completed') return onCompletedLoadMore
    if (filterType === 'blinks' && onBlinkLoadMore) return onBlinkLoadMore
    return onLoadMore
  }, [filterType, onCompletedLoadMore, onBlinkLoadMore, onLoadMore])

  const currentHasMore = useMemo(() => {
    if (filterType === 'completed') return completedHasMore
    if (filterType === 'blinks') return blinkHasMore || false
    return hasMore
  }, [filterType, completedHasMore, blinkHasMore, hasMore])

  // Extract user IDs and employee IDs for the tasks we actually render.
  // This keeps avatar fetching fast even when many tasks are loaded in memory.
  const { userIds, employeeIds } = useMemo(() => {
    const uIds: string[] = []
    const eIds: string[] = []

    const tasksForAvatars =
      filterType !== 'completed'
        ? applyTypeFilter(currentTasks, filterType).slice(0, displayedCount)
        : currentTasks.slice(0, displayedCount)

    tasksForAvatars.forEach(task => {
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
  }, [currentTasks, filterType, displayedCount, applyTypeFilter])

  // Batch fetch all employee avatars in one request (handles both userIds and employeeIds)
  const { employeeMap, isLoading: areAvatarsLoading } = useEmployeeAvatarsBatch(accessToken || '', userIds, employeeIds)

  // Filter tasks (tasks are already sorted by date from the API)
  const allFilteredTasks = useMemo(() => {
    // Note: currentTasks is either localTasks or localCompletedTasks, both already filtered
    // by completion status (filterActiveTasks and filterCompletedTasks), so no additional
    // completion check needed here
    let result = currentTasks

    // Note: Backend already filters tasks to only show relevant ones for the user.
    // No additional client-side cFlow filtering needed.

    // Apply type-specific filtering (only for non-completed views)
    if (filterType !== 'completed') {
      result = applyTypeFilter(result, filterType)
    }

    // Search is handled server-side (debounced) for performance; avoid filtering locally
    // to prevent hiding backend results (e.g. fuzzy/semantic matching in the future).

    // Tasks are already sorted by createdAt (desc) from the unified API
    // No additional sorting needed here

    return result
  }, [currentTasks, globalSearch, filterType, employeeMap, applyTypeFilter])

  // Slice to displayedCount for pagination (show 20 initially, load more on demand)
  const filteredTasks = useMemo(() => {
    return allFilteredTasks.slice(0, displayedCount)
  }, [allFilteredTasks, displayedCount])

  // Check if there are more tasks to show locally (before fetching more from API)
  const hasMoreLocal = allFilteredTasks.length > displayedCount

  // Handle "Load more" - first show more from local cache, then fetch from API if needed
  const handleLoadMore = useCallback(() => {
    if (hasMoreLocal) {
      // Show more from already fetched tasks
      setDisplayedCount(prev => prev + TASKS_PER_PAGE)
    } else if (currentHasMore) {
      // Fetch more from API
      currentOnLoadMore()
    }
  }, [hasMoreLocal, currentHasMore, currentOnLoadMore])

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

      const currentIndex = filteredTasks.findIndex(t => t.id === selectedTask.id)
      if (currentIndex === -1) return

      const direction = e.key === 'ArrowUp' ? 'up' : 'down'
      const nextIndex = getNextTaskIndex(currentIndex, direction, filteredTasks.length - 1)
      const nextTask = filteredTasks[nextIndex]

      // Don't call handleSelectTask if we're at a boundary and the task hasn't changed
      // This prevents the toggle logic from deselecting the current task
      if (nextTask && nextTask.id !== selectedTask.id) {
        handleSelectTask(nextTask)

        // Scroll the selected task into view
        setTimeout(() => {
          const taskElement = document.querySelector(`[data-testid="task-card-${nextTask.id}"]`)
          if (taskElement) {
            taskElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
          }
        }, 0)
      }
    }

    globalThis.addEventListener('keydown', handleKeyDown)
    return () => globalThis.removeEventListener('keydown', handleKeyDown)
  }, [selectedTask, handleSelectTask, filteredTasks])

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

  if (currentIsLoading && currentTasks.length === 0) {
    return <LoadingSkeleton type="task" />
  }

  return (
    <div className="gba:flex gba:h-full gba:overflow-hidden gba:gap-0" data-testid="inbox-view">
      {/* Master Panel - Task List (always visible, fixed width) */}
      <div className="gba:h-full gba:flex gba:flex-col gba:w-[480px] gba:flex-shrink-0 gba:bg-muted/30 gba:border-r gba:border-border">
        {/* Error Alert */}
        {currentError && (
          <Alert variant="destructive">
            <AlertTitle>{t('inbox-error-title')}</AlertTitle>
            <AlertDescription>{currentError}</AlertDescription>
          </Alert>
        )}

        {/* Task List - Scrollable */}
        <div className="gba:flex-1 gba:overflow-y-auto gba:px-3 gba:py-2">
          {filteredTasks.length === 0 ? (
            <EmptyState type="inbox" message={getEmptyStateMessage(filterType)} />
          ) : (
            <>
              <div data-testid="inbox-task-list">
                {filteredTasks.map(task => (
                  <ContextMenu key={task.id}>
                    <ContextMenuTrigger className="gba:block">
                      <TaskCard
                        task={task}
                        onView={handleSelectTask}
                        employeeMap={employeeMap}
                        areAvatarsLoading={areAvatarsLoading}
                        isSelected={selectedTask?.id === task.id}
                        isDetailViewOpen={!!selectedTask}
                        t={t}
                        locale={locale}
                      />
                    </ContextMenuTrigger>
                    <ContextMenuContent className="gba:w-64">
                      <ContextMenuItem onSelect={() => togglePinnedForTask(task)}>
                        {task.userState?.isPinned ? t('task-meta-unpin') : t('task-meta-pin')}
                      </ContextMenuItem>
                      <ContextMenuItem disabled={!task.userState?.isRead} onSelect={() => markUnreadForTask(task)}>
                        {t('task-meta-mark-unread')}
                      </ContextMenuItem>
                      <ContextMenuItem disabled>{t('task-meta-priority')}</ContextMenuItem>
                      <ContextMenuItem onSelect={() => setPriorityForTask(task, null)}>
                        {t('task-meta-priority-none')}
                      </ContextMenuItem>
                      <ContextMenuItem onSelect={() => setPriorityForTask(task, 0)}>
                        {t('task-meta-priority-high')}
                      </ContextMenuItem>
                      <ContextMenuItem onSelect={() => setPriorityForTask(task, 10)}>
                        {t('task-meta-priority-medium')}
                      </ContextMenuItem>
                      <ContextMenuItem onSelect={() => setPriorityForTask(task, 20)}>
                        {t('task-meta-priority-low')}
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ))}
              </div>

              {/* Load More - Simplified */}
              {!globalSearch.trim() && (hasMoreLocal || currentHasMore) && (
                <div className="gba:mt-2">
                  <Button
                    variant="ghost"
                    onClick={handleLoadMore}
                    disabled={currentIsLoading}
                    className="gba:w-full"
                    data-testid="inbox-load-more-button"
                  >
                    {t('inbox-load-more')}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Detail Panel - Task Details (always visible, fills remaining space) */}
      <div className="gba:flex gba:flex-col gba:flex-1 gba:overflow-hidden gba:min-h-0 gba:px-6">
        {selectedTask ? (
          <div className="gba:h-full gba:flex gba:flex-col gba:bg-background" data-testid="task-detail-dialog">
            <div className="gba:flex gba:items-center gba:justify-between gba:gap-2 gba:py-2 gba:border-b">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Button
                  variant={selectedTask.userState?.isPinned ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={handleTogglePinned}
                  data-testid="task-meta-pin-toggle"
                >
                  <Pin className="gba:h-4 gba:w-4 gba:mr-2" />
                  {selectedTask.userState?.isPinned ? t('task-meta-unpin') : t('task-meta-pin')}
                </Button>

                <Button variant="outline" size="sm" onClick={handleMarkUnread} data-testid="task-meta-mark-unread">
                  <Mail className="gba:h-4 gba:w-4 gba:mr-2" />
                  {t('task-meta-mark-unread')}
                </Button>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gba:gap-2" data-testid="task-meta-priority-trigger">
                    <span>{t('task-meta-priority')}</span>
                    <Badge variant="secondary" className="gba:h-5 gba:px-2">
                      {formatUserPriorityLabel(selectedTask.userState?.userPriority)}
                    </Badge>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuRadioGroup
                    value={
                      selectedTask.userState?.userPriority === null ||
                      selectedTask.userState?.userPriority === undefined
                        ? 'none'
                        : String(selectedTask.userState.userPriority)
                    }
                    onValueChange={handleSetUserPriority}
                  >
                    <DropdownMenuRadioItem value="none">{t('task-meta-priority-none')}</DropdownMenuRadioItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioItem value="0">{t('task-meta-priority-high')}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="10">{t('task-meta-priority-medium')}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="20">{t('task-meta-priority-low')}</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <TaskDetailContent
              task={selectedTask}
              onClose={handleCloseTask}
              onTaskUpdated={onRefresh}
              onTaskCompleted={handleTaskCompleted}
              accessToken={accessToken}
              userId={userInfo?.id}
              userInfo={userInfo}
              showActions={true}
            />
          </div>
        ) : (
          <div className="gba:h-full gba:flex gba:items-center gba:justify-center gba:bg-background">
            <DesignEmptyState
              type="no-data"
              title={t('inbox-no-task-selected')}
              description={t('inbox-select-task-prompt')}
              data-testid="task-detail-empty"
            />
          </div>
        )}
      </div>
    </div>
  )
}
