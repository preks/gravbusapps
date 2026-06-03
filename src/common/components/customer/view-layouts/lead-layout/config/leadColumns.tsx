/**
 * CRM-specific lead columns
 *
 * Extends common lead list columns with fields stored on the Lead entity (e.g. AI scores).
 */

import { Badge } from '@newwork/nw-design-system'
import type { ColumnDef } from '@tanstack/react-table'
import { formatScoreValue, getGradeBadgeVariant } from '@/common/utils/aiScoreDisplay'
import type { CustomerLead } from '@/common/data/customer/types/customerLeadTypes'

export const aiLeadScoreColumn: ColumnDef<CustomerLead> = {
  id: 'aiLeadScore',
  accessorFn: row => row.aiLeadScore ?? null,
  header: 'Lead Score',
  size: 160,
  minSize: 140,
  maxSize: 220,
  cell: ({ row }) => {
    const { aiLeadScore, aiLeadGrade } = row.original

    if ((aiLeadScore === null || aiLeadScore === undefined) && !aiLeadGrade) {
      return <span className="gba:text-sm gba:text-muted-foreground">Not scored</span>
    }

    return (
      <div className="gba:flex gba:flex-col gba:gap-1" data-testid={`lead-ai-score-${row.original.id}`}>
        <span className="gba:font-medium gba:text-sm">{formatScoreValue(aiLeadScore)}</span>
        <Badge variant={getGradeBadgeVariant(aiLeadGrade)}>{aiLeadGrade || 'N/A'}</Badge>
      </div>
    )
  }
}

export const CUSTOMER_LEAD_ADDITIONAL_COLUMNS: ColumnDef<CustomerLead>[] = [aiLeadScoreColumn]

export const insertCustomerLeadColumnsAfter = <T extends CustomerLead>(
  baseColumns: ColumnDef<T>[],
  afterColumnId: string = 'lead'
): ColumnDef<T>[] => {
  const insertIndex = baseColumns.findIndex(col => col.id === afterColumnId)
  const columnsToInsert = CUSTOMER_LEAD_ADDITIONAL_COLUMNS as ColumnDef<T>[]

  if (insertIndex >= 0) {
    return [...baseColumns.slice(0, insertIndex + 1), ...columnsToInsert, ...baseColumns.slice(insertIndex + 1)]
  }

  return [...baseColumns, ...columnsToInsert]
}
