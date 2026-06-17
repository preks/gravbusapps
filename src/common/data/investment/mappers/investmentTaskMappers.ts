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
    const opportunityDisplayName = base.opportunity?.name || 'Unnamed Opportunity'
    taskReference = {
      type: 'opportunity',
      id: base.opportunity.id,
      name: opportunityDisplayName,
      code: base.opportunity.code,
      pictureThumbnail: (base.opportunity as any).pictureThumbnail
    }
  } else if (base.account?.id) {
    const accountDisplayName = base.account?.name || 'Unnamed Account'
    taskReference = {
      type: 'account',
      id: base.account.id,
      name: accountDisplayName,
      code: base.account.code,
      pictureThumbnail: (base.account as any).pictureThumbnail
    }
  } else if (base.lead?.id) {
    const leadDisplayName =
      base.lead?.firstName && base.lead?.lastName ? `${base.lead.firstName} ${base.lead.lastName}` : 'Unnamed Lead'
    taskReference = {
      type: 'lead',
      id: base.lead.id,
      name: leadDisplayName,
      code: base.lead.code,
      pictureThumbnail: (base.lead as any).pictureThumbnail
    }
  } else if (base.contact?.id) {
    const contactDisplayName =
      base.contact?.fullName ||
      `${base.contact?.firstName || ''} ${base.contact?.lastName || ''}`.trim() ||
      'Unnamed Contact'
    taskReference = {
      type: 'contact',
      id: base.contact.id,
      name: contactDisplayName,
      code: base.contact.code,
      pictureThumbnail: (base.contact as any).pictureThumbnail
    }
  } else if (base.investment?.id) {
    const investmentName = base.investment.name || 'Unnamed Investment'
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

  // Handle taskAssignees (multiple assignees) - provide backwards compatibility with assignedEmployee
  const assignedEmployee =
    base.taskAssignees && base.taskAssignees.length > 0
      ? base.taskAssignees[0].assignedEmployee // ✅ Correct: taskAssignees[].assignedEmployee
      : undefined

  return {
    ...base,
    opportunityStageCondition,
    reference: taskReference,
    creatorEmployee: base.creatorEmployee,
    assignedEmployee // Backwards compatibility for UI components expecting single assignee
  } as InvestmentTask
}
