import type { Investment } from '@/common/data/investment/types/investmentTypes.new'
import type { ExportFieldDefinition } from '../../types/exportFieldTypes'
import { buildCommonInvestmentExportFields } from './commonInvestmentExportFields'

export function buildIrmInvestmentExportFields(): ExportFieldDefinition<Investment>[] {
  return buildCommonInvestmentExportFields()
}
