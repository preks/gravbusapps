import { navigateTo } from '@/common/utils/navigationUtils'

type RelationsDomain = 'crm' | 'investments'
type RelationsEntityType = 'contacts' | 'leads' | 'accounts' | 'opportunities'

/**
 * Creates a process completion handler that redirects to the entity list after successful deletion
 * @param domain - The domain (crm or investments)
 * @param entityType - The entity type to redirect to
 * @returns A function that handles process completion and redirects
 */
export const createRedirectAfterDelete = (domain: RelationsDomain, entityType: RelationsEntityType) => {
  return (detail: { resolution?: 'success' | 'failure' } | null) => {
    if (detail?.resolution === 'success') {
      const basePath =
        domain === 'investments' ? '/platform/irm/investment-relations' : '/platform/crm/customer-relations'
      // Small delay to ensure the popup closes properly before navigation
      setTimeout(() => {
        navigateTo(`${basePath}?view=${entityType}`)
      }, 100)
    }
  }
}
