import React, { useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge } from '@newwork/nw-design-system'
import { CheckSquare } from 'lucide-react'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'

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

export interface TaskSummaryProps {
  tasks: TaskItem[]
  moduleColor?: string
  source?: 'investments' | 'customer-relations'
}

export const TaskSummary: React.FC<TaskSummaryProps> = ({ tasks, source = 'investments' }) => {
  // Navigation handler for task clicks
  const handleTaskClick = useCallback(
    (task: TaskItem) => {
      if (!task.relatedEntity) {
        return
      }

      const { type, id } = task.relatedEntity
      const isInvestmentSource = source === 'investments'
      let url: string

      switch (type) {
        case 'opportunity':
          url = buildPlatformUrl(
            isInvestmentSource ? '/platform/irm/opportunity-record' : '/platform/crm/opportunity-record',
            {
              opportunityId: id,
              source: source,
              fromView: 'dashboard',
              fromTask: task.id
            }
          )
          break
        case 'lead':
          url = buildPlatformUrl(isInvestmentSource ? '/platform/irm/lead-record' : '/platform/crm/lead-record', {
            leadId: id,
            source: source,
            fromView: 'dashboard',
            fromTask: task.id
          })
          break
        case 'contact':
          url = buildPlatformUrl(isInvestmentSource ? '/platform/irm/contact-record' : '/platform/crm/contact-record', {
            contactId: id,
            source: source,
            fromView: 'dashboard',
            fromTask: task.id
          })
          break
        case 'account':
          url = buildPlatformUrl(isInvestmentSource ? '/platform/irm/account-record' : '/platform/crm/account-record', {
            accountId: id,
            source: source,
            fromView: 'dashboard',
            fromTask: task.id
          })
          break
        default:
          return
      }

      navigateTo(url)
    },
    [source]
  )
  return (
    <Card className="gba:h-full">
      <CardHeader>
        <div className="gba:flex gba:items-center gba:gap-3">
          <div className="gba:p-2 gba:bg-green-100 gba:rounded-lg">
            <CheckSquare className="gba:h-6 gba:w-6 gba:text-green-600" />
          </div>
          <CardTitle>Active Tasks</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {tasks.length > 0 ? (
          <div className="gba:space-y-4 gba:max-h-64 gba:overflow-y-auto">
            {tasks.slice(0, 5).map(task => (
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
                      className={`gba:w-8 gba:h-8 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:flex-shrink-0 ${
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
        ) : (
          <div className="gba:h-64 gba:flex gba:items-center gba:justify-center">
            <div className="gba:text-center">
              <div className="gba:w-16 gba:h-16 gba:mx-auto gba:bg-green-100 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:mb-4">
                <CheckSquare className="gba:h-8 gba:w-8 gba:text-green-500" />
              </div>
              <div className="gba:text-gray-600 gba:text-lg">No active tasks. All caught up!</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default TaskSummary
