import { TFunction } from 'i18next'
import { parseFileUpload } from './fileUploadService'
import { calculateTotalAmount } from '../../utils/calculationUtils'
import { showToast } from '@/business-apps/fin/expenses/utils/notificationUtils'

/**
 * Calculate total amount from all positions
 */
export const calculateTotal = (positions: any[]) => {
  return calculateTotalAmount(positions)
}

/**
 * Handle file upload
 */
export const handleFileUpload = async (files: File[], accessToken: string, aiGroupsAndTypes: any[], t: TFunction) => {
  if (!files || files.length === 0) {
    showToast(
      t('lowcoder:create_expense_type_item.document_upload_error_missing_files', 'No valid files to upload'),
      'error'
    )
    return null
  }

  try {
    const result = await parseFileUpload(files, accessToken, aiGroupsAndTypes, t)
    return result
  } catch {
    showToast(
      t('lowcoder:create_expense_type_item.process_error_receipt_processing', 'Error processing receipt data'),
      'error'
    )
    return null
  }
}
