import { Button, Badge } from '@newwork/nw-design-system'
import { UserIcon, ClockIcon, ClipboardIcon } from '@phosphor-icons/react'
import { formatDate, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useState } from 'react'
import { AbsenceApproval, getPriorityLabel, getPriorityVariant, getTimeAgo } from '../hooks/useAbsencesApprovals'
import { toast } from 'sonner'

type AbsenceItemProps = {
  task: AbsenceApproval
  userId?: string
  accessToken?: string
  refetchAbsences?: () => void
}

export const handleApproveAbsence = async ({
  task,
  userId,
  accessToken,
  refetchAbsences,
  setIsSubmitting
}: {
  task: AbsenceApproval
  userId?: string
  accessToken?: string
  refetchAbsences?: () => void
  setIsSubmitting: (_isSubmitting: boolean) => void
}) => {
  setIsSubmitting(true)
  try {
    const urlEndpoint = `${task?.endpoint}?phase=complete&user=${userId}`

    const approvalAbsencePayload = {
      approval: 'APPROVED',
      event: 'pse_submit',
      approvalNote: 'Approved from manager dashboard'
    }

    const postResponse = await fetch(urlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(approvalAbsencePayload)
    })

    if (!postResponse.ok) {
      const responseText = await postResponse.text()
      throw new Error(`POST request failed: ${postResponse.status} - ${postResponse.statusText} - ${responseText}`)
    }
    await postResponse.json()
    refetchAbsences?.()
  } catch (err) {
    console.error('Error approving absence request:', err)
    const defaultErrorMessage = 'Something went wrong'
    const errorMsg = err instanceof Error ? err.message : defaultErrorMessage
    toast.error(errorMsg)
  } finally {
    setIsSubmitting(false)
  }
}

export const handleRejectAbsence = async ({
  task,
  userId,
  accessToken,
  refetchAbsences,
  setIsSubmitting
}: {
  task: AbsenceApproval
  userId?: string
  accessToken?: string
  refetchAbsences?: () => void
  setIsSubmitting: (_isSubmitting: boolean) => void
}) => {
  setIsSubmitting(true)
  try {
    const urlEndpoint = `${task?.endpoint}?phase=complete&user=${userId}`

    const rejectionAbsencePayload = {
      approval: 'REJECTED',
      event: 'pse_submit',
      approvalNote: 'Rejected from manager dashboard'
    }

    const postResponse = await fetch(urlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(rejectionAbsencePayload)
    })

    if (!postResponse.ok) {
      const responseText = await postResponse.text()
      throw new Error(`POST request failed: ${postResponse.status} - ${postResponse.statusText} - ${responseText}`)
    }
    await postResponse.json()
    refetchAbsences?.()
  } catch (err) {
    console.error(`Error rejecting absence:`, err)
    const defaultErrorMessage = 'Something went wrong'
    const errorMsg = err instanceof Error ? err.message : defaultErrorMessage
    toast.error(errorMsg)
  } finally {
    setIsSubmitting(false)
  }
}

export const AbsenceItem = ({ task, userId, accessToken, refetchAbsences }: AbsenceItemProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false)

  return (
    <div
      key={task.id}
      className="gba:cursor-pointer gba:rounded-lg gba:border gba:border-border gba:p-3 gba:transition-colors gba:hover:gba:border-primary"
      data-testid={`manager-dashboard-request-${task.id}`}
    >
      <div className="gba:flex gba:items-start gba:justify-between gba:mb-2">
        <div className="gba:flex-1">
          <div className="gba:mb-1 gba:text-sm gba:font-medium gba:text-foreground">{task.title}</div>
          <div className="gba:mb-1 gba:flex gba:items-center gba:text-xs gba:text-muted-foreground">
            <UserIcon className="gba:mr-1" size={12} />
            {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.from_date', 'From')}:{' '}
            {task.employee.fullName}
          </div>
          <div className="gba:mb-1 gba:flex gba:items-center gba:text-xs gba:text-muted-foreground">
            <ClockIcon className="gba:mr-1" size={12} />
            {getTimeAgo(task.createdAt)}
          </div>
          <div className="gba:mb-1 gba:text-xs gba:text-muted-foreground">
            {task.startDate && task.endDate
              ? `${getTranslationFromI18nKeyAndLabel(
                  'lowcoder:personal_expenses.from_date',
                  'From'
                )} ${formatDate(task.startDate)} ${getTranslationFromI18nKeyAndLabel('lowcoder:absence_overview_screen.absence_overview_table.to', 'to').toLowerCase()} ${formatDate(task.endDate)}`
              : getTranslationFromI18nKeyAndLabel(
                  'master-data:hr.manager_dashboard.date_range_not_specified',
                  'Date range not specified'
                )}
          </div>
          {task.leaveType && (
            <div className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:font-medium gba:text-muted-foreground">
              <ClipboardIcon size={16} />
              {task.leaveType === 'ABSENCE'
                ? getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.absence', 'Absence')
                : task.leaveType === 'VACATION'
                  ? getTranslationFromI18nKeyAndLabel(
                      'lowcoder:absence_landing_page.vacation_card_header_container.vacation_card_title_text',
                      'Vacation'
                    )
                  : task.leaveType === 'SPECIAL LEAVE'
                    ? getTranslationFromI18nKeyAndLabel(
                        'lowcoder:absence_landing_page.special_leave_card_header_container.special_leave_card_title_text',
                        'Special Leave'
                      )
                    : getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.work_leave', 'Work Leave')}
            </div>
          )}
        </div>
        <div className="gba:flex gba:flex-col gba:items-end gba:space-y-1">
          <Badge variant={getPriorityVariant(task)} size="sm">
            {getPriorityLabel(task)}
          </Badge>
          <Badge variant="warning" size="sm">
            {task.status}
          </Badge>
        </div>
      </div>

      <div className="gba:flex gba:space-x-2 gba:mt-3">
        <Button
          size="sm"
          variant="outline"
          className="gba:flex-1"
          data-testid={`manager-dashboard-reject-${task.id}-button`}
          disabled={isSubmitting}
          onClick={() => handleRejectAbsence({ task, userId, accessToken, refetchAbsences, setIsSubmitting })}
        >
          {getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_request.reject_button', 'Reject')}
        </Button>

        <Button
          size="sm"
          className="gba:flex-1"
          data-testid={`manager-dashboard-approve-${task.id}-button`}
          disabled={isSubmitting}
          onClick={() => handleApproveAbsence({ task, userId, accessToken, refetchAbsences, setIsSubmitting })}
        >
          {getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_request.approve_button', 'Approve')}
        </Button>
      </div>
    </div>
  )
}
