import type { ColumnDef } from '@tanstack/react-table'
import type { Investment } from '@/common/data/investment/types/investmentTypes.new'
import type { KPIConfig } from '@/common/data/investment/kpis/types'
import {
  EQUITY_KPI_CONFIG,
  LIQUID_FUND_KPI_CONFIG,
  REAL_ESTATE_KPI_CONFIG,
  GENERIC_INVESTMENT_KPI_CONFIG
} from '@/common/data/investment/kpis'
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
  /** Custom KPI configuration (if undefined, uses GENERIC_INVESTMENT_KPI_CONFIG) */
  kpiConfig?: KPIConfig
  /** Custom KPI hook name (if undefined, uses generic hook) */
  kpiHookName?: string
}

/**
 * Group-specific configurations for investment groups that need specialized behavior
 *
 * Any group NOT in this configuration will use:
 * - GenericInvestmentsList with base columns only
 * - GENERIC_INVESTMENT_KPI_CONFIG (4 basic KPIs)
 * - Generic KPI query hook
 *
 * This allows new groups added to catalog to work automatically with sensible defaults,
 * while preserving custom behavior for groups that need it.
 */
export const GROUP_CONFIGURATIONS: Record<string, GroupConfiguration> = {
  /**
   * Equity Investment Configuration
   * - Custom KPIs: MOIC, Duration, Market Value
   * - Extra columns: Market Value, Performance, Stake info, EBITDA
   */
  EQUITY: {
    kpiConfig: EQUITY_KPI_CONFIG,
    kpiHookName: 'useEquityKPIIntegration',
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
   * Real Estate Investment Configuration
   * - Custom KPIs: Market Value, Occupancy Rate
   * - Extra columns: Acquisition Date
   */
  REAL_ESTATE: {
    kpiConfig: REAL_ESTATE_KPI_CONFIG,
    kpiHookName: 'useRealEstateKPIIntegration',
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
   * Liquid Fund Investment Configuration
   * - Standard KPIs (same as generic: 4 basic metrics)
   * - Extra columns: Fund Type
   */
  LIQUID_FUND: {
    kpiConfig: LIQUID_FUND_KPI_CONFIG,
    kpiHookName: 'useLiquidFundKPIIntegration',
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

  // Future groups added to catalog (including Private Equity) will automatically use:
  // - GENERIC_INVESTMENT_KPI_CONFIG
  // - Base columns from GenericInvestmentsList
  // - Generic KPI query hook
}

/**
 * Get configuration for a specific investment group
 * Returns specialized config if defined, otherwise returns default generic config
 */
export const getGroupConfiguration = (groupCode: string): GroupConfiguration => {
  return (
    GROUP_CONFIGURATIONS[groupCode] || {
      kpiConfig: GENERIC_INVESTMENT_KPI_CONFIG,
      extraColumns: []
    }
  )
}
