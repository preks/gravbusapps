/**
 * Entity Data Source Types
 *
 * Defines types for connecting spreadsheet sheets to NEWWORK system entities.
 * Allows loading real data from entities like Accounts, Leads, Contacts, etc.
 * with configurable filters and field mappings.
 */

/**
 * Supported filter operators for entity queries
 */
export type EntityFilterOperator =
  | 'eq' // Equal
  | 'neq' // Not equal
  | 'gt' // Greater than
  | 'gte' // Greater than or equal
  | 'lt' // Less than
  | 'lte' // Less than or equal
  | 'in' // In array
  | 'nin' // Not in array
  | 'like' // Case-sensitive pattern match
  | 'ilike' // Case-insensitive pattern match
  | 'isNull' // Is null
  | 'isNotNull' // Is not null
  | 'contains' // For JSON fields

/**
 * A single filter condition for entity queries
 */
export interface EntityFilterCondition {
  /** Unique ID for this filter */
  id: string
  /** Field path to filter on (e.g., 'status', 'ownerEmployee.displayName') */
  field: string
  /** Display name of the field for UI */
  fieldLabel: string
  /** The operator to use for comparison */
  operator: EntityFilterOperator
  /** The value to compare against (can be array for 'in'/'nin') */
  value: unknown
  /** Whether this filter is currently active */
  isActive: boolean
}

/**
 * Logical grouping of filter conditions
 */
export interface EntityFilterGroup {
  /** Unique ID for this group */
  id: string
  /** Logical operator to combine conditions */
  logic: 'AND' | 'OR'
  /** Conditions in this group */
  conditions: EntityFilterCondition[]
  /** Nested groups for complex queries */
  groups?: EntityFilterGroup[]
}

/**
 * Sort direction for entity queries
 */
export type EntitySortDirection =
  | 'ASC'
  | 'DESC'
  | 'ASC_NULLS_FIRST'
  | 'ASC_NULLS_LAST'
  | 'DESC_NULLS_FIRST'
  | 'DESC_NULLS_LAST'

/**
 * Sort configuration for entity queries
 */
export interface EntitySortConfig {
  /** Field path to sort by */
  field: string
  /** Sort direction */
  direction: EntitySortDirection
}

/**
 * Field mapping from entity field to spreadsheet column
 */
export interface EntityFieldMapping {
  /** Entity field path (e.g., 'name', 'ownerEmployee.displayName') */
  entityField: string
  /** Entity field display name */
  entityFieldLabel: string
  /** Entity field type */
  entityFieldType: 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'email' | 'reference' | 'catalog'
  /** Spreadsheet column ID (null if not mapped) */
  columnId: string | null
  /** Whether to include this field in the data */
  include: boolean
}

/**
 * Refresh mode for entity data
 */
export type EntityRefreshMode =
  | 'manual' // Only refresh when user clicks refresh
  | 'onOpen' // Refresh when sheet is opened
  | 'periodic' // Refresh at specified interval
  | 'realtime' // Subscribe to changes (if supported)

/**
 * Main entity data source configuration for a sheet
 */
export interface EntityDataSource {
  /** Unique ID for this data source */
  id: string
  /** Whether this data source is enabled */
  enabled: boolean
  /** Entity type (e.g., 'Account', 'Lead', 'Contact', 'Opportunity') */
  entityType: string
  /** Display name of the entity type */
  entityDisplayName: string
  /** Icon for the entity type */
  entityIcon?: string

  /** Filter configuration */
  filters: EntityFilterGroup

  /** Sort configuration */
  orderBy: EntitySortConfig[]

  /** Maximum number of records to load (0 = no limit) */
  limit: number

  /** Field mappings from entity to columns */
  fieldMappings: EntityFieldMapping[]

  /** Data refresh settings */
  refreshMode: EntityRefreshMode
  /** Refresh interval in seconds (for periodic mode) */
  refreshInterval?: number

  /** Last sync timestamp */
  lastSyncAt?: string
  /** Last sync record count */
  lastSyncCount?: number
  /** Last sync error if any */
  lastSyncError?: string

  /** Whether to append data or replace */
  syncMode: 'replace' | 'append' | 'merge'
  /** For merge mode: field to use as unique identifier */
  mergeKey?: string
}

/**
 * Entity schema information (from flow engine API)
 */
export interface AvailableEntity {
  /** Entity type key (e.g., 'account', 'lead') */
  type: string
  /** Human-readable display name */
  displayName: string
  /** Entity description */
  description: string
  /** Icon name */
  icon?: string
  /** Category for grouping (e.g., 'CRM', 'HR', 'Finance') */
  category?: string
  /** Available fields for this entity */
  fields: EntityField[]
  /** Example ID for testing */
  exampleId?: string
}

/**
 * Field information for an entity
 */
