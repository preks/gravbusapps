import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, Spinner, Badge } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { MyTask } from '../../types'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

export interface UpcomingTasksWidgetProps extends Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'> {
  tasks: MyTask[]
  loading: boolean
}

export const UpcomingTasksWidget: React.FC<UpcomingTasksWidgetProps> = ({ tasks, loading }) => {
  const getPriorityVariant = (priority?: string): 'default' | 'destructive' | 'warning' | 'success' => {
    if (!priority) return 'default'
    const p = priority.toLowerCase()
    if (p.includes('high') || p.includes('urgent')) return 'destructive'
    if (p.includes('medium')) return 'warning'
    return 'default'
  }

  return (
    <Card data-testid="upcoming-tasks-widget">
      <CardHeader>
        <CardTitle>Upcoming Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
            <Spinner size="md" />
          </div>
        ) : tasks.length === 0 ? (
          <p className="gba:text-muted-foreground gba:text-sm">No upcoming tasks</p>
        ) : (
          <div className="gba:space-y-4">
            {tasks.map(task => (
              <div
                key={task.id}
                className="gba:flex gba:items-start gba:justify-between gba:pb-4 gba:border-b gba:border-border last:gba:border-0 last:gba:pb-0"
                data-testid={`upcoming-task-${task.id}`}
              >
                <div className="gba:flex-1">
                  <p className="gba:font-medium gba:text-sm">{task.name || 'Untitled'}</p>
                  <p className="gba:text-xs gba:text-muted-foreground">
                    {task.dueDate ? `Due ${dayjs(task.dueDate).fromNow()}` : 'No due date'}
                  </p>
                </div>
                {task.priority?.value && (
                  <Badge variant={getPriorityVariant(task.priority.value)} data-testid={`task-priority-${task.id}`}>
                    {task.priority.value}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default UpcomingTasksWidget
