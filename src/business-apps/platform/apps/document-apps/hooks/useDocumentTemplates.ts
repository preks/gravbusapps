/**
 * useDocumentTemplates Hook
 *
 * Manages document templates including CRUD operations,
 * creating documents from templates, and saving documents as templates.
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { DocumentFileStorageService } from '../services'
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
 * Built-in default templates
 */
const DEFAULT_TEMPLATES: Omit<DocumentTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>[] = [
  {
    name: 'Blank Document',
    description: 'Start with a clean slate',
    content: '<p></p>',
    category: 'other',
    isPublic: true,
    createdBy: 'system'
  },
  {
    name: 'Business Letter',
    description: 'Professional business correspondence',
    content: `<p>[Your Name]<br>[Your Address]<br>[City, State ZIP]<br>[Your Email]<br>[Date]</p>
<p></p>
<p>[Recipient Name]<br>[Recipient Title]<br>[Company Name]<br>[Company Address]<br>[City, State ZIP]</p>
<p></p>
<p>Dear [Recipient Name],</p>
<p></p>
<p>[Opening paragraph - state the purpose of your letter]</p>
<p></p>
<p>[Body paragraphs - provide details and supporting information]</p>
<p></p>
<p>[Closing paragraph - summarize and state desired action]</p>
<p></p>
<p>Sincerely,</p>
<p></p>
<p>[Your Signature]<br>[Your Typed Name]<br>[Your Title]</p>`,
    category: 'letters',
    isPublic: true,
    createdBy: 'system',
    placeholders: [
      { id: 'name', key: '[Your Name]', label: 'Your Name', type: 'text', required: true },
      { id: 'recipient', key: '[Recipient Name]', label: 'Recipient Name', type: 'text', required: true }
    ]
  },
  {
    name: 'Meeting Minutes',
    description: 'Document meeting discussions and decisions',
    content: `<h1>Meeting Minutes</h1>
<p><strong>Date:</strong> [Date]<br>
<strong>Time:</strong> [Start Time] - [End Time]<br>
<strong>Location:</strong> [Location/Video Call Link]<br>
<strong>Attendees:</strong> [List of Attendees]</p>
<h2>Agenda</h2>
<ol>
<li>[Agenda Item 1]</li>
<li>[Agenda Item 2]</li>
<li>[Agenda Item 3]</li>
</ol>
<h2>Discussion Summary</h2>
<h3>[Agenda Item 1]</h3>
<p>[Summary of discussion]</p>
<h3>[Agenda Item 2]</h3>
<p>[Summary of discussion]</p>
<h2>Action Items</h2>
<ul>
<li><strong>[Person]:</strong> [Action item] - Due: [Date]</li>
<li><strong>[Person]:</strong> [Action item] - Due: [Date]</li>
</ul>
<h2>Next Meeting</h2>
<p><strong>Date:</strong> [Next Meeting Date]<br>
<strong>Time:</strong> [Time]<br>
<strong>Location:</strong> [Location]</p>
<p></p>
<p><em>Minutes prepared by: [Your Name]</em></p>`,
    category: 'reports',
    isPublic: true,
    createdBy: 'system'
  },
  {
    name: 'Project Proposal',
    description: 'Outline a new project initiative',
    content: `<h1>Project Proposal</h1>
<h2>Executive Summary</h2>
<p>[Brief overview of the project, its objectives, and expected outcomes]</p>
<h2>Project Background</h2>
<p>[Context and rationale for the project]</p>
<h2>Objectives</h2>
<ul>
<li>[Objective 1]</li>
<li>[Objective 2]</li>
<li>[Objective 3]</li>
</ul>
<h2>Scope</h2>
<h3>In Scope</h3>
<ul>
<li>[Item 1]</li>
<li>[Item 2]</li>
</ul>
<h3>Out of Scope</h3>
<ul>
<li>[Item 1]</li>
<li>[Item 2]</li>
</ul>
<h2>Timeline</h2>
<table>
<tr><th>Phase</th><th>Duration</th><th>Deliverables</th></tr>
<tr><td>Phase 1</td><td>[Duration]</td><td>[Deliverables]</td></tr>
<tr><td>Phase 2</td><td>[Duration]</td><td>[Deliverables]</td></tr>
</table>
<h2>Budget</h2>
<p>[Budget breakdown and justification]</p>
<h2>Team</h2>
<p>[Project team members and roles]</p>
<h2>Risks and Mitigation</h2>
<ul>
<li><strong>Risk:</strong> [Risk] - <strong>Mitigation:</strong> [Strategy]</li>
</ul>
<h2>Success Criteria</h2>
<ul>
<li>[Criterion 1]</li>
<li>[Criterion 2]</li>
</ul>`,
    category: 'proposals',
    isPublic: true,
    createdBy: 'system'
  },
  {
    name: 'Non-Disclosure Agreement',
    description: 'Standard confidentiality agreement',
    content: `<h1>NON-DISCLOSURE AGREEMENT</h1>
<p>This Non-Disclosure Agreement ("Agreement") is entered into as of <strong>[DATE]</strong> by and between:</p>
<p><strong>Disclosing Party:</strong> [COMPANY NAME], a [STATE] corporation<br>
Address: [COMPANY ADDRESS]</p>
<p><strong>Receiving Party:</strong> [RECIPIENT NAME]<br>
Address: [RECIPIENT ADDRESS]</p>
<h2>1. Definition of Confidential Information</h2>
<p>For purposes of this Agreement, "Confidential Information" shall include all information or data disclosed by the Disclosing Party to the Receiving Party, whether orally, in writing, or by any other means, that is designated as confidential or that reasonably should be understood to be confidential given the nature of the information and the circumstances of disclosure.</p>
<h2>2. Obligations of Receiving Party</h2>
<p>The Receiving Party agrees to:</p>
<ul>
<li>Hold and maintain the Confidential Information in strict confidence</li>
<li>Not disclose the Confidential Information to any third parties without prior written consent</li>
<li>Not use the Confidential Information for any purpose other than the Purpose stated herein</li>
<li>Protect the Confidential Information using the same degree of care used to protect its own confidential information</li>
</ul>
<h2>3. Exclusions</h2>
<p>Confidential Information does not include information that:</p>
<ul>
<li>Was publicly known at the time of disclosure</li>
<li>Becomes publicly known through no fault of the Receiving Party</li>
<li>Was rightfully in the Receiving Party's possession prior to disclosure</li>
<li>Is independently developed by the Receiving Party</li>
</ul>
<h2>4. Term</h2>
<p>This Agreement shall remain in effect for a period of <strong>[TERM]</strong> years from the date of execution.</p>
<h2>5. Return of Information</h2>
<p>Upon termination or request, the Receiving Party shall return or destroy all Confidential Information.</p>
<h2>6. Governing Law</h2>
<p>This Agreement shall be governed by the laws of [JURISDICTION].</p>
<h2>Signatures</h2>
<p><strong>Disclosing Party:</strong></p>
<p>Signature: ___________________________ Date: ___________<br>
Name: [NAME]<br>
Title: [TITLE]</p>
<p><strong>Receiving Party:</strong></p>
<p>Signature: ___________________________ Date: ___________<br>
Name: [NAME]<br>
Title: [TITLE]</p>`,
    category: 'contracts',
    isPublic: true,
    createdBy: 'system'
  },
  {
    name: 'Standard Operating Procedure',
    description: 'Document a business process',
    content: `<h1>Standard Operating Procedure</h1>
<table>
<tr><td><strong>SOP Number:</strong></td><td>[SOP-XXX]</td></tr>
<tr><td><strong>Title:</strong></td><td>[Procedure Title]</td></tr>
<tr><td><strong>Department:</strong></td><td>[Department Name]</td></tr>
<tr><td><strong>Effective Date:</strong></td><td>[Date]</td></tr>
<tr><td><strong>Version:</strong></td><td>[1.0]</td></tr>
<tr><td><strong>Prepared By:</strong></td><td>[Name]</td></tr>
<tr><td><strong>Approved By:</strong></td><td>[Name]</td></tr>
</table>
<h2>1. Purpose</h2>
<p>[Describe the purpose of this procedure]</p>
<h2>2. Scope</h2>
<p>[Define who and what this procedure applies to]</p>
<h2>3. Responsibilities</h2>
<ul>
<li><strong>[Role 1]:</strong> [Responsibilities]</li>
<li><strong>[Role 2]:</strong> [Responsibilities]</li>
</ul>
<h2>4. Definitions</h2>
<ul>
<li><strong>[Term]:</strong> [Definition]</li>
</ul>
<h2>5. Procedure</h2>
<h3>5.1 [Step Category]</h3>
<ol>
<li>[Step 1]</li>
<li>[Step 2]</li>
<li>[Step 3]</li>
</ol>
<h3>5.2 [Step Category]</h3>
<ol>
<li>[Step 1]</li>
<li>[Step 2]</li>
</ol>
<h2>6. References</h2>
<ul>
<li>[Related documents, policies, or regulations]</li>
</ul>
<h2>7. Revision History</h2>
<table>
<tr><th>Version</th><th>Date</th><th>Author</th><th>Changes</th></tr>
<tr><td>1.0</td><td>[Date]</td><td>[Name]</td><td>Initial release</td></tr>
</table>`,
    category: 'procedures',
    isPublic: true,
    createdBy: 'system'
  }
]

