import type { ColumnDef } from '@tanstack/react-table'
import type { Investment } from '@/common/data/investment/types/investmentTypes.new'
import { AcquisitionDateCell } from '../data/shared/cellRenderers'
import { FundTypeCell } from '../data/liquid-fund-data/FundTypeCell'
import {
  MarketValueCell,
  PerformanceCell,
  StakeTypeCell,
  StakePercentageCell,
  PlannedExitDateCell,
  EbitdaCell
} from '../data/equity-data/EquityCellRenderers'

/**
 * Configuration for an investment group including UI customizations
 */
export interface GroupConfiguration {
  /** Extra columns specific to this group */
  extraColumns?: ColumnDef<Investment>[]
}

/**
 * Group-specific configurations for investment groups that need specialized behavior
 *
 * Any group NOT in this configuration will use:
 * - GenericInvestmentsList with base columns only
 *
 * Investment View KPI cards are shared (`INVESTMENT_VIEW_KPI_CONFIG` in `InvestmentView.tsx`).
 * Analytics tabs keep their own KPI configs and hooks.
 */
export const GROUP_CONFIGURATIONS: Record<string, GroupConfiguration> = {
  /**
   * Equity — extra columns: market value, performance, stake, EBITDA, dates
   */
  EQUITY: {
    extraColumns: [
      {
        id: 'investmentMarketValue',
        header: 'Market Value',
        accessorKey: 'investmentMarketValue',
        cell: MarketValueCell,
        meta: { align: 'right' }
      },
      {
        id: 'performance',
        header: 'Performance',
        enableSorting: false,
        cell: PerformanceCell,
        meta: { align: 'right' }
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
        meta: { type: 'date' as const },
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
        meta: { type: 'date' as const },
        cell: PlannedExitDateCell
      },
      {
        id: 'ebitda',
        header: 'EBITDA',
        enableSorting: false,
        cell: EbitdaCell,
        meta: { align: 'right' }
      }
    ]
  },

  /**
   * Real estate — extra columns: acquisition date
   */
  REAL_ESTATE: {
    extraColumns: [
      {
        id: 'acquisitionDate',
        header: 'Acquisition Date',
        accessorKey: 'acquisitionDate',
        size: 150,
        minSize: 130,
        maxSize: 180,
        enableResizing: false,
        meta: { type: 'date' as const },
        cell: AcquisitionDateCell
      }
    ]
  },

  /**
   * Liquid fund — extra columns: fund type
   */
  LIQUID_FUND: {
    extraColumns: [
      {
        id: 'fundType',
        header: 'Fund Type',
        accessorKey: 'liquidFundInvestment.0.investmentLiquidFundType.value',
        enableSorting: false,
        cell: FundTypeCell
      }
    ]
  }
}

const DEFAULT_GROUP_CONFIGURATION: GroupConfiguration = {
  extraColumns: []
}

/**
 * Get configuration for a specific investment group (table columns, etc.)
 */
export const getGroupConfiguration = (groupCode: string): GroupConfiguration => {
  return GROUP_CONFIGURATIONS[groupCode] || DEFAULT_GROUP_CONFIGURATION
}
