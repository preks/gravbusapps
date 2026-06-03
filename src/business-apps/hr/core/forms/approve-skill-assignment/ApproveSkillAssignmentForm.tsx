import React, { useCallback, useState } from 'react'
import { CheckCircleIcon, XCircleIcon, ArrowRightIcon, InfoIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { PROCESSES_BASE_URL } from '@/common/utils/serviceResolver'
import { TaskDetailHeader } from '@/business-apps/core/every/apps/every-box/components/TaskDetailHeader'
import { TaskDetailFooter } from '@/business-apps/core/every/apps/every-box/components/TaskDetailFooter'
import { TaskFormLayout } from '@/business-apps/core/every/apps/every-box/components/TaskFormLayout'
import { Badge, toast, useTranslation } from '@newwork/nw-design-system'
import { useFileClient } from '@/common/network/files/useFileClient'
import { isPreviewableFile } from '@/common/utils/filePreview'
import { DecisionReasonDialog } from '../components/DecisionReasonDialog'
import {
  SkillChange,
  SkillChangeDetailValue,
  SkillChangeDocumentValue,
  useSkillAssignmentDiff
} from './useSkillAssignmentDiff'
import approveSkillAssignmentTranslations from './_i18n/index'

interface SkillPayloadItem {
  id?: string | null
  version?: number | null
  skill: string
  level: number
  validFrom?: string
  validTo?: string | null
  employeeId?: string
}

interface ApproveSkillAssignmentProps extends BusinessAppContextProps {
  onClose?: () => void
}

const temporaryDisabled = true
const temporaryDisabledMessage =
  'This approval form is temporarily disabled because the skill functionality is currently being adjusted.'

function getChangeBadge(change: SkillChange, t: (key: string) => string) {
  switch (change.type) {
    case 'new':
      return <Badge variant="success">{t('approve-skill-assignment-change-new')}</Badge>
    case 'new-to-create':
      return <Badge variant="secondary">{t('approve-skill-assignment-change-to-create')}</Badge>
    case 'modified':
      return <Badge variant="warning">{t('approve-skill-assignment-change-modified')}</Badge>
    case 'deleted':
      return <Badge variant="destructive">{t('approve-skill-assignment-change-deleted')}</Badge>
  }
}

function isDocumentValue(value: SkillChangeDetailValue | undefined): value is SkillChangeDocumentValue {
  return typeof value === 'object' && value !== null && 'type' in value && value.type === 'document'
}

function SkillChangeRow({
  change,
  t,
  onDocumentClick
}: Readonly<{
  change: SkillChange
  t: (key: string) => string
  onDocumentClick: (document: SkillChangeDocumentValue) => void
}>) {
  const isDeleted = change.type === 'deleted'
  const testId = change.skillId ?? change.skillName
  const formatValue = (value?: string | number | null) =>
    value == null || value === '' ? t('approve-skill-assignment-none') : value
  const renderValue = (value: SkillChangeDetailValue | undefined, suffix: string) => {
    if (isDocumentValue(value)) {
      return (
        <button
          type="button"
          className="gba:inline-flex gba:items-center gba:gap-1 gba:text-primary gba:font-medium gba:hover:underline"
          onClick={() => onDocumentClick(value)}
          data-testid={`skill-change-document-${suffix}-${value.id}`}
        >
          {value.name}
        </button>
      )
    }

    return typeof value === 'object' ? t('approve-skill-assignment-none') : formatValue(value)
  }

  return (
    <div
      className="gba:flex gba:items-center gba:justify-between gba:rounded-md gba:border gba:border-border gba:bg-muted/40 gba:px-4 gba:py-3"
      data-testid={`skill-change-row-${testId}`}
    >
      <div className="gba:flex gba:flex-col gba:gap-1">
        <span
          className={`gba:font-medium gba:text-sm${isDeleted ? ' gba:line-through gba:text-muted-foreground' : ''}`}
          data-testid={`skill-change-name-${testId}`}
        >
          {change.skillName}
        </span>

        {change.type === 'modified' &&
          change.details?.map(detail => (
            <span
              key={detail.labelKey}
              className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground"
              data-testid={`skill-change-detail-${detail.labelKey}-${testId}`}
            >
              {t(detail.labelKey)} {renderValue(detail.oldValue, 'old')}
              <ArrowRightIcon size={12} />
              {renderValue(detail.newValue, 'new')}
            </span>
          ))}

        {(change.type === 'new' || change.type === 'new-to-create') && change.newLevel != null && (
          <span className="gba:text-xs gba:text-muted-foreground" data-testid={`skill-change-level-${testId}`}>
            {t('approve-skill-assignment-level')} {change.newLevel}
          </span>
        )}

        {change.type === 'deleted' && change.oldLevel != null && (
          <span
            className="gba:text-xs gba:text-muted-foreground gba:line-through"
            data-testid={`skill-change-level-${testId}`}
          >
            {t('approve-skill-assignment-level')} {change.oldLevel}
          </span>
        )}
      </div>

      {getChangeBadge(change, t)}
    </div>
  )
}

function getVerificationDocumentChange(changes: SkillChange[]) {
  return changes
    .flatMap(change => change.details ?? [])
    .find(detail => detail.labelKey === 'approve-skill-assignment-verification-document')
}

function scheduleDocumentCleanup(accessToken: string, document: SkillChangeDocumentValue): void {
  let cleanupStarted = false

  const runCleanup = () => {
    if (cleanupStarted) return
    cleanupStarted = true
    globalThis.removeEventListener('com.newwork.process.taskCompletion', runCleanup)
    globalThis.removeEventListener('com.newwork.process.processCompletion', runCleanup)

    void deleteEmployeeDocument(accessToken, document).catch(error => {
      console.error('Error cleaning up verification document:', error)
    })
  }

  globalThis.addEventListener('com.newwork.process.taskCompletion', runCleanup, { once: true })
  globalThis.addEventListener('com.newwork.process.processCompletion', runCleanup, { once: true })
  globalThis.setTimeout(runCleanup, 3000)
}

async function deleteEmployeeDocument(accessToken: string, document: SkillChangeDocumentValue): Promise<void> {
  const response = await fetch(`${PROCESSES_BASE_URL}/employee/deleteEmployeeDocument`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      employeeDocument: {
        id: document.id,
        version: document.version ?? 0,
        employeeId: document.employeeId,
        type: document.documentType,
        name: document.name,
        file: document.file,
        mimeType: document.mimeType,
        fileSize: document.fileSize ?? null
      }
    })
  })

  if (!response.ok) {
    throw new Error(`Failed to delete employee document ${document.id}`)
  }
}

