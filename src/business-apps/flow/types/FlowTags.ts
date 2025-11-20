/**
 * Flow Tags System for metadata-based querying
 * Enables key:value tagging for flows to support filtering like solution:compliance
 */

export interface FlowTag {
  key: string
  value: string
}

export interface FlowTags {
  app?: string
  serviceCategory?: string
  digitalWorkplaceCategory?: string
  [key: string]: string | undefined
}
