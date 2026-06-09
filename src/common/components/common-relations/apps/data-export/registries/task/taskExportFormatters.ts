import type { Task } from '@/common/data/relations/types/taskTypes'
import type { InvestmentTask } from '@/common/data/investment/types/investmentTaskTypes'
import { formatExportText, formatOwnerEmployee } from '../../utils/exportFormatHelpers'

const REFERENCE_TYPE_LABELS: Record<string, string> = {
  account: 'Account',
  contact: 'Contact',
  lead: 'Lead',
  opportunity: 'Opportunity',
  investment: 'Investment'
}

export function formatTaskAssignees(task: Task): string {
  const assignees = task.taskAssignees
  if (!assignees || assignees.length === 0) {
    return '-'
  }

  const names = assignees.map(assignee => formatOwnerEmployee(assignee.assignedEmployee)).filter(name => name !== '-')

  if (names.length === 0) {
    return '-'
  }

  if (names.length === 1) {
    return names[0]
  }

  return names.join(', ')
}

export function formatTaskReference(task: Task): string {
  if (!task.reference) {
    return 'General'
  }

  return formatExportText(task.reference.name) || '-'
}

export function formatTaskReferenceType(task: Task): string {
  if (!task.reference?.type) {
    return 'General'
  }

  return REFERENCE_TYPE_LABELS[task.reference.type] ?? '-'
}

export function formatTaskLinkedAccount(task: Task): string {
  return formatExportText(task.account?.name)
}

export function formatTaskLinkedContact(task: Task): string {
  const contact = task.contact
  if (!contact) {
    return '-'
  }

  const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim()
  return formatExportText(fullName || contact.code)
}

export function formatTaskLinkedLead(task: Task): string {
  const lead = task.lead
  if (!lead) {
    return '-'
  }

  if (lead.companyName?.trim()) {
    return formatExportText(lead.companyName)
  }

  const person = `${lead.firstName || ''} ${lead.lastName || ''}`.trim()
  return formatExportText(person || lead.code)
}

export function formatTaskLinkedOpportunity(task: Task): string {
  return formatExportText(task.opportunity?.name)
}

export function formatTaskLinkedInvestment(task: InvestmentTask): string {
  return formatExportText(task.investment?.name)
}

export function formatTaskTiming(task: Task): string {
  if (!task.taskTiming) {
    return '-'
  }

  return formatExportText(String(task.taskTiming))
}
