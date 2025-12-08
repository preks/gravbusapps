import React, { useState } from 'react'
import { CheckCircle } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { TaskDetailHeader } from '@/business-apps/core/every/apps/every-box/components/TaskDetailHeader'
import { TaskDetailFooter } from '@/business-apps/core/every/apps/every-box/components/TaskDetailFooter'
import { TaskFormLayout } from '@/business-apps/core/every/apps/every-box/components/TaskFormLayout'

interface ExtendedAdditionalData {
  [k: string]: unknown
  psi_taskCompletedAt?: string
  psi_taskPayload?: {
    [k: string]: unknown
  }
  psi_processMetadata?: {
    [k: string]: unknown
  }
  psi_taskStatus?: string
}

interface ChangeRelationshipReviewProps extends BusinessAppContextProps {
  onClose?: () => void
}

export const ApproveAttendanceCorrection: React.FC<ChangeRelationshipReviewProps> = ({ additionalData, onClose }) => {
  // Cast additionalData to extended interface for proper typing
  const extendedAdditionalData = additionalData as ExtendedAdditionalData | undefined

  const [isAcknowledging, setIsAcknowledging] = useState(false)

  // Extract task metadata
  const taskPayload = additionalData?.psi_taskPayload || {}
  const processMetadata = additionalData?.psi_processMetadata || {}
  const taskStatus = additionalData?.psi_taskStatus || processMetadata?.status || 'IN_PROGRESS'
  const taskCompletedAt = processMetadata?.completedAt || extendedAdditionalData?.psi_taskCompletedAt
  const isTaskCompleted = taskStatus === 'COMPLETED' || !!taskCompletedAt
  const taskTitle = processMetadata?.referenceTaskName || processMetadata?.nodeName || 'Review Relationship Change'
  const creatorName = taskPayload?.creatorName as string | undefined

  // Fetch employee and catalog data

  // Detect if we're in every-box context
  const isEveryBoxContext = !!onClose

  const handleClose = () => {
    if (onClose) {
      onClose()
    } else {
      dispatchProcessContinueEvent('pse_abort', {
        event: 'pse_abort'
      })
    }
  }

  const handleAcknowledge = async () => {
    setIsAcknowledging(true)
    try {
      dispatchProcessContinueEvent('pse_submit', {
        event: 'pse_submit'
      })
    } catch (err) {
      console.error('Error acknowledging relationship change:', err)
    } finally {
      setIsAcknowledging(false)
    }
  }

  return (
    <TaskFormLayout
      data-testid="change-relationship-review-container"
      header={
        <TaskDetailHeader
          title={taskTitle}
          showEmployeeInfo={true}
          creatorName={creatorName}
          onClose={isEveryBoxContext ? handleClose : undefined}
        />
      }
      footer={
        !isTaskCompleted ? (
          <TaskDetailFooter
            data-testid="change-relationship-review-actions"
            actions={[
              {
                label: 'Acknowledge',
                onClick: handleAcknowledge,
                variant: 'default' as const,
                disabled: isAcknowledging,
                loading: isAcknowledging,
                icon: CheckCircle,
                className: 'gba:bg-success gba:text-success-foreground hover:gba:bg-success/90',
                testId: 'acknowledge-button'
              }
            ]}
          />
        ) : undefined
      }
      contentClassName="gba:space-y-4"
    >
      Approve Attendance Correction
    </TaskFormLayout>
  )
}

export default ApproveAttendanceCorrection
