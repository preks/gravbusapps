/** Minimal type for data model preview. Callers (orchestrator, demo) map from CustomDataDefinition or mock. */
export interface DataModelPreviewColumn {
  name: string
  label: string
  /** TEXT | NUMBER | DATE | DATETIME | CHECKBOX | SELECT | REFERENCE */
  type: string
  required?: boolean
  options?: { value: string; label: string }[]
  dataSource?: {
    type: string
    entity?: string
  }
}

export interface DataModelPreviewDefinition {
  key: string
  namespace: string
  display_name?: string
  description?: string
  columns: DataModelPreviewColumn[]
  /**
   * 'entity' data is stored in custom-data/graphql and can be fetched/mutated.
   * 'catalog' data lives in catalog-manager and is read-only reference data.
   * Defaults to 'entity' when omitted.
   */
  modelType?: 'entity' | 'catalog'
}
