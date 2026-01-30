import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { createRedirectAfterDelete } from '../utils/redirectAfterDelete'

type RelationsDomain = 'crm' | 'investments'
type RelationsEntityType = 'contacts' | 'leads' | 'accounts' | 'opportunities'

interface UseDeleteRedirectOptions {
  domain: RelationsDomain
  entityType: RelationsEntityType
  recordUrlPattern: string
  additionalData?: BusinessAppContextProps['additionalData']
}

/**
 * Custom hook to handle redirect logic after delete operations
 * Automatically detects if we're on a record page and sets up the redirect event listener
 */
export const useDeleteRedirect = ({
  domain,
  entityType,
  recordUrlPattern,
  additionalData
}: UseDeleteRedirectOptions): void => {
  // Check if we should redirect after delete (computed before early returns)
  // Auto-detect if we're on a record page by checking the current URL
  const isOnRecordPage = globalThis.location.pathname.includes(recordUrlPattern)

  // Also check for explicit flag (for backward compatibility)
  const explicitRedirect =
    additionalData?.redirectAfterDelete === true ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.redirectAfterDelete === true

  const shouldRedirect = isOnRecordPage || explicitRedirect

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
