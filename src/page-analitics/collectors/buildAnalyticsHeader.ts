/**
 * Analytics Header Builder
 *
 * Collects contextual analytics data (generic JSON metrics)
 * so that backend is not tied to specific metric names.
 */

import {
  AnalyticsContext,
  AnalyticsHeaderContext,
  AnalyticsMetric,
  AnalyticsSummary,
  AnalyticsContact,
  AnalyticsLink,
  AnalyticsRawSnapshot,
  AnalyticsPrimitiveValue
} from '../types/analytics-context'
import type { GraphQLClient } from '@/common/network/graphql/GraphQLClient'
import { GET_INVESTMENT_BY_ID } from '@/common/data/investment/queries/investmentQueries'
import { buildAccountAnalytics } from './accountAnalyticsCollector'
import { buildContactAnalytics } from './contactAnalyticsCollector'
import { buildLeadAnalytics } from './leadAnalyticsCollector'
import { buildOpportunityAnalytics } from './opportunityAnalyticsCollector'
import { buildInvestmentLeadAnalytics } from './investmentLeadAnalyticsCollector'
import { buildInvestmentOpportunityAnalytics } from './investmentOpportunityAnalyticsCollector'
import { buildInvestmentAccountAnalytics } from './investmentAccountAnalyticsCollector'
import { buildInvestmentContactAnalytics } from './investmentContactAnalyticsCollector'
import {
  buildContactFromAccountOwner,
  buildContactFromOwner,
  compactRecord,
  isEmptyObject,
  limitArray,
  normalizeEmail,
  normalizePhone
} from './collectorUtils'

type UnitType = 'currency' | 'percent' | 'sharePrice'

interface LiquidMetricDefinition {
  idSuffix: string
  label?: string
  keys: string[]
  unitType?: UnitType
}

const LIQUID_METRIC_DEFINITIONS: LiquidMetricDefinition[] = [
  { idSuffix: 'name', label: 'Investment Name', keys: ['name'] },
  { idSuffix: 'proprietor', label: 'Proprietor', keys: ['proprietorName'] },
  { idSuffix: 'bank', label: 'Bank', keys: ['bankName'] },
  { idSuffix: 'bankAccountNumber', label: 'Bank Account Number', keys: ['bankAccountNumber'] },
  {
    idSuffix: 'openingBalance',
    label: 'Opening Balance',
    keys: ['openingBalanceAmount', 'openingBalance'],
    unitType: 'currency'
  },
  { idSuffix: 'incoming', label: 'Incoming', keys: ['incomingAmount', 'incoming'], unitType: 'currency' },
  { idSuffix: 'outgoing', label: 'Outgoing', keys: ['outgoingAmount', 'outgoing'], unitType: 'currency' },
  {
    idSuffix: 'incomeInterest',
    label: 'Income (Interest)',
    keys: ['incomeInterest', 'incomeInterestAmount', 'income'],
    unitType: 'currency'
  },
  { idSuffix: 'netIncome', label: 'Net Income', keys: ['netIncome', 'netIncomeAmount'], unitType: 'currency' },
  {
    idSuffix: 'realizedGainsCurrency',
    label: 'Realized Gains/Losses',
    keys: ['realizedGainsLossesCurrency', 'realizedGainsLossesAmount', 'realizedGainsLosses'],
    unitType: 'currency'
  },
  {
    idSuffix: 'unrealizedGainsCurrency',
    label: 'Unrealized Gains/Losses',
    keys: ['unrealizedGainsLossesCurrency', 'unrealizedGainsLossesAmount', 'unrealizedGainsLosses'],
    unitType: 'currency'
  },
  {
    idSuffix: 'realizedGainsSharePrice',
    label: 'Realized Gains/Losses Share Price',
    keys: ['realizedGainsLossesSharePrice'],
    unitType: 'currency'
  },
  {
    idSuffix: 'unrealizedGainsSharePrice',
    label: 'Unrealized Gains/Losses Share Price',
    keys: ['unrealizedGainsLossesSharePrice'],
    unitType: 'currency'
  },
  {
    idSuffix: 'closingBalance',
    label: 'Closing Balance',
    keys: ['closingBalance', 'closingBalanceAmount'],
    unitType: 'currency'
  },
  {
    idSuffix: 'timeWeightedPerformance',
    label: 'Time-Weighted Performance',
    keys: ['timeWeightedPerformancePercent', 'timeWeightedPerformance'],
    unitType: 'percent'
  },
  { idSuffix: 'quantity', label: 'Quantity', keys: ['quantity'] },
  { idSuffix: 'maturityDate', label: 'Maturity Date', keys: ['maturityDate'] },
  { idSuffix: 'interestRate', label: 'Interest Rate', keys: ['interestRate'], unitType: 'percent' }
]

