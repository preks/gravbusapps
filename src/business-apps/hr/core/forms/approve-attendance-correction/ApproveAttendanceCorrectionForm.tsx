import React, { useState } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { TaskDetailHeader } from '@/business-apps/core/every/apps/every-box/components/TaskDetailHeader'
import { TaskDetailFooter } from '@/business-apps/core/every/apps/every-box/components/TaskDetailFooter'
import { TaskFormLayout } from '@/business-apps/core/every/apps/every-box/components/TaskFormLayout'
import attendanceCorrectionTranslations from './_i18n'
import { useTranslation } from '@newwork/nw-design-system'
import dayjs from 'dayjs'
import 'dayjs/locale/de'
import 'dayjs/locale/ro'
import 'dayjs/locale/en'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import utc from 'dayjs/plugin/utc'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

dayjs.extend(localizedFormat)
dayjs.extend(utc)

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
  const { t } = useTranslation(attendanceCorrectionTranslations)

  // Extract task metadata
  const taskPayload = additionalData?.psi_taskPayload || {}
  const processMetadata = additionalData?.psi_processMetadata || {}
  const taskStatus = additionalData?.psi_taskStatus || processMetadata?.status || 'IN_PROGRESS'
  const taskCompletedAt = processMetadata?.completedAt || extendedAdditionalData?.psi_taskCompletedAt
  const isTaskCompleted = taskStatus === 'COMPLETED' || !!taskCompletedAt
  const taskTitle = processMetadata?.referenceTaskName || processMetadata?.nodeName || t('correction-review-entry')
  const creatorName = taskPayload?.creatorName as string | undefined
  const approveLabel = t('grant-bonus-review-acknowledge')
  const cancelLabel = t('grant-bonus-review-reject')

  console.log(additionalData, 'additionalData')

  // Fetch employee and catalog data

  // Detect if we're in every-box context
  const isEveryBoxContext = !!onClose

  // Extract correction details
  const correction = (taskPayload as any)?.employeeAttendanceCorrectionRequest as Record<string, unknown> | undefined
  const locale = getCurrentActiveUserLocale?.() || 'en'

  const formatDate = (value?: string) => {
    if (!value) return '-'
    return dayjs(value).locale(locale).format('MMM D, YYYY')
  }

  const formatTime = (value?: string) => {
    if (!value) return '-'
    // Times are stored as UTC (created via Date.UTC in the creator form).
    // Display them as-entered (no local timezone shift) by formatting in UTC.
    return dayjs.utc(value).locale(locale).format('LT')
  }

  const attendanceDate = (correction?.attendanceDate as string) || undefined
  const startTime = (correction?.startTime as string) || undefined
  const endTime = (correction?.endTime as string) || undefined
  const notes = (correction?.notes as string) || (correction?.correctionDescription as string) || ''

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

  const handleReject = async () => {
    setIsAcknowledging(true)
    try {
      dispatchProcessContinueEvent('pse_cancel', {
        event: 'pse_cancel'
      })
    } catch (err) {
      console.error('Error rejecting relationship change:', err)
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
            data-testid="approve-attendance-correction-actions"
            actions={[
              {
                label: approveLabel,
                onClick: handleAcknowledge,
                variant: 'default' as const,
                disabled: isAcknowledging,
                loading: isAcknowledging,
                icon: CheckCircle,
                className: 'gba:bg-success gba:text-success-foreground hover:gba:bg-success/90',
                testId: 'acknowledge-button'
              },
              {
                label: cancelLabel,
                onClick: handleReject,
                variant: 'default' as const,
                disabled: isAcknowledging,
                loading: isAcknowledging,
                icon: XCircle,
                className: 'gba:bg-success gba:text-success-foreground hover:gba:bg-success/90',
                testId: 'acknowledge-button'
              }
            ]}
          />
        ) : undefined
      }
      contentClassName="gba:space-y-4"
    >
      <div
        className="gba:bg-card gba:text-card-foreground gba:rounded-md gba:p-6"
        data-testid="attendance-correction-details"
      >
        <div className="gba:text-lg gba:font-semibold gba:mb-4">{t('correction-request-details')}</div>

        <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-x-8 gba:gap-y-4">
          <div className="gba:flex gba:flex-col" data-testid="attendance-correction-date">
            <span className="gba:text-muted-foreground">{t('correction-date')}</span>
            <span className="gba:font-medium">{formatDate(attendanceDate)}</span>
          </div>
          <div className="gba:flex gba:flex-col" data-testid="attendance-correction-start-time">
            <span className="gba:text-muted-foreground">{t('correction-start')}</span>
            <span className="gba:font-medium">{formatTime(startTime)}</span>
          </div>
          <div className="gba:flex gba:flex-col" data-testid="attendance-correction-end-time">
            <span className="gba:text-muted-foreground">{t('correction-end')}</span>
            <span className="gba:font-medium">{formatTime(endTime)}</span>
          </div>
          <div className="md:gba:col-span-2 gba:flex gba:flex-col" data-testid="attendance-correction-notes">
            <span className="gba:text-muted-foreground">{t('correction-notes')}</span>
            <span className="gba:font-medium">{notes || '-'}</span>
          </div>
        </div>
      </div>
    </TaskFormLayout>
  )
}

export default ApproveAttendanceCorrection
