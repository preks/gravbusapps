// Customer Contact hooks - list and by-id operations for contacts
import { useCallback, useState, useEffect, useMemo } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

// Types
import type { CustomerContact } from '../types/customerContactTypes'

// Queries (New)
import {
  buildCustomerContactQuery,
  buildCustomerContactByIdQuery,
  buildCustomerContactSearchQuery,
  buildCustomerContactWhereCondition,
  buildCustomerContactOrderBy,
  type CustomerContactQueryVariables
} from '../queries/customerContactQueries'

// Mapper
import { toCustomerContact } from '../types/customerContactTypes'

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

// SelectOption interface for UI components
export interface SelectOption {
  id: string
  value: string
  label: string
  name: string
  extraInfo?: {
    email?: string
    jobTitle?: string
    organizationalUnit?: string
  }
}

// Options for enhanced hook functionality
export interface UseGetCustomerContactsOptions {
  withState?: boolean // Enable state management (default: false)
  autoFetch?: boolean // Auto-fetch on mount (default: false)
  pageSize?: number // Items per page (default: 20)
  mapToSelectOptions?: boolean // Transform to SelectOption[] (default: false)
}

// Return type for function-only mode (backward compatible)
interface FunctionOnlyReturn {
  fetchCustomerContacts: (variables?: CustomerContactQueryVariables) => Promise<CustomerContactListQueryResponse>
}

// Return type for stateful mode
interface StatefulReturn {
  fetchCustomerContacts: (variables?: CustomerContactQueryVariables) => Promise<CustomerContactListQueryResponse>
  options: SelectOption[] | CustomerContact[]
  loading: boolean
  error: string | null
  hasMore: boolean
  search: (searchTerm: string) => void
  loadMore: () => void
  reset: () => void
  initialize: () => void
}

/**
 * @deprecated This hook is in transition. Use `useCustomerContactsList` instead.
 * The name `useCustomerContacts` will be restored to the new declarative hook after migration.
 *
 * Legacy dual-mode hook for customer contacts (function-only or stateful).
 * Prefer the new declarative `useCustomerContactsList` hook.
 */
// Function overloads for type safety
export function useGetCustomerContacts(
  context: BusinessAppContextProps,
  options: UseGetCustomerContactsOptions & { withState: true }
): StatefulReturn

export function useGetCustomerContacts(
  context: BusinessAppContextProps,
  options?: UseGetCustomerContactsOptions
): FunctionOnlyReturn

// Implementation
export function useGetCustomerContacts(
  context: BusinessAppContextProps,
  options?: UseGetCustomerContactsOptions
): FunctionOnlyReturn | StatefulReturn {
  const { withState = false, autoFetch = false, pageSize = 20, mapToSelectOptions = false } = options || {}

  const graphqlClient = useGraphQLClient(context.accessToken)

  // State management (only used when withState=true)
  const [state, setState] = useState({
    options: [] as SelectOption[] | CustomerContact[],
    loading: false,
    error: null as string | null,
    hasMore: false,
    currentSearch: '',
    offset: 0
  })

  // Core fetch function (always available)
  const fetchCustomerContacts = useCallback(
    async (variables: CustomerContactQueryVariables = {}) => {
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

      try {
        const result = await graphqlClient.request<CustomerContactListQueryResponse>(query, graphQLVariables)

        // Transform base types to enhanced types using mapper
        const enhancedContacts = result.Contact.map(toCustomerContact)

        return {
          ...result,
          Contact: enhancedContacts
        }
      } catch (error) {
        console.error('Error fetching customer contacts:', error)
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
        const variables: CustomerContactQueryVariables = {
          limit: pageSize,
          offset
        }

        if (search.trim()) {
          variables.search = search.trim()
        }

        const result = await fetchCustomerContacts(variables)

        // Map to SelectOption or keep as CustomerContact
        const mappedData = mapToSelectOptions
          ? result.Contact.map((contact: CustomerContact) => {
              // Extract email from communicationChannels if available
              const emailChannel = contact.communicationChannels?.find(ch => ch.communicationChannel?.code === 'EMAIL')
              const email = emailChannel?.value || (contact as any).email || undefined

              return {
                id: contact.id || '',
                value: contact.id || '',
                label:
                  contact.fullName ||
                  `${contact.firstName || ''} ${contact.lastName || ''}`.trim() ||
                  'Unnamed Contact',
                name:
                  contact.fullName ||
                  `${contact.firstName || ''} ${contact.lastName || ''}`.trim() ||
                  'Unnamed Contact',
                pictureThumbnail: contact.pictureThumbnail || undefined,
                extraInfo: {
                  email,
                  jobPosition: contact.jobPosition,
                  department: contact.department,
                  organizationalUnit: contact.ownerEmployee?.displayName || 'Unknown'
                }
              } as SelectOption
            })
          : result.Contact

        const hasMoreRecords = result.Contact.length === pageSize

        setState(prev => ({
          ...prev,
          options: append ? ([...prev.options, ...mappedData] as typeof mappedData) : mappedData,
          loading: false,
          hasMore: hasMoreRecords,
          currentSearch: search,
          offset: append ? prev.offset + mappedData.length : mappedData.length
        }))
      } catch (error) {
        console.error('Error fetching customer contacts with state:', error)
        setState(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to fetch customer contacts'
        }))
      }
    },
    [context.accessToken, fetchCustomerContacts, pageSize, mapToSelectOptions]
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
      fetchCustomerContacts,
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
  return { fetchCustomerContacts }
}

