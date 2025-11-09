// Investment Contact hooks - CRM contact entity operations
import { useCallback, useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type {
  InvestmentContact,
  InvestmentTask,
  BaseInvestmentActivity,
  BaseInvestmentNote,
  BaseInvestmentDocument
} from '../types'

// Use the new query builders
import {
  buildInvestmentContactQuery,
  buildInvestmentContactByIdQuery,
  buildInvestmentContactWhereCondition,
  buildInvestmentContactOrderBy,
  type InvestmentContactQueryVariables
} from '../queries/investmentContactQueries.new'

// Import related-entity queries from new file
import {
  GET_INVESTMENT_TASKS_BY_CONTACT_ID,
  GET_INVESTMENT_ACTIVITIES_BY_CONTACT_ID,
  GET_INVESTMENT_NOTES_BY_CONTACT_ID,
  GET_INVESTMENT_DOCUMENTS_BY_CONTACT_ID
} from '../queries/investmentContactQueries.new'

// Import where/orderBy builders for related entities
import { buildInvestmentTaskWhereCondition, buildInvestmentTaskOrderBy } from '../queries/investmentTaskQueries.new'
import {
  buildInvestmentActivityWhereCondition,
  buildInvestmentActivityOrderBy
} from '../queries/investmentActivityQueries.new'
import { buildInvestmentNoteWhereCondition, buildInvestmentNoteOrderBy } from '../queries/investmentNoteQueries.new'
import {
  buildInvestmentDocumentWhereCondition,
  buildInvestmentDocumentOrderBy
} from '../queries/investmentDocumentQueries.new'

// Use the mapper function
import {
  toInvestmentContact,
  toInvestmentTask,
  toInvestmentActivity,
  toInvestmentNote,
  toInvestmentDocument
} from '../mappers'

// Note: InvestmentContactQueryVariables is imported from queries

// Response interfaces
export interface InvestmentContactQueryResponse {
  InvestmentContact: InvestmentContact[]
  InvestmentContactAggregate: {
    aggregate: {
      count: number
    }
  }
}

export interface InvestmentContactByIdData {
  contact?: InvestmentContact
}

// SelectOption interface for UI components
export interface SelectOption {
  id: string
  value: string
  label: string
  name: string
  extraInfo?: {
    email?: string
    jobPosition?: string
    organizationalUnit?: string
  }
}

// Options for enhanced hook functionality
export interface UseGetInvestmentContactsOptions {
  withState?: boolean // Enable state management (default: false)
  autoFetch?: boolean // Auto-fetch on mount (default: false)
  pageSize?: number // Items per page (default: 20)
  mapToSelectOptions?: boolean // Transform to SelectOption[] (default: false)
}

// Return type for function-only mode (backward compatible)
interface FunctionOnlyReturn {
  fetchInvestmentContacts: (variables?: InvestmentContactQueryVariables) => Promise<InvestmentContactQueryResponse>
}

// Return type for stateful mode
interface StatefulReturn {
  fetchInvestmentContacts: (variables?: InvestmentContactQueryVariables) => Promise<InvestmentContactQueryResponse>
  options: SelectOption[] | InvestmentContact[]
  loading: boolean
  error: string | null
  hasMore: boolean
  search: (searchTerm: string) => void
  loadMore: () => void
  reset: () => void
  initialize: () => void
}

// Function overloads for type safety
export function useGetInvestmentContacts(
  context: BusinessAppContextProps,
  options: UseGetInvestmentContactsOptions & { withState: true }
): StatefulReturn

export function useGetInvestmentContacts(
  context: BusinessAppContextProps,
  options?: UseGetInvestmentContactsOptions
): FunctionOnlyReturn

// Implementation
export function useGetInvestmentContacts(
  context: BusinessAppContextProps,
  options?: UseGetInvestmentContactsOptions
): FunctionOnlyReturn | StatefulReturn {
  const { withState = false, autoFetch = false, pageSize = 20, mapToSelectOptions = false } = options || {}

  const graphqlClient = useGraphQLClient(context.accessToken)

  // State management (only used when withState=true)
  const [state, setState] = useState({
    options: [] as SelectOption[] | InvestmentContact[],
    loading: false,
    error: null as string | null,
    hasMore: false,
    currentSearch: '',
    offset: 0
  })

  // Core fetch function (always available)
  const fetchInvestmentContacts = useCallback(
    async (variables: InvestmentContactQueryVariables = {}) => {
      const query = buildInvestmentContactQuery()

      const customConditions: Record<string, any>[] = []
      if (variables.hasEmail) customConditions.push({ email: { _isNull: false, _neq: '' } })
      if (variables.missingEmail) customConditions.push({ _or: [{ email: { _isNull: true } }, { email: { _eq: '' } }] })
      if (variables.hasPhone) customConditions.push({ phone: { _isNull: false, _neq: '' } })
      if (variables.missingPhone) customConditions.push({ _or: [{ phone: { _isNull: true } }, { phone: { _eq: '' } }] })

      const whereCondition = buildInvestmentContactWhereCondition(variables, [], customConditions)

      const orderBy = buildInvestmentContactOrderBy(variables.orderBy || [])

      const graphQLVariables: Record<string, any> = {
        limit: Math.min(variables.limit || 50, 100),
        offset: variables.offset || 0,
        where: whereCondition,
        orderBy: orderBy
      }

      try {
        const result = await graphqlClient.request<InvestmentContactQueryResponse>(query, graphQLVariables)

        // Transform base types to enhanced types using mapper
        const enhancedContacts = result.InvestmentContact.map(toInvestmentContact)

        return {
          ...result,
          InvestmentContact: enhancedContacts
        }
      } catch (error) {
        console.error('Error fetching investment contacts:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  // Stateful fetch function (only used when withState=true)
  const fetchContactsWithState = useCallback(
    async (search: string = '', offset: number = 0, append: boolean = false) => {
      if (!context.accessToken) return

      setState(prev => ({
        ...prev,
        loading: true,
        error: null,
        ...(append ? {} : { options: [] })
      }))

      try {
        const variables: InvestmentContactQueryVariables = {
          limit: pageSize,
          offset
        }

        if (search.trim()) {
          variables.search = search.trim()
        }

        const result = await fetchInvestmentContacts(variables)

        // Map to SelectOption or keep as InvestmentContact
        const mappedData = mapToSelectOptions
          ? result.InvestmentContact.map((contact: InvestmentContact) => ({
              id: contact.id,
              value: contact.id,
              label: contact.fullName || `${contact.firstName} ${contact.lastName}`,
              name: contact.fullName || `${contact.firstName} ${contact.lastName}`,
              extraInfo: {
                email: contact.email,
                jobPosition: contact.jobPosition,
                organizationalUnit: contact.ownerEmployee?.displayName || 'Unknown'
              }
            }))
          : result.InvestmentContact

        const hasMoreRecords = result.InvestmentContact.length === pageSize

        setState(prev => ({
          ...prev,
          options: append ? ([...prev.options, ...mappedData] as typeof mappedData) : mappedData,
          loading: false,
          hasMore: hasMoreRecords,
          currentSearch: search,
          offset: append ? prev.offset + mappedData.length : mappedData.length
        }))
      } catch (error) {
        console.error('Error fetching investment contacts with state:', error)
        setState(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to fetch investment contacts'
        }))
      }
    },
    [context.accessToken, fetchInvestmentContacts, pageSize, mapToSelectOptions]
  )

  // Search function (only used when withState=true)
  const search = useCallback(
    (searchTerm: string) => {
      fetchContactsWithState(searchTerm, 0, false)
    },
    [fetchContactsWithState]
  )

  // Load more function (only used when withState=true)
  const loadMore = useCallback(() => {
    if (state.hasMore && !state.loading) {
      fetchContactsWithState(state.currentSearch, state.offset, true)
    }
  }, [fetchContactsWithState, state.hasMore, state.loading, state.currentSearch, state.offset])

  // Reset function (only used when withState=true)
  const reset = useCallback(() => {
    setState({
      options: [],
      loading: false,
      error: null,
      hasMore: false,
      currentSearch: '',
      offset: 0
    })
  }, [])

  // Initialize function (only used when withState=true)
  const initialize = useCallback(() => {
    fetchContactsWithState('', 0, false)
  }, [fetchContactsWithState])

  // Auto-fetch on mount (only when withState=true and autoFetch=true)
  useEffect(() => {
    if (withState && autoFetch && context.accessToken) {
      initialize()
    }
  }, [withState, autoFetch, context.accessToken, initialize])

  // Return appropriate interface based on withState flag
  if (withState) {
    return {
      fetchInvestmentContacts,
      options: state.options,
      loading: state.loading,
      error: state.error,
      hasMore: state.hasMore,
      search,
      loadMore,
      reset,
      initialize
    }
  }

  // Backward compatible: return only the fetch function
  return { fetchInvestmentContacts }
}

// Simplified hook alias for ContactView compatibility
export const useInvestmentContacts = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentContacts = useCallback(
    async (
      variables: InvestmentContactQueryVariables = {}
    ): Promise<{ contacts: InvestmentContact[]; total: number }> => {
      const query = buildInvestmentContactQuery()

      const customConditions: Record<string, any>[] = []
      if (variables.hasEmail) customConditions.push({ email: { _isNull: false, _neq: '' } })
      if (variables.missingEmail) customConditions.push({ _or: [{ email: { _isNull: true } }, { email: { _eq: '' } }] })
      if (variables.hasPhone) customConditions.push({ phone: { _isNull: false, _neq: '' } })
      if (variables.missingPhone) customConditions.push({ _or: [{ phone: { _isNull: true } }, { phone: { _eq: '' } }] })

      const whereCondition = buildInvestmentContactWhereCondition(variables, [], customConditions)

      const orderBy = buildInvestmentContactOrderBy(variables.orderBy || [])

      const graphQLVariables: Record<string, any> = {
        limit: Math.min(variables.limit || 50, 100),
        offset: variables.offset || 0,
        where: whereCondition,
        orderBy: orderBy
      }

      try {
        const result = await graphqlClient.request<InvestmentContactQueryResponse>(query, graphQLVariables)
        const contacts = result.InvestmentContact.map(toInvestmentContact)
        const total = result.InvestmentContactAggregate?.aggregate?.count || 0
        return { contacts, total }
      } catch (error) {
        console.error('Error fetching investment contacts:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchInvestmentContacts }
}

// Hook for getting investment contact by ID
export const useGetInvestmentContactById = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentContactById = useCallback(
    async (id: string) => {
      const query = buildInvestmentContactByIdQuery(undefined, undefined, id)

      try {
        const result = await graphqlClient.request<{ InvestmentContactByPk: InvestmentContact | null }>(query)

        return {
          contact: result.InvestmentContactByPk ? toInvestmentContact(result.InvestmentContactByPk) : undefined
        } as InvestmentContactByIdData
      } catch (error) {
        console.error('Error fetching investment contact by ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchInvestmentContactById }
}

// Hook for searching investment contacts
export const useSearchInvestmentContacts = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const searchInvestmentContacts = useCallback(
    async (searchTerm: string, variables: InvestmentContactQueryVariables = {}) => {
      const query = buildInvestmentContactQuery()

      const searchVariables = { ...variables, search: searchTerm }
      const customConditions: Record<string, any>[] = []
      if (searchVariables.hasEmail) customConditions.push({ email: { _isNull: false, _neq: '' } })
      if (searchVariables.missingEmail)
        customConditions.push({ _or: [{ email: { _isNull: true } }, { email: { _eq: '' } }] })
      if (searchVariables.hasPhone) customConditions.push({ phone: { _isNull: false, _neq: '' } })
      if (searchVariables.missingPhone)
        customConditions.push({ _or: [{ phone: { _isNull: true } }, { phone: { _eq: '' } }] })

      const whereCondition = buildInvestmentContactWhereCondition(
        undefined, // Use default InvestmentContactFields
        searchVariables,
        [],
        customConditions
      )

      const orderBy = buildInvestmentContactOrderBy(
        undefined, // Use default InvestmentContactFields
        searchVariables.orderBy || []
      )

      const graphQLVariables: Record<string, any> = {
        limit: Math.min(searchVariables.limit || 50, 100),
        offset: searchVariables.offset || 0,
        where: whereCondition,
        orderBy: orderBy
      }

      try {
        const result = await graphqlClient.request<InvestmentContactQueryResponse>(query, graphQLVariables)

        // Transform base types to enhanced types using mapper
        const enhancedContacts = result.InvestmentContact.map(toInvestmentContact)

        return {
          ...result,
          InvestmentContact: enhancedContacts
        }
      } catch (error) {
        console.error('Error searching investment contacts:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { searchInvestmentContacts }
}

// =====================================================
// INVESTMENT CONTACT RELATED ENTITIES HOOKS
// =====================================================

// Hook for getting investment tasks by contact ID
export const useGetInvestmentTasksByContactId = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentTasksByContactId = useCallback(
    async (contactId: string) => {
      const query = GET_INVESTMENT_TASKS_BY_CONTACT_ID()
      const whereCondition = buildInvestmentTaskWhereCondition(
        {},
        [],
        [{ contact: { id: { _eq: contactId } }, isDeleted: { _eq: false } }]
      )
      const orderBy = buildInvestmentTaskOrderBy([{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }])

      const graphQLVariables = {
        where: whereCondition,
        orderBy: orderBy
      }

      try {
        const result = await graphqlClient.request<{ InvestmentTask: InvestmentTask[] }>(query, graphQLVariables)
        return result.InvestmentTask.map(toInvestmentTask)
      } catch (error) {
        console.error('Error fetching investment tasks by contact ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchInvestmentTasksByContactId }
}

// Hook for getting investment activities by contact ID
export const useGetInvestmentActivitiesByContactId = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentActivitiesByContactId = useCallback(
    async (contactId: string) => {
      const query = GET_INVESTMENT_ACTIVITIES_BY_CONTACT_ID()
      const whereCondition = buildInvestmentActivityWhereCondition(
        {},
        [],
        [{ contact: { id: { _eq: contactId } }, isDeleted: { _eq: false } }]
      )
      const orderBy = buildInvestmentActivityOrderBy([{ field: 'occurredAt', direction: 'DESC_NULLS_LAST' }])

      const graphQLVariables = {
        where: whereCondition,
        orderBy: orderBy
      }

      try {
        const result = await graphqlClient.request<{ InvestmentActivity: BaseInvestmentActivity[] }>(
          query,
          graphQLVariables
        )
        return result.InvestmentActivity.map(toInvestmentActivity)
      } catch (error) {
        console.error('Error fetching investment activities by contact ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchInvestmentActivitiesByContactId }
}

// Hook for getting investment notes by contact ID
export const useGetInvestmentNotesByContactId = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentNotesByContactId = useCallback(
    async (contactId: string) => {
      const query = GET_INVESTMENT_NOTES_BY_CONTACT_ID()
      const whereCondition = buildInvestmentNoteWhereCondition(
        {},
        [],
        [{ contact: { id: { _eq: contactId } }, isDeleted: { _eq: false } }]
      )
      const orderBy = buildInvestmentNoteOrderBy([{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }])

      const graphQLVariables = {
        where: whereCondition,
        orderBy: orderBy
      }

      try {
        const result = await graphqlClient.request<{ InvestmentNote: BaseInvestmentNote[] }>(query, graphQLVariables)
        return result.InvestmentNote.map(toInvestmentNote)
      } catch (error) {
        console.error('Error fetching investment notes by contact ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchInvestmentNotesByContactId }
}

// Hook for getting investment documents by contact ID
export const useGetInvestmentDocumentsByContactId = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentDocumentsByContactId = useCallback(
    async (contactId: string) => {
      const query = GET_INVESTMENT_DOCUMENTS_BY_CONTACT_ID()
      const whereCondition = buildInvestmentDocumentWhereCondition(
        {},
        [],
        [{ contact: { id: { _eq: contactId } }, isDeleted: { _eq: false } }]
      )
      const orderBy = buildInvestmentDocumentOrderBy([{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }])

      const graphQLVariables = {
        where: whereCondition,
        orderBy: orderBy
      }

      try {
        const result = await graphqlClient.request<{ InvestmentDocument: BaseInvestmentDocument[] }>(
          query,
          graphQLVariables
        )
        return result.InvestmentDocument.map(toInvestmentDocument)
      } catch (error) {
        console.error('Error fetching investment documents by contact ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchInvestmentDocumentsByContactId }
}
