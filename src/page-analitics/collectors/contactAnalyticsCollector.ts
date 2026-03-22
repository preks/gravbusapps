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

const GET_CONTACT_ANALYTICS = `
  query GetContactAnalytics($id: uuid!) {
    Contact(where: { id: { _eq: $id }, isDeleted: { _eq: false } }) {
      id
      firstName
      lastName
      fullName
      email
      phone
      jobTitle
      department
      linkedinUrl
      xingUrl
      bio
      contactType
      birthDate
      version
      createdAt
      updatedAt
      academicTitle {
        value
      }
      language {
        value
      }
      communicationChannels(where: { isDeleted: { _eq: false } }) {
        id
        value
        communicationChannel {
          code
          value
        }
      }
      ownerEmployee {
        id
        firstName
        lastName
        displayName
        employeePosition {
          jobPosition {
            name
          }
          organizationalUnit {
            name
          }
        }
      }
      account {
        id
        name
        email
        phone
        website
        industry {
          value
        }
        legalForm {
          value
        }
        numberOfEmployees {
          value
        }
        annualRevenue {
          value
        }
        ownerEmployee {
          id
          firstName
          lastName
          displayName
        }
      }
      accountContacts(where: { isDeleted: { _eq: false } }) {
        id
        contactType
        account {
          id
          name
          ownerEmployee {
            id
            displayName
          }
        }
      }
    }
  }
`

const GET_CONTACT_ACTIVITIES = `
  query GetContactActivities($contactId: uuid!, $limit: Int = 10) {
    SalesActivity(
      where: { contact: { id: { _eq: $contactId } }, isDeleted: { _eq: false } }
      orderBy: { createdAt: DESC }
      limit: $limit
    ) {
      id
      title
      description
      createdAt
      occurredAt
      completedAt
      createdBy
      activityType {
        code
        value
      }
      ownerEmployee {
        id
        firstName
        lastName
        displayName
      }
    }
  }
`

const GET_CONTACT_TASKS = `
  query GetContactTasks($contactId: uuid!, $limit: Int = 10) {
    SalesTask(
      where: { contact: { id: { _eq: $contactId } }, isDeleted: { _eq: false } }
      orderBy: { createdAt: DESC }
      limit: $limit
    ) {
      id
      name
      description
      createdAt
      dueDate
      typeRef
      statusRef
      timingType
      priorityRef
      type {
        value
      }
      priority {
        value
      }
      taskAssignees(where: { isDeleted: { _eq: false } }) {
        assignedEmployee {
          id
          firstName
          lastName
          displayName
        }
      }
      creatorEmployee {
        id
        firstName
        lastName
        displayName
      }
    }
  }
`

const GET_CONTACT_NOTES = `
  query GetContactNotes($contactId: uuid!, $limit: Int = 10) {
    CrmNote(
      where: { contact: { id: { _eq: $contactId } }, isDeleted: { _eq: false } }
      orderBy: { createdAt: DESC }
      limit: $limit
    ) {
      id
      noteTitle
      noteText
      createdAt
      createdBy
    }
  }
`

type ContactRecord = Record<string, any>

