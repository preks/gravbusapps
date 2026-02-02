import type { EntityOption } from './ActivitySegment'

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
        return entity?.email
      case 'contact':
        return entity?.email
      case 'opportunity':
        return entity?.dealType
      case 'lead':
        return entity?.email
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
