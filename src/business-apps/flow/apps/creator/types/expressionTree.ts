/**
 * Entity group filter for hierarchical navigation
 */
export interface EntityGroupFilter {
  field: string
  operator: string
  value: any
}

/**
 * Tree node representing a data field or container in the expression builder
 */
export interface TreeNode {
  id: string
  label: string
  type:
    | 'workflow'
    | 'steps'
    | 'step'
    | 'field'
    | 'container'
    | 'category'
    | 'entities'
    | 'entity'
    | 'entity-group'
    | 'entity-browser'
    | 'entity-instance'
    | 'entity-field'
    | 'catalog'
    | 'catalog-container'
    | 'catalog-field'
    | 'catalog-browser'
    | 'catalog-entry'
    | 'info'
  icon?: string
  dataType?: 'string' | 'number' | 'date' | 'datetime' | 'boolean' | 'object' | 'array'
  path?: string[]
  expressionPath?: string
  description?: string
  children?: TreeNode[]
  isExpanded?: boolean
  metadata?: {
    stepIndex?: number
    isCurrent?: boolean
    entityType?: string
    catalogId?: string
    version?: string
    required?: boolean
    totalCount?: number
    loadingState?: 'idle' | 'loading' | 'loaded' | 'error'
    entryId?: string
    offset?: number
    hasMore?: boolean
    search?: string
    // Entity group navigation
    groupKey?: string
    groupDisplayName?: string
    groupFilters?: EntityGroupFilter[]
    depth?: number
    entityCode?: string
    entityTypeValue?: string
    inputType?: string
    // Data source metadata for form fields
    dataSourceType?: 'CATALOG' | 'ENTITY' | 'API'
    dataSourceEntity?: string
    dataSourceCatalog?: string
    labelField?: string
    valueField?: string
  }
  // For catalog-specific nodes
  expressionTemplate?: string // Template like {{$catalog.asset-management[ID_HERE].name}}
}

/**
 * Search filter for tree nodes
 */
export interface TreeSearchFilter {
  query: string
  types?: TreeNode['type'][]
}
