import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

// Define types
interface ExpenseGroupCatalogEntry {
  id: string
  name: string
  description?: string
}

interface UseExpenseGroupCatalogResult {
  isLoading: boolean
  error: string | null
  expenseGroups: Record<string, ExpenseGroupCatalogEntry>
}

interface ExpenseGroupResponse {
  id: string
  name?: string
  description?: string
  translations?: Array<{
    name?: string
    description?: string
  }>
}

// GraphQL query to fetch expense group catalog entries
const GET_EXPENSE_GROUPS = `
  query GetExpenseGroups($activeUserLocale: String) {
    expenseGroups: CatalogEntry(
      where: {
        catalog: {
          version: { _eq: "v1" },
          identifier: { _eq: "ExpenseGroup" }
        }
      }
    ) {
      id
      name: additionalValue1
      description: additionalValue2
      translations(where: { localeCode: { _eq: $activeUserLocale } }) {
        name: additionalValue1
        description: additionalValue2
      }
    }
  }
`

/**
 * Hook to fetch expense group catalog entries
 */
export const useExpenseGroupCatalog = (accessToken: string): UseExpenseGroupCatalogResult => {
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [expenseGroups, setExpenseGroups] = useState<Record<string, ExpenseGroupCatalogEntry>>({})

  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchExpenseGroups = async () => {
      if (!accessToken || !graphqlClient) {
        setError('Missing authentication token')
        setIsLoading(false)
        return
      }

      try {
        // Get current user locale
        const activeUserLocale = globalThis.localStorage?.getItem?.('activeUserLocale') || 'en'

        const response = await graphqlClient.request(GET_EXPENSE_GROUPS, { activeUserLocale })

        if (response?.expenseGroups) {
          // Create a map of id -> catalog entry
          const groupsMap: Record<string, ExpenseGroupCatalogEntry> = {}

          for (const group of response.expenseGroups as ExpenseGroupResponse[]) {
            // Use translated name if available, otherwise use default name
            const translatedName = group.translations?.[0]?.name
            const translatedDescription = group.translations?.[0]?.description

            // Create a single entry object and assign it to multiple keys to
            // avoid memory duplication while keeping O(1) lookups by alias.
            const entry: ExpenseGroupCatalogEntry = {
              id: group.id,
              name: translatedName || group.name || group.id,
              description: translatedDescription || group.description
            }
            // Store by ID for direct lookups
            groupsMap[group.id] = entry

            // Also store by reference format mapped by CODE (additionalValue1/name), not DB id
            // Example incoming ref: ExpenseGroup:v1:ACCOMMODATION
            const codeKey = (group.name || '').trim().toUpperCase().replaceAll(/\s+/g, '_')

            // Only store ref/CODE keys when we have a non-empty code
            if (codeKey) {
              const refKey = `ExpenseGroup:v1:${codeKey}`
              groupsMap[refKey] = entry

              // Store by plain CODE as well for convenience lookups
              groupsMap[codeKey] = entry
            }
          }

          // Add special case for uncategorized
          groupsMap['Uncategorized'] = {
            id: 'Uncategorized',
            name: 'Uncategorized',
            description: 'Uncategorized expenses'
          }

          setExpenseGroups(groupsMap)
        }
      } catch {
        setError('Failed to fetch expense categories')
      } finally {
        setIsLoading(false)
      }
    }

    fetchExpenseGroups()
  }, [accessToken, graphqlClient])

  return { isLoading, error, expenseGroups }
}
