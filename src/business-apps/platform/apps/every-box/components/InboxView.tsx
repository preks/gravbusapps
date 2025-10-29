/**
 * InboxView Component
 * Displays inbox tasks with search, filters, and grouping
 */

import React, { useState, useMemo } from 'react'
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

type TaskFilterType = 'all' | 'blinks' | 'approvals'

interface InboxViewProps extends BusinessAppContextProps {
  tasks: UnifiedTask[]
  totalCount: number
  isLoading: boolean
  error: string | null
  onRefresh: () => void
  onLoadMore: () => void
  hasMore: boolean
}

export const InboxView: React.FC<InboxViewProps> = ({
  tasks,
  totalCount,
  isLoading,
  error,
  onRefresh,
  onLoadMore,
  hasMore,
  ...context
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTask, setSelectedTask] = useState<UnifiedTask | null>(null)
  const [filterType, setFilterType] = useState<TaskFilterType>('all')

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

  // Extract user IDs and employee IDs separately
  const { userIds, employeeIds } = useMemo(() => {
    const uIds: string[] = []
    const eIds: string[] = []

    tasks.forEach(task => {
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
  }, [tasks])

  // Batch fetch all employee avatars in one request (handles both userIds and employeeIds)
  const { employeeMap } = useEmployeeAvatarsBatch(context.accessToken || '', userIds, employeeIds)

  // Filter tasks (tasks are already sorted by date from the API)
  const filteredTasks = useMemo(() => {
    let result = tasks

    // Apply task type filter
    if (filterType === 'blinks') {
      result = result.filter(isBlinkTask)
    } else if (filterType === 'approvals') {
      result = result.filter(isApprovalTask)
    }
    // 'all' shows all tasks - no filtering

    // Apply search filter
    if (searchQuery.trim()) {
      result = filterTasksBySearch(result, searchQuery)
    }

    // Tasks are already sorted by createdAt (desc) from the unified API
    // No additional sorting needed here

    return result
  }, [tasks, searchQuery, filterType])

  // Count tasks by type for badges
  const taskCounts = useMemo(() => {
    return {
      all: tasks.length,
      blinks: tasks.filter(isBlinkTask).length,
      approvals: tasks.filter(isApprovalTask).length
    }
  }, [tasks])

  if (isLoading && tasks.length === 0) {
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
          onClick={onRefresh}
          disabled={isLoading}
          data-testid="inbox-refresh-button"
        >
          <RefreshCw className={`gba:h-4 gba:w-4 ${isLoading ? 'gba:animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Task Type Filters */}
      <div className="gba:flex gba:items-center gba:gap-2" data-testid="inbox-filter-buttons">
        <Button
          variant={filterType === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterType('all')}
          data-testid="inbox-filter-all"
          startIcon={<Inbox className="gba:h-4 gba:w-4" />}
          endAdornment={
            <Badge variant="secondary" className="gba:ml-2">
              {taskCounts.all}
            </Badge>
          }
        >
          All
        </Button>
        <Button
          variant={filterType === 'blinks' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterType('blinks')}
          data-testid="inbox-filter-blinks"
          startIcon={<Zap className="gba:h-4 gba:w-4" />}
          endAdornment={
            taskCounts.blinks > 0 && (
              <Badge variant="secondary" className="gba:ml-2">
                {taskCounts.blinks}
              </Badge>
            )
          }
        >
          Blinks
        </Button>
        <Button
          variant={filterType === 'approvals' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterType('approvals')}
          data-testid="inbox-filter-approvals"
          startIcon={<CheckCircle className="gba:h-4 gba:w-4" />}
          endAdornment={
            taskCounts.approvals > 0 && (
              <Badge variant="secondary" className="gba:ml-2">
                {taskCounts.approvals}
              </Badge>
            )
          }
        >
          Approvals
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error Loading Tasks</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
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
                Showing {filteredTasks.length} of {totalCount} tasks
              </p>
              {hasMore && (
                <Button
                  variant="outline"
                  onClick={onLoadMore}
                  disabled={isLoading}
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
        {...context}
        task={selectedTask}
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onTaskUpdated={onRefresh}
      />
    </div>
  )
}
