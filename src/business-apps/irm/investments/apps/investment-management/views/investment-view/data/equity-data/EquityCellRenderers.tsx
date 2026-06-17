import React from 'react'
import type { CellContext } from '@tanstack/react-table'
import type { Investment } from '@/common/data/investment/types/investmentTypes.new'
import { CalendarIcon } from '@phosphor-icons/react'
import { formatDate } from '@/common/data/investment/utils/formatters'
import { getPerformanceColorClass, getPerformanceSign, renderAmount } from '../shared/cellRenderers'

/**
 * Cell renderer: Market Value cell (Equity specific)
 */
export const MarketValueCell = ({ row }: CellContext<Investment, unknown>) =>
  renderAmount(row.original.investmentMarketValue, row.original.currency?.code)

/**
 * Cell renderer: Performance cell (Equity specific)
 */
export const PerformanceCell = ({ row }: CellContext<Investment, unknown>) => {
  const currentValue = row.original.investmentMarketValue || 0
  const totalValue = row.original.totalInvestmentAmount || 0
  const performanceAmount = currentValue - totalValue
  const performancePercentage = totalValue > 0 ? (performanceAmount / totalValue) * 100 : 0
  const isZero = performancePercentage === 0
  const isPositive = performancePercentage > 0

  const formattedValue = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: row.original.currency?.code || 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 20
  }).format(Math.abs(performanceAmount))

  const sign = getPerformanceSign(isZero, isPositive)

  return (
    <div className="gba:flex gba:flex-col gba:items-end">
      <div
        className={`gba:text-right gba:text-sm gba:font-mono gba:truncate ${getPerformanceColorClass(performancePercentage, 'amount')}`}
      >
        {formattedValue}
      </div>
      <span className={`${getPerformanceColorClass(performancePercentage, 'percentage')} gba:text-sm`}>
        ({sign}
        {Math.abs(performancePercentage).toFixed(2)}%)
      </span>
    </div>
  )
}

/**
 * Cell renderer: Stake Type cell (Equity specific)
 */
export const StakeTypeCell = ({ row }: CellContext<Investment, unknown>) => {
  const stakeTypeValue = row.original.investmentStakeType?.value || 'Unknown'
  return (
    <span className="gba:text-sm gba:truncate gba:block" title={stakeTypeValue}>
      {stakeTypeValue}
    </span>
  )
}

/**
 * Cell renderer: Stake Percentage cell (Equity specific)
 */
export const StakePercentageCell = ({ row }: CellContext<Investment, unknown>) => (
  <div className="gba:flex gba:items-center gba:gap-2">
    <span>{row.original.stakePercentage ? `${row.original.stakePercentage}%` : 'N/A'}</span>
  </div>
)

/**
 * Cell renderer: Planned Exit Date cell (Equity specific)
 */
export const PlannedExitDateCell = ({ row }: CellContext<Investment, unknown>) => {
  if (!row.original.plannedExitDate) {
    return <span className="gba:text-sm gba:text-muted-foreground">No date</span>
  }
  return (
    <div className="gba:flex gba:items-center gba:gap-2 gba:truncate">
      <CalendarIcon className="gba:h-4 gba:w-4 gba:text-gray-400 gba:shrink-0" />
      <span className="gba:text-sm gba:truncate">{formatDate(row.original.plannedExitDate)}</span>
    </div>
  )
}

/**
 * Cell renderer: EBITDA cell (Equity specific)
 */
export const EbitdaCell = ({ row }: CellContext<Investment, unknown>) => {
  const equityInvestment = Array.isArray(row.original.equityInvestment)
    ? row.original.equityInvestment[0]
    : row.original.equityInvestment
  const ebitdaAmount = equityInvestment?.ebitdaAmount

  if (!ebitdaAmount) return <span className="gba:text-gray-400">N/A</span>

  return renderAmount(ebitdaAmount, row.original.currency?.code)
}
