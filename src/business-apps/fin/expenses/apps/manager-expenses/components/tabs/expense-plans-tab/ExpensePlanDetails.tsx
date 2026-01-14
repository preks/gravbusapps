import React, { useMemo } from 'react'
import { Separator, Button, Badge } from '@newwork/nw-design-system'
import { getExpensePlanStatusDisplay, formatCurrencyDisplay } from '../../../utils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PiArrowRight } from 'react-icons/pi'
import { getTranslationFromI18nKeyAndLabel, formatDate } from '@/common/utils/windowUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { ExpensePlan } from '../../../hooks/useMainViewExpensePlans'
import { useExpensePlanFileService } from '../../../../../common/files/useExpensePlanFileService'
import TravelOrderAttachmentPreview from '../../../../../common/components/TravelOrderAttachmentPreview'
import { ExpenseDetailsPanelContent } from '../../../../../common/components/details-panel/ExpenseDetailsPanelContent'
import { translateTypeValue, extractRequestTypeValue } from '../../../utils/typeUtils'

export interface ExpensePlanDetailsProps extends BusinessAppContextProps {
  selectedItem: ExpensePlan
  onClose: () => void
}

const ExpensePlanDetails: React.FC<ExpensePlanDetailsProps> = ({ selectedItem, ...contextProps }) => {
  // Call hooks unconditionally before any early returns
  const { printExpensePlan } = useExpensePlanFileService(contextProps)

  if (!selectedItem) return null

  const getPlanType = (): string => {
    // Only get from plan's own requestType - no fallbacks
    const typeValue =
      extractRequestTypeValue(selectedItem.requestType) || extractRequestTypeValue(selectedItem.type as any)
    return typeValue || 'N/A'
  }

  const getExpenseType = (): string | undefined => {
    // Only get from expense request's requestType - no fallbacks
    const expenseRequest = selectedItem.expenseRequest?.[0]
    return extractRequestTypeValue(expenseRequest?.requestType)
  }

  const getDepartment = () => {
    return selectedItem.employee?.employeePosition?.organizationalUnit?.name || 'N/A'
  }

  const additionalFields = [
    {
      label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.plan_type', 'Plan Type'),
      value: translateTypeValue(getPlanType())
    }
  ]

  const expenseTypeValue = getExpenseType()
  if (expenseTypeValue) {
    additionalFields.push({
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_calculation_rule.affected_expense_modal.request_type',
        'Expense Type'
      ),
      value: translateTypeValue(expenseTypeValue)
    })
  }

  additionalFields.push({
    label: getTranslationFromI18nKeyAndLabel('lowcoder:hr_employee_list.organizational_unit', 'Department'),
    value: getDepartment()
  })

  return (
    <ExpenseDetailsPanelContent
      dataTestIdPrefix="expense-plan-details"
      showHeader={false}
      record={{
        title: selectedItem.title,
        code: selectedItem.code,
        employee: selectedItem.employee?.fullName || selectedItem.employee?.displayName || 'N/A',
        employeeCode: selectedItem.employee?.code || undefined,
        startDate: selectedItem.startDate ? formatDate(selectedItem.startDate, 'date.short') : 'N/A',
        endDate: selectedItem.endDate ? formatDate(selectedItem.endDate, 'date.short') : 'N/A',
        creationDate: selectedItem.createdAt ? formatDate(selectedItem.createdAt, 'date.short') : 'N/A',
        totalRemainingAmount: 0,
        totalAmount: typeof selectedItem.totalAmount === 'number' ? selectedItem.totalAmount : 0,
        currency: selectedItem.currencyRef || 'EUR'
      }}
      formatAmount={(amount, currencyCode) => formatCurrencyDisplay(amount, currencyCode)}
      additionalFields={additionalFields}
      headerRight={useMemo(() => {
        const statusConfig = getExpensePlanStatusDisplay(selectedItem.status)
        return (
          <Badge variant={(statusConfig as any).badgeVariant || 'outline'} data-testid="expense-plan-status-badge">
            {statusConfig.label}
          </Badge>
        )
      }, [selectedItem.status])}
      extraContent={
        <TravelOrderAttachmentPreview
          record={selectedItem as any}
          fetchPdf={printExpensePlan as any}
          dataTestIdPrefix="manager-expense-plan-details"
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
                  referrer: '/platform/fin/expenses/manager-expenses?tab=expense-plans'
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
