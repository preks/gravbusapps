import React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { Investment } from '@/common/data/investment/types/investmentTypes.new'
import GenericInvestmentsList, { InvestmentListConfig } from '../shared/GenericInvestmentsList'
import { AcquisitionDateCell } from '../shared/cellRenderers'
import {
  MarketValueCell,
  PerformanceCell,
  StakeTypeCell,
  StakePercentageCell,
  PlannedExitDateCell,
  EbitdaCell
} from './EquityCellRenderers'

/**
 * Equity-specific extra columns
 */
const extraColumns: ColumnDef<Investment>[] = [
  {
    id: 'investmentMarketValue',
    header: 'Market Value',
    accessorKey: 'investmentMarketValue',
    cell: MarketValueCell,
    meta: {
      align: 'right'
    }
  },
  {
    id: 'performance',
    header: 'Performance',
    enableSorting: false,
    cell: PerformanceCell,
    meta: {
      align: 'right'
    }
  },
  {
    id: 'investmentStakeType',
    header: 'Stake Type',
    accessorKey: 'investmentStakeType',
    cell: StakeTypeCell
  },
  {
    id: 'stakePercentage',
    header: 'Stake %',
    accessorKey: 'stakePercentage',
    cell: StakePercentageCell
  },
  {
    id: 'acquisitionDate',
    header: 'Acquisition Date',
    accessorKey: 'acquisitionDate',
    size: 200,
    minSize: 180,
    maxSize: 220,
    enableResizing: false,
    meta: {
      type: 'date' as const
    },
    cell: AcquisitionDateCell
  },
  {
    id: 'plannedExitDate',
    header: 'Planned Exit',
    accessorKey: 'plannedExitDate',
    size: 150,
    minSize: 130,
    maxSize: 180,
    enableResizing: false,
    meta: {
      type: 'date' as const
    },
    cell: PlannedExitDateCell
  },
  {
    id: 'ebitda',
    header: 'EBITDA',
    enableSorting: false,
    cell: EbitdaCell,
    meta: {
      align: 'right'
    }
  }
]

/**
 * Configuration for Equity investments list
 */
const config: InvestmentListConfig = {
  investmentGroup: 'EQUITY',
  dataTestIdPrefix: 'equity-investment',
  defaultTypeLabel: 'Unknown',
  fromSubView: 'equity',
  extraColumns,
  emptyMessage: 'No equity investments found'
}

/**
 * Props for EquityInvestmentsList
 */
export interface EquityInvestmentsListProps extends BusinessAppContextProps {
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
 * Equity investments list component
 * Thin wrapper around GenericInvestmentsList with Equity specific configuration
 */
const EquityInvestmentsList: React.FC<EquityInvestmentsListProps> = props => {
  return <GenericInvestmentsList {...props} config={config} />
}

export default EquityInvestmentsList
