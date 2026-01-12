import React from 'react'
import { Separator, Button } from '@newwork/nw-design-system'
import { Badge } from '@newwork/nw-design-system'
import { getExpenseRequestStatusDisplay } from '../../../utils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PiArrowRight } from 'react-icons/pi'
import { getTranslationFromI18nKeyAndLabel, formatDate } from '@/common/utils/windowUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { formatCurrencyDisplay } from '../../../utils'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { generateExpenseRequestActions } from '../../../utils/expenseRequestActions'
import { useExpenseRequestFileService } from '../../../utils/expenseRequestFileService'
import TravelOrderAttachmentPreview from '../../../../../common/components/TravelOrderAttachmentPreview'
import { ExpenseDetailsPanelContent } from '../../../../../common/components/details-panel/ExpenseDetailsPanelContent'

export interface ExpenseRequestDetailsProps extends BusinessAppContextProps {
  selectedItem: any
  onClose: () => void
  requestTypeLabel?: string
}

const ExpenseRequestDetails: React.FC<ExpenseRequestDetailsProps> = ({
  selectedItem,
  onClose,
  requestTypeLabel,
  ...contextProps
}) => {
  if (!selectedItem) return null

  const { printExpenseRequest } = useExpenseRequestFileService(contextProps)

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

  // Translate known request type values with i18n keys; fall back gracefully
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
    if (selectedItem.requestType?.value) return selectedItem.requestType.value
    if (selectedItem.requestType) return String(selectedItem.requestType)
    return 'N/A'
  }

  const availableActions = generateExpenseRequestActions(
    selectedItem,
    {
      employeeId: contextProps.userInfo?.employeeDetails?.employeeId || '',
      accessToken: contextProps.accessToken || '',
      onClose: onClose
    },
    { includeDetails: false }
  )

  return (
    <ExpenseDetailsPanelContent
      dataTestIdPrefix="expense-request-details"
      showHeader={false}
      record={{
        title: selectedItem.title,
        code: selectedItem.code,
        employee:
          selectedItem.employee?.fullName ||
          selectedItem.employee?.displayName ||
          `${selectedItem.employee?.firstName || ''} ${selectedItem.employee?.lastName || ''}`.trim() ||
          'N/A',
        employeeCode: 'N/A',
        sapNumber:
          selectedItem.employee?.additionalProperties?.SAPNumber ||
          selectedItem.employee?.additionalProperties?.sapNumber ||
          'N/A',
        startDate: selectedItem.startDate ? formatDate(selectedItem.startDate, 'date.short') : 'N/A',
        endDate: selectedItem.endDate ? formatDate(selectedItem.endDate, 'date.short') : 'N/A',
        creationDate: selectedItem.createdAt ? formatDate(selectedItem.createdAt, 'date.short') : 'N/A',
        totalRemainingAmount: selectedItem.totalRemainingAmount,
        totalAmount: typeof selectedItem.totalAmount === 'number' ? selectedItem.totalAmount : 0,
        currency: selectedItem.currency?.code || selectedItem.currencyRef || 'EUR'
      }}
      formatAmount={(amount, currencyCode) => formatCurrencyDisplay(amount, currencyCode)}
      afterHeaderContent={
        availableActions.length > 0 ? (
          <div className="gba:flex gba:justify-end">
            <AppActionButton
              data-testid="expense-request-details-action-button"
              size="icon"
              staticFlowData={availableActions}
              prefixDataTestId="expense-request-details-action"
              accessToken={contextProps.accessToken}
              emptyStateBehavior="disable"
              deferMainContextRequestsUntilClick={true}
            />
          </div>
        ) : undefined
      }
      additionalFields={[
        {
          label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.plan_type', 'Plan Type'),
          value: translateRequestTypeValue(
            selectedItem.expensePlan?.requestType?.value ||
              selectedItem.expensePlan?.type?.value ||
              (selectedItem.expensePlan?.requestType ? String(selectedItem.expensePlan.requestType) : 'N/A')
          )
        },
        {
          label: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_calculation_rule.affected_expense_modal.request_type',
            'Request Type'
          ),
          value: translateRequestTypeValue(requestTypeLabel ?? getRequestType())
        }
      ]}
      headerRight={(() => {
        const statusConfig = getExpenseRequestStatusDisplay(selectedItem.status)
        return (
          <Badge variant={(statusConfig as any).badgeVariant || 'outline'} data-testid="expense-request-status-badge">
            {statusConfig.label}
          </Badge>
        )
      })()}
      extraContent={
        <TravelOrderAttachmentPreview
          record={selectedItem}
          fetchPdf={printExpenseRequest as any}
          dataTestIdPrefix="expense-request-details"
        />
      }
      footer={
        <>
          <Separator />
          <div className="gba:flex gba:justify-end gba:mt-4">
            <Button
              variant="default"
              onClick={() => {
                const url = buildPlatformUrl('/platform/fin/expenses/expense-request-record', {
                  expenseRequestId: selectedItem.id,
                  referrer: '/platform/fin/expenses/personal-expenses?tab=expense-requests'
                })
                navigateTo(url)
              }}
              data-testid="view-expense-request-details-button"
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
