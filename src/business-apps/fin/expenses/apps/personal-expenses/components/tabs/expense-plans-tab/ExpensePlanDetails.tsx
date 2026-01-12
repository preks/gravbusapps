import React from 'react'
import { Separator, Button } from '@newwork/nw-design-system'
import { Badge } from '@newwork/nw-design-system'
import { getExpensePlanStatusDisplay, formatCurrencyDisplay } from '../../../utils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PiArrowRight } from 'react-icons/pi'
import { getTranslationFromI18nKeyAndLabel, formatDate } from '@/common/utils/windowUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { generateExpensePlanActions } from '../../../utils/expensePlanActions'
import { useExpensePlanFileService } from '../../../utils/expensePlanFileService'
import TravelOrderAttachmentPreview from '../../../../../common/components/TravelOrderAttachmentPreview'
import { ExpenseDetailsPanelContent } from '../../../../../common/components/details-panel/ExpenseDetailsPanelContent'

export interface ExpensePlanDetailsProps extends BusinessAppContextProps {
  selectedItem: any
  onClose: () => void
  planTypeLabel?: string
}

const ExpensePlanDetails: React.FC<ExpensePlanDetailsProps> = ({
  selectedItem,
  onClose,
  planTypeLabel,
  ...contextProps
}) => {
  if (!selectedItem) return null

  const { printExpensePlan } = useExpensePlanFileService(contextProps)

  const formatTypeLabel = (value?: string) => {
    if (!value) return 'N/A'
    const trimmed = String(value).trim()
    if (!trimmed) return 'N/A'
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
  }

  // Translate known plan/request type values; fallback to formatted text
  const translatePlanTypeValue = (raw?: string) => {
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

  const getPlanType = () => {
    if (selectedItem.requestType?.value) return selectedItem.requestType.value
    if (selectedItem.type?.value) return selectedItem.type.value
    if (selectedItem.requestType) return String(selectedItem.requestType)
    if (selectedItem.type) return String(selectedItem.type)
    return 'N/A'
  }

  const availableActions = generateExpensePlanActions(
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
      dataTestIdPrefix="expense-plan-details"
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
              data-testid="expense-plan-details-action-button"
              size="icon"
              staticFlowData={availableActions}
              prefixDataTestId="expense-plan-details-action"
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
          value: translatePlanTypeValue(planTypeLabel ?? getPlanType())
        },
        {
          label: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_calculation_rule.affected_expense_modal.request_type',
            'Request Type'
          ),
          value: translatePlanTypeValue(
            selectedItem.requestType?.value || (selectedItem.requestType ? String(selectedItem.requestType) : 'N/A')
          )
        }
      ]}
      headerRight={(() => {
        const statusConfig = getExpensePlanStatusDisplay(selectedItem.status)
        return (
          <Badge variant={(statusConfig as any).badgeVariant || 'outline'} data-testid="expense-plan-status-badge">
            {statusConfig.label}
          </Badge>
        )
      })()}
      extraContent={
        <TravelOrderAttachmentPreview
          record={selectedItem}
          fetchPdf={printExpensePlan as any}
          dataTestIdPrefix="expense-plan-details"
        />
      }
      footer={
        <>
          <Separator />
          <div className="gba:flex gba:justify-end gba:mt-4">
            <Button
              variant="default"
              onClick={() => {
                const url = buildPlatformUrl('/platform/fin/expenses/expense-plan-record', {
                  expensePlanId: selectedItem.id,
                  referrer: '/platform/fin/expenses/personal-expenses?tab=expense-plans'
                })
                navigateTo(url)
              }}
              data-testid="view-expense-plan-details-button"
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

export default ExpensePlanDetails
