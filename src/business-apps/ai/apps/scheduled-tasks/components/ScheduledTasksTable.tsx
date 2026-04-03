import React, { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Button,
  Spinner,
  Alert,
  AlertDescription,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@newwork/nw-design-system'
import { Play, Pause, Trash2, Clock, RefreshCw, History } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ScheduledTask, TaskExecution } from '@/common/network/flowbot/ScheduledTasksClient'
import { useScheduledTasks } from '../hooks/useScheduledTasks'

type ScheduledTasksTableProps = BusinessAppContextProps

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'active':
      return <Badge variant="success">Active</Badge>
    case 'paused':
      return <Badge variant="warning">Paused</Badge>
    case 'completed':
      return <Badge variant="info">Completed</Badge>
    case 'failed':
      return <Badge variant="destructive">Failed</Badge>
    case 'cancelled':
      return <Badge variant="secondary">Cancelled</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

const formatDateTime = (dateStr: string | null): string => {
  if (!dateStr) return 'N/A'
  try {
    const date = new Date(dateStr)
    return date.toLocaleString()
  } catch {
    return dateStr
  }
}

export const ScheduledTasksTable: React.FC<ScheduledTasksTableProps> = context => {
  const { tasks, total, isLoading, error, reload, pauseTask, resumeTask, deleteTask, getTaskExecutions } =
    useScheduledTasks(context)

  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<ScheduledTask | null>(null)
  const [executionsDialogOpen, setExecutionsDialogOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<ScheduledTask | null>(null)
  const [executions, setExecutions] = useState<TaskExecution[]>([])
  const [executionsLoading, setExecutionsLoading] = useState(false)

  const handlePauseResume = async (task: ScheduledTask) => {
    setActionLoading(task.id)
    try {
      if (task.status === 'active') {
        await pauseTask(task.id)
      } else if (task.status === 'paused') {
        await resumeTask(task.id)
      }
    } catch (err) {
      console.error('Failed to pause/resume task:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteClick = (task: ScheduledTask) => {
    setTaskToDelete(task)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!taskToDelete) return
    setActionLoading(taskToDelete.id)
    try {
      await deleteTask(taskToDelete.id)
      setDeleteDialogOpen(false)
      setTaskToDelete(null)
    } catch (err) {
      console.error('Failed to delete task:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleViewExecutions = async (task: ScheduledTask) => {
    setSelectedTask(task)
    setExecutionsDialogOpen(true)
    setExecutionsLoading(true)
    try {
      const execs = await getTaskExecutions(task.id)
      setExecutions(execs)
    } catch (err) {
      console.error('Failed to load executions:', err)
      setExecutions([])
    } finally {
      setExecutionsLoading(false)
    }
  }

  if (isLoading && tasks.length === 0) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:py-12" data-testid="scheduled-tasks-loading">
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="scheduled-tasks-error">
        <AlertDescription>{error}</AlertDescription>
        <Button variant="outline" size="sm" onClick={() => reload()} className="gba:mt-2">
          <RefreshCw className="gba:h-4 gba:w-4 gba:mr-2" />
          Retry
        </Button>
      </Alert>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="gba:text-center gba:py-12 gba:text-muted-foreground" data-testid="scheduled-tasks-empty">
        <Clock className="gba:h-12 gba:w-12 gba:mx-auto gba:mb-4 gba:opacity-50" />
        <p className="gba:text-lg gba:font-medium">No scheduled tasks yet</p>
        <p className="gba:text-sm gba:mt-2">
          Ask Every to schedule something for you, like "send me a list of my team's activities every day at 10 AM"
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="gba:space-y-4">
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:text-sm gba:text-muted-foreground">{total} scheduled task(s)</div>
          <Button variant="outline" size="sm" onClick={() => reload()}>
            <RefreshCw className="gba:h-4 gba:w-4 gba:mr-2" />
            Refresh
          </Button>
        </div>

        <Table data-testid="scheduled-tasks-table">
          <TableHeader>
            <TableRow className="gba:border-b">
              <TableHead>Name</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Next Run</TableHead>
              <TableHead>Run Count</TableHead>
              <TableHead className="gba:w-[200px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map(task => (
              <TableRow key={task.id} data-testid={`scheduled-task-row-${task.id}`}>
                <TableCell className="gba:py-3">
                  <div>
                    <div className="gba:font-medium">{task.name}</div>
                    <div className="gba:text-sm gba:text-muted-foreground gba:truncate gba:max-w-[300px]">
                      {task.task_instruction}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="gba:py-3">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <Clock className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                    <span className="gba:text-sm">{task.schedule_description}</span>
                  </div>
                </TableCell>
                <TableCell className="gba:py-3">{getStatusBadge(task.status)}</TableCell>
                <TableCell className="gba:py-3">
                  <span className="gba:text-sm">{formatDateTime(task.next_run_at)}</span>
                </TableCell>
                <TableCell className="gba:py-3">
                  <span className="gba:text-sm">
                    {task.run_count}
                    {task.max_runs ? ` / ${task.max_runs}` : ''}
                  </span>
                </TableCell>
                <TableCell className="gba:py-3">
                  <div className="gba:flex gba:gap-2 gba:justify-start">
                    {(task.status === 'active' || task.status === 'paused') && (
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handlePauseResume(task)}
                        disabled={actionLoading === task.id}
                        title={task.status === 'active' ? 'Pause' : 'Resume'}
                        data-testid={`scheduled-task-pause-resume-${task.id}`}
                      >
                        {actionLoading === task.id ? (
                          <Spinner className="gba:h-4 gba:w-4" />
                        ) : task.status === 'active' ? (
                          <Pause className="gba:h-4 gba:w-4" />
                        ) : (
                          <Play className="gba:h-4 gba:w-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleViewExecutions(task)}
                      title="View Executions"
                      data-testid={`scheduled-task-executions-${task.id}`}
                    >
                      <History className="gba:h-4 gba:w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => handleDeleteClick(task)}
                      disabled={actionLoading === task.id}
                      title="Delete"
                      data-testid={`scheduled-task-delete-${task.id}`}
                    >
                      {actionLoading === task.id ? (
                        <Spinner className="gba:h-4 gba:w-4" />
                      ) : (
                        <Trash2 className="gba:h-4 gba:w-4" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Scheduled Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the scheduled task "{taskToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={actionLoading !== null}>
              {actionLoading ? <Spinner className="gba:h-4 gba:w-4 gba:mr-2" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Executions Dialog */}
      <Dialog open={executionsDialogOpen} onOpenChange={setExecutionsDialogOpen}>
        <DialogContent className="gba:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Execution History: {selectedTask?.name}</DialogTitle>
            <DialogDescription>Recent executions of this scheduled task</DialogDescription>
          </DialogHeader>
          <div className="gba:max-h-[400px] gba:overflow-y-auto">
            {executionsLoading ? (
              <div className="gba:flex gba:justify-center gba:py-8">
                <Spinner />
              </div>
            ) : executions.length === 0 ? (
              <div className="gba:text-center gba:py-8 gba:text-muted-foreground">No executions yet</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Started</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {executions.map(exec => (
                    <TableRow key={exec.id}>
                      <TableCell className="gba:text-sm">{formatDateTime(exec.started_at)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            exec.status === 'success'
                              ? 'success'
                              : exec.status === 'failed'
                                ? 'destructive'
                                : 'secondary'
                          }
                        >
                          {exec.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="gba:text-sm gba:max-w-[300px] gba:truncate">
                        {exec.result_summary || exec.error_message || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExecutionsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
