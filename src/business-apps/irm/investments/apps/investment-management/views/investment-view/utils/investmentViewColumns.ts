import type { InvestmentColumnOption, InvestmentListColumnConfiguration } from './investmentListColumnTransformer'

export const OVERVIEW_DEFAULT_VISIBLE_COLUMNS = [
  'name',
  'investmentGroup',
  'investmentType',
  'totalInvestmentAmount',
  'ownerEmployee',
  'account',
  'investmentStatus',
  'planedExit',
  'plannedExitDate',
  'createdAt',
  'actions'
]

export const OVERVIEW_AVAILABLE_COLUMNS: InvestmentColumnOption[] = [
  { id: 'name', label: 'Investment' },
  { id: 'investmentGroup', label: 'Group' },
  { id: 'investmentType', label: 'Type' },
  { id: 'totalInvestmentAmount', label: 'Total Investment' },
  { id: 'securityQuantity', label: 'Quantity' },
  { id: 'timeWeightedPerformance', label: 'Time-Weighted Performance' },
  { id: 'maturityDate', label: 'Maturity Date' },
  { id: 'ownerEmployee', label: 'Owner' },
  { id: 'account', label: 'Account' },
  { id: 'investmentStatus', label: 'Status' },
  { id: 'planedExit', label: 'Planned Exit' },
  { id: 'plannedExitDate', label: 'Planned Exit Date' },
  { id: 'createdAt', label: 'Created' },
  { id: 'actions', label: 'Actions' }
]

export const OVERVIEW_SORTABLE_COLUMNS: InvestmentColumnOption[] = [
  { id: 'name', label: 'Investment' },
  { id: 'totalInvestmentAmount', label: 'Total Investment' },
  { id: 'securityQuantity', label: 'Quantity' },
  { id: 'timeWeightedPerformance', label: 'Time-Weighted Performance' },
  { id: 'maturityDate', label: 'Maturity Date' },
  { id: 'ownerEmployee', label: 'Owner' },
  { id: 'investmentStatus', label: 'Status' },
  { id: 'planedExit', label: 'Planned Exit' },
  { id: 'plannedExitDate', label: 'Planned Exit Date' },
  { id: 'createdAt', label: 'Created' }
]

export const OVERVIEW_AVAILABLE_COLUMN_IDS = OVERVIEW_AVAILABLE_COLUMNS.map(column => column.id)

export const getInvestmentViewAvailableColumns = (
  currentSection: string,
  dynamicColumnConfigByTab: Record<string, InvestmentListColumnConfiguration>
): InvestmentColumnOption[] => {
  if (currentSection !== 'overview') {
    const dynamicColumns = dynamicColumnConfigByTab[currentSection]?.availableColumns || []
    return [{ id: 'name', label: 'Investment' }, ...dynamicColumns, { id: 'actions', label: 'Actions' }]
  }

  return OVERVIEW_AVAILABLE_COLUMNS
}

export const getInvestmentViewSortableColumns = (
  currentSection: string,
  dynamicColumnConfigByTab: Record<string, InvestmentListColumnConfiguration>
): InvestmentColumnOption[] => {
  if (currentSection !== 'overview') {
    const dynamicColumns = dynamicColumnConfigByTab[currentSection]?.sortableColumns || []
    return [{ id: 'name', label: 'Investment' }, ...dynamicColumns]
  }

  return OVERVIEW_SORTABLE_COLUMNS
}
