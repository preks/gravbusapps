// Investment Contact hooks - CRM contact entity operations
import { useCallback, useState, useEffect, useMemo, useRef } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { InvestmentContact } from '../types/investmentContactTypes'
import type { InvestmentTask } from '../types/investmentTaskTypes'
import type { InvestmentActivity } from '../types/investmentActivityTypes'
import type { InvestmentNote } from '../types/investmentNoteTypes'
import type { InvestmentDocument } from '../types/investmentDocumentTypes'

// Use the new query builders
import {
  buildInvestmentContactQuery,
  buildInvestmentContactByIdQuery,
  buildInvestmentContactWhereCondition,
  buildInvestmentContactOrderBy,
  type InvestmentContactQueryVariables
} from '../queries/investmentContactQueries'

// Import related-entity queries from new file
import {
  buildInvestmentTaskByContactIdQuery,
  type InvestmentTaskQueryVariables,
  buildInvestmentTaskWhereCondition,
  buildInvestmentTaskOrderBy
} from '../queries/investmentTaskQueries'
import {
  buildInvestmentActivityByContactIdQuery,
  type InvestmentActivityQueryVariables,
  buildInvestmentActivityWhereCondition,
  buildInvestmentActivityOrderBy
} from '../queries/investmentActivityQueries'
import {
  buildInvestmentNoteByContactIdQuery,
  type InvestmentNoteQueryVariables,
  buildInvestmentNoteWhereCondition,
  buildInvestmentNoteOrderBy
} from '../queries/investmentNoteQueries'
import {
  buildInvestmentDocumentByContactIdQuery,
  type InvestmentDocumentQueryVariables,
  buildInvestmentDocumentWhereCondition,
  buildInvestmentDocumentOrderBy
} from '../queries/investmentDocumentQueries'

