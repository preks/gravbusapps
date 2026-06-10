import type { FilterConfiguration } from '@newwork/nw-design-system'
import type { ExportFieldDefinition } from '../types/exportFieldTypes'

type TranslateFn = (key: string, vars?: Record<string, unknown>) => string

function camelToKebab(value: string): string {
  return value
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '')
}

const FIELD_LABEL_KEY_OVERRIDES: Record<string, string> = {
  phoneNumber: 'field-phone',
  companyName: 'field-company',
  locality: 'field-city',
  addressLine: 'field-address',
  leadStatus: 'field-status',
  leadRating: 'field-rating',
  leadSource: 'field-source',
  industryClass: 'field-industry',
  ownerEmployee: 'field-owner',
  createdAt: 'field-created-date',
  updatedAt: 'field-updated-date',
  linkedinUrl: 'field-linkedin-url',
  secondaryNumber: 'field-secondary-phone',
  opportunityStatus: 'field-status',
  opportunityPipeline: 'field-pipeline',
  opportunityPipelineStage: 'field-stage',
  opportunityForecast: 'field-forecast',
  linkedAccounts: 'field-linked-accounts',
  linkedContacts: 'field-linked-contacts',
  contactTypes: 'field-contact-types',
  notesSummary: 'field-notes-summary',
  birthDate: 'field-birth-date',
  xingUrl: 'field-xing-url',
  accountPriority: 'field-priority',
  accountAnnualRevenueBand: 'field-revenue-band',
  foundationDate: 'field-foundation-date',
  winningChance: 'field-win-chance',
  estimatedAmount: 'field-amount',
  prospective: 'field-category',
  portalUserId: 'field-portal-user-id',
  userId: 'field-portal-user-id',
  ownerEmployeeId: 'field-owner-id',
  investmentId: 'field-investment-id',
  code: 'field-code',
  sizeMeasurementUnit: 'field-size-unit',
  investmentStakeType: 'field-stake-type',
  forecastedProfitAmount: 'field-forecasted-profit',
  dealType: 'field-deal-type',
  salesCampaign: 'field-sales-campaign',
  investmentGroup: 'field-investment-group',
  investmentType: 'field-investment-type',
  investmentStatus: 'field-status',
  totalInvestmentAmount: 'field-total-investment',
  investmentMarketValue: 'field-market-value',
  linkedAccount: 'field-linked-account',
  planedExit: 'field-planned-exit',
  plannedExitDate: 'field-planned-exit-date',
  acquisitionDate: 'field-acquisition-date',
  title: 'field-title',
  activityType: 'field-activity-type',
  reference: 'field-reference',
  referenceType: 'field-reference-type',
  linkedLead: 'field-linked-lead',
  linkedOpportunity: 'field-linked-opportunity',
  linkedInvestment: 'field-linked-investment',
  source: 'field-source',
  occurredAt: 'field-occurred-date',
  completedAt: 'field-completed-date',
  taskType: 'field-task-type',
  taskPriority: 'field-priority',
  taskStatus: 'field-status',
  assignedTo: 'field-assigned-to',
  creatorEmployee: 'field-created-by',
  dueDate: 'field-due-date',
  taskTiming: 'field-task-timing',
  assignedEmployeeIds: 'field-assignee-ids',
  creatorEmployeeId: 'field-creator-id'
}

const NAME_FIELD_KEYS_BY_ENTITY: Record<string, string> = {
  account: 'field-account-name',
  opportunity: 'field-opportunity',
  campaign: 'field-campaign-name',
  investment: 'field-investment-name',
  task: 'field-task-name'
}

const ID_FIELD_KEYS_BY_ENTITY: Record<string, string> = {
  lead: 'field-lead-id',
  contact: 'field-contact-id',
  account: 'field-account-id',
  opportunity: 'field-opportunity-id',
  investment: 'field-investment-id',
  campaign: 'field-campaign-id',
  'investment-report': 'field-report-id',
  activity: 'field-activity-id',
  task: 'field-task-id'
}

const CAMPAIGN_FIELD_KEYS: Record<string, string> = {
  typeRef: 'field-type',
  status: 'field-campaign-status'
}

