import React, { useMemo } from 'react'
import { Separator, Button, Badge, useTranslation } from '@newwork/nw-design-system'
import { formatCurrencyDisplay, getExpenseRequestStatusDisplayT } from '../../../../utils'
import personalTranslations from '../../../../_i18n'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ArrowRightIcon } from '@phosphor-icons/react'
import { formatDate } from '@/common/utils/windowUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { useExpenseRequestFileService } from '../../../../utils/expenseRequestFileService'
import TravelOrderAttachmentPreview from '../../../../../../common/components/document-preview/TravelOrderAttachmentPreview'
import { ExpenseDetailsPanelContent } from '../../../../../../common/components/details-panel/ExpenseDetailsPanelContent'
import { useExpenseRequestOwnerActions } from '@/business-apps/fin/expenses/common/hooks/useExpenseRequestOwnerActions'
import { ExpenseOwnerActionMenu } from '@/business-apps/fin/expenses/common/components/owner-actions/ExpenseOwnerActionMenu'
import { ExpenseEntityOwnerDiscardDialog } from '@/business-apps/fin/expenses/common/components/owner-actions/ExpenseEntityOwnerDiscardDialog'

export interface ExpenseRequestDetailsProps extends BusinessAppContextProps {
  selectedItem: any
  onClose: () => void
  requestTypeLabel?: string
  onAfterDiscard?: () => void
}

const ExpenseRequestDetails: React.FC<ExpenseRequestDetailsProps> = ({
  selectedItem,
  onClose,
  requestTypeLabel,
  onAfterDiscard,
  ...contextProps
}) => {
  const { t } = useTranslation(personalTranslations)
  const { printExpenseRequest } = useExpenseRequestFileService(contextProps)

  const ownerActions = useExpenseRequestOwnerActions({
    request: selectedItem
      ? {
          id: selectedItem.id,
          status: selectedItem.status,
          title: selectedItem.title,
          employeeId: selectedItem.employeeId ?? selectedItem.employee?.id
        }
      : null,
    accessToken: contextProps.accessToken,
    userInfo: contextProps.userInfo,
    onClose,
    onDiscardSuccess: onAfterDiscard
  })

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

  return (
    <>
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
          <ExpenseOwnerActionMenu
            actions={ownerActions.actions}
            accessToken={contextProps.accessToken}
            placement="details-sidebar"
            testIdPrefix="expense-request-details-action"
          />
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
        expenseRequestId={selectedItem.id}
        accessToken={contextProps.accessToken}
      />

      <ExpenseEntityOwnerDiscardDialog
        open={ownerActions.discardDialogOpen}
        entityTitle={ownerActions.discardTarget?.title}
        isSubmitting={ownerActions.isDiscarding}
        labels={ownerActions.discardDialogLabels}
        testIdPrefix="discard-expense-request-details"
        t={ownerActions.t}
        onOpenChange={ownerActions.handleDiscardDialogOpenChange}
        onConfirm={ownerActions.handleConfirmDiscard}
      />
    </>
  )
}

export default ExpenseRequestDetails
