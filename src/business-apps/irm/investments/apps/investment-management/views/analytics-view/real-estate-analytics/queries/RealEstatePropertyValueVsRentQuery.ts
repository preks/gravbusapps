import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface PropertyValueVsRentData {
  propertyValue: number
  annualExpenses: number
  propertyName: string
  expenseEfficiency: number
}

/**
 * Build query for Property Value vs Annual Net Cold Rent data
 */
const BUILD_PROPERTY_VALUE_VS_RENT_QUERY = (currency: string): string => {
  return `
    query GetPropertyValueVsRent {
      Investment(
        where: {
          _and: [
            { isDeleted: { _eq: false } }
            { realEstateInvestment: {} }
            { currency: { code: { _eq: "${currency}" } } }
            { investmentMarketValue: { _gt: 0 } }
          ]
        }
      ) {
        id
        name
        code
        investmentMarketValue
        realEstateInvestment {
          annualNetColdRent
        }
      }
    }
  `
}

/**
 * Parse property value vs rent response
 */
const parsePropertyValueVsRentResponse = (data: any): PropertyValueVsRentData[] => {
  if (!data.Investment || !Array.isArray(data.Investment)) {
    return []
  }

  const propertyData: PropertyValueVsRentData[] = data.Investment.filter((inv: any) => {
    const hasRent =
      inv.realEstateInvestment?.[0]?.annualNetColdRent != null && inv.realEstateInvestment?.[0]?.annualNetColdRent > 0
    const hasValue = inv.investmentMarketValue != null && inv.investmentMarketValue > 0
    return hasRent && hasValue
  }).map((inv: any) => {
    const propertyValue = inv.investmentMarketValue
    const annualExpenses = inv.realEstateInvestment[0].annualNetColdRent
    const propertyName = inv.name || inv.code || 'Unknown Property'

    return {
      propertyValue,
      annualExpenses,
      propertyName,
      expenseEfficiency: propertyValue > 0 ? (annualExpenses / propertyValue) * 100 : 0
    }
  })

  return propertyData
}

/**
 * Fetch property value vs rent data
 */
export const fetchPropertyValueVsRent = async (
  graphqlClient: any,
  currency: string
): Promise<PropertyValueVsRentData[]> => {
  const query = BUILD_PROPERTY_VALUE_VS_RENT_QUERY(currency)

  const result = await graphqlClient.request(query)

  return parsePropertyValueVsRentResponse(result)
}

/**
 * Hook to fetch property value vs rent data
 */
export const useGetPropertyValueVsRent = (context: BusinessAppContextProps, currency: string) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchData = useCallback(async (): Promise<PropertyValueVsRentData[]> => {
    return await fetchPropertyValueVsRent(graphqlClient, currency)
  }, [graphqlClient, currency])

  return { fetchData }
}
