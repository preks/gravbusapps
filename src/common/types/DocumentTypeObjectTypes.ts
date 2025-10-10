import { JSONValue } from './i18nTypes'

export interface DocumentTypeObjectValue {
  description?: string
  isActive?: boolean
  gdprRelevant?: boolean
  securityLevel?: string
  fileTypes?: string[]
  maxSize?: string
  translations?: TranslationValues[]
  [key: string]: any // Allow additional properties
}

export interface TranslationValues extends Record<string, JSONValue> {
  localeCode: string
  value: string
}

export interface DocumentType {
  parentEntryId: string
  code: string // e.g., "DEVELOPMENT"
  value: string
  objectValue: DocumentTypeObjectValue
  catalogEntryLocalId: string
  localeCode: string
  translations?: TranslationValues[]
  id: string // Format: "DocumentGroup:v1:{code}" (e.g., "DocumentGroup:v1:DEVELOPMENT")
}

export interface Module {
  id: string
  name: string
  description?: string
}

export interface Role {
  id: string
  name: string
  description?: string
}
