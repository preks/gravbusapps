// Customer Contact hooks - list and by-id operations for contacts
import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

// Types
import type { CustomerContact } from '../types'

// Queries (New)
import {
  buildCustomerContactQuery,
  buildCustomerContactByIdQuery,
  buildCustomerContactSearchQuery,
  buildCustomerContactWhereCondition,
  buildCustomerContactOrderBy,
  type CustomerContactQueryVariables
} from '../queries/customerContactQueries.new'

// Mapper
import { toCustomerContact } from '../mappers/customerContactMappers'

export interface CustomerContactListQueryResponse {
  Contact: CustomerContact[]
  ContactAggregate: {
    aggregate: { count: number }
  }
}

export interface CustomerContactListData {
  contacts: CustomerContact[]
  total: number
}

export const useCustomerContacts = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchCustomerContacts = useCallback(
    async (variables: CustomerContactQueryVariables = {}): Promise<CustomerContactListData> => {
      const query = buildCustomerContactQuery()

      const customConditions: Record<string, any>[] = []
      if (variables.hasEmail) customConditions.push({ email: { _isNull: false, _neq: '' } })
      if (variables.missingEmail) customConditions.push({ _or: [{ email: { _isNull: true } }, { email: { _eq: '' } }] })
      if (variables.hasPhone) customConditions.push({ phone: { _isNull: false, _neq: '' } })
      if (variables.missingPhone) customConditions.push({ _or: [{ phone: { _isNull: true } }, { phone: { _eq: '' } }] })

      const whereCondition = buildCustomerContactWhereCondition(variables, [], customConditions)
      const orderBy = buildCustomerContactOrderBy(variables.orderBy || [])

      const graphQLVariables: Record<string, any> = {
        limit: Math.min(variables.limit || 50, 100),
        offset: variables.offset || 0,
        where: whereCondition,
        orderBy: orderBy
      }

      const result = await graphqlClient.request<CustomerContactListQueryResponse>(query, graphQLVariables)
      const contacts = result.Contact.map(toCustomerContact)
      const total = result.ContactAggregate?.aggregate?.count || 0
      return { contacts, total }
    },
    [graphqlClient]
  )

  const fetchCustomerContactById = useCallback(
    async (id: string): Promise<CustomerContact | null> => {
      const query = buildCustomerContactByIdQuery(undefined, undefined, id)
      const result = await graphqlClient.request<{ ContactByPk: CustomerContact | null }>(query)
      return result.ContactByPk ? toCustomerContact(result.ContactByPk) : null
    },
    [graphqlClient]
  )

  const searchCustomerContacts = useCallback(
    async (variables: CustomerContactQueryVariables): Promise<CustomerContact[]> => {
      const query = buildCustomerContactSearchQuery()
      const whereCondition = buildCustomerContactWhereCondition(variables)
      const graphQLVariables: Record<string, any> = {
        limit: Math.min(variables.limit || 50, 100),
        where: whereCondition
      }
      const result = await graphqlClient.request<{ Contact: CustomerContact[] }>(query, graphQLVariables)
      return result.Contact.map(toCustomerContact)
    },
    [graphqlClient]
  )

  return { fetchCustomerContacts, fetchCustomerContactById, searchCustomerContacts }
}
