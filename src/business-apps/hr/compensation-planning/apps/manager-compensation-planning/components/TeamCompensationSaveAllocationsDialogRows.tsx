import React from 'react'
import { Checkbox } from '@newwork/nw-design-system'
import { formatCurrency } from '@/common/utils/numberFormatter'
import type { TeamMemberCompensationData } from '../../../types/compensationPlanningTypes'
import { roundMoney2 } from '../../../utils/budgetAmountPercentSync'
import { percentPointsOfPool } from './managerTeamDistributionFormat'

type Translate = (key: string, args?: Record<string, string | number>) => string
type TranslateBudget = (key: string, args?: Record<string, string | number>) => string

export interface TeamCompensationSaveAllocationsDialogRowsProps {
  sortedMembers: TeamMemberCompensationData[]
  allocationByEmployeeId: ReadonlyMap<string, number>
  selectedEmployeeIds: ReadonlySet<string>
  distributionPool: number | null
  poolOk: boolean
  currencyCode: string
  saving: boolean
  onToggle: (employeeId: string, checked: boolean) => void
  t: Translate
  tBudget: TranslateBudget
}

export function TeamCompensationSaveAllocationsDialogRows({
  sortedMembers,
  allocationByEmployeeId,
  selectedEmployeeIds,
  distributionPool,
  poolOk,
  currencyCode,
  saving,
  onToggle,
  t,
  tBudget
}: TeamCompensationSaveAllocationsDialogRowsProps) {
  return (
    <ul className="gba:divide-y gba:divide-border gba:rounded-md gba:border gba:border-border">
      {sortedMembers.map(m => {
        const amount = allocationByEmployeeId.get(m.employeeId) ?? 0
        const pct = poolOk && distributionPool != null ? percentPointsOfPool(amount, distributionPool) : null
        const checked = selectedEmployeeIds.has(m.employeeId)
        return (
          <li
            key={m.employeeId}
            className="gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2"
            data-testid={`manager-team-save-dialog-row-${m.employeeId}`}
          >
            <Checkbox
              checked={checked}
              onCheckedChange={v => onToggle(m.employeeId, v === true)}
              disabled={saving || !poolOk}
              aria-label={t('manager-team-save-dialog-checkbox-aria', { name: m.displayName })}
              data-testid={`manager-team-save-dialog-checkbox-${m.employeeId}`}
            />
            <div className="gba:min-w-0 gba:flex-1">
              <p className="gba:truncate gba:text-sm gba:font-medium gba:text-foreground">{m.displayName}</p>
              <p className="gba:text-xs gba:text-muted-foreground">
                {formatCurrency(roundMoney2(amount), currencyCode)}
                {pct != null ? ` · ${tBudget('budget-distribution-distribute-percent-of-pool', { percent: pct })}` : ''}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
