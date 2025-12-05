/**
 * CRM-specific opportunity columns
 *
 * This file contains all customer/CRM-specific columns that extend the base opportunity columns.
 * Add new CRM-specific columns here to keep them centralized and reusable.
 */

import { Badge } from '@newwork/nw-design-system'
import type { ColumnDef } from '@tanstack/react-table'
import { getWinningChanceBadgeVariant } from '@/common/utils/badgeUtils'
import type { CustomerOpportunity } from '@/common/data/customer/types/customerOpportunityTypes'

// ============================================================================
// Column Definitions
// ============================================================================

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
export const CUSTOMER_OPPORTUNITY_ADDITIONAL_COLUMNS: ColumnDef<CustomerOpportunity>[] = [winningChanceColumn]

/**
 * Column IDs to extend visible columns by default in CRM views.
 */
export const CUSTOMER_OPPORTUNITY_EXTENDED_COLUMN_IDS: string[] = ['winningChance']

/**
 * Sortable column metadata for CRM-specific columns.
 */
export const CUSTOMER_OPPORTUNITY_SORTABLE_COLUMNS = [{ id: 'winningChance', label: 'Winning Chance' }]

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
