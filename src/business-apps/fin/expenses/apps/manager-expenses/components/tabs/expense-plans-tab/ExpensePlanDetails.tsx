import React from 'react'
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

export interface ExpensePlanDetailsProps extends BusinessAppContextProps {
  selectedItem: ExpensePlan
  onClose: () => void
}

const ExpensePlanDetails: React.FC<ExpensePlanDetailsProps> = ({ selectedItem, ...contextProps }) => {
  if (!selectedItem) return null

  const { printExpensePlan } = useExpensePlanFileService(contextProps)

  return (
    <ExpenseDetailsPanelContent
      dataTestIdPrefix="expense-plan-details"
      showHeader={false}
      record={{
        title: selectedItem.title,
        code: selectedItem.code,
        employee: selectedItem.employee?.fullName || selectedItem.employee?.displayName || 'N/A',
        employeeCode: 'N/A',
        sapNumber: 'N/A',
        startDate: selectedItem.startDate ? formatDate(selectedItem.startDate, 'date.short') : 'N/A',
        endDate: selectedItem.endDate ? formatDate(selectedItem.endDate, 'date.short') : 'N/A',
        creationDate: selectedItem.createdAt ? formatDate(selectedItem.createdAt, 'date.short') : 'N/A',
        totalRemainingAmount: 0,
        totalAmount: typeof selectedItem.totalAmount === 'number' ? selectedItem.totalAmount : 0,
        currency: selectedItem.currency || 'EUR'
      }}
      formatAmount={(amount, currencyCode) => formatCurrencyDisplay(amount, currencyCode)}
      additionalFields={[]}
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
