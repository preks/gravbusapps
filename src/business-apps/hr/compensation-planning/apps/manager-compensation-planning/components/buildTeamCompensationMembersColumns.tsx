import React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Avatar, AvatarFallback, AvatarImage, Tooltip, TooltipContent, TooltipTrigger } from '@newwork/nw-design-system'
import type { TeamMemberCompensationData } from '../../../types/compensationPlanningTypes'
import { formatCurrency } from '@/common/utils/numberFormatter'
import { formatPercent } from '../../../utils/budgetCalculations'
import { formatDate } from '@/common/utils/windowUtils'
import { CompaRatioBar } from './CompaRatioBar'
import { formatPerformanceScoreDisplay } from '../../../utils/formatPerformanceScoreDisplay'
import { pictureThumbnailToDataUrl } from '../../../utils/pictureThumbnailDataUrl'

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
      size: 300,
      minSize: 220,
      maxSize: 560,
      meta: { type: 'text' },
      cell: ({ row }) => {
        const member = row.original
        const avatarSrc = pictureThumbnailToDataUrl(member.pictureThumbnail)
        return (
          <div className="gba:flex gba:items-start gba:gap-3 gba:min-w-0">
            <Avatar className="gba:h-9 gba:w-9 gba:mt-0.5 gba:flex-shrink-0">
              {avatarSrc ? <AvatarImage src={avatarSrc} alt={member.displayName} /> : null}
              <AvatarFallback className="gba:text-sm gba:font-medium">
                {(member.firstName?.[0] ?? '') + (member.lastName?.[0] ?? '')}
              </AvatarFallback>
            </Avatar>
            <div className="gba:min-w-0 gba:flex-1 gba:space-y-0.5">
              <div className="gba:font-medium gba:text-sm gba:text-foreground gba:leading-snug gba:break-words">
                {member.displayName}
              </div>
              <div className="gba:text-sm gba:text-muted-foreground gba:leading-snug gba:break-words">
                {member.jobPosition ?? '—'}
              </div>
            </div>
          </div>
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
          return <span className="gba:text-sm gba:text-muted-foreground gba:tabular-nums">{'—'}</span>
        }
        return (
          <div className="gba:space-y-0.5">
            <div className="gba:text-sm gba:font-medium gba:text-foreground gba:tabular-nums">
              {formatCurrency(member.currentAnnualSalary, member.currency)}
            </div>
            {(member.currentMonthlySalary != null || member.currentAnnualSalary == null) && (
              <div className="gba:text-sm gba:text-muted-foreground gba:tabular-nums">
                {formatCurrency(member.currentMonthlySalary, member.currency)}
                {member.currentMonthlySalary == null ? null : t('salary-monthly-suffix')}
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
      cell: ({ row }) => {
        const score = row.original.performanceOverallScore
        const max = row.original.performanceRatingScaleMax ?? 5
        if (score == null || Number.isNaN(score)) {
          return (
            <span className="gba:text-sm gba:text-muted-foreground" data-testid="team-compensation-performance-empty">
              {t('table-cell-empty')}
            </span>
          )
        }
        return (
          <span
            className="gba:text-sm gba:tabular-nums gba:text-foreground"
            data-testid="team-compensation-performance-score"
          >
            {t('performance-score-out-of', {
              score: formatPerformanceScoreDisplay(score),
              max: String(max)
            })}
          </span>
        )
      },
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
                      {member.lastRaisePercent == null ? '' : ` (${formatPercent(member.lastRaisePercent)})`}
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