const INVESTMENT_REPORT_FIELD_KEYS: Record<string, string> = {
  investment: 'field-investment-name',
  date: 'field-report-date',
  investmentStatus: 'field-report-status',
  linkedInvestmentStatus: 'field-investment-status',
  scope: 'field-report-scope',
  investmentPhase: 'field-investment-phase',
  investmentRiskLevel: 'field-investment-risk-level',
  equityMarketValue: 'field-equity-market-value',
  realEstateAnnualNetColdRent: 'field-annual-net-cold-rent',
  liquidFundInterestRate: 'field-loan-interest-rate',
  totalInvestmentAmount: 'field-total-investment-amount',
  investmentMarketValue: 'field-investment-market-value'
}

function lookupEntityFieldKey(
  fieldKey: string,
  entityType: string | undefined,
  expectedFieldKey: string,
  lookupByEntity: Record<string, string>
): string | undefined {
  if (fieldKey === expectedFieldKey && entityType) {
    return lookupByEntity[entityType]
  }

  return undefined
}

function getFieldLabelKey(fieldKey: string, entityType?: string): string {
  const nameKey = lookupEntityFieldKey(fieldKey, entityType, 'name', NAME_FIELD_KEYS_BY_ENTITY)
  if (nameKey) {
    return nameKey
  }

  const idKey = lookupEntityFieldKey(fieldKey, entityType, 'id', ID_FIELD_KEYS_BY_ENTITY)
  if (idKey) {
    return idKey
  }

  if (entityType === 'campaign') {
    const campaignKey = CAMPAIGN_FIELD_KEYS[fieldKey]
    if (campaignKey) {
      return campaignKey
    }
  }

  if (entityType === 'investment-report') {
    const reportKey = INVESTMENT_REPORT_FIELD_KEYS[fieldKey]
    if (reportKey) {
      return reportKey
    }
  }

  return FIELD_LABEL_KEY_OVERRIDES[fieldKey] ?? `field-${camelToKebab(fieldKey)}`
}

export function translateExportFields<TEntity>(
  fields: ExportFieldDefinition<TEntity>[],
  t: TranslateFn,
  entityType?: string
): ExportFieldDefinition<TEntity>[] {
  return fields.map(field => ({
    ...field,
    label: t(getFieldLabelKey(field.key, entityType))
  }))
}

function translateString(value: string | undefined, t: TranslateFn): string | undefined {
  if (value == null || value === '') {
    return value
  }

  return t(value)
}

function translateFilterConfigObject(config: Record<string, unknown>, t: TranslateFn): Record<string, unknown> {
  const next: Record<string, unknown> = { ...config }

  if (typeof next.searchPlaceholder === 'string') {
    next.searchPlaceholder = translateString(next.searchPlaceholder, t)
  }
  if (typeof next.placeholder === 'string') {
    next.placeholder = translateString(next.placeholder, t)
  }
  if (typeof next.placeholderEnd === 'string') {
    next.placeholderEnd = translateString(next.placeholderEnd, t)
  }
  if (typeof next.placeholderMin === 'string') {
    next.placeholderMin = translateString(next.placeholderMin, t)
  }
  if (typeof next.placeholderMax === 'string') {
    next.placeholderMax = translateString(next.placeholderMax, t)
  }

  if (Array.isArray(next.options)) {
    next.options = next.options.map(option => {
      if (typeof option !== 'object' || option == null) {
        return option
      }

      const typedOption = option as { id: string; label: string }
      return {
        ...typedOption,
        label: translateString(typedOption.label, t) ?? typedOption.label
      }
    })
  }

  return next
}

export function translateFilterConfiguration(configuration: FilterConfiguration, t: TranslateFn): FilterConfiguration {
  return {
    ...configuration,
    groups: configuration.groups.map(group => ({
      ...group,
      label: translateString(group.label, t) ?? group.label,
      filters: group.filters.map(filter => ({
        ...filter,
        label: translateString(filter.label, t) ?? filter.label,
        config: translateFilterConfigObject(filter.config as Record<string, unknown>, t)
      }))
    }))
  }
}

export function buildExportToastMessages(t: TranslateFn, entityLabel: string) {
  return {
    noDataTitle: t('export-no-data-title'),
    noDataDescription: t('export-no-data-description'),
    noFilteredDataDescription: t('export-no-filtered-data', { entityLabel }),
    successCsvTitle: t('export-success-csv-title'),
    successExcelTitle: t('export-success-excel-title'),
    successDescription: (count: number) => t('export-success-description', { count, entityLabel }),
    failedTitle: t('export-failed-title')
  }
}

export type ExportToastMessages = ReturnType<typeof buildExportToastMessages>
