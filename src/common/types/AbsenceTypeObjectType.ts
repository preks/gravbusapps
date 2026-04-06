import { JSONValue } from './i18nTypes'
import type { TranslationValues } from './DocumentTypeObjectTypes'

export interface AbsenceTypeObjectValue {
  [key: string]: JSONValue
}

export interface AbsenceType {
  id: string
  code: string
  value: string
  type?: string
  parentEntryId?: string
  objectValue?: AbsenceTypeObjectValue | JSONValue[]
  catalogEntryLocalId?: string
  localeCode: string
  translations?: TranslationValues[]
}
