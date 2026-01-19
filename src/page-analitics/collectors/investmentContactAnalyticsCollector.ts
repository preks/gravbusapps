import {
  AnalyticsActivity,
  AnalyticsContact,
  AnalyticsHeaderContext,
  AnalyticsLink,
  AnalyticsMetric,
  AnalyticsRawSnapshot,
  AnalyticsSummary
} from '../types/analytics-context'
import type { GraphQLClient } from '@/common/network/graphql/GraphQLClient'
import { compactRecord, limitArray, normalizeEmail, normalizePhone } from './collectorUtils'
import { buildInvestmentContactByIdQuery } from '@/common/data/investment/queries/investmentContactQueries'
import { toInvestmentContact } from '@/common/data/investment/types/investmentContactTypes'

type InvestmentContactRecord = Record<string, any>

const GET_INVESTMENT_CONTACT_ANALYTICS = buildInvestmentContactByIdQuery()

function buildInvestmentContactSummary(contact: InvestmentContactRecord): AnalyticsSummary {
  const owner = contact.ownerEmployee
  const account = contact.accountContacts?.[0]?.account ?? contact.account
  const primaryChannel = Array.isArray(contact.communicationChannels) ? contact.communicationChannels[0] : undefined

  return compactRecord({
    fullName:
      contact.fullName || contact.displayName || [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim(),
    email: normalizeEmail(contact.email),
    phone: normalizePhone(contact.phone ?? contact.phoneNumber),
    jobTitle: contact.jobTitle ?? contact.jobPosition,
    department: contact.department,
    academicTitle: contact.academicTitle?.value,
    language: contact.language?.value,
    contactType: contact.contactType,
    birthDate: contact.birthDate,
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
    owner: owner?.id
      ? compactRecord({
          id: owner.id,
          name: owner.displayName || [owner.firstName, owner.lastName].filter(Boolean).join(' ').trim(),
          jobPosition: owner.employeePosition?.jobPosition?.name,
          organizationalUnit: owner.employeePosition?.organizationalUnit?.name
        })
      : undefined,
    account: account?.id
      ? compactRecord({
          id: account.id,
          name: account.name,
          website: account.website,
          industry: account.industryClass?.value ?? account.industry?.value,
          legalForm: account.legalForm?.value,
          ownerEmployee: account.ownerEmployee?.id
            ? compactRecord({
                id: account.ownerEmployee.id,
                name:
                  account.ownerEmployee.displayName ||
                  [account.ownerEmployee.firstName, account.ownerEmployee.lastName].filter(Boolean).join(' ').trim()
              })
            : undefined
        })
      : undefined,
    primaryCommunicationChannel: primaryChannel
      ? compactRecord({
          value: primaryChannel.value,
          type: primaryChannel.communicationChannel?.value,
          code: primaryChannel.communicationChannel?.code
        })
      : undefined
  }) as AnalyticsSummary
}

function buildInvestmentContactAssociates(contact: InvestmentContactRecord): AnalyticsContact[] {
  const associates: AnalyticsContact[] = []

  if (contact.ownerEmployee?.id) {
    associates.push({
      id: contact.ownerEmployee.id,
      name:
        contact.ownerEmployee.displayName ||
        [contact.ownerEmployee.firstName, contact.ownerEmployee.lastName].filter(Boolean).join(' ').trim() ||
        undefined,
      relation: 'contactOwner',
      role: contact.ownerEmployee.employeePosition?.jobPosition?.name || undefined,
      type: 'employee',
      meta: compactRecord({
        organizationalUnit: contact.ownerEmployee.employeePosition?.organizationalUnit?.name
      })
    })
  }

  const primaryAccount = contact.accountContacts?.[0]?.account ?? contact.account
  if (primaryAccount?.ownerEmployee?.id) {
    associates.push({
      id: primaryAccount.ownerEmployee.id,
      name:
        primaryAccount.ownerEmployee.displayName ||
        [primaryAccount.ownerEmployee.firstName, primaryAccount.ownerEmployee.lastName]
          .filter(Boolean)
          .join(' ')
          .trim() ||
        undefined,
      relation: 'accountOwner',
      type: 'employee'
    })
  }

  const dedupe = new Map<string, AnalyticsContact>()
  associates.forEach(associate => {
    const key = `${associate.id}:${associate.relation || ''}`
    if (!dedupe.has(key)) {
      dedupe.set(key, associate)
    }
  })

  return Array.from(dedupe.values())
}

function buildInvestmentContactMetrics(params: {
  contact: InvestmentContactRecord
  activityCount: number
  taskCount: number
  noteCount: number
}): AnalyticsMetric[] {
  const { contact, activityCount, taskCount, noteCount } = params
  const metrics: AnalyticsMetric[] = []

  metrics.push({
    id: 'investment_contact.activities.total',
    label: 'Activities',
    value: activityCount
  })

  if (taskCount > 0) {
    metrics.push({
      id: 'investment_contact.tasks.total',
      label: 'Tasks',
      value: taskCount
    })
  }

  if (noteCount > 0) {
    metrics.push({
      id: 'investment_contact.notes.total',
      label: 'Notes',
      value: noteCount
    })
  }

  if (contact.contactType) {
    metrics.push({
      id: 'investment_contact.type.current',
      label: 'Contact Type',
      value: contact.contactType
    })
  }

  return metrics
}

function buildInvestmentContactActivities(params: {
  activities: any[]
  tasks: any[]
  notes: any[]
}): AnalyticsActivity[] {
  const { activities, tasks, notes } = params

  const mappedActivities = limitArray(activities ?? [], 5).map(activity => {
    return {
      id: activity.id,
      type: 'activity',
      title: activity.title || 'Activity',
      occurredAt: activity.occurredAt || activity.createdAt || undefined,
      meta: compactRecord({
        description: activity.description,
        activityType: activity.activityType?.value || activity.activityType?.code,
        createdBy: activity.createdBy,
        ownerEmployeeId: activity.ownerEmployee?.id
      })
    } as AnalyticsActivity
  })

  const mappedTasks = limitArray(tasks ?? [], 5).map(task => {
    return {
      id: task.id,
      type: 'task',
      title: task.name || 'Task',
      occurredAt: task.dueDate || task.createdAt || undefined,
      relationId: task.assignedEmployee?.id || undefined,
      meta: compactRecord({
        statusRef: task.taskStatusRef,
        timingType: task.taskTiming,
        priority: task.taskPriority?.value || task.taskPriority?.code || task.taskPriorityRef,
        assignedEmployee:
          task.assignedEmployee?.displayName ||
          [task.assignedEmployee?.firstName, task.assignedEmployee?.lastName].filter(Boolean).join(' ').trim() ||
          undefined,
        createdBy:
          task.creatorEmployee?.displayName ||
          [task.creatorEmployee?.firstName, task.creatorEmployee?.lastName].filter(Boolean).join(' ').trim() ||
          undefined
      })
    } as AnalyticsActivity
  })

  const mappedNotes = limitArray(notes ?? [], 3).map(note => {
    return {
      id: note.id,
      type: 'note',
      title: note.title || note.noteTitle || 'Note',
      occurredAt: note.createdAt || undefined,
      meta: compactRecord({
        author: note.createdBy,
        text: note.text || note.noteText
      })
    } as AnalyticsActivity
  })

  const combined = [...mappedActivities, ...mappedTasks, ...mappedNotes].sort((a, b) => {
    const aDate = a.occurredAt ? new Date(a.occurredAt).getTime() : 0
    const bDate = b.occurredAt ? new Date(b.occurredAt).getTime() : 0
    return bDate - aDate
  })

  return limitArray(combined, 10)
}

function buildInvestmentContactLinks(contact: InvestmentContactRecord): AnalyticsLink[] {
  const links: AnalyticsLink[] = []

  if (contact.accountContacts?.[0]?.account?.website) {
    const account = contact.accountContacts[0].account
    links.push({
      id: 'investment_contact.account.website',
      title: account.name ? `${account.name} website` : 'Account website',
      url: account.website,
      type: 'website'
    })
  }

  return links
}

function buildInvestmentContactRaw(
  contact: InvestmentContactRecord,
  associates: AnalyticsContact[],
  activities: any[],
  tasks: any[],
  notes: any[]
): AnalyticsRawSnapshot {
  const primaryAccount = contact.accountContacts?.[0]?.account ?? contact.account

  const rawContact = compactRecord({
    id: contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName,
    fullName:
      contact.fullName || contact.displayName || [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim(),
    email: normalizeEmail(contact.email),
    phone: normalizePhone(contact.phone ?? contact.phoneNumber),
    jobTitle: contact.jobTitle ?? contact.jobPosition,
    department: contact.department,
    academicTitle: contact.academicTitle?.value,
    salutation: contact.salutation?.value,
    contactType: contact.contactType,
    birthDate: contact.birthDate,
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
    ownerEmployee: contact.ownerEmployee?.id
      ? compactRecord({
          id: contact.ownerEmployee.id,
          firstName: contact.ownerEmployee.firstName,
          lastName: contact.ownerEmployee.lastName
        })
      : undefined,
    account: primaryAccount?.id
      ? compactRecord({
          id: primaryAccount.id,
          name: primaryAccount.name,
          website: primaryAccount.website
        })
      : undefined,
    communicationChannels: Array.isArray(contact.communicationChannels)
      ? contact.communicationChannels.map((channel: any) =>
          compactRecord({
            value: channel.value,
            type: channel.communicationChannel?.value,
            code: channel.communicationChannel?.code
          })
        )
      : undefined,
    associates: associates.map(item =>
      compactRecord({
        id: item.id,
        relation: item.relation,
        role: item.role,
        meta: item.meta
      })
    ),
    activities: limitArray(activities ?? [], 10).map(activity =>
      compactRecord({
        id: activity.id,
        title: activity.title,
        occurredAt: activity.occurredAt || activity.createdAt,
        description: activity.description,
        activityType: activity.activityType?.value || activity.activityType?.code,
        ownerEmployeeId: activity.ownerEmployee?.id
      })
    ),
    tasks: limitArray(tasks ?? [], 10).map(task =>
      compactRecord({
        id: task.id,
        name: task.name,
        dueDate: task.dueDate,
        createdAt: task.createdAt,
        statusRef: task.taskStatusRef,
        timingType: task.taskTiming,
        priority: task.taskPriority?.value || task.taskPriority?.code || task.taskPriorityRef,
        assignedEmployeeId: task.assignedEmployee?.id,
        creatorEmployeeId: task.creatorEmployee?.id
      })
    ),
    notes: limitArray(notes ?? [], 10).map(note =>
      compactRecord({
        id: note.id,
        title: note.title || note.noteTitle,
        createdAt: note.createdAt,
        createdBy: note.createdBy
      })
    )
  })

  return compactRecord({
    investmentContact: rawContact
  })
}

export async function buildInvestmentContactAnalytics(params: {
  entity: { type: string; id: string; name?: string }
  graphqlClient: GraphQLClient
}): Promise<AnalyticsHeaderContext> {
  const { entity, graphqlClient } = params

  const response = await graphqlClient.request<{ InvestmentContactByPk: InvestmentContactRecord | null }>(
    GET_INVESTMENT_CONTACT_ANALYTICS,
    { id: entity.id }
  )

  const rawContact = response?.InvestmentContactByPk
  if (!rawContact) {
    throw new Error(`Investment Contact not found: ${entity.id}`)
  }

  const contact = toInvestmentContact(rawContact)

  const activities = Array.isArray((contact as any).activities) ? (contact as any).activities : []
  const tasks = Array.isArray((contact as any).tasks) ? (contact as any).tasks : []
  const notes = Array.isArray((contact as any).notes) ? (contact as any).notes : []

  const summary = buildInvestmentContactSummary(contact)
  const associates = buildInvestmentContactAssociates(contact)
  const analyticsActivities = buildInvestmentContactActivities({ activities, tasks, notes })
  const links = buildInvestmentContactLinks(contact)

  const metrics = buildInvestmentContactMetrics({
    contact,
    activityCount: activities.length,
    taskCount: tasks.length,
    noteCount: notes.length
  })

  const raw = buildInvestmentContactRaw(contact, associates, activities, tasks, notes)

  const meta = compactRecord({
    as_of: new Date().toISOString(),
    activityCount: activities.length,
    taskCount: tasks.length,
    noteCount: notes.length
  })

  return {
    mode: 'header',
    entity: {
      type: entity.type,
      id: entity.id,
      name:
        entity.name ||
        contact.fullName ||
        [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim() ||
        undefined
    },
    metrics,
    summary: Object.keys(summary).length ? summary : undefined,
    contacts: associates.length ? associates : undefined,
    activities: analyticsActivities.length ? analyticsActivities : undefined,
    links: links.length ? links : undefined,
    raw: Object.keys(raw).length ? raw : undefined,
    meta,
    componentIds: ['irm-investment-contact-header', 'irm-investment-contact-overview']
  }
}
