import { normalizeString, normalizeNumber } from '@/business-apps/mdm/utils/normalizationUtils.ts'

// ─── Row shape returned by Hasura ────────────────────────────────────────────

export interface CompensationBandRow {
  id: string
  name: string
  description: string | null
  currencyRef: string | null
  minSalary: number | null
  maxSalary: number | null
  version: number | null
}

// ─── Simplified domain type ───────────────────────────────────────────────────

export interface CompensationBand {
  id: string
  name: string
  description?: string
  currencyRef: string | null
  currencyCode: string
  minSalary: number
  maxSalary: number
  standardSalary: number
  isActive: boolean
  version: number | null
}

// ─── Mutation types ────────────────────────────────────────────────────────────

export interface CompensationBandMutation {
  id?: string
  name: string
  description?: string
  currencyRef?: string | null
  minSalary: number
  maxSalary: number
  version?: number | null
}

export interface CompensationBandMutationPayload {
  changeMode: 'INSERT'
  compensationBand: CompensationBandMutation
}

export interface CompensationBandDeletionPayload {
  changeMode: 'DELETE'
  compensationBand: {
    id: string
    version?: number | null
  }
}

// ─── Response types ───────────────────────────────────────────────────────────

export interface GetCompensationBandsResponse {
  compensationBands: CompensationBandRow[]
  CompensationBandAggregate: {
    aggregate: {
      count: number
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const extractCurrencyCode = (currencyRef: string | null): string => {
  if (!currencyRef) return 'EUR'
  // Handle "Currency:v1:EUR" format
  const parts = currencyRef.split(':')
  return parts[parts.length - 1] || 'EUR'
}

// ─── Transform ────────────────────────────────────────────────────────────────

export const transformCompensationBandRow = (row: CompensationBandRow): CompensationBand => {
  const minSalary = normalizeNumber(row.minSalary)
  const maxSalary = normalizeNumber(row.maxSalary)

  return {
    ...row,
    description: normalizeString(row.description),
    minSalary,
    maxSalary,
    currencyCode: extractCurrencyCode(row.currencyRef),
    standardSalary: (minSalary + maxSalary) / 2,
    isActive: true
  }
}