function buildContactSummary(contact: ContactRecord): AnalyticsSummary {
  const owner = contact.ownerEmployee
  const account = contact.account
  const primaryChannel = contact.communicationChannels?.[0]

  return compactRecord({
    fullName: contact.fullName || [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim(),
    email: normalizeEmail(contact.email),
    phone: normalizePhone(contact.phone),
    jobTitle: contact.jobTitle,
    department: contact.department,
    academicTitle: contact.academicTitle?.value,
    language: contact.language?.value,
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
          email: normalizeEmail(account.email),
          phone: normalizePhone(account.phone),
          website: account.website,
          industry: account.industry?.value,
          legalForm: account.legalForm?.value,
          numberOfEmployees: account.numberOfEmployees?.value,
          annualRevenue: account.annualRevenue?.value,
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

function buildContactAssociates(contact: ContactRecord): AnalyticsContact[] {
  const contacts: AnalyticsContact[] = []

  if (contact.ownerEmployee?.id) {
    contacts.push({
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

  if (contact.account?.ownerEmployee?.id) {
    contacts.push({
      id: contact.account.ownerEmployee.id,
      name:
        contact.account.ownerEmployee.displayName ||
        [contact.account.ownerEmployee.firstName, contact.account.ownerEmployee.lastName]
          .filter(Boolean)
          .join(' ')
          .trim() ||
        undefined,
      relation: 'accountOwner',
      type: 'employee',
      meta: compactRecord({
        accountId: contact.account.id,
        accountName: contact.account.name
      })
    })
  }

  contact.accountContacts?.forEach((entry: any) => {
    if (entry?.account?.ownerEmployee?.id) {
      contacts.push({
        id: entry.account.ownerEmployee.id,
        name: entry.account.ownerEmployee.displayName || undefined,
        relation: entry.contactType || 'relatedAccountOwner',
        type: 'employee',
        meta: compactRecord({
          accountId: entry.account.id,
          accountName: entry.account.name
        })
      })
    }
  })

  const dedupeMap = new Map<string, AnalyticsContact>()
  contacts.forEach(item => {
    const key = `${item.id}:${item.relation || ''}`
    if (!dedupeMap.has(key)) {
      dedupeMap.set(key, item)
    }
  })

  return Array.from(dedupeMap.values())
}

function buildContactMetrics(params: {
  contact: ContactRecord
  activityCount: number
  taskCount: number
  noteCount: number
}): AnalyticsMetric[] {
  const { contact, activityCount, taskCount, noteCount } = params
  const metrics: AnalyticsMetric[] = []

  metrics.push({
    id: 'contact.activities.total',
    label: 'Activities',
    value: activityCount
  })

  if (taskCount > 0) {
    metrics.push({
      id: 'contact.tasks.total',
      label: 'Tasks',
      value: taskCount
    })
  }

  if (noteCount > 0) {
    metrics.push({
      id: 'contact.notes.total',
      label: 'Notes',
      value: noteCount
    })
  }

  if (contact.account?.id) {
    metrics.push({
      id: 'contact.account.linked',
      label: 'Has Account',
      value: true,
      meta: {
        accountId: contact.account.id,
        accountName: contact.account.name
      }
    })
  }

  if (contact.communicationChannels && contact.communicationChannels.length > 0) {
    metrics.push({
      id: 'contact.communicationChannels.total',
      label: 'Communication Channels',
      value: contact.communicationChannels.length
    })
  }

  return metrics
}

function buildContactActivities(params: { activities: any[]; tasks: any[]; notes: any[] }): AnalyticsActivity[] {
  const { activities, tasks, notes } = params

  const mappedActivities = limitArray(activities, 5).map(activity => {
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

  const mappedTasks = limitArray(tasks, 5).map(task => {
    const typeValue = task.type?.value || task.typeRef || ''
    const normalizedType = typeValue.toLowerCase() === 'approval' ? 'approval' : 'task'
    const primaryAssignee = task.taskAssignees?.[0]?.assignedEmployee

    return {
      id: task.id,
      type: normalizedType,
      title: task.name || 'Task',
      occurredAt: task.dueDate || task.createdAt || undefined,
      relationId: primaryAssignee?.id || undefined,
      meta: compactRecord({
        statusRef: task.statusRef,
        timingType: task.timingType,
        priority: task.priority?.value || task.priorityRef,
        assignedEmployee:
          primaryAssignee?.displayName ||
          [primaryAssignee?.firstName, primaryAssignee?.lastName].filter(Boolean).join(' ').trim() ||
          undefined,
        createdBy:
          task.creatorEmployee?.displayName ||
          [task.creatorEmployee?.firstName, task.creatorEmployee?.lastName].filter(Boolean).join(' ').trim() ||
          undefined
      })
    } as AnalyticsActivity
  })

  const mappedNotes = limitArray(notes, 3).map(note => {
    return {
      id: note.id,
      type: 'note',
      title: note.noteTitle || 'Note',
      occurredAt: note.createdAt || undefined,
      meta: compactRecord({
        author: note.createdBy,
        text: note.noteText
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

function buildContactLinks(contact: ContactRecord): AnalyticsLink[] {
  const links: AnalyticsLink[] = []

  if (contact.linkedinUrl) {
    links.push({
      id: 'contact.linkedin',
      title: contact.fullName ? `${contact.fullName} LinkedIn` : 'LinkedIn',
      url: contact.linkedinUrl,
      type: 'linkedin'
    })
  }

  if (contact.xingUrl) {
    links.push({
      id: 'contact.xing',
      title: contact.fullName ? `${contact.fullName} Xing` : 'Xing',
      url: contact.xingUrl,
      type: 'xing'
    })
  }

  return links
}

function buildContactRaw(contact: ContactRecord, associates: AnalyticsContact[]): AnalyticsRawSnapshot {
  const rawContact = compactRecord({
    id: contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName,
    fullName: contact.fullName,
    displayName: contact.displayName,
    email: normalizeEmail(contact.email),
    phone: normalizePhone(contact.phone),
    jobTitle: contact.jobTitle,
    department: contact.department,
    linkedinUrl: contact.linkedinUrl,
    xingUrl: contact.xingUrl,
    bio: contact.bio,
    birthDate: contact.birthDate,
    version: contact.version,
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
    academicTitle: contact.academicTitle?.value,
    language: contact.language?.value,
    communicationChannels: contact.communicationChannels?.map((channel: any) =>
      compactRecord({
        value: channel.value,
        type: channel.communicationChannel?.value,
        code: channel.communicationChannel?.code
      })
    ),
    account: contact.account?.id
      ? compactRecord({
          id: contact.account.id,
          name: contact.account.name,
          email: normalizeEmail(contact.account.email),
          phone: normalizePhone(contact.account.phone),
          website: contact.account.website
        })
      : undefined,
    associates: associates.map(item =>
      compactRecord({
        id: item.id,
        relation: item.relation,
        role: item.role,
        meta: item.meta
      })
    )
  })

  return compactRecord({
    contact: rawContact
  })
}

export async function buildContactAnalytics(params: {
  entity: { type: string; id: string; name?: string }
  graphqlClient: GraphQLClient
}): Promise<AnalyticsHeaderContext> {
  const { entity, graphqlClient } = params

  const response = await graphqlClient.request<{ Contact: ContactRecord[] }>(GET_CONTACT_ANALYTICS, {
    id: entity.id
  })

  const contact = response?.Contact?.[0]
  if (!contact) {
    throw new Error(`Contact not found: ${entity.id}`)
  }

  const [activitiesResult, tasksResult, notesResult] = await Promise.allSettled([
    graphqlClient.request<{ SalesActivity: any[] }>(GET_CONTACT_ACTIVITIES, { contactId: entity.id }),
    graphqlClient.request<{ SalesTask: any[] }>(GET_CONTACT_TASKS, { contactId: entity.id }),
    graphqlClient.request<{ CrmNote: any[] }>(GET_CONTACT_NOTES, { contactId: entity.id })
  ])

  const activities = activitiesResult.status === 'fulfilled' ? (activitiesResult.value?.SalesActivity ?? []) : []
  const tasks = tasksResult.status === 'fulfilled' ? (tasksResult.value?.SalesTask ?? []) : []
  const notes = notesResult.status === 'fulfilled' ? (notesResult.value?.CrmNote ?? []) : []

  if (activitiesResult.status === 'rejected') {
    console.warn('Failed to load contact activities for analytics:', activitiesResult.reason)
  }

  if (tasksResult.status === 'rejected') {
    console.warn('Failed to load contact tasks for analytics:', tasksResult.reason)
  }

  if (notesResult.status === 'rejected') {
    console.warn('Failed to load contact notes for analytics:', notesResult.reason)
  }

  const summary = buildContactSummary(contact)
  const associates = buildContactAssociates(contact)
  const analyticsActivities = buildContactActivities({ activities, tasks, notes })
  const links = buildContactLinks(contact)

  const metrics = buildContactMetrics({
    contact,
    activityCount: activities.length,
    taskCount: tasks.length,
    noteCount: notes.length
  })

  const raw = buildContactRaw(contact, associates)

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
      name: entity.name || contact.fullName || contact.displayName || undefined
    },
    metrics,
    summary: Object.keys(summary).length ? summary : undefined,
    contacts: associates.length ? associates : undefined,
    activities: analyticsActivities.length ? analyticsActivities : undefined,
    links: links.length ? links : undefined,
    raw: Object.keys(raw).length ? raw : undefined,
    meta,
    componentIds: ['crm-contact-header', 'crm-contact-overview']
  }
}
