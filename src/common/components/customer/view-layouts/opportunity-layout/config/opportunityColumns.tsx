/**
 * CRM-specific opportunity columns
 *
 * This file contains all customer/CRM-specific columns that extend the base opportunity columns.
 * Add new CRM-specific columns here to keep them centralized and reusable.
 */

import { Badge } from '@newwork/nw-design-system'
import type { ColumnDef } from '@tanstack/react-table'
import { formatScoreValue, getGradeBadgeVariant } from '@/common/utils/aiScoreDisplay'
import { getWinningChanceBadgeVariant } from '@/common/utils/badgeUtils'
import type { CustomerOpportunity } from '@/common/data/customer/types/customerOpportunityTypes'

// ============================================================================
// Column Definitions
// ============================================================================

/**
 * AI opportunity score column — persisted score and grade from CRM
 */
export const aiOpportunityScoreColumn: ColumnDef<CustomerOpportunity> = {
  id: 'aiOpportunityScore',
  accessorFn: row => row.aiOpportunityScore ?? null,
  header: 'Opportunity Score',
  size: 160,
  minSize: 140,
  maxSize: 220,
  cell: ({ row }) => {
    const { aiOpportunityScore, aiOpportunityGrade } = row.original

    if ((aiOpportunityScore === null || aiOpportunityScore === undefined) && !aiOpportunityGrade) {
      return <span className="gba:text-sm gba:text-muted-foreground">Not scored</span>
    }

    return (
      <div className="gba:flex gba:flex-col gba:gap-1" data-testid={`opportunity-ai-score-${row.original.id}`}>
        <span className="gba:font-medium gba:text-sm">{formatScoreValue(aiOpportunityScore)}</span>
        <Badge variant={getGradeBadgeVariant(aiOpportunityGrade)}>{aiOpportunityGrade || 'N/A'}</Badge>
      </div>
    )
  }
}

/**
 * Winning Chance column - displays opportunity win probability as percentage
 */
export const winningChanceColumn: ColumnDef<CustomerOpportunity> = {
  id: 'winningChance',
  accessorKey: 'winningChance',
  header: 'Winning Chance',
  size: 140,
  minSize: 120,
  maxSize: 180,
  cell: ({ row }) => {
    const winningChance = row.original.winningChance
    if (winningChance === undefined || winningChance === null) {
      return <span className="gba:text-sm gba:text-muted-foreground">Not set</span>
    }
    return (
      <Badge
        variant={getWinningChanceBadgeVariant(winningChance)}
        data-testid={`opportunity-winning-chance-${row.original.id}`}
      >
        {winningChance}%
      </Badge>
    )
  }
}

// ============================================================================
// Column Registry
// ============================================================================

/**
 * All additional columns specific to CRM opportunities.
 */
export const CUSTOMER_OPPORTUNITY_ADDITIONAL_COLUMNS: ColumnDef<CustomerOpportunity>[] = [
  aiOpportunityScoreColumn,
  winningChanceColumn
]

/**
 * Column IDs to extend visible columns by default in CRM views.
 */
export const CUSTOMER_OPPORTUNITY_EXTENDED_COLUMN_IDS: string[] = ['aiOpportunityScore', 'winningChance']

/**
 * Sortable column metadata for CRM-specific columns.
 */
export const CUSTOMER_OPPORTUNITY_SORTABLE_COLUMNS = [
  { id: 'aiOpportunityScore', label: 'Opportunity Score' },
  { id: 'winningChance', label: 'Winning Chance' }
]

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Insert CRM columns after a specific base column (e.g., after 'amount')
 */
export const insertCustomerColumnsAfter = <T extends CustomerOpportunity>(
  baseColumns: ColumnDef<T>[],
  afterColumnId: string = 'amount'
): ColumnDef<T>[] => {
  const insertIndex = baseColumns.findIndex(col => col.id === afterColumnId)
  const columnsToInsert = CUSTOMER_OPPORTUNITY_ADDITIONAL_COLUMNS as ColumnDef<T>[]

  if (insertIndex >= 0) {
    return [...baseColumns.slice(0, insertIndex + 1), ...columnsToInsert, ...baseColumns.slice(insertIndex + 1)]
  }
  return [...baseColumns, ...columnsToInsert]
}
