import { useMemo } from 'react'
import { useGraphqlClient } from '../graphql/useGraphQLClient'

// Query for expense request types and transportation means
export const expenseTypeAndTransportationQuery = `
  query fetchCatalogEntries($activeUserLocale: String) {
    expenseRequestType: CatalogEntry(
      where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "ExpenseRequestType"}}, isDeleted: {_eq: false}},
      limit: 20
    ) {
      id
      value
      translations(where: {localeCode: {_eq: $activeUserLocale}}) {
        localeCode
        value
      }
      catalog {
        defaultLocale
      }
      code
      additionalValue1
    }
    expenseTransportationMeans: CatalogEntry(
      where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "ExpenseTransportMean"}}, isDeleted: {_eq: false}},
      limit: 20
    ) {
      id
      value
      translations(where: {localeCode: {_eq: $activeUserLocale}}) {
        localeCode
        value
      }
      catalog {
        defaultLocale
      }
      code
      additionalValue1
    }
  }
`

export const useExpenseTypeAndTransportation = (accessToken: string, activeUserLocale: string) => {
  const graphQLClient = useGraphqlClient(accessToken)

  const fetchCatalogEntries = useMemo(
    () => async () => {
      try {
        const data = await graphQLClient.request(expenseTypeAndTransportationQuery, { activeUserLocale })

        return data
      } catch (error) {
        console.error('Error fetching catalog entries:', error)
        throw error
      }
    },
    [graphQLClient, activeUserLocale, accessToken]
  )

  return fetchCatalogEntries
}
