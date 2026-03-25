import React from 'react'
import type { CellContext } from '@tanstack/react-table'
import type { Investment } from '@/common/data/investment/types/investmentTypes.new'

/**
 * Cell renderer: Fund Type cell (Liquid Fund specific)
 */
export const FundTypeCell = ({ row }: CellContext<Investment, unknown>) => {
  const fundType = row.original.liquidFundInvestment?.[0]?.investmentLiquidFundType?.value
  if (!fundType) {
    return <span className="gba:text-sm gba:text-muted-foreground">-</span>
  }
  return (
    <span className="gba:text-sm gba:truncate gba:block" title={fundType}>
      {fundType}
    </span>
  )
}