function ApproveSkillAssignmentTemporaryDisabled({
  additionalData,
  onClose,
  accessToken
}: Readonly<ApproveSkillAssignmentProps>) {
  const { t } = useTranslation(approveSkillAssignmentTranslations)
  const taskPayload = additionalData?.psi_taskPayload || {}
  const processMetadata = additionalData?.psi_processMetadata || {}
  const taskTitle = (processMetadata?.referenceTaskName as string | undefined) ?? t('approve-skill-assignment-title')
  const creatorName =
    (taskPayload?.creatorName as string | undefined) ?? (processMetadata?.creatorName as string | undefined)
  const creatorUserId = processMetadata?.creatorUserId as string | undefined
  const isEveryBoxContext = !!onClose

  const handleClose = () => {
    if (onClose) {
      onClose()
    } else {
      dispatchProcessContinueEvent('pse_abort', { event: 'pse_abort' })
    }
  }

  return (
    <TaskFormLayout
      data-testid="approve-skill-assignment-container"
      header={
        <TaskDetailHeader
          title={taskTitle}
          showEmployeeInfo
          creatorName={creatorName}
          userId={creatorUserId}
          accessToken={accessToken}
          onClose={isEveryBoxContext ? handleClose : undefined}
        />
      }
      contentClassName="gba:space-y-4"
    >
      <div
        className="gba:flex gba:items-start gba:gap-3 gba:rounded-md gba:border gba:border-border gba:bg-card/50 gba:px-4 gba:py-3"
        data-testid="skill-assignment-temporary-disabled"
      >
        <InfoIcon size={16} className="gba:mt-0.5 gba:shrink-0 gba:text-muted-foreground" />
        <p className="gba:text-sm gba:text-muted-foreground">{temporaryDisabledMessage}</p>
      </div>
    </TaskFormLayout>
  )
}

