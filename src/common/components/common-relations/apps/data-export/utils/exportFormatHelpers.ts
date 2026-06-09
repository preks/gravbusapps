import { formatExportDate } from '@/common/utils/excelExportUtils'
import { getCatalogEntryValue } from '@/common/data/catalog/utils/catalogTranslationUtils'
import { getChannelByCode } from '@/common/data/common/utils/communicationChannelHelpers'
import { CommunicationChannelCode } from '@/common/data/common/types/commonTypes'
import type { Contact } from '@/common/data/relations/types/contactTypes'
import { getContactTypeLabel } from '@/common/data/relations/constants/contactConstants'

export const EXPORT_EMPTY = '-'

export function formatExportText(value: string | null | undefined): string {
  if (value === null || value === undefined || value.trim() === '') {
    return EXPORT_EMPTY
  }
  return value
}

export function formatExportBoolean(value: boolean | null | undefined): string {
  if (value === true) return 'Yes'
  if (value === false) return 'No'
  return EXPORT_EMPTY
}

export function formatExportCatalog(catalog: unknown): string {
  if (!catalog) return EXPORT_EMPTY
  return getCatalogEntryValue(catalog as Parameters<typeof getCatalogEntryValue>[0]) || EXPORT_EMPTY
}

export function formatExportDateValue(value: string | null | undefined): string {
  if (!value) return EXPORT_EMPTY
  return formatExportDate(value)
}

export function formatOwnerEmployee(employee: unknown): string {
  if (!employee || typeof employee !== 'object') return EXPORT_EMPTY
  const emp = employee as { displayName?: string; firstName?: string; lastName?: string }
  if (emp.displayName) return emp.displayName
  const name = [emp.firstName, emp.lastName].filter(Boolean).join(' ')
  return name || EXPORT_EMPTY
}

export function formatAddressLine(addressLine: unknown): string {
  if (!addressLine) return EXPORT_EMPTY

  if (typeof addressLine === 'string') {
    try {
      const parsed = JSON.parse(addressLine) as { lines?: Array<string | null> }
      if (parsed?.lines) {
        const lines = parsed.lines.filter(Boolean).join(', ')
        return lines || EXPORT_EMPTY
      }
    } catch {
      return addressLine || EXPORT_EMPTY
    }
  }

  if (typeof addressLine === 'object' && addressLine !== null && 'lines' in addressLine) {
    const lines = (addressLine as { lines?: Array<string | null> }).lines?.filter(Boolean).join(', ')
    return lines || EXPORT_EMPTY
  }

  return EXPORT_EMPTY
}

export function formatExportNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return EXPORT_EMPTY
  return String(value)
}

export function formatExportPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined) return EXPORT_EMPTY
  return `${value}%`
}

export function formatCommunicationChannel(contact: Contact, code: CommunicationChannelCode): string {
  const channel = getChannelByCode(contact.communicationChannels, code)
  return formatExportText(channel?.value)
}

export function formatLinkedAccountNames(contact: Contact): string {
  const names = contact.accountContacts
    ?.map(entry => entry.account?.name)
    .filter((name): name is string => Boolean(name))

  if (!names?.length) return EXPORT_EMPTY
  return names.join('; ')
}

export function formatLinkedContactTypes(contact: Contact): string {
  const types = contact.accountContacts?.map(entry => getContactTypeLabel(entry.contactType)).filter(Boolean)

  if (!types?.length) return EXPORT_EMPTY
  return types.join('; ')
}

export function formatProspectiveCategory(prospective: boolean | null | undefined): string {
  if (prospective === true) return 'Prospect'
  if (prospective === false) return 'Established'
  return EXPORT_EMPTY
}

export function formatFirstAddressField(
  account: { addresses?: Array<{ locality?: string; postalCode?: string; region?: unknown; country?: unknown }> },
  field: 'locality' | 'postalCode' | 'region' | 'country'
): string {
  const address = account.addresses?.[0]
  if (!address) return EXPORT_EMPTY

  if (field === 'locality') return formatExportText(address.locality)
  if (field === 'postalCode') return formatExportText(address.postalCode)
  if (field === 'region') return formatExportCatalog(address.region)
  if (field === 'country') return formatExportCatalog(address.country)

  return EXPORT_EMPTY
}

export function formatLinkedContactNames(account: {
  accountContacts?: Array<{ contact?: { firstName?: string; lastName?: string; fullName?: string } }>
}): string {
  const names = account.accountContacts
    ?.map(entry => {
      const contact = entry.contact
      if (!contact) return ''
      if (contact.fullName) return contact.fullName
      return [contact.firstName, contact.lastName].filter(Boolean).join(' ')
    })
    .filter(Boolean)

  if (!names?.length) return EXPORT_EMPTY
  return names.join('; ')
}

type PipelineLike = { value?: string; code?: string } | null | undefined

export function getOpportunityPipelineLabel(opportunity: {
  opportunityPipeline?: PipelineLike
  salesPipeline?: PipelineLike
}): string {
  return formatExportCatalog(opportunity.opportunityPipeline ?? opportunity.salesPipeline)
}

export function getOpportunityStageLabel(opportunity: {
  opportunityPipelineStage?: PipelineLike
  salesPipelineStage?: PipelineLike
}): string {
  return formatExportCatalog(opportunity.opportunityPipelineStage ?? opportunity.salesPipelineStage)
}

export function formatOpportunityAmount(opportunity: {
  estimatedAmount?: number | null
  currency?: { code?: string } | null
}): string {
  if (opportunity.estimatedAmount == null) return EXPORT_EMPTY
  const currencyCode = opportunity.currency?.code
  return currencyCode ? `${opportunity.estimatedAmount} ${currencyCode}` : String(opportunity.estimatedAmount)
}

export function formatOpportunityLinkedAccounts(opportunity: {
  opportunityAccounts?: Array<{ account?: { name?: string } }>
}): string {
  const names = opportunity.opportunityAccounts
    ?.map(entry => entry.account?.name)
    .filter((name): name is string => Boolean(name))

  if (!names?.length) return EXPORT_EMPTY
  return names.join('; ')
}

export function formatOpportunityLinkedContacts(opportunity: {
  opportunityContacts?: Array<{ contact?: { firstName?: string; lastName?: string; fullName?: string } }>
  contacts?: Array<{ contact?: { firstName?: string; lastName?: string; fullName?: string } }>
}): string {
  const associations = opportunity.opportunityContacts ?? opportunity.contacts
  const names = associations
    ?.map(entry => {
      const contact = entry.contact
      if (!contact) return ''
      if (contact.fullName) return contact.fullName
      return [contact.firstName, contact.lastName].filter(Boolean).join(' ')
    })
    .filter(Boolean)

  if (!names?.length) return EXPORT_EMPTY
  return names.join('; ')
}
