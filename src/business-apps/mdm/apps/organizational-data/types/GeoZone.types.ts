import { z } from 'zod'

// ─── Form Validation Schema ─────────────────────────────────────────────────

export const geoZoneFormSchema = z.object({
  name: z.string().min(1, 'Geo zone name is required'),
  code: z.string().min(1, 'Code is required'),
  description: z.string().optional()
})

export type GeoZoneFormValues = z.infer<typeof geoZoneFormSchema>

// ─── Base Types ──────────────────────────────────────────────────────────────

export interface GeoZone {
  id: string
  name: string
  code: string
  description?: string | null
  isActive: boolean
  version: number
}

// ─── Mutation Types ──────────────────────────────────────────────────────────

export interface GeoZoneMutationPayload {
  id?: string
  name: string
  code: string
  description?: string | null
  structureId: string
  version?: number | null
}

export interface GeoZoneDeletionPayload {
  changeMode: 'DELETE'
  geoZone: {
    id: string
    version?: number | null
  }
}

// ─── Response Types ──────────────────────────────────────────────────────────

export interface GetGeoZonesResponse {
  geoZones: GeoZone[]
  GeoZoneAggregate: {
    aggregate: {
      count: number
    }
  }
}

// ─── Filter Types ────────────────────────────────────────────────────────────

export interface GeoZoneFilters {
  structureId?: string
  search?: string
}

// ─── Transform Functions ─────────────────────────────────────────────────────

export const transformGeoZoneRow = (row: any): GeoZone => ({
  ...row,
  description: row.description ?? '',
  isActive: true
})

export const normalizeDescription = (description: string | null | undefined): string => {
  return description ?? ''
}

export const denormalizeDescription = (description: string): string | null => {
  return description.trim() === '' ? null : description
}
