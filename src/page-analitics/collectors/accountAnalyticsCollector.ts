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

const GET_ACCOUNT_ANALYTICS = `
  query GetAccountAnalytics($id: uuid!) {
    Account(where: { id: { _eq: $id }, isDeleted: { _eq: false } }) {
      id
      version
      name
      email
      phone
      website
      createdAt
      foundationDate
      legalForm {
        id
        value
      }
      industry {
        id
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
        employeePosition {
          jobPosition {
            name
          }
          organizationalUnit {
            name
          }
        }
      }
      accountContacts(where: { isDeleted: { _eq: false } }) {
        id
        contactType
        contact {
          id
          firstName
          lastName
          fullName
          jobTitle
          department
          email
          phone
          linkedinUrl
          xingUrl
          communicationChannels(where: { isDeleted: { _eq: false } }) {
            id
            value
            communicationChannel {
              id
              code
              value
            }
          }
          academicTitle {
            value
          }
        }
      }
      addresses {
        addressType
        addressLine
        city
        postalCode
        country {
          value
          code
        }
        region {
          value
          code
        }
      }
    }
  }
`

const GET_ACCOUNT_ACTIVITIES = `
  query GetAccountActivities($accountId: uuid!, $limit: Int = 10) {
    SalesActivity(
      where: { account: { id: { _eq: $accountId } }, isDeleted: { _eq: false } }
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
      }
    }
  }
`

