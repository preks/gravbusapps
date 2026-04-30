import { useMemo } from 'react'
import type {
  InvestmentColumnOption,
  InvestmentListColumnConfiguration
} from '../utils/investmentListColumnTransformer'
import { getInvestmentViewAvailableColumns, getInvestmentViewSortableColumns } from '../utils/investmentViewColumns'

export const useInvestmentViewColumns = (
  currentSection: string,
  dynamicColumnConfigByTab: Record<string, InvestmentListColumnConfiguration>
): { availableColumns: InvestmentColumnOption[]; sortableColumns: InvestmentColumnOption[] } => {
  const availableColumns = useMemo(
    () => getInvestmentViewAvailableColumns(currentSection, dynamicColumnConfigByTab),
    [currentSection, dynamicColumnConfigByTab]
  )
  const sortableColumns = useMemo(
    () => getInvestmentViewSortableColumns(currentSection, dynamicColumnConfigByTab),
    [currentSection, dynamicColumnConfigByTab]
  )

  return { availableColumns, sortableColumns }
}
