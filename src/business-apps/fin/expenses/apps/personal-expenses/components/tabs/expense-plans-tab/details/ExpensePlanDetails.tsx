import React, { useMemo } from 'react'
import { Separator, Button, Badge, useTranslation } from '@newwork/nw-design-system'
import { getExpensePlanStatusDisplayT, formatCurrencyDisplay } from '../../../../utils'
import personalTranslations from '../../../../_i18n'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ArrowRightIcon } from '@phosphor-icons/react'
import { formatDate } from '@/common/utils/windowUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { AppAction } from '@/components/app-action'
import { generateExpensePlanActions } from '../../../../utils/expensePlanActions'
import { useExpensePlanFileService } from '../../../../utils/expensePlanFileService'
import TravelOrderAttachmentPreview from '../../../../../../common/components/document-preview/TravelOrderAttachmentPreview'
import { ExpenseDetailsPanelContent } from '../../../../../../common/components/details-panel/ExpenseDetailsPanelContent'

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
  const { t } = useTranslation(personalTranslations)
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

  const formatTypeLabel = (value?: string) => {
    if (!value) return notAvailable
    const trimmed = String(value).trim()
    if (!trimmed) return notAvailable
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
  }

  // Translate known plan/request type values; fallback to formatted text
  const translatePlanTypeValue = (raw?: string) => {
    if (!raw) return notAvailable
    const code = raw.includes(':') ? raw.split(':').pop()?.toUpperCase() : raw.toUpperCase()
    switch (code) {
      case 'TRIP':
        return t('personal-expenses-label-trip')
      case 'EXPENSE':
        return t('personal-expenses-label-expense')
      default:
        return formatTypeLabel(raw)
    }
  }

  const getPlanType = () => {
    if (selectedItem.requestType?.value) return selectedItem.requestType.value
    if (selectedItem.type?.value) return selectedItem.type.value
    if (selectedItem.requestType) return String(selectedItem.requestType)
    if (selectedItem.type) return String(selectedItem.type)
    return notAvailable
  }

  const availableActions = generateExpensePlanActions(
    selectedItem,
    {
      employeeId: contextProps.userInfo?.employeeDetails?.employeeId || '',
      accessToken: contextProps.accessToken || '',
      onClose: onClose
    },
    { includeDetails: false, t }
  )

  return (
    <ExpenseDetailsPanelContent
      dataTestIdPrefix="expense-plan-details"
      showHeader={false}
      t={t}
      record={{
        title: selectedItem.title,
        code: selectedItem.code,
        employee: undefined,
        employeeCode: undefined,
        sapNumber: undefined,
        startDate: selectedItem.startDate ? formatDate(selectedItem.startDate, 'date.short') : notAvailable,
        endDate: selectedItem.endDate ? formatDate(selectedItem.endDate, 'date.short') : notAvailable,
        creationDate: selectedItem.createdAt ? formatDate(selectedItem.createdAt, 'date.short') : notAvailable,
        totalRemainingAmount: selectedItem.totalRemainingAmount,
        totalAmount: typeof selectedItem.totalAmount === 'number' ? selectedItem.totalAmount : 0,
        currency: selectedItem.currency?.code || selectedItem.currencyRef || 'EUR'
      }}
      formatAmount={(amount, currencyCode) => formatCurrencyDisplay(amount, currencyCode)}
      afterHeaderContent={
        availableActions.length > 0 ? (
          <div className="gba:flex gba:justify-end">
            <AppAction
              variant="table-row"
              customActions={availableActions}
              prefixDataTestId="expense-plan-details-action"
              accessToken={contextProps.accessToken}
              emptyState="disable"
              lazyLoad
              data-testid="expense-plan-details-action-button"
            >
              <svg className="gba:h-4 gba:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                />
              </svg>
            </AppAction>
          </div>
        ) : undefined
      }
      additionalFields={[
        {
          label: t('personal-expenses-label-plan-type'),
          value: translatePlanTypeValue(planTypeLabel ?? getPlanType())
        },
        // Only show Request Type if there's a linked expense request
        ...(selectedItem.expenseRequest &&
        Array.isArray(selectedItem.expenseRequest) &&
        selectedItem.expenseRequest.length > 0
          ? [
              {
                label: t('expense-plans-details-request-type'),
                value: translatePlanTypeValue(
                  selectedItem.expenseRequest[0]?.requestType?.value ||
                    (selectedItem.expenseRequest[0]?.requestType
                      ? String(selectedItem.expenseRequest[0].requestType)
                      : notAvailable)
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
              {t('expense-plans-details-view-full-details')}
            </Button>
          </div>
        </>
      }
    />
  )
}

export default ExpensePlanDetails
