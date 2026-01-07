// Customer Task Mappers - Transform base types to enhanced types with computed fields

import { CustomerTask } from '../types/customerTaskTypes'

/**
 * Transform CustomerTask (GraphQL response) to CustomerTask (enhanced with computed fields)
 *
 * Handles CRM-specific field name mappings:
 * - type → taskType
 * - priority → taskPriority
 * - status → taskStatus
 * - priorityRef → taskPriorityRef
 * - statusRef → taskStatusRef
 * - typeRef → taskTypeRef
 * - salesTaskTemplate → taskTemplate
 * - timingType → taskTiming
 */
export function toCustomerTask(base: CustomerTask): CustomerTask {
  // Build task reference from related entities
  let taskReference: any = undefined

  if (base.opportunity?.id) {
    const opportunityDisplayName = base.opportunity?.name || base.opportunity?.code
    taskReference = {
      type: 'opportunity',
      id: base.opportunity.id,
      name: opportunityDisplayName,
      code: base.opportunity.code,
      pictureThumbnail: (base.opportunity as any).pictureThumbnail
    }
  } else if (base.account?.id) {
    const accountDisplayName = base.account?.name || base.account?.code
    taskReference = {
      type: 'account',
      id: base.account.id,
      name: accountDisplayName,
      code: base.account.code,
      pictureThumbnail: (base.account as any).pictureThumbnail
    }
  } else if (base.lead?.id) {
    const leadDisplayName =
      base.lead?.firstName && base.lead?.lastName ? `${base.lead.firstName} ${base.lead.lastName}` : base.lead?.code
    taskReference = {
      type: 'lead',
      id: base.lead.id,
      name: leadDisplayName,
      code: base.lead.code,
      pictureThumbnail: (base.lead as any).pictureThumbnail
    }
  } else if (base.contact?.id) {
    const contactDisplayName =
      base.contact?.fullName || `${base.contact?.firstName || ''} ${base.contact?.lastName || ''}`.trim()
    taskReference = {
      type: 'contact',
      id: base.contact.id,
      name: contactDisplayName,
      code: base.contact.code,
      pictureThumbnail: (base.contact as any).pictureThumbnail
    }
  }

  // Map CRM catalog field names to Task standard
  const taskType = base.type
  const taskTypeRef = (base as any).typeRef
  const taskPriority = base.priority
  const taskPriorityRef = (base as any).priorityRef
  const taskStatus = base.status
  const taskStatusRef = (base as any).statusRef

  // Map template field name
  const taskTemplate = (base as any).salesTaskTemplate

  // Map timing type field
  const taskTiming = base.timingType

  // Handle comments: convert single comment to array if needed
  const comments =
    (base as any).comment && !Array.isArray((base as any).comment)
      ? [{ comment: (base as any).comment }]
      : (base as any).comments

  return {
    ...base,
    // Map CRM fields to Task standard
    taskType,
    taskTypeRef,
    taskPriority,
    taskPriorityRef,
    taskStatus,
    taskStatusRef,
    taskTemplate,
    taskTiming,
    comments,
    reference: taskReference,
    creatorEmployee: base.creatorEmployee
  } as CustomerTask
}
