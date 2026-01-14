import React, { useMemo } from 'react'
import { Separator, Button, Badge } from '@newwork/nw-design-system'
import { getExpenseRequestStatusDisplay, formatCurrencyDisplay } from '../../../utils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PiArrowRight, PiCheckCircle, PiXCircle } from 'react-icons/pi'
import { getTranslationFromI18nKeyAndLabel, formatDate } from '@/common/utils/windowUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { useExpenseRequestFileService } from '../../../../../common/files/useExpenseRequestFileService'
import TravelOrderAttachmentPreview from '../../../../../common/components/TravelOrderAttachmentPreview'
import { ExpenseDetailsPanelContent } from '../../../../../common/components/details-panel/ExpenseDetailsPanelContent'
import { translateTypeValue, extractRequestTypeValue } from '../../../utils/typeUtils'

export interface ExpenseRequestDetailsProps extends BusinessAppContextProps {
  request: any
  onApprove?: (requestId: string) => Promise<void>
  onReject?: (requestId: string) => Promise<void>
}

const ExpenseRequestDetails: React.FC<ExpenseRequestDetailsProps> = ({
  request,
  onApprove,
  onReject,
  ...contextProps
}) => {
  // Call hooks unconditionally before any early returns
  const { printExpenseRequest } = useExpenseRequestFileService(contextProps)

  if (!request) return null

  const canApprove = request.status === 'IN_APPROVAL' || request.status === 'VERIFICATION_REQUIRED'
  const canReject = request.status === 'IN_APPROVAL' || request.status === 'VERIFICATION_REQUIRED'

  const getRequestType = (): string => {
    const typeValue = extractRequestTypeValue(request.requestType)
    return typeValue || 'N/A'
  }

  const getPlanType = (): string | undefined => {
    const plan = request.expensePlan
    return extractRequestTypeValue(plan?.requestType) || extractRequestTypeValue(plan?.type as any)
  }

  const getDepartment = () => {
    return request.employee?.employeePosition?.organizationalUnit?.name || 'N/A'
  }

  const additionalFields = [
    {
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_calculation_rule.affected_expense_modal.request_type',
        'Request Type'
      ),
      value: translateTypeValue(getRequestType())
    }
  ]

  const planTypeValue = getPlanType()
  if (planTypeValue) {
    additionalFields.push({
      label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.plan_type', 'Plan Type'),
      value: translateTypeValue(planTypeValue)
    })
  }

  additionalFields.push({
    label: getTranslationFromI18nKeyAndLabel('lowcoder:hr_employee_list.organizational_unit', 'Department'),
    value: getDepartment()
  })

  return (
    <ExpenseDetailsPanelContent
      dataTestIdPrefix="expense-request-details"
      showHeader={false}
      record={{
        title: request.title,
        code: request.code,
        employee:
          request.employee?.fullName ||
          request.employee?.displayName ||
          `${request.employee?.firstName || ''} ${request.employee?.lastName || ''}`.trim() ||
          'N/A',
        employeeCode: request.employee?.code || undefined,
        startDate: request.startDate ? formatDate(request.startDate, 'date.short') : 'N/A',
        endDate: request.endDate ? formatDate(request.endDate, 'date.short') : 'N/A',
        creationDate: request.createdAt ? formatDate(request.createdAt, 'date.short') : 'N/A',
        totalRemainingAmount: request.totalRemainingAmount,
        totalAmount: typeof request.totalAmount === 'number' ? request.totalAmount : 0,
        currency: request.currency?.code || request.currencyRef || 'EUR'
      }}
      formatAmount={(amount, currencyCode) => formatCurrencyDisplay(amount, currencyCode)}
      additionalFields={additionalFields}
      headerRight={useMemo(() => {
        const statusConfig = getExpenseRequestStatusDisplay(request.status)
        return (
          <Badge variant={(statusConfig as any).badgeVariant || 'outline'} data-testid="expense-request-status-badge">
            {statusConfig.label}
          </Badge>
        )
      }, [request.status])}
      extraContent={
        <TravelOrderAttachmentPreview
          record={request as any}
          fetchPdf={printExpenseRequest as any}
          dataTestIdPrefix="manager-expense-request-details"
        />
      }
      footer={
        <>
          <Separator />
          <div className="gba:flex gba:justify-end gba:gap-3 gba:mt-4">
            {canApprove && onApprove && (
              <Button
                variant="default"
                onClick={() => onApprove(request.id)}
                className="gba:flex gba:items-center gba:gap-2 gba:bg-success gba:text-success-foreground hover:gba:bg-success/90"
                data-testid="expense-request-approve-button"
              >
                {getTranslationFromI18nKeyAndLabel('expense_request_approve', 'Approve')}
                <PiCheckCircle className="gba:h-4 gba:w-4" />
              </Button>
            )}
            {canReject && onReject && (
              <Button
                variant="destructive"
                onClick={() => onReject(request.id)}
                className="gba:flex gba:items-center gba:gap-2"
                data-testid="expense-request-reject-button"
              >
                {getTranslationFromI18nKeyAndLabel('expense_request_reject', 'Reject')}
                <PiXCircle className="gba:h-4 gba:w-4" />
              </Button>
            )}
            <Button
              variant="default"
              onClick={() => {
                const url = buildPlatformUrl('/platform/fin/expenses/expense-request-record', {
                  expenseRequestId: request.id,
                  referrer: '/platform/fin/expenses/manager-expenses?tab=expense-requests'
                })
                navigateTo(url)
              }}
              data-testid="expense-request-view-details-button"
            >
              <PiArrowRight className="gba:mr-2" />
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.plan_details.view_full_details',
                'View Full Details'
              )}
            </Button>
          </div>
        </>
      }
    />
  )
}

export default ExpenseRequestDetails
