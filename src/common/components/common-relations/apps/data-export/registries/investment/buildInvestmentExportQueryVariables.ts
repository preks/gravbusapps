import { buildInvestmentSectionQueryModel } from '@/business-apps/irm/investments/apps/investment-management/views/investment-view/utils/buildInvestmentSectionQueryModel'
import type { InvestmentQueryVariables } from '@/common/data/investment/queries/investmentQueries.new'

export type InvestmentExportQueryVariables = InvestmentQueryVariables & {
  customConditions?: Record<string, unknown>[]
}

export function buildInvestmentExportQueryVariables(
  selectedFilters: Record<string, unknown>,
  pagination?: { limit?: number; offset?: number }
): InvestmentExportQueryVariables {
  const model = buildInvestmentSectionQueryModel({
    selectedFilters,
    search: '',
    sortField: 'createdAt',
    sortOrder: 'DESC',
    limit: pagination?.limit,
    offset: pagination?.offset ?? 0,
    group: null
  })

  return model.queryVariables
}
