import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'

/**
 * Entity URL configuration mapping
 * Maps entity types to their platform URL paths and parameter names
 */
export interface EntityUrlConfig {
  path: string
  param: string
  defaultTitle: string
}

export const ENTITY_URL_MAP: Record<string, EntityUrlConfig> = {
  lead: {
    path: '/platform/crm/lead-record',
    param: 'leadId',
    defaultTitle: 'Lead'
  },
  contact: {
    path: '/platform/crm/contact-record',
    param: 'contactId',
    defaultTitle: 'Contact'
  },
  opportunity: {
    path: '/platform/crm/opportunity-record',
    param: 'opportunityId',
    defaultTitle: 'Opportunity'
  },
  account: {
    path: '/platform/crm/account-record',
    param: 'accountId',
    defaultTitle: 'Account'
  },
  company: {
    path: '/platform/crm/account-record',
    param: 'accountId',
    defaultTitle: 'Company'
  }
}

/**
 * Build navigation URL for an entity
 * @param entityType - The entity type (lead, contact, opportunity, account, company)
 * @param entityId - The entity ID
 * @param source - Optional source parameter (defaults to 'every-ai')
 * @returns The platform URL or undefined if entity type is not supported
 */
export function buildEntityNavigationUrl(
  entityType: string,
  entityId: string,
  source: string = 'every-ai'
): string | undefined {
  const config = ENTITY_URL_MAP[entityType]
  if (!config || !entityId) return undefined

  return buildPlatformUrl(config.path, {
    [config.param]: entityId,
    source
  })
}

/**
 * Navigate to an entity page with force reload option
 * This ensures the page reloads even if already on the same URL, refreshing updated content
 * @param entityType - The entity type
 * @param entityId - The entity ID
 * @param source - Optional source parameter (defaults to 'every-ai')
 */
export function navigateToEntity(entityType: string, entityId: string, source: string = 'every-ai'): void {
  const url = buildEntityNavigationUrl(entityType, entityId, source)
  if (url) {
    // Force reload to ensure updated content is shown
    navigateTo(url, { forceReload: true })
  }
}

/**
 * Get default title for an entity type
 */
export function getEntityDefaultTitle(entityType: string): string {
  return ENTITY_URL_MAP[entityType]?.defaultTitle || entityType
}
