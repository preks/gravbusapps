import type { Activity } from '@/common/data/relations/types/activityTypes'
import type { ExportFieldDefinition } from '../../types/exportFieldTypes'
import {
  formatExportCatalog,
  formatExportDateValue,
  formatExportText,
  formatOwnerEmployee
} from '../../utils/exportFormatHelpers'
import { buildOwnerEmployeeIdExportField, buildRecordIdExportField } from '../../utils/exportExternalIdFieldBuilders'
import {
  formatActivityLinkedAccount,
  formatActivityLinkedContact,
  formatActivityLinkedLead,
  formatActivityLinkedOpportunity,
  formatActivityReference,
  formatActivityReferenceType
} from './activityExportFormatters'

type EntityWithRelatedId = Activity & {
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

export function buildCommonActivityExportFields<T extends Activity = Activity>(): ExportFieldDefinition<T>[] {
  return [
    {
      key: 'title',
      label: 'Title',
      formKeys: ['title'],
      defaultSelected: true,
      format: activity => formatExportText(activity.title)
    },
    {
      key: 'activityType',
      label: 'Activity Type',
      formKeys: ['activityTypeRef'],
      defaultSelected: true,
      format: activity => formatExportCatalog(activity.activityType)
    },
    {
      key: 'description',
      label: 'Description',
      formKeys: ['description'],
      defaultSelected: false,
      format: activity => formatExportText(activity.description)
    },
    {
      key: 'ownerEmployee',
      label: 'Owner',
      formKeys: ['ownerEmployeeId'],
      defaultSelected: true,
      format: activity => formatOwnerEmployee(activity.ownerEmployee)
    },
    {
      key: 'reference',
      label: 'Reference',
      formKeys: ['accountId', 'contactId', 'leadId', 'opportunityId'],
      defaultSelected: true,
      format: activity => formatActivityReference(activity)
    },
    {
      key: 'referenceType',
      label: 'Reference Type',
      formKeys: ['accountId', 'contactId', 'leadId', 'opportunityId'],
      defaultSelected: false,
      format: activity => formatActivityReferenceType(activity)
    },
    {
      key: 'linkedAccount',
      label: 'Linked Account',
      formKeys: ['accountId'],
      defaultSelected: false,
      format: activity => formatActivityLinkedAccount(activity)
    },
    {
      key: 'linkedContact',
      label: 'Linked Contact',
      formKeys: ['contactId'],
      defaultSelected: false,
      format: activity => formatActivityLinkedContact(activity)
    },
    {
      key: 'linkedLead',
      label: 'Linked Lead',
      formKeys: ['leadId'],
      defaultSelected: false,
      format: activity => formatActivityLinkedLead(activity)
    },
    {
      key: 'linkedOpportunity',
      label: 'Linked Opportunity',
      formKeys: ['opportunityId'],
      defaultSelected: false,
      format: activity => formatActivityLinkedOpportunity(activity)
    },
    {
      key: 'source',
      label: 'Source',
      formKeys: ['source'],
      defaultSelected: false,
      format: activity => formatExportText(activity.source)
    },
    {
      key: 'occurredAt',
      label: 'Occurred Date',
      formKeys: ['occurredAt'],
      defaultSelected: true,
      isDateColumn: true,
      format: activity => formatExportDateValue(activity.occurredAt)
    },
    {
      key: 'completedAt',
      label: 'Completed Date',
      formKeys: ['completedAt'],
      defaultSelected: false,
      isDateColumn: true,
      format: activity => formatExportDateValue(activity.completedAt)
    },
    {
      key: 'createdAt',
      label: 'Created Date',
      formKeys: [],
      defaultSelected: true,
      isDateColumn: true,
      format: activity => formatExportDateValue(activity.createdAt)
    },
    {
      key: 'updatedAt',
      label: 'Updated Date',
      formKeys: [],
      defaultSelected: false,
      isDateColumn: true,
      format: activity => formatExportDateValue(activity.updatedAt)
    },
    buildRecordIdExportField<T>('Activity ID'),
    buildOwnerEmployeeIdExportField<T>(),
    buildRelatedIdExportField<T>('accountId', 'Account ID', activity => activity.accountId ?? activity.account?.id),
    buildRelatedIdExportField<T>('contactId', 'Contact ID', activity => activity.contactId ?? activity.contact?.id),
    buildRelatedIdExportField<T>('leadId', 'Lead ID', activity => activity.leadId ?? activity.lead?.id),
    buildRelatedIdExportField<T>(
      'opportunityId',
      'Opportunity ID',
      activity => activity.opportunityId ?? activity.opportunity?.id
    )
  ]
}
