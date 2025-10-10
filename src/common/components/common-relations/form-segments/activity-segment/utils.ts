import type { Activity, EntityOption } from './ActivitySegment'

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

export const validateActivityData = (data: Activity, options?: { requireEntity?: boolean }): string[] | null => {
  const errors: string[] = []

  if (!data.title) errors.push('Title is required')
  if (!data.activityTypeRef) errors.push('Activity type is required')
  if (!data.occurredAt) errors.push('Date is required')
  if (!data.description) errors.push('Description is required')

  const requireEntity = options?.requireEntity ?? true
  const hasEntity = Boolean(
    data.account || data.contact || data.opportunity || data.lead || (data as any)?.relatedEntityId
  )

  if (requireEntity && !hasEntity) {
    errors.push('Please select a related entity')
  }

  return errors.length > 0 ? errors : null
}
