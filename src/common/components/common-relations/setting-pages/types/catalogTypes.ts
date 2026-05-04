/**
 * Shared types for catalog settings pages
 */

import type { CatalogTranslationEntry, CatalogTranslationMap } from '../utils/catalogTranslations'

export interface CatalogItem {
  id: string
  code: string
  value: string
  localeCode?: string
  translations?: CatalogTranslationEntry[]
  valueTranslations?: CatalogTranslationMap
  type?: string
  alternativeCode?: string
  parentEntryId?: string
  displayOrder?: number
  additionalValue1?: string
  additionalValue2?: string
  additionalValue3?: string
}

export interface CatalogUpsertData {
  code: string
  value: string
  valueTranslations?: CatalogTranslationMap
  type?: string
  alternativeCode?: string
  additionalValue1?: string
  displayOrder?: number
}

export interface CatalogTabState {
  items: CatalogItem[]
  isLoading?: boolean
  error?: string | null
}

export interface CatalogTabHandlers {
  onCreate: (data: CatalogUpsertData) => Promise<void> | void
  onUpdate: (id: string, data: CatalogUpsertData) => Promise<void> | void
  onDelete: (id: string) => Promise<void> | void
  onRetry?: () => void
}

export type DeleteAvailability =
  | { status: 'allowed' }
  | {
      status: 'blocked'
      reason: string
      usages?: Array<{ label: string; count: number }>
    }

export type DeleteAvailabilityResolver<TItem> = (item: TItem) => DeleteAvailability | Promise<DeleteAvailability>
