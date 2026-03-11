import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { ExpenseData } from '../../../../types'
import translations from '../../../../_i18n'
import withStoppedPropagation from '../../common/withStoppedPropagation'
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
  const onNavigate = withStoppedPropagation(() => onNavigateToExpenseRequest(record))
  const onDownload = withStoppedPropagation(() => onDownloadAccountingNote(record))
  const onTriggerCsvAction = withStoppedPropagation(() => onTriggerCSV(record))
  const onPrint = withStoppedPropagation(() => onPrintExpenseRequest(record))
  const onTransfer = withStoppedPropagation(() => {
    if (transferInProgress) {
      return
    }
    onTransferPayment(record)
  })

  return (
    <div className="gba:flex gba:justify-start gba:gap-2" onClick={e => e.stopPropagation()}>
      <AppActionButton
        data-testid={`expense-request-actions-${record.id}`}
        size="icon"
        staticFlowData={[
          {
            category: t('action-navigations'),
            key: 'view-expense-request-details',
            label: t('action-view-request-details'),
            onClick: onNavigate
          },
          {
            category: t('action-navigations'),
            key: 'download-accounting-note',
            label: t('action-download-accounting-note'),
            onClick: onDownload
          },
          {
            category: t('action-navigations'),
            key: 'trigger-csv',
            label: t('action-trigger-csv'),
            onClick: onTriggerCsvAction
          },
          ...(canTransferPayment
            ? [
                {
                  category: t('action-navigations'),
                  key: 'transfer-payment',
                  label: transferInProgress ? t('transfer-in-progress') : t('transfer-payment-label'),
                  disabled: transferInProgress,
                  onClick: onTransfer
                }
              ]
            : []),
          ...(canPrint
            ? [
                {
                  category: t('action-navigations'),
                  key: 'print-expense-request',
                  label: t('action-print'),
                  onClick: onPrint
                }
              ]
            : [])
        ]}
        prefixDataTestId="expense-request-actions"
        accessToken={accessToken}
        emptyStateBehavior="enable"
        deferMainContextRequestsUntilClick
      />
    </div>
  )
}

export default ExpenseRequestTableActions
