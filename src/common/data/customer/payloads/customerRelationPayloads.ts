import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { toISOFormat } from '@/common/utils/dateFormatter'

// ==============================
// Customer Task Payload
// ==============================

export interface CustomerTaskFormData {
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

export const buildCustomerTaskPayload = (
  task: CustomerTaskFormData,
  businessAppContext: BusinessAppContextProps,
  options: { isUpdate?: boolean } = {}
) => {
  // Helper to extract entity ID from object or string
  const getEntityId = (entity: any): string | undefined => {
    if (!entity) return undefined
    if (typeof entity === 'string') return entity
    return entity.id
  }

  // Helper to build entity references from task or context
  const getEntityRef = () => {
    const refs: Record<string, any> = {}

    // Priority 1: Entity from task form
    const accountId = getEntityId(task.account)
    const contactId = getEntityId(task.contact)
    const opportunityId = getEntityId(task.opportunity)
    const leadId = getEntityId(task.lead)

    if (accountId) refs.account = accountId
    if (contactId) refs.contact = contactId
    if (opportunityId) refs.opportunity = opportunityId
    if (leadId) refs.lead = leadId

    // Priority 2: Entity from additionalData (fallback)
    const additional: any = (businessAppContext as any)?.additionalData || {}
    const external: any = additional.externalContextData || {}

    if (!refs.account && (additional.accountId || external.accountId || external.account?.id)) {
      refs.account = additional.accountId || external.accountId || external.account?.id
    }
    if (!refs.contact && (additional.contactId || external.contactId || external.contact?.id)) {
      refs.contact = additional.contactId || external.contactId || external.contact?.id
    }
    if (!refs.opportunity && (additional.opportunityId || external.opportunityId || external.opportunity?.id)) {
      refs.opportunity = additional.opportunityId || external.opportunityId || external.opportunity?.id
    }
    if (!refs.lead && (additional.leadId || external.leadId || external.lead?.id)) {
      refs.lead = additional.leadId || external.leadId || external.lead?.id
    }

    return refs
  }

  const payloadBody: any = {
    name: task.title,
    code: task.code || undefined,
    description: task.description || undefined,
    typeRef: task.taskTypeRef,
    priorityRef: task.taskPriorityRef,
    statusRef: task.taskStatusRef || 'SalesTaskStatus:v1:PENDING',
    timingType: task.taskTiming || 'DEADLINE',
    dueDate: task.dueDate ? toISOFormat(task.dueDate) : null,
    templateStartDate: task.templateStartDate ? toISOFormat(task.templateStartDate) : null,
    startDate: task.startDate ? toISOFormat(task.startDate) : null,
    endDate: task.endDate ? toISOFormat(task.endDate) : null,
    assignedEmployee: task.assignedEmployeeId || undefined,
    assignedUserId: task.assignedUserId || undefined,
    creatorEmployee: task.creatorEmployeeId || undefined,
    creatorUserId: task.creatorUserId || undefined,
    ...getEntityRef()
  }

  // Always pass documents array - empty array will delete all, IDs will keep existing, objects will create new
  payloadBody.documents = task.documents || []

  // Include id/version for updates
  if (options.isUpdate && task.id) {
    payloadBody.id = task.id
    payloadBody.version = task.version || 0
  }

  return {
    salesTask: payloadBody
  }
}
