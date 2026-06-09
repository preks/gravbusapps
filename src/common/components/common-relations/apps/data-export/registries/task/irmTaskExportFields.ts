import type { InvestmentTask } from '@/common/data/investment/types/investmentTaskTypes'
import type { ExportFieldDefinition } from '../../types/exportFieldTypes'
import { buildInvestmentIdExportField } from '../../utils/exportExternalIdFieldBuilders'
import { buildCommonTaskExportFields } from './commonTaskExportFields'
import { formatTaskLinkedInvestment } from './taskExportFormatters'

export function buildIrmTaskExportFields(): ExportFieldDefinition<InvestmentTask>[] {
  const baseFields = buildCommonTaskExportFields<InvestmentTask>()
  const linkedInvestmentField: ExportFieldDefinition<InvestmentTask> = {
    key: 'linkedInvestment',
    label: 'Linked Investment',
    formKeys: ['investmentId'],
    defaultSelected: false,
    format: task => formatTaskLinkedInvestment(task)
  }

  const linkedOpportunityIndex = baseFields.findIndex(field => field.key === 'linkedOpportunity')
  const insertIndex = linkedOpportunityIndex >= 0 ? linkedOpportunityIndex + 1 : baseFields.length

  return [
    ...baseFields.slice(0, insertIndex),
    linkedInvestmentField,
    ...baseFields.slice(insertIndex),
    buildInvestmentIdExportField<InvestmentTask>()
  ]
}
