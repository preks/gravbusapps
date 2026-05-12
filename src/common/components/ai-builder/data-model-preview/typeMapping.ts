/**
 * Utilities for mapping GraphQL schema types to DataModelPreview column types
 */

import type { DataModelPreviewColumn } from './dataModelPreviewTypes'

/**
 * Maps GraphQL scalar types to preview column types
 */
export function mapGraphQLTypeToColumnType(graphqlType: string): string {
  const typeMap: Record<string, string> = {
    String: 'TEXT',
    Int: 'NUMBER',
    Float: 'NUMBER',
    Boolean: 'CHECKBOX',
    Date: 'DATE',
    DateTime: 'DATETIME',
    Timestamp: 'DATETIME',
    timestamptz: 'DATETIME',
    date: 'DATE',
    timestamp: 'DATETIME',
    numeric: 'NUMBER',
    int4: 'NUMBER',
    int8: 'NUMBER',
    float8: 'NUMBER',
    bool: 'CHECKBOX',
    text: 'TEXT',
    varchar: 'TEXT'
  }

  return typeMap[graphqlType] || 'TEXT'
}

/**
 * Enriches column definitions with types from GraphQL schema introspection
 */
export function enrichColumnsWithSchemaTypes(
  columns: DataModelPreviewColumn[],
  schemaTypes: Record<string, string>
): DataModelPreviewColumn[] {
  return columns.map(col => {
    const schemaType = schemaTypes[col.fieldName]
    const mappedType = schemaType ? mapGraphQLTypeToColumnType(schemaType) : col.type || 'TEXT'

    // If GraphQL introspection returns a generic "String" type, but the original
    // column definition has a more specific type (DATE, DATETIME, etc.), preserve it
    const preservedTypes = ['DATE', 'DATETIME', 'SELECT', 'REFERENCE']
    const shouldPreserveOriginal = mappedType === 'TEXT' && col.type && preservedTypes.includes(col.type)

    return {
      ...col,
      type: shouldPreserveOriginal ? col.type : mappedType
    }
  })
}
