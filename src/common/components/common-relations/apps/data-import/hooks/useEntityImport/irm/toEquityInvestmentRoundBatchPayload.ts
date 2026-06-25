import type { ImportConfig } from '@/common/components/common-relations/apps/data-import/types'
import { nestFlatDottedKeys, normalizeEntityForImport, stripEmptyValues, toRecordObject } from '../shared'

/**
 * Whitelist of fields the backend `EquityInvestmentRound` model expects.
 * Anything else extracted from the file is dropped during request assembly
 * so unexpected source columns never reach the Java endpoint.
 */
const EQUITY_INVESTMENT_ROUND_FIELDS = [
  'id',
  'version',
  'businessKey',
  'recordState',
  'activeTo',
  'additionalProperties',
  'name',
  'year',
  'preValue',
  'investmentVolume',
  'volumeShare',
  'roundSharePercentage',
  'currencyRef',
  // Both forms are accepted on input. `equityInvestmentId` is what the schema
  // exposes (and therefore what the FE/Flowbot extract pipeline emits),
  // `equityInvestment` is what the create-round Java endpoint expects; the
  // payload builder collapses the former onto the latter below.
  'equityInvestment',
  'equityInvestmentId',
  'investmentOpportunity',
  'investmentOpportunityId'
] as const

const YEAR_ONLY_RE = /^\d{4}$/

const NUMERIC_FIELDS: ReadonlyArray<keyof EquityInvestmentRoundFields> = [
  'preValue',
  'investmentVolume',
  'volumeShare',
  'roundSharePercentage'
]

type EquityInvestmentRoundFields = Partial<Record<(typeof EQUITY_INVESTMENT_ROUND_FIELDS)[number], unknown>>

function pickFields(source: Record<string, any>, fields: readonly string[]): Record<string, any> {
  const result: Record<string, any> = {}
  for (const field of fields) {
    if (source[field] !== undefined) {
      result[field] = source[field]
    }
  }
  return result
}

/**
 * The create-round form stores `year` as ISO `YYYY-01-01T00:00:00.000Z`.
 * Files may carry a bare year (e.g. `"2025"`) or a full ISO string; coerce
 * the former so the backend always receives the canonical shape.
 */
function normalizeYearValue(value: unknown): unknown {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `${Math.trunc(value)}-01-01T00:00:00.000Z`
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return undefined
    return YEAR_ONLY_RE.test(trimmed) ? `${trimmed}-01-01T00:00:00.000Z` : trimmed
  }
  return value
}

/**
 * Numeric round fields may arrive as raw strings from CSV (e.g. `"1.5"`).
 * The Java endpoint expects JSON numbers, so coerce eagerly and drop
 * values that don't parse rather than letting them blow up server-side.
 */
function coerceNumericField(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (typeof value === 'string') {
    const parsed = Number(value.trim())
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

function resolveEquityInvestmentRef(record: Record<string, any>, round: Record<string, any>): unknown {
  // Preferred shape — Flowbot resolves `Investment.name → Investment.id →
  // EquityInvestment.id` and writes the subtype id under this key.
  if (typeof round.equityInvestment === 'string' && round.equityInvestment) return round.equityInvestment
  // Schema-FK form (`equityInvestmentId`) is what the GraphQL extract
  // pipeline produces when the column is mapped via the FE.
  if (typeof round.equityInvestmentId === 'string' && round.equityInvestmentId) return round.equityInvestmentId
  // Backwards-compatible aliases in case Flowbot wrote the value at the root
  // (depending on which mapping target survived the analyze step).
  if (typeof record.equityInvestment === 'string' && record.equityInvestment) return record.equityInvestment
  if (typeof record.equityInvestmentId === 'string' && record.equityInvestmentId) return record.equityInvestmentId
  if (typeof record.investment === 'string' && record.investment) return record.investment
  if (typeof record.investmentId === 'string' && record.investmentId) return record.investmentId
  return undefined
}

function normalizeEquityInvestmentRound(record: Record<string, any>): Record<string, any> {
  const nestedRound = toRecordObject(record.equityInvestmentRound)
  const round: Record<string, any> = {
    ...pickFields(record, EQUITY_INVESTMENT_ROUND_FIELDS),
    ...nestedRound
  }

  const equityInvestmentRef = resolveEquityInvestmentRef(record, round)
  if (equityInvestmentRef) {
    round.equityInvestment = equityInvestmentRef
  }
  // The Java endpoint accepts the relationship key only; strip the FK alias
  // so the payload doesn't carry both.
  delete round.equityInvestmentId

  if (typeof round.investmentOpportunityId === 'string' && !round.investmentOpportunity) {
    round.investmentOpportunity = round.investmentOpportunityId
  }
  delete round.investmentOpportunityId

  if (round.year !== undefined) {
    const normalizedYear = normalizeYearValue(round.year)
    if (normalizedYear === undefined) {
      delete round.year
    } else {
      round.year = normalizedYear
    }
  }

  for (const field of NUMERIC_FIELDS) {
    if (round[field] === undefined) continue
    const coerced = coerceNumericField(round[field])
    if (coerced === undefined) {
      delete round[field]
    } else {
      round[field] = coerced
    }
  }

  return stripEmptyValues(round)
}

export function toEquityInvestmentRoundBatchPayload(
  entities: Record<string, any>[],
  config: ImportConfig
): { equityInvestmentRoundRequests: Record<string, any>[] } {
  // Mirror the report-payload pattern: the inner wrapper key is taken from
  // the import config (`equityInvestmentRound`) so adding a future round
  // subtype only requires extending the union type, not this function.
  const wrapperKey = config.equityInvestmentRoundPayloadKey ?? 'equityInvestmentRound'

  const equityInvestmentRoundRequests = entities
    .map(entity => {
      const nested = nestFlatDottedKeys(entity)
      const normalized = normalizeEntityForImport(nested)
      const equityInvestmentRound = normalizeEquityInvestmentRound(normalized)
      return { [wrapperKey]: equityInvestmentRound } as Record<string, any>
    })
    // Drop rows where the Investment column did not resolve to a subtype id;
    // posting them would just produce per-row FK errors on the backend.
    .filter(request => Boolean(request[wrapperKey]?.equityInvestment))

  return { equityInvestmentRoundRequests }
}
