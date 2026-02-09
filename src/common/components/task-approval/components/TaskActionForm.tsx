/**
 * TaskActionForm Component
 * Unified form for completing or approving tasks in IRM/CRM
 * Automatically detects task type (approval vs completion) and shows appropriate actions
 */

import React, { useState } from 'react'
import { Alert, useTranslation } from '@newwork/nw-design-system'
import { ThumbsUp, XCircle, CheckCircle, AlertCircle } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { TaskDetailHeader } from '@/business-apps/core/every/apps/every-box/components/TaskDetailHeader'
import { TaskDetailFooter } from '@/business-apps/core/every/apps/every-box/components/TaskDetailFooter'
import { TaskFormLayout } from '@/business-apps/core/every/apps/every-box/components/TaskFormLayout'
import { useTaskApprovalData } from '../hooks/useTaskApprovalData'
import { TaskDetailsDisplay } from './TaskDetailsDisplay'
import translations from '../_i18n'

interface TaskActionFormProps extends BusinessAppContextProps {
  moduleType: 'irm' | 'crm'
  onClose?: () => void
  onTaskUpdated?: () => void
}

export const TaskActionForm: React.FC<TaskActionFormProps> = ({
  moduleType,
  accessToken,
  additionalData,
  onClose,
  onTaskUpdated
}) => {
  const { t } = useTranslation(translations)
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const { taskData, isLoading, error, isTaskCompleted, processMetadata } = useTaskApprovalData({
    accessToken,
    additionalData,
    moduleType
  })

  // Determine if this is an approval task based on taskTypeRef
  const isApprovalTask = taskData.taskTypeRef?.toUpperCase().includes('APPROVAL')

  const getDefaultTaskTitle = () => {
    if (isApprovalTask) {
      return moduleType === 'irm' ? t('task-type-approve-investment') : t('task-type-approve-customer')
    }
    return moduleType === 'irm' ? t('task-type-complete-investment') : t('task-type-complete-customer')
  }

  const taskTitle = processMetadata?.referenceTaskName || processMetadata?.nodeName || getDefaultTaskTitle()

  const taskPayload = additionalData?.psi_taskPayload || {}
  const approvalStatus = processMetadata?.outputs?.approval || taskPayload?.approval
  const approvalNote = processMetadata?.outputs?.approvalNote || taskPayload?.approvalNote

  const handleComplete = async () => {
    if (isTaskCompleted) return

    setIsCompleting(true)
    setErrorMessage(null)

    try {
      const payload = {
        approval: 'completed'
      }

      dispatchProcessContinueEvent('pse_submit', payload)
      onTaskUpdated?.()
    } catch (error) {
      console.error('Error completing task:', error)
      setErrorMessage(error instanceof Error ? error.message : t('task-action-error-complete-task'))
      setIsCompleting(false)
    }
  }

  const handleApprove = async () => {
    if (isTaskCompleted) return

    setIsApproving(true)
    setErrorMessage(null)

    try {
      const payload = {
        approval: 'approved'
      }

      dispatchProcessContinueEvent('pse_submit', payload)
      onTaskUpdated?.()
    } catch (error) {
      console.error('Error approving task:', error)
      setErrorMessage(error instanceof Error ? error.message : t('task-action-error-approve'))
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    if (isTaskCompleted) return

    setIsRejecting(true)
    setErrorMessage(null)

    try {
      const payload = {
        approval: 'rejected'
      }

      dispatchProcessContinueEvent('pse_submit', payload)
      onTaskUpdated?.()
    } catch (error) {
      console.error('Error rejecting task:', error)
      setErrorMessage(error instanceof Error ? error.message : t('task-action-error-reject'))
      setIsRejecting(false)
    }
  }

  const handleCancel = () => {
    if (onClose) onClose()
  }

  const isEveryBoxContext = !!onClose
  const isBusy = isCompleting || isApproving || isRejecting

  // Loading state
  if (isLoading) {
    return (
      <TaskFormLayout
        data-testid={`${moduleType}-task-action-form-loading`}
        header={
          <TaskDetailHeader
            title={taskTitle}
            showEmployeeInfo={false}
            accessToken={accessToken}
            onClose={isEveryBoxContext ? handleCancel : undefined}
          />
        }
        contentClassName="gba:space-y-6"
      >
        <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
          <div className="gba:text-muted-foreground">{t('task-action-loading')}</div>
        </div>
      </TaskFormLayout>
    )
  }

  // Error state
  if (error) {
    return (
      <TaskFormLayout
        data-testid={`${moduleType}-task-action-form-error`}
        header={
          <TaskDetailHeader
            title={taskTitle}
            showEmployeeInfo={false}
            accessToken={accessToken}
            onClose={isEveryBoxContext ? handleCancel : undefined}
          />
        }
        contentClassName="gba:space-y-6"
      >
        <Alert variant="destructive">
          <AlertCircle className="gba:h-4 gba:w-4" />
          <div>{error}</div>
        </Alert>
      </TaskFormLayout>
    )
  }

  // Completed state (read-only)
  if (isTaskCompleted) {
    const wasApproved = isApprovalTask && approvalStatus === 'APPROVED'
    const wasRejected = isApprovalTask && approvalStatus === 'REJECTED'

    const getCompletedMessage = () => {
      if (isApprovalTask) {
        return wasApproved ? t('task-action-completed-approved') : t('task-action-completed-rejected')
      }
      return t('task-action-completed-finished')
    }

    return (
      <TaskFormLayout
        data-testid={`${moduleType}-task-action-form-completed`}
        header={
          <TaskDetailHeader
            title={taskTitle}
            showEmployeeInfo={false}
            creatorName={taskData.creatorName}
            accessToken={accessToken}
            onClose={isEveryBoxContext ? handleCancel : undefined}
          />
        }
        contentClassName="gba:space-y-6"
      >
        <Alert variant={wasRejected ? 'destructive' : 'success'}>
          {wasRejected ? <XCircle className="gba:h-4 gba:w-4" /> : <CheckCircle className="gba:h-4 gba:w-4" />}
          <div>{getCompletedMessage()}</div>
        </Alert>

        <TaskDetailsDisplay taskData={taskData} moduleType={moduleType} accessToken={context.accessToken} />

        {(taskPayload?.comment || approvalNote) && (
          <div>
            <span className="gba:text-sm gba:font-medium gba:text-muted-foreground">
              {isApprovalTask ? t('task-action-approval-note-label') : t('task-action-completion-note-label')}:
            </span>
            <div className="gba:text-sm gba:mt-1 gba:p-3 gba:bg-muted gba:rounded-md">
              {approvalNote || taskPayload?.comment}
            </div>
          </div>
        )}
      </TaskFormLayout>
    )
  }

  // Active form
  return (
    <TaskFormLayout
      data-testid={`${moduleType}-task-action-form-active`}
      header={
        <TaskDetailHeader
          title={taskTitle}
          showEmployeeInfo={false}
          creatorName={taskData.creatorName}
          accessToken={accessToken}
          onClose={isEveryBoxContext ? handleCancel : undefined}
        />
      }
      footer={
        isApprovalTask ? (
          <TaskDetailFooter
            data-testid={`${moduleType}-task-approval-footer`}
            actions={[
              {
                label: t('action-button-reject'),
                onClick: handleReject,
                variant: 'destructive',
                disabled: isBusy,
                loading: isRejecting,
                icon: XCircle,
                testId: `${moduleType}-task-reject-button`
              },
              {
                label: t('action-button-approve'),
                onClick: handleApprove,
                variant: 'default',
                disabled: isBusy,
                loading: isApproving,
                icon: ThumbsUp,
                className: 'gba:bg-success gba:text-success-foreground hover:gba:bg-success/90',
                testId: `${moduleType}-task-approve-button`
              }
            ]}
          />
        ) : (
          <TaskDetailFooter
            data-testid={`${moduleType}-task-complete-footer`}
            actions={[
              {
                label: t('action-button-cancel'),
                onClick: handleCancel,
                variant: 'outline',
                disabled: isBusy,
                testId: `${moduleType}-task-cancel-button`
              },
              {
                label: t('action-button-complete-task'),
                onClick: handleComplete,
                variant: 'default',
                disabled: isBusy,
                loading: isCompleting,
                icon: CheckCircle,
                testId: `${moduleType}-task-complete-button`
              }
            ]}
          />
        )
      }
      contentClassName="gba:space-y-6"
    >
      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="gba:h-4 gba:w-4" />
          <div>{errorMessage}</div>
        </Alert>
      )}

      <TaskDetailsDisplay taskData={taskData} moduleType={moduleType} accessToken={context.accessToken} />
    </TaskFormLayout>
  )
}
