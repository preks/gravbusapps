import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { Investment } from '@/common/data/investment/types/investmentTypes.new'
import GenericInvestmentsList, { InvestmentListConfig } from '../shared/GenericInvestmentsList'
import { FundTypeCell } from './FundTypeCell'

/**
 * Configuration for Liquid Fund investments list
 */
const config: InvestmentListConfig = {
  investmentGroup: 'LIQUID_FUND',
  dataTestIdPrefix: 'liquid-fund-investment',
  defaultTypeLabel: 'Liquid Fund',
  fromSubView: 'liquid-funds',
  extraColumns: [
    {
      id: 'fundType',
      header: 'Fund Type',
      accessorKey: 'liquidFundInvestment.0.investmentLiquidFundType.value',
      enableSorting: false,
      cell: FundTypeCell
    }
  ],
  insertExtraColumnsAfter: 'afterType', // Insert Fund Type column right after Investment Type
  emptyMessage: 'No liquid fund investments found'
}

/**
 * Props for LiquidFundInvestmentsList
 */
export interface LiquidFundInvestmentsListProps extends BusinessAppContextProps {
  data: Investment[]
  loading?: boolean
  error?: string | null
  totalCount: number
  sorting?: Array<{ id: string; desc: boolean }>
  onSortingChange?: (sorting: Array<{ id: string; desc: boolean }>) => void
  pagination?: { pageIndex: number; pageSize: number }
  onPaginationChange?: (pagination: { pageIndex: number; pageSize: number }) => void
  visibleColumns?: string[]
}

/**
 * Liquid Fund investments list component
 * Thin wrapper around GenericInvestmentsList with Liquid Fund specific configuration
 */
const LiquidFundInvestmentsList: React.FC<LiquidFundInvestmentsListProps> = props => {
  return <GenericInvestmentsList {...props} config={config} />
}

export default LiquidFundInvestmentsList
