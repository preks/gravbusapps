import type { EntityOption } from './ActivitySegment'

/**
 * Extracts the primary email from an entity's communicationChannels array.
 * Used by Account, Contact, and Opportunity (which store email in the
 * communicationChannels relation rather than a flat field).
 */
const getEmailFromCommunicationChannels = (entity: any): string | undefined => {
  const channels = entity?.communicationChannels
  if (!Array.isArray(channels) || channels.length === 0) return undefined
  const emailChannel = channels.find(
    (ch: any) =>
      ch.communicationChannel?.code?.toLowerCase() === 'e-mail' ||
      ch.communicationChannelRef?.toLowerCase().includes('e-mail')
  )
  return emailChannel?.value || undefined
}

export const mapEntityToOption = (entity: any, type: 'account' | 'contact' | 'opportunity' | 'lead'): EntityOption => {
  const getEntityName = () => {
    switch (type) {
      case 'account':
        return entity?.name || entity?.code || 'Account'
      case 'contact':
        return (
          entity?.fullName || `${entity?.firstName || ''} ${entity?.lastName || ''}`.trim() || entity?.code || 'Contact'
        )
      case 'opportunity':
        return entity?.name || entity?.code || 'Opportunity'
      case 'lead':
        return (
          entity?.companyName || `${entity?.firstName || ''} ${entity?.lastName || ''}`.trim() || entity?.code || 'Lead'
        )
      default:
        return 'Unknown Entity'
    }
  }

  const getEntitySubtitle = () => {
    switch (type) {
      case 'account':
        return getEmailFromCommunicationChannels(entity) || entity?.email
      case 'contact':
        return getEmailFromCommunicationChannels(entity) || entity?.email
      case 'opportunity':
        return getEmailFromCommunicationChannels(entity) || entity?.dealType
      case 'lead':
        return entity?.email || entity?.companyEmail
      default:
        return undefined
    }
  }

  return {
    id: entity?.id,
    name: getEntityName(),
    type,
    subtitle: getEntitySubtitle()
  }
}
