import React, { useMemo } from 'react'
import { Separator, Button, Badge } from '@newwork/nw-design-system'
import { getExpensePlanStatusDisplay, formatCurrencyDisplay } from '../../../utils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ArrowRightIcon } from '@phosphor-icons/react'
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
  // Call hooks unconditionally before any early returns
  const { printExpensePlan } = useExpensePlanFileService(contextProps)

  // Memoize headerRight before early return to ensure hooks are always called in same order
  const headerRight = useMemo(() => {
    if (!selectedItem) return null
    const statusConfig = getExpensePlanStatusDisplay(selectedItem.status)
    return (
      <Badge variant={(statusConfig as any).badgeVariant || 'outline'} data-testid="expense-plan-status-badge">
        {statusConfig.label}
      </Badge>
    )
  }, [selectedItem?.status])

  if (!selectedItem) return null

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
        employee: undefined,
        employeeCode: undefined,
        sapNumber: undefined,
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
        // Only show Request Type if there's a linked expense request
        ...(selectedItem.expenseRequest &&
        Array.isArray(selectedItem.expenseRequest) &&
        selectedItem.expenseRequest.length > 0
          ? [
              {
                label: getTranslationFromI18nKeyAndLabel(
                  'lowcoder:expense_calculation_rule.affected_expense_modal.request_type',
                  'Request Type'
                ),
                value: translatePlanTypeValue(
                  selectedItem.expenseRequest[0]?.requestType?.value ||
                    (selectedItem.expenseRequest[0]?.requestType
                      ? String(selectedItem.expenseRequest[0].requestType)
                      : 'N/A')
                )
              }
            ]
          : [])
      ]}
      headerRight={headerRight}
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
              <ArrowRightIcon className="gba:mr-2" />
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
