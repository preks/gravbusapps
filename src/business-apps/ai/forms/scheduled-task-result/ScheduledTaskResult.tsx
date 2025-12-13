import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Spinner } from '@newwork/nw-design-system'
import { Calendar, Clock, RefreshCw, CheckCircle, Bot } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { TaskDetailHeader } from '@/business-apps/core/every/apps/every-box/components/TaskDetailHeader'
import { TaskDetailFooter } from '@/business-apps/core/every/apps/every-box/components/TaskDetailFooter'
import { TaskFormLayout } from '@/business-apps/core/every/apps/every-box/components/TaskFormLayout'
import { MarkdownRenderer } from './components/MarkdownRenderer'

/**
 * Props for the scheduled task result form
 */
interface ScheduledTaskResultProps extends BusinessAppContextProps {
  onClose?: () => void
}

/**
 * Extended additionalData interface for scheduled task results
 */
interface ScheduledTaskAdditionalData {
  [k: string]: unknown
  message?: string
  title?: string
  tags?: {
    app?: string
    taskId?: string
    taskName?: string
    createdVia?: string
  }
  psi_taskPayload?: {
    [k: string]: unknown
  }
  psi_processMetadata?: {
    [k: string]: unknown
  }
  psi_taskStatus?: string
  psi_taskCompletedAt?: string
  scheduledAt?: string
  dueDate?: string
}

/**
 * ScheduledTaskResult - A form component for displaying scheduled task results
 * in the EveryBox inbox with beautiful markdown rendering.
 */
const ScheduledTaskResultContent: React.FC<ScheduledTaskResultProps> = ({
  accessToken,
  additionalData
  // userInfo and onClose are available for future use
}) => {
  const [isCompleting, setIsCompleting] = useState(false)

  // Cast additionalData to extended interface
  const taskData = additionalData as ScheduledTaskAdditionalData | undefined

  // Extract task information
  const message = taskData?.message || ''
  const title = taskData?.title || taskData?.tags?.taskName || 'Scheduled Task Result'
  const taskName = taskData?.tags?.taskName || 'Scheduled Task'
  const scheduledTaskId = taskData?.tags?.taskId
  const scheduledAt = taskData?.scheduledAt
  const processMetadata = taskData?.psi_processMetadata || {}
  const taskStatus = taskData?.psi_taskStatus || processMetadata?.status || 'IN_PROGRESS'
  const taskCompletedAt = processMetadata?.completedAt || taskData?.psi_taskCompletedAt
  const isTaskCompleted = taskStatus === 'COMPLETED' || !!taskCompletedAt

  // Format the scheduled time
  const formattedScheduledAt = useMemo(() => {
    if (!scheduledAt) return null
    try {
      const date = new Date(scheduledAt)
      return date.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return scheduledAt
    }
  }, [scheduledAt])

  // Handle task completion (acknowledge/dismiss)
  const handleComplete = async () => {
    setIsCompleting(true)
    try {
      // Dispatch process continue event to mark the task as complete
      dispatchProcessContinueEvent(new CustomEvent('process-continue'), {
        acknowledged: true,
        completedAt: new Date().toISOString()
      })
    } catch (error) {
      console.error('Failed to complete task:', error)
    } finally {
      setIsCompleting(false)
    }
  }

  return (
    <TaskFormLayout>
      {/* Header */}
      <TaskDetailHeader
        title={title}
        subtitle={
          <div className="gba:flex gba:items-center gba:gap-2 gba:text-muted-foreground">
            <Bot className="gba:h-4 gba:w-4" />
            <span>Automated report from EveryAI</span>
          </div>
        }
        badge={<Badge variant={isTaskCompleted ? 'success' : 'info'}>{isTaskCompleted ? 'Completed' : 'New'}</Badge>}
      />

      {/* Main Content */}
      <div className="gba:flex-1 gba:overflow-auto gba:p-6 gba:space-y-6">
        {/* Task Metadata Card */}
        <Card>
          <CardHeader className="gba:pb-3">
            <CardTitle className="gba:text-lg gba:flex gba:items-center gba:gap-2">
              <RefreshCw className="gba:h-5 gba:w-5 gba:text-primary" />
              {taskName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:flex gba:flex-wrap gba:gap-4 gba:text-sm gba:text-muted-foreground">
              {formattedScheduledAt && (
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Calendar className="gba:h-4 gba:w-4" />
                  <span>Executed: {formattedScheduledAt}</span>
                </div>
              )}
              {scheduledTaskId && (
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Clock className="gba:h-4 gba:w-4" />
                  <span>Task ID: {scheduledTaskId.slice(0, 8)}...</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results Card */}
        <Card>
          <CardHeader className="gba:pb-3">
            <CardTitle className="gba:text-lg">Results</CardTitle>
          </CardHeader>
          <CardContent>
            {message ? (
              <MarkdownRenderer content={message} accessToken={accessToken} />
            ) : (
              <p className="gba:text-muted-foreground gba:italic">No results available for this scheduled task.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer with actions */}
      {!isTaskCompleted && (
        <TaskDetailFooter>
          <Button variant="default" onClick={handleComplete} disabled={isCompleting} className="gba:gap-2">
            {isCompleting ? <Spinner className="gba:h-4 gba:w-4" /> : <CheckCircle className="gba:h-4 gba:w-4" />}
            {isCompleting ? 'Acknowledging...' : 'Acknowledge'}
          </Button>
        </TaskDetailFooter>
      )}
    </TaskFormLayout>
  )
}

/**
 * Main export with error boundary wrapper
 */
export const ScheduledTaskResult: React.FC<ScheduledTaskResultProps> = props => {
  return <ScheduledTaskResultContent {...props} />
}

export default ScheduledTaskResult
