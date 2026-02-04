/**
 * useDocumentTemplates Hook
 *
 * Manages document templates via the document API (/document/api/v1/templates).
 * Categories match API allowed values: contracts, agreements, letters, reports,
 * proposals, policies, procedures, forms, other.
 */

import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { DocumentApiService } from '../services/DocumentApiService'
import type { Document, DocumentTemplate, TemplateSummary, TemplateCategory } from '../types'

interface UseDocumentTemplatesState {
  templates: TemplateSummary[]
  isLoading: boolean
  error: string | null
}

interface UseDocumentTemplatesResult extends UseDocumentTemplatesState {
  // Template operations
  loadTemplate: (id: string) => Promise<DocumentTemplate | null>
  createTemplate: (
    template: Omit<DocumentTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>
  ) => Promise<DocumentTemplate | null>
  updateTemplate: (id: string, updates: Partial<DocumentTemplate>) => Promise<DocumentTemplate | null>
  deleteTemplate: (id: string) => Promise<boolean>

  // Document-Template operations
  createDocumentFromTemplate: (templateId: string, title: string) => Promise<Document | null>
  saveDocumentAsTemplate: (
    documentId: string,
    templateName: string,
    category: TemplateCategory,
    isPublic: boolean
  ) => Promise<DocumentTemplate | null>

  // Utilities
  refreshTemplates: () => Promise<void>
  getTemplatesByCategory: (category: TemplateCategory) => TemplateSummary[]
}

/**
 * Hook for managing document templates
 */
function useDocumentTemplatesImpl(
  accessToken: string | null | undefined,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for API compatibility with useDocumentTemplates(accessToken, userId)
  _userId?: string
): UseDocumentTemplatesResult {
  const [state, setState] = useState<UseDocumentTemplatesState>({
    templates: [],
    isLoading: true,
    error: null
  })

  const refreshTemplates = useCallback(async () => {
    if (!accessToken) {
      setState({ templates: [], isLoading: false, error: null })
      return
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))
      const templates = await DocumentApiService.listTemplates({ includePublic: true })
      setState({ templates, isLoading: false, error: null })
    } catch (error) {
      console.error('[useDocumentTemplates] Failed to load templates:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to load templates'
      }))
    }
  }, [accessToken])

  useEffect(() => {
    refreshTemplates()
  }, [refreshTemplates])

  const loadTemplate = useCallback(
    async (id: string): Promise<DocumentTemplate | null> => {
      if (!accessToken) return null
      try {
        return await DocumentApiService.getTemplate(id)
      } catch (error) {
        console.error('[useDocumentTemplates] Failed to load template:', error)
        toast.error('Failed to load template')
        return null
      }
    },
    [accessToken]
  )

  const createTemplate = useCallback(
    async (
      template: Omit<DocumentTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>
    ): Promise<DocumentTemplate | null> => {
      if (!accessToken) {
        toast.error('Please sign in to create templates')
        return null
      }
      try {
        const newTemplate = await DocumentApiService.createTemplate(template)
        toast.success('Template created successfully')
        await refreshTemplates()
        return newTemplate
      } catch (error) {
        console.error('[useDocumentTemplates] Failed to create template:', error)
        toast.error('Failed to create template')
        return null
      }
    },
    [accessToken, refreshTemplates]
  )

  const updateTemplate = useCallback(
    async (id: string, updates: Partial<DocumentTemplate>): Promise<DocumentTemplate | null> => {
      if (!accessToken) return null
      try {
        const updated = await DocumentApiService.updateTemplate(id, updates)
        await refreshTemplates()
        return updated
      } catch (error) {
        console.error('[useDocumentTemplates] Failed to update template:', error)
        toast.error('Failed to update template')
        return null
      }
    },
    [accessToken, refreshTemplates]
  )

  const deleteTemplate = useCallback(
    async (id: string): Promise<boolean> => {
      if (!accessToken) return false
      try {
        const success = await DocumentApiService.deleteTemplate(id)
        if (success) {
          toast.success('Template deleted')
          await refreshTemplates()
        }
        return success
      } catch (error) {
        console.error('[useDocumentTemplates] Failed to delete template:', error)
        toast.error('Failed to delete template')
        return false
      }
    },
    [accessToken, refreshTemplates]
  )

  const createDocumentFromTemplate = useCallback(
    async (templateId: string, title: string): Promise<Document | null> => {
      if (!accessToken) return null
      try {
        const newDocument = await DocumentApiService.createDocumentFromTemplate(templateId, title)
        if (newDocument) toast.success('Document created from template')
        return newDocument
      } catch (error) {
        console.error('[useDocumentTemplates] Failed to create document:', error)
        toast.error('Failed to create document')
        return null
      }
    },
    [accessToken]
  )

  const saveDocumentAsTemplate = useCallback(
    async (
      documentId: string,
      templateName: string,
      category: TemplateCategory,
      isPublic: boolean
    ): Promise<DocumentTemplate | null> => {
      if (!accessToken) {
        toast.error('Please sign in to save templates')
        return null
      }
      try {
        const document = await DocumentApiService.getDocument(documentId)
        if (!document) {
          toast.error('Document not found')
          return null
        }
        const newTemplate = await DocumentApiService.createTemplate({
          name: templateName,
          description: `Template created from: ${document.title}`,
          content: document.content,
          category,
          tags: document.tags,
          formatting: document.formatting,
          isPublic,
          createdBy: document.createdBy
        })
        toast.success('Document saved as template')
        await refreshTemplates()
        return newTemplate
      } catch (error) {
        console.error('[useDocumentTemplates] Failed to save as template:', error)
        toast.error('Failed to save as template')
        return null
      }
    },
    [accessToken, refreshTemplates]
  )

  const getTemplatesByCategory = useCallback(
    (category: TemplateCategory): TemplateSummary[] => {
      return state.templates.filter(t => t.category === category)
    },
    [state.templates]
  )

  return {
    ...state,
    loadTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    createDocumentFromTemplate,
    saveDocumentAsTemplate,
    refreshTemplates,
    getTemplatesByCategory
  }
}

// Re-export with same signature as before (accessToken: string, userId?: string)
export function useDocumentTemplates(accessToken: string, userId?: string): UseDocumentTemplatesResult {
  return useDocumentTemplatesImpl(accessToken, userId)
}