function parseAdditionalProperties(value: unknown): Record<string, any> {
  if (!value) return {}
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, any>
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, any>
      }
    } catch {
      // ignore malformed JSON
    }
  }
  return {}
}

function mergeWithAdditionalProperties<T extends Record<string, any>>(base: T): T & Record<string, any> {
  const additional = parseAdditionalProperties(base.additionalProperties)
  return { ...additional, ...base }
}

function findValueInSource(source: Record<string, any>, keys: string[]): { key: string; value: any } | null {
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null && source[key] !== '') {
      return { key, value: source[key] }
    }
    const camelVariant = key.replace(/_([a-z])/g, (_, g1) => g1.toUpperCase())
    if (source[camelVariant] !== undefined && source[camelVariant] !== null && source[camelVariant] !== '') {
      return { key: camelVariant, value: source[camelVariant] }
    }
    const snakeVariant = key.replace(/([A-Z])/g, '_$1').toLowerCase()
    if (source[snakeVariant] !== undefined && source[snakeVariant] !== null && source[snakeVariant] !== '') {
      return { key: snakeVariant, value: source[snakeVariant] }
    }
  }
  return null
}

function parseNumberFromString(raw: string): number | undefined {
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  const cleaned = trimmed.replace(/\s+/g, '').replace(/[^0-9,.\-]/g, '')
  if (!cleaned) return undefined
  const hasDot = cleaned.includes('.')
  let normalized = cleaned
  if (!hasDot && (cleaned.match(/,/g)?.length || 0) === 1) {
    normalized = cleaned.replace(',', '.')
  }
  normalized = normalized.replace(/,/g, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : undefined
}

function buildMetricValue(value: unknown): {
  metricValue: AnalyticsPrimitiveValue
  extraMeta?: Record<string, unknown>
} | null {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return { metricValue: value }
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    const numeric = parseNumberFromString(trimmed)
    if (numeric !== undefined) {
      return {
        metricValue: numeric,
        extraMeta: { originalValue: trimmed }
      }
    }
    return { metricValue: trimmed }
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return null
    return {
      metricValue: JSON.stringify(value),
      extraMeta: { originalValue: value }
    }
  }

  try {
    return {
      metricValue: JSON.stringify(value),
      extraMeta: { originalValue: value }
    }
  } catch {
    return null
  }
}

function toDisplayValue(value: unknown): AnalyticsPrimitiveValue | undefined {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
  }
  try {
    return JSON.stringify(value)
  } catch {
    return undefined
  }
}

