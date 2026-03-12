import React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Avatar, AvatarFallback } from '@newwork/nw-design-system'
import { TrendDownIcon } from '@phosphor-icons/react'
import type { InvestmentOpportunity } from '@/common/data/investment/types/investmentOpportunityTypes'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'

const DivestmentCell: React.FC<{ opportunity: InvestmentOpportunity }> = ({ opportunity }) => {
  if (!opportunity.divestment) {
    return <span className="gba:text-sm gba:text-muted-foreground">No divestment</span>
  }

  const { divestment } = opportunity
  const investmentRecordUrl = buildPlatformUrl('/platform/irm/investment-record', {
    investmentId: divestment.id
  })

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigateTo(investmentRecordUrl)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="gba:flex gba:items-center gba:gap-3 gba:cursor-pointer gba:group gba:bg-transparent gba:border-0 gba:p-0 gba:w-full gba:text-left"
      data-testid={`opportunity-divestment-link-${opportunity.id}`}
    >
      <Avatar className="gba:w-8 gba:h-8 gba:outline-2 gba:outline-offset-2 gba:outline-transparent gba:group-hover:[outline-color:var(--nw-color-primary-500)] gba:transition-all">
        <AvatarFallback>
          <TrendDownIcon className="gba:h-4 gba:w-4" />
        </AvatarFallback>
      </Avatar>
      <div className="gba:min-w-0 gba:flex-1">
        <div className="gba:font-medium gba:truncate gba:text-sm gba:group-hover:gba:text-primary gba:transition-colors">
          {divestment.name}
        </div>
      </div>
    </button>
  )
}

const DivestmentCellRenderer = ({ row }: any) => <DivestmentCell opportunity={row.original as InvestmentOpportunity} />

export const createDivestmentColumn = (): ColumnDef<any> => ({
  id: 'divestment',
  accessorFn: (row: any) => (row.divestment?.name || '') as string,
  header: 'Divestment',
  size: 200,
  minSize: 180,
  maxSize: 280,
  cell: DivestmentCellRenderer
})

export const insertDivestmentColumn = <T,>(baseColumns: ColumnDef<T>[], afterColumnId: string): ColumnDef<T>[] => {
  const divestmentColumn = createDivestmentColumn() as ColumnDef<T>
  const targetIndex = baseColumns.findIndex(col => col.id === afterColumnId)
  if (targetIndex >= 0) {
    return [...baseColumns.slice(0, targetIndex + 1), divestmentColumn, ...baseColumns.slice(targetIndex + 1)]
  }
  return [...baseColumns, divestmentColumn]
}
