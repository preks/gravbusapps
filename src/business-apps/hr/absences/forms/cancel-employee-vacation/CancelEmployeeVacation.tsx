/**
 * CancelEmployeeVacation Component
 * Manager task form for confirming cancellation of an APPROVED vacation request.
 *
 * The BE requires { approval: "CANCELLED", approvalNote, event: "pse_submit" }
 * to be submitted via the Kogito task endpoint when the manager confirms cancellation.
 */

import React, { useState, useMemo } from 'react'
import { Separator, Spinner, Alert, Textarea, Label, Switch, useTranslation } from '@newwork/nw-design-system'
import { XCircle, MessageSquare } from 'lucide-react'
import dayjs from 'dayjs'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { env } from '@/common/env/EnvUtils'
import { useVacationApprovalData } from '../approve-employee-vacation/hooks/useVacationApprovalData'
import { TaskDetailHeader } from '@/business-apps/core/every/apps/every-box/components/TaskDetailHeader'
import { TaskDetailFooter } from '@/business-apps/core/every/apps/every-box/components/TaskDetailFooter'
import { TaskFormLayout } from '@/business-apps/core/every/apps/every-box/components/TaskFormLayout'
import { formatWorkingDaysAndHours } from '@/business-apps/hr/absences/utils/absenceDurationFormatter'
import type { CancelEmployeeAbsenceSnapshot } from '@/business-apps/hr/absences/utils/cancelEmployeeAbsence'
import { resolveAbsenceCancellationTitleInfo } from '@/business-apps/hr/absences/utils/absenceCancellationTitle'
import translations from './_i18n'

interface CancelEmployeeVacationProps extends BusinessAppContextProps {
  onClose?: () => void
  onTaskUpdated?: () => void
}

const extractEndpoint = (processMetadata: any, extendedAdditionalData: any): string | null => {
  return (
    processMetadata?.endpoint ||
    extendedAdditionalData?.psi_taskPayload?.endpoint ||
    extendedAdditionalData?.endpoint ||
    null
  )
}

const extractUserIdFromToken = (accessToken: string): string => {
  try {
    const parts = accessToken.split('.')
    if (parts.length === 3) {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
      return (JSON.parse(atob(padded)).sub as string) || ''
    }
  } catch {
    // Ignore token parsing errors
  }
  return ''
}

const buildCompletionEndpoint = (endpoint: string, userId: string): string => {
  const kogitoBaseUrl = env('NEXT_PUBLIC_BASE_URL')

  if (!kogitoBaseUrl || typeof kogitoBaseUrl !== 'string') {
    throw new Error('NEXT_PUBLIC_BASE_URL is not defined or invalid')
  }

  let completionEndpoint = ''

  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    try {
      const parsedUrl = new URL(endpoint)
      completionEndpoint = parsedUrl.pathname
    } catch {
      completionEndpoint = endpoint.replace(/^https?:\/\/[^/]+/, '')
    }
  } else {
    completionEndpoint = endpoint
  }

  if (!completionEndpoint.startsWith('/')) {
    completionEndpoint = `/${completionEndpoint}`
  }

  completionEndpoint = `${kogitoBaseUrl}${completionEndpoint}`
  const userParam = userId ? `&user=${userId}` : ''
  return `${completionEndpoint}?phase=complete${userParam}`
}

interface TaskPayload {
  employeeAbsence?: CancelEmployeeAbsenceSnapshot
  creatorName?: string
  requester?: { id?: string }
  creatorId?: string
}

interface CancellationPayload {
  event: string
  approval: 'CANCELLED'
  approvalNote: string
}

const buildCancellationPayload = (note: string): CancellationPayload => ({
  event: 'pse_submit',
  approval: 'CANCELLED',
  approvalNote: note
})

const submitCancellation = async (endpoint: string, accessToken: string, note: string): Promise<void> => {
  const userId = extractUserIdFromToken(accessToken)
  const fullUrl = buildCompletionEndpoint(endpoint, userId)
  const payload = buildCancellationPayload(note)

  const response = await fetch(fullUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`HTTP ${response.status}: ${errorText}`)
  }

  globalThis.dispatchEvent(
    new CustomEvent('com.newwork.process.processCompletion', {
      detail: { resolution: 'success' }
    })
  )
}

