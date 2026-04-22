/**
 * Fallback submission path for investment contacts when the bulk endpoint
 * (`createInvestmentContacts`) is missing. Each contact is posted through the
 * singular `createInvestmentContact` endpoint, and the results are merged
 * into a single `ImportResult`. Aborts early on systemic marshalling or
 * endpoint failures to avoid dozens of repeated calls.
 */

import type { useRestClient } from '@/common/network/rest/useRestClient'
import type { ImportResult } from '@/common/components/common-relations/apps/data-import/types'
import { extractErrorMessage } from '../shared'

export function shouldFallbackToSingularInvestmentContactEndpoint(error: unknown): boolean {
  const message = extractErrorMessage(error).toLowerCase()
  return (
    /no static resource createinvestmentcontacts/i.test(message) ||
    (message.includes('404') && message.includes('createinvestmentcontacts'))
  )
}

export async function submitInvestmentContactsWithFallback(
  restClient: ReturnType<typeof useRestClient>,
  accessToken: string | undefined,
  contacts: Record<string, any>[]
): Promise<ImportResult> {
  let successCount = 0
  const errors: ImportResult['errors'] = []
  const createdIds: string[] = []

  for (let idx = 0; idx < contacts.length; idx += 1) {
    const investmentContact = contacts[idx]
    try {
      const response = await restClient.post(
        '/investment-relations/createInvestmentContact',
        { investmentContact, changeMode: 'INSERT' },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )

      const validationErrors = response?.validationResponse?.errors
      if (Array.isArray(validationErrors) && validationErrors.length > 0) {
        errors.push({
          rowIndex: idx,
          entityData: investmentContact,
          error: `${validationErrors[0]?.code || 'ERROR'}: ${validationErrors[0]?.detail || 'Validation failure'}`
        })
        continue
      }

      successCount += 1
      if (typeof response?.investmentContact?.id === 'string') {
        createdIds.push(response.investmentContact.id)
      }
    } catch (error) {
      const message = extractErrorMessage(error)
      errors.push({
        rowIndex: idx,
        entityData: investmentContact,
        error: message
      })
      if (
        /error while marshalling process instance/i.test(message.toLowerCase()) ||
        /no static resource createinvestmentcontact/i.test(message.toLowerCase())
      ) {
        break
      }
    }
  }

  return {
    success: errors.length === 0 && successCount > 0,
    successCount,
    errorCount: errors.length,
    errors,
    createdIds
  }
}
