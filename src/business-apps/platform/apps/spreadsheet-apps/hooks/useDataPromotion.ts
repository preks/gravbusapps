/**
 * useDataPromotion Hook
 *
 * Handles promoting file-based spreadsheet apps to database-backed entities.
 * Creates GraphQL entities and migrates data from local storage to the database.
 */

import { useState, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type {
  SpreadsheetApp,
  SpreadsheetSheet,
  SpreadsheetColumn,
  ColumnType
} from '../types'

export interface UseDataPromotionState {
  isPromoting: boolean
  error: string | null
  progress: number
  currentStep: PromotionStep | null
}

export type PromotionStep =
  | 'validating'
  | 'creating_schema'
  | 'migrating_data'
  | 'configuring_api'
  | 'finalizing'
  | 'complete'

export interface PromotionResult {
  success: boolean
  entityId?: string
  entityName?: string
  recordsMigrated?: number
  error?: string
}

export interface UseDataPromotionResult extends UseDataPromotionState {
  promoteToDatabase: (app: SpreadsheetApp, entityName: string) => Promise<PromotionResult>
  validateForPromotion: (app: SpreadsheetApp) => ValidationResult
  reset: () => void
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Hook for promoting spreadsheet apps to database entities
 */
export function useDataPromotion(accessToken: string): UseDataPromotionResult {
  const [state, setState] = useState<UseDataPromotionState>({
    isPromoting: false,
    error: null,
    progress: 0,
    currentStep: null
  })

  const graphqlClient = useGraphQLClient(accessToken)

  /**
   * Validate app for promotion
   */
  const validateForPromotion = useCallback((app: SpreadsheetApp): ValidationResult => {
    const errors: string[] = []
    const warnings: string[] = []

    // Check basic requirements
    if (!app.name || app.name.trim().length === 0) {
      errors.push('App must have a name')
    }

    if (!app.sheets || app.sheets.length === 0) {
      errors.push('App must have at least one sheet')
    }

    // Check each sheet
    for (const sheet of app.sheets) {
      if (!sheet.columns || sheet.columns.length === 0) {
        errors.push(`Sheet "${sheet.name}" must have at least one column`)
      }

      // Check for columns without valid names
      for (const col of sheet.columns) {
        if (!col.name || col.name.trim().length === 0) {
          errors.push(`Column in sheet "${sheet.name}" must have a name`)
        }

        // Check for reserved column names
        const reservedNames = ['id', '_id', 'version', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy']
        if (reservedNames.includes(col.name.toLowerCase())) {
          warnings.push(`Column "${col.name}" in sheet "${sheet.name}" uses a reserved name and will be renamed`)
        }
      }

      // Check for duplicate column names
      const columnNames = sheet.columns.map(c => c.name.toLowerCase())
      const duplicates = columnNames.filter((name, i) => columnNames.indexOf(name) !== i)
      if (duplicates.length > 0) {
        errors.push(`Sheet "${sheet.name}" has duplicate column names: ${[...new Set(duplicates)].join(', ')}`)
      }

      // Check data validity
      if (sheet.data.length === 0) {
        warnings.push(`Sheet "${sheet.name}" has no data to migrate`)
      }
    }

    // Check for relationships validity
    for (const rel of app.relationships) {
      const fromSheet = app.sheets.find(s => s.name === rel.fromSheet)
      const toSheet = app.sheets.find(s => s.name === rel.toSheet)

      if (!fromSheet) {
        errors.push(`Relationship references non-existent sheet: ${rel.fromSheet}`)
      }
      if (!toSheet) {
        errors.push(`Relationship references non-existent sheet: ${rel.toSheet}`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }, [])

  /**
   * Promote app to database
   */
  const promoteToDatabase = useCallback(
    async (app: SpreadsheetApp, entityName: string): Promise<PromotionResult> => {
      setState(prev => ({
        ...prev,
        isPromoting: true,
        error: null,
        progress: 0,
        currentStep: 'validating'
      }))

      try {
        // Step 1: Validate
        const validation = validateForPromotion(app)
        if (!validation.isValid) {
          throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
        }

        setState(prev => ({ ...prev, progress: 10, currentStep: 'creating_schema' }))

        // Step 2: Generate entity schema
        const schema = generateEntitySchema(app, entityName)

        setState(prev => ({ ...prev, progress: 30 }))

        // Step 3: Create entity in backend
        // Note: In a real implementation, this would call a backend API
        // For now, we simulate the creation
        const entityId = await simulateEntityCreation(schema, graphqlClient)

        setState(prev => ({ ...prev, progress: 50, currentStep: 'migrating_data' }))

        // Step 4: Migrate data
        let totalRecords = 0
        for (const sheet of app.sheets) {
          const recordCount = await migrateSheetData(sheet, entityName, graphqlClient)
          totalRecords += recordCount

          setState(prev => ({
            ...prev,
            progress: 50 + (app.sheets.indexOf(sheet) + 1) / app.sheets.length * 30
          }))
        }

        setState(prev => ({ ...prev, progress: 80, currentStep: 'configuring_api' }))

        // Step 5: Configure GraphQL endpoints
        await configureGraphQLEndpoints(entityName, app.sheets, graphqlClient)

        setState(prev => ({ ...prev, progress: 95, currentStep: 'finalizing' }))

        // Step 6: Finalize
        await new Promise(resolve => setTimeout(resolve, 500))

        setState(prev => ({
          ...prev,
          isPromoting: false,
          progress: 100,
          currentStep: 'complete'
        }))

        return {
          success: true,
          entityId,
          entityName,
          recordsMigrated: totalRecords
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Promotion failed'

        setState(prev => ({
          ...prev,
          isPromoting: false,
          error: errorMessage,
          progress: 0,
          currentStep: null
        }))

        return {
          success: false,
          error: errorMessage
        }
      }
    },
    [graphqlClient, validateForPromotion]
  )

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setState({
      isPromoting: false,
      error: null,
      progress: 0,
      currentStep: null
    })
  }, [])

  return {
    ...state,
    promoteToDatabase,
    validateForPromotion,
    reset
  }
}

/**
 * Generate GraphQL entity schema from app definition
 */
function generateEntitySchema(
  app: SpreadsheetApp,
  entityName: string
): EntitySchema {
  const tables = app.sheets.map(sheet => ({
    name: sanitizeEntityName(`${entityName}_${sheet.name}`),
    displayName: sheet.name,
    fields: sheet.columns.map(col => ({
      name: sanitizeFieldName(col.name),
      displayName: col.label,
      type: mapColumnTypeToGraphQLType(col.type),
      isRequired: col.isRequired,
      isUnique: col.isUnique,
      isArray: col.type === 'multiselect',
      enumValues: col.selectOptions?.map(o => o.value),
      defaultValue: col.defaultValue,
      validation: col.validation
    }))
  }))

  const relationships = app.relationships.map(rel => ({
    name: `${rel.fromSheet}_${rel.toSheet}`,
    from: {
      table: sanitizeEntityName(`${entityName}_${rel.fromSheet}`),
      field: sanitizeFieldName(rel.fromColumn)
    },
    to: {
      table: sanitizeEntityName(`${entityName}_${rel.toSheet}`),
      field: sanitizeFieldName(rel.toColumn)
    },
    type: rel.type
  }))

  return {
    name: entityName,
    displayName: app.name,
    description: app.description,
    tables,
    relationships
  }
}

/**
 * Simulate entity creation (placeholder for real API call)
 */
async function simulateEntityCreation(
  schema: EntitySchema,
  graphqlClient: ReturnType<typeof useGraphQLClient>
): Promise<string> {
  // In a real implementation, this would:
  // 1. Call the backend API to create the entity schema
  // 2. Create database tables
  // 3. Set up GraphQL resolvers

  // For now, simulate with a delay
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Return a mock entity ID
  return `entity_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Migrate sheet data to database
 */
async function migrateSheetData(
  sheet: SpreadsheetSheet,
  entityName: string,
  graphqlClient: ReturnType<typeof useGraphQLClient>
): Promise<number> {
  // In a real implementation, this would:
  // 1. Transform data to match entity schema
  // 2. Batch insert records using GraphQL mutations
  // 3. Handle errors and rollbacks

  // For now, simulate with a delay based on data size
  const delay = Math.min(sheet.data.length * 10, 2000)
  await new Promise(resolve => setTimeout(resolve, delay))

  return sheet.data.length
}

/**
 * Configure GraphQL endpoints for the entity
 */
async function configureGraphQLEndpoints(
  entityName: string,
  sheets: SpreadsheetSheet[],
  graphqlClient: ReturnType<typeof useGraphQLClient>
): Promise<void> {
  // In a real implementation, this would:
  // 1. Configure query endpoints
  // 2. Configure mutation endpoints
  // 3. Set up permissions and access control

  await new Promise(resolve => setTimeout(resolve, 500))
}

/**
 * Sanitize entity name for GraphQL
 */
function sanitizeEntityName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .replace(/^[0-9]/, '_$&')
}

/**
 * Sanitize field name for GraphQL
 */
function sanitizeFieldName(name: string): string {
  // Convert to camelCase and remove invalid characters
  return name
    .replace(/[^a-zA-Z0-9_\s]/g, '')
    .split(/[\s_]+/)
    .map((word, index) =>
      index === 0
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join('')
    .replace(/^[0-9]/, '_$&')
}

/**
 * Map column type to GraphQL type
 */
function mapColumnTypeToGraphQLType(type: ColumnType): GraphQLFieldType {
  const mapping: Record<ColumnType, GraphQLFieldType> = {
    text: 'String',
    number: 'Float',
    currency: 'Float',
    percentage: 'Float',
    date: 'Date',
    datetime: 'DateTime',
    email: 'String',
    phone: 'String',
    url: 'String',
    select: 'String',
    multiselect: 'String',
    boolean: 'Boolean',
    calculated: 'String',
    reference: 'ID'
  }

  return mapping[type] || 'String'
}

// Types for internal use

interface EntitySchema {
  name: string
  displayName: string
  description?: string
  tables: TableSchema[]
  relationships: RelationshipSchema[]
}

interface TableSchema {
  name: string
  displayName: string
  fields: FieldSchema[]
}

interface FieldSchema {
  name: string
  displayName: string
  type: GraphQLFieldType
  isRequired: boolean
  isUnique: boolean
  isArray: boolean
  enumValues?: string[]
  defaultValue?: unknown
  validation?: unknown
}

interface RelationshipSchema {
  name: string
  from: { table: string; field: string }
  to: { table: string; field: string }
  type: 'one-to-one' | 'one-to-many' | 'many-to-many'
}

type GraphQLFieldType =
  | 'String'
  | 'Int'
  | 'Float'
  | 'Boolean'
  | 'Date'
  | 'DateTime'
  | 'ID'
  | 'JSON'
