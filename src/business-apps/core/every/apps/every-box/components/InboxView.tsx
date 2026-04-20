/**
 * InboxView Component
 * Displays inbox tasks with search, filters, and grouping
 *
 * URL Parameters:
 * - taskId: ID of the selected task to open directly
 *   Example: ?taskId=abc-123 will open the task detail panel for task with ID "abc-123"
 */

import React, { useState, useMemo, useEffect, useLayoutEffect, useCallback, useRef } from 'react'
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
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  cn
} from '@newwork/nw-design-system'
import translations from '../_i18n'
import { Pin, Mail, WandSparkles, Sparkles } from 'lucide-react'
import type { TaskSearchResult } from '@/business-apps/core/every/apps/every-api/services/AiService'
import { UnifiedTask } from '../types'
import { TaskCard } from './TaskCard'
import { TaskDetailContent } from './TaskDetailContent'
import { AiWritingAssistantPanel } from './AiWritingAssistantPanel'
import { EmptyState } from './EmptyState'
import { LoadingSkeleton } from './LoadingSkeleton'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useEmployeeAvatarsBatch } from '../hooks/useEmployeeAvatarsBatch'
import { FilterType } from './FiltersDropdown'
import { markTaskRead, markTaskUnread, patchTaskState } from '@/business-apps/core/every/apps/every-api'
import { isApprovalsFilterTask } from '../utils/approvalsFilter'

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
  // AI Search results - when provided, filters task list directly
  aiSearchResults?: TaskSearchResult[]
  aiSearchMode?: 'semantic' | 'lexical' | null
  aiIsSearching?: boolean
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

/**
 * Pure filter functions (module-level to avoid re-creation on every render)
 */
