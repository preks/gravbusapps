import type { TranslateFn } from '../../../../utils/utils'

export function backofficeAdvancePaymentDataColumnLabel(t: TranslateFn, columnId: string): string {
  switch (columnId) {
    case 'title':
      return t('header-title')
    case 'employee':
      return t('header-employee')
    case 'orgUnit':
      return t('header-org-unit')
    case 'costCenter':
      return t('header-cost-center')
    case 'planId':
      return t('header-plan-id')
    case 'status':
      return t('header-status')
    case 'amount':
      return t('header-amount')
    case 'advance':
      return t('header-advance')
    case 'paymentMethod':
      return t('header-payment-method')
    case 'createdAt':
      return t('header-creation-date')
    default:
      return columnId
  }
}
