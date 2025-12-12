import React, { useEffect, useMemo, useState } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { TaskDetailHeader } from '@/business-apps/core/every/apps/every-box/components/TaskDetailHeader'
import { TaskDetailFooter } from '@/business-apps/core/every/apps/every-box/components/TaskDetailFooter'
import { TaskFormLayout } from '@/business-apps/core/every/apps/every-box/components/TaskFormLayout'
import attendanceCorrectionTranslations from './_i18n'
import { Badge, Icon, useTranslation } from '@newwork/nw-design-system'
import dayjs from 'dayjs'
import 'dayjs/locale/de'
import 'dayjs/locale/ro'
import 'dayjs/locale/en'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import utc from 'dayjs/plugin/utc'
import { getCurrentActiveUserLocale, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { ArrowRight } from '@phosphor-icons/react'
import { employeeAttendanceByIdQuery } from '@/business-apps/hr/core/apps/employee-record/queries/attendanceQueries'

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

export const ApproveAttendanceCorrection: React.FC<ChangeRelationshipReviewProps> = ({
  additionalData,
  onClose,
  accessToken
}) => {
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

  // Fetch employee and catalog data

  // Detect if we're in every-box context
  const isEveryBoxContext = !!onClose

  // Extract correction details
  const correction = taskPayload?.employeeAttendanceCorrectionRequest as Record<string, unknown> | undefined
  const locale = getCurrentActiveUserLocale?.() || 'en'
  const graphqlClient = useGraphQLClient(accessToken)

  // Original attendance (to compare against correction)
  const [original, setOriginal] = useState<{
    attendanceDate?: string
    startTime?: string
    endTime?: string
    notes?: string
  } | null>(null)

  const formatDate = (value?: string) => {
    if (!value) return '-'
    return dayjs(value).locale(locale).format('MMM D, YYYY')
  }

  const formatTime = (value?: string) => {
    if (!value) return '-'
    // Times are stored in UTC. Convert to LOCAL time and display using localized format.
    return dayjs.utc(value).local().locale(locale).format('LT')
  }

  const attendanceDate = (correction?.attendanceDate as string) || undefined
  const startTime = (correction?.startTime as string) || undefined
  const endTime = (correction?.endTime as string) || undefined
  const notes = (correction?.notes as string) || (correction?.correctionDescription as string) || ''
  const attendanceId = (correction?.employeeAttendance as string) || undefined

  useEffect(() => {
    let cancelled = false
    const loadOriginal = async () => {
      if (!attendanceId || !graphqlClient) return
      try {
        const res = await graphqlClient.request<any>(employeeAttendanceByIdQuery, { id: attendanceId })
        const row = res?.EmployeeAttendance?.[0]
        if (!cancelled && row) {
          setOriginal({
            attendanceDate: String(row.attendanceDate),
            startTime: row.startTime ? String(row.startTime) : undefined,
            endTime: row.endTime ? String(row.endTime) : undefined,
            notes: row.notes ? String(row.notes) : undefined
          })
        }
      } catch {
        if (!cancelled) setOriginal(null)
      }
    }
    loadOriginal()
    return () => {
      cancelled = true
    }
  }, [attendanceId, graphqlClient])

  const hasStartChange = useMemo(() => {
    return Boolean((original?.startTime || '') !== (startTime || ''))
  }, [original?.startTime, startTime])
  const hasEndChange = useMemo(() => {
    return Boolean((original?.endTime || '') !== (endTime || ''))
  }, [original?.endTime, endTime])
  const hasNotesChange = useMemo(() => {
    return Boolean((original?.notes || '') !== (notes || ''))
  }, [original?.notes, notes])

  const handleClose = () => {
    if (onClose) {
      onClose()
    } else {
      dispatchProcessContinueEvent('pse_abort', {
        employeeAttendance: correction?.employeeAttendance,
        event: 'pse_abort'
      })
    }
  }

  const handleAcknowledge = async () => {
    setIsAcknowledging(true)
    try {
      dispatchProcessContinueEvent('pse_submit', {
        employeeAttendance: correction?.employeeAttendance,
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
      dispatchProcessContinueEvent('pse_discard', {
        event: 'pse_discard'
      })
    } catch (err) {
      console.error('Error rejecting relationship change:', err)
    } finally {
      setIsAcknowledging(false)
    }
  }

  return (
    <TaskFormLayout
      data-testid="approve-attendance-correction-container"
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
                className: 'gba:bg-destructive gba:text-destructive-foreground hover:gba:bg-destructive/90',
                testId: 'reject-button'
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
        <div className="gba:text-lg gba:font-semibold gba:mb-4">{t('correction-review-details')}</div>

        <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-x-8 gba:gap-y-4">
          <div className="gba:flex gba:flex-col" data-testid="attendance-correction-date">
            <span className="gba:text-muted-foreground">{t('correction-date')}</span>
            <span className="gba:font-medium">{formatDate(attendanceDate)}</span>
          </div>

          {/* Start time diff */}
          <div className="gba:flex gba:flex-col" data-testid="attendance-correction-start-time">
            <div className="gba:flex gba:items-center gba:gap-2">
              <span className="gba:text-muted-foreground">{t('correction-start')}</span>
              {hasStartChange && (
                <Badge variant="warning">{getTranslationFromI18nKeyAndLabel('common.changed', 'Changed')}</Badge>
              )}
            </div>
            {hasStartChange ? (
              <div className="gba:flex gba:items-center gba:gap-3" data-testid="aac-diff-start">
                <span className="gba:px-3 gba:py-1 gba:rounded-md gba:bg-destructive-secondary gba:text-destructive-secondary-foreground gba:line-through">
                  {formatTime(original?.startTime)}
                </span>
                <Icon icon={ArrowRight} className="gba:text-muted-foreground" />
                <span className="gba:px-3 gba:py-1 gba:rounded-md gba:bg-success gba:text-success-foreground">
                  {formatTime(startTime)}
                </span>
              </div>
            ) : (
              <span className="gba:font-medium">{formatTime(startTime) || formatTime(original?.startTime)}</span>
            )}
          </div>

          {/* End time diff */}
          <div className="gba:flex gba:flex-col" data-testid="attendance-correction-end-time">
            <div className="gba:flex gba:items-center gba:gap-2">
              <span className="gba:text-muted-foreground">{t('correction-end')}</span>
              {hasEndChange && (
                <Badge variant="warning">{getTranslationFromI18nKeyAndLabel('common.changed', 'Changed')}</Badge>
              )}
            </div>
            {hasEndChange ? (
              <div className="gba:flex gba:items-center gba:gap-3" data-testid="aac-diff-end">
                <span className="gba:px-3 gba:py-1 gba:rounded-md gba:bg-destructive-secondary gba:text-destructive-secondary-foreground gba:line-through">
                  {formatTime(original?.endTime)}
                </span>
                <Icon icon={ArrowRight} className="gba:text-muted-foreground" />
                <span className="gba:px-3 gba:py-1 gba:rounded-md gba:bg-success gba:text-success-foreground">
                  {formatTime(endTime)}
                </span>
              </div>
            ) : (
              <span className="gba:font-medium">{formatTime(endTime) || formatTime(original?.endTime)}</span>
            )}
          </div>

          {/* Notes diff */}
          <div className="md:gba:col-span-2 gba:flex gba:flex-col" data-testid="attendance-correction-notes">
            <div className="gba:flex gba:items-center gba:gap-2">
              <span className="gba:text-muted-foreground">{t('correction-notes')}</span>
              {hasNotesChange && (
                <Badge variant="warning">{getTranslationFromI18nKeyAndLabel('common.changed', 'Changed')}</Badge>
              )}
            </div>
            {hasNotesChange ? (
              <div className="gba:flex gba:items-center gba:gap-3" data-testid="aac-diff-notes">
                <span className="gba:px-3 gba:py-1 gba:rounded-md gba:bg-destructive-secondary gba:text-destructive-secondary-foreground gba:line-through">
                  {original?.notes || '-'}
                </span>
                <Icon icon={ArrowRight} className="gba:text-muted-foreground" />
                <span className="gba:px-3 gba:py-1 gba:rounded-md gba:bg-success gba:text-success-foreground">
                  {notes || '-'}
                </span>
              </div>
            ) : (
              <span className="gba:font-medium">{notes || original?.notes || '-'}</span>
            )}
          </div>
        </div>
      </div>
    </TaskFormLayout>
  )
}

export default ApproveAttendanceCorrection
