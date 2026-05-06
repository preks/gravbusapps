import React, { useMemo } from 'react'
import { Separator, Button, Badge, useTranslation } from '@newwork/nw-design-system'
import {
  formatCurrencyDisplay,
  generateExpenseRequestActions,
  getExpenseRequestStatusDisplayT
} from '../../../../utils'
import personalTranslations from '../../../../_i18n'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ArrowRightIcon } from '@phosphor-icons/react'
import { formatDate } from '@/common/utils/windowUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { AppAction } from '@/components/app-action'
import { useExpenseRequestFileService } from '../../../../utils/expenseRequestFileService'
import TravelOrderAttachmentPreview from '../../../../../../common/components/document-preview/TravelOrderAttachmentPreview'
import { ExpenseDetailsPanelContent } from '../../../../../../common/components/details-panel/ExpenseDetailsPanelContent'

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
  const { t } = useTranslation(personalTranslations)
  // Call hooks unconditionally before any early returns
  const { printExpenseRequest } = useExpenseRequestFileService(contextProps)

  // Memoize headerRight before early return to ensure hooks are always called in same order
  const headerRight = useMemo(() => {
    if (!selectedItem) return null
    const statusConfig = getExpenseRequestStatusDisplayT(t, selectedItem.status)
    return (
      <Badge variant={(statusConfig as any).badgeVariant || 'outline'} data-testid="expense-request-status-badge">
        {statusConfig.label}
      </Badge>
    )
  }, [selectedItem?.status, t])

  if (!selectedItem) return null

  const notAvailable = t('expense-details-value-not-available')

  const formatTypeLabel = (value?: string) => {
    if (value === null || value === undefined) return notAvailable
    const trimmed = String(value).trim()
    if (!trimmed) return notAvailable
    if (trimmed.toUpperCase() === 'N/A') return notAvailable
    return trimmed
      .replace(/[_-]/g, ' ')
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // Translate known request type values with i18n keys; fall back gracefully
  const translateRequestTypeValue = (raw?: string) => {
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

  const getRequestType = () => {
    if (selectedItem.requestType?.value) return selectedItem.requestType.value
    if (selectedItem.requestType) return String(selectedItem.requestType)
    return notAvailable
  }

  const availableActions = generateExpenseRequestActions(
    selectedItem,
    {
      employeeId: contextProps.userInfo?.employeeDetails?.employeeId || '',
      accessToken: contextProps.accessToken || '',
      onClose: onClose
    },
    t,
    { includeDetails: false }
  )

  return (
    <ExpenseDetailsPanelContent
      dataTestIdPrefix="expense-request-details"
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
              prefixDataTestId="expense-request-details-action"
              accessToken={contextProps.accessToken}
              emptyState="disable"
              lazyLoad
              data-testid="expense-request-details-action-button"
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
          value: translateRequestTypeValue(
            selectedItem.expensePlan?.requestType?.value ||
              selectedItem.expensePlan?.type?.value ||
              (selectedItem.expensePlan?.requestType ? String(selectedItem.expensePlan.requestType) : notAvailable)
          )
        },
        {
          label: t('expense-plans-details-request-type'),
          value: translateRequestTypeValue(requestTypeLabel ?? getRequestType())
        }
      ]}
      headerRight={headerRight}
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
              <ArrowRightIcon className="gba:mr-2" />
              {t('expense-plans-details-view-full-details')}
            </Button>
          </div>
        </>
      }
      expenseRequestId={selectedItem?.id}
      accessToken={contextProps.accessToken}
    />
  )
}

export default ExpenseRequestDetails
