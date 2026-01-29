/**
 * Document Apps Module
 *
 * A Word-like document editor for NEWWORK Business Apps.
 * Features:
 * - Create new documents from scratch or templates
 * - Upload and edit existing Word documents (.docx)
 * - Rich text formatting with full toolbar
 * - Template management (create, use, share)
 * - Send documents for approval workflow
 * - Export to Word/PDF
 */

// Main components
export { DocumentAppsHub } from './DocumentAppsHub'
export { DocumentEditor } from './DocumentEditor'

// Sub-components
export {
  WordUploader,
  DocumentPreviewCard,
  NoDocumentsState,
  TemplateGallery,
  SendForApprovalDialog
} from './components'

// Hooks
export { useWordParser, useDocumentApps, useDocumentTemplates } from './hooks'

// Services
export { DocumentFileStorageService, DocumentApprovalService } from './services'

// Types
export type {
  Document,
  DocumentSummary,
  DocumentStatus,
  DocumentTemplate,
  TemplateSummary,
  TemplateCategory,
  ParsedWordDocument,
  ApprovalWorkflowConfig,
  DocumentApprovalRequest,
  ExportFormat,
  ExportOptions
} from './types'
export { TEMPLATE_CATEGORY_API_VALUES } from './types'

// Utilities
export { exportToWord, exportToPDF, exportToHTML, exportToText } from './utils/exportUtils'
export { resolvePlaceholders } from './utils/templatePlaceholders'

// Template entity registry (middle link for placeholder mapping – no flow-engine)
export { TEMPLATE_ENTITY_REGISTRY, formatTemplatePlaceholder, getTemplateEntities, getTemplateEntity } from './entities'
export type { TemplateEntityDomain, TemplateEntityDefinition } from './entities'

// Default export for module registration
export { DocumentAppsHub as default } from './DocumentAppsHub'
