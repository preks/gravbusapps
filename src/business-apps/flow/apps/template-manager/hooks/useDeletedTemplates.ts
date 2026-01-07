/**
 * Hook for managing deleted templates operations
 */

import { useState, useCallback } from 'react'
import { templateApi } from '../services/templateApi'
import { DeletedTemplate } from '../types/deleted'
import { fetchEmployeesByIds, resolveEmployeeName } from '../utils/employeeResolver'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

interface UseDeletedTemplatesProps {
  baseUrl: string
  apiKey: string
  accessToken: string
}

export interface DeletedTemplateWithName extends DeletedTemplate {
  deletedByName: string
}

export const useDeletedTemplates = ({ baseUrl, apiKey, accessToken }: UseDeletedTemplatesProps) => {
  const [deletedTemplates, setDeletedTemplates] = useState<DeletedTemplateWithName[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [totalCount, setTotalCount] = useState(0)

  const graphqlClient = useGraphQLClient(accessToken)

  const loadDeletedTemplates = useCallback(
    async (limit = 50, offset = 0) => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await templateApi.getDeletedTemplates(baseUrl, apiKey, limit, offset)
        const templates = response.data || []

        // Extract unique employee IDs
        const employeeIds = [
          ...new Set(templates.map(t => t.deletedBy).filter(id => id && id !== 'system' && id !== 'unknown'))
        ]

        // Fetch employee information
        const employeeMap = await fetchEmployeesByIds(employeeIds, graphqlClient)

        // Enhance templates with employee names
        const enhancedTemplates: DeletedTemplateWithName[] = templates.map(template => ({
          ...template,
          deletedByName:
            template.deletedBy === 'system' || template.deletedBy === 'unknown'
              ? template.deletedBy
              : resolveEmployeeName(template.deletedBy, employeeMap)
        }))

        setDeletedTemplates(enhancedTemplates)
        setTotalCount(response.totalCount || response.count || 0)
      } catch (err) {
        console.error('Error loading deleted templates:', err)
        setError(err as Error)
        setDeletedTemplates([])
      } finally {
        setIsLoading(false)
      }
    },
    [baseUrl, apiKey, graphqlClient]
  )

  const restoreTemplate = useCallback(
    async (templateId: string, userId: string) => {
      try {
        await templateApi.restoreTemplate(baseUrl, templateId, apiKey, userId)
        // Reload the list after successful restore
        await loadDeletedTemplates()
      } catch (err) {
        console.error('Error restoring template:', err)
        throw err
      }
    },
    [baseUrl, apiKey, loadDeletedTemplates]
  )

  return {
    deletedTemplates,
    isLoading,
    error,
    totalCount,
    loadDeletedTemplates,
    restoreTemplate
  }
}
