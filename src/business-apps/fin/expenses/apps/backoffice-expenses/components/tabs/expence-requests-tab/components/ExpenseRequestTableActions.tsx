import React, { useMemo } from 'react'
import type { ActionOption } from '@newwork/nw-design-system'
import { useTranslation } from '@newwork/nw-design-system'
import { AppAction } from '@/components/app-action'
import {
  RowActionsIcon,
  RowActionsWrapper
} from '../../../../../manager-expenses/common/components/RowActionComponents'
import { ExpenseData } from '../../../../types'
import translations from '../../../../_i18n'
import type { ExpenseRequestActionHandlers } from '../../../../types/expenseRequestActionHandlers'

interface ExpenseRequestTableActionsProps extends ExpenseRequestActionHandlers {
  record: ExpenseData
  accessToken: string
  transferInProgress?: boolean
}

const ExpenseRequestTableActions: React.FC<ExpenseRequestTableActionsProps> = ({
  record,
  accessToken,
  transferInProgress = false,
  onNavigateToExpenseRequest,
  onDownloadAccountingNote,
  onTriggerCSV,
  onPrintExpenseRequest,
  onTransferPayment
}) => {
  const { t } = useTranslation(translations)

  const canPrint =
    (record.status === 'PAID' ||
      record.status === 'BOOKED' ||
      record.status === 'APPROVED' ||
      record.status === 'VERIFIED' ||
      record.status === 'TRANSFERRED') &&
    record.employeeDocumentId !== null

  const canTransferPayment = record.status === 'BOOKED'

  const customActions: ActionOption[] = useMemo(() => {
    const navigationsCategory = t('action-navigations')
    const actionsList: ActionOption[] = [
      {
        category: navigationsCategory,
        key: 'view-expense-request-details',
        label: t('action-view-request-details'),
        onClick: (e?: React.MouseEvent) => {
          e?.stopPropagation()
          onNavigateToExpenseRequest(record)
        }
      },
      {
        category: navigationsCategory,
        key: 'download-accounting-note',
        label: t('action-download-accounting-note'),
        onClick: (e?: React.MouseEvent) => {
          e?.stopPropagation()
          onDownloadAccountingNote(record)
        }
      },
      {
        category: navigationsCategory,
        key: 'trigger-csv',
        label: t('action-trigger-csv'),
        onClick: (e?: React.MouseEvent) => {
          e?.stopPropagation()
          onTriggerCSV(record)
        }
      }
    ]

    if (canTransferPayment) {
      actionsList.push({
        category: navigationsCategory,
        key: 'transfer-payment',
        label: transferInProgress ? t('transfer-in-progress') : t('transfer-payment-label'),
        disabled: transferInProgress,
        onClick: (e?: React.MouseEvent) => {
          e?.stopPropagation()
          if (!transferInProgress) {
            onTransferPayment(record)
          }
        }
      })
    }

    if (canPrint) {
      actionsList.push({
        category: navigationsCategory,
        key: 'print-expense-request',
        label: t('action-print'),
        onClick: (e?: React.MouseEvent) => {
          e?.stopPropagation()
          onPrintExpenseRequest(record)
        }
      })
    }

    return actionsList
  }, [
    record,
    canPrint,
    canTransferPayment,
    transferInProgress,
    t,
    onNavigateToExpenseRequest,
    onDownloadAccountingNote,
    onTriggerCSV,
    onPrintExpenseRequest,
    onTransferPayment
  ])

  return (
    <RowActionsWrapper>
      <AppAction
        variant="table-row"
        customActions={customActions}
        prefixDataTestId="expense-request-actions"
        accessToken={accessToken}
        data-testid={`expense-request-actions-${record.id}`}
        emptyState="enable"
      >
        <RowActionsIcon />
      </AppAction>
    </RowActionsWrapper>
  )
}

export default React.memo(ExpenseRequestTableActions)
