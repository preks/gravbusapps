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

const GET_INVESTMENT_LEAD_ANALYTICS = `
  query GetInvestmentLeadAnalytics($id: uuid!) {
    InvestmentLead(where: { id: { _eq: $id }, isDeleted: { _eq: false } }) {
      id
      name
      version
      firstName
      lastName
      email
      phoneNumber
      position
      investmentName
      academicTitle {
        value
      }
      salutation {
        value
      }
      leadSource {
        value
      }
      leadRating {
        value
      }
      leadStatus {
        value
      }
      ownerEmployee {
        id
        firstName
        lastName
        displayName
      }
      createdAt
      communicationChannels(where: { isDeleted: { _eq: false } }) {
        id
        value
        communicationChannel {
          code
          value
        }
      }
      companyName
      legalForm {
        value
      }
      country {
        value
      }
      industryClass {
        value
      }
      companyWebsite
      companyEmail
      companyPhone
      addresses {
        addressLine
        postalCode
        city
        country {
          value
        }
        region {
          value
        }
      }
      numberOfEmployees {
        value
      }
      annualRevenue {
        value
      }
      convertedOpportunityId
      sensitive
    }
  }
`

const GET_INVESTMENT_LEAD_ACTIVITIES = `
  query GetInvestmentLeadActivities($leadId: uuid!, $limit: Int = 10) {
    InvestmentActivity(
      where: { lead: { id: { _eq: $leadId } }, isDeleted: { _eq: false } }
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

const GET_INVESTMENT_LEAD_TASKS = `
  query GetInvestmentLeadTasks($leadId: uuid!, $limit: Int = 10) {
    InvestmentTask(
      where: { lead: { id: { _eq: $leadId } }, isDeleted: { _eq: false } }
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
        code
        value
      }
      priority {
        value
      }
      assignedEmployee {
        id
        firstName
        lastName
        displayName
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

const GET_INVESTMENT_LEAD_NOTES = `
  query GetInvestmentLeadNotes($leadId: uuid!, $limit: Int = 10) {
    InvestmentNote(
      where: { lead: { id: { _eq: $leadId } }, isDeleted: { _eq: false } }
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

type LeadRecord = Record<string, any>

function buildInvestmentLeadSummary(lead: LeadRecord): AnalyticsSummary {
  const primaryChannel = lead.communicationChannels?.[0]

  return compactRecord({
    name: lead.name || lead.investmentName || [lead.firstName, lead.lastName].filter(Boolean).join(' ').trim(),
    email: normalizeEmail(lead.email),
    phone: normalizePhone(lead.phoneNumber),
    position: lead.position,
    academicTitle: lead.academicTitle?.value,
    salutation: lead.salutation?.value,
    leadSource: lead.leadSource?.value,
    leadRating: lead.leadRating?.value,
    leadStatus: lead.leadStatus?.value,
    createdAt: lead.createdAt,
    owner: lead.ownerEmployee?.id
      ? compactRecord({
          id: lead.ownerEmployee.id,
          name:
            lead.ownerEmployee.displayName ||
            [lead.ownerEmployee.firstName, lead.ownerEmployee.lastName].filter(Boolean).join(' ').trim()
        })
      : undefined,
    company: lead.companyName
      ? compactRecord({
          name: lead.companyName,
          legalForm: lead.legalForm?.value,
          country: lead.country?.value,
          industry: lead.industryClass?.value,
          website: lead.companyWebsite,
          email: normalizeEmail(lead.companyEmail),
          phone: normalizePhone(lead.companyPhone),
          numberOfEmployees: lead.numberOfEmployees?.value,
          annualRevenue: lead.annualRevenue?.value
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

function buildInvestmentLeadAssociates(lead: LeadRecord): AnalyticsContact[] {
  const associates: AnalyticsContact[] = []

  if (lead.ownerEmployee?.id) {
    associates.push({
      id: lead.ownerEmployee.id,
      name:
        lead.ownerEmployee.displayName ||
        [lead.ownerEmployee.firstName, lead.ownerEmployee.lastName].filter(Boolean).join(' ').trim() ||
        undefined,
      relation: 'leadOwner',
      type: 'employee'
    })
  }

  const dedupe = new Map<string, AnalyticsContact>()
  associates.forEach(contact => {
    const key = `${contact.id}:${contact.relation || ''}`
    if (!dedupe.has(key)) {
      dedupe.set(key, contact)
    }
  })

  return Array.from(dedupe.values())
}

function buildInvestmentLeadMetrics(params: {
  lead: LeadRecord
  activityCount: number
  taskCount: number
  noteCount: number
}): AnalyticsMetric[] {
  const { lead, activityCount, taskCount, noteCount } = params
  const metrics: AnalyticsMetric[] = []

  metrics.push({
    id: 'lead.activities.total',
    label: 'Activities',
    value: activityCount
  })

  if (taskCount > 0) {
    metrics.push({
      id: 'lead.tasks.total',
      label: 'Tasks',
      value: taskCount
    })
  }

  if (noteCount > 0) {
    metrics.push({
      id: 'lead.notes.total',
      label: 'Notes',
      value: noteCount
    })
  }

  if (lead.leadStatus?.value) {
    metrics.push({
      id: 'lead.status.current',
      label: 'Status',
      value: lead.leadStatus.value
    })
  }

  if (lead.leadRating?.value) {
    metrics.push({
      id: 'lead.rating.current',
      label: 'Rating',
      value: lead.leadRating.value
    })
  }

  if (lead.convertedOpportunityId) {
    metrics.push({
      id: 'lead.convertedOpportunity.present',
      label: 'Converted Opportunity',
      value: true,
      meta: {
        opportunityId: lead.convertedOpportunityId
      }
    })
  }

  if (lead.sensitive) {
    metrics.push({
      id: 'lead.sensitive',
      label: 'Sensitive Lead',
      value: true
    })
  }

  return metrics
}

function buildInvestmentLeadActivities(params: { activities: any[]; tasks: any[]; notes: any[] }): AnalyticsActivity[] {
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
      relationId: task.assignedEmployee?.id || undefined,
      meta: compactRecord({
        statusRef: task.statusRef,
        timingType: task.timingType,
        priority: task.priority?.value || task.priorityRef,
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

function buildInvestmentLeadLinks(lead: LeadRecord): AnalyticsLink[] {
  const links: AnalyticsLink[] = []

  if (lead.companyWebsite) {
    links.push({
      id: 'lead.company.website',
      title: lead.companyName ? `${lead.companyName} website` : 'Company website',
      url: lead.companyWebsite,
      type: 'website'
    })
  }

  return links
}

function buildInvestmentLeadRaw(lead: LeadRecord, associates: AnalyticsContact[]): AnalyticsRawSnapshot {
  const rawLead = compactRecord({
    id: lead.id,
    name: lead.name,
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: normalizeEmail(lead.email),
    phone: normalizePhone(lead.phoneNumber),
    position: lead.position,
    academicTitle: lead.academicTitle?.value,
    salutation: lead.salutation?.value,
    leadSource: lead.leadSource?.value,
    leadRating: lead.leadRating?.value,
    leadStatus: lead.leadStatus?.value,
    createdAt: lead.createdAt,
    company: lead.companyName
      ? compactRecord({
          name: lead.companyName,
          legalForm: lead.legalForm?.value,
          country: lead.country?.value,
          industry: lead.industryClass?.value,
          website: lead.companyWebsite,
          email: normalizeEmail(lead.companyEmail),
          phone: normalizePhone(lead.companyPhone),
          numberOfEmployees: lead.numberOfEmployees?.value,
          annualRevenue: lead.annualRevenue?.value,
          addresses: lead.addresses
            ? lead.addresses
                .map((address: any) =>
                  compactRecord({
                    addressLine: address.addressLine,
                    postalCode: address.postalCode,
                    city: address.city,
                    country: address.country?.value,
                    region: address.region?.value
                  })
                )
                .filter((entry: Record<string, unknown>) => Object.keys(entry).length > 0)
            : undefined
        })
      : undefined,
    communicationChannels: lead.communicationChannels?.map((channel: any) =>
      compactRecord({
        value: channel.value,
        type: channel.communicationChannel?.value,
        code: channel.communicationChannel?.code
      })
    ),
    convertedOpportunityId: lead.convertedOpportunityId,
    sensitive: lead.sensitive,
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
    lead: rawLead
  })
}

export async function buildInvestmentLeadAnalytics(params: {
  entity: { type: string; id: string; name?: string }
  graphqlClient: GraphQLClient
}): Promise<AnalyticsHeaderContext> {
  const { entity, graphqlClient } = params

  const response = await graphqlClient.request<{ InvestmentLead: LeadRecord[] }>(GET_INVESTMENT_LEAD_ANALYTICS, {
    id: entity.id
  })

  const lead = response?.InvestmentLead?.[0]
  if (!lead) {
    throw new Error(`InvestmentLead not found: ${entity.id}`)
  }

  const [activitiesResult, tasksResult, notesResult] = await Promise.allSettled([
    graphqlClient.request<{ InvestmentActivity: any[] }>(GET_INVESTMENT_LEAD_ACTIVITIES, { leadId: entity.id }),
    graphqlClient.request<{ InvestmentTask: any[] }>(GET_INVESTMENT_LEAD_TASKS, { leadId: entity.id }),
    graphqlClient.request<{ InvestmentNote: any[] }>(GET_INVESTMENT_LEAD_NOTES, { leadId: entity.id })
  ])

  const activities = activitiesResult.status === 'fulfilled' ? (activitiesResult.value?.InvestmentActivity ?? []) : []
  const tasks = tasksResult.status === 'fulfilled' ? (tasksResult.value?.InvestmentTask ?? []) : []
  const notes = notesResult.status === 'fulfilled' ? (notesResult.value?.InvestmentNote ?? []) : []

  if (activitiesResult.status === 'rejected') {
    console.warn('Failed to load investment lead activities for analytics:', activitiesResult.reason)
  }

  if (tasksResult.status === 'rejected') {
    console.warn('Failed to load investment lead tasks for analytics:', tasksResult.reason)
  }

  if (notesResult.status === 'rejected') {
    console.warn('Failed to load investment lead notes for analytics:', notesResult.reason)
  }

  const summary = buildInvestmentLeadSummary(lead)
  const associates = buildInvestmentLeadAssociates(lead)
  const analyticsActivities = buildInvestmentLeadActivities({ activities, tasks, notes })
  const links = buildInvestmentLeadLinks(lead)

  const metrics = buildInvestmentLeadMetrics({
    lead,
    activityCount: activities.length,
    taskCount: tasks.length,
    noteCount: notes.length
  })

  const raw = buildInvestmentLeadRaw(lead, associates)

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
        lead.name ||
        lead.investmentName ||
        [lead.firstName, lead.lastName].filter(Boolean).join(' ').trim() ||
        undefined
    },
    metrics,
    summary: Object.keys(summary).length ? summary : undefined,
    contacts: associates.length ? associates : undefined,
    activities: analyticsActivities.length ? analyticsActivities : undefined,
    links: links.length ? links : undefined,
    raw: Object.keys(raw).length ? raw : undefined,
    meta
  }
}
