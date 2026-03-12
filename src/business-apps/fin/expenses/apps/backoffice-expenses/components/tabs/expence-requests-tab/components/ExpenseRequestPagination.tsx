import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import translations from '../../../../_i18n'
import { TablePagination, PaginationChangeParams } from '../../../../../../components'

interface ExpenseRequestPaginationProps {
  currentPage: number
  pageSize: number
  totalItems: number
  onPageChange: (pagination: PaginationChangeParams) => void
  // Deterministic scroll target for pagination (top of table)
  scrollTargetRef?: React.RefObject<HTMLElement | null>
  scrollTargetTestId?: string
}

const ExpenseRequestPagination: React.FC<ExpenseRequestPaginationProps> = ({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  scrollTargetRef,
  scrollTargetTestId
}) => {
  const { t } = useTranslation(translations)

  return (
    <TablePagination
      currentPage={currentPage}
      pageSize={pageSize}
      totalItems={totalItems}
      onPageChange={onPageChange}
      scrollTargetRef={scrollTargetRef}
      scrollTargetTestId={scrollTargetTestId}
      entityNamePlural={t('tab-expense-requests')}
      dataTestIdPrefix="expense-requests"
    />
  )
}

export default ExpenseRequestPagination
