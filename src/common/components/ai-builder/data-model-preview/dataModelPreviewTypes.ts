/** Minimal type for data model preview. Callers (orchestrator, demo) map from CustomDataDefinition or mock. */
export interface DataModelPreviewColumn {
  name: string
  label: string
  type: string
  required?: boolean
}

export interface DataModelPreviewDefinition {
  key: string
  namespace: string
  display_name?: string
  description?: string
  columns: DataModelPreviewColumn[]
}
