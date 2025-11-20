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
  AnalyticsRawSnapshot
} from '../types/analytics-context'
import type { GraphQLClient } from '@/common/network/graphql/GraphQLClient'
import { GET_INVESTMENT_BY_ID } from '@/common/data/investment/queries/investmentQueries'
import {
  buildContactFromAccountOwner,
  buildContactFromOwner,
  compactRecord,
  isEmptyObject,
  limitArray,
  normalizeEmail,
  normalizePhone
} from './collectorUtils'

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
  const { entity } = params

  try {
    if (entity.type === 'investment') {
      return await buildInvestmentAnalytics(params)
    }

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
  } catch (error) {
    console.error(`Error building analytics header for ${entity.type}:`, error)
    throw error
  }
}
