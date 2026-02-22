import React from 'react'
import { TrendUpIcon, BuildingsIcon, ChartPieIcon } from '@phosphor-icons/react'

/**
 * Get icon component for an investment group
 * Maps known investment groups to their visual icons
 *
 * @param groupCode - Investment group code (e.g., 'EQUITY', 'REAL_ESTATE', 'LIQUID_FUND')
 * @returns Icon component for the group
 */
export const getIconForGroup = (groupCode: string): React.ReactNode => {
  switch (groupCode) {
    case 'LIQUID_FUND':
      return <TrendUpIcon />
    case 'REAL_ESTATE':
      return <BuildingsIcon />
    case 'EQUITY':
      return <ChartPieIcon />
    case 'PRIVATE_EQUITY':
      return <ChartPieIcon /> // Similar to equity
    default:
      return <ChartPieIcon /> // Default icon for unknown groups
  }
}
