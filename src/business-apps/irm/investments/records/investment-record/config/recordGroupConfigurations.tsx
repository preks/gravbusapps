/**
 * Investment Record Group Configurations
 *
 * This file is the single source of truth for group-specific UI behavior in investment records.
 * It controls visual presentation (tabs, icons, labels) but NOT data field definitions.
 *
 * SEPARATION OF CONCERNS:
 * - This file: UI presentation (tabs, icons, category labels)
 * - investmentHeaderConfig.tsx: Data field definitions (catalog-driven with priority lookup)
 *
 * BASELINE TABS (all groups automatically receive):
 * - Home: Account, contacts, activities, notes, tasks, approvals
 * - Tiles: Configurable tile fields from catalog
 * - Divestments: Related divestment opportunities
 * - Documents: Document management
 * - Reports: Investment reports with dynamic columns
 *
 * ADDITIONAL TABS (configured per group):
 * - Analytics: KPI cards, performance charts (EQUITY only)
 * - Overview: Tiles + group-specific visualizations (EQUITY, REAL_ESTATE)
 *
 * TO ADD A NEW GROUP:
 * 1. Add catalog entry in Investment Groups catalog
 * 2. Group automatically gets baseline tabs
 * 3. (Optional) Add entry here for specialized tabs/icons/labels
 *
 * EXAMPLES:
 * - PRIVATE_EQUITY: No entry needed, uses baseline tabs automatically
 * - TEST: No entry needed, uses baseline tabs automatically
 * - EQUITY: Configured with Analytics + Overview tabs, custom icon and label
 * - REAL_ESTATE: Configured with Overview tab only, custom icon and label
 * - LIQUID_FUND: Configured with custom label only (baseline tabs)
 */

import React from 'react'
import { TrendUpIcon, HouseIcon } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

// Lazy load specialized components to avoid circular dependencies
const EquityOverviewContent = React.lazy(() =>
  import('../components/group-specific/EquityOverviewContent').then(m => ({ default: m.EquityOverviewContent }))
)
const RealEstateOverviewContent = React.lazy(() =>
  import('../components/group-specific/RealEstateOverviewContent').then(m => ({
    default: m.RealEstateOverviewContent
  }))
)
const EquityAnalyticsTab = React.lazy(() =>
  import('../components/group-specific/EquityAnalyticsTab').then(m => ({ default: m.default }))
)

/**
 * Configuration interface for investment record group-specific behavior
 */
export interface RecordGroupConfiguration {
  /** Additional tabs specific to this group (beyond baseline tabs) */
  additionalTabs?: Array<'analytics' | 'overview'>
  /** Overview tab content component (required if 'overview' in additionalTabs) */
  overviewContent?: React.ComponentType<any>
  /** Analytics tab content component (required if 'analytics' in additionalTabs) */
  analyticsContent?: React.ComponentType<any>
  /** Icon component for this investment group */
  icon?: Icon
  /** Category label displayed in record header */
  categoryLabel?: string
}

/**
 * Group-specific configurations for investment groups that need specialized behavior
 *
 * Any group NOT in this configuration will use:
 * - Baseline tabs only (Home, Tiles, Divestments, Documents, Reports)
 * - Generic icon (ChartBarIcon)
 * - Generic category label ('INVESTMENT')
 *
 * This allows new groups added to catalog to work automatically with sensible defaults,
 * while preserving custom behavior for groups that need it.
 */
export const RECORD_GROUP_CONFIGURATIONS: Record<string, RecordGroupConfiguration> = {
  /**
   * Equity Investment Configuration
   * - Adds: Analytics tab (MOIC/IRR KPIs, shareholder structure, liquidity preferences, PPM charts)
   * - Adds: Overview tab (tiles, investment rounds)
   * - Icon: TrendUpIcon (upward arrow)
   * - Label: "EQUITY INVESTMENT"
   *
   * Note: PRIVATE_EQUITY is intentionally NOT configured here and will use baseline tabs only
   */
  EQUITY: {
    additionalTabs: ['analytics', 'overview'],
    overviewContent: EquityOverviewContent,
    analyticsContent: EquityAnalyticsTab,
    icon: TrendUpIcon,
    categoryLabel: 'EQUITY INVESTMENT'
  },

  /**
   * Real Estate Investment Configuration
   * - Adds: Overview tab (tiles, liquidity forecast)
   * - Icon: HouseIcon
   * - Label: "REAL ESTATE INVESTMENT"
   */
  REAL_ESTATE: {
    additionalTabs: ['overview'],
    overviewContent: RealEstateOverviewContent,
    icon: HouseIcon,
    categoryLabel: 'REAL ESTATE INVESTMENT'
  },

  /**
   * Liquid Fund Investment Configuration
   * - No additional tabs (baseline only)
   * - Default icon (ChartBarIcon)
   * - Custom label: "LIQUID FUND INVESTMENT"
   */
  LIQUID_FUND: {
    categoryLabel: 'LIQUID FUND INVESTMENT'
  }

  // PRIVATE_EQUITY, TEST, and future groups automatically get:
  // - Baseline tabs only: Home, Tiles, Divestments, Documents, Reports
  // - Generic icon: ChartBarIcon
  // - Generic category label: 'INVESTMENT'
}

/**
 * Get configuration for a specific investment group
 * Returns specialized config if defined, otherwise returns empty config (uses defaults)
 *
 * @param groupCode - Investment group code (e.g., 'EQUITY', 'REAL_ESTATE', 'PRIVATE_EQUITY')
 * @returns Configuration object with optional specialized behavior
 */
export const getRecordGroupConfiguration = (groupCode: string): RecordGroupConfiguration => {
  return RECORD_GROUP_CONFIGURATIONS[groupCode] || {}
}
