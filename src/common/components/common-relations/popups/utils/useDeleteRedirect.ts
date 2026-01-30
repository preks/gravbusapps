import React from 'react'
import { createRedirectAfterDelete } from '../utils/redirectAfterDelete'

type RelationsDomain = 'crm' | 'investments'
type RelationsEntityType = 'contacts' | 'leads' | 'accounts' | 'opportunities'

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

  // Extract the ID from the URL (e.g., /account-record/123 → 123)
  // Filter empty parts to handle trailing slashes correctly
  const urlParts = globalThis.location.pathname.split('/').filter(part => part !== '')
  const recordIdInUrl = isOnMatchingRecordPage && urlParts.length > 0 ? urlParts[urlParts.length - 1] : null

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
