/**
 * InboxView Component
 * Displays inbox tasks with search, filters, and grouping
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { Input, Button, Alert, AlertTitle, AlertDescription, Badge } from '@newwork/nw-design-system'
import { Search, RefreshCw, Zap, CheckCircle, Inbox } from 'lucide-react'
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
  // Completed tasks props
  completedTasks: UnifiedTask[]
  completedTotalCount: number
  completedIsLoading: boolean
  completedError: string | null
  onCompletedRefresh: () => void
  onCompletedLoadMore: () => void
  completedHasMore: boolean
}

export const InboxView: React.FC<InboxViewProps> = ({
  tasks,
  totalCount,
  isLoading,
  error,
  onRefresh,
  onLoadMore,
  hasMore,
  completedTasks,
  completedTotalCount,
  completedIsLoading,
  completedError,
  onCompletedRefresh,
  onCompletedLoadMore,
  completedHasMore,
  ...context
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTask, setSelectedTask] = useState<UnifiedTask | null>(null)
  const [filterType, setFilterType] = useState<TaskFilterType>('all')
  const [localTasks, setLocalTasks] = useState<UnifiedTask[]>(tasks)
  const [localCompletedTasks, setLocalCompletedTasks] = useState<UnifiedTask[]>(completedTasks)

  // Sync local tasks with props
  useEffect(() => {
    setLocalTasks(tasks)
  }, [tasks])

  useEffect(() => {
    setLocalCompletedTasks(completedTasks)
  }, [completedTasks])

  // Handler to remove task immediately after completion and refresh completed tasks
  const handleTaskCompleted = useCallback(
    (taskId: string) => {
      // Remove from local inbox/active tasks immediately for better UX
      setLocalTasks(prev => prev.filter(t => t.id !== taskId))
      setLocalCompletedTasks(prev => prev.filter(t => t.id !== taskId))

      console.log('[InboxView] Task completed locally, removed from inbox. Refreshing completed tasks...')

      // Refresh completed tasks from backend using dedicated endpoint
      onCompletedRefresh()
    },
    [onCompletedRefresh]
  )

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
  const { employeeMap } = useEmployeeAvatarsBatch(context.accessToken || '', userIds, employeeIds)

  // Filter tasks (tasks are already sorted by date from the API)
  const filteredTasks = useMemo(() => {
    let result = currentTasks

    // Apply task type filter (only for active/inbox tasks, not completed)
    if (filterType !== 'completed') {
      if (filterType === 'blinks') {
        result = result.filter(isBlinkTask)
      } else if (filterType === 'approvals') {
        result = result.filter(isApprovalTask)
      }
      // 'all' shows all active tasks - no filtering
    }

    // Apply search filter (including sender name search)
    if (searchQuery.trim()) {
      result = filterTasksBySearch(result, searchQuery, employeeMap)
    }

    // Tasks are already sorted by createdAt (desc) from the unified API
    // No additional sorting needed here

    return result
  }, [currentTasks, searchQuery, filterType])

  // Count tasks by type for badges
  const taskCounts = useMemo(() => {
    return {
      all: tasks.length,
      blinks: tasks.filter(isBlinkTask).length,
      approvals: tasks.filter(isApprovalTask).length,
      completed: completedTasks.length
    }
  }, [tasks, completedTasks])

  if (currentIsLoading && currentTasks.length === 0) {
    return <LoadingSkeleton count={5} type="task" />
  }

  return (
    <div className="gba:space-y-4" data-testid="inbox-view">
      {/* Search and Actions */}
      <div className="gba:flex gba:items-center gba:gap-4">
        <div className="gba:relative gba:flex-1">
          <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:h-4 gba:w-4 gba:text-muted-foreground gba:pointer-events-none gba:z-10" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="gba:pl-10"
            data-testid="inbox-search-input"
          />
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
      <div className="gba:flex gba:items-center gba:gap-2" data-testid="inbox-filter-buttons">
        <Button
          variant={filterType === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterType('all')}
          data-testid="inbox-filter-all"
          className="gba:flex gba:items-center gba:gap-2"
        >
          <Inbox className="gba:h-4 gba:w-4" />
          All
          <Badge variant="secondary" className="gba:ml-2">
            {taskCounts.all}
          </Badge>
        </Button>
        <Button
          variant={filterType === 'blinks' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterType('blinks')}
          data-testid="inbox-filter-blinks"
          className="gba:flex gba:items-center gba:gap-2"
        >
          <Zap className="gba:h-4 gba:w-4" />
          Blinks
          {taskCounts.blinks > 0 && (
            <Badge variant="secondary" className="gba:ml-2">
              {taskCounts.blinks}
            </Badge>
          )}
        </Button>
        <Button
          variant={filterType === 'approvals' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterType('approvals')}
          data-testid="inbox-filter-approvals"
          className="gba:flex gba:items-center gba:gap-2"
        >
          <CheckCircle className="gba:h-4 gba:w-4" />
          Approvals
          {taskCounts.approvals > 0 && (
            <Badge variant="secondary" className="gba:ml-2">
              {taskCounts.approvals}
            </Badge>
          )}
        </Button>
        <Button
          variant={filterType === 'completed' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterType('completed')}
          data-testid="inbox-filter-completed"
          className="gba:flex gba:items-center gba:gap-2"
        >
          <CheckCircle className="gba:h-4 gba:w-4" />
          Completed
          {taskCounts.completed > 0 && (
            <Badge variant="secondary" className="gba:ml-2">
              {taskCounts.completed}
            </Badge>
          )}
        </Button>
      </div>

      {/* Error Alert */}
      {currentError && (
        <Alert variant="destructive">
          <AlertTitle>Error Loading Tasks</AlertTitle>
          <AlertDescription>{currentError}</AlertDescription>
        </Alert>
      )}

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <EmptyState
          type="inbox"
          message={
            searchQuery.trim()
              ? `No tasks found matching "${searchQuery}"`
              : filterType === 'blinks'
                ? 'No Blink tasks at the moment'
                : filterType === 'approvals'
                  ? 'No approval tasks at the moment'
                  : filterType === 'completed'
                    ? 'No completed tasks yet'
                    : 'No tasks assigned to you at the moment'
          }
        />
      ) : (
        <>
          <div className="gba:space-y-1.5" data-testid="inbox-task-list">
            {filteredTasks.map(task => (
              <TaskCard key={task.id} task={task} onView={setSelectedTask} employeeMap={employeeMap} />
            ))}
          </div>

          {/* Pagination Info and Load More */}
          {!searchQuery.trim() && (
            <div className="gba:flex gba:items-center gba:justify-between gba:pt-4 gba:border-t">
              <p className="gba:text-sm gba:text-muted-foreground">
                Showing {filteredTasks.length} of {currentTotalCount} tasks
              </p>
              {currentHasMore && (
                <Button
                  variant="outline"
                  onClick={currentOnLoadMore}
                  disabled={currentIsLoading}
                  data-testid="inbox-load-more-button"
                >
                  Load More
                </Button>
              )}
            </div>
          )}
        </>
      )}

      {/* Task Detail Dialog */}
      <TaskDetailDialog
        task={selectedTask}
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onTaskUpdated={onRefresh}
        onTaskCompleted={handleTaskCompleted}
        accessToken={context.accessToken}
        userId={context.userInfo?.id}
      />
    </div>
  )
}
