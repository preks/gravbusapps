import type { ExportFieldDefinition, ExportFieldMetadata } from '../types/exportFieldTypes'

export function isExternalIdField(field: ExportFieldMetadata): boolean {
  return field.exportIdKind === 'external'
}

export function partitionExportFields<TEntity>(fields: ExportFieldDefinition<TEntity>[]) {
  const regularFields: ExportFieldDefinition<TEntity>[] = []
  const externalIdFields: ExportFieldDefinition<TEntity>[] = []

  for (const field of fields) {
    if (isExternalIdField(field)) {
      externalIdFields.push(field)
    } else {
      regularFields.push(field)
    }
  }

  return { regularFields, externalIdFields }
}
