import React, { useState } from 'react'
import { CheckCircle, XCircle } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { TaskDetailHeader } from '@/business-apps/core/every/apps/every-box/components/TaskDetailHeader'
import { TaskDetailFooter } from '@/business-apps/core/every/apps/every-box/components/TaskDetailFooter'
import { TaskFormLayout } from '@/business-apps/core/every/apps/every-box/components/TaskFormLayout'
import { useTranslation } from '@newwork/nw-design-system'
import approveCreateSkillTranslations from './_i18n/index'
interface NewSkillItem {
  name: string
}
interface ApproveCreateSkillProps extends BusinessAppContextProps {
  onClose?: () => void
}
export const ApproveCreateSkill: React.FC<ApproveCreateSkillProps> = ({ additionalData, onClose, accessToken }) => {
  const { t } = useTranslation(approveCreateSkillTranslations)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const taskPayload = additionalData?.psi_taskPayload || {}
  const processMetadata = additionalData?.psi_processMetadata || {}
  const taskStatus = additionalData?.psi_taskStatus || (processMetadata as any)?.status || 'IN_PROGRESS'
  const isTaskCompleted = taskStatus === 'COMPLETED'
  const taskTitle =
    ((processMetadata as any)?.referenceTaskName as string | undefined) ?? t('approve-create-skill-title')
  const creatorName =
    ((taskPayload as any)?.creatorName as string | undefined) ??
    ((processMetadata as any)?.creatorName as string | undefined)
  const creatorUserId = (processMetadata as any)?.creatorUserId as string | undefined
  const employeeSkills = (taskPayload as any)?.employeeSkills as { newSkills?: NewSkillItem[] } | undefined
  const newSkills: NewSkillItem[] = employeeSkills?.newSkills ?? []
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
        hrAdminApproval: 'approved',
        event: 'pse_approve'
      })
    } catch (err) {
      console.error('Error approving skill creation:', err)
    } finally {
      setIsSubmitting(false)
    }
  }
  const handleReject = async () => {
    setIsSubmitting(true)
    try {
      dispatchProcessContinueEvent('pse_reject', {
        hrAdminApproval: 'rejected',
        event: 'pse_reject'
      })
    } catch (err) {
      console.error('Error rejecting skill creation:', err)
    } finally {
      setIsSubmitting(false)
    }
  }
  return (
    <TaskFormLayout
      data-testid="approve-create-skill-container"
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
            data-testid="approve-create-skill-actions"
            actions={[
              {
                label: t('approve-create-skill-reject'),
                onClick: handleReject,
                variant: 'default' as const,
                disabled: isSubmitting,
                loading: isSubmitting,
                icon: XCircle,
                className: 'gba:bg-destructive gba:text-destructive-foreground hover:gba:bg-destructive/90',
                testId: 'reject-create-skill-button'
              },
              {
                label: t('approve-create-skill-approve'),
                onClick: handleApprove,
                variant: 'default' as const,
                disabled: isSubmitting,
                loading: isSubmitting,
                icon: CheckCircle,
                className: 'gba:bg-success gba:text-success-foreground hover:gba:bg-success/90',
                testId: 'approve-create-skill-button'
              }
            ]}
          />
        ) : undefined
      }
      contentClassName="gba:space-y-4"
    >
      <div className="gba:text-card-foreground gba:rounded-md gba:pr-6" data-testid="create-skill-details">
        <div className="gba:text-lg gba:font-semibold gba:mb-4">{t('approve-create-skill-details-title')}</div>
        {newSkills.length === 0 && (
          <p className="gba:text-muted-foreground gba:text-sm" data-testid="create-skill-empty">
            {t('approve-create-skill-no-skills')}
          </p>
        )}
        {newSkills.length > 0 && (
          <div className="gba:space-y-3" data-testid="create-skill-list">
            {newSkills.map(skill => (
              <div
                key={skill.name}
                className="gba:flex gba:items-center gba:rounded-md gba:border gba:border-border gba:bg-muted/40 gba:px-4 gba:py-3"
                data-testid={`create-skill-row-${skill.name}`}
              >
                <span className="gba:font-medium gba:text-sm" data-testid={`create-skill-name-${skill.name}`}>
                  {skill.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </TaskFormLayout>
  )
}
export default ApproveCreateSkill
