import { JSONValue } from './i18nTypes'

type TranslationValues = {
  localeCode?: string
  value?: string
  additionalValue1?: string
  additionalValue2?: string
  additionalValue3?: string
  objectValue?: JSONValue
}

export type CatalogEntry = {
  id: string
  code: string
  alternativeCode?: string
  displayOrder?: number
  localeCode?: string
  value: string
  additionalValue1?: string
  additionalValue2?: string
  additionalValue3?: string
  type: string
  objectValue?: JSONValue
  parentEntryId?: string
  translations: TranslationValues[]
  children?: CatalogEntry[]
  needTranslationIcon?: boolean
}

export type GetCatalogEntriesParams = {
  catalogIdentifier: string
  version: string
}

export type GetCatalogsParams = {
  includeLocalizedVersions?: boolean
  includeChildCatalogEntries?: boolean
  returnTotalRecords?: boolean
  includeTranslations?: boolean
  localeCode?: string
  code?: string
  name?: string
  searchCriteria?: string
  parentEntryId?: string
  limit?: number
  offset?: number
  value?: string
  // Extended filters supported by Catalog Manager
  type?: string
  parentEntryId?: string
}

export interface GetCatalogEntriesResponse {
  data: CatalogEntry[]
  test: string
  paging: {
    limit: number
    offset: number
    totalRecords: number
    returnTotalRecords: boolean
  }
}

export interface Catalog {
  id: string
  identifier: string
  name: string
  version: string
  translations: TranslationValues[]
  children?: Catalog[]
  parentId?: string
  validFrom?: string
  validTo?: string
}

// ===== CATALOG MANAGEMENT TYPES =====
// These types are for catalog administration/management, not everyday business usage

export interface CatalogManagement {
  id?: string
  parentId?: string
  parentName?: string
  identifier: string
  name: string
  version: string
  validFrom?: string
  validTo?: string
  children?: CatalogManagement[]
  defaultLocale?: string
  description?: string
  createdAt?: string
  createdBy?: string
  updatedAt?: string
  updatedBy?: string
  deletedAt?: string
  isDeleted?: boolean
  recordState?: string
  schemaDefinition?: Record<string, ParameterDefinition>
}

export interface GetCatalogsResponse {
  data: CatalogManagement[]
  paging: {
    limit: number
    offset: number
    totalRecords: number
    returnTotalRecords: boolean
  }
}

export interface ParameterDefinition {
  type: string
  required?: boolean
}

export interface CatalogEntryManagement {
  id?: string
  parentEntryId?: string
  code?: string
  alternativeCode?: string
  value?: string
  additionalValue1?: string
  additionalValue2?: string
  additionalValue3?: string
  type?: string
  objectValue?: Record<string, any>
  translations?: CatalogEntryLocalizedDTO[]
  description?: string
  activeFrom?: string
  activeTo?: string
  createdAt?: string
  createdBy?: string
  updatedAt?: string
  updatedBy?: string
  deletedAt?: string
  isDeleted?: boolean
  recordState?: string
  valueTranslations?: Record<string, any>
  displayOrder?: number
}

export interface CatalogEntryLocalizedDTO {
  id?: string
  localeCode?: string
  value?: string
  additionalValue1?: string
  additionalValue2?: string
  additionalValue3?: string
  objectValue?: Record<string, any>
}

export interface ParentCatalog {
  id: string
  parentId?: string
  parentName?: string
}

export interface CatalogImportResponse {
  catalogsAdded: number
  catalogsUpdated: number
  entriesAdded: number
  entriesUpdated: number
}

export interface CatalogExportRequest {
  catalogIds?: string[]
}

export interface ImportCatalogEntriesParams {
  catalogIdentifier: string
  version: string
  importMode: 'ADD' | 'UPDATE' | 'REPLACE'
  parentEntryId?: string
  localeCode?: string
  catalogEntryId?: string
  fileEncoding?: string
}
