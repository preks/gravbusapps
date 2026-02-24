/**
 * useDocumentTemplates Hook
 *
 * Manages document templates via the document API (/document/api/v1/templates).
 * Categories match API allowed values: contracts, agreements, letters, reports,
 * proposals, policies, procedures, forms, other.
 */

import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { useTranslation } from '@newwork/nw-design-system'
import { DocumentApiService } from '../services/DocumentApiService'
import translations from '../_i18n'
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
  const { t } = useTranslation(translations)
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
        error: t('doc-templates-error-load-templates')
      }))
    }
  }, [accessToken, t])

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
        toast.error(t('doc-templates-toast-load-failed'))
        return null
      }
    },
    [accessToken, t]
  )

  const createTemplate = useCallback(
    async (
      template: Omit<DocumentTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>
    ): Promise<DocumentTemplate | null> => {
      if (!accessToken) {
        toast.error(t('doc-templates-toast-sign-in-create'))
        return null
      }
      try {
        const newTemplate = await DocumentApiService.createTemplate(template)
        toast.success(t('doc-templates-toast-created'))
        await refreshTemplates()
        return newTemplate
      } catch (error) {
        console.error('[useDocumentTemplates] Failed to create template:', error)
        toast.error(t('doc-templates-toast-create-failed'))
        return null
      }
    },
    [accessToken, refreshTemplates, t]
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
        toast.error(t('doc-templates-toast-update-failed'))
        return null
      }
    },
    [accessToken, refreshTemplates, t]
  )

  const deleteTemplate = useCallback(
    async (id: string): Promise<boolean> => {
      if (!accessToken) return false
      try {
        const success = await DocumentApiService.deleteTemplate(id)
        if (success) {
          toast.success(t('doc-templates-toast-deleted'))
          await refreshTemplates()
        }
        return success
      } catch (error) {
        console.error('[useDocumentTemplates] Failed to delete template:', error)
        toast.error(t('doc-templates-toast-delete-failed'))
        return false
      }
    },
    [accessToken, refreshTemplates, t]
  )

  const createDocumentFromTemplate = useCallback(
    async (templateId: string, title: string): Promise<Document | null> => {
      if (!accessToken) return null
      try {
        const newDocument = await DocumentApiService.createDocumentFromTemplate(templateId, title)
        if (newDocument) toast.success(t('doc-templates-toast-document-created'))
        return newDocument
      } catch (error) {
        console.error('[useDocumentTemplates] Failed to create document:', error)
        toast.error(t('doc-templates-toast-document-create-failed'))
        return null
      }
    },
    [accessToken, t]
  )

  const saveDocumentAsTemplate = useCallback(
    async (
      documentId: string,
      templateName: string,
      category: TemplateCategory,
      isPublic: boolean
    ): Promise<DocumentTemplate | null> => {
      if (!accessToken) {
        toast.error(t('doc-templates-toast-sign-in-save'))
        return null
      }
      try {
        const document = await DocumentApiService.getDocument(documentId)
        if (!document) {
          toast.error(t('doc-templates-toast-document-not-found'))
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
        toast.success(t('doc-templates-toast-saved-as-template'))
        await refreshTemplates()
        return newTemplate
      } catch (error) {
        console.error('[useDocumentTemplates] Failed to save as template:', error)
        toast.error(t('doc-templates-toast-save-as-template-failed'))
        return null
      }
    },
    [accessToken, refreshTemplates, t]
  )

  const getTemplatesByCategory = useCallback(
    (category: TemplateCategory): TemplateSummary[] => {
      return state.templates.filter(tmpl => tmpl.category === category)
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
