import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import ExpenseRequestDetails from '../details/ExpenseRequestDetails'
import personalTranslations from '../../../../_i18n'
import { PrintPreviewDialog, DetailsSheet } from '../../../shared/TableSharedComponents'
import { ExpenseRequestsDataBody } from './components/ExpenseRequestsDataBody'
import { useExpenseRequestsTableModel } from '../hooks/useExpenseRequestsTableModel'
import type { ExpenseRequestsTableProps } from '../types/expenseRequestsTable.types'

export type { ExpenseRequestsTableProps } from '../types/expenseRequestsTable.types'

const ExpenseRequestsTable: React.FC<ExpenseRequestsTableProps> = React.memo(props => {
  const { t } = useTranslation(personalTranslations)
  const model = useExpenseRequestsTableModel(props)

  return (
    <>
      <ExpenseRequestsDataBody {...model.dataBodyProps} />

      <DetailsSheet
        open={!!model.selectedItem}
        onOpenChange={open => !open && model.handleCloseDetails()}
        title={model.selectedItem?.title || t('personal-expenses-expense-request-details-title')}
        testId="expense-request-details-sheet"
      >
        {model.selectedItem ? (
          <ExpenseRequestDetails
            selectedItem={model.selectedItem}
            onClose={model.handleCloseDetails}
            accessToken={model.accessToken ?? ''}
            userInfo={model.userInfo}
          />
        ) : null}
      </DetailsSheet>

      <PrintPreviewDialog
        open={model.printModalOpen}
        onOpenChange={open => {
          model.setPrintModalOpen(open)
          if (!open) model.setPrintPdfUrl('')
        }}
        title={t('personal-expenses-print-expense-request')}
        loading={model.printLoading}
        pdfUrl={model.printPdfUrl}
        testIdPrefix="expense-request"
      />
    </>
  )
})

export default ExpenseRequestsTable
