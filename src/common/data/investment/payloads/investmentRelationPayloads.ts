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
// Investment Task Payload
// ==============================

export interface InvestmentTaskFormData {
  id?: string
  version?: number
  title: string
  code?: string
  description: string
  taskTypeRef: string
  taskPriorityRef: string
  taskStatusRef?: string
  taskTiming?: string // DEADLINE | SCHEDULED
  dueDate: string | null
  // optional scheduling fields
  templateStartDate?: string | null
  startDate?: string | null
  endDate?: string | null
  assignedEmployeeId?: string
  assignedUserId?: string
  creatorEmployeeId?: string
  creatorUserId?: string
  // related entity (only one)
  investment?: { id: string }
  account?: { id: string }
  contact?: { id: string }
  opportunity?: { id: string }
  lead?: { id: string }
  // Documents - array of document objects
  // For existing documents: include id and version
  // For new documents: include name and fileInfo (full JSON response from file server)
  documents?: Array<{
    id?: string // Present for existing documents
    version?: number // Present for existing documents
    name?: string // Present for new documents
    fileInfo?: any // Full fileInfo JSON from file upload (for new documents)
    description?: string
    documentGroupRef?: string
    documentTypeRef?: string
  }>
}

export const buildInvestmentTaskPayload = (
  task: InvestmentTaskFormData,
  businessAppContext: BusinessAppContextProps,
  options: { isUpdate?: boolean } = {}
) => {
  const getEntityRef = () => {
    const refs: Record<string, any> = {}
    // Check task object first for all entity types
    const investmentId = getEntityId(task.investment)
    const accountId = getEntityId(task.account)
    const contactId = getEntityId(task.contact)
    const opportunityId = getEntityId(task.opportunity)
    const leadId = getEntityId(task.lead)

    if (investmentId) refs.investment = investmentId
    if (accountId) refs.account = accountId
    if (contactId) refs.contact = contactId
    if (opportunityId) refs.opportunity = opportunityId
    if (leadId) refs.lead = leadId

    // Fallback: Always include parent investment when provided via additionalData/externalContextData
    // This handles cases where the form doesn't have the investment object but context does
    if (!refs.investment) {
      const additional: any = (businessAppContext as any)?.additionalData || {}
      const external: any = additional.externalContextData || {}
      const investmentId =
        // Primary: AppAction externalContextData (most common)
        external.investmentId ||
        external.investment?.id ||
        external.investment ||
        external.investmentTask?.investment ||
        external.investmentTask?.investmentId ||
        // Fallback: direct additionalData
        additional.investmentId ||
        additional.investment?.id ||
        additional.investment ||
        additional.investmentTask?.investment ||
        additional.investmentTask?.investmentId
      if (investmentId) refs.investment = investmentId
    }
    return refs
  }

  const payloadBody: any = {
    name: task.title,
    code: task.code || undefined,
    description: task.description,
    taskTypeRef: task.taskTypeRef,
    taskPriorityRef: task.taskPriorityRef,
    taskStatusRef: task.taskStatusRef || undefined,
    taskTiming: task.taskTiming || undefined,
    dueDate: task.dueDate ? toISOFormat(task.dueDate) : null,
    templateStartDate: task.templateStartDate ? toISOFormat(task.templateStartDate) : undefined,
    startDate: task.startDate ? toISOFormat(task.startDate) : undefined,
    endDate: task.endDate ? toISOFormat(task.endDate) : undefined,
    assignedEmployee: task.assignedEmployeeId || businessAppContext.userInfo?.employeeDetails?.employeeId || undefined,
    assignedUserId: task.assignedUserId || businessAppContext.userInfo?.id || undefined,
    ...getEntityRef()
  }

  // Creator fields handling: create vs update
  if (options.isUpdate) {
    if (task.creatorEmployeeId) {
      payloadBody.creatorEmployee = task.creatorEmployeeId
    }
    if (task.creatorUserId) {
      payloadBody.creatorUserId = task.creatorUserId
    }
  } else {
    const creatorEmployeeId = businessAppContext.userInfo?.employeeDetails?.employeeId
    const creatorUserId = businessAppContext.userInfo?.id

    // Use employeeDetails.employeeId if available, otherwise try direct employeeId field
    payloadBody.creatorEmployee = creatorEmployeeId || (businessAppContext.userInfo as any)?.employeeId
    payloadBody.creatorUserId = creatorUserId
  }

  if (options.isUpdate && task.id) {
    payloadBody.id = task.id
    payloadBody.version = task.version
  }

  // Always pass documents array - empty array will delete all, IDs will keep existing, objects will create new
  payloadBody.documents = task.documents || []

  return {
    investmentTask: payloadBody
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
