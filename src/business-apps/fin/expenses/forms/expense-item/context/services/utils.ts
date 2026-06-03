import { parseFileUpload } from './fileUploadService'
import { calculateTotalAmount } from '../../utils/calculationUtils'
import { showToast } from '@/business-apps/fin/expenses/utils/notificationUtils'

type ExpenseItemT = (key: string) => string

/**
 * Calculate total amount from all positions
 */
export const calculateTotal = (positions: any[]) => {
  return calculateTotalAmount(positions)
}

/**
 * Handle file upload
 */
export const handleFileUpload = async (
  files: File[],
  accessToken: string,
  aiGroupsAndTypes: any[],
  t: ExpenseItemT
) => {
  if (!files || files.length === 0) {
    showToast(t('expense-item-error-missing-files'), 'error')
    return null
  }

  try {
    const result = await parseFileUpload(files, accessToken, aiGroupsAndTypes, t)
    return result
  } catch {
    showToast(t('expense-item-error-receipt-processing'), 'error')
    return null
  }
}
