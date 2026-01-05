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
import { buildInvestmentOpportunityByIdQuery } from '@/common/data/investment/queries/investmentOpportunityQueries'
import { toInvestmentOpportunity } from '@/common/data/investment/types/investmentOpportunityTypes'

type InvestmentOpportunityRecord = Record<string, any>

const GET_INVESTMENT_OPPORTUNITY_ANALYTICS = buildInvestmentOpportunityByIdQuery()

function buildInvestmentOpportunitySummary(opportunity: InvestmentOpportunityRecord): AnalyticsSummary {
  const primaryAccount = opportunity.opportunityAccounts?.[0]?.account
  const contact = opportunity.contact

  return compactRecord({
    name: opportunity.name,
    stage: opportunity.opportunityPipelineStage?.value,
    status: opportunity.opportunityStatus?.value,
    pipeline: opportunity.opportunityPipeline?.value ?? opportunity.opportunityPipelineRef,
    estimatedAmount: opportunity.estimatedAmount,
    currency: opportunity.currency?.id,
    probability: opportunity.winningChance ?? opportunity.probability,
    closeDate: opportunity.closeDate,
    createdAt: opportunity.createdAt,
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
          industry: primaryAccount.industryClass?.value ?? primaryAccount.industry?.value,
          website: primaryAccount.website
        })
      : undefined,
    contact: contact?.id
      ? compactRecord({
          id: contact.id,
          name: [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim(),
          email: normalizeEmail(contact.email),
          phone: normalizePhone(contact.phone ?? contact.phoneNumber)
        })
      : undefined,
    // IRM‑specific investment fields
    investmentName: opportunity.investmentName,
    investmentGroup: opportunity.investmentGroup?.value,
    investmentType: opportunity.investmentType?.value,
    investmentRole: opportunity.investmentRole?.value,
    investmentStakeType: opportunity.investmentStakeType?.value,
    initialInvestmentAmount: opportunity.initialInvestmentAmount,
    marketValue: opportunity.marketValue,
    requiredCapitalAmount: opportunity.requiredCapitalAmount,
    loanAmount: opportunity.loanAmount,
    loanInterestRate: opportunity.loanInterestRate,
    stakePercentage: opportunity.stakePercentage
  }) as AnalyticsSummary
}

