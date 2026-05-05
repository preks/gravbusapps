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
    | 'orgchart'
    | 'orgchart-category'
    | 'orgchart-relation'
    | 'orgchart-field'
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
    groupKey?: string
    groupDisplayName?: string
    groupFilters?: EntityGroupFilter[]
    depth?: number
    entityCode?: string
    entityTypeValue?: string
    inputType?: string
    dataSourceType?: 'CATALOG' | 'CUSTOM_ENTITY' | 'INTERNAL_ENTITY' | 'API'
    dataSourceEntity?: string
    dataSourceCatalog?: string
    labelField?: string
    valueField?: string
    relationType?:
      | 'manager'
      | 'skipLevelManager'
      | 'directReports'
      | 'managerByUserId'
      | 'skipLevelManagerByUserId'
      | 'directReportsByUserId'
    idSourceType?: 'static' | 'workflow' | 'step' | 'expression'
    employeeIdOrUserId?: string
    isArrayReturn?: boolean
  }
  expressionTemplate?: string
}

/**
 * Search filter for tree nodes
 */
export interface TreeSearchFilter {
  query: string
  types?: TreeNode['type'][]
}
