import { Activity } from '@/common/components/common-relations/form-segments/activity-segment/ActivitySegment'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { toISOFormat } from '@/common/utils/dateFormatter'
import type { NoteSegmentSchema } from '@/common/components/common-relations/form-segments/note-segment/NoteSegment'

// Helper to extract entity ID from object or string
const getEntityId = (entity: any): string | undefined => {
  if (!entity) return undefined
  if (typeof entity === 'string') return entity
  return entity.id
}

// Helper to extract investment ID from additional data
const extractInvestmentId = (additionalDataRecord: Record<string, any>): string | undefined => {
  const external = additionalDataRecord.externalContextData || {}
  return (
    external.investmentId ||
    external.investment?.id ||
    external.investment ||
    additionalDataRecord.investmentId ||
    additionalDataRecord.investment?.id ||
    additionalDataRecord.investment
  )
}

// Helper to extract account ID from additional data
const extractAccountId = (additionalDataRecord: Record<string, any>): string | undefined => {
  const external = additionalDataRecord.externalContextData || {}
  return (
    additionalDataRecord.accountId || additionalDataRecord.account?.id || external.accountId || external.account?.id
  )
}

// Helper to extract contact ID from additional data
const extractContactId = (additionalDataRecord: Record<string, any>): string | undefined => {
  const external = additionalDataRecord.externalContextData || {}
  return (
    additionalDataRecord.contactId || additionalDataRecord.contact?.id || external.contactId || external.contact?.id
  )
}

// Helper to extract opportunity ID from additional data
const extractOpportunityId = (additionalDataRecord: Record<string, any>): string | undefined => {
  const external = additionalDataRecord.externalContextData || {}
  return (
    additionalDataRecord.opportunityId ||
    additionalDataRecord.opportunity?.id ||
    external.opportunityId ||
    external.opportunity?.id
  )
}

// Helper to add investment and account from context
const addInvestmentAndAccountFromContext = (
  refs: Record<string, any>,
  additionalDataRecord: Record<string, any>
): void => {
  const investmentId = extractInvestmentId(additionalDataRecord)
  if (investmentId) {
    refs.investment = investmentId
    const accountIdFromContext = extractAccountId(additionalDataRecord)
    if (accountIdFromContext && !refs.account) {
      refs.account = accountIdFromContext
    }
  }
}

// Helper to add entities from context as fallback
const addEntitiesFromContextFallback = (refs: Record<string, any>, additionalDataRecord: Record<string, any>): void => {
  if (!refs.account) {
    const accountIdFromContext = extractAccountId(additionalDataRecord)
    if (accountIdFromContext) {
      refs.account = accountIdFromContext
    }
  }
  if (!refs.contact) {
    const contactIdFromContext = extractContactId(additionalDataRecord)
    if (contactIdFromContext) {
      refs.contact = contactIdFromContext
    }
  }
  if (!refs.opportunity) {
    const opportunityIdFromContext = extractOpportunityId(additionalDataRecord)
    if (opportunityIdFromContext) {
      refs.opportunity = opportunityIdFromContext
    }
  }
}

// Helper to add lead from context
const addLeadFromContext = (refs: Record<string, any>, additionalDataRecord: Record<string, any>): void => {
  if (refs.lead) return
  const external = additionalDataRecord.externalContextData || {}
  const leadId = additionalDataRecord.leadId || additionalDataRecord.lead?.id || external.leadId || external.lead?.id
  if (leadId) {
    refs.lead = leadId
  }
}

