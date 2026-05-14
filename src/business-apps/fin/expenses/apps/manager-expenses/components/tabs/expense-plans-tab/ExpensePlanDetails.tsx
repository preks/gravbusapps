import React, { useMemo } from 'react'
import { Separator, Button, Badge, useTranslation } from '@newwork/nw-design-system'
import { getExpensePlanStatusDisplayT, formatCurrencyDisplay } from '../../../utils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ArrowRightIcon } from '@phosphor-icons/react'
import { formatDate } from '@/common/utils/windowUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { ExpensePlan } from '../../../hooks/useMainViewExpensePlans'
import { useExpensePlanFileService } from '../../../../../common/files/useExpensePlanFileService'
import TravelOrderAttachmentPreview from '../../../../../common/components/document-preview/TravelOrderAttachmentPreview'
import { ExpenseDetailsPanelContent } from '../../../../../common/components/details-panel/ExpenseDetailsPanelContent'
import { translateTypeValue, extractRequestTypeValue } from '../../../utils/typeUtils'
import translations from '../../../_i18n'

export interface ExpensePlanDetailsProps extends BusinessAppContextProps {
  selectedItem: ExpensePlan
  onClose: () => void
}

const ExpensePlanDetails: React.FC<ExpensePlanDetailsProps> = ({ selectedItem, ...contextProps }) => {
  const { t } = useTranslation(translations)
  // Call hooks unconditionally before any early returns
  const { printExpensePlan } = useExpensePlanFileService(contextProps)

  // Memoize headerRight before early return to ensure hooks are always called in same order
  const headerRight = useMemo(() => {
    if (!selectedItem) return null
    const statusConfig = getExpensePlanStatusDisplayT(t, selectedItem.status)
    return (
      <Badge variant={(statusConfig as any).badgeVariant || 'outline'} data-testid="expense-plan-status-badge">
        {statusConfig.label}
      </Badge>
    )
  }, [selectedItem?.status, t])

  if (!selectedItem) return null

  const notAvailable = t('expense-details-value-not-available')

  const getPlanType = (): string => {
    // Only get from plan's own requestType - no fallbacks
    const typeValue =
      extractRequestTypeValue(selectedItem.requestType) || extractRequestTypeValue(selectedItem.type as any)
    return typeValue || notAvailable
  }

  const getExpenseType = (): string | undefined => {
    // Only get from expense request's requestType - no fallbacks
    const expenseRequest = selectedItem.expenseRequest?.[0]
    return extractRequestTypeValue(expenseRequest?.requestType)
  }

  const getDepartment = () => {
    return selectedItem.employee?.employeePosition?.organizationalUnit?.name || notAvailable
  }

  const additionalFields = [
    {
      label: t('expense-plans-detail-plan-type'),
      value: translateTypeValue(getPlanType(), t)
    }
  ]

  const expenseTypeValue = getExpenseType()
  if (expenseTypeValue) {
    additionalFields.push({
      label: t('expense-plans-detail-request-type'),
      value: translateTypeValue(expenseTypeValue, t)
    })
  }

  additionalFields.push({
    label: t('expense-plans-detail-department'),
    value: getDepartment()
  })

  return (
    <ExpenseDetailsPanelContent
      dataTestIdPrefix="expense-plan-details"
      showHeader={false}
      t={t}
      record={{
        title: selectedItem.title,
        code: selectedItem.code,
        employee: selectedItem.employee?.fullName || selectedItem.employee?.displayName || notAvailable,
        employeeCode: selectedItem.employee?.code || undefined,
        startDate: selectedItem.startDate ? formatDate(selectedItem.startDate, 'date.short') : notAvailable,
        endDate: selectedItem.endDate ? formatDate(selectedItem.endDate, 'date.short') : notAvailable,
        creationDate: selectedItem.createdAt ? formatDate(selectedItem.createdAt, 'date.short') : notAvailable,
        totalRemainingAmount: 0,
        totalAmount: typeof selectedItem.totalAmount === 'number' ? selectedItem.totalAmount : 0,
        currency: selectedItem.currencyRef || 'EUR'
      }}
      formatAmount={(amount, currencyCode) => formatCurrencyDisplay(amount, currencyCode)}
      additionalFields={additionalFields}
      headerRight={headerRight}
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
              <ArrowRightIcon className="gba:mr-2" />
              {t('expense-plans-detail-view-full')}
            </Button>
          </div>
        </>
      }
    />
  )
}

export default ExpensePlanDetails