function formatLabelFromKey(key: string): string {
  return key
    .replace(/[_\-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, char => char.toUpperCase())
}

function resolveUnit(unitType: UnitType | undefined, currencyCode: string): string | undefined {
  if (!unitType) return undefined
  if (unitType === 'percent') return '%'
  return currencyCode
}

function buildMetric(
  id: string,
  label: string,
  rawValue: unknown,
  unit: string | undefined,
  metaSource: { source: string; key: string }
): AnalyticsMetric | null {
  const valueWithMeta = buildMetricValue(rawValue)
  if (!valueWithMeta) return null

  const metric: AnalyticsMetric = {
    id,
    label,
    value: valueWithMeta.metricValue
  }

  if (unit) {
    metric.unit = unit
  }

  const meta: Record<string, unknown> = {
    source: metaSource.source,
    key: metaSource.key
  }

  if (valueWithMeta.extraMeta) {
    Object.assign(meta, valueWithMeta.extraMeta)
  }

  if (Object.keys(meta).length > 0) {
    metric.meta = meta
  }

  return metric
}

function buildContactsFromAccount(account: any): AnalyticsContact[] {
  if (!account) return []

  const contacts = limitArray(account.investmentAccountContact, 5).map((entry: any) => {
    const contact = entry?.contact
    if (!contact?.id) return null

    const primaryChannel = contact.communicationChannels?.[0]
    const communicationMeta =
      primaryChannel &&
      compactRecord({
        channel: primaryChannel.communicationChannel?.value,
        value: primaryChannel.value,
        source: primaryChannel.source
      })

    return {
      id: contact.id,
      name: contact.fullName || [contact.firstName, contact.lastName].filter(Boolean).join(' ') || undefined,
      relation: entry?.contactType || 'accountContact',
      role: contact.jobPosition || undefined,
      type: 'contact',
      email: normalizeEmail(contact.email),
      phone: normalizePhone(contact.phone),
      meta: compactRecord({
        department: contact.department,
        academicTitle: contact.academicTitle?.value,
        salutation: contact.salutation?.value,
        primaryChannel: communicationMeta
      })
    } as AnalyticsContact | null
  })

  return contacts.filter((contact): contact is AnalyticsContact => Boolean(contact))
}

function buildSummary(investment: any, currency: string): AnalyticsSummary {
  const owner = investment.ownerEmployee
  const account = investment.investmentAccount

  const summaryRecord = compactRecord({
    code: investment.code,
    status: investment.investmentStatus?.value,
    phase: investment.investmentPhase?.value,
    type: investment.investmentType?.value,
    riskLevel: investment.investmentRiskLevel?.value,
    group: investment.investmentGroup?.value,
    acquisitionDate: investment.acquisitionDate,
    plannedExitDate: investment.plannedExitDate || investment.planedExit,
    exitDate: investment.exitDate,
    currency,
    owner: owner?.id
      ? compactRecord({
          id: owner.id,
          name: owner.displayName || undefined,
          jobPosition: owner.employeePosition?.jobPosition?.name,
          organizationalUnit: owner.employeePosition?.organizationalUnit?.name
        })
      : undefined,
    account: account?.id
      ? compactRecord({
          id: account.id,
          name: account.name,
          email: normalizeEmail(account.email),
          phone: normalizePhone(account.phone),
          website: account.website,
          industry: account.industryClass?.value,
          companySize: account.companySize?.value,
          revenueBand: account.accountAnnualRevenueBand?.value,
          ownerEmployee: account.ownerEmployee?.id
            ? compactRecord({
                id: account.ownerEmployee.id,
                name: account.ownerEmployee.displayName || undefined,
                jobPosition: account.ownerEmployee.employeePosition?.jobPosition?.name
              })
            : undefined,
          primaryAddress: account.addresses?.[0]
            ? compactRecord({
                locality: account.addresses[0].locality,
                region: account.addresses[0].region?.value,
                country: account.addresses[0].country?.value,
                postalCode: account.addresses[0].postalCode
              })
            : undefined
        })
      : undefined,
    totals: compactRecord({
      initialInvestmentAmount: investment.initialInvestmentAmount,
      totalInvestmentAmount: investment.totalInvestmentAmount,
      investmentMarketValue: investment.investmentMarketValue,
      totalCommitmentAmount: investment.totalCommitmentAmount,
      totalDistributionAmount: investment.totalDistributionAmount
    })
  })

  return summaryRecord as AnalyticsSummary
}

function buildLinks(investment: any): AnalyticsLink[] {
  const links: AnalyticsLink[] = []
  const account = investment.investmentAccount

  if (account?.website) {
    links.push({
      id: 'investment.account.website',
      title: account.name ? `${account.name} website` : 'Account Website',
      url: account.website,
      type: 'website'
    })
  }

  if (investment.additionalProperties && typeof investment.additionalProperties === 'object') {
    const docLinks = limitArray((investment.additionalProperties.documents as any[]) || [], 5)
    docLinks.forEach((doc, index) => {
      if (!doc?.id) return
      links.push({
        id: String(doc.id),
        title: doc.title || `Document ${index + 1}`,
        type: doc.type || 'document',
        url: doc.url
      })
    })
  }

  return links
}

function buildRawSnapshot(investment: any, currency: string): AnalyticsRawSnapshot {
  const raw: AnalyticsRawSnapshot = {}

  raw.investment = compactRecord({
    id: investment.id,
    code: investment.code,
    name: investment.name,
    status: investment.investmentStatus?.value,
    type: investment.investmentType?.value,
    currency,
    acquisitionDate: investment.acquisitionDate,
    plannedExitDate: investment.plannedExitDate || investment.planedExit,
    exitDate: investment.exitDate,
    totals: compactRecord({
      initialInvestmentAmount: investment.initialInvestmentAmount,
      totalInvestmentAmount: investment.totalInvestmentAmount,
      investmentMarketValue: investment.investmentMarketValue,
      totalCommitmentAmount: investment.totalCommitmentAmount,
      totalDistributionAmount: investment.totalDistributionAmount,
      debtFinancingAmount: investment.debtFinancingAmount,
      requiredCapitalAmount: investment.requiredCapitalAmount,
      forecastedRevenueAmount: investment.forecastedRevenueAmount,
      forecastedProfitAmount: investment.forecastedProfitAmount
    }),
    ownerEmployee: investment.ownerEmployee?.id
      ? compactRecord({
          id: investment.ownerEmployee.id,
          name: investment.ownerEmployee.displayName || undefined,
          jobPosition: investment.ownerEmployee.employeePosition?.jobPosition?.name
        })
      : undefined,
    loanRecipient: investment.loanRecipientInvestmentAccount?.id
      ? compactRecord({
          id: investment.loanRecipientInvestmentAccount.id,
          name: investment.loanRecipientInvestmentAccount.name,
          companySize: investment.loanRecipientInvestmentAccount.companySize?.value,
          revenueBand: investment.loanRecipientInvestmentAccount.accountAnnualRevenueBand?.value,
          industry: investment.loanRecipientInvestmentAccount.industryClass?.value
        })
      : undefined
  })

  if (investment.investmentAccount?.id) {
    raw.account = compactRecord({
      id: investment.investmentAccount.id,
      name: investment.investmentAccount.name,
      email: normalizeEmail(investment.investmentAccount.email),
      phone: normalizePhone(investment.investmentAccount.phone),
      website: investment.investmentAccount.website,
      industry: investment.investmentAccount.industryClass?.value,
      companySize: investment.investmentAccount.companySize?.value,
      revenueBand: investment.investmentAccount.accountAnnualRevenueBand?.value,
      ownerEmployee: investment.investmentAccount.ownerEmployee?.id
        ? compactRecord({
            id: investment.investmentAccount.ownerEmployee.id,
            name: investment.investmentAccount.ownerEmployee.displayName || undefined
          })
        : undefined,
      primaryAddress: investment.investmentAccount.addresses?.[0]
        ? compactRecord({
            locality: investment.investmentAccount.addresses[0].locality,
            region: investment.investmentAccount.addresses[0].region?.value,
            country: investment.investmentAccount.addresses[0].country?.value,
            postalCode: investment.investmentAccount.addresses[0].postalCode
          })
        : undefined
    })
  }

  if (Array.isArray(investment.equityInvestment) && investment.equityInvestment.length > 0) {
    raw.equityInvestment = limitArray(investment.equityInvestment, 3).map((item: any) =>
      compactRecord({
        id: item.id,
        marketValue: item.marketValue,
        turnoverAmount: item.turnoverAmount,
        ebitdaAmount: item.ebitdaAmount,
        foundationDate: item.foundationDate
      })
    )
  }

  if (Array.isArray(investment.liquidFundInvestment) && investment.liquidFundInvestment.length > 0) {
    const limitedLiquid = limitArray(investment.liquidFundInvestment, 3)
    raw.liquidFundInvestments = limitedLiquid.map((item: any) => {
      const merged = mergeWithAdditionalProperties(item)
      return compactRecord({
        id: item.id,
        proprietorName: item.proprietorName,
        bankName: item.bankName,
        bankAccountNumber: item.bankAccountNumber,
        interestRate: item.interestRate,
        maturityDate: item.maturityDate,
        earlyTerminationAllowed: item.earlyTerminationAllowed,
        snapshot: compactRecord({
          openingBalance: toDisplayValue(findValueInSource(merged, ['openingBalanceAmount', 'openingBalance'])?.value),
          incoming: toDisplayValue(findValueInSource(merged, ['incomingAmount', 'incoming'])?.value),
          outgoing: toDisplayValue(findValueInSource(merged, ['outgoingAmount', 'outgoing'])?.value),
          incomeInterest: toDisplayValue(
            findValueInSource(merged, ['incomeInterest', 'incomeInterestAmount', 'income'])?.value
          ),
          netIncome: toDisplayValue(findValueInSource(merged, ['netIncome', 'netIncomeAmount'])?.value),
          realizedGains: toDisplayValue(
            findValueInSource(merged, [
              'realizedGainsLossesCurrency',
              'realizedGainsLossesAmount',
              'realizedGainsLosses'
            ])?.value
          ),
          unrealizedGains: toDisplayValue(
            findValueInSource(merged, [
              'unrealizedGainsLossesCurrency',
              'unrealizedGainsLossesAmount',
              'unrealizedGainsLosses'
            ])?.value
          ),
          realizedGainsSharePrice: toDisplayValue(findValueInSource(merged, ['realizedGainsLossesSharePrice'])?.value),
          unrealizedGainsSharePrice: toDisplayValue(
            findValueInSource(merged, ['unrealizedGainsLossesSharePrice'])?.value
          ),
          closingBalance: toDisplayValue(findValueInSource(merged, ['closingBalance', 'closingBalanceAmount'])?.value),
          timeWeightedPerformance: toDisplayValue(
            findValueInSource(merged, ['timeWeightedPerformancePercent', 'timeWeightedPerformance'])?.value
          ),
          quantity: toDisplayValue(findValueInSource(merged, ['quantity'])?.value)
        })
      })
    })
  }

  if (isEmptyObject(raw.investment)) {
    delete raw.investment
  }
  if (isEmptyObject(raw.account)) {
    delete raw.account
  }
  if (Array.isArray(raw.equityInvestment) && raw.equityInvestment.length === 0) {
    delete raw.equityInvestment
  }

  return raw
}

function extractCurrencyCode(currencyId?: string | { value?: string } | null): string {
  if (!currencyId) return 'EUR'
  if (typeof currencyId === 'string') {
    const parts = currencyId.split(':')
    return parts[parts.length - 1] || 'EUR'
  }
  if (typeof currencyId === 'object' && currencyId.value) {
    return extractCurrencyCode(currencyId.value)
  }
  return 'EUR'
}

function toFixedNumber(value: number, fractionDigits = 2): number {
  return Number(value.toFixed(fractionDigits))
}

async function buildInvestmentAnalytics(params: {
  entity: { type: string; id: string; name?: string }
  graphqlClient: GraphQLClient
  currency?: string
}): Promise<AnalyticsHeaderContext> {
  const { entity, graphqlClient, currency: currencyHint } = params

  const query = GET_INVESTMENT_BY_ID(entity.id)
  const result = await graphqlClient.request<any>(query)
  const investment = result?.Investment?.[0]

  if (!investment) {
    throw new Error(`Investment not found: ${entity.id}`)
  }

  const currencyCode = currencyHint || extractCurrencyCode(investment.currency)
  const asOf = investment.updatedAt || new Date().toISOString().split('T')[0]

  const metrics: AnalyticsMetric[] = []

  const summary = buildSummary(investment, currencyCode)
  const contacts: AnalyticsContact[] = []
  const contactsFromAccount = buildContactsFromAccount(investment.investmentAccount)
  contacts.push(...contactsFromAccount)

  const ownerContact = buildContactFromOwner(investment.ownerEmployee)
  if (ownerContact) {
    contacts.push(ownerContact)
  }

  const accountOwnerContact = buildContactFromAccountOwner(investment.investmentAccount?.ownerEmployee)
  if (accountOwnerContact) {
    contacts.push(accountOwnerContact)
  }

  const links = buildLinks(investment)
  const rawSnapshot = buildRawSnapshot(investment, currencyCode)
  const raw = Object.keys(rawSnapshot).length ? rawSnapshot : undefined

  const contactByKey = new Map<string, AnalyticsContact>()
  contacts.forEach(contact => {
    const key = `${contact.id}:${contact.relation || ''}`
    if (!contactByKey.has(key)) {
      contactByKey.set(key, contact)
    }
  })
  const dedupedContacts = Array.from(contactByKey.values())

  const marketValue = Number(investment.investmentMarketValue)
  const totalInvested = Number(investment.totalInvestmentAmount)
  if (isFinite(marketValue) && marketValue > 0 && isFinite(totalInvested) && totalInvested > 0) {
    const moic = marketValue / totalInvested
    metrics.push({
      id: 'investment.moic.current',
      label: 'MOIC (current)',
      value: toFixedNumber(moic),
      asOf,
      meta: {
        marketValue,
        totalInvested
      }
    })
  }

  const equityInvestment = investment.equityInvestment?.[0]
  const ebitdaRaw = equityInvestment?.ebitdaAmount
  if (ebitdaRaw !== undefined && ebitdaRaw !== null && isFinite(Number(ebitdaRaw))) {
    metrics.push({
      id: 'investment.ebitda.current',
      label: 'EBITDA',
      value: Number(ebitdaRaw),
      unit: currencyCode,
      asOf
    })
  }

  if (investment.stakePercentage) {
    metrics.push({
      id: 'investment.stakePercentage',
      label: 'Stake Percentage',
      value: toFixedNumber(Number(investment.stakePercentage), 2),
      unit: '%'
    })
  }

  if (investment.totalCommitmentAmount) {
    metrics.push({
      id: 'investment.totalCommitmentAmount',
      label: 'Total Commitment',
      value: Number(investment.totalCommitmentAmount),
      unit: currencyCode
    })
  }

  if (investment.totalDistributionAmount) {
    metrics.push({
      id: 'investment.totalDistributionAmount',
      label: 'Total Distribution',
      value: Number(investment.totalDistributionAmount),
      unit: currencyCode
    })
  }

  if (investment.investmentAccount?.name) {
    metrics.push({
      id: 'investment.account.name',
      label: 'Investment Account',
      value: investment.investmentAccount.name
    })
  }

  if (Array.isArray(investment.equityInvestment) && investment.equityInvestment.length > 0) {
    metrics.push({
      id: 'investment.equityInvestment.summary',
      label: 'Equity Investment Summary',
      value: investment.equityInvestment.slice(0, 3).map((item: any) => ({
        id: item.id,
        marketValue: item.marketValue,
        ebitdaAmount: item.ebitdaAmount
      })),
      meta: { count: investment.equityInvestment.length }
    })
  }

  const liquidFundInvestments = Array.isArray(investment.liquidFundInvestment)
    ? investment.liquidFundInvestment
    : investment.liquidFundInvestment
      ? [investment.liquidFundInvestment]
      : []

  const liquidSummaries: Record<string, unknown>[] = []

  liquidFundInvestments.forEach((liquid: any, index: number) => {
    if (!liquid) return

    const merged = mergeWithAdditionalProperties(liquid)

    const summaryItem = compactRecord({
      id: liquid.id,
      name: toDisplayValue(findValueInSource(merged, ['name'])?.value) ?? toDisplayValue(liquid.name),
      proprietor: toDisplayValue(merged.proprietorName),
      bank: toDisplayValue(merged.bankName),
      bankAccountNumber: toDisplayValue(merged.bankAccountNumber),
      openingBalance: toDisplayValue(findValueInSource(merged, ['openingBalanceAmount', 'openingBalance'])?.value),
      incoming: toDisplayValue(findValueInSource(merged, ['incomingAmount', 'incoming'])?.value),
      outgoing: toDisplayValue(findValueInSource(merged, ['outgoingAmount', 'outgoing'])?.value),
      incomeInterest: toDisplayValue(
        findValueInSource(merged, ['incomeInterest', 'incomeInterestAmount', 'income'])?.value
      ),
      netIncome: toDisplayValue(findValueInSource(merged, ['netIncome', 'netIncomeAmount'])?.value),
      realizedGains: toDisplayValue(
        findValueInSource(merged, ['realizedGainsLossesCurrency', 'realizedGainsLossesAmount', 'realizedGainsLosses'])
          ?.value
      ),
      unrealizedGains: toDisplayValue(
        findValueInSource(merged, [
          'unrealizedGainsLossesCurrency',
          'unrealizedGainsLossesAmount',
          'unrealizedGainsLosses'
        ])?.value
      ),
      realizedGainsSharePrice: toDisplayValue(findValueInSource(merged, ['realizedGainsLossesSharePrice'])?.value),
      unrealizedGainsSharePrice: toDisplayValue(findValueInSource(merged, ['unrealizedGainsLossesSharePrice'])?.value),
      closingBalance: toDisplayValue(findValueInSource(merged, ['closingBalance', 'closingBalanceAmount'])?.value),
      timeWeightedPerformance: toDisplayValue(
        findValueInSource(merged, ['timeWeightedPerformancePercent', 'timeWeightedPerformance'])?.value
      ),
      quantity: toDisplayValue(findValueInSource(merged, ['quantity'])?.value),
      maturityDate: toDisplayValue(merged.maturityDate),
      interestRate: toDisplayValue(merged.interestRate)
    })

    if (Object.keys(summaryItem).length > 1) {
      liquidSummaries.push(summaryItem)
    }

    const baseMetricId = `investment.liquid.${index}`
    const sourceKey = `liquidFundInvestment[${index}]`

    LIQUID_METRIC_DEFINITIONS.forEach(def => {
      const found = findValueInSource(merged, def.keys)
      if (!found) return

      const label = def.label ?? formatLabelFromKey(found.key)
      const unit = resolveUnit(def.unitType, currencyCode)

      const metric = buildMetric(`${baseMetricId}.${def.idSuffix}`, label, found.value, unit, {
        source: sourceKey,
        key: found.key
      })

      if (metric) {
        metrics.push(metric)
      }
    })
  })

  if (liquidSummaries.length > 0) {
    ;(summary as Record<string, unknown>).liquidFundInvestments = liquidSummaries
  }

  const meta: Record<string, unknown> = {
    currency: currencyCode,
    as_of: asOf
  }

  return {
    mode: 'header',
    entity: {
      type: entity.type,
      id: entity.id,
      name: entity.name || investment.name
    },
    metrics,
    meta,
    summary: Object.keys(summary).length ? summary : undefined,
    contacts: dedupedContacts.length ? dedupedContacts : undefined,
    links: links.length ? links : undefined,
    raw
  }
}

export async function buildAnalyticsHeader(params: {
  entity: { type: string; id: string; name?: string }
  graphqlClient: GraphQLClient
  currency?: string
}): Promise<AnalyticsContext> {
  const { entity, graphqlClient, currency } = params

  try {
    switch (entity.type) {
      case 'account':
        return await buildAccountAnalytics({ entity, graphqlClient })
      case 'investment_account':
        return await buildInvestmentAccountAnalytics({ entity, graphqlClient })
      case 'contact':
        return await buildContactAnalytics({ entity, graphqlClient })
      case 'investment_contact':
        return await buildInvestmentContactAnalytics({ entity, graphqlClient })
      case 'lead':
        return await buildLeadAnalytics({ entity, graphqlClient })
      case 'investment_lead':
        return await buildInvestmentLeadAnalytics({ entity, graphqlClient })
      case 'opportunity':
        return await buildOpportunityAnalytics({ entity, graphqlClient })
      case 'investment_opportunity':
        return await buildInvestmentOpportunityAnalytics({ entity, graphqlClient })
      case 'investment':
        return await buildInvestmentAnalytics({ entity, graphqlClient, currency })
      default:
        console.warn(
          `buildAnalyticsHeader: entity type "${entity.type}" not fully supported; returning empty metrics structure`
        )
        return {
          mode: 'header',
          entity: {
            type: entity.type,
            id: entity.id,
            name: entity.name
          },
          metrics: [],
          meta: {
            as_of: new Date().toISOString().split('T')[0]
          }
        }
    }
  } catch (error) {
    console.error(`Error building analytics header for ${entity.type}:`, error)
    throw error
  }
}
