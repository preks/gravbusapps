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
import {
  buildInvestmentAccountByIdQuery
  // Use default field mapping for InvestmentAccount
} from '@/common/data/investment/queries/investmentAccountQueries'
import { toInvestmentAccount } from '@/common/data/investment/types/investmentAccountTypes'

type InvestmentAccountRecord = Record<string, any>

const GET_INVESTMENT_ACCOUNT_ANALYTICS = buildInvestmentAccountByIdQuery()

function resolvePrimaryChannels(communicationChannels: any[] | undefined): {
  email?: string
  phone?: string
  primaryChannel?: {
    value?: string
    type?: string
    code?: string
  }
} {
  if (!Array.isArray(communicationChannels) || communicationChannels.length === 0) {
    return {}
  }

  let emailValue: string | undefined
  let phoneValue: string | undefined

  for (const channel of communicationChannels) {
    const codeRaw: unknown = channel?.communicationChannel?.code
    const code = typeof codeRaw === 'string' ? codeRaw.toUpperCase() : ''

    if (!emailValue && (code.includes('MAIL') || code.includes('EMAIL'))) {
      emailValue = channel.value
    }

    if (!phoneValue && (code.includes('PHONE') || code.includes('MOBILE') || code.includes('TEL'))) {
      phoneValue = channel.value
    }

    if (emailValue && phoneValue) {
      break
    }
  }

  const primary = communicationChannels[0] || undefined

  return {
    email: emailValue ?? primary?.value,
    phone: phoneValue,
    primaryChannel: primary
      ? compactRecord({
          value: primary.value,
          type: primary.communicationChannel?.value,
          code: primary.communicationChannel?.code
        })
      : undefined
  }
}

function buildInvestmentAccountSummary(account: InvestmentAccountRecord): AnalyticsSummary {
  const primaryAddress = Array.isArray(account.addresses) && account.addresses.length > 0 ? account.addresses[0] : null
  const { email, phone, primaryChannel } = resolvePrimaryChannels(account.communicationChannels)

  return compactRecord({
    name: account.name,
    email: normalizeEmail(email),
    phone: normalizePhone(phone),
    website: account.website,
    industry: account.industryClass?.value,
    companySize: account.companySize?.value,
    revenueBand: account.accountAnnualRevenueBand?.value,
    legalForm: account.legalForm?.value,
    foundationDate: account.foundationDate,
    liquidationDate: account.liquidationDate,
    owner: account.ownerEmployee?.id
      ? compactRecord({
          id: account.ownerEmployee.id,
          name:
            account.ownerEmployee.displayName ||
            [account.ownerEmployee.firstName, account.ownerEmployee.lastName].filter(Boolean).join(' ').trim(),
          jobPosition: account.ownerEmployee.employeePosition?.jobPosition?.name,
          organizationalUnit: account.ownerEmployee.employeePosition?.organizationalUnit?.name
        })
      : undefined,
    primaryAddress: primaryAddress
      ? compactRecord({
          addressLine: primaryAddress.addressLine,
          city: primaryAddress.locality ?? primaryAddress.city,
          postalCode: primaryAddress.postalCode,
          country: primaryAddress.country?.value,
          region: primaryAddress.region?.value
        })
      : undefined,
    primaryCommunicationChannel: primaryChannel
  }) as AnalyticsSummary
}