function buildInvestmentOpportunityAssociates(opportunity: InvestmentOpportunityRecord): AnalyticsContact[] {
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

  if (opportunity.contact?.id) {
    associates.push({
      id: opportunity.contact.id,
      name: [opportunity.contact.firstName, opportunity.contact.lastName].filter(Boolean).join(' ').trim() || undefined,
      relation: 'primaryContact',
      role: opportunity.contact.jobPosition || opportunity.contact.position,
      email: normalizeEmail(opportunity.contact.email),
      phone: normalizePhone(opportunity.contact.phone ?? opportunity.contact.phoneNumber),
      type: 'contact'
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

function buildInvestmentOpportunityMetrics(params: {
  opportunity: InvestmentOpportunityRecord
  activityCount: number
  taskCount: number
  noteCount: number
}): AnalyticsMetric[] {
  const { opportunity, activityCount, taskCount, noteCount } = params
  const metrics: AnalyticsMetric[] = []

  metrics.push({
    id: 'investment_opportunity.activities.total',
    label: 'Activities',
    value: activityCount
  })

  if (taskCount > 0) {
    metrics.push({
      id: 'investment_opportunity.tasks.total',
      label: 'Tasks',
      value: taskCount
    })
  }

  if (noteCount > 0) {
    metrics.push({
      id: 'investment_opportunity.notes.total',
      label: 'Notes',
      value: noteCount
    })
  }

  if (opportunity.estimatedAmount !== undefined && opportunity.estimatedAmount !== null) {
    metrics.push({
      id: 'investment_opportunity.estimatedAmount',
      label: 'Estimated Amount',
      value: opportunity.estimatedAmount,
      unit: opportunity.currency?.id || 'EUR'
    })
  }

  const probability = opportunity.winningChance ?? opportunity.probability
  if (probability !== undefined && probability !== null) {
    metrics.push({
      id: 'investment_opportunity.probability',
      label: 'Probability',
      value: probability,
      unit: '%'
    })
  }

  if (
    opportunity.estimatedAmount !== undefined &&
    opportunity.estimatedAmount !== null &&
    probability !== undefined &&
    probability !== null
  ) {
    metrics.push({
      id: 'investment_opportunity.weightedAmount',
      label: 'Weighted Amount',
      value: opportunity.estimatedAmount * (probability / 100),
      unit: opportunity.currency?.id || 'EUR'
    })
  }

  if (opportunity.opportunityStatus?.value) {
    metrics.push({
      id: 'investment_opportunity.status.current',
      label: 'Status',
      value: opportunity.opportunityStatus.value
    })
  }

  if (opportunity.opportunityPipelineStage?.value) {
    metrics.push({
      id: 'investment_opportunity.stage.current',
      label: 'Stage',
      value: opportunity.opportunityPipelineStage.value
    })
  }

  if (opportunity.closeDate) {
    metrics.push({
      id: 'investment_opportunity.closeDate',
      label: 'Expected Close Date',
      value: opportunity.closeDate
    })
  }

  // IRM‑specific numeric metrics
  if (opportunity.initialInvestmentAmount !== undefined && opportunity.initialInvestmentAmount !== null) {
    metrics.push({
      id: 'investment_opportunity.initialInvestmentAmount',
      label: 'Initial Investment Amount',
      value: opportunity.initialInvestmentAmount
    })
  }

  if (opportunity.marketValue !== undefined && opportunity.marketValue !== null) {
    metrics.push({
      id: 'investment_opportunity.marketValue',
      label: 'Market Value',
      value: opportunity.marketValue
    })
  }

  if (opportunity.requiredCapitalAmount !== undefined && opportunity.requiredCapitalAmount !== null) {
    metrics.push({
      id: 'investment_opportunity.requiredCapitalAmount',
      label: 'Required Capital',
      value: opportunity.requiredCapitalAmount
    })
  }

  if (opportunity.loanAmount !== undefined && opportunity.loanAmount !== null) {
    metrics.push({
      id: 'investment_opportunity.loanAmount',
      label: 'Loan Amount',
      value: opportunity.loanAmount
    })
  }

  if (opportunity.loanInterestRate !== undefined && opportunity.loanInterestRate !== null) {
    metrics.push({
      id: 'investment_opportunity.loanInterestRate',
      label: 'Loan Interest Rate',
      value: opportunity.loanInterestRate,
      unit: '%'
    })
  }

  if (opportunity.stakePercentage !== undefined && opportunity.stakePercentage !== null) {
    metrics.push({
      id: 'investment_opportunity.stakePercentage',
      label: 'Stake Percentage',
      value: opportunity.stakePercentage,
      unit: '%'
    })
  }

  return metrics
}

function buildInvestmentOpportunityActivities(params: {
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

function buildInvestmentOpportunityLinks(opportunity: InvestmentOpportunityRecord): AnalyticsLink[] {
  const links: AnalyticsLink[] = []
  const primaryAccount = opportunity.opportunityAccounts?.[0]?.account

  if (primaryAccount?.website) {
    links.push({
      id: 'investment_opportunity.account.website',
      title: primaryAccount.name ? `${primaryAccount.name} website` : 'Account website',
      url: primaryAccount.website,
      type: 'website'
    })
  }

  return links
}

function buildInvestmentOpportunityRaw(
  opportunity: InvestmentOpportunityRecord,
  associates: AnalyticsContact[],
  activities: any[],
  tasks: any[],
  notes: any[]
): AnalyticsRawSnapshot {
  const primaryAccount = opportunity.opportunityAccounts?.[0]?.account

  const rawOpportunity = compactRecord({
    id: opportunity.id,
    name: opportunity.name,
    stage: opportunity.opportunityPipelineStage?.value,
    status: opportunity.opportunityStatus?.value,
    pipeline: opportunity.opportunityPipeline?.value ?? opportunity.opportunityPipelineRef,
    estimatedAmount: opportunity.estimatedAmount,
    currency: opportunity.currency?.id,
    probability: opportunity.winningChance ?? opportunity.probability,
    closeDate: opportunity.closeDate,
    createdAt: opportunity.createdAt,
    ownerEmployee: opportunity.ownerEmployee?.id
      ? compactRecord({
          id: opportunity.ownerEmployee.id,
          firstName: opportunity.ownerEmployee.firstName,
          lastName: opportunity.ownerEmployee.lastName
        })
      : undefined,
    account: primaryAccount?.id
      ? compactRecord({
          id: primaryAccount.id,
          name: primaryAccount.name,
          industryClass: primaryAccount.industryClass?.value,
          website: primaryAccount.website
        })
      : undefined,
    contact: opportunity.contact?.id
      ? compactRecord({
          id: opportunity.contact.id,
          firstName: opportunity.contact.firstName,
          lastName: opportunity.contact.lastName,
          email: normalizeEmail(opportunity.contact.email),
          phone: normalizePhone(opportunity.contact.phone ?? opportunity.contact.phoneNumber)
        })
      : undefined,
    // IRM‑specific fields
    dealType: opportunity.dealType,
    investmentGroup: opportunity.investmentGroup?.value,
    investmentType: opportunity.investmentType?.value,
    investmentRole: opportunity.investmentRole?.value,
    investmentStakeType: opportunity.investmentStakeType?.value,
    investmentName: opportunity.investmentName,
    initialInvestmentAmount: opportunity.initialInvestmentAmount,
    marketValue: opportunity.marketValue,
    requiredCapitalAmount: opportunity.requiredCapitalAmount,
    loanAmount: opportunity.loanAmount,
    loanInterestRate: opportunity.loanInterestRate,
    annualNetColdRent: opportunity.annualNetColdRent,
    buildingYear: opportunity.buildingYear,
    size: opportunity.size,
    sizeMeasurementUnit: opportunity.sizeMeasurementUnit?.value,
    stakePercentage: opportunity.stakePercentage,
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
    investmentOpportunity: rawOpportunity
  })
}

export async function buildInvestmentOpportunityAnalytics(params: {
  entity: { type: string; id: string; name?: string }
  graphqlClient: GraphQLClient
}): Promise<AnalyticsHeaderContext> {
  const { entity, graphqlClient } = params

  const response = await graphqlClient.request<{ InvestmentOpportunityByPk: InvestmentOpportunityRecord | null }>(
    GET_INVESTMENT_OPPORTUNITY_ANALYTICS,
    { id: entity.id }
  )

  const rawOpportunity = response?.InvestmentOpportunityByPk
  if (!rawOpportunity) {
    throw new Error(`Investment Opportunity not found: ${entity.id}`)
  }

  const opportunity = toInvestmentOpportunity(rawOpportunity)

  const activities = Array.isArray((opportunity as any).activities) ? (opportunity as any).activities : []
  const tasks = Array.isArray((opportunity as any).tasks) ? (opportunity as any).tasks : []
  const notes = Array.isArray((opportunity as any).notes) ? (opportunity as any).notes : []

  const summary = buildInvestmentOpportunitySummary(opportunity)
  const associates = buildInvestmentOpportunityAssociates(opportunity)
  const analyticsActivities = buildInvestmentOpportunityActivities({ activities, tasks, notes })
  const links = buildInvestmentOpportunityLinks(opportunity)
  const metrics = buildInvestmentOpportunityMetrics({
    opportunity,
    activityCount: activities.length,
    taskCount: tasks.length,
    noteCount: notes.length
  })
  const raw = buildInvestmentOpportunityRaw(opportunity, associates, activities, tasks, notes)

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
    contacts: associates.length ? associates : undefined,
    activities: analyticsActivities.length ? analyticsActivities : undefined,
    links: links.length ? links : undefined,
    raw: Object.keys(raw).length ? raw : undefined,
    meta,
    componentIds: ['irm-investment-opportunity-header', 'irm-investment-opportunity-overview']
  }
}
