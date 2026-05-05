import { ImportConfig } from '@/common/components/common-relations/apps/data-import/types'
import {
  COMMON_INVESTMENT_REPORT_FIELDS,
  EQUITY_INVESTMENT_REPORT_FIELDS,
  LIQUID_FUND_INVESTMENT_REPORT_FIELDS,
  REAL_ESTATE_INVESTMENT_REPORT_FIELDS
} from './commonInvestmentReportFields'
import {
  InvestmentGroupImportDefinition,
  InvestmentImportGroupDescriptor,
  InvestmentImportViewLabels
} from '../types/commonInvestmentImportTypes'

const REPORT_ENTITY_SUFFIX = '-investment-report'

const REPORT_ENTITY_TYPES = {
  EQUITY: 'equityinvestmentreport',
  REAL_ESTATE: 'realestateinvestmentreport',
  LIQUID_FUND: 'liquidfundinvestmentreport'
} as const

const REPORT_PAYLOAD_KEYS = {
  EQUITY: 'equityInvestmentReport',
  REAL_ESTATE: 'realEstateInvestmentReport',
  LIQUID_FUND: 'liquidFundInvestmentReport'
} as const

const REPORT_TARGET_FIELDS = {
  EQUITY: EQUITY_INVESTMENT_REPORT_FIELDS,
  REAL_ESTATE: REAL_ESTATE_INVESTMENT_REPORT_FIELDS,
  LIQUID_FUND: LIQUID_FUND_INVESTMENT_REPORT_FIELDS
} as const

interface InvestmentGroupReportConfiguration {
  flowbotEntityType: string
  investmentReportPayloadKey?: ImportConfig['investmentReportPayloadKey']
  targetFields: ImportConfig['targetFields']
  labels: InvestmentImportViewLabels
}

const GROUP_REPORT_CONFIGURATIONS: Record<string, InvestmentGroupReportConfiguration> = {
  EQUITY: {
    flowbotEntityType: REPORT_ENTITY_TYPES.EQUITY,
    investmentReportPayloadKey: REPORT_PAYLOAD_KEYS.EQUITY,
    targetFields: REPORT_TARGET_FIELDS.EQUITY,
    labels: {
      pageTitleKey: 'page-title-equity-report',
      pageDescriptionKey: 'page-description-equity-report',
      entityTypePluralKey: 'entity-plural-equity-report',
      entityTypeSingularKey: 'entity-singular-equity-report',
      dataTestIdPrefix: 'equity-investment-report-import-view'
    }
  },
  REAL_ESTATE: {
    flowbotEntityType: REPORT_ENTITY_TYPES.REAL_ESTATE,
    investmentReportPayloadKey: REPORT_PAYLOAD_KEYS.REAL_ESTATE,
    targetFields: REPORT_TARGET_FIELDS.REAL_ESTATE,
    labels: {
      pageTitleKey: 'page-title-real-estate-report',
      pageDescriptionKey: 'page-description-real-estate-report',
      entityTypePluralKey: 'entity-plural-real-estate-report',
      entityTypeSingularKey: 'entity-singular-real-estate-report',
      dataTestIdPrefix: 'real-estate-investment-report-import-view'
    }
  },
  LIQUID_FUND: {
    flowbotEntityType: REPORT_ENTITY_TYPES.LIQUID_FUND,
    investmentReportPayloadKey: REPORT_PAYLOAD_KEYS.LIQUID_FUND,
    targetFields: REPORT_TARGET_FIELDS.LIQUID_FUND,
    labels: {
      pageTitleKey: 'page-title-liquid-fund-report',
      pageDescriptionKey: 'page-description-liquid-fund-report',
      entityTypePluralKey: 'entity-plural-liquid-fund-report',
      entityTypeSingularKey: 'entity-singular-liquid-fund-report',
      dataTestIdPrefix: 'liquid-fund-investment-report-import-view'
    }
  }
}

const toInvestmentReportLabelWithoutReport = (groupLabel: string): string => {
  if (/investment/i.test(groupLabel)) {
    return `${groupLabel} Reports`
  }
  return `${groupLabel} Investment Reports`
}

const toReportRouteEntityType = (group: InvestmentImportGroupDescriptor): string =>
  `${group.tabId}${REPORT_ENTITY_SUFFIX}`

const createDefaultReportImportConfig = (group: InvestmentImportGroupDescriptor): ImportConfig => {
  const groupConfig = GROUP_REPORT_CONFIGURATIONS[group.code]

  return {
    entityType: toReportRouteEntityType(group),
    flowbotEntityType: groupConfig?.flowbotEntityType ?? 'investmentreport',
    domain: 'investment',
    targetFields: groupConfig?.targetFields ?? COMMON_INVESTMENT_REPORT_FIELDS,
    investmentReportPayloadKey: groupConfig?.investmentReportPayloadKey,
    investmentGroupRef: group.id
  }
}

const createDefaultReportLabels = (group: InvestmentImportGroupDescriptor): InvestmentImportViewLabels => ({
  pageTitleKey: undefined,
  pageDescriptionKey: undefined,
  entityTypePluralKey: undefined,
  entityTypeSingularKey: undefined,
  dataTestIdPrefix: `${group.tabId}-investment-report-import-view`
})

export const toInvestmentReportEntryLabel = (groupLabel: string): string =>
  /report/i.test(groupLabel) ? groupLabel : toInvestmentReportLabelWithoutReport(groupLabel)

export const getGroupReportImportConfiguration = (
  group: InvestmentImportGroupDescriptor
): InvestmentGroupImportDefinition => {
  const groupConfig = GROUP_REPORT_CONFIGURATIONS[group.code]

  return {
    group,
    importConfig: createDefaultReportImportConfig(group),
    labels: {
      ...createDefaultReportLabels(group),
      ...groupConfig?.labels
    }
  }
}