export const buildActivityPayload = (
  activity: Activity,
  businessAppContext: BusinessAppContextProps,
  options: { isUpdate?: boolean } = {}
) => {
  // Helper to build entity references
  const getEntityRef = () => {
    const refs: Record<string, any> = {}
    const accountId = getEntityId(activity.account)
    const contactId = getEntityId(activity.contact)
    const opportunityId = getEntityId(activity.opportunity)
    const leadId = getEntityId(activity.lead)

    if (accountId) refs.account = accountId
    if (contactId) refs.contact = contactId
    if (opportunityId) refs.opportunity = opportunityId
    if (leadId) refs.lead = leadId

    // Always include parent investment when provided via additional/external context
    const additionalData = (businessAppContext as any)?.additionalData || {}
    const initialParameters = additionalData?.psi_taskPayload?.psi_initialParameters
    const additionalDataRecord = initialParameters ? { ...additionalData, ...initialParameters } : additionalData
    addInvestmentAndAccountFromContext(refs, additionalDataRecord)
    addEntitiesFromContextFallback(refs, additionalDataRecord)
    addLeadFromContext(refs, additionalDataRecord)
    return refs
  }

  // Get owner employee ID from business app context
  const getOwnerEmployee = () => {
    // Activity payload debug (sensitive data removed)

    if (activity.ownerEmployee?.id) {
      // Using activity.ownerEmployee.id
      return activity.ownerEmployee.id
    }
    // Also support flat field from UI segment
    const ownerId = (activity as any)?.ownerEmployeeId
    if (ownerId) {
      // Using activity.ownerEmployeeId
      return ownerId
    }

    // Fallback to current user's employee ID from context
    if (businessAppContext.userInfo?.employeeDetails?.employeeId) {
      // Falling back to current user employee ID
      return businessAppContext.userInfo.employeeDetails.employeeId
    }

    return undefined
  }

  const payloadBody: any = {
    title: activity.title,
    description: activity.description,
    occurredAt: toISOFormat(activity.occurredAt),
    activityTypeRef: activity.activityTypeRef || undefined,
    ownerEmployee: getOwnerEmployee(),
    ...getEntityRef()
  }

  // Always pass documents array - empty array will delete all, IDs will keep existing, objects will create new
  payloadBody.documents = (activity as any).documents || []

  if (options.isUpdate && activity.id) {
    payloadBody.id = activity.id
    payloadBody.version = activity.version
  }

  return {
    investmentActivity: payloadBody
  }
}

// ==============================
// Investment Note Payload
// ==============================

export const buildInvestmentNotePayload = (
  note: NoteSegmentSchema,
  businessAppContext: BusinessAppContextProps,
  options: { isUpdate?: boolean } = {}
) => {
  // Helper to build entity references (same pattern as activity)
  const getEntityRef = () => {
    const refs: Record<string, any> = {}
    const accountId = getEntityId(note.account)
    const contactId = getEntityId(note.contact)
    const opportunityId = getEntityId(note.opportunity)
    const leadId = getEntityId(note.lead)

    if (accountId) refs.account = accountId
    if (contactId) refs.contact = contactId
    if (opportunityId) refs.opportunity = opportunityId
    if (leadId) refs.lead = leadId

    // Always include parent investment when provided via additionalData or externalContextData
    const additionalData = (businessAppContext as any)?.additionalData || {}
    const initialParameters = additionalData?.psi_taskPayload?.psi_initialParameters
    const additionalDataRecord = initialParameters ? { ...additionalData, ...initialParameters } : additionalData
    addInvestmentAndAccountFromContext(refs, additionalDataRecord)
    addEntitiesFromContextFallback(refs, additionalDataRecord)
    addLeadFromContext(refs, additionalDataRecord)
    return refs
  }

  // Get author employee ID from business app context (same pattern as activity)
  const getAuthorEmployee = () => {
    if (note.authorEmployee?.id) {
      return note.authorEmployee.id
    }

    // Fallback to current user's employee ID from context
    if (businessAppContext.userInfo?.employeeDetails?.employeeId) {
      return businessAppContext.userInfo.employeeDetails.employeeId
    }

    console.warn('No author employee ID found in note data or business context')
    return undefined
  }

  const payloadBody: any = {
    title: note.title,
    text: note.text,
    reminderDate: note.reminderDate ? toISOFormat(note.reminderDate) : null,
    authorEmployee: getAuthorEmployee(),
    ...getEntityRef()
  }

  // Always pass documents array - empty array will delete all, IDs will keep existing, objects will create new
  payloadBody.documents = (note as any).documents || []

  // Add id and version for update mode
  if (options.isUpdate && (note as any).id) {
    payloadBody.id = (note as any).id
    payloadBody.version = note.version
  }

  return {
    investmentNote: payloadBody
  }
}
