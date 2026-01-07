import {
  AnalyticsActivity,
  AnalyticsContact,
  AnalyticsHeaderContext,
  AnalyticsLink,
  AnalyticsMetric,
  AnalyticsSummary,
  AnalyticsRawSnapshot
} from '../types/analytics-context'
import type { GraphQLClient } from '@/common/network/graphql/GraphQLClient'
import { compactRecord, limitArray, normalizeEmail, normalizePhone } from './collectorUtils'

const GET_OPPORTUNITY_ANALYTICS = `
  query GetOpportunityAnalytics($id: uuid!) {
    Opportunity(where: { id: { _eq: $id }, isDeleted: { _eq: false } }) {
      id
      version
      name
      sourceApp
      estimatedAmount
      salesPipelineRef
      salesPipeline {
        id
        value
        type
        code
      }
      salesPipelineStageRef
      salesPipelineStage {
        id
        value
        type
        code
      }
      opportunityStatus {
        id
        value
        type
        code
      }
      currency {
        id
        value
        code
      }
      ownerEmployee {
        id
        firstName
        lastName
        displayName
      }
      opportunityAccounts {
        account {
          id
          version
          name
          email
          phone
          website
          industry {
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
      }
      lead {
        id
        companyName
        leadStatus {
          value
        }
      }
      stageConditionStatuses {
        id
        completed
        completedAt
        deadlineAt
        salesPipelineStageCondition {
          id
          value
          code
          type
        }
        completedByEmployee {
          id
          firstName
          lastName
          displayName
        }
        updatedAt
      }
      createdAt
      updatedAt
    }
    OpportunityContact(where: { opportunityId: { _eq: $id }, isDeleted: { _eq: false } }) {
      id
      contactType
      contact {
        id
        firstName
        lastName
        email
        phone
        jobTitle
        department
        contactType
        academicTitle {
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
      }
    }
  }
`

