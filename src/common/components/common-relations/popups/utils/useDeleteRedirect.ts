import React from 'react'
import { createRedirectAfterDelete } from '../utils/redirectAfterDelete'

type RelationsDomain = 'crm' | 'investments'
type RelationsEntityType = 'contacts' | 'leads' | 'accounts' | 'opportunities'

const entityTypeToQueryParam: Record<RelationsEntityType, string> = {
  leads: 'leadId',
  accounts: 'accountId',
  contacts: 'contactId',
  opportunities: 'opportunityId'
}

interface UseDeleteRedirectOptions {
  domain: RelationsDomain
  entityType: RelationsEntityType
  recordUrlPattern: string
  entityId: string
}

/**
 * Custom hook to handle redirect logic after delete operations
 * Only redirects when deleting the EXACT entity whose record page you're viewing
 */
export const useDeleteRedirect = ({
  domain,
  entityType,
  recordUrlPattern,
  entityId
}: UseDeleteRedirectOptions): void => {
  // Check if we're on a record page of this entity type
  const isOnMatchingRecordPage = globalThis.location.pathname.includes(recordUrlPattern)

  // Record pages use query parameters for the entity ID (e.g., ?leadId=..., ?accountId=...)
  // Fall back to the last path segment for path-based routing (e.g., /record/123)
  const queryParamName = entityTypeToQueryParam[entityType]
  const searchParams = new URLSearchParams(globalThis.location.search)
  const queryParamId = queryParamName ? searchParams.get(queryParamName) : null

  const urlParts = globalThis.location.pathname.split('/').filter(part => part !== '')
  const pathId = isOnMatchingRecordPage && urlParts.length > 0 ? urlParts[urlParts.length - 1] : null

  const recordIdInUrl = queryParamId || pathId

  // Only redirect if we're deleting THE EXACT entity whose record we're viewing
  const isDeletingCurrentRecord = isOnMatchingRecordPage && recordIdInUrl === entityId

  const shouldRedirect = isDeletingCurrentRecord

  // Setup redirect as event listener (MUST be called before early returns)
  React.useEffect(() => {
    if (!shouldRedirect) return

    const handleRedirect = (event: Event) => {
      const customEvent = event as CustomEvent<{ resolution?: 'success' | 'failure' }>
      if (customEvent.detail?.resolution === 'success') {
        createRedirectAfterDelete(domain, entityType)(customEvent.detail)
      }
    }

    globalThis.addEventListener('com.newwork.process.processCompletion', handleRedirect)
    return () => {
      globalThis.removeEventListener('com.newwork.process.processCompletion', handleRedirect)
    }
  }, [shouldRedirect, domain, entityType])
}
