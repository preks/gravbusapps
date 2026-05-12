// Customer Contact hooks - list and by-id operations for contacts
import { useCallback, useState, useEffect, useMemo, useRef } from 'react'
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

/**
 * Builds custom GraphQL conditions for customer contact filters that map to
 * presence / absence / membership constraints (email, phone, names, account link,
 * contact types). Kept as a flat helper to keep callers under the cognitive
 * complexity threshold.
 */
function buildCustomerContactCustomConditions(
  variables: CustomerContactQueryVariables & {
    hasEmail?: boolean
    missingEmail?: boolean
    hasPhone?: boolean
    missingPhone?: boolean
    hasFirstName?: boolean
    missingFirstName?: boolean
    hasLastName?: boolean
    missingLastName?: boolean
    hasAccountLink?: boolean
    missingAccountLink?: boolean
    contactTypes?: string[]
  }
): Record<string, any>[] {
  const conditions: Record<string, any>[] = []

  if (variables.hasEmail) conditions.push({ email: { _isNull: false, _neq: '' } })
  if (variables.missingEmail) conditions.push({ _or: [{ email: { _isNull: true } }, { email: { _eq: '' } }] })
  if (variables.hasPhone) conditions.push({ phone: { _isNull: false, _neq: '' } })
  if (variables.missingPhone) conditions.push({ _or: [{ phone: { _isNull: true } }, { phone: { _eq: '' } }] })
  if (variables.hasFirstName) conditions.push({ firstName: { _isNull: false, _neq: '' } })
  if (variables.missingFirstName)
    conditions.push({ _or: [{ firstName: { _isNull: true } }, { firstName: { _eq: '' } }] })
  if (variables.hasLastName) conditions.push({ lastName: { _isNull: false, _neq: '' } })
  if (variables.missingLastName) conditions.push({ _or: [{ lastName: { _isNull: true } }, { lastName: { _eq: '' } }] })
  if (variables.hasAccountLink) conditions.push({ accountContacts: { isDeleted: { _eq: false } } })
  if (variables.missingAccountLink) conditions.push({ _not: { accountContacts: { isDeleted: { _eq: false } } } })
  if (variables.contactTypes?.length) {
    conditions.push({
      accountContacts: { contactType: { _in: variables.contactTypes }, isDeleted: { _eq: false } }
    })
  }

  return conditions
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
      if (variables.hasFirstName) customConditions.push({ firstName: { _isNull: false, _neq: '' } })
      if (variables.missingFirstName)
        customConditions.push({ _or: [{ firstName: { _isNull: true } }, { firstName: { _eq: '' } }] })
      if (variables.hasLastName) customConditions.push({ lastName: { _isNull: false, _neq: '' } })
      if (variables.missingLastName)
        customConditions.push({ _or: [{ lastName: { _isNull: true } }, { lastName: { _eq: '' } }] })
      if (variables.hasAccountLink) customConditions.push({ accountContacts: { isDeleted: { _eq: false } } })
      if (variables.missingAccountLink)
        customConditions.push({ _not: { accountContacts: { isDeleted: { _eq: false } } } })

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
      if (variables.hasFirstName) customConditions.push({ firstName: { _isNull: false, _neq: '' } })
      if (variables.missingFirstName)
        customConditions.push({ _or: [{ firstName: { _isNull: true } }, { firstName: { _eq: '' } }] })
      if (variables.hasLastName) customConditions.push({ lastName: { _isNull: false, _neq: '' } })
      if (variables.missingLastName)
        customConditions.push({ _or: [{ lastName: { _isNull: true } }, { lastName: { _eq: '' } }] })
      if (variables.hasAccountLink) customConditions.push({ accountContacts: { isDeleted: { _eq: false } } })
      if (variables.missingAccountLink)
        customConditions.push({ _not: { accountContacts: { isDeleted: { _eq: false } } } })
      if (variables.contactTypes?.length) {
        customConditions.push({
          accountContacts: { contactType: { _in: variables.contactTypes }, isDeleted: { _eq: false } }
        })
      }

      const whereCondition = buildCustomerContactWhereCondition(variables, [], customConditions)
      const orderBy = buildCustomerContactOrderBy(variables.orderBy || [])

      const graphQLVariables: Record<string, any> = {
        limit: variables.limit || 50,
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
  hasMore: boolean
  search: (searchTerm: string) => void
  loadMore: () => void
  refetch: () => Promise<void>
  /**
   * Imperative fetch that does NOT touch the hook's internal state.
   * Use this when you need to fetch with arbitrary variables (e.g. drill-down panels)
   * without affecting the combobox-style state managed by this hook.
   */
  fetchCustomerContacts: (variables?: CustomerContactQueryVariables) => Promise<CustomerContactListData>
}

export function useCustomerContactsList(
  context: BusinessAppContextProps,
  variables?: CustomerContactQueryVariables
): UseCustomerContactsListResult {
  const graphqlClient = useGraphQLClient(context.accessToken)

  // Memoize variables to prevent infinite loops when object is recreated on each render
  const stableVariables = useMemo(() => variables, [JSON.stringify(variables)])
  const pageSize = stableVariables?.limit || 20

  const [state, setState] = useState({
    contacts: [] as CustomerContact[],
    total: 0,
    loading: true,
    error: null as string | null,
    hasMore: false
  })

  // Refs for synchronous tracking — React setState is async so we cannot rely on
  // state values inside loadMore guard; refs update immediately.
  const isFetchingRef = useRef(false)
  const currentSearchRef = useRef('')
  const currentOffsetRef = useRef(0)

  const fetchPage = useCallback(
    async (searchTerm: string, offset: number, append: boolean) => {
      // Synchronous guard — prevents the Combobox intersection observer from
      // triggering concurrent fetches with the same offset before React re-renders.
      if (isFetchingRef.current) return
      if (!context.accessToken) {
        setState(prev => ({ ...prev, loading: false }))
        return
      }

      isFetchingRef.current = true
      setState(prev => ({ ...prev, loading: true, error: null }))

      try {
        const vars: CustomerContactQueryVariables = { ...stableVariables, limit: pageSize, offset }
        if (searchTerm.trim()) {
          vars.search = searchTerm.trim()
        } else {
          delete vars.search
        }

        const customConditions = buildCustomerContactCustomConditions(vars)

        const query = buildCustomerContactQuery()
        const whereCondition = buildCustomerContactWhereCondition(vars, [], customConditions)
        const orderBy = buildCustomerContactOrderBy(vars.orderBy || [])

        const graphQLVariables: Record<string, any> = {
          limit: pageSize,
          offset,
          where: whereCondition,
          orderBy
        }

        const result = await graphqlClient.request<CustomerContactListQueryResponse>(query, graphQLVariables)
        const newContacts = result.Contact.map(toCustomerContact)
        const total = result.ContactAggregate?.aggregate?.count || 0
        const newOffset = offset + newContacts.length
        // If we received a full page, there may be more; less than a full page means we're done.
        const hasMore = newContacts.length === pageSize

        currentOffsetRef.current = newOffset

        setState(prev => ({
          contacts: append ? [...prev.contacts, ...newContacts] : newContacts,
          total,
          loading: false,
          error: null,
          hasMore
        }))
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch customer contacts'
        setState(prev => ({ ...prev, loading: false, error: errorMessage }))
      } finally {
        isFetchingRef.current = false
      }
    },
    [context.accessToken, graphqlClient, stableVariables, pageSize]
  )

  useEffect(() => {
    currentSearchRef.current = ''
    currentOffsetRef.current = 0
    fetchPage('', 0, false)
  }, [fetchPage])

  const search = useCallback(
    (searchTerm: string) => {
      currentSearchRef.current = searchTerm
      currentOffsetRef.current = 0
      fetchPage(searchTerm, 0, false)
    },
    [fetchPage]
  )

  const loadMore = useCallback(() => {
    if (state.hasMore && !isFetchingRef.current) {
      fetchPage(currentSearchRef.current, currentOffsetRef.current, true)
    }
  }, [fetchPage, state.hasMore])

  const refetch = useCallback(async () => {
    currentOffsetRef.current = 0
    await fetchPage(currentSearchRef.current, 0, false)
  }, [fetchPage])

  const fetchCustomerContacts = useCallback(
    async (queryVariables?: CustomerContactQueryVariables): Promise<CustomerContactListData> => {
      if (!context.accessToken) {
        return { contacts: [], total: 0 }
      }

      const vars: CustomerContactQueryVariables = { ...stableVariables, ...queryVariables }
      const customConditions = buildCustomerContactCustomConditions(vars)

      const query = buildCustomerContactQuery()
      const whereCondition = buildCustomerContactWhereCondition(vars, [], customConditions)
      const orderBy = buildCustomerContactOrderBy(vars.orderBy || [])

      const graphQLVariables: Record<string, any> = {
        limit: Math.min(vars.limit ?? 50, 100),
        offset: vars.offset ?? 0,
        where: whereCondition,
        orderBy
      }

      try {
        const result = await graphqlClient.request<CustomerContactListQueryResponse>(query, graphQLVariables)
        const contacts = result.Contact.map(toCustomerContact)
        const total = result.ContactAggregate?.aggregate?.count || 0
        return { contacts, total }
      } catch (error) {
        console.error('Error fetching customer contacts:', error instanceof Error ? error.message : error)
        return { contacts: [], total: 0 }
      }
    },
    [context.accessToken, graphqlClient, stableVariables]
  )

  return {
    ...state,
    search,
    loadMore,
    refetch,
    fetchCustomerContacts
  }
}
