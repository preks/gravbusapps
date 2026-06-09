import type { InvestmentReport } from '@/common/data/investment/types/investmentReportTypes'
import type { ExportFieldDefinition } from '../../types/exportFieldTypes'
import { buildCommonInvestmentReportExportFields } from './commonInvestmentReportExportFields'

export function buildIrmInvestmentReportExportFields(): ExportFieldDefinition<InvestmentReport>[] {
  return buildCommonInvestmentReportExportFields()
}