export interface EntityField {
  /** Field name/path */
  name: string
  /** Display name */
  displayName: string
  /** Field type */
  type:
    | 'string'
    | 'number'
    | 'boolean'
    | 'date'
    | 'datetime'
    | 'email'
    | 'url'
    | 'reference'
    | 'catalog'
    | 'array'
    | 'object'
  /** Description */
  description?: string
  /** Whether field is required */
  required?: boolean
  /** For reference fields: the referenced entity type */
  referencedEntity?: string
  /** For catalog fields: the catalog name */
  catalogName?: string
  /** Icon for this field */
  icon?: string
  /** Category for grouping */
  category?: string
  /** Nested fields for object/array types */
  fields?: EntityField[]
}

/**
 * Result from loading entity data
 */
export interface EntityDataResult {
  /** Successfully loaded records */
  records: Record<string, unknown>[]
  /** Total count available (may be more than loaded) */
  total: number
  /** Number of records loaded */
  count: number
  /** Pagination info */
  hasMore: boolean
  /** Entity type */
  entityType: string
  /** Timestamp when data was fetched */
  fetchedAt: string
  /** Any error message */
  error?: string
}

/**
 * State for entity data loading
 */
export interface EntityDataLoadState {
  /** Whether data is currently loading */
  isLoading: boolean
  /** Whether data has been loaded at least once */
  isLoaded: boolean
  /** Current data */
  data: EntityDataResult | null
  /** Error if loading failed */
  error: string | null
  /** Progress (for large datasets) */
  progress?: number
}

/**
 * Quick filter presets for common use cases
 */
export interface EntityFilterPreset {
  /** Preset ID */
  id: string
  /** Display name */
  name: string
  /** Description */
  description: string
  /** The filter configuration */
  filter: EntityFilterGroup
  /** Entity types this preset applies to */
  entityTypes: string[]
  /** Icon */
  icon?: string
}

/**
 * Common filter presets
 */
export const COMMON_FILTER_PRESETS: EntityFilterPreset[] = [
  {
    id: 'active-only',
    name: 'Active Records Only',
    description: 'Exclude deleted and inactive records',
    entityTypes: ['*'],
    icon: 'check-circle',
    filter: {
      id: 'preset-active',
      logic: 'AND',
      conditions: [
        {
          id: 'cond-not-deleted',
          field: 'isDeleted',
          fieldLabel: 'Is Deleted',
          operator: 'eq',
          value: false,
          isActive: true
        }
      ]
    }
  },
  {
    id: 'my-records',
    name: 'My Records',
    description: 'Records owned by current user',
    entityTypes: ['Account', 'Lead', 'Contact', 'Opportunity'],
    icon: 'user',
    filter: {
      id: 'preset-my-records',
      logic: 'AND',
      conditions: [
        {
          id: 'cond-owner',
          field: 'ownerEmployeeId',
          fieldLabel: 'Owner',
          operator: 'eq',
          value: '{{currentUserId}}',
          isActive: true
        }
      ]
    }
  },
  {
    id: 'created-this-month',
    name: 'Created This Month',
    description: 'Records created in the current month',
    entityTypes: ['*'],
    icon: 'calendar',
    filter: {
      id: 'preset-this-month',
      logic: 'AND',
      conditions: [
        {
          id: 'cond-created',
          field: 'createdAt',
          fieldLabel: 'Created At',
          operator: 'gte',
          value: '{{startOfMonth}}',
          isActive: true
        }
      ]
    }
  }
]

/**
 * Default entity data source configuration
 */
export const DEFAULT_ENTITY_DATA_SOURCE: Omit<EntityDataSource, 'id' | 'entityType' | 'entityDisplayName'> = {
  enabled: true,
  filters: {
    id: 'root',
    logic: 'AND',
    conditions: [
      {
        id: 'default-not-deleted',
        field: 'isDeleted',
        fieldLabel: 'Is Deleted',
        operator: 'eq',
        value: false,
        isActive: true
      }
    ]
  },
  orderBy: [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }],
  limit: 100,
  fieldMappings: [],
  refreshMode: 'onOpen',
  syncMode: 'replace'
}

/**
 * Helper to create a new filter condition
 */
export function createFilterCondition(
  field: string,
  fieldLabel: string,
  operator: EntityFilterOperator = 'eq',
  value: unknown = null
): EntityFilterCondition {
  return {
    id: `cond_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    field,
    fieldLabel,
    operator,
    value,
    isActive: true
  }
}

/**
 * Helper to create a new filter group
 */
export function createFilterGroup(logic: 'AND' | 'OR' = 'AND'): EntityFilterGroup {
  return {
    id: `group_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    logic,
    conditions: []
  }
}

/**
 * Helper to create a new entity data source
 */
export function createEntityDataSource(
  entityType: string,
  entityDisplayName: string,
  entityIcon?: string
): EntityDataSource {
  return {
    id: `eds_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    entityType,
    entityDisplayName,
    entityIcon,
    ...DEFAULT_ENTITY_DATA_SOURCE
  }
}
