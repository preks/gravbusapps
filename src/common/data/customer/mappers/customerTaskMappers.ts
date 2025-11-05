// Customer Task Mappers - Transform base types to enhanced types with computed fields

import { CustomerTask } from '../types'

/**
 * Transform CustomerTask (GraphQL response) to CustomerTask (enhanced with computed fields)
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

  // Map timingType to taskTiming for consistency with Investment Relations
  // SalesTask.timing_type → CustomerTask.taskTiming
  const taskTiming = base.timingType

  // Map old catalog field names to new standardized names
  // SalesTask.type → CustomerTask.taskType
  // SalesTask.priority → CustomerTask.taskPriority
  // SalesTask.status → CustomerTask.taskStatus
  const taskType = base.type
  const taskPriority = base.priority
  const taskStatus = base.status

  // Map old task template field name to new standardized name
  // SalesTask.sales_task_template_id → CustomerTask.taskTemplateId
  const taskTemplateId = base.salesTaskTemplateId

  return {
    ...base,
    taskType, // Map type to taskType
    taskPriority, // Map priority to taskPriority
    taskStatus, // Map status to taskStatus
    taskTiming, // Map timingType to taskTiming
    taskTemplateId, // Map salesTaskTemplateId to taskTemplateId
    reference: taskReference,
    // Alias for task columns compatibility (assignedEmployee → assignedTo)
    assignedTo: base.assignedEmployee,
    creatorEmployee: base.creatorEmployee
  } as any
}