// Use the mapper function
import { toInvestmentContact } from '../types/investmentContactTypes'
import { toInvestmentTask } from '../mappers/investmentTaskMappers'
import { toInvestmentActivity, toInvestmentNote, toInvestmentDocument } from '../mappers/investmentRelatedEntityMappers'

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
      const query = buildInvestmentContactByIdQuery()

      try {
        const result = await graphqlClient.request<{ InvestmentContactByPk: InvestmentContact | null }>(query, {
          id
        })

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

// =====================================================
// INVESTMENT CONTACT RELATED ENTITIES HOOKS
// =====================================================

// Hook for getting investment tasks by contact ID
export const useGetInvestmentTasksByContactId = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentTasksByContactId = useCallback(
    async (contactId: string) => {
      const query = buildInvestmentTaskByContactIdQuery()

      // Use variables instead of customConditions
      const variables: InvestmentTaskQueryVariables = {
        contactIds: [contactId]
      }

      const whereCondition = buildInvestmentTaskWhereCondition(variables)
      const orderBy = buildInvestmentTaskOrderBy([{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }])

      const graphQLVariables: Record<string, any> = {
        limit: 1000,
        offset: 0,
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
      const query = buildInvestmentActivityByContactIdQuery()

      // Use variables instead of customConditions
      const variables: InvestmentActivityQueryVariables = {
        contactIds: [contactId]
      }

      const whereCondition = buildInvestmentActivityWhereCondition(variables)
      const orderBy = buildInvestmentActivityOrderBy([{ field: 'occurredAt', direction: 'DESC_NULLS_LAST' }])

      const graphQLVariables: Record<string, any> = {
        limit: 1000,
        offset: 0,
        where: whereCondition,
        orderBy: orderBy
      }

      try {
        const result = await graphqlClient.request<{ InvestmentActivity: InvestmentActivity[] }>(
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
      const query = buildInvestmentNoteByContactIdQuery()

      // Use variables instead of customConditions
      const variables: InvestmentNoteQueryVariables = {
        contactIds: [contactId]
      }

      const whereCondition = buildInvestmentNoteWhereCondition(variables)
      const orderBy = buildInvestmentNoteOrderBy([{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }])

      const graphQLVariables: Record<string, any> = {
        limit: 1000,
        offset: 0,
        where: whereCondition,
        orderBy: orderBy
      }

      try {
        const result = await graphqlClient.request<{ InvestmentNote: InvestmentNote[] }>(query, graphQLVariables)
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
      const query = buildInvestmentDocumentByContactIdQuery()

      // Use variables instead of customConditions
      const variables: InvestmentDocumentQueryVariables = {
        contactIds: [contactId]
      }

      const whereCondition = buildInvestmentDocumentWhereCondition(variables)
      const orderBy = buildInvestmentDocumentOrderBy([{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }])

      const graphQLVariables: Record<string, any> = {
        limit: 1000,
        offset: 0,
        where: whereCondition,
        orderBy: orderBy
      }

      try {
        const result = await graphqlClient.request<{ InvestmentDocument: InvestmentDocument[] }>(
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

/// LEGACY
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

// Enhanced response with mapped contacts
export interface EnhancedInvestmentContactQueryResponse {
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
  fetchInvestmentContacts: (
    variables?: InvestmentContactQueryVariables
  ) => Promise<EnhancedInvestmentContactQueryResponse>
}

// Return type for stateful mode
interface StatefulReturn {
  fetchInvestmentContacts: (
    variables?: InvestmentContactQueryVariables
  ) => Promise<EnhancedInvestmentContactQueryResponse>
  options: SelectOption[] | InvestmentContact[]
  loading: boolean
  error: string | null
  hasMore: boolean
  search: (searchTerm: string) => void
  loadMore: () => void
  reset: () => void
  initialize: () => void
}

/**
 * @deprecated This hook is in transition. Use `useInvestmentContactsList` instead.
 * The name `useInvestmentContacts` will be restored to the new declarative hook after migration.
 *
 * Legacy dual-mode hook for investment contacts (function-only or stateful).
 * Prefer the new declarative `useInvestmentContactsList` hook.
 */
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
              pictureThumbnail: contact.pictureThumbnail || undefined,
              extraInfo: {
                jobPosition: contact.jobPosition,
                department: contact.department,
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

/**
 * Declarative List Hook for Investment Contacts
 *
 * Automatically fetches and manages state for a list of investment contacts.
 * Follows the Hook Refactoring Guide Pattern 2.
 *
 * @example
 * const { contacts, loading, error, refetch } = useInvestmentContactsList(context, { limit: 20 })
 *
 * @todo MIGRATION: Replace all usages of deprecated `useGetInvestmentContacts` with this hook
 * @todo RENAME: After migration is complete, rename this hook to `useInvestmentContacts` and remove the deprecated hook
 */
export interface UseInvestmentContactsListResult {
  contacts: InvestmentContact[]
  total: number
  loading: boolean
  error: string | null
  hasMore: boolean
  refetch: (variables?: InvestmentContactQueryVariables) => Promise<void>
  search: (searchTerm: string) => void
  loadMore: () => void
}

export function useInvestmentContactsList(
  context: BusinessAppContextProps,
  variables?: InvestmentContactQueryVariables
): UseInvestmentContactsListResult {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const pageSize = variables?.limit || 20

  // Memoize variables to prevent infinite loops when object is recreated on each render
  const stableVariables = useMemo(() => variables, [JSON.stringify(variables)])

  const [state, setState] = useState({
    contacts: [] as InvestmentContact[],
    total: 0,
    loading: true,
    error: null as string | null,
    hasMore: false
  })

  const currentSearchRef = useRef('')
  const currentOffsetRef = useRef(0)

  const fetchPage = useCallback(
    async (searchTerm: string, offset: number, append: boolean) => {
      if (!context.accessToken) {
        setState(prev => ({ ...prev, loading: false }))
        return
      }

      setState(prev => ({
        ...prev,
        loading: true,
        error: null,
        ...(append ? {} : { contacts: [] })
      }))

      try {
        const vars: InvestmentContactQueryVariables = {
          ...stableVariables,
          limit: pageSize,
          offset,
          ...(searchTerm.trim() ? { search: searchTerm.trim() } : {})
        }

        const query = buildInvestmentContactQuery()

        const customConditions: Record<string, any>[] = []
        if (vars.hasEmail) customConditions.push({ email: { _isNull: false, _neq: '' } })
        if (vars.missingEmail) customConditions.push({ _or: [{ email: { _isNull: true } }, { email: { _eq: '' } }] })
        if (vars.hasPhone) customConditions.push({ phone: { _isNull: false, _neq: '' } })
        if (vars.missingPhone) customConditions.push({ _or: [{ phone: { _isNull: true } }, { phone: { _eq: '' } }] })

        const whereCondition = buildInvestmentContactWhereCondition(vars, [], customConditions)
        const orderBy = buildInvestmentContactOrderBy(vars.orderBy || [])

        const graphQLVariables: Record<string, any> = {
          limit: pageSize,
          offset,
          where: whereCondition,
          orderBy
        }

        const result = await graphqlClient.request<InvestmentContactQueryResponse>(query, graphQLVariables)
        const fetched = result.InvestmentContact.map(toInvestmentContact)
        const total = result.InvestmentContactAggregate?.aggregate?.count || 0
        const hasMore = fetched.length === pageSize

        currentOffsetRef.current = (append ? currentOffsetRef.current : 0) + fetched.length

        setState(prev => ({
          contacts: append ? [...prev.contacts, ...fetched] : fetched,
          total,
          loading: false,
          error: null,
          hasMore
        }))
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch investment contacts'

        setState(prev => ({
          ...prev,
          ...(append ? {} : { contacts: [], total: 0 }),
          loading: false,
          error: errorMessage,
          hasMore: false
        }))
      }
    },
    [context.accessToken, graphqlClient, stableVariables, pageSize]
  )

  useEffect(() => {
    currentSearchRef.current = ''
    currentOffsetRef.current = 0
    fetchPage('', 0, false)
  }, [fetchPage])

  const refetch = useCallback(
    async (queryVariables?: InvestmentContactQueryVariables) => {
      const searchTerm = (queryVariables?.search as string) || ''
      currentSearchRef.current = searchTerm
      currentOffsetRef.current = 0
      await fetchPage(searchTerm, 0, false)
    },
    [fetchPage]
  )

  const search = useCallback(
    (searchTerm: string) => {
      currentSearchRef.current = searchTerm
      currentOffsetRef.current = 0
      fetchPage(searchTerm, 0, false)
    },
    [fetchPage]
  )

  const loadMore = useCallback(() => {
    if (state.hasMore && !state.loading) {
      fetchPage(currentSearchRef.current, currentOffsetRef.current, true)
    }
  }, [fetchPage, state.hasMore, state.loading])

  return {
    ...state,
    refetch,
    search,
    loadMore
  }
}
