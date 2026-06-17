import type { CatalogEntry } from '@/common/types/CatalogTypes'

export const ASSET_CATALOG_VERSION = 'v1'

export const ASSET_BRAND_CATALOG = 'AssetBrand'
export const ASSET_CATEGORY_CATALOG = 'AssetCategory'
export const ASSET_CONDITION_CATALOG = 'AssetCondition'
export const SANITIZATION_METHOD_CATALOG = 'SanitizationMethod'
export const DISPOSAL_OUTCOME_CATALOG = 'DisposalOutcome'

export type AssetCatalogIdentifier =
  | typeof ASSET_BRAND_CATALOG
  | typeof ASSET_CATEGORY_CATALOG
  | typeof ASSET_CONDITION_CATALOG
  | typeof SANITIZATION_METHOD_CATALOG
  | typeof DISPOSAL_OUTCOME_CATALOG

export interface AssetCatalogEntry {
  id: string
  code: string
  value: string
  alternativeCode?: string
  parentEntryId?: string
  additionalValue1?: string
  additionalValue2?: string
  additionalValue3?: string
  isDeleted?: boolean
  translations: CatalogEntry['translations']
}

export interface AssetCatalogConfig {
  catalogIdentifier: AssetCatalogIdentifier
  version: typeof ASSET_CATALOG_VERSION
  tabValue: AssetsMasterDataTab
  titleKey: string
  descriptionKey: string
  searchPlaceholderKey: string
  addButtonKey: string
  editButtonKey: string
  deleteTitleKey: string
  sheetTitleKey: string
  sheetExtraContentKey: string
  loadErrorKey: string
  viewActionPrefix: string
  formName: string
}

export enum AssetsMasterDataTab {
  ASSET_BRANDS = 'asset-brands',
  ASSET_CATEGORIES = 'asset-categories',
  ASSET_CONDITIONS = 'asset-conditions',
  SANITIZATION_METHODS = 'sanitization-methods',
  DISPOSAL_OUTCOMES = 'disposal-outcomes'
}
