// Investment Task Mappers - Transform base types to enhanced types with computed fields

import { InvestmentTask } from '../types/investmentTaskTypes'

/**
 * Transform InvestmentTask (GraphQL response) to InvestmentTask (enhanced with computed fields)
 *
 * Handles IRM-specific field name mappings:
 * - investmentOpportunityStageCondition → opportunityStageCondition (within task relations)
 */
export function toInvestmentTask(base: InvestmentTask): InvestmentTask {
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
  } else if (base.investment?.id) {
    const investmentName = base.investment.name || base.investment.code || 'Investment'
    taskReference = {
      type: 'investment',
      id: base.investment.id,
      name: investmentName,
      code: base.investment.code,
      pictureThumbnail: (base.investment as any).pictureThumbnail
    }
  }

  // Map IRM-specific field names
  const opportunityStageCondition = (base as any).investmentOpportunityStageCondition

  // Map first assignee to legacy fields for backward compatibility
  // NOTE: InvestmentTask now supports multiple assignees via taskAssignees array
  const firstAssignee = base.taskAssignees?.[0]
  const assignedEmployee = firstAssignee?.assignedEmployee || base.assignedEmployee
  const assignedEmployeeId = firstAssignee?.assignedEmployeeId || base.assignedEmployeeId
  const assignedUserId = firstAssignee?.assignedUserId || base.assignedUserId

  return {
    ...base,
    opportunityStageCondition,
    reference: taskReference,
    // Map first assignee for backward compatibility
    assignedEmployee,
    assignedEmployeeId,
    assignedUserId,
    // Alias for task columns compatibility (assignedEmployee → assignedTo)
    assignedTo: assignedEmployee,
    creatorEmployee: base.creatorEmployee
  } as any
}
