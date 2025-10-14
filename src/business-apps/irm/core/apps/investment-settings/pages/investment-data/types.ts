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

export interface InvestmentDataConfiguration {
  formFields?: FieldGroup[]
  prospectFields?: ProspectField[]
  tileFields?: TileField[]
}

export interface CatalogEntryWithConfig {
  id: string
  code: string
  value: string
  objectValue?: InvestmentDataConfiguration
  parentEntryId?: string
}

export type ConfigurationType = 'form' | 'prospect' | 'tile'
export type TargetLevel = 'group' | 'type'

export interface ConfigurationContext {
  targetLevel: TargetLevel
  selectedEntry: CatalogEntryWithConfig | null
  configurationType: ConfigurationType
}
