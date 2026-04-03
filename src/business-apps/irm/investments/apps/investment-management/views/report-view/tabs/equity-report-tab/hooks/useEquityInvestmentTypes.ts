import { useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface EquityInvestmentType {
  id: string
  code: string
  value: string
  additionalValue1: string | null
  displayOrder: number
}

const GET_EQUITY_INVESTMENT_TYPES = `
  query GetEquityInvestmentTypes {
    CatalogEntry(
      where: {
        isDeleted: { _eq: false }
        catalog: { name: { _eq: "Investment Type" } }
        parentEntryId: { _eq: "InvestmentGroup:v1:EQUITY" }
      }
      limit: 50
    ) {
      id
      code
      value
      additionalValue1
      parentEntryId
      catalog {
        name
      }
    }
  }
`

export const useEquityInvestmentTypes = (accessToken: string) => {
  const [investmentTypes, setInvestmentTypes] = useState<EquityInvestmentType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const graphQLClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchInvestmentTypes = async () => {
      try {
        setLoading(true)
        setError(null)

        const result = await graphQLClient.request(GET_EQUITY_INVESTMENT_TYPES)

        if (result?.CatalogEntry) {
          // Transform and sort by additionalValue1 (display order)
          const types: EquityInvestmentType[] = result.CatalogEntry.map((entry: any) => ({
            id: entry.id,
            code: entry.code,
            value: entry.value,
            additionalValue1: entry.additionalValue1,
            displayOrder: Number.parseInt(entry.additionalValue1 || '0', 10)
          })).sort((a: EquityInvestmentType, b: EquityInvestmentType) => a.displayOrder - b.displayOrder)

          setInvestmentTypes(types)
          setError(null)
        } else {
          setInvestmentTypes([])
        }
      } catch (err) {
        console.error('Error fetching equity investment types:', err)
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
        setError(`Failed to load equity investment types: ${errorMessage}`)
        setInvestmentTypes([])
      } finally {
        setLoading(false)
      }
    }

    if (accessToken) {
      fetchInvestmentTypes()
    } else {
      setLoading(false)
      setError('No access token available')
    }
  }, [accessToken, graphQLClient])

  return { investmentTypes, loading, error }
}
