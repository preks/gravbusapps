/**
 * Custom Data Manager Types
 */

export enum InputType {
  TEXT = 'TEXT',
  TEXTAREA = 'TEXTAREA',
  SELECT = 'SELECT',
  MULTISELECT = 'MULTISELECT',
  NUMBER = 'NUMBER',
  DATE = 'DATE',
  DATETIME = 'DATETIME',
  CHECKBOX = 'CHECKBOX',
  FILE = 'FILE'
}

export interface InputOption {
  value: string
  label: string
}

export interface InputDataSource {
  type: 'CATALOG' | 'ENTITY' | 'API'
  catalog?: string
  entity?: string
  valueField?: string
  labelField?: string
}

export interface ColumnDefinition {
  type: InputType
  name: string
  label: string
  required?: boolean
  options?: InputOption[]
  dataSource?: InputDataSource
  value?: string
  readOnly?: boolean
}

export type DefinitionKind = 'SPREADSHEET' | 'ENTITY'

export type PublishState = 'GENERIC_TRACKED' | 'DRAFT' | 'PROMOTED_TRACKED' | 'ERROR'

export interface DeployState {
  tableName?: string
  deployedAt?: string
  deployed?: boolean
  error?: string
}

export interface CustomDataDefinition {
  id: string
  namespace: string
  key: string
  kind: DefinitionKind
  display_name?: string
  description?: string
  columns_json: ColumnDefinition[]
  publish_state: PublishState
  deploy_state?: DeployState
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
}

export interface CreateDefinitionDto {
  namespace: string
  key: string
  kind: DefinitionKind
  display_name?: string
  description?: string
  columns_json: ColumnDefinition[]
}

export interface UpdateDefinitionDto {
  display_name?: string
  description?: string
  columns_json?: ColumnDefinition[]
  publish_state?: PublishState
  deploy_state?: DeployState
}

export interface SpreadsheetRow {
  id: string
  spreadsheet_id: string
  values: Record<string, any>
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
}

export interface CreateRowDto {
  values: Record<string, any>
}

export interface UpdateRowDto {
  values: Record<string, any>
}

/**
 * AI Schema Generation Types
 */
export interface EntityRelationship {
  type: 'ONE_TO_MANY'
  sourceEntity: string // Parent entity key
  targetEntity: string // Child entity key
  foreignKeyColumn: string // Column name in child table
  relationshipName?: string // Optional name for Hasura relationship
  cascadeDelete?: boolean // Default: false
}

export interface EntityProposal {
  key: string
  displayName: string
  description: string
  columns: ColumnDefinition[]
}

export interface EntitySchemaProposal {
  entities: EntityProposal[]
  relationships: EntityRelationship[]
  reasoning?: string // AI explanation of the schema design
}

export interface EntityCreationStatus {
  entityKey: string
  definitionCreated: boolean
  tableDeployed: boolean
  tableName?: string
  error?: string
}

export interface RelationshipCreationStatus {
  sourceEntity: string
  targetEntity: string
  foreignKeyColumn: string
  created: boolean
  error?: string
}

export interface BatchCreationResult {
  success: boolean
  entities: EntityCreationStatus[]
  relationships: RelationshipCreationStatus[]
  error?: string
}
