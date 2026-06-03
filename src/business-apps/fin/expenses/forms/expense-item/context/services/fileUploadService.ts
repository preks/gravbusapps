import { FILES_ENGINE_ENDPOINT } from '@/business-apps/fin/expenses/utils/constants'
import { showToast } from '@/business-apps/fin/expenses/utils/notificationUtils'

type ExpenseItemT = (key: string) => string

/**
 * Parse uploaded files and send them to the invoice extraction API
 */
export const parseFileUpload = async (files: File[], accessToken: string, aiGroupsAndTypes: any[], t: ExpenseItemT) => {
  if (!files || files.length === 0) {
    showToast(t('expense-item-error-missing-files'), 'error')
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
      showToast(t('expense-item-error-receipt-processing'), 'error')
      return null
    }

    const data = await response.json()
    return data
  } catch {
    showToast(t('expense-item-error-receipt-processing'), 'error')
    return null
  }
}
