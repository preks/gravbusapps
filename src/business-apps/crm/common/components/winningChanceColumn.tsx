import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@newwork/nw-design-system'
import { getWinningChanceBadgeVariant } from '@/common/utils/badgeUtils'

/**
 * CRM-specific Winning Chance column definition
 * This column is only used in CRM contexts, not in IRM
 */
export interface WinningChanceOpportunity {
  id: string
  winningChance?: number | null
}

export const createWinningChanceColumn = <T extends WinningChanceOpportunity>(): ColumnDef<T> => ({
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
})
