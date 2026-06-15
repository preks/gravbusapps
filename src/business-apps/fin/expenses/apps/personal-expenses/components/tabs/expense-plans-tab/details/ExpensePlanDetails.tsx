import React, { useMemo } from 'react'
import { Separator, Button, Badge, useTranslation } from '@newwork/nw-design-system'
import { getExpensePlanStatusDisplayT, formatCurrencyDisplay } from '../../../../utils'
import personalTranslations from '../../../../_i18n'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ArrowRightIcon } from '@phosphor-icons/react'
import { formatDate } from '@/common/utils/windowUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { useExpensePlanFileService } from '../../../../utils/expensePlanFileService'
import TravelOrderAttachmentPreview from '../../../../../../common/components/document-preview/TravelOrderAttachmentPreview'
import { ExpenseDetailsPanelContent } from '../../../../../../common/components/details-panel/ExpenseDetailsPanelContent'
import { useExpensePlanOwnerActions } from '@/business-apps/fin/expenses/common/hooks/useExpensePlanOwnerActions'
import { ExpenseOwnerActionMenu } from '@/business-apps/fin/expenses/common/components/owner-actions/ExpenseOwnerActionMenu'
import { ExpenseEntityOwnerDiscardDialog } from '@/business-apps/fin/expenses/common/components/owner-actions/ExpenseEntityOwnerDiscardDialog'

export interface ExpensePlanDetailsProps extends BusinessAppContextProps {
  selectedItem: any
  onClose: () => void
  planTypeLabel?: string
  onAfterDiscard?: () => void
}

const ExpensePlanDetails: React.FC<ExpensePlanDetailsProps> = ({
  selectedItem,
  onClose,
  planTypeLabel,
  onAfterDiscard,
  ...contextProps
}) => {
  const { t } = useTranslation(personalTranslations)
  const { printExpensePlan } = useExpensePlanFileService(contextProps)

  const ownerActions = useExpensePlanOwnerActions({
    plan: selectedItem
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

  return (
    <>
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
          <ExpenseOwnerActionMenu
            actions={ownerActions.actions}
            accessToken={contextProps.accessToken}
            placement="details-sidebar"
            testIdPrefix="expense-plan-details-action"
          />
        }
        additionalFields={[
          {
            label: t('personal-expenses-label-plan-type'),
            value: translatePlanTypeValue(planTypeLabel ?? getPlanType())
          },
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

      <ExpenseEntityOwnerDiscardDialog
        open={ownerActions.discardDialogOpen}
        entityTitle={ownerActions.discardTarget?.title}
        isSubmitting={ownerActions.isDiscarding}
        labels={ownerActions.discardDialogLabels}
        testIdPrefix="discard-expense-plan-details"
        t={ownerActions.t}
        onOpenChange={ownerActions.handleDiscardDialogOpenChange}
        onConfirm={ownerActions.handleConfirmDiscard}
      />
    </>
  )
}

export default ExpensePlanDetails
