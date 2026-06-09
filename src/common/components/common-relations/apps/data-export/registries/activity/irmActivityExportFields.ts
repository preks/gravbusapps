import type { InvestmentActivity } from '@/common/data/investment/types/investmentActivityTypes'
import type { ExportFieldDefinition } from '../../types/exportFieldTypes'
import { buildInvestmentIdExportField } from '../../utils/exportExternalIdFieldBuilders'
import { buildCommonActivityExportFields } from './commonActivityExportFields'
import { formatActivityLinkedInvestment } from './activityExportFormatters'

export function buildIrmActivityExportFields(): ExportFieldDefinition<InvestmentActivity>[] {
  const baseFields = buildCommonActivityExportFields<InvestmentActivity>()
  const linkedInvestmentField: ExportFieldDefinition<InvestmentActivity> = {
    key: 'linkedInvestment',
    label: 'Linked Investment',
    formKeys: ['investmentId'],
    defaultSelected: false,
    format: activity => formatActivityLinkedInvestment(activity)
  }

  const linkedOpportunityIndex = baseFields.findIndex(field => field.key === 'linkedOpportunity')
  const insertIndex = linkedOpportunityIndex >= 0 ? linkedOpportunityIndex + 1 : baseFields.length

  return [
    ...baseFields.slice(0, insertIndex),
    linkedInvestmentField,
    ...baseFields.slice(insertIndex),
    buildInvestmentIdExportField<InvestmentActivity>()
  ]
}
