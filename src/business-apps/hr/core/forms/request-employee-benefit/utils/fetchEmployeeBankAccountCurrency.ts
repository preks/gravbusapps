import { GraphQLClient } from 'graphql-request'
import { extractCurrencyCode } from '@/common/utils/numberFormatter'

interface EmployeeBankAccountCurrencyResult {
  currencyRef: string | null
  currencyCode: string
}

/**
 * Fetches employee's bank account currency as fallback when country currency is not available
 */
export const fetchEmployeeBankAccountCurrency = async (
  graphqlClient: GraphQLClient,
  employeeId: string,
  getEmployeeBankAccountCurrencyQuery: string
): Promise<EmployeeBankAccountCurrencyResult> => {
  try {
    const result = await graphqlClient.request<{
      EmployeeBankAccount: Array<{ currencyRef: string | null }>
    }>(getEmployeeBankAccountCurrencyQuery, { employeeId })

    const currencyRefValue = result?.EmployeeBankAccount?.[0]?.currencyRef

    if (currencyRefValue && typeof currencyRefValue === 'string') {
      return {
        currencyRef: currencyRefValue,
        currencyCode: extractCurrencyCode(currencyRefValue)
      }
    }
  } catch {
    // Silently handle bank account currency fetch errors
  }

  // Return null values - caller will use final fallback
  return { currencyRef: null, currencyCode: '' }
}
