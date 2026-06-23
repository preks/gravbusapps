/**
 * Equity Investment Round Import Configuration
 *
 * Static `ImportConfig` for the Equity Investment Round import. Mirrors the
 * structure of the report imports: a single "Investment" column on the file
 * is resolved by Flowbot to an `Investment` UUID and then to the matching
 * `EquityInvestment` subtype UUID; the remaining columns map 1:1 to the
 * fields on the create-round form (name, year, currency, pre-money valuation,
 * investment volume, share percentage).
 *
 * Round imports are Equity-only today, so the config is hand-built and the
 * group ref is hard-coded to `InvestmentGroup:v1:EQUITY` rather than being
 * derived from the dynamic `InvestmentGroup` catalog descriptor.
 */

import { ImportConfig, TargetFieldDefinition } from '@/common/components/common-relations/apps/data-import/types'

const EQUITY_INVESTMENT_GROUP_REF = 'InvestmentGroup:v1:EQUITY'

const EQUITY_INVESTMENT_ROUND_FIELDS: TargetFieldDefinition[] = [
  // The Investment column. Flowbot reads this column, resolves the value
  // against `Investment.name` (scoped to `InvestmentGroup:v1:EQUITY`), then
  // resolves the resulting Investment UUID to the matching `EquityInvestment`
  // subtype UUID.
  //
  // The UI-side target uses the schema FK (`equityInvestmentId`) — the FE
  // strips the `equityInvestmentRound.` prefix before sending so the backend
  // sees a real scalar field on the GQL type. Flowbot's flow-alias layer
  // promotes the resolved UUID onto `equityInvestmentRound.equityInvestment`
  // for the final batch payload.
  {
    value: 'equityInvestmentRound.equityInvestmentId',
    label: 'Investment',
    type: 'direct',
    required: true
  },

  // Identity
  { value: 'equityInvestmentRound.name', label: 'Round Name', type: 'direct', required: true },

  // The form takes a year as a 4-digit string (e.g. "2025") and stores it as
  // an ISO date by suffixing `-01-01T00:00:00.000Z`. The payload builder
  // mirrors that coercion so the file can carry either a year or a full date.
  { value: 'equityInvestmentRound.year', label: 'Year', type: 'direct', required: true },

  // Catalog reference. Same identifier the create-round form uses.
  {
    value: 'equityInvestmentRound.currencyRef',
    label: 'Currency',
    type: 'catalog',
    catalog: 'Currency',
    required: true
  },

  // Financial fields
  { value: 'equityInvestmentRound.preValue', label: 'Pre-Money Valuation', type: 'direct', required: true },
  { value: 'equityInvestmentRound.investmentVolume', label: 'Investment Volume', type: 'direct', required: true },
  { value: 'equityInvestmentRound.roundSharePercentage', label: 'Share Percentage', type: 'direct', required: true }
]

export const equityInvestmentRoundImportConfig: ImportConfig = {
  entityType: 'equity-investment-round',
  flowbotEntityType: 'equityinvestmentround',
  domain: 'investment',
  targetFields: EQUITY_INVESTMENT_ROUND_FIELDS,
  equityInvestmentRoundPayloadKey: 'equityInvestmentRound',
  // Pre-resolved catalog ref so the Investment name lookup is scoped to the
  // Equity group without an extra GraphQL round-trip.
  investmentGroupRef: EQUITY_INVESTMENT_GROUP_REF,
  preview: {
    title: { fields: ['equityInvestmentRound.name'] },
    rows: [
      {
        label: 'Year',
        icon: 'calendar',
        field: 'equityInvestmentRound.year'
      },
      {
        label: 'Investment Volume',
        icon: 'currency',
        field: 'equityInvestmentRound.investmentVolume',
        currencyField: 'equityInvestmentRound.currencyRef',
        format: 'amountWithCurrency'
      },
      {
        label: 'Pre-Money Valuation',
        icon: 'currency',
        field: 'equityInvestmentRound.preValue',
        currencyField: 'equityInvestmentRound.currencyRef',
        format: 'amountWithCurrency'
      }
    ]
  }
}
