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

export type RelationTargetKind = 'CUSTOM_ENTITY' | 'INTERNAL_ENTITY'

export interface InputDataSource {
  type: 'CATALOG' | 'CUSTOM_ENTITY' | 'API' | 'INTERNAL_ENTITY'
  catalog?: string
  entity?: string
  namespace?: string
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

export type DefinitionKind = 'CUSTOM_ENTITY'

export type PublishState = 'DRAFT' | 'PROMOTED_TRACKED' | 'ERROR'

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

export interface CustomDataNamespace {
  namespace: string
  display_name?: string | null
  description?: string | null
  created_at: string
  updated_at: string
}

export interface InternalEntityFieldDefinition {
  name: string
  displayName: string
  type: string
  description?: string
  category?: string
}

export interface InternalEntityDefinition {
  type: string
  displayName: string
  description: string
  icon?: string
  apiEndpoint?: string
  exampleId?: string
  fields?: InternalEntityFieldDefinition[]
}

export interface NamespaceEntityRelationship {
  relationType: 'ONE_TO_MANY' | 'MANY_TO_MANY'
  sourceEntity: string
  sourceKind: 'CUSTOM_ENTITY'
  targetEntity: string
  targetKind: 'CUSTOM_ENTITY' | 'INTERNAL_ENTITY'
  targetNamespace?: string
  fieldName: string
}

export interface NamespaceAggregate extends CustomDataNamespace {
  customEntities: CustomDataDefinition[]
  internalEntities: InternalEntityDefinition[]
  entityRelationships: NamespaceEntityRelationship[]
}

export interface CreateNamespaceDto {
  namespace: string
  display_name?: string
  description?: string
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
  key?: string
  display_name?: string
  description?: string
  columns_json?: ColumnDefinition[]
  publish_state?: PublishState
  deploy_state?: DeployState
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
  targetKind?: RelationTargetKind
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

export interface CustomDataSuggestionConversationMessage {
  role: 'user' | 'assistant'
  content: string
  proposal?: EntitySchemaProposal
}

export interface CustomDataSuggestionRequest {
  description: string
  sessionId?: string
  conversationHistory?: CustomDataSuggestionConversationMessage[]
}

export type CustomDataSuggestionStage = 'planning' | 'repairing' | 'preflight_failed' | 'proposal_ready'
export type CustomDataSuggestionStageStatus = 'running' | 'complete' | 'failed'

export interface CustomDataSuggestionStreamEvent {
  type: 'started' | 'thinking' | 'stage' | 'response' | 'done' | 'error'
  content?: string
  stage?: CustomDataSuggestionStage
  stageStatus?: CustomDataSuggestionStageStatus
  stageData?: Record<string, unknown>
  proposal?: EntitySchemaProposal
}

export interface CustomDataSuggestionApplyResult {
  success: boolean
  namespace: string
  createdEntityKeys: string[]
  updatedEntityKeys: string[]
  deletedEntityKeys: string[]
  downgradedEntityKeys: string[]
  proposal: EntitySchemaProposal
}

export interface NamespacePromotionEntityStatus {
  entityKey: string
  definitionId: string
  deployed: boolean
  promoted: boolean
  skipped: boolean
  tableName?: string
  error?: string
}

export interface NamespacePromotionRelationshipStatus {
  sourceEntity: string
  targetEntity: string
  targetKind: 'CUSTOM_ENTITY' | 'INTERNAL_ENTITY'
  foreignKeyColumn: string
  created: boolean
  skipped: boolean
  error?: string
}

export interface NamespacePromotionResult {
  success: boolean
  namespace: string
  entityOrder: string[]
  entities: NamespacePromotionEntityStatus[]
  relationships: NamespacePromotionRelationshipStatus[]
  promotedEntityCount: number
  failedEntityCount: number
  skippedEntityCount: number
  createdRelationshipCount: number
  failedRelationshipCount: number
  skippedRelationshipCount: number
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

export interface RowMutationResult {
  success: boolean
  resultData?: Record<string, unknown>
  error?: string
}