const GET_OPPORTUNITY_ACTIVITIES = `
  query GetOpportunityActivities($opportunityId: uuid!, $limit: Int = 10) {
    SalesActivity(
      where: { opportunity: { id: { _eq: $opportunityId } }, isDeleted: { _eq: false } }
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

const GET_OPPORTUNITY_TASKS = `
  query GetOpportunityTasks($opportunityId: uuid!, $limit: Int = 10) {
    SalesTask(
      where: { opportunity: { id: { _eq: $opportunityId } }, isDeleted: { _eq: false } }
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

const GET_OPPORTUNITY_NOTES = `
  query GetOpportunityNotes($opportunityId: uuid!, $limit: Int = 10) {
    CrmNote(
      where: { opportunity: { id: { _eq: $opportunityId } }, isDeleted: { _eq: false } }
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

type OpportunityRecord = Record<string, any>

function buildOpportunitySummary(opportunity: OpportunityRecord, contacts: AnalyticsContact[]): AnalyticsSummary {
  const primaryAccount = opportunity.opportunityAccounts?.[0]?.account

  return compactRecord({
    name: opportunity.name,
    amount: opportunity.estimatedAmount,
    currency: opportunity.currency?.value || opportunity.currency?.code,
    salesPipeline: opportunity.salesPipeline?.value,
    salesPipelineStage: opportunity.salesPipelineStage?.value,
    opportunityStatus: opportunity.opportunityStatus?.value,
    owner: opportunity.ownerEmployee?.id
      ? compactRecord({
          id: opportunity.ownerEmployee.id,
          name:
            opportunity.ownerEmployee.displayName ||
            [opportunity.ownerEmployee.firstName, opportunity.ownerEmployee.lastName].filter(Boolean).join(' ').trim()
        })
      : undefined,
    account: primaryAccount?.id
      ? compactRecord({
          id: primaryAccount.id,
          name: primaryAccount.name,
          email: normalizeEmail(primaryAccount.email),
          phone: normalizePhone(primaryAccount.phone),
          website: primaryAccount.website,
          industry: primaryAccount.industry?.value,
          numberOfEmployees: primaryAccount.numberOfEmployees?.value,
          annualRevenue: primaryAccount.annualRevenue?.value
        })
      : undefined,
    lead: opportunity.lead?.id
      ? compactRecord({
          id: opportunity.lead.id,
          companyName: opportunity.lead.companyName,
          status: opportunity.lead.leadStatus?.value
        })
      : undefined,
    stageConditions: opportunity.stageConditionStatuses?.map((status: any) =>
      compactRecord({
        id: status.id,
        completed: status.completed,
        completedAt: status.completedAt,
        deadlineAt: status.deadlineAt,
        condition: status.salesPipelineStageCondition?.value,
        conditionCode: status.salesPipelineStageCondition?.code,
        updatedAt: status.updatedAt
      })
    ),
    contactsSummary: contacts.slice(0, 5).map(contact => compactRecord({ id: contact.id, relation: contact.relation }))
  }) as AnalyticsSummary
}

function buildOpportunityAssociates(opportunity: OpportunityRecord, contactRecords: any[]): AnalyticsContact[] {
  const associates: AnalyticsContact[] = []

  if (opportunity.ownerEmployee?.id) {
    associates.push({
      id: opportunity.ownerEmployee.id,
      name:
        opportunity.ownerEmployee.displayName ||
        [opportunity.ownerEmployee.firstName, opportunity.ownerEmployee.lastName].filter(Boolean).join(' ').trim() ||
        undefined,
      relation: 'opportunityOwner',
      type: 'employee'
    })
  }

  const primaryAccount = opportunity.opportunityAccounts?.[0]?.account
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
      type: 'employee',
      meta: compactRecord({
        accountId: primaryAccount.id,
        accountName: primaryAccount.name
      })
    })
  }

  contactRecords.forEach(entry => {
    const contact = entry.contact
    if (!contact?.id) {
      return
    }

    const primaryChannel = contact.communicationChannels?.[0]

    associates.push({
      id: contact.id,
      name: [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim() || undefined,
      relation: entry.contactType || contact.contactType || 'opportunityContact',
      role: contact.jobTitle || undefined,
      type: 'contact',
      email: normalizeEmail(contact.email),
      phone: normalizePhone(contact.phone),
      meta: compactRecord({
        department: contact.department,
        academicTitle: contact.academicTitle?.value,
        communicationChannel: primaryChannel
          ? compactRecord({
              value: primaryChannel.value,
              type: primaryChannel.communicationChannel?.value,
              code: primaryChannel.communicationChannel?.code
            })
          : undefined
      })
    })
  })

  const dedupe = new Map<string, AnalyticsContact>()
  associates.forEach(item => {
    const key = `${item.id}:${item.relation || ''}`
    if (!dedupe.has(key)) {
      dedupe.set(key, item)
    }
  })

  return Array.from(dedupe.values())
}

function buildOpportunityMetrics(params: {
  opportunity: OpportunityRecord
  contacts: AnalyticsContact[]
  stageConditions: any[]
  activityCount: number
  taskCount: number
  noteCount: number
}): AnalyticsMetric[] {
  const { opportunity, contacts, stageConditions, activityCount, taskCount, noteCount } = params
  const metrics: AnalyticsMetric[] = []

  metrics.push({
    id: 'opportunity.activities.total',
    label: 'Activities',
    value: activityCount
  })

  if (taskCount > 0) {
    metrics.push({
      id: 'opportunity.tasks.total',
      label: 'Tasks',
      value: taskCount
    })
  }

  if (noteCount > 0) {
    metrics.push({
      id: 'opportunity.notes.total',
      label: 'Notes',
      value: noteCount
    })
  }

  if (typeof opportunity.estimatedAmount === 'number') {
    metrics.push({
      id: 'opportunity.amount.estimated',
      label: 'Estimated Amount',
      value: opportunity.estimatedAmount,
      unit: opportunity.currency?.value ?? opportunity.currency?.code ?? undefined
    })
  }

  if (opportunity.salesPipelineStage?.value) {
    metrics.push({
      id: 'opportunity.stage.current',
      label: 'Stage',
      value: opportunity.salesPipelineStage.value
    })
  }

  if (opportunity.opportunityStatus?.value) {
    metrics.push({
      id: 'opportunity.status.current',
      label: 'Status',
      value: opportunity.opportunityStatus.value
    })
  }

  if (contacts.length > 0) {
    metrics.push({
      id: 'opportunity.contacts.total',
      label: 'Contacts',
      value: contacts.length
    })
  }

  if (stageConditions.length > 0) {
    const completedCount = stageConditions.filter(condition => condition.completed).length
    metrics.push({
      id: 'opportunity.stageConditions.completed',
      label: 'Stage Conditions Completed',
      value: completedCount,
      meta: {
        total: stageConditions.length
      }
    })
  }

  return metrics
}

function buildOpportunityActivities(params: { activities: any[]; tasks: any[]; notes: any[] }): AnalyticsActivity[] {
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

function buildOpportunityLinks(opportunity: OpportunityRecord): AnalyticsLink[] {
  const links: AnalyticsLink[] = []
  const primaryAccount = opportunity.opportunityAccounts?.[0]?.account

  if (primaryAccount?.website) {
    links.push({
      id: 'opportunity.account.website',
      title: primaryAccount.name ? `${primaryAccount.name} website` : 'Account website',
      url: primaryAccount.website,
      type: 'website'
    })
  }

  return links
}

function buildOpportunityRaw(
  opportunity: OpportunityRecord,
  contacts: AnalyticsContact[],
  stageConditions: any[]
): AnalyticsRawSnapshot {
  const primaryAccount = opportunity.opportunityAccounts?.[0]?.account

  const rawOpportunity = compactRecord({
    id: opportunity.id,
    name: opportunity.name,
    version: opportunity.version,
    sourceApp: opportunity.sourceApp,
    estimatedAmount: opportunity.estimatedAmount,
    currency: opportunity.currency?.value || opportunity.currency?.code,
    salesPipeline: opportunity.salesPipeline?.value,
    salesPipelineStage: opportunity.salesPipelineStage?.value,
    opportunityStatus: opportunity.opportunityStatus?.value,
    createdAt: opportunity.createdAt,
    updatedAt: opportunity.updatedAt,
    ownerEmployee: opportunity.ownerEmployee?.id
      ? compactRecord({
          id: opportunity.ownerEmployee.id,
          name:
            opportunity.ownerEmployee.displayName ||
            [opportunity.ownerEmployee.firstName, opportunity.ownerEmployee.lastName].filter(Boolean).join(' ').trim()
        })
      : undefined,
    account: primaryAccount?.id
      ? compactRecord({
          id: primaryAccount.id,
          name: primaryAccount.name,
          email: normalizeEmail(primaryAccount.email),
          phone: normalizePhone(primaryAccount.phone),
          website: primaryAccount.website,
          industry: primaryAccount.industry?.value,
          numberOfEmployees: primaryAccount.numberOfEmployees?.value,
          annualRevenue: primaryAccount.annualRevenue?.value,
          ownerEmployee: primaryAccount.ownerEmployee?.id
            ? compactRecord({
                id: primaryAccount.ownerEmployee.id,
                name:
                  primaryAccount.ownerEmployee.displayName ||
                  [primaryAccount.ownerEmployee.firstName, primaryAccount.ownerEmployee.lastName]
                    .filter(Boolean)
                    .join(' ')
                    .trim()
              })
            : undefined
        })
      : undefined,
    lead: opportunity.lead?.id
      ? compactRecord({
          id: opportunity.lead.id,
          companyName: opportunity.lead.companyName,
          status: opportunity.lead.leadStatus?.value
        })
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
    stageConditionStatuses: stageConditions.map((condition: any) =>
      compactRecord({
        id: condition.id,
        completed: condition.completed,
        completedAt: condition.completedAt,
        deadlineAt: condition.deadlineAt,
        updatedAt: condition.updatedAt,
        condition: condition.salesPipelineStageCondition?.value,
        conditionCode: condition.salesPipelineStageCondition?.code,
        completedByEmployee: condition.completedByEmployee?.id
          ? compactRecord({
              id: condition.completedByEmployee.id,
              name:
                condition.completedByEmployee.displayName ||
                [condition.completedByEmployee.firstName, condition.completedByEmployee.lastName]
                  .filter(Boolean)
                  .join(' ')
                  .trim()
            })
          : undefined
      })
    )
  })

  return compactRecord({
    opportunity: rawOpportunity
  })
}

export async function buildOpportunityAnalytics(params: {
  entity: { type: string; id: string; name?: string }
  graphqlClient: GraphQLClient
}): Promise<AnalyticsHeaderContext> {
  const { entity, graphqlClient } = params

  const response = await graphqlClient.request<{
    Opportunity: OpportunityRecord[]
    OpportunityContact: any[]
  }>(GET_OPPORTUNITY_ANALYTICS, {
    id: entity.id
  })

  const opportunity = response?.Opportunity?.[0]
  if (!opportunity) {
    throw new Error(`Opportunity not found: ${entity.id}`)
  }

  const contacts = buildOpportunityAssociates(opportunity, response.OpportunityContact || [])

  const [activitiesResult, tasksResult, notesResult] = await Promise.allSettled([
    graphqlClient.request<{ SalesActivity: any[] }>(GET_OPPORTUNITY_ACTIVITIES, { opportunityId: entity.id }),
    graphqlClient.request<{ SalesTask: any[] }>(GET_OPPORTUNITY_TASKS, { opportunityId: entity.id }),
    graphqlClient.request<{ CrmNote: any[] }>(GET_OPPORTUNITY_NOTES, { opportunityId: entity.id })
  ])

  const activities = activitiesResult.status === 'fulfilled' ? (activitiesResult.value?.SalesActivity ?? []) : []
  const tasks = tasksResult.status === 'fulfilled' ? (tasksResult.value?.SalesTask ?? []) : []
  const notes = notesResult.status === 'fulfilled' ? (notesResult.value?.CrmNote ?? []) : []

  if (activitiesResult.status === 'rejected') {
    console.warn('Failed to load opportunity activities for analytics:', activitiesResult.reason)
  }

  if (tasksResult.status === 'rejected') {
    console.warn('Failed to load opportunity tasks for analytics:', tasksResult.reason)
  }

  if (notesResult.status === 'rejected') {
    console.warn('Failed to load opportunity notes for analytics:', notesResult.reason)
  }

  const stageConditions = opportunity.stageConditionStatuses || []
  const summary = buildOpportunitySummary(opportunity, contacts)
  const analyticsActivities = buildOpportunityActivities({ activities, tasks, notes })
  const links = buildOpportunityLinks(opportunity)

  const metrics = buildOpportunityMetrics({
    opportunity,
    contacts,
    stageConditions,
    activityCount: activities.length,
    taskCount: tasks.length,
    noteCount: notes.length
  })

  const raw = buildOpportunityRaw(opportunity, contacts, stageConditions)

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
      name: entity.name || opportunity.name || undefined
    },
    metrics,
    summary: Object.keys(summary).length ? summary : undefined,
    contacts: contacts.length ? contacts : undefined,
    activities: analyticsActivities.length ? analyticsActivities : undefined,
    links: links.length ? links : undefined,
    raw: Object.keys(raw).length ? raw : undefined,
    meta,
    componentIds: ['crm-opportunity-header', 'crm-opportunity-overview']
  }
}
