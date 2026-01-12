import React from 'react'
import { Separator, Button, Badge } from '@newwork/nw-design-system'
import { getExpenseRequestStatusDisplay, formatCurrencyDisplay } from '../../../utils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PiArrowRight, PiCheckCircle, PiXCircle } from 'react-icons/pi'
import { getTranslationFromI18nKeyAndLabel, formatDate } from '@/common/utils/windowUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { useExpenseRequestFileService } from '../../../../../common/files/useExpenseRequestFileService'
import TravelOrderAttachmentPreview from '../../../../../common/components/TravelOrderAttachmentPreview'
import { ExpenseDetailsPanelContent } from '../../../../../common/components/details-panel/ExpenseDetailsPanelContent'

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
  if (!request) return null

  const { printExpenseRequest } = useExpenseRequestFileService(contextProps)

  const canApprove = request.status === 'IN_APPROVAL' || request.status === 'VERIFICATION_REQUIRED'
  const canReject = request.status === 'IN_APPROVAL' || request.status === 'VERIFICATION_REQUIRED'

  const formatTypeLabel = (value?: string) => {
    if (value === null || value === undefined) return 'N/A'
    const trimmed = String(value).trim()
    if (!trimmed) return 'N/A'
    if (trimmed.toUpperCase() === 'N/A') return 'N/A'
    return trimmed
      .replace(/[_-]/g, ' ')
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const translateRequestTypeValue = (raw?: string) => {
    if (!raw) return 'N/A'
    const code = raw.includes(':') ? raw.split(':').pop()?.toUpperCase() : raw.toUpperCase()
    switch (code) {
      case 'TRIP':
        return getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.trip', 'Trip')
      case 'EXPENSE':
        return getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.expense', 'Expense')
      default:
        return formatTypeLabel(raw)
    }
  }

  const getRequestType = () => {
    if (request.requestType?.value) return request.requestType.value
    if (request.requestType) return String(request.requestType)
    return 'N/A'
  }

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
        employeeCode: 'N/A',
        sapNumber:
          request.employee?.additionalProperties?.SAPNumber ||
          request.employee?.additionalProperties?.sapNumber ||
          'N/A',
        startDate: request.startDate ? formatDate(request.startDate, 'date.short') : 'N/A',
        endDate: request.endDate ? formatDate(request.endDate, 'date.short') : 'N/A',
        creationDate: request.createdAt ? formatDate(request.createdAt, 'date.short') : 'N/A',
        totalRemainingAmount: request.totalRemainingAmount,
        totalAmount: typeof request.totalAmount === 'number' ? request.totalAmount : 0,
        currency: request.currency?.code || request.currencyRef || 'EUR'
      }}
      formatAmount={(amount, currencyCode) => formatCurrencyDisplay(amount, currencyCode)}
      additionalFields={[
        {
          label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.plan_type', 'Plan Type'),
          value: translateRequestTypeValue(
            request.expensePlan?.requestType?.value ||
              request.expensePlan?.type?.value ||
              (request.expensePlan?.requestType ? String(request.expensePlan.requestType) : 'N/A')
          )
        },
        {
          label: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_calculation_rule.affected_expense_modal.request_type',
            'Request Type'
          ),
          value: translateRequestTypeValue(getRequestType())
        }
      ]}
      headerRight={(() => {
        const statusConfig = getExpenseRequestStatusDisplay(request.status)
        return (
          <Badge variant={(statusConfig as any).badgeVariant || 'outline'} data-testid="expense-request-status-badge">
            {statusConfig.label}
          </Badge>
        )
      })()}
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
