import { useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { ContactType, ContactTypeLabels } from '@/common/data/relations/constants/contactConstants'

export interface ContactsByContactTypeItem {
  type: string
  count: number
}

export interface ContactsByContactTypeConfig {
  accountContactAggregate: 'AccountContactAggregate' | 'InvestmentAccountContactAggregate'
}

type ContactTypeAggregateResult = Record<string, { aggregate?: { count?: number } }>

export const useGenericContactsByContactType = (accessToken: string, config: ContactsByContactTypeConfig) => {
  const [data, setData] = useState<ContactsByContactTypeItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchContactsByContactType = async () => {
      if (!accessToken) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        const contactTypes = Object.values(ContactType)
        const aggregateQueries = contactTypes
          .map(
            (contactType, index) => `
              type_${index}: ${config.accountContactAggregate}(
                where: {
                  isDeleted: {_eq: false}
                  contactType: {_eq: "${contactType}"}
                }
              ) {
                aggregate { count }
              }
            `
          )
          .join('\n')

        const query = `
          query GetContactsByContactType {
            ${aggregateQueries}
          }
        `

        const result = await graphqlClient.request<ContactTypeAggregateResult>(query)
        setData(
          contactTypes.map((contactType, index) => ({
            type: ContactTypeLabels[contactType],
            count: result[`type_${index}`]?.aggregate?.count || 0
          }))
        )
      } catch (error) {
        console.error('Error fetching contacts by contact type:', error)
        setData([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchContactsByContactType()
  }, [accessToken, graphqlClient, config.accountContactAggregate])

  return { data, isLoading }
}
