import React, { useState } from 'react'
import { CheckCircleIcon, XCircleIcon, ArrowRightIcon, InfoIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { TaskDetailHeader } from '@/business-apps/core/every/apps/every-box/components/TaskDetailHeader'
import { TaskDetailFooter } from '@/business-apps/core/every/apps/every-box/components/TaskDetailFooter'
import { TaskFormLayout } from '@/business-apps/core/every/apps/every-box/components/TaskFormLayout'
import { Badge, useTranslation } from '@newwork/nw-design-system'
import { useSkillAssignmentDiff, SkillChange } from './useSkillAssignmentDiff'
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

function SkillChangeRow({ change, t }: Readonly<{ change: SkillChange; t: (key: string) => string }>) {
  const isDeleted = change.type === 'deleted'
  const testId = change.skillId ?? change.skillName

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

        {change.type === 'modified' && (
          <span
            className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground"
            data-testid={`skill-change-level-${testId}`}
          >
            {t('approve-skill-assignment-level')} {change.oldLevel}
            <ArrowRightIcon size={12} />
            {t('approve-skill-assignment-level')} {change.newLevel}
          </span>
        )}

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

export const ApproveSkillAssignment: React.FC<ApproveSkillAssignmentProps> = ({
  additionalData,
  onClose,
  accessToken
}) => {
  const { t } = useTranslation(approveSkillAssignmentTranslations)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const taskPayload = additionalData?.psi_taskPayload || {}
  const processMetadata = additionalData?.psi_processMetadata || {}
  const taskStatus = additionalData?.psi_taskStatus || processMetadata?.status || 'IN_PROGRESS'
  const isTaskCompleted = taskStatus === 'COMPLETED'

  const taskTitle = (processMetadata?.referenceTaskName as string | undefined) ?? t('approve-skill-assignment-title')
  const creatorName =
    (taskPayload?.creatorName as string | undefined) ?? (processMetadata?.creatorName as string | undefined)
  const creatorUserId = processMetadata?.creatorUserId as string | undefined

  const employeeSkills = taskPayload?.employeeSkills as
    | { employeeId?: string; skills?: SkillPayloadItem[]; newSkills?: { name: string }[] }
    | undefined

  const { changes, isLoading } = useSkillAssignmentDiff({
    employeeId: employeeSkills?.employeeId,
    payloadSkills: employeeSkills?.skills ?? [],
    payloadNewSkills: employeeSkills?.newSkills ?? [],
    accessToken
  })

  const isEveryBoxContext = !!onClose

  const handleClose = () => {
    if (onClose) {
      onClose()
    } else {
      dispatchProcessContinueEvent('pse_abort', { event: 'pse_abort' })
    }
  }

  const handleApprove = async () => {
    setIsSubmitting(true)
    try {
      dispatchProcessContinueEvent('pse_approve', {
        managerApproval: 'approved'
      })
    } catch (err) {
      console.error('Error approving skill assignment:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReject = async () => {
    setIsSubmitting(true)
    try {
      dispatchProcessContinueEvent('pse_reject', {
        managerApproval: 'rejected'
      })
    } catch (err) {
      console.error('Error rejecting skill assignment:', err)
    } finally {
      setIsSubmitting(false)
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
      footer={
        !isTaskCompleted ? (
          <TaskDetailFooter
            data-testid="approve-skill-assignment-actions"
            actions={[
              {
                label: t('approve-skill-assignment-reject'),
                onClick: handleReject,
                variant: 'default' as const,
                disabled: isSubmitting,
                loading: isSubmitting,
                icon: XCircleIcon,
                className: 'gba:bg-destructive gba:text-destructive-foreground hover:gba:bg-destructive/90',
                testId: 'reject-skill-assignment-button'
              },
              {
                label: t('approve-skill-assignment-approve'),
                onClick: handleApprove,
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
              <SkillChangeRow key={change.skillId ?? change.skillName} change={change} t={t} />
            ))}
          </div>
        )}
      </div>
    </TaskFormLayout>
  )
}

export default ApproveSkillAssignment
