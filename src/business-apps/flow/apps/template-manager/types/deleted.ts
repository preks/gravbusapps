/**
 * Types for deleted (soft-deleted) templates
 */

export interface DeletedTemplate {
  templateId: string
  name: string
  version: number
  deletedAt: string
  deletedBy: string
  deletionReason: string
}

export interface DeletedTemplatesResponse {
  status: string
  data: DeletedTemplate[]
  count: number
  totalCount?: number
  hasMore?: boolean
}
