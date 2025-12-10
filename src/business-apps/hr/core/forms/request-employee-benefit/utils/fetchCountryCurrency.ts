import { GraphQLClient } from 'graphql-request'
import { extractCurrencyCode } from '@/common/utils/numberFormatter'

interface CountryCurrencyResult {
  currencyRef: string | null
  currencyCode: string
}

interface CountryObjectValue {
  currency?: string
  defaultCurrency?: string
  currencyRef?: string
}

/**
 * Fetches country currency from catalog entry
 */
export const fetchCountryCurrency = async (
  graphqlClient: GraphQLClient,
  countryId: string,
  getCurrencyQuery: string
): Promise<CountryCurrencyResult> => {
  try {
    const countryRes = await graphqlClient.request<any>(getCurrencyQuery, { id: countryId })
    const raw = countryRes?.CatalogEntry?.[0]?.objectValue

    if (!raw) {
      return { currencyRef: null, currencyCode: '' }
    }

    const obj: CountryObjectValue = typeof raw === 'string' ? parseCountryObject(raw) : raw
    const currencyRefValue = obj?.currency || obj?.defaultCurrency || obj?.currencyRef

    if (currencyRefValue && typeof currencyRefValue === 'string') {
      return {
        currencyRef: currencyRefValue,
        currencyCode: extractCurrencyCode(currencyRefValue)
      }
    }
  } catch {
    // Ignore currency fetch errors
  }

  return { currencyRef: null, currencyCode: '' }
}

function parseCountryObject(raw: string): CountryObjectValue {
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}
