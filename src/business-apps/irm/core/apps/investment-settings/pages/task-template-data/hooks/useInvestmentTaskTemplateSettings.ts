import { useState, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  BaseTaskTemplate,
  TaskTemplateFormData
} from '@/common/components/common-relations/setting-pages/task-template/types'
import {
  formSchedulingTypeForInput,
  mergeExtensionsIntoAdditionalProperties,
  parseTaskTemplateExtensions
} from '@/common/components/common-relations/setting-pages/task-template/taskTemplateExtensions'
import {
  toUtcEndOfDayInstantString,
  toUtcStartOfDayInstantString
} from '@/common/components/common-relations/setting-pages/task-template/taskTemplateDatePayload'

// GraphQL queries and mutations
const GET_INVESTMENT_TASK_TEMPLATES = `
  query GetInvestmentTaskTemplates($limit: Int, $offset: Int, $where: InvestmentTaskTemplateBoolExp) {
    InvestmentTaskTemplate(limit: $limit, offset: $offset, where: $where, orderBy: { displayOrder: ASC }) {
      id
      version
      businessKey
      recordState
      code
      name
      description
      displayOrder
      enabled
      activeFrom
      activeTo
      intervalDays
      durationDays
      daysOfWeek
      daysOfMonth
      monthsOfYear
      assigneeType
      holidayPolicy
      nextStartDate
      typeRef
      priorityRef
      investmentGroupRef
      investmentTypeRef
      # Fetch catalog entry objects to get UUIDs
      type {
        id
        code
        value
      }
      priority {
        id
        code
        value
      }
      investmentGroup {
        id
        code
        value
      }
      investmentType {
        id
        code
        value
      }
      additionalProperties
      createdAt
      createdBy
    }
  }
`

// Transform GraphQL response to BaseTaskTemplate
const transformToBaseTaskTemplate = (template: any): BaseTaskTemplate => {
  // Extract catalog entry IDs from objects (use the full reference string as ID)
  const typeRefId = template.type?.id || template.typeRef || ''
  const priorityRefId = template.priority?.id || template.priorityRef || ''
  const investmentGroupRefId = template.investmentGroup?.id || template.investmentGroupRef || ''
  const investmentTypeRefId = template.investmentType?.id || template.investmentTypeRef || ''
  const additionalProperties = {
    ...template.additionalProperties,
    investmentGroupRef: investmentGroupRefId,
    investmentTypeRef: investmentTypeRefId
  }
  const ext = parseTaskTemplateExtensions(additionalProperties)

  return {
    id: template.id,
    version: template.version,
    businessKey: template.businessKey,
    recordState: template.recordState,
    code: template.code,
    name: template.name,
    description: template.description,
    displayOrder: template.displayOrder,
    enabled: template.enabled,
    isActive: template.enabled, // Map enabled to isActive for form compatibility
    activeFrom: template.activeFrom,
    activeTo: template.activeTo,
    intervalDays: template.intervalDays,
    durationDays: template.durationDays,
    // Flat DB fields
    daysOfWeek: template.daysOfWeek || {},
    daysOfMonth: template.daysOfMonth || {},
    monthsOfYear: template.monthsOfYear || {},
    // Combined recurringSchedule for form usage
    recurringSchedule: {
      daysOfWeek: template.daysOfWeek || {},
      daysOfMonth: template.daysOfMonth || {},
      monthsOfYear: template.monthsOfYear || {},
      intervalDays: template.intervalDays || 0,
      holidayPolicy: template.holidayPolicy || ''
    },
    assigneeType: template.assigneeType,
    holidayPolicy: template.holidayPolicy,
    nextStartDate: template.nextStartDate,
    // Use UUID from catalog entry objects (not code-based refs)
    typeRef: typeRefId,
    priorityRef: priorityRefId,
    additionalProperties,
    schedulingType: formSchedulingTypeForInput(ext),
    eventTriggerEnabled: ext.eventTriggerEnabled,
    eventSourceEntityType: ext.eventSourceEntityType,
    eventSourceEntityId: ext.eventSourceEntityId,
    scopeLimited: ext.scopeLimited,
    scopedEntityType: ext.scopedEntityType,
    scopedEntityId: ext.scopedEntityId,
    eventInvestmentGroupRef: ext.eventInvestmentGroupRef,
    eventInvestmentTypeRef: ext.eventInvestmentTypeRef
  }
}

