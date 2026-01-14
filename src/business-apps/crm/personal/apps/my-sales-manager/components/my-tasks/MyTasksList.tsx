import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  Card,
  CardContent,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Spinner,
  Alert,
  AlertTitle,
  AlertDescription,
  Badge
} from '@newwork/nw-design-system'
import { useMyTasks } from '../../hooks/useMyTasks'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

export interface MyTasksListProps extends Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'> {
  employeeId: string
}

export const MyTasksList: React.FC<MyTasksListProps> = ({ accessToken, employeeId }) => {
  const { tasks, total, loading, error } = useMyTasks({
    employeeId,
    accessToken: accessToken || '',
    statusFilter: ['PENDING', 'IN_PROGRESS'],
    limit: 50
  })

  const getPriorityVariant = (priority?: string): 'default' | 'destructive' | 'warning' | 'success' => {
    if (!priority) return 'default'
    const p = priority.toLowerCase()
    if (p.includes('high') || p.includes('urgent')) return 'destructive'
    if (p.includes('medium')) return 'warning'
    return 'default'
  }

  const getStatusVariant = (status?: string): 'default' | 'info' | 'success' => {
    if (!status) return 'default'
    const s = status.toLowerCase()
    if (s.includes('progress')) return 'info'
    if (s.includes('pending')) return 'default'
    return 'default'
  }

  const getReference = (task: any): string => {
    if (task.lead) return `Lead: ${task.lead.name}`
    if (task.account) return `Account: ${task.account.name}`
    if (task.contact) return `Contact: ${task.contact.firstName} ${task.contact.lastName}`
    if (task.opportunity) return `Opportunity: ${task.opportunity.name}`
    return '-'
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="my-tasks-list-error">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    )
  }

  return (
    <Card data-testid="my-tasks-list">
      <CardContent>
        {loading ? (
          <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
            <Spinner size="lg" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="gba:text-center gba:py-12">
            <p className="gba:text-muted-foreground">No open tasks</p>
          </div>
        ) : (
          <>
            <div className="gba:mb-4 gba:text-sm gba:text-muted-foreground">
              Showing {tasks.length} of {total} open tasks
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map(task => (
                  <TableRow key={task.id} data-testid={`task-row-${task.id}`}>
                    <TableCell>
                      <div>
                        <p className="gba:font-medium">{task.name || 'Untitled'}</p>
                        {task.description && (
                          <p className="gba:text-xs gba:text-muted-foreground gba:max-w-md gba:truncate">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {task.status?.value && (
                        <Badge variant={getStatusVariant(task.status.value)} data-testid={`task-status-${task.id}`}>
                          {task.status.value}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {task.priority?.value && (
                        <Badge
                          variant={getPriorityVariant(task.priority.value)}
                          data-testid={`task-priority-${task.id}`}
                        >
                          {task.priority.value}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {task.dueDate ? (
                        <span
                          className={
                            dayjs(task.dueDate).isBefore(dayjs())
                              ? 'gba:text-destructive gba:font-medium'
                              : 'gba:text-foreground'
                          }
                        >
                          {dayjs(task.dueDate).fromNow()}
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="gba:text-sm gba:text-muted-foreground">{getReference(task)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default MyTasksList