function buildInvestmentAccountContacts(account: InvestmentAccountRecord): AnalyticsContact[] {
  const rawContacts: Array<{ contact?: any; contactType?: string }> = Array.isArray(account.accountContacts)
    ? account.accountContacts
    : []

  const contacts = limitArray(rawContacts, 10)
    .map(entry => {
      const contact = entry?.contact
      if (!contact?.id) {
        return null
      }

      const primaryChannel = Array.isArray(contact.communicationChannels) ? contact.communicationChannels[0] : undefined

      return {
        id: contact.id,
        name:
          contact.fullName ||
          contact.displayName ||
          [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim() ||
          undefined,
        relation: entry?.contactType || 'accountContact',
        role: contact.jobTitle || contact.position || undefined,
        type: 'contact',
        email: normalizeEmail(contact.email),
        phone: normalizePhone(contact.phone ?? contact.phoneNumber),
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
        account.ownerEmployee.displayName ||
        [account.ownerEmployee.firstName, account.ownerEmployee.lastName].filter(Boolean).join(' ').trim() ||
        undefined,
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

function buildInvestmentAccountMetrics(params: {
  account: InvestmentAccountRecord
  contacts: AnalyticsContact[]
  activities: any[]
  tasks: any[]
  notes: any[]
}): AnalyticsMetric[] {
  const { account, contacts, activities, tasks, notes } = params
  const metrics: AnalyticsMetric[] = []

  metrics.push({
    id: 'investment_account.contacts.total',
    label: 'Contacts',
    value: contacts.length,
    meta: {
      withEmail: contacts.filter(contact => Boolean(contact.email)).length,
      withPhone: contacts.filter(contact => Boolean(contact.phone)).length
    }
  })

  if (activities.length > 0) {
    metrics.push({
      id: 'investment_account.activities.total',
      label: 'Activities',
      value: activities.length
    })
  }

  if (tasks.length > 0) {
    metrics.push({
      id: 'investment_account.tasks.total',
      label: 'Tasks',
      value: tasks.length
    })
  }

  if (notes.length > 0) {
    metrics.push({
      id: 'investment_account.notes.total',
      label: 'Notes',
      value: notes.length
    })
  }

  if (account.companySize?.value) {
    metrics.push({
      id: 'investment_account.size.company',
      label: 'Company Size',
      value: account.companySize.value
    })
  }

  if (account.accountAnnualRevenueBand?.value) {
    metrics.push({
      id: 'investment_account.revenue.band',
      label: 'Revenue Band',
      value: account.accountAnnualRevenueBand.value
    })
  }

  if (account.accountPriority?.value) {
    metrics.push({
      id: 'investment_account.priority.current',
      label: 'Priority',
      value: account.accountPriority.value
    })
  }

  const opportunities = Array.isArray(account.opportunities) ? account.opportunities : []
  if (opportunities.length > 0) {
    metrics.push({
      id: 'investment_account.opportunities.total',
      label: 'Opportunities',
      value: opportunities.length
    })

    const totalEstimatedAmount = opportunities.reduce((sum: number, opp: any) => {
      const value = typeof opp.estimatedAmount === 'number' ? opp.estimatedAmount : 0
      return sum + value
    }, 0)

    if (totalEstimatedAmount > 0) {
      metrics.push({
        id: 'investment_account.opportunities.estimatedAmount.total',
        label: 'Total Estimated Amount',
        value: totalEstimatedAmount
      })
    }
  }

  return metrics
}

function buildInvestmentAccountActivities(params: {
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

function buildInvestmentAccountLinks(account: InvestmentAccountRecord): AnalyticsLink[] {
  const links: AnalyticsLink[] = []

  if (account.website) {
    links.push({
      id: 'investment_account.website',
      title: account.name ? `${account.name} website` : 'Account website',
      url: account.website,
      type: 'website'
    })
  }

  return links
}

function buildInvestmentAccountRaw(
  account: InvestmentAccountRecord,
  contacts: AnalyticsContact[],
  activities: any[],
  tasks: any[],
  notes: any[]
): AnalyticsRawSnapshot {
  const rawAccount = compactRecord({
    id: account.id,
    name: account.name,
    website: account.website,
    foundationDate: account.foundationDate,
    liquidationDate: account.liquidationDate,
    legalForm: account.legalForm?.value,
    industryClass: account.industryClass?.value,
    companySize: account.companySize?.value,
    accountAnnualRevenueBand: account.accountAnnualRevenueBand?.value,
    accountPriority: account.accountPriority?.value,
    ownerEmployee: account.ownerEmployee?.id
      ? compactRecord({
          id: account.ownerEmployee.id,
          firstName: account.ownerEmployee.firstName,
          lastName: account.ownerEmployee.lastName,
          jobPosition: account.ownerEmployee.employeePosition?.jobPosition?.name,
          organizationalUnit: account.ownerEmployee.employeePosition?.organizationalUnit?.name
        })
      : undefined,
    addresses: Array.isArray(account.addresses)
      ? account.addresses
          .map((address: any) =>
            compactRecord({
              id: address.id,
              addressType: address.addressType,
              addressLine: address.addressLine,
              city: address.locality ?? address.city,
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
    investmentAccount: rawAccount
  })
}

export async function buildInvestmentAccountAnalytics(params: {
  entity: { type: string; id: string; name?: string }
  graphqlClient: GraphQLClient
}): Promise<AnalyticsHeaderContext> {
  const { entity, graphqlClient } = params

  const response = await graphqlClient.request<{ InvestmentAccountByPk: InvestmentAccountRecord | null }>(
    GET_INVESTMENT_ACCOUNT_ANALYTICS,
    { id: entity.id }
  )

  const rawAccount = response?.InvestmentAccountByPk
  if (!rawAccount) {
    throw new Error(`Investment Account not found: ${entity.id}`)
  }

  const account = toInvestmentAccount(rawAccount)

  const activities = Array.isArray((account as any).activities) ? (account as any).activities : []
  const tasks = Array.isArray((account as any).tasks) ? (account as any).tasks : []
  const notes = Array.isArray((account as any).notes) ? (account as any).notes : []

  const summary = buildInvestmentAccountSummary(account)
  const contacts = buildInvestmentAccountContacts(account)
  const analyticsActivities = buildInvestmentAccountActivities({ activities, tasks, notes })
  const links = buildInvestmentAccountLinks(account)
  const metrics = buildInvestmentAccountMetrics({
    account,
    contacts,
    activities,
    tasks,
    notes
  })
  const raw = buildInvestmentAccountRaw(account, contacts, activities, tasks, notes)

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
    componentIds: ['irm-investment-account-header', 'irm-investment-account-overview']
  }
}