const CancelEmployeeVacation: React.FC<CancelEmployeeVacationProps> = ({
  accessToken,
  additionalData,
  onClose,
  onTaskUpdated
}) => {
  const { t } = useTranslation(translations)

  const [isCancelling, setIsCancelling] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showNote, setShowNote] = useState(false)
  const [note, setNote] = useState('')

  const taskPayload = (additionalData?.psi_taskPayload || {}) as TaskPayload
  const employeeAbsence = taskPayload?.employeeAbsence
  const creatorName = taskPayload?.creatorName as string | undefined
  const processMetadata = additionalData?.psi_processMetadata || {}

  const taskStatus = additionalData?.psi_taskStatus || processMetadata?.status || 'IN_PROGRESS'
  const isTaskCompleted = taskStatus === 'COMPLETED'

  const {
    employeeData,
    substituteEmployeeName,
    absenceTypeName,
    isLoadingSubstitute,
    error: dataError
  } = useVacationApprovalData({
    accessToken,
    employeeId: employeeAbsence?.employeeId ?? undefined,
    substituteEmployeeId: employeeAbsence?.substituteEmployee ?? undefined,
    absenceTypeRef: employeeAbsence?.typeRef
  })

  const cancellationTaskTitle = useMemo(() => {
    const titleInfo = resolveAbsenceCancellationTitleInfo(employeeAbsence?.typeRef, absenceTypeName)

    if (!titleInfo) {
      return t('task-title-cancel-vacation')
    }
    if (titleInfo.variant === 'vacation') {
      return t('task-title-cancel-vacation')
    }
    if (titleInfo.variant === 'sickLeave') {
      return t('task-title-cancel-sick-leave')
    }
    if (titleInfo.variant === 'specialLeave') {
      return t('task-title-cancel-special-leave')
    }
    if (titleInfo.variant === 'requestForType' && titleInfo.absenceTypeName) {
      return t('task-title-cancel-request-for-type', { absenceType: titleInfo.absenceTypeName })
    }

    return t('task-title-cancel-vacation')
  }, [employeeAbsence?.typeRef, absenceTypeName, t])

  const requesterUserId = taskPayload?.requester?.id || taskPayload?.creatorId || employeeData?.userId
  const requesterName =
    creatorName ||
    employeeData?.displayName ||
    `${employeeData?.firstName || ''} ${employeeData?.lastName || ''}`.trim()

  const chatWithRequester = useMemo(() => {
    if (!requesterUserId || !employeeAbsence?.startDate || !employeeAbsence?.endDate || isTaskCompleted) {
      return undefined
    }

    const startDate = dayjs(employeeAbsence.startDate).format('MMM D')
    const endDate = dayjs(employeeAbsence.endDate).format('MMM D, YYYY')

    return {
      requesterId: requesterUserId,
      requesterName,
      prefilledMessage: t('chat-prefilled-message', {
        requesterName: requesterName || t('chat-fallback-name'),
        startDate,
        endDate
      }),
      taskContext: {
        taskType: 'vacation-cancellation',
        absenceId: employeeAbsence.id,
        startDate: employeeAbsence.startDate,
        endDate: employeeAbsence.endDate
      }
    }
  }, [isTaskCompleted, requesterUserId, requesterName, employeeAbsence, t])

  const handleConfirmCancellation = async () => {
    setIsCancelling(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const endpoint = extractEndpoint(processMetadata, additionalData)

      if (!endpoint) {
        dispatchProcessContinueEvent('pse_submit', buildCancellationPayload(note))
        setSuccessMessage(t('success-vacation-cancelled'))
        setTimeout(() => {
          onClose?.()
          onTaskUpdated?.()
        }, 1500)
        return
      }

      await submitCancellation(endpoint, accessToken, note)
      setSuccessMessage(t('success-vacation-cancelled'))

      setTimeout(() => {
        onClose?.()
        onTaskUpdated?.()
      }, 1500)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : t('error-failed-to-cancel')
      setErrorMessage(`${t('error-failed-to-cancel')}: ${errorMsg}`)
    } finally {
      setIsCancelling(false)
    }
  }

  const handleClose = () => {
    if (onClose) {
      onClose()
    } else {
      dispatchProcessContinueEvent('pse_abort', { event: 'pse_abort' })
    }
  }

  const isEveryBoxContext = !!onClose

  return (
    <TaskFormLayout
      data-testid="cancel-employee-vacation"
      header={
        <TaskDetailHeader
          title={cancellationTaskTitle}
          showEmployeeInfo={true}
          employeeId={employeeAbsence?.employeeId}
          accessToken={accessToken}
          creatorName={creatorName}
          chatWithRequester={chatWithRequester}
          onClose={isEveryBoxContext ? handleClose : undefined}
        />
      }
      footer={
        isTaskCompleted ? undefined : (
          <TaskDetailFooter
            data-testid="action-footer"
            actions={[
              {
                label: t('action-confirm-cancellation'),
                onClick: handleConfirmCancellation,
                variant: 'destructive' as const,
                disabled: isCancelling || !!successMessage,
                loading: isCancelling,
                icon: XCircle,
                testId: 'confirm-cancellation-button'
              }
            ]}
          />
        )
      }
      contentClassName="gba:space-y-6"
    >
      {errorMessage && (
        <Alert variant="destructive" data-testid="error-message">
          {errorMessage}
        </Alert>
      )}
      {dataError && (
        <Alert variant="destructive" data-testid="data-error-message">
          {dataError}
        </Alert>
      )}
      {successMessage && <Alert data-testid="success-message">{successMessage}</Alert>}

      {employeeAbsence && typeof employeeAbsence === 'object' && (
        <>
          <div data-testid="vacation-details-section">
            <h4 className="gba:font-semibold gba:mb-4 gba:text-lg">{t('section-vacation-request-details')}</h4>
            <div className="gba:bg-muted gba:p-4 gba:rounded-lg gba:space-y-3">
              {absenceTypeName && (
                <div className="gba:flex gba:items-start gba:gap-3">
                  <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                    {t('label-type')}:
                  </span>
                  <span className="gba:text-sm gba:flex-1">{absenceTypeName}</span>
                </div>
              )}

              {employeeAbsence.startDate && employeeAbsence.endDate && (
                <div className="gba:flex gba:items-start gba:gap-3">
                  <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                    {t('label-duration')}:
                  </span>
                  <span className="gba:text-sm gba:flex-1">
                    {(() => {
                      const start = dayjs(employeeAbsence.startDate)
                      const end = dayjs(employeeAbsence.endDate)
                      return start.isSame(end, 'day')
                        ? start.format('MMM D, YYYY')
                        : `${start.format('MMM D, YYYY')} → ${end.format('MMM D, YYYY')}`
                    })()}
                  </span>
                </div>
              )}

              {(employeeAbsence.workingDays !== undefined || employeeAbsence.workingHours !== undefined) && (
                <div className="gba:flex gba:items-start gba:gap-3">
                  <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                    {t('label-working-days')}:
                  </span>
                  <span className="gba:text-sm gba:flex-1">
                    {formatWorkingDaysAndHours(
                      employeeAbsence.workingDays ?? undefined,
                      employeeAbsence.workingHours ?? undefined,
                      t
                    )}
                  </span>
                </div>
              )}

              {employeeAbsence.substituteEmployee && (
                <div className="gba:flex gba:items-start gba:gap-3">
                  <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                    {t('label-substitute')}:
                  </span>
                  <span className="gba:text-sm gba:flex-1 gba:text-muted-foreground">
                    {isLoadingSubstitute ? <Spinner size="sm" /> : substituteEmployeeName || t('loading')}
                  </span>
                </div>
              )}

              {employeeAbsence.description?.trim() && (
                <div className="gba:flex gba:items-start gba:gap-3">
                  <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                    {t('label-description')}:
                  </span>
                  <span className="gba:text-sm gba:flex-1 gba:text-muted-foreground gba:whitespace-pre-wrap">
                    {employeeAbsence.description.trim()}
                  </span>
                </div>
              )}
            </div>
          </div>
          <Separator />
        </>
      )}

      {!isTaskCompleted && (
        <>
          <div data-testid="cancellation-warning-section">
            <Alert variant="destructive">
              <XCircle className="gba:h-4 gba:w-4" />
              <p className="gba:text-sm">{t('warning-cancellation-irreversible')}</p>
            </Alert>
          </div>

          <div data-testid="note-section">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
              <MessageSquare className="gba:h-4 gba:w-4" />
              <Label htmlFor="cancellation-note" className="gba:text-sm gba:font-medium">
                {t('note-label')}
              </Label>
              <Switch
                id="cancellation-note"
                checked={showNote}
                onCheckedChange={checked => {
                  setShowNote(checked)
                  if (!checked) setNote('')
                }}
                data-testid="note-toggle"
              />
            </div>
            {showNote && (
              <Textarea
                rows={3}
                placeholder={t('note-placeholder')}
                value={note}
                onChange={e => setNote(e.target.value)}
                maxLength={500}
                className="gba:w-full"
                data-testid="cancellation-note-input"
              />
            )}
          </div>
        </>
      )}
    </TaskFormLayout>
  )
}

export default CancelEmployeeVacation
