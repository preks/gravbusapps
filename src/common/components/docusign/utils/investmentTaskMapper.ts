import { Task } from '@/common/components/common-relations/detail-sheets/task-detail-sheet'
import { InvestmentTaskFormData } from '@/common/data/investment/payloads/investmentRelationPayloads'

const buildEntityRef = (value?: any): { id: string } | undefined => {
  if (!value) return undefined
  if (typeof value === 'string') {
    return value ? { id: value } : undefined
  }
  if (typeof value === 'object' && value.id) {
    return { id: value.id }
  }
  return undefined
}

export const buildInvestmentTaskFormDataFromTask = (task?: Task | null): InvestmentTaskFormData | null => {
  if (!task) return null

  const raw = (task.rawInvestmentTask as any) || {}
  const documents =
    (raw.documents || task.documents || []).map((doc: any) => ({
      id: doc.id,
      version: doc.version ?? doc?.versionNumber ?? 0,
      name: doc.name,
      description: doc.description,
      documentGroupRef: doc.documentGroupRef,
      documentTypeRef: doc.documentTypeRef,
      fileInfo: doc.fileInfo
    })) || []

  return {
    id: raw.id || task.id,
    version: raw.version ?? task.version,
    title: raw.name || task.name || 'Task',
    code: raw.code || task.code,
    description: raw.description || task.description,
    taskTypeRef: raw.taskTypeRef || task.taskTypeRef,
    taskPriorityRef: raw.taskPriorityRef || task.taskPriorityRef,
    taskStatusRef: raw.taskStatusRef || task.taskStatusRef,
    taskTiming: raw.taskTiming || task.taskTiming || task.timingType,
    dueDate: (raw.dueDate || task.dueDate || null) as any,
    templateStartDate: (raw.templateStartDate || task.templateStartDate || null) as any,
    startDate: (raw.startDate || task.startDate || null) as any,
    endDate: (raw.endDate || task.endDate || null) as any,
    assignedEmployeeId: raw.assignedEmployeeId || task.assignedEmployeeId,
    assignedUserId: raw.assignedUserId || task.assignedUserId,
    creatorEmployeeId: raw.creatorEmployeeId || task.creatorEmployeeId,
    creatorUserId: raw.creatorUserId || task.creatorUserId,
    investment:
      buildEntityRef(raw.investment || raw.investmentId) ||
      (task.reference?.type === 'investment' ? { id: task.reference.id } : undefined),
    account: buildEntityRef(raw.account || raw.accountId) || (task.accountId ? { id: task.accountId } : undefined),
    contact: buildEntityRef(raw.contact || raw.contactId) || (task.contactId ? { id: task.contactId } : undefined),
    opportunity:
      buildEntityRef(raw.opportunity || raw.opportunityId) ||
      (task.opportunityId ? { id: task.opportunityId } : undefined),
    lead: buildEntityRef(raw.lead || raw.leadId) || (task.leadId ? { id: task.leadId } : undefined),
    documents
  }
}

