import { Badge, Button } from '@newwork/nw-design-system'
import { ExpenseApproval } from '../hooks/useExpensesApprovals'
import { UserIcon, ClockIcon, MoneyWavyIcon, PathIcon } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { formatDate, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { getTimeAgo, getPriorityVariant, getPriorityLabel, formatCurrency } from '../hooks/useAbsencesApprovals'

export const handleApproveExpense = async ({
  task,
  userId,
  accessToken,
  refetchExpenses,
  setIsSubmitting,
  employeeId
}: {
  task: ExpenseApproval
  userId?: string
  accessToken?: string
  refetchExpenses?: () => void
  setIsSubmitting: (_isSubmitting: boolean) => void
  employeeId?: string
}) => {
  setIsSubmitting(true)
  const isExpensePlan = task?.type === 'expense-plan'

  try {
    const urlEndpoint = `${task?.endpoint}?phase=complete&user=${userId}`
    // Conditionally add absence object for TRIP plans
    const isTrip = task?.requestType === 'ExpenseRequestType:v1:TRIP'

    const approvalPlanPayload = {
      event: 'pse_submit',
      expensePlanComment: {
        commentDate: new Date().toISOString().slice(0, 19),
        comment: 'Approved from manager dashboard',
        commentType: 'APPROVE_COMMENT',
        authorEmployee: employeeId,
        expensePlan: task?.id
      },
      ...(isTrip
        ? {
            employeeAbsence: {
              typeRef: 'AbsenceType:v1:A101',
              employeeId: task?.employee?.id,
              startDate: task?.startDate,
              endDate: task?.endDate,
              description: task?.description,
              substituteEmployee: '',
              status: 'APPROVED'
            }
          }
        : {})
    }

    const approvalRequestPayload = {
      event: 'pse_submit',
      expenseRequestComment: {
        commentDate: new Date().toISOString().slice(0, 19),
        comment: 'Approved from manager dashboard',
        commentType: 'APPROVE_COMMENT',
        authorEmployee: employeeId,
        expenseRequest: task?.id
      }
    }

    const postResponse = await fetch(urlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(isExpensePlan ? approvalPlanPayload : approvalRequestPayload)
    })

    if (!postResponse.ok) {
      const responseText = await postResponse.text()
      throw new Error(`POST request failed: ${postResponse.status} - ${postResponse.statusText} - ${responseText}`)
    }
    await postResponse.json()
    refetchExpenses?.()
  } catch (err) {
    console.error(`Error approving expense ${isExpensePlan ? 'plan' : 'request'}:`, err)
    const defaultErrorMessage = 'Something went wrong'
    const errorMsg = err instanceof Error ? err.message : defaultErrorMessage
    toast.error(errorMsg)
  } finally {
    setIsSubmitting(false)
  }
}

export const handleReturnExpense = async ({
  task,
  userId,
  accessToken,
  refetchExpenses,
  setIsSubmitting,
  employeeId
}: {
  task: ExpenseApproval
  userId?: string
  accessToken?: string
  refetchExpenses?: () => void
  setIsSubmitting: (_isSubmitting: boolean) => void
  employeeId?: string
}) => {
  setIsSubmitting(true)
  const isExpensePlan = task?.type === 'expense-plan'
  try {
    const urlEndpoint = `${task?.endpoint}?phase=complete&user=${userId}`

    const rejectionPlanPayload = {
      event: 'pse_submit',
      changeMode: 'INSERT',
      expensePlanComment: {
        commentDate: new Date().toISOString().slice(0, 19),
        comment: 'Rejected from manager dashboard',
        commentType: 'REJECT_COMMENT',
        authorEmployee: employeeId,
        expensePlan: task?.id
      }
    }

    const rejectionRequestPayload = {
      event: 'pse_submit',
      changeMode: 'INSERT',
      expenseRequestComment: {
        commentDate: new Date().toISOString().slice(0, 19),
        comment: 'Rejected from manager dashboard',
        commentType: 'REJECT_COMMENT',
        authorEmployee: employeeId,
        expenseRequest: task?.id
      }
    }

    const postResponse = await fetch(urlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(isExpensePlan ? rejectionPlanPayload : rejectionRequestPayload)
    })

    if (!postResponse.ok) {
      const responseText = await postResponse.text()
      throw new Error(`POST request failed: ${postResponse.status} - ${postResponse.statusText} - ${responseText}`)
    }
    await postResponse.json()
    refetchExpenses?.()
  } catch (err) {
    console.error(`Error returning expense ${isExpensePlan ? 'plan' : 'request'}:`, err)
    const defaultErrorMessage = 'Something went wrong'
    const errorMsg = err instanceof Error ? err.message : defaultErrorMessage
    toast.error(errorMsg)
  } finally {
    setIsSubmitting(false)
  }
}

export const ExpenseItem = ({
  task,
  employeeId,
  refetchExpenses,
  accessToken,
  userId
}: {
  task: ExpenseApproval
  employeeId?: string
  refetchExpenses?: () => void
  accessToken?: string
  userId?: string
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isTrip = useMemo(() => task?.requestType === 'ExpenseRequestType:v1:TRIP', [task?.requestType])

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
            {`${getTranslationFromI18nKeyAndLabel(
              'lowcoder:personal_expenses.from_date',
              'From'
            )}: ${task.employee.fullName}`}
          </div>
          <div className="gba:mb-1 gba:flex gba:items-center gba:text-xs gba:text-muted-foreground">
            <ClockIcon className="gba:mr-1" size={12} />
            {getTimeAgo(task.createdAt)}
          </div>
          <div className="gba:mb-1 gba:text-xs gba:text-muted-foreground">{formatCurrency(task.totalAmount)}</div>
          {isTrip && (
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
          )}
          <div className="gba:text-xs gba:font-medium gba:text-muted-foreground">
            {task.type === 'expense-request' ? (
              <div className="gba:flex gba:items-center gba:gap-1">
                <MoneyWavyIcon size={16} />
                {isTrip
                  ? getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.trip_request', 'Trip Request')
                  : getTranslationFromI18nKeyAndLabel(
                      'lowcoder:create_expense_request.initiate_title_header',
                      'Expense Request'
                    )}
              </div>
            ) : (
              <div className="gba:flex gba:items-center gba:gap-1">
                <PathIcon size={16} />
                {isTrip
                  ? getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.trip_plan', 'Trip Plan')
                  : getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.expense_plan', 'Expense Plan')}
              </div>
            )}
          </div>
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
          data-testid={`manager-dashboard-reject-${task.id}-button`}
          className="gba:flex-1"
          disabled={isSubmitting}
          onClick={() =>
            handleReturnExpense({
              task,
              userId,
              accessToken,
              refetchExpenses,
              setIsSubmitting,
              employeeId
            })
          }
        >
          {getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_request.return_button', 'Return')}
        </Button>

        <Button
          size="sm"
          data-testid={`manager-dashboard-approve-${task.id}-button`}
          className="gba:flex-1 gba:bg-primary gba:text-primary-foreground hover:gba:bg-primary/90"
          onClick={() =>
            handleApproveExpense({
              task,
              userId,
              accessToken,
              refetchExpenses,
              setIsSubmitting,
              employeeId
            })
          }
          disabled={isSubmitting}
        >
          {getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_request.approve_button', 'Approve')}
        </Button>
      </div>
    </div>
  )
}
