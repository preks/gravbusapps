import { useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { ContactType, ContactTypeLabels } from '@/common/data/relations/constants/contactConstants'

export interface ContactsByContactTypeItem {
  type: string
  count: number
}

export interface ContactsByContactTypeConfig {
  accountContactAggregate: 'AccountContactAggregate' | 'InvestmentAccountContactAggregate'
  /** Contact aggregate entity (e.g. 'ContactAggregate' or 'InvestmentContactAggregate'). Used for unique-contact counting. */
  contactAggregate: 'ContactAggregate' | 'InvestmentContactAggregate'
  /** Junction field name on the Contact entity (e.g. 'accountContacts' or 'investmentAccountContact'). */
  junctionField: 'accountContacts' | 'investmentAccountContact'
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
              type_${index}: ${config.contactAggregate}(
                where: {
                  isDeleted: {_eq: false}
                  ${config.junctionField}: {
                    contactType: {_eq: "${contactType}"}
                    isDeleted: {_eq: false}
                  }
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
  }, [accessToken, graphqlClient, config.contactAggregate, config.junctionField])

  return { data, isLoading }
}