const isBlinkTask = (task: UnifiedTask): boolean => {
  return task.source === 'cflow' && task.tags?.app === 'quick-task'
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
  userInfo,
  // AI Search
  aiSearchResults = [],
  aiSearchMode = null,
  aiIsSearching = false
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

  const getPriorityBadgeClass = useCallback((value: number | null | undefined): string => {
    if (value === null || value === undefined) {
      return 'gba:bg-muted gba:text-muted-foreground gba:border gba:border-muted-foreground/15'
    }
    if (value === 0) {
      return 'gba:bg-red-500/10 gba:text-red-700 gba:border gba:border-red-500/20 gba:dark:text-red-200'
    }
    if (value === 10) {
      return 'gba:bg-amber-500/10 gba:text-amber-800 gba:border gba:border-amber-500/20 gba:dark:text-amber-200'
    }
    if (value === 20) {
      return 'gba:bg-emerald-500/10 gba:text-emerald-800 gba:border gba:border-emerald-500/20 gba:dark:text-emerald-200'
    }
    return 'gba:bg-muted gba:text-muted-foreground gba:border gba:border-muted-foreground/15'
  }, [])

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
  // Only auto-mark as read when selection is user-initiated (click).
  // Programmatic selection (auto-select first task / URL / sync updates) must not override "mark unread".
  // Using a key avoids sync effects clobbering the origin flag.
  const userSelectedKeyRef = useRef<string>('')
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
  const [showAiAssistant, setShowAiAssistant] = useState(false) // AI Writing Assistant panel

  const tasksForInitRef = useRef(tasks)
  const completedTasksForInitRef = useRef(completedTasks)
  const isLoadingForInitRef = useRef(isLoading)
  tasksForInitRef.current = tasks
  completedTasksForInitRef.current = completedTasks
  isLoadingForInitRef.current = isLoading

  const TASKS_PER_PAGE = 20

  // Infinite scroll refs
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const loadMoreLockRef = useRef(false) // Prevent multiple concurrent load more calls

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

  // Sync local tasks with props before paint so we never flash an empty list one frame
  // behind fresh `tasks` from the parent (e.g. bootstrap hydration).
  useLayoutEffect(() => {
    setLocalTasks(filterActiveTasks(tasks))
  }, [tasks])

  useLayoutEffect(() => {
    setLocalCompletedTasks(filterCompletedTasks(completedTasks))
  }, [completedTasks])

  // Keep selectedTask in sync with latest task data (important for auto-refresh updates)
  useEffect(() => {
    if (!selectedTask) return
    const all = [...localTasks, ...localCompletedTasks]
    const next = all.find(t => t.id === selectedTask.id && t.source === selectedTask.source)
    if (next && next !== selectedTask) {
      setSelectedTask(next)
    }
  }, [localTasks, localCompletedTasks, selectedTask?.id, selectedTask?.source])

  // Initialize selected task from URL when tasks are loaded, or auto-select first task.
  // Defer by two animation frames so the list paints before the detail panel opens (less flicker).
  useEffect(() => {
    if (isInitialized || tasks.length === 0 || isLoading) {
      return
    }

    let cancelled = false
    let raf1 = 0
    let raf2 = 0

    const applyInitialSelection = () => {
      if (cancelled || isLoadingForInitRef.current) {
        return
      }
      const active = tasksForInitRef.current
      const completed = completedTasksForInitRef.current
      if (active.length === 0) {
        return
      }

      const taskIdFromUrl = getInitialTaskId()
      if (taskIdFromUrl) {
        const allTasks = [...active, ...completed]
        const taskToSelect = allTasks.find(t => t.id === taskIdFromUrl)
        if (taskToSelect) {
          userSelectedKeyRef.current = ''
          setSelectedTask(taskToSelect)
        } else {
          userSelectedKeyRef.current = ''
          setSelectedTask(active[0])
          updateTaskUrl(active[0].id)
        }
      } else {
        userSelectedKeyRef.current = ''
        setSelectedTask(active[0])
        updateTaskUrl(active[0].id)
      }
      setIsInitialized(true)
    }

    raf1 = globalThis.requestAnimationFrame(() => {
      raf2 = globalThis.requestAnimationFrame(applyInitialSelection)
    })

    return () => {
      cancelled = true
      globalThis.cancelAnimationFrame(raf1)
      globalThis.cancelAnimationFrame(raf2)
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
          userSelectedKeyRef.current = ''
          setSelectedTask(taskToSelect)
        } else {
          userSelectedKeyRef.current = ''
          setSelectedTask(null)
        }
      } else {
        userSelectedKeyRef.current = ''
        setSelectedTask(null)
      }
    }

    globalThis.addEventListener('popstate', handlePopState)
    return () => globalThis.removeEventListener('popstate', handlePopState)
  }, [localTasks, localCompletedTasks])

  // Handler to select a task and update URL
  // Toggle behavior: clicking on already selected task will deselect it
  // PERF: Use ref to read selectedTask so the callback is stable and doesn't
  // break React.memo on every TaskCard when selection changes
  const selectedTaskRef = useRef(selectedTask)
  selectedTaskRef.current = selectedTask

  const handleSelectTask = useCallback((task: UnifiedTask | null) => {
    // If clicking on the currently selected task, deselect it (close detail panel)
    if (task && selectedTaskRef.current?.id === task.id) {
      userSelectedKeyRef.current = ''
      setSelectedTask(null)
      updateTaskUrl(null)
    } else {
      // Otherwise, select the new task
      userSelectedKeyRef.current = task ? `${task.source}:${task.id}` : ''
      setSelectedTask(task)
      updateTaskUrl(task?.id || null)
    }
  }, [])

  // Handler to close task detail
  const handleCloseTask = useCallback(() => {
    userSelectedKeyRef.current = ''
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
        userSelectedKeyRef.current = ''
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
    // Only mark as read for user-initiated selections.
    if (userSelectedKeyRef.current !== key) return
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
   * Apply type-specific filtering (blinks, approvals)
   * Uses module-level pure functions (isBlinkTask, isApprovalsFilterTask) for stable references
   */
  const usingBlinkApiTasks = filterType === 'blinks' && blinkTasks && blinkTasks.length > 0

  const applyTypeFilter = useCallback(
    (taskList: UnifiedTask[], filter: TaskFilterType): UnifiedTask[] => {
      if (filter === 'blinks') {
        if (usingBlinkApiTasks) return taskList
        return taskList.filter(isBlinkTask)
      }
      if (filter === 'approvals') {
        return taskList.filter(isApprovalsFilterTask)
      }
      return taskList
    },
    [usingBlinkApiTasks]
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

  // Check if we have active AI search results
  const hasAiSearchResults = aiSearchResults.length > 0 && globalSearch.trim().length > 0

  // Filter tasks (tasks are already sorted by date from the API)
  const allFilteredTasks = useMemo(() => {
    // When AI search results are available, filter tasks to only show matches
    if (hasAiSearchResults) {
      // Create a set of task IDs from AI search results for fast lookup
      const aiResultIds = new Set(aiSearchResults.map(r => r.taskId))

      // Filter current tasks to only include those in AI search results
      // and maintain the order from AI search (by relevance/similarity)
      const matchingTasks = currentTasks.filter(task => aiResultIds.has(task.id))

      // Sort by AI search relevance (order from aiSearchResults)
      const taskOrder = new Map(aiSearchResults.map((r, i) => [r.taskId, i]))
      matchingTasks.sort((a, b) => {
        const orderA = taskOrder.get(a.id) ?? 999
        const orderB = taskOrder.get(b.id) ?? 999
        return orderA - orderB
      })

      // If AI returned hits but none match IDs in the loaded pages (embedding lag, wrong id, etc.),
      // fall through to the normal list so the inbox does not look empty while tasks exist.
      if (matchingTasks.length > 0) {
        return matchingTasks
      }
    }

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
  }, [currentTasks, globalSearch, filterType, applyTypeFilter, hasAiSearchResults, aiSearchResults])

  // Slice to displayedCount for pagination (show 20 initially, load more on demand)
  const filteredTasks = useMemo(() => {
    return allFilteredTasks.slice(0, displayedCount)
  }, [allFilteredTasks, displayedCount])

  // Check if there are more tasks to show locally (before fetching more from API)
  const hasMoreLocal = allFilteredTasks.length > displayedCount

  // Handle "Load more" - first show more from local cache, then fetch from API if needed
  // Guarded to prevent multiple concurrent loads (important for infinite scroll)
  const handleLoadMore = useCallback(async () => {
    if (loadMoreLockRef.current || currentIsLoading) {
      return
    }

    if (hasMoreLocal) {
      // Show more from already fetched tasks
      setDisplayedCount(prev => prev + TASKS_PER_PAGE)
    } else if (currentHasMore) {
      // Fetch more from API
      loadMoreLockRef.current = true
      try {
        await Promise.resolve(currentOnLoadMore())
      } finally {
        // Always release the lock even if loadMore returns early (no-op) or throws
        loadMoreLockRef.current = false
      }
    }
  }, [hasMoreLocal, currentHasMore, currentOnLoadMore, currentIsLoading])

  // Infinite scroll using scroll position (more reliable than IntersectionObserver in nested scroll containers/webviews)
  useEffect(() => {
    // Don't enable infinite scroll if searching (keeps existing behavior)
    if (globalSearch.trim()) return

    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    const canLoadMore = hasMoreLocal || currentHasMore
    if (!canLoadMore) return

    const THRESHOLD_PX = 200
    let rafId: number | null = null

    const checkNearBottom = () => {
      rafId = null
      if (loadMoreLockRef.current || currentIsLoading) return

      const { scrollTop, clientHeight, scrollHeight } = scrollContainer
      const distanceToBottom = scrollHeight - (scrollTop + clientHeight)
      if (distanceToBottom <= THRESHOLD_PX) {
        void handleLoadMore()
      }
    }

    const onScroll = () => {
      if (rafId !== null) return
      rafId = globalThis.requestAnimationFrame(checkNearBottom)
    }

    scrollContainer.addEventListener('scroll', onScroll, { passive: true })
    // Run once in case the list is already near the bottom (e.g. short lists)
    onScroll()

    return () => {
      if (rafId !== null) {
        globalThis.cancelAnimationFrame(rafId)
      }
      scrollContainer.removeEventListener('scroll', onScroll)
    }
  }, [globalSearch, hasMoreLocal, currentHasMore, currentIsLoading, handleLoadMore])

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
        <div ref={scrollContainerRef} className="gba:flex-1 gba:overflow-y-auto gba:px-3 gba:py-2">
          {/* AI Search Mode Indicator */}
          {(hasAiSearchResults || aiIsSearching) && globalSearch.trim() && (
            <div className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-2 gba:mb-2 gba:rounded-lg gba:bg-sky-50/60 gba:border gba:border-sky-100">
              <div className="gba:flex gba:items-center gba:justify-center gba:h-6 gba:w-6 gba:rounded-md gba:bg-sky-100">
                {aiIsSearching ? (
                  <div className="gba:h-3.5 gba:w-3.5 gba:rounded-full gba:border-2 gba:border-sky-200 gba:border-t-sky-600 gba:animate-spin" />
                ) : (
                  <Sparkles className="gba:h-3.5 gba:w-3.5 gba:text-sky-600" />
                )}
              </div>
              <div className="gba:flex-1 gba:min-w-0">
                <span className="gba:text-xs gba:font-medium gba:text-sky-700">
                  {aiSearchMode === 'semantic' ? t('ai-search-mode-semantic') : t('ai-search-mode-lexical')}
                </span>
                {!aiIsSearching && hasAiSearchResults && (
                  <span className="gba:text-xs gba:text-sky-600 gba:ml-2">
                    {filteredTasks.length} {filteredTasks.length === 1 ? 'result' : 'results'}
                  </span>
                )}
              </div>
            </div>
          )}

          {filteredTasks.length === 0 ? (
            <EmptyState type="inbox" message={getEmptyStateMessage(filterType)} />
          ) : (
            /* Task List */
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

              {/* Infinite Scroll Sentinel + Fallback Button */}
              {!globalSearch.trim() && (hasMoreLocal || currentHasMore) && (
                <div className="gba:mt-2">
                  {/* Sentinel element for IntersectionObserver - triggers automatic loading */}
                  <div
                    ref={sentinelRef}
                    className="gba:h-4"
                    data-testid="inbox-infinite-scroll-sentinel"
                    aria-hidden="true"
                  />
                  {/* Loading indicator shown while fetching more tasks */}
                  {currentIsLoading && (
                    <div className="gba:flex gba:justify-center gba:py-4" data-testid="inbox-loading-more">
                      <span className="gba:text-sm gba:text-muted-foreground">{t('inbox-loading-more')}</span>
                    </div>
                  )}
                  {/* Fallback button in case IntersectionObserver doesn't trigger or user prefers manual loading */}
                  {!currentIsLoading && (
                    <Button
                      variant="ghost"
                      onClick={handleLoadMore}
                      className="gba:w-full"
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

      {/* Detail Panel - Task Details with vertical action tabs on right */}
      <div className="gba:flex gba:flex-1 gba:overflow-hidden gba:min-h-0">
        {selectedTask ? (
          <div className="gba:h-full gba:flex gba:bg-background gba:w-full" data-testid="task-detail-dialog">
            {/* Main content area */}
            <div className="gba:flex-1 gba:flex gba:flex-col gba:overflow-hidden gba:px-6">
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

            {/* AI Writing Assistant Panel - Slide from right */}
            {showAiAssistant && (
              <div className="gba:border-l gba:bg-background gba:w-80 gba:flex-shrink-0 gba:overflow-hidden">
                <AiWritingAssistantPanel
                  taskId={selectedTask.id}
                  source={selectedTask.source}
                  accessToken={accessToken}
                  task={selectedTask}
                />
              </div>
            )}

            {/* Vertical action tabs on right side */}
            <div className="gba:flex gba:flex-col gba:border-l gba:bg-muted/30 gba:w-10 gba:flex-shrink-0">
              {/* Pin/Unpin */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleTogglePinned}
                    className={cn(
                      'gba:h-10 gba:w-10 gba:flex gba:items-center gba:justify-center gba:transition-colors gba:border-b',
                      selectedTask.userState?.isPinned
                        ? 'gba:bg-primary/10 gba:text-primary'
                        : 'gba:text-muted-foreground hover:gba:bg-muted hover:gba:text-foreground'
                    )}
                    data-testid="task-meta-pin-toggle"
                  >
                    <Pin className="gba:h-4 gba:w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  {selectedTask.userState?.isPinned ? t('task-meta-unpin') : t('task-meta-pin')}
                </TooltipContent>
              </Tooltip>

              {/* Mark Unread */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleMarkUnread}
                    className="gba:h-10 gba:w-10 gba:flex gba:items-center gba:justify-center gba:text-muted-foreground hover:gba:bg-muted hover:gba:text-foreground gba:transition-colors gba:border-b"
                    data-testid="task-meta-mark-unread"
                  >
                    <Mail className="gba:h-4 gba:w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left">{t('task-meta-mark-unread')}</TooltipContent>
              </Tooltip>

              {/* Priority Dropdown */}
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <button
                        className={cn(
                          'gba:h-10 gba:w-10 gba:flex gba:items-center gba:justify-center gba:transition-colors gba:border-b gba:text-xs gba:font-semibold',
                          selectedTask.userState?.userPriority !== null &&
                            selectedTask.userState?.userPriority !== undefined
                            ? getPriorityBadgeClass(selectedTask.userState?.userPriority)
                            : 'gba:text-muted-foreground hover:gba:bg-muted hover:gba:text-foreground'
                        )}
                        data-testid="task-meta-priority-trigger"
                      >
                        {formatUserPriorityLabel(selectedTask.userState?.userPriority).charAt(0)}
                      </button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    {t('task-meta-priority')}: {formatUserPriorityLabel(selectedTask.userState?.userPriority)}
                  </TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end" side="left">
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

              {/* AI Writing Assistant */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setShowAiAssistant(!showAiAssistant)}
                    className={cn(
                      'gba:h-10 gba:w-10 gba:flex gba:items-center gba:justify-center gba:transition-colors gba:border-b',
                      showAiAssistant
                        ? 'gba:bg-sky-500/10 gba:text-sky-600'
                        : 'gba:text-muted-foreground hover:gba:bg-muted hover:gba:text-foreground'
                    )}
                    data-testid="task-meta-ai-assistant-toggle"
                  >
                    <WandSparkles className="gba:h-4 gba:w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left">{t('ai-assistant-draft-helper')}</TooltipContent>
              </Tooltip>
            </div>
          </div>
        ) : (
          <div className="gba:h-full gba:flex gba:items-center gba:justify-center gba:bg-background gba:flex-1 gba:px-6">
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
