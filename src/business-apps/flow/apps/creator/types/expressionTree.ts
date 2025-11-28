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
    | 'catalog'
    | 'catalog-container'
    | 'catalog-field'
    | 'catalog-browser'
    | 'catalog-entry'
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
    catalogId?: string
    version?: string
    required?: boolean
    totalCount?: number
    loadingState?: 'idle' | 'loading' | 'loaded' | 'error'
    entryId?: string
    offset?: number
    hasMore?: boolean
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
