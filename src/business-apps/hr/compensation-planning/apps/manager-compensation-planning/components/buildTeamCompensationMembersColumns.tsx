import React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Avatar, AvatarFallback, AvatarImage, Tooltip, TooltipContent, TooltipTrigger } from '@newwork/nw-design-system'
import type { TeamMemberCompensationData } from '../../../types/compensationPlanningTypes'
import { formatCurrency, formatPercent } from '../../../utils/budgetCalculations'
import { formatDate } from '@/common/utils/windowUtils'
import { CompaRatioBar } from './CompaRatioBar'

export type TeamMemberTableRow = TeamMemberCompensationData & { id: string }

type Translate = (id: string, args?: Record<string, string | number>) => string

export function buildTeamCompensationMembersColumns(
  t: Translate,
  tenure: (hireDate: string | null) => string
): ColumnDef<TeamMemberTableRow>[] {
  return [
    {
      id: 'displayName',
      accessorKey: 'displayName',
      header: t('col-employee'),
      meta: { type: 'text' },
      cell: ({ row }) => {
        const member = row.original
        return (
          <div className="gba:flex gba:items-center gba:gap-3">
            <Avatar className="gba:h-9 gba:w-9 gba:flex-shrink-0">
              {member.pictureThumbnail ? <AvatarImage src={member.pictureThumbnail} alt="" /> : null}
              <AvatarFallback className="gba:text-sm gba:font-medium">
                {(member.firstName?.[0] ?? '') + (member.lastName?.[0] ?? '')}
              </AvatarFallback>
            </Avatar>
            <div className="gba:min-w-0">
              <div className="gba:font-medium gba:text-sm gba:text-foreground gba:leading-tight gba:truncate">
                {member.displayName}
              </div>
              <div className="gba:text-sm gba:text-muted-foreground gba:truncate gba:mt-0.5">
                {member.jobPosition ?? '—'}
              </div>
            </div>
          </div>
        )
      }
    },
    {
      id: 'jobLevel',
      accessorKey: 'jobLevel',
      header: t('col-level'),
      meta: { type: 'text' },
      cell: ({ getValue }) => {
        const v = getValue() as string | null | undefined
        return (
          <span className="gba:font-mono gba:text-sm gba:text-muted-foreground">
            {v?.trim() ? v : t('table-cell-empty')}
          </span>
        )
      }
    },
    {
      id: 'hireDate',
      accessorKey: 'hireDate',
      header: t('col-tenure'),
      cell: ({ row }) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="gba:text-sm gba:text-muted-foreground gba:cursor-default gba:inline-block">
              {tenure(row.original.hireDate)}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {row.original.hireDate
              ? t('hire-tooltip', {
                  date: formatDate(row.original.hireDate, 'date.short') ?? row.original.hireDate
                })
              : t('hire-unknown')}
          </TooltipContent>
        </Tooltip>
      ),
      meta: { type: 'date' }
    },
    {
      id: 'currentAnnualSalary',
      accessorKey: 'currentAnnualSalary',
      header: t('col-current-salary'),
      meta: { align: 'right', type: 'currency' },
      cell: ({ row }) => {
        const member = row.original
        if (member.currentAnnualSalary == null && member.currentMonthlySalary == null) {
          return (
            <span className="gba:text-sm gba:text-muted-foreground gba:tabular-nums">
              {formatCurrency(null, member.currency)}
            </span>
          )
        }
        return (
          <div className="gba:space-y-0.5">
            <div className="gba:text-sm gba:font-medium gba:text-foreground gba:tabular-nums">
              {formatCurrency(member.currentAnnualSalary, member.currency)}
            </div>
            {(member.currentMonthlySalary != null || member.currentAnnualSalary == null) && (
              <div className="gba:text-sm gba:text-muted-foreground gba:tabular-nums">
                {formatCurrency(member.currentMonthlySalary, member.currency)}
                {member.currentMonthlySalary != null ? t('salary-monthly-suffix') : null}
              </div>
            )}
          </div>
        )
      }
    },
    {
      id: 'compaRatio',
      accessorKey: 'compaRatio',
      header: t('col-band-position'),
      cell: ({ row }) => (
        <div className="gba:min-w-40">
          <CompaRatioBar
            compaRatio={row.original.compaRatio}
            band={row.original.compensationBand}
            currentSalary={row.original.currentAnnualSalary}
          />
        </div>
      ),
      meta: { type: 'text' }
    },
    {
      id: 'performance',
      header: t('col-performance'),
      enableSorting: false,
      cell: () => (
        <span className="gba:text-sm gba:text-muted-foreground" data-testid="team-compensation-performance-placeholder">
          {t('table-cell-empty')}
        </span>
      ),
      meta: { type: 'text' }
    },
    {
      id: 'lastRaiseDate',
      accessorKey: 'lastRaiseDate',
      header: t('col-last-raise'),
      cell: ({ row }) => {
        const member = row.original
        return (
          <div className="gba:space-y-1">
            {member.lastRaiseDate ? (
              <>
                <div className="gba:text-sm gba:font-medium gba:text-foreground">
                  <span className="gba:tabular-nums">
                    {formatDate(member.lastRaiseDate, 'date.short') ?? member.lastRaiseDate}
                  </span>
                </div>
                {member.lastRaiseAmount != null && (
                  <div className="gba:text-sm gba:text-muted-foreground">
                    <span className="gba:tabular-nums">
                      {formatCurrency(member.lastRaiseAmount, member.currency)}
                      {member.lastRaisePercent != null ? ` (${formatPercent(member.lastRaisePercent)})` : ''}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <span className="gba:text-sm gba:text-muted-foreground">{t('tenure-never-raise')}</span>
            )}
          </div>
        )
      },
      meta: { type: 'date' }
    },
    {
      id: 'currentBonusTotal',
      accessorKey: 'currentBonusTotal',
      header: t('col-bonuses-ytd'),
      meta: { align: 'right', type: 'currency' },
      cell: ({ row }) => (
        <span className="gba:text-sm gba:tabular-nums">
          {formatCurrency(row.original.currentBonusTotal, row.original.currency)}
        </span>
      )
    }
  ]
}
