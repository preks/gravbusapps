import { buildPlatformUrl } from '@/common/utils/navigationUtils'

/** CRM customer record paths only (no investment records in CRM). */
export function buildCrmRelatedEntityRecordUrl(
  kind: 'account' | 'contact' | 'opportunity' | 'lead' | 'investment',
  id: string
): string {
  switch (kind) {
    case 'account':
      return buildPlatformUrl('/platform/crm/account-record', { accountId: id })
    case 'contact':
      return buildPlatformUrl('/platform/crm/contact-record', { contactId: id })
    case 'opportunity':
      return buildPlatformUrl('/platform/crm/opportunity-record', { opportunityId: id })
    case 'lead':
      return buildPlatformUrl('/platform/crm/lead-record', { leadId: id })
    case 'investment':
      return ''
  }
}

/** IRM / investment customer record paths. */
export function buildIrmRelatedEntityRecordUrl(
  kind: 'account' | 'contact' | 'opportunity' | 'lead' | 'investment',
  id: string
): string {
  switch (kind) {
    case 'account':
      return buildPlatformUrl('/platform/irm/account-record', { accountId: id })
    case 'contact':
      return buildPlatformUrl('/platform/irm/contact-record', { contactId: id })
    case 'opportunity':
      return buildPlatformUrl('/platform/irm/opportunity-record', { opportunityId: id })
    case 'lead':
      return buildPlatformUrl('/platform/irm/lead-record', { leadId: id })
    case 'investment':
      return buildPlatformUrl('/platform/irm/investment-record', { investmentId: id })
  }
}

export type WorkspaceRelationsModule = 'crm' | 'irm'

/**
 * Shared CRM vs IRM URL resolution for activity-related record chips and workspace widgets.
 */
export function createWorkspaceModuleRelatedRecordUrlResolver(
  module: WorkspaceRelationsModule
): (kind: Parameters<typeof buildCrmRelatedEntityRecordUrl>[0], id: string) => string | undefined {
  return (kind, id) => {
    const url = module === 'irm' ? buildIrmRelatedEntityRecordUrl(kind, id) : buildCrmRelatedEntityRecordUrl(kind, id)
    return url.length > 0 ? url : undefined
  }
}
