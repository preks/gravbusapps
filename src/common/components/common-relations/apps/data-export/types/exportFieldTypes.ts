import { isExternalIdField } from '../utils/exportFieldPartition'

export interface ExportFormatContext {
  locale?: string
}

export type ExportIdKind = 'external'

export interface ExportFieldMetadata {
  key: string
  label: string
  formKeys: string[]
  defaultSelected: boolean
  isDateColumn?: boolean
  /** Optional business/integration identifiers — never selected by default; chosen via export dialog. */
  exportIdKind?: ExportIdKind
}

export interface ExportFieldDefinition<TEntity = unknown> extends ExportFieldMetadata {
  format: (entity: TEntity, ctx?: ExportFormatContext) => string
}

export interface ExportColumnDef {
  key: string
  title: string
}

export function toExportColumns(fields: ExportFieldMetadata[]): ExportColumnDef[] {
  return fields.map(field => ({ key: field.key, title: field.label }))
}

export function getDefaultSelectedFieldKeys(fields: ExportFieldMetadata[]): string[] {
  return fields.filter(field => field.defaultSelected && !isExternalIdField(field)).map(field => field.key)
}

export function resolveExportFields<TEntity>(
  allFields: ExportFieldDefinition<TEntity>[],
  selectedKeys: string[]
): ExportFieldDefinition<TEntity>[] {
  const selectedSet = new Set(selectedKeys)
  return allFields.filter(field => selectedSet.has(field.key))
}

export function formatEntityForExport<TEntity>(
  entity: TEntity,
  fields: ExportFieldDefinition<TEntity>[],
  ctx?: ExportFormatContext
): Record<string, string> {
  const row: Record<string, string> = {}
  for (const field of fields) {
    row[field.key] = field.format(entity, ctx)
  }
  return row
}

export function getDateColumnKeys(fields: ExportFieldMetadata[]): Set<string> {
  return new Set(fields.filter(field => field.isDateColumn).map(field => field.key))
}