// Transform form data to process payload
const transformFormDataToPayload = (
  data: TaskTemplateFormData,
  existingAdditional?: Record<string, unknown> | null
) => ({
  code: data.code,
  name: data.name,
  description: data.description,
  enabled: data.isActive,
  activeFrom: toUtcStartOfDayInstantString(data.activeFrom),
  activeTo: toUtcEndOfDayInstantString(data.activeTo),
  typeRef: data.typeRef,
  priorityRef: data.priorityRef,
  assigneeType: data.assigneeType,
  daysOfWeek: data.recurringSchedule?.daysOfWeek || {},
  daysOfMonth: data.recurringSchedule?.daysOfMonth || {},
  monthsOfYear: data.recurringSchedule?.monthsOfYear || {},
  intervalDays: data.recurringSchedule?.intervalDays || 0,
  holidayPolicy: data.recurringSchedule?.holidayPolicy || 'SKIP_TASK',
  nextStartDate: toUtcStartOfDayInstantString(data.nextStartDate),
  additionalProperties: mergeExtensionsIntoAdditionalProperties(data, existingAdditional),
  investmentGroupRef: data.eventInvestmentGroupRef || null,
  investmentTypeRef: data.eventInvestmentTypeRef || null
})

export const useInvestmentTaskTemplateSettings = (context: BusinessAppContextProps) => {
  const [templates, setTemplates] = useState<BaseTaskTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(context.accessToken)
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))

  const fetchTemplates = useCallback(async () => {
    if (!context.accessToken) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await graphqlClient.request(GET_INVESTMENT_TASK_TEMPLATES, {
        limit: 1000,
        offset: 0,
        where: {}
      })

      const transformedTemplates = result.InvestmentTaskTemplate.map(transformToBaseTaskTemplate)
      setTemplates(transformedTemplates)
    } catch (err) {
      console.error('Error fetching investment task templates:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch task templates')
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, graphqlClient])

  const createTemplate = useCallback(
    async (data: TaskTemplateFormData) => {
      if (!context.accessToken) throw new Error('No access token')

      try {
        const payload = {
          changeMode: 'INSERT',
          investmentTaskTemplate: transformFormDataToPayload(data, null)
        }

        await restClient.post('/investment-relations/saveInvestmentTaskTemplate', payload, {
          headers: { Authorization: `Bearer ${context.accessToken}` }
        })

        await fetchTemplates()
      } catch (err) {
        console.error('Error creating investment task template:', err)
        throw err
      }
    },
    [context.accessToken, restClient, fetchTemplates]
  )

  const updateTemplate = useCallback(
    async (id: string, data: TaskTemplateFormData) => {
      if (!context.accessToken) throw new Error('No access token')

      try {
        const template = templates.find(t => t.id === id)
        const payload = {
          changeMode: 'UPDATE',
          investmentTaskTemplate: {
            id,
            version: template?.version || 0,
            ...transformFormDataToPayload(data, template?.additionalProperties ?? null)
          }
        }

        await restClient.post('/investment-relations/saveInvestmentTaskTemplate', payload, {
          headers: { Authorization: `Bearer ${context.accessToken}` }
        })

        await fetchTemplates()
      } catch (err) {
        console.error('Error updating investment task template:', err)
        throw err
      }
    },
    [context.accessToken, restClient, fetchTemplates, templates]
  )

  const deleteTemplate = useCallback(
    async (id: string) => {
      if (!context.accessToken) throw new Error('No access token')

      try {
        const template = templates.find(t => t.id === id)
        const payload = {
          changeMode: 'DELETE',
          investmentTaskTemplate: {
            id,
            version: template?.version || 0
          }
        }

        await restClient.post('/investment-relations/saveInvestmentTaskTemplate', payload, {
          headers: { Authorization: `Bearer ${context.accessToken}` }
        })

        setTemplates(prev => prev.filter(t => t.id !== id))
      } catch (err) {
        console.error('Error deleting investment task template:', err)
        throw err
      }
    },
    [context.accessToken, restClient, templates]
  )

  const retry = useCallback(() => {
    fetchTemplates()
  }, [fetchTemplates])

  return {
    templates,
    isLoading,
    error,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    retry
  }
}
