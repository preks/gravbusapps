import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface GeographicData {
  country: string
  accounts: number
  opportunities: number
  totalValue: number
  wonValue: number
}

export const useGeographicDistribution = (accessToken: string) => {
  const [geographicData, setGeographicData] = useState<GeographicData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchGeographicDistribution = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const query = `
          query GetGeographicDistribution {
            accounts: InvestmentAccount(
              where: {
                isDeleted: {_eq: false},
                investmentAddress: {
                  addressType: { _eq: PRIMARY_ADDRESS },
                  country: { value: { _isNull: false } }
                }
              }
            ) {
              id
              name
              investmentAddress(where: { addressType: { _eq: PRIMARY_ADDRESS } }) {
                country { id value }
                locality
                addressLine
                addressType
              }
            }
          }
        `

        const result = await graphqlClient.request(query)
        // Process account data by country
        const countryMap = new Map<string, GeographicData>()

        result.accounts.forEach((account: any) => {
          const primaryAddress = (account.investmentAddress || []).find(
            (addr: any) => addr.addressType === 'PRIMARY_ADDRESS' && addr.country?.value
          )
          const country = primaryAddress?.country?.value

          if (country) {
            if (!countryMap.has(country)) {
              countryMap.set(country, {
                country,
                accounts: 0,
                opportunities: 0, // Will be 0 since we're only counting accounts
                totalValue: 0, // Will be 0 since we're only counting accounts
                wonValue: 0 // Will be 0 since we're only counting accounts
              })
            }
            countryMap.get(country)!.accounts++
          }
        })

        // Convert to array and sort by account count
        const geographicArray = Array.from(countryMap.values())
          .sort((a, b) => b.accounts - a.accounts)
          .slice(0, 10) // Top 10 countries

        setGeographicData(geographicArray)
      } catch (err) {
        // console.error("Error fetching geographic distribution:", err);
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    if (accessToken) {
      fetchGeographicDistribution()
    }
  }, [accessToken, graphqlClient])

  return { geographicData, isLoading, error }
}