/**
 * @deprecated This hook is in transition. Use `useCustomerContactsList` instead.
 * The name `useCustomerContacts` will be restored to the new declarative hook after migration.
 *
 * Legacy function-only hook for customer contacts.
 * Returns fetch functions without state management.
 */
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
      const query = buildCustomerContactByIdQuery()
      const result = await graphqlClient.request<{ ContactByPk: CustomerContact | null }>(query, { id })
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

/**
 * Declarative List Hook for Customer Contacts
 *
 * Automatically fetches and manages state for a list of customer contacts.
 * Follows the Hook Refactoring Guide Pattern 2.
 *
 * @example
 * const { contacts, loading, error, refetch } = useCustomerContactsList(context, { limit: 20 })
 *
 * @todo MIGRATION: Replace all usages of deprecated `useGetCustomerContacts` and `useCustomerContacts` with this hook
 * @todo RENAME: After migration is complete, rename this hook to `useCustomerContacts` and remove the deprecated hooks
 */
export interface UseCustomerContactsListResult {
  contacts: CustomerContact[]
  total: number
  loading: boolean
  error: string | null
  refetch: (variables?: CustomerContactQueryVariables) => Promise<void>
}

export function useCustomerContactsList(
  context: BusinessAppContextProps,
  variables?: CustomerContactQueryVariables
): UseCustomerContactsListResult {
  const graphqlClient = useGraphQLClient(context.accessToken)

  // Memoize variables to prevent infinite loops when object is recreated on each render
  const stableVariables = useMemo(() => variables, [JSON.stringify(variables)])

  const [state, setState] = useState({
    contacts: [] as CustomerContact[],
    total: 0,
    loading: true,
    error: null as string | null
  })

  const fetchContacts = useCallback(
    async (queryVariables?: CustomerContactQueryVariables) => {
      if (!context.accessToken) {
        setState(prev => ({ ...prev, loading: false }))
        return
      }

      setState(prev => ({ ...prev, loading: true, error: null }))

      try {
        const vars = { ...stableVariables, ...queryVariables }
        const query = buildCustomerContactQuery()

        const customConditions: Record<string, any>[] = []
        if (vars.hasEmail) customConditions.push({ email: { _isNull: false, _neq: '' } })
        if (vars.missingEmail) customConditions.push({ _or: [{ email: { _isNull: true } }, { email: { _eq: '' } }] })
        if (vars.hasPhone) customConditions.push({ phone: { _isNull: false, _neq: '' } })
        if (vars.missingPhone) customConditions.push({ _or: [{ phone: { _isNull: true } }, { phone: { _eq: '' } }] })

        const whereCondition = buildCustomerContactWhereCondition(vars, [], customConditions)
        const orderBy = buildCustomerContactOrderBy(vars.orderBy || [])

        const graphQLVariables: Record<string, any> = {
          limit: Math.min(vars.limit || 50, 100),
          offset: vars.offset || 0,
          where: whereCondition,
          orderBy: orderBy
        }

        const result = await graphqlClient.request<CustomerContactListQueryResponse>(query, graphQLVariables)
        const contacts = result.Contact.map(toCustomerContact)
        const total = result.ContactAggregate?.aggregate?.count || 0

        setState({ contacts, total, loading: false, error: null })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch customer contacts'

        setState(prev => ({
          ...prev,
          contacts: [],
          total: 0,
          loading: false,
          error: errorMessage
        }))
      }
    },
    [context.accessToken, graphqlClient, stableVariables]
  )

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  return {
    ...state,
    refetch: fetchContacts
  }
}
