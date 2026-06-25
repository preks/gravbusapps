/**
 * Equity Investment Round payload-builder tests.
 *
 * Mirrors the assertions made in `irmLookupPayloads.test.ts` for the
 * report path: ensures the round payload wraps each entity under
 * `equityInvestmentRoundRequests[*].equityInvestmentRound`, that `year`
 * is coerced to ISO, that numeric strings become numbers, and that rows
 * without a resolved subtype FK are dropped.
 */

import type { ImportConfig } from '@/common/components/common-relations/apps/data-import/types'
import { toEquityInvestmentRoundBatchPayload } from '../irm/toEquityInvestmentRoundBatchPayload'

const config: ImportConfig = {
  entityType: 'equity-investment-round',
  flowbotEntityType: 'equityinvestmentround',
  domain: 'investment',
  targetFields: [],
  equityInvestmentRoundPayloadKey: 'equityInvestmentRound',
  investmentGroupRef: 'InvestmentGroup:v1:EQUITY'
}

describe('toEquityInvestmentRoundBatchPayload', () => {
  it('wraps each row under equityInvestmentRoundRequests[*].equityInvestmentRound', () => {
    const payload = toEquityInvestmentRoundBatchPayload(
      [
        {
          'equityInvestmentRound.equityInvestment': 'equity-investment-uuid-1',
          'equityInvestmentRound.name': 'Series A',
          'equityInvestmentRound.year': '2025',
          'equityInvestmentRound.currencyRef': 'Currency:v1:EUR',
          'equityInvestmentRound.preValue': '5000000',
          'equityInvestmentRound.investmentVolume': '1500000',
          'equityInvestmentRound.roundSharePercentage': '15'
        }
      ],
      config
    )

    expect(payload.equityInvestmentRoundRequests).toHaveLength(1)
    expect(payload.equityInvestmentRoundRequests[0].equityInvestmentRound).toEqual({
      equityInvestment: 'equity-investment-uuid-1',
      name: 'Series A',
      year: '2025-01-01T00:00:00.000Z',
      currencyRef: 'Currency:v1:EUR',
      preValue: 5000000,
      investmentVolume: 1500000,
      roundSharePercentage: 15
    })
  })

  it('coerces a bare year to ISO and leaves full ISO strings untouched', () => {
    const payload = toEquityInvestmentRoundBatchPayload(
      [
        {
          'equityInvestmentRound.equityInvestment': 'equity-1',
          'equityInvestmentRound.name': 'Bare year',
          'equityInvestmentRound.year': '2024'
        },
        {
          'equityInvestmentRound.equityInvestment': 'equity-2',
          'equityInvestmentRound.name': 'ISO year',
          'equityInvestmentRound.year': '2023-06-15T00:00:00.000Z'
        },
        {
          'equityInvestmentRound.equityInvestment': 'equity-3',
          'equityInvestmentRound.name': 'Numeric year',
          'equityInvestmentRound.year': 2022
        }
      ],
      config
    )

    expect(payload.equityInvestmentRoundRequests[0].equityInvestmentRound.year).toBe('2024-01-01T00:00:00.000Z')
    expect(payload.equityInvestmentRoundRequests[1].equityInvestmentRound.year).toBe('2023-06-15T00:00:00.000Z')
    expect(payload.equityInvestmentRoundRequests[2].equityInvestmentRound.year).toBe('2022-01-01T00:00:00.000Z')
  })

  it('drops rows missing the resolved equityInvestment subtype id', () => {
    const payload = toEquityInvestmentRoundBatchPayload(
      [
        {
          'equityInvestmentRound.equityInvestment': 'equity-resolved',
          'equityInvestmentRound.name': 'Resolved'
        },
        {
          // Subtype lookup failed — Flowbot did not write this key.
          'equityInvestmentRound.name': 'Unresolved'
        }
      ],
      config
    )

    expect(payload.equityInvestmentRoundRequests).toHaveLength(1)
    expect(payload.equityInvestmentRoundRequests[0].equityInvestmentRound.name).toBe('Resolved')
  })

  it('accepts the legacy top-level investment alias and promotes it to equityInvestment', () => {
    const payload = toEquityInvestmentRoundBatchPayload(
      [
        {
          // LLM may have mapped the Investment column to the legacy alias when
          // the round-prefixed target wasn't available.
          investment: 'equity-legacy-uuid',
          'equityInvestmentRound.name': 'Series B'
        }
      ],
      config
    )

    expect(payload.equityInvestmentRoundRequests).toHaveLength(1)
    expect(payload.equityInvestmentRoundRequests[0].equityInvestmentRound.equityInvestment).toBe('equity-legacy-uuid')
  })

  it('drops numeric fields whose string values cannot be parsed', () => {
    const payload = toEquityInvestmentRoundBatchPayload(
      [
        {
          'equityInvestmentRound.equityInvestment': 'equity-uuid',
          'equityInvestmentRound.name': 'Bad numbers',
          'equityInvestmentRound.preValue': 'not-a-number',
          'equityInvestmentRound.investmentVolume': '2500000'
        }
      ],
      config
    )

    const round = payload.equityInvestmentRoundRequests[0].equityInvestmentRound
    expect(round.preValue).toBeUndefined()
    expect(round.investmentVolume).toBe(2500000)
  })

  it('promotes equityInvestmentId (schema FK) onto the relationship key', () => {
    const payload = toEquityInvestmentRoundBatchPayload(
      [
        {
          // FE strips the `equityInvestmentRound.` prefix, so an extract
          // record may carry `equityInvestmentId` at the top level (the
          // schema scalar) instead of `equityInvestment` (the relationship).
          'equityInvestmentRound.equityInvestmentId': 'equity-sub-uuid',
          'equityInvestmentRound.name': 'Series X'
        }
      ],
      config
    )

    expect(payload.equityInvestmentRoundRequests).toHaveLength(1)
    const round = payload.equityInvestmentRoundRequests[0].equityInvestmentRound
    expect(round.equityInvestment).toBe('equity-sub-uuid')
    expect((round as Record<string, unknown>).equityInvestmentId).toBeUndefined()
  })

  it('does not leak the staging `investment` alias onto the wrapped payload', () => {
    const payload = toEquityInvestmentRoundBatchPayload(
      [
        {
          investment: 'equity-uuid-x',
          'equityInvestmentRound.equityInvestment': 'equity-uuid-x',
          'equityInvestmentRound.name': 'Clean'
        }
      ],
      config
    )

    const round = payload.equityInvestmentRoundRequests[0].equityInvestmentRound
    expect(round.equityInvestment).toBe('equity-uuid-x')
    expect((round as Record<string, unknown>).investment).toBeUndefined()
  })
})
