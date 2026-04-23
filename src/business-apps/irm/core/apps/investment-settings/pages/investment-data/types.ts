export interface FieldDefinition {
  id: string
  type: 'DATE' | 'DATETIME' | 'AMOUNT' | 'TEXT' | 'TEXTAREA' | 'NUMBER' | 'BOOLEAN' | 'SELECT' | string
  label: string
  property: string
  required: boolean
  displayOrder: string // Supports X.Y format where X is row, Y is column
  placeholder?: string
  helpText?: string
  options?: Array<{ label: string; value: string }>
  /** Registry row id — omitted from catalog objectValue on save. */
  registryEntryId?: string
  /** User-defined additionalProperties field — omitted from catalog objectValue on save. */
  isCustom?: boolean
  /** When false, excluded from report-scoped forms (passed through to DynamicForm). */
  report?: boolean
}

export interface FieldGroup {
  groupId: string
  groupLabel: string
  displayOrder: number
  fields: FieldDefinition[]
}

export interface TileField {
  key: string
  label: string
  displayOrder: number
  icon: string
}

export interface ProspectField {
  key: string
  label: string
  property: string
  displayOrder: number
  section: string
  type: 'text' | 'number' | 'date' | 'badge' | 'currency' | 'percentage'
}

/** Persisted on catalog objectValue as `requiredSubtypeKey`. */
export type RequiredSubtypeKey = 'equityInvestment' | 'realEstateInvestment' | 'liquidFundInvestment'

/** UI scope for field layout (maps to / from `requiredSubtypeKey`). One of three subtype tables + main investment. */
export type FormLayoutChoice = 'EQUITY' | 'REAL_ESTATE' | 'LIQUID_FUND'

/** Persisted shape of a prospect/reference field on the catalog objectValue. */
export interface CatalogReferenceField {
  type: string
  label: string
  property: string
  /** Stored as string ("1.1") but legacy entries may be numeric. */
  displayOrder: string | number
}

export interface InvestmentDataConfiguration {
  formFields?: FieldGroup[]
  prospectFields?: ProspectField[]
  tileFields?: TileField[]
  /** Persisted as `referenceFields` on catalog objectValue; mapped to `prospectFields` for the UI. */
  referenceFields?: CatalogReferenceField[]
  /** Which subtype table applies with `investment.*` — always one of the three API subtypes when form layout is owned. */
  requiredSubtypeKey?: RequiredSubtypeKey
}

export interface CatalogEntryWithConfig {
  id: string
  code: string
  value: string
  objectValue?: InvestmentDataConfiguration
  parentEntryId?: string
}

/** Raw, untyped-ish catalog entry shape as it arrives from the GraphQL response. */
export interface CatalogEntryRaw {
  id: string
  code: string
  value: string
  parentEntryId?: string
  objectValue?: Record<string, unknown>
}

export type ConfigurationType = 'form' | 'prospect' | 'tile'
export type TargetLevel = 'group' | 'type' | 'liquidFundType'

export interface ConfigurationContext {
  targetLevel: TargetLevel
  selectedEntry: CatalogEntryWithConfig | null
  configurationType: ConfigurationType
}