/**
 * Hook for managing document templates
 */
export function useDocumentTemplates(accessToken: string, userId?: string): UseDocumentTemplatesResult {
  const [state, setState] = useState<UseDocumentTemplatesState>({
    templates: [],
    isLoading: true,
    error: null
  })

  // Initialize storage service
  const storageService = useMemo(() => {
    if (!accessToken || !userId) return null
    return new DocumentFileStorageService(accessToken, userId)
  }, [accessToken, userId])

  /**
   * Load all templates
   */
  const refreshTemplates = useCallback(async () => {
    if (!storageService) {
      // Return default templates if not authenticated
      setState({
        templates: DEFAULT_TEMPLATES.map((t, idx) => ({
          id: `default-${idx}`,
          name: t.name,
          description: t.description,
          category: t.category,
          isPublic: true,
          createdBy: 'system',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          usageCount: 0
        })),
        isLoading: false,
        error: null
      })
      return
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))
      const templates = await storageService.listTemplates()

      // Merge with default templates
      const defaultTemplates: TemplateSummary[] = DEFAULT_TEMPLATES.map((t, idx) => ({
        id: `default-${idx}`,
        name: t.name,
        description: t.description,
        category: t.category,
        isPublic: true,
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        usageCount: 0
      }))

      setState({
        templates: [...defaultTemplates, ...templates],
        isLoading: false,
        error: null
      })
    } catch (error) {
      console.error('[useDocumentTemplates] Failed to load templates:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to load templates'
      }))
    }
  }, [storageService])

  // Load templates on mount
  useEffect(() => {
    refreshTemplates()
  }, [refreshTemplates])

  /**
   * Load a single template
   */
  const loadTemplate = useCallback(
    async (id: string): Promise<DocumentTemplate | null> => {
      // Check if it's a default template
      if (id.startsWith('default-')) {
        const idx = parseInt(id.replace('default-', ''), 10)
        const defaultTemplate = DEFAULT_TEMPLATES[idx]
        if (defaultTemplate) {
          return {
            ...defaultTemplate,
            id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            usageCount: 0
          }
        }
        return null
      }

      if (!storageService) return null

      try {
        return await storageService.getTemplate(id)
      } catch (error) {
        console.error('[useDocumentTemplates] Failed to load template:', error)
        toast.error('Failed to load template')
        return null
      }
    },
    [storageService]
  )

  /**
   * Create a new template
   */
  const createTemplate = useCallback(
    async (
      template: Omit<DocumentTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>
    ): Promise<DocumentTemplate | null> => {
      if (!storageService) {
        toast.error('Please sign in to create templates')
        return null
      }

      try {
        const newTemplate = await storageService.createTemplate(template)
        if (newTemplate) {
          toast.success('Template created successfully')
          await refreshTemplates()
        }
        return newTemplate
      } catch (error) {
        console.error('[useDocumentTemplates] Failed to create template:', error)
        toast.error('Failed to create template')
        return null
      }
    },
    [storageService, refreshTemplates]
  )

  /**
   * Delete a template
   */
  const deleteTemplate = useCallback(
    async (id: string): Promise<boolean> => {
      // Can't delete default templates
      if (id.startsWith('default-')) {
        toast.error('Cannot delete built-in templates')
        return false
      }

      if (!storageService) return false

      try {
        const success = await storageService.deleteTemplate(id)
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
    [storageService, refreshTemplates]
  )

  /**
   * Create a document from a template
   */
  const createDocumentFromTemplate = useCallback(
    async (templateId: string, title: string): Promise<Document | null> => {
      // Handle default templates
      if (templateId.startsWith('default-')) {
        const idx = parseInt(templateId.replace('default-', ''), 10)
        const defaultTemplate = DEFAULT_TEMPLATES[idx]
        if (!defaultTemplate || !storageService) return null

        try {
          const newDocument = await storageService.createDocument({
            title,
            description: `Created from template: ${defaultTemplate.name}`,
            content: defaultTemplate.content,
            status: 'draft',
            category: defaultTemplate.category,
            tags: defaultTemplate.tags,
            createdBy: userId || ''
          })
          if (newDocument) {
            toast.success('Document created from template')
          }
          return newDocument
        } catch (error) {
          console.error('[useDocumentTemplates] Failed to create document:', error)
          toast.error('Failed to create document')
          return null
        }
      }

      if (!storageService) return null

      try {
        const newDocument = await storageService.createDocumentFromTemplate(templateId, title)
        if (newDocument) {
          toast.success('Document created from template')
        }
        return newDocument
      } catch (error) {
        console.error('[useDocumentTemplates] Failed to create document from template:', error)
        toast.error('Failed to create document')
        return null
      }
    },
    [storageService, userId]
  )

  /**
   * Save a document as a template
   */
  const saveDocumentAsTemplate = useCallback(
    async (
      documentId: string,
      templateName: string,
      category: TemplateCategory,
      isPublic: boolean
    ): Promise<DocumentTemplate | null> => {
      if (!storageService) {
        toast.error('Please sign in to save templates')
        return null
      }

      try {
        const newTemplate = await storageService.saveDocumentAsTemplate(documentId, templateName, category, isPublic)
        if (newTemplate) {
          toast.success('Document saved as template')
          await refreshTemplates()
        }
        return newTemplate
      } catch (error) {
        console.error('[useDocumentTemplates] Failed to save as template:', error)
        toast.error('Failed to save as template')
        return null
      }
    },
    [storageService, refreshTemplates]
  )

  /**
   * Get templates filtered by category
   */
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
    deleteTemplate,
    createDocumentFromTemplate,
    saveDocumentAsTemplate,
    refreshTemplates,
    getTemplatesByCategory
  }
}
