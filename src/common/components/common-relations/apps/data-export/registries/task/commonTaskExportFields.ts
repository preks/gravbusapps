import type { Task } from '@/common/data/relations/types/taskTypes'
import type { ExportFieldDefinition } from '../../types/exportFieldTypes'
import {
  formatExportCatalog,
  formatExportDateValue,
  formatExportText,
  formatOwnerEmployee
} from '../../utils/exportFormatHelpers'
import { buildCodeExportField, buildRecordIdExportField } from '../../utils/exportExternalIdFieldBuilders'
import {
  formatTaskAssignees,
  formatTaskLinkedAccount,
  formatTaskLinkedContact,
  formatTaskLinkedLead,
  formatTaskLinkedOpportunity,
  formatTaskReference,
  formatTaskReferenceType,
  formatTaskTiming
} from './taskExportFormatters'

type EntityWithRelatedId = Task & {
  accountId?: string | null
  contactId?: string | null
  leadId?: string | null
  opportunityId?: string | null
}

function buildRelatedIdExportField<T extends EntityWithRelatedId>(
  key: 'accountId' | 'contactId' | 'leadId' | 'opportunityId',
  label: string,
  resolveId: (entity: T) => string | null | undefined
): ExportFieldDefinition<T> {
  return {
    key,
    label,
    formKeys: [key],
    defaultSelected: false,
    exportIdKind: 'external',
    format: entity => formatExportText(resolveId(entity) ?? undefined)
  }
}

function buildCreatorEmployeeIdExportField<T extends Task>(): ExportFieldDefinition<T> {
  return {
    key: 'creatorEmployeeId',
    label: 'Creator ID',
    formKeys: ['creatorEmployeeId'],
    defaultSelected: false,
    exportIdKind: 'external',
    format: task => formatExportText(task.creatorEmployeeId ?? task.creatorEmployee?.id ?? undefined)
  }
}

function buildAssignedEmployeeIdsExportField<T extends Task>(): ExportFieldDefinition<T> {
  return {
    key: 'assignedEmployeeIds',
    label: 'Assignee IDs',
    formKeys: ['taskAssignees'],
    defaultSelected: false,
    exportIdKind: 'external',
    format: task => {
      const ids =
        task.taskAssignees
          ?.map(assignee => assignee.assignedEmployeeId ?? assignee.assignedEmployee?.id)
          .filter((id): id is string => Boolean(id)) ?? []

      if (ids.length === 0) {
        return '-'
      }

      return ids.join(', ')
    }
  }
}

export function buildCommonTaskExportFields<T extends Task = Task>(): ExportFieldDefinition<T>[] {
  return [
    {
      key: 'name',
      label: 'Task',
      formKeys: ['name'],
      defaultSelected: true,
      format: task => formatExportText(task.name)
    },
    {
      key: 'taskType',
      label: 'Type',
      formKeys: ['taskTypeRef'],
      defaultSelected: true,
      format: task => formatExportCatalog(task.taskType)
    },
    {
      key: 'taskPriority',
      label: 'Priority',
      formKeys: ['taskPriorityRef'],
      defaultSelected: true,
      format: task => formatExportCatalog(task.taskPriority)
    },
    {
      key: 'taskStatus',
      label: 'Status',
      formKeys: ['taskStatusRef'],
      defaultSelected: true,
      format: task => formatExportCatalog(task.taskStatus)
    },
    {
      key: 'assignedTo',
      label: 'Assigned To',
      formKeys: ['taskAssignees'],
      defaultSelected: true,
      format: task => formatTaskAssignees(task)
    },
    {
      key: 'creatorEmployee',
      label: 'Created By',
      formKeys: ['creatorEmployeeId'],
      defaultSelected: false,
      format: task => formatOwnerEmployee(task.creatorEmployee)
    },
    {
      key: 'reference',
      label: 'Reference',
      formKeys: ['accountId', 'contactId', 'leadId', 'opportunityId'],
      defaultSelected: true,
      format: task => formatTaskReference(task)
    },
    {
      key: 'referenceType',
      label: 'Reference Type',
      formKeys: ['accountId', 'contactId', 'leadId', 'opportunityId'],
      defaultSelected: false,
      format: task => formatTaskReferenceType(task)
    },
    {
      key: 'linkedAccount',
      label: 'Linked Account',
      formKeys: ['accountId'],
      defaultSelected: false,
      format: task => formatTaskLinkedAccount(task)
    },
    {
      key: 'linkedContact',
      label: 'Linked Contact',
      formKeys: ['contactId'],
      defaultSelected: false,
      format: task => formatTaskLinkedContact(task)
    },
    {
      key: 'linkedLead',
      label: 'Linked Lead',
      formKeys: ['leadId'],
      defaultSelected: false,
      format: task => formatTaskLinkedLead(task)
    },
    {
      key: 'linkedOpportunity',
      label: 'Linked Opportunity',
      formKeys: ['opportunityId'],
      defaultSelected: false,
      format: task => formatTaskLinkedOpportunity(task)
    },
    {
      key: 'description',
      label: 'Description',
      formKeys: ['description'],
      defaultSelected: false,
      format: task => formatExportText(task.description)
    },
    {
      key: 'source',
      label: 'Source',
      formKeys: ['source'],
      defaultSelected: false,
      format: task => formatExportText(task.source)
    },
    {
      key: 'taskTiming',
      label: 'Timing Type',
      formKeys: ['taskTiming'],
      defaultSelected: false,
      format: task => formatTaskTiming(task)
    },
    {
      key: 'dueDate',
      label: 'Due Date',
      formKeys: ['dueDate'],
      defaultSelected: true,
      isDateColumn: true,
      format: task => formatExportDateValue(task.dueDate)
    },
    {
      key: 'startDate',
      label: 'Start Date',
      formKeys: ['startDate'],
      defaultSelected: false,
      isDateColumn: true,
      format: task => formatExportDateValue(task.startDate)
    },
    {
      key: 'endDate',
      label: 'End Date',
      formKeys: ['endDate'],
      defaultSelected: false,
      isDateColumn: true,
      format: task => formatExportDateValue(task.endDate)
    },
    {
      key: 'createdAt',
      label: 'Created Date',
      formKeys: [],
      defaultSelected: true,
      isDateColumn: true,
      format: task => formatExportDateValue(task.createdAt)
    },
    {
      key: 'updatedAt',
      label: 'Updated Date',
      formKeys: [],
      defaultSelected: false,
      isDateColumn: true,
      format: task => formatExportDateValue(task.updatedAt)
    },
    buildRecordIdExportField<T>('Task ID'),
    buildCodeExportField<T>('Code'),
    buildCreatorEmployeeIdExportField<T>(),
    buildAssignedEmployeeIdsExportField<T>(),
    buildRelatedIdExportField<T>('accountId', 'Account ID', task => task.accountId ?? task.account?.id),
    buildRelatedIdExportField<T>('contactId', 'Contact ID', task => task.contactId ?? task.contact?.id),
    buildRelatedIdExportField<T>('leadId', 'Lead ID', task => task.leadId ?? task.lead?.id),
    buildRelatedIdExportField<T>('opportunityId', 'Opportunity ID', task => task.opportunityId ?? task.opportunity?.id)
  ]
}
