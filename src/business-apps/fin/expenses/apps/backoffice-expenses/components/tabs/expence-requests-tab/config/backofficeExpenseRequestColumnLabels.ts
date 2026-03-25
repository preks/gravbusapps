import type { TranslateFn } from '../../../../utils/utils'

export function backofficeExpenseRequestDataColumnLabel(t: TranslateFn, columnId: string): string {
  switch (columnId) {
    case 'employee':
      return t('header-employee')
    case 'employeeCode':
      return t('header-employee-code')
    case 'sapNumber':
      return t('header-sap-number')
    case 'requestNumber':
      return t('header-request-number')
    case 'title':
      return t('header-title')
    case 'startDate':
      return t('header-start-date')
    case 'endDate':
      return t('header-end-date')
    case 'createdAt':
      return t('header-creation-date')
    case 'status':
      return t('header-status')
    case 'totalRemainingAmount':
      return t('header-remaining-amount')
    case 'totalAmount':
      return t('header-total-amount')
    default:
      return columnId
  }
}
