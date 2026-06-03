import { useState, useCallback } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { LegalEntityOption } from '../types/benefitsMaintenanceTypes'

interface UseLegalEntityOptionsProps {
  accessToken: string
}

const GET_ACTIVE_STRUCTURE = `
  query GetActiveStructure {
    Structure(where: { isActive: { _eq: true } }, limit: 1) {
      id
    }
  }
`

const GET_STRUCTURE_COMPANIES = `
  query GetStructureCompanies($structureId: uuid!) {
    Company(
      where: {
        structureId: { _eq: $structureId }
        isDeleted: { _eq: false }
      }
    ) {
      id
      name
      code
      currencyRef
      addresses(where: { isDeleted: { _eq: false } }) {
        countryRef
        country {
          id
          code
          value
          objectValue
        }
      }
    }
  }
`

interface StructureResult {
  Structure: Array<{ id: string }>
}

interface CompanyResult {
  Company: Array<{
    id: string
    name: string
    code?: string
    currencyRef?: string
    addresses: Array<{
      countryRef?: string
      country?: {
        id: string
        code: string
        value: string
        objectValue?: Record<string, any> | string
      }
    }>
  }>
}

function extractCurrency(objectValue?: Record<string, any> | string, companyCurrencyRef?: string): string {
  if (objectValue) {
    const obj =
      typeof objectValue === 'string'
        ? (() => {
            try {
              return JSON.parse(objectValue)
            } catch {
              return {}
            }
          })()
        : objectValue
    const ref = obj?.currency || obj?.defaultCurrency || obj?.currencyRef
    if (ref && typeof ref === 'string') {
      return ref.split(':').pop() || ''
    }
  }
  if (companyCurrencyRef) {
    return companyCurrencyRef.split(':').pop() || ''
  }
  return ''
}

export function useLegalEntityOptions({ accessToken }: UseLegalEntityOptionsProps) {
  const [legalEntities, setLegalEntities] = useState<LegalEntityOption[]>([])
  const [loading, setLoading] = useState(false)

  const graphqlClient = useGraphqlClient(accessToken)

  const fetchLegalEntities = useCallback(async () => {
    setLoading(true)
    try {
      const structureResult = await graphqlClient.request<StructureResult>(GET_ACTIVE_STRUCTURE)
      const structureId = structureResult.Structure?.[0]?.id
      if (!structureId) {
        setLegalEntities([])
        return
      }

      const result = await graphqlClient.request<CompanyResult>(GET_STRUCTURE_COMPANIES, { structureId })

      const entities: LegalEntityOption[] = []
      for (const company of result.Company ?? []) {
        const address = company.addresses?.[0]
        const country = address?.country
        entities.push({
          id: company.id,
          name: company.name,
          code: company.code || '',
          countryCode: country?.code || '',
          countryRef: country?.id || address?.countryRef || '',
          countryName: country?.value || '',
          currency: extractCurrency(country?.objectValue, company.currencyRef)
        })
      }

      const sortedEntities = entities.toSorted((a, b) => a.name.localeCompare(b.name))
      setLegalEntities(sortedEntities)
    } catch (err) {
      console.error('Failed to load legal entities:', err)
      setLegalEntities([])
    } finally {
      setLoading(false)
    }
  }, [graphqlClient])

  return { legalEntities, loading, fetchLegalEntities }
}

export default useLegalEntityOptions