const GET_ACCOUNT_TASKS = `
  query GetAccountTasks($accountId: uuid!, $limit: Int = 10) {
    SalesTask(
      where: { account: { id: { _eq: $accountId } }, isDeleted: { _eq: false } }
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

const GET_ACCOUNT_NOTES = `
  query GetAccountNotes($accountId: uuid!, $limit: Int = 10) {
    CrmNote(
      where: { account: { id: { _eq: $accountId } }, isDeleted: { _eq: false } }
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

type AccountRecord = Record<string, any>

function getAccountOwnerSummary(owner?: AccountRecord['ownerEmployee']) {
  if (!owner?.id) {
    return undefined
  }

  return compactRecord({
    id: owner.id,
    name: [owner.firstName, owner.lastName].filter(Boolean).join(' ').trim() || owner.id,
    jobPosition: owner.employeePosition?.jobPosition?.name,
    organizationalUnit: owner.employeePosition?.organizationalUnit?.name
  })
}

function buildAccountSummary(account: AccountRecord): AnalyticsSummary {
  const primaryAddress =
    account.addresses?.find((address: any) => address.addressType === 'PRIMARY_ADDRESS') || account.addresses?.[0]

  return compactRecord({
    version: account.version,
    email: normalizeEmail(account.email),
    phone: normalizePhone(account.phone),
    website: account.website,
    createdAt: account.createdAt,
    foundationDate: account.foundationDate,
    legalForm: account.legalForm?.value,
    industry: account.industry?.value,
    numberOfEmployees: account.numberOfEmployees?.value,
    annualRevenue: account.annualRevenue?.value,
    owner: getAccountOwnerSummary(account.ownerEmployee),
    primaryAddress: primaryAddress
      ? compactRecord({
          addressLine: primaryAddress.addressLine,
          city: primaryAddress.city,
          postalCode: primaryAddress.postalCode,
          country: primaryAddress.country?.value,
          region: primaryAddress.region?.value
        })
      : undefined
  }) as AnalyticsSummary
}

function buildAccountContacts(account: AccountRecord): AnalyticsContact[] {
  const rawContacts: Array<{ contact?: any; contactType?: string }> = Array.isArray(account.accountContacts)
    ? account.accountContacts
    : []

  const contacts = limitArray(rawContacts, 10)
    .map(entry => {
      const contact = entry?.contact
      if (!contact?.id) {
        return null
      }

      const primaryChannel = contact.communicationChannels?.[0]

      return {
        id: contact.id,
        name: contact.fullName || [contact.firstName, contact.lastName].filter(Boolean).join(' ') || undefined,
        relation: entry?.contactType || 'accountContact',
        role: contact.jobTitle || undefined,
        type: 'contact',
        email: normalizeEmail(contact.email),
        phone: normalizePhone(contact.phone),
        meta: compactRecord({
          department: contact.department,
          academicTitle: contact.academicTitle?.value,
          linkedinUrl: contact.linkedinUrl,
          xingUrl: contact.xingUrl,
          communicationChannel: primaryChannel
            ? compactRecord({
                value: primaryChannel.value,
                type: primaryChannel.communicationChannel?.value,
                code: primaryChannel.communicationChannel?.code
              })
            : undefined
        })
      } as AnalyticsContact
    })
    .filter((contact): contact is AnalyticsContact => Boolean(contact))

  if (account.ownerEmployee?.id) {
    contacts.push({
      id: account.ownerEmployee.id,
      name:
        [account.ownerEmployee.firstName, account.ownerEmployee.lastName].filter(Boolean).join(' ').trim() || undefined,
      relation: 'accountOwner',
      role: account.ownerEmployee.employeePosition?.jobPosition?.name || undefined,
      type: 'employee',
      meta: compactRecord({
        organizationalUnit: account.ownerEmployee.employeePosition?.organizationalUnit?.name
      })
    })
  }

  const dedupeMap = new Map<string, AnalyticsContact>()
  contacts.forEach(contact => {
    const key = `${contact.id}:${contact.relation || ''}`
    if (!dedupeMap.has(key)) {
      dedupeMap.set(key, contact)
    }
  })

  return Array.from(dedupeMap.values())
}

function buildAccountMetrics(params: {
  account: AccountRecord
  contacts: AnalyticsContact[]
  activityCount: number
  taskCount: number
  noteCount: number
}): AnalyticsMetric[] {
  const { account, contacts, activityCount, taskCount, noteCount } = params
  const metrics: AnalyticsMetric[] = []

  metrics.push({
    id: 'account.contacts.total',
    label: 'Contacts',
    value: contacts.length,
    meta: {
      withEmail: contacts.filter(contact => Boolean(contact.email)).length,
      withPhone: contacts.filter(contact => Boolean(contact.phone)).length
    }
  })

  if (activityCount > 0) {
    metrics.push({
      id: 'account.activities.total',
      label: 'Sales Activities',
      value: activityCount
    })
  }

  if (taskCount > 0) {
    metrics.push({
      id: 'account.tasks.total',
      label: 'Tasks',
      value: taskCount
    })
  }

  if (noteCount > 0) {
    metrics.push({
      id: 'account.notes.total',
      label: 'Notes',
      value: noteCount
    })
  }

  if (account.numberOfEmployees?.value) {
    metrics.push({
      id: 'account.size.employees',
      label: 'Employees',
      value: account.numberOfEmployees.value
    })
  }

  if (account.annualRevenue?.value) {
    metrics.push({
      id: 'account.revenue.annual',
      label: 'Annual Revenue',
      value: account.annualRevenue.value
    })
  }

  if (account.website) {
    metrics.push({
      id: 'account.website.present',
      label: 'Has Website',
      value: true
    })
  }

  return metrics
}

function buildAccountActivities(params: { activities: any[]; tasks: any[]; notes: any[] }): AnalyticsActivity[] {
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
    return {
      id: task.id,
      type: normalizedType,
      title: task.name || 'Task',
      occurredAt: task.dueDate || task.createdAt || undefined,
      relationId: task.taskAssignees?.[0]?.assignedEmployee?.id || undefined,
      meta: compactRecord({
        statusRef: task.statusRef,
        timingType: task.timingType,
        priority: task.priority?.value || task.priorityRef,
        assignedEmployee:
          task.taskAssignees?.[0]?.assignedEmployee?.displayName ||
          [task.taskAssignees?.[0]?.assignedEmployee?.firstName, task.taskAssignees?.[0]?.assignedEmployee?.lastName]
            .filter(Boolean)
            .join(' ')
            .trim() ||
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

function buildAccountLinks(account: AccountRecord): AnalyticsLink[] {
  const links: AnalyticsLink[] = []

  if (account.website) {
    links.push({
      id: 'account.website',
      title: account.name ? `${account.name} website` : 'Account website',
      url: account.website,
      type: 'website'
    })
  }

  return links
}

function buildAccountRaw(account: AccountRecord, contacts: AnalyticsContact[]): AnalyticsRawSnapshot {
  const rawAccount = compactRecord({
    id: account.id,
    name: account.name,
    email: normalizeEmail(account.email),
    phone: normalizePhone(account.phone),
    website: account.website,
    version: account.version,
    createdAt: account.createdAt,
    foundationDate: account.foundationDate,
    legalForm: account.legalForm?.value,
    industry: account.industry?.value,
    numberOfEmployees: account.numberOfEmployees?.value,
    annualRevenue: account.annualRevenue?.value,
    ownerEmployee: account.ownerEmployee?.id
      ? compactRecord({
          id: account.ownerEmployee.id,
          firstName: account.ownerEmployee.firstName,
          lastName: account.ownerEmployee.lastName,
          jobPosition: account.ownerEmployee.employeePosition?.jobPosition?.name,
          organizationalUnit: account.ownerEmployee.employeePosition?.organizationalUnit?.name
        })
      : undefined,
    addresses: account.addresses
      ? account.addresses
          .map((address: any) =>
            compactRecord({
              addressType: address.addressType,
              addressLine: address.addressLine,
              city: address.city,
              postalCode: address.postalCode,
              country: address.country?.value,
              region: address.region?.value
            })
          )
          .filter((entry: Record<string, unknown>) => Object.keys(entry).length > 0)
      : undefined,
    contacts: contacts.map(contact =>
      compactRecord({
        id: contact.id,
        relation: contact.relation,
        role: contact.role,
        email: contact.email,
        phone: contact.phone,
        meta: contact.meta
      })
    )
  })

  return compactRecord({
    account: rawAccount
  })
}

export async function buildAccountAnalytics(params: {
  entity: { type: string; id: string; name?: string }
  graphqlClient: GraphQLClient
}): Promise<AnalyticsHeaderContext> {
  const { entity, graphqlClient } = params

  const accountResponse = await graphqlClient.request<{ Account: AccountRecord[] }>(GET_ACCOUNT_ANALYTICS, {
    id: entity.id
  })

  const account = accountResponse?.Account?.[0]
  if (!account) {
    throw new Error(`Account not found: ${entity.id}`)
  }

  const [activitiesResult, tasksResult, notesResult] = await Promise.allSettled([
    graphqlClient.request<{ SalesActivity: any[] }>(GET_ACCOUNT_ACTIVITIES, { accountId: entity.id }),
    graphqlClient.request<{ SalesTask: any[] }>(GET_ACCOUNT_TASKS, { accountId: entity.id }),
    graphqlClient.request<{ CrmNote: any[] }>(GET_ACCOUNT_NOTES, { accountId: entity.id })
  ])

  const activities = activitiesResult.status === 'fulfilled' ? (activitiesResult.value?.SalesActivity ?? []) : []
  const tasks = tasksResult.status === 'fulfilled' ? (tasksResult.value?.SalesTask ?? []) : []
  const notes = notesResult.status === 'fulfilled' ? (notesResult.value?.CrmNote ?? []) : []

  if (activitiesResult.status === 'rejected') {
    console.warn('Failed to load account activities for analytics:', activitiesResult.reason)
  }

  if (tasksResult.status === 'rejected') {
    console.warn('Failed to load account tasks for analytics:', tasksResult.reason)
  }

  if (notesResult.status === 'rejected') {
    console.warn('Failed to load account notes for analytics:', notesResult.reason)
  }

  const summary = buildAccountSummary(account)
  const contacts = buildAccountContacts(account)
  const analyticsActivities = buildAccountActivities({ activities, tasks, notes })
  const links = buildAccountLinks(account)

  const metrics = buildAccountMetrics({
    account,
    contacts,
    activityCount: activities.length,
    taskCount: tasks.length,
    noteCount: notes.length
  })

  const raw = buildAccountRaw(account, contacts)

  const meta = compactRecord({
    as_of: new Date().toISOString(),
    contactCount: contacts.length,
    activityCount: activities.length,
    taskCount: tasks.length,
    noteCount: notes.length
  })

  return {
    mode: 'header',
    entity: {
      type: entity.type,
      id: entity.id,
      name: entity.name || account.name || undefined
    },
    metrics,
    summary: Object.keys(summary).length ? summary : undefined,
    contacts: contacts.length ? contacts : undefined,
    activities: analyticsActivities.length ? analyticsActivities : undefined,
    links: links.length ? links : undefined,
    raw: Object.keys(raw).length ? raw : undefined,
    meta,
    componentIds: ['crm-account-header', 'crm-account-overview']
  }
}
