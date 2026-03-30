export {
  ExpenseStatus,
  type StatusDisplayConfig,
  type StatusBadgeVariant,
  getEntityStatusDisplay,
  getExpenseItemStatusDisplay,
  getExpensePlanStatusDisplay,
  getExpenseRequestStatusDisplay,
  getAdvancePaymentStatusDisplay,
  getExpenseRequestStatusFilterLabel,
  getAdvancePaymentStatusFilterLabel,
  getExpensePlanStatusFilterLabel
} from '../../common/utils/statusDisplayUtils'

export { formatCurrencyDisplay } from '../../common/utils/formatCurrency'

const isErrorWithMessage = (err: unknown): err is { message: string } => {
  return (
    err !== null &&
    typeof err === 'object' &&
    'message' in err &&
    typeof (err as Record<string, unknown>).message === 'string'
  )
}

export const getNormalizedErrorMessage = (err: unknown): string => {
  if (typeof err === 'string') return err
  if (isErrorWithMessage(err)) {
    return err.message
  }
  return 'An unknown error occurred'
}