const ApproveSkillAssignmentContent: React.FC<ApproveSkillAssignmentProps> = ({
  additionalData,
  onClose,
  accessToken
}) => {
  const { t } = useTranslation(approveSkillAssignmentTranslations)
  const fileClient = useFileClient({ accessToken } as BusinessAppContextProps)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [decisionAction, setDecisionAction] = useState<'approved' | 'rejected' | null>(null)
  const [decisionReason, setDecisionReason] = useState('')
  const [decisionReasonError, setDecisionReasonError] = useState<string | undefined>()

  const taskPayload = additionalData?.psi_taskPayload || {}
  const processMetadata = additionalData?.psi_processMetadata || {}
  const taskStatus = additionalData?.psi_taskStatus || processMetadata?.status || 'IN_PROGRESS'
  const isTaskCompleted = taskStatus === 'COMPLETED'

  const taskTitle = (processMetadata?.referenceTaskName as string | undefined) ?? t('approve-skill-assignment-title')
  const creatorName =
    (taskPayload?.creatorName as string | undefined) ?? (processMetadata?.creatorName as string | undefined)
  const creatorUserId = processMetadata?.creatorUserId as string | undefined

  const assignmentRequest = taskPayload?.employeeSkillAssignmentRequest as
    | { employeeId?: string; skills?: SkillPayloadItem[]; newSkills?: { name: string }[] }
    | undefined
  const legacyEmployeeSkills = taskPayload?.employeeSkills as
    | { employeeId?: string; skills?: SkillPayloadItem[]; newSkills?: { name: string }[] }
    | undefined
  const employeeSkills = assignmentRequest ?? legacyEmployeeSkills
  const employeeSkill = taskPayload?.employeeSkill as
    | {
        id?: string | null
        skill?: string | null
        level?: number | null
        employeeId?: string | null
        validFrom?: string | null
        validTo?: string | null
        verificationDocument?: string | null
        additionalProperties?: {
          previousVerificationDocument?: string | null
        } | null
      }
    | undefined
  const processEndpoint = typeof processMetadata?.endpoint === 'string' ? processMetadata.endpoint : ''
  const taskName = typeof taskPayload?.TaskName === 'string' ? taskPayload.TaskName : ''
  const taskMode =
    typeof taskPayload?.mode === 'string'
      ? taskPayload.mode
      : processEndpoint.includes('/deleteEmployeeSkill/') || taskName.toLowerCase().includes('delete')
        ? 'remove'
        : undefined

  const { changes, isLoading } = useSkillAssignmentDiff({
    employeeId:
      employeeSkills?.employeeId ??
      employeeSkill?.employeeId ??
      (taskPayload?.employeeId as string | undefined) ??
      (processMetadata?.inputs as { employeeId?: string } | undefined)?.employeeId,
    payloadSkills: employeeSkills?.skills ?? [],
    payloadNewSkills: employeeSkills?.newSkills ?? [],
    payloadEmployeeSkill: employeeSkill,
    payloadSkillsAreDelta: Boolean(assignmentRequest),
    inferRemovedSkills: Boolean(legacyEmployeeSkills && !assignmentRequest && !employeeSkill),
    mode: taskMode,
    accessToken
  })

  const isEveryBoxContext = !!onClose

  const handleDocumentClick = useCallback(
    async (document: SkillChangeDocumentValue) => {
      try {
        const blob = await fileClient.getFile(
          {
            accessScope: 'tenant',
            fileId: document.file
          },
          {
            appName: 'employee-profile',
            folderPath: `/documents/${document.employeeId || ''}`
          }
        )
        const url = URL.createObjectURL(blob)
        const link = globalThis.document.createElement('a')
        link.href = url
        link.target = '_blank'
        if (!isPreviewableFile(document.mimeType ?? undefined)) {
          link.download = document.name || 'document'
        }
        globalThis.document.body.appendChild(link)
        link.click()
        link.remove()
        globalThis.setTimeout(() => URL.revokeObjectURL(url), 1000)
      } catch (error) {
        console.error('Error downloading verification document:', error)
        toast.error(t('approve-skill-assignment-document-download-failed'))
      }
    },
    [fileClient, t]
  )

  const cleanupVerificationDocumentForDecision = useCallback(
    (decision: 'approved' | 'rejected') => {
      if (!accessToken) return

      const verificationDocumentChange = getVerificationDocumentChange(changes)
      const documentToRemove =
        decision === 'approved' ? verificationDocumentChange?.oldValue : verificationDocumentChange?.newValue

      if (!isDocumentValue(documentToRemove)) {
        return
      }

      scheduleDocumentCleanup(accessToken, documentToRemove)
    },
    [accessToken, changes]
  )

  const handleClose = () => {
    if (onClose) {
      onClose()
    } else {
      dispatchProcessContinueEvent('pse_abort', { event: 'pse_abort' })
    }
  }

  const openDecisionDialog = (action: 'approved' | 'rejected') => {
    setDecisionAction(action)
    setDecisionReason('')
    setDecisionReasonError(undefined)
  }

  const handleDecisionDialogOpenChange = (open: boolean) => {
    if (!open && !isSubmitting) {
      setDecisionAction(null)
      setDecisionReason('')
      setDecisionReasonError(undefined)
    }
  }

  const handleApproveDecision = async () => {
    setIsSubmitting(true)
    try {
      cleanupVerificationDocumentForDecision('approved')
      dispatchProcessContinueEvent('pse_approve', {
        managerApproval: 'approved'
      })
    } catch (err) {
      console.error('Error approving skill assignment:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitDecision = async () => {
    if (decisionAction === null) {
      return
    }

    const trimmedReason = decisionReason.trim()
    if (!trimmedReason) {
      setDecisionReasonError(t('approve-skill-assignment-decision-reason-required'))
      return
    }

    setIsSubmitting(true)
    try {
      cleanupVerificationDocumentForDecision(decisionAction)
      dispatchProcessContinueEvent(decisionAction === 'approved' ? 'pse_approve' : 'pse_reject', {
        managerApproval: decisionAction,
        decisionReason: trimmedReason
      })
    } catch (err) {
      console.error('Error submitting skill assignment decision:', err)
    } finally {
      setIsSubmitting(false)
      setDecisionAction(null)
      setDecisionReason('')
      setDecisionReasonError(undefined)
    }
  }

  const decisionDialogPrefix =
    decisionAction === 'approved' ? 'approve-skill-assignment-reason' : 'reject-skill-assignment-reason'

  return (
    <TaskFormLayout
      data-testid="approve-skill-assignment-container"
      header={
        <TaskDetailHeader
          title={taskTitle}
          showEmployeeInfo
          creatorName={creatorName}
          userId={creatorUserId}
          accessToken={accessToken}
          onClose={isEveryBoxContext ? handleClose : undefined}
        />
      }
      footer={
        !isTaskCompleted ? (
          <TaskDetailFooter
            data-testid="approve-skill-assignment-actions"
            actions={[
              {
                label: t('approve-skill-assignment-reject'),
                onClick: () => openDecisionDialog('rejected'),
                variant: 'default' as const,
                disabled: isSubmitting,
                loading: isSubmitting,
                icon: XCircleIcon,
                className: 'gba:bg-destructive gba:text-destructive-foreground hover:gba:bg-destructive/90',
                testId: 'reject-skill-assignment-button'
              },
              {
                label: t('approve-skill-assignment-approve'),
                onClick: handleApproveDecision,
                variant: 'default' as const,
                disabled: isSubmitting,
                loading: isSubmitting,
                icon: CheckCircleIcon,
                className: 'gba:bg-success gba:text-success-foreground hover:gba:bg-success/90',
                testId: 'approve-skill-assignment-button'
              }
            ]}
          />
        ) : undefined
      }
      contentClassName="gba:space-y-4"
    >
      <div
        className="gba:flex gba:items-start gba:gap-3 gba:rounded-md gba:border gba:border-border gba:bg-card/50 gba:px-4 gba:py-3"
        data-testid="skill-assignment-info-banner"
      >
        <InfoIcon size={16} className="gba:mt-0.5 gba:shrink-0 gba:text-muted-foreground" />
        <p className="gba:text-sm gba:text-muted-foreground">{t('approve-skill-assignment-info')}</p>
      </div>

      <div
        className="gba:bg-card/50 gba:text-card-foreground gba:rounded-md gba:p-6 gba:border gba:border-border"
        data-testid="skill-assignment-details"
      >
        <div className="gba:text-lg gba:font-semibold gba:mb-4">{t('approve-skill-assignment-details-title')}</div>

        {isLoading && (
          <div className="gba:space-y-3">
            {[1, 2].map(n => (
              <div key={n} className="gba:h-16 gba:rounded-md gba:bg-muted gba:animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && changes.length === 0 && (
          <p className="gba:text-muted-foreground gba:text-sm" data-testid="skill-assignment-empty">
            {t('approve-skill-assignment-no-changes')}
          </p>
        )}

        {!isLoading && changes.length > 0 && (
          <div className="gba:space-y-3" data-testid="skill-assignment-list">
            {changes.map(change => (
              <SkillChangeRow
                key={change.skillId ?? change.skillName}
                change={change}
                t={t}
                onDocumentClick={handleDocumentClick}
              />
            ))}
          </div>
        )}
      </div>
      <DecisionReasonDialog
        open={decisionAction !== null}
        title={
          decisionAction === 'approved'
            ? t('approve-skill-assignment-approve-reason-title')
            : t('approve-skill-assignment-reject-reason-title')
        }
        description={t('approve-skill-assignment-decision-reason-description')}
        label={t('approve-skill-assignment-decision-reason-label')}
        placeholder={t('approve-skill-assignment-decision-reason-placeholder')}
        confirmLabel={
          decisionAction === 'approved' ? t('approve-skill-assignment-approve') : t('approve-skill-assignment-reject')
        }
        cancelLabel={t('approve-skill-assignment-decision-reason-cancel')}
        reason={decisionReason}
        errorText={decisionReasonError}
        isSubmitting={isSubmitting}
        dataTestIdPrefix={decisionDialogPrefix}
        onReasonChange={value => {
          setDecisionReason(value)
          if (value.trim()) setDecisionReasonError(undefined)
        }}
        onOpenChange={handleDecisionDialogOpenChange}
        onConfirm={handleSubmitDecision}
      />
    </TaskFormLayout>
  )
}

export const ApproveSkillAssignment: React.FC<ApproveSkillAssignmentProps> = props => {
  if (temporaryDisabled) {
    return <ApproveSkillAssignmentTemporaryDisabled {...props} />
  }

  return <ApproveSkillAssignmentContent {...props} />
}

export default ApproveSkillAssignment
