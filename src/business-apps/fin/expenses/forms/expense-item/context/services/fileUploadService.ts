import { FILES_ENGINE_ENDPOINT } from '@/business-apps/fin/expenses/utils/constants'
import { showToast } from '@/business-apps/fin/expenses/utils/notificationUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

/**
 * Parse uploaded files and send them to the invoice extraction API
 * @param files Array of files to upload
 * @param accessToken Access token for API authorization
 * @param aiGroupsAndTypes Expense type definitions for AI processing
 * @param t Translation function
 * @returns API response or null if error
 */
export const parseFileUpload = async (files: File[], accessToken: string, aiGroupsAndTypes: any[]) => {
  if (!files || files.length === 0) {
    showToast(
      getTranslationFromI18nKeyAndLabel(
        'lowcoder:create_expense_type_item.document_upload_error_missing_files',
        'No valid files to upload'
      ),
      'error'
    )
    return null
  }

  try {
    const formData = new FormData()

    files.forEach(file => {
      formData.append(`file`, file)
    })

    formData.append('expense_type_definition', JSON.stringify(aiGroupsAndTypes))

    const response = await fetch(FILES_ENGINE_ENDPOINT + '/invoices/from-file', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json'
      },
      body: formData
    })

    if (!response.ok) {
      showToast(
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:create_expense_type_item.process_error_receipt_processing',
          'Error processing receipt data'
        ),
        'error'
      )
      return null
    }

    const data = await response.json()
    console.log('[Receipt AI] Raw API response from /invoices/from-file:', data)
    return data
  } catch {
    showToast(
      getTranslationFromI18nKeyAndLabel(
        'lowcoder:create_expense_type_item.process_error_receipt_processing',
        'Error processing receipt data'
      ),
      'error'
    )
    return null
  }
}
