import React, { useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge, EmptyState } from '@newwork/nw-design-system'
import { CheckSquare } from 'lucide-react'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { usePagination } from '../../hooks/usePagination'
import { PaginationControls } from './PaginationControls'

export interface TaskItem {
  id: string
  name: string
  description?: string
  assignedTo?: string
  relatedTo?: string
  dueDate?: string | number | Date
  isOverdue?: boolean
  priority: 'High' | 'Normal' | 'Low' | string
  status: string
  relatedEntity?: {
    type: 'opportunity' | 'lead' | 'contact' | 'account'
    id: string
    name: string
  }
}

/**
 * Navigation configuration for task-related entities
 * Each module (CRM, IRM, etc.) provides its specific URL patterns
 */
export interface TaskNavigationConfig {
  opportunityUrl: string
  leadUrl: string
  contactUrl: string
  accountUrl: string
  sourceParam: string
}

export interface TaskSummaryProps {
  tasks: TaskItem[]
  totalCount?: number
  navigationConfig: TaskNavigationConfig
  onPageChange?: (page: number, pageSize: number) => void
}

export const TaskSummary: React.FC<TaskSummaryProps> = ({ tasks, totalCount = 0, navigationConfig, onPageChange }) => {
  const { currentPage, totalPages, handleNextPage, handlePrevPage, getPaginationInfo } = usePagination({
    totalCount,
    pageSize: 20,
    onPageChange
  })

  const { startItem, endItem, totalItems } = getPaginationInfo()

  // Navigation handler for task clicks
  const handleTaskClick = useCallback(
    (task: TaskItem) => {
      if (!task.relatedEntity) {
        return
      }

      const { type, id } = task.relatedEntity
      let url: string

      switch (type) {
        case 'opportunity':
          url = buildPlatformUrl(navigationConfig.opportunityUrl, {
            opportunityId: id,
            source: navigationConfig.sourceParam,
            fromView: 'dashboard',
            fromTask: task.id
          })
          break
        case 'lead':
          url = buildPlatformUrl(navigationConfig.leadUrl, {
            leadId: id,
            source: navigationConfig.sourceParam,
            fromView: 'dashboard',
            fromTask: task.id
          })
          break
        case 'contact':
          url = buildPlatformUrl(navigationConfig.contactUrl, {
            contactId: id,
            source: navigationConfig.sourceParam,
            fromView: 'dashboard',
            fromTask: task.id
          })
          break
        case 'account':
          url = buildPlatformUrl(navigationConfig.accountUrl, {
            accountId: id,
            source: navigationConfig.sourceParam,
            fromView: 'dashboard',
            fromTask: task.id
          })
          break
        default:
          return
      }

      navigateTo(url)
    },
    [navigationConfig]
  )
  return (
    <Card className="gba:h-full">
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:p-2 gba:bg-green-100 gba:rounded-lg">
              <CheckSquare className="gba:h-6 gba:w-6 gba:text-green-600" />
            </div>
            <CardTitle>My Open Tasks</CardTitle>
          </div>
          {totalCount > 0 && <Badge variant="secondary">{totalCount} total</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        {tasks.length > 0 ? (
          <>
            <div className="gba:space-y-4 gba:max-h-96 gba:overflow-y-auto">
              {tasks.map(task => (
                <Card
                  key={task.id}
                  className="gba:transition-all gba:duration-200 gba:hover:shadow-md gba:hover:bg-accent gba:cursor-pointer"
                  data-testid={`task-item-${task.id}`}
                  onClick={e => {
                    e.stopPropagation()
                    handleTaskClick(task)
                  }}
                >
                  <CardHeader className="gba:pb-2">
                    <div className="gba:flex gba:items-center gba:gap-3">
                      <div
                        className={`gba:w-8 gba:h-8 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:shrink-0 ${
                          task.isOverdue ? 'gba:bg-red-100' : 'gba:bg-green-100'
                        }`}
                      >
                        <span
                          className={`gba:text-xs gba:font-medium ${
                            task.isOverdue ? 'gba:text-red-600' : 'gba:text-green-600'
                          }`}
                        >
                          {task.priority.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1 gba:min-w-0">
                        <CardTitle className={`gba:text-sm gba:truncate ${task.isOverdue ? 'gba:text-red-700' : ''}`}>
                          {task.name}
                        </CardTitle>
                        <Badge
                          variant={
                            task.priority === 'High'
                              ? 'destructive'
                              : task.priority === 'Normal'
                                ? 'default'
                                : 'secondary'
                          }
                        >
                          {task.priority}
                        </Badge>
                      </div>
                      <Badge variant={task.status === 'Completed' ? 'default' : 'outline'}>{task.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {task.description && (
                      <CardDescription className="gba:mb-2 gba:truncate">{task.description}</CardDescription>
                    )}
                    <div className="gba:text-xs gba:text-gray-500 gba:mb-1">
                      {task.assignedTo} • {task.relatedTo}
                    </div>
                    {task.dueDate && (
                      <div
                        className={`gba:text-xs ${
                          task.isOverdue ? 'gba:text-red-600 gba:font-medium' : 'gba:text-gray-400'
                        }`}
                      >
                        Due: {new Date(task.dueDate).toLocaleDateString()}
                        {task.isOverdue && ' (Overdue)'}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination Controls */}
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              startItem={startItem}
              endItem={endItem}
              totalItems={totalItems}
              itemLabel="tasks"
              onPrevPage={handlePrevPage}
              onNextPage={handleNextPage}
              dataTestIdPrefix="tasks"
            />
          </>
        ) : (
          <EmptyState
            type="no-data"
            title="No Tasks"
            description="No active tasks. All caught up!"
            data-testid="task-summary-empty-state"
          />
        )}
      </CardContent>
    </Card>
  )
}

export default TaskSummary
