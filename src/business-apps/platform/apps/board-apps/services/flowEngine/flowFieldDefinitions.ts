/**
 * Flow Engine field definitions for selectable import fields.
 * Mirrors the EntityFieldDef structure used by system data imports.
 */

type TranslateFn = (key: string, args?: Record<string, unknown>) => string

export interface FlowFieldDef {
  key: string
  label: string
  type: 'text' | 'date' | 'number' | 'status'
  defaultSelected: boolean
}

function buildFlowFields(t: TranslateFn): FlowFieldDef[] {
  return [
    { key: 'flowId', label: t('flow-field-flow-id'), type: 'text', defaultSelected: true },
    { key: 'name', label: t('flow-field-flow-name'), type: 'text', defaultSelected: true },
    { key: 'status', label: t('flow-field-status'), type: 'status', defaultSelected: true },
    { key: 'progress', label: t('flow-field-progress'), type: 'text', defaultSelected: true },
    { key: 'initiatedBy', label: t('flow-field-initiated-by'), type: 'text', defaultSelected: true },
    { key: 'initiatedById', label: t('flow-field-initiated-by-id'), type: 'text', defaultSelected: false },
    { key: 'startTime', label: t('flow-field-start-time'), type: 'date', defaultSelected: true },
    { key: 'updateTime', label: t('flow-field-last-updated'), type: 'date', defaultSelected: true },
    { key: 'endTime', label: t('flow-field-end-time'), type: 'date', defaultSelected: true },
    { key: 'priority', label: t('flow-field-priority'), type: 'text', defaultSelected: true },
    { key: 'isOverdue', label: t('flow-field-overdue'), type: 'text', defaultSelected: false },
    { key: 'templateId', label: t('flow-field-template-id'), type: 'text', defaultSelected: false }
  ]
}

function buildTaskFields(t: TranslateFn): FlowFieldDef[] {
  return [
    { key: 'taskId', label: t('flow-field-task-id'), type: 'text', defaultSelected: true },
    { key: 'flowId', label: t('flow-field-flow-id'), type: 'text', defaultSelected: true },
    { key: 'flowName', label: t('flow-field-flow-name'), type: 'text', defaultSelected: true },
    { key: 'title', label: t('flow-field-title'), type: 'text', defaultSelected: true },
    { key: 'name', label: t('flow-field-step-name'), type: 'text', defaultSelected: false },
    { key: 'status', label: t('flow-field-status'), type: 'status', defaultSelected: true },
    { key: 'priority', label: t('flow-field-priority'), type: 'text', defaultSelected: true },
    { key: 'customStatus', label: t('flow-field-custom-status'), type: 'text', defaultSelected: false },
    { key: 'dueDate', label: t('flow-field-due-date'), type: 'date', defaultSelected: true },
    { key: 'scheduledAt', label: t('flow-field-scheduled-at'), type: 'date', defaultSelected: true },
    { key: 'completedAt', label: t('flow-field-completed-at'), type: 'date', defaultSelected: true },
    { key: 'assignedTo', label: t('flow-field-assigned-to'), type: 'text', defaultSelected: true },
    { key: 'claimedBy', label: t('flow-field-claimed-by'), type: 'text', defaultSelected: false },
    { key: 'assignmentStatus', label: t('flow-field-assignment-status'), type: 'text', defaultSelected: false },
    { key: 'stepIndex', label: t('flow-field-step-index'), type: 'number', defaultSelected: true },
    { key: 'templateId', label: t('flow-field-template-id'), type: 'text', defaultSelected: false },
    { key: 'templateName', label: t('flow-field-template-name'), type: 'text', defaultSelected: false }
  ]
}

export function getFlowFieldDefs(t: TranslateFn, entity: 'flows' | 'tasks'): FlowFieldDef[] {
  return entity === 'flows' ? buildFlowFields(t) : buildTaskFields(t)
}

export function getDefaultSelectedKeys(t: TranslateFn, entity: 'flows' | 'tasks'): string[] {
  return getFlowFieldDefs(t, entity)
    .filter(f => f.defaultSelected)
    .map(f => f.key)
}
