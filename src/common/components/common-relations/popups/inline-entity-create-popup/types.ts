import type { ReactNode } from 'react'
import type { FileEntity, FileContext } from '@/common/utils/fileUtils'

export interface InlineDraftContact {
  __draftId: string
  __isDraft: true
  contactType?: string | null
  contact: Record<string, any>
}

export interface InlineDraftAccount {
  __draftId: string
  __isDraft: true
  contactType?: string | null
  account: Record<string, any>
}

export type InlineEntityDraft = InlineDraftContact | InlineDraftAccount

/**
 * Props passed by shared segments to their caller-supplied inline-create render prop.
 * The caller provides `entity`, `formConfig`, and `businessAppContext`; the segment
 * provides the dialog open state and callbacks.
 */
export interface InlineEntityCreateRenderProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  draftId?: string
  defaultValues?: Record<string, any>
  onConfirm: (draft: InlineEntityDraft) => void
  'data-testid'?: string
}

/**
 * Structural file-upload configuration for inline create forms.
 * `appName` is intentionally absent — it is derived at runtime from
 * `businessAppContext.additionalData.appName` so this interface stays
 * free of any domain identifier.
 */
export interface InlineEntityFileConfig {
  fileEntity: FileEntity
  fileContext: FileContext
}

/**
 * Render function for domain-specific custom fields inside an inline create form.
 * Receives runtime state (defaultValues for edit mode pre-population, dataTestIdPrefix
 * for building test IDs) so the caller can embed domain-specific inputs correctly.
 */
export type InlineCustomFieldsRenderer = (opts: {
  defaultValues?: Record<string, any>
  dataTestIdPrefix: string
}) => ReactNode

/**
 * Complete domain-agnostic configuration for InlineAccountCreateForm.
 * The calling domain form supplies all domain-specific details; the shared form
 * component stays free of any 'crm' | 'irm' knowledge.
 *
 * `schema` is typed as `any` because the calling form provides a concrete Zod object
 * schema — tightening to `ZodObject<any>` here would require an extra Zod import in
 * types.ts, and the form components already cast to `any` when needed by react-hook-form.
 */
export interface InlineAccountFormConfig {
  schema: any
  annualRevenueCatalogIdentifier: string
  companySizeCatalogIdentifier: string
  accountPriorityCatalogIdentifier?: string
  fileConfig: InlineEntityFileConfig
  renderCustomFields?: InlineCustomFieldsRenderer
}

/**
 * Complete domain-agnostic configuration for InlineContactCreateForm.
 * Same principle as InlineAccountFormConfig.
 */
export interface InlineContactFormConfig {
  schema: any
  fileConfig: InlineEntityFileConfig
  renderCustomFields?: InlineCustomFieldsRenderer
}
