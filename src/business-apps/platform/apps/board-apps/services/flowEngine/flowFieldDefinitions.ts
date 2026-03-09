/**
 * Flow Engine field definitions for selectable import fields.
 * Mirrors the EntityFieldDef structure used by system data imports.
 */

export interface FlowFieldDef {
  key: string
  label: string
  type: 'text' | 'date' | 'number' | 'status'
  defaultSelected: boolean
}

export const FLOW_FIELDS: FlowFieldDef[] = [
  { key: 'flowId', label: 'Flow ID', type: 'text', defaultSelected: true },
  { key: 'name', label: 'Flow Name', type: 'text', defaultSelected: true },
  { key: 'status', label: 'Status', type: 'status', defaultSelected: true },
  { key: 'progress', label: 'Progress', type: 'text', defaultSelected: true },
  { key: 'initiatedBy', label: 'Initiated By', type: 'text', defaultSelected: true },
  { key: 'initiatedById', label: 'Initiated By ID', type: 'text', defaultSelected: false },
  { key: 'startTime', label: 'Start Time', type: 'date', defaultSelected: true },
  { key: 'updateTime', label: 'Last Updated', type: 'date', defaultSelected: true },
  { key: 'endTime', label: 'End Time', type: 'date', defaultSelected: true },
  { key: 'priority', label: 'Priority', type: 'text', defaultSelected: true },
  { key: 'isOverdue', label: 'Overdue', type: 'text', defaultSelected: false },
  { key: 'templateId', label: 'Template ID', type: 'text', defaultSelected: false }
]

export const TASK_FIELDS: FlowFieldDef[] = [
  { key: 'taskId', label: 'Task ID', type: 'text', defaultSelected: true },
  { key: 'flowId', label: 'Flow ID', type: 'text', defaultSelected: true },
  { key: 'flowName', label: 'Flow Name', type: 'text', defaultSelected: true },
  { key: 'title', label: 'Title', type: 'text', defaultSelected: true },
  { key: 'name', label: 'Step Name', type: 'text', defaultSelected: false },
  { key: 'status', label: 'Status', type: 'status', defaultSelected: true },
  { key: 'priority', label: 'Priority', type: 'text', defaultSelected: true },
  { key: 'customStatus', label: 'Custom Status', type: 'text', defaultSelected: false },
  { key: 'dueDate', label: 'Due Date', type: 'date', defaultSelected: true },
  { key: 'scheduledAt', label: 'Scheduled At', type: 'date', defaultSelected: true },
  { key: 'completedAt', label: 'Completed At', type: 'date', defaultSelected: true },
  { key: 'assignedTo', label: 'Assigned To', type: 'text', defaultSelected: true },
  { key: 'claimedBy', label: 'Claimed By', type: 'text', defaultSelected: false },
  { key: 'assignmentStatus', label: 'Assignment Status', type: 'text', defaultSelected: false },
  { key: 'stepIndex', label: 'Step Index', type: 'number', defaultSelected: true },
  { key: 'templateId', label: 'Template ID', type: 'text', defaultSelected: false },
  { key: 'templateName', label: 'Template Name', type: 'text', defaultSelected: false }
]

export function getFlowFieldDefs(entity: 'flows' | 'tasks'): FlowFieldDef[] {
  return entity === 'flows' ? FLOW_FIELDS : TASK_FIELDS
}

export function getDefaultSelectedKeys(entity: 'flows' | 'tasks'): string[] {
  return getFlowFieldDefs(entity)
    .filter(f => f.defaultSelected)
    .map(f => f.key)
}
