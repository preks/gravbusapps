import React, { useCallback } from 'react'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  useTranslation
} from '@newwork/nw-design-system'
import { CalendarIcon, TrendUpIcon, ClockIcon } from '@phosphor-icons/react'
import type { TeamMemberCompensationData } from '../../../types/compensationPlanningTypes'
import { formatCurrency, formatLocaleInteger, formatPercent } from '../../../utils/budgetCalculations'
import { formatDate } from '@/common/utils/windowUtils'
import { CompaRatioBar } from './CompaRatioBar'
import { PerformanceBadge } from './PerformanceBadge'
import { SortableTableHead } from '@/business-apps/hr/core/apps/assets/components/SortableTableHead'
import type { ManagerTeamSortField } from '../hooks/useManagerPlanningStore'
import translations from '../_i18n'

interface TeamAllocationGridProps {
  members: TeamMemberCompensationData[]
  sortField: ManagerTeamSortField
  currentSortOrder: 'ASC' | 'DESC'
  onSort: (field: string, order: 'ASC' | 'DESC' | '') => void
}

/** Match Assets table header density (AssetTable column widths + nowrap). */
const head = (extra = '') => `gba:whitespace-nowrap gba:text-xs gba:font-medium gba:text-muted-foreground ${extra}`

export const TeamAllocationGrid: React.FC<TeamAllocationGridProps> = ({
  members,
  sortField,
  currentSortOrder,
  onSort
}) => {
  const { t } = useTranslation(translations)

  const tenure = useCallback(
    (hireDate: string | null): string => {
      if (!hireDate) return '—'
      const diff = Date.now() - new Date(hireDate).getTime()
      const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
      const months = Math.floor((diff % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30))
      const y = formatLocaleInteger(years)
      const m = formatLocaleInteger(months)
      if (years === 0) return t('tenure-m', { months: m })
      if (months === 0) return t('tenure-y', { years: y })
      return t('tenure-ym', { years: y, months: m })
    },
    [t]
  )

  return (
    <TooltipProvider>
      <div className="gba:border gba:rounded-lg" data-testid="manager-team-table-container">
        <div className="gba:overflow-x-auto">
          <h2 className="gba:sr-only">{t('table-section-title')}</h2>
          <Table className="gba:text-sm" data-testid="manager-team-table">
            <TableHeader>
              <TableRow>
                <SortableTableHead
                  field="displayName"
                  currentSortField={sortField}
                  currentSortOrder={currentSortOrder}
                  onSort={onSort}
                  className={head('gba:min-w-[220px] gba:pl-4')}
                >
                  {t('col-employee')}
                </SortableTableHead>
                <SortableTableHead
                  field="jobLevel"
                  currentSortField={sortField}
                  currentSortOrder={currentSortOrder}
                  onSort={onSort}
                  className={head('gba:min-w-[120px]')}
                >
                  {t('col-level')}
                </SortableTableHead>
                <SortableTableHead
                  field="hireDate"
                  currentSortField={sortField}
                  currentSortOrder={currentSortOrder}
                  onSort={onSort}
                  className={head('gba:min-w-[100px]')}
                >
                  {t('col-tenure')}
                </SortableTableHead>
                <SortableTableHead
                  field="currentAnnualSalary"
                  currentSortField={sortField}
                  currentSortOrder={currentSortOrder}
                  onSort={onSort}
                  className={head('gba:min-w-[130px]')}
                >
                  {t('col-current-salary')}
                </SortableTableHead>
                <SortableTableHead
                  field="compaRatio"
                  currentSortField={sortField}
                  currentSortOrder={currentSortOrder}
                  onSort={onSort}
                  className={head('gba:min-w-[160px]')}
                >
                  {t('col-band-position')}
                </SortableTableHead>
                <SortableTableHead
                  field="performanceRatingNumeric"
                  currentSortField={sortField}
                  currentSortOrder={currentSortOrder}
                  onSort={onSort}
                  className={head('gba:min-w-[120px]')}
                >
                  {t('col-performance')}
                </SortableTableHead>
                <SortableTableHead
                  field="lastRaiseDate"
                  currentSortField={sortField}
                  currentSortOrder={currentSortOrder}
                  onSort={onSort}
                  className={head('gba:min-w-[140px]')}
                >
                  {t('col-last-raise')}
                </SortableTableHead>
                <SortableTableHead
                  field="currentBonusTotal"
                  currentSortField={sortField}
                  currentSortOrder={currentSortOrder}
                  onSort={onSort}
                  className={head('gba:min-w-[100px] gba:text-right')}
                >
                  {t('col-bonuses-ytd')}
                </SortableTableHead>
                <SortableTableHead
                  field="currentBenefitsTotal"
                  currentSortField={sortField}
                  currentSortOrder={currentSortOrder}
                  onSort={onSort}
                  className={head('gba:min-w-[100px] gba:text-right gba:pr-4')}
                >
                  {t('col-benefits')}
                </SortableTableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="gba:text-center gba:py-14 gba:text-sm gba:text-muted-foreground">
                    {t('table-empty')}
                  </TableCell>
                </TableRow>
              ) : (
                members.map(member => (
                  <TableRow key={member.employeeId} className="gba:border-b gba:border-border gba:hover:bg-muted/40">
                    <TableCell className="gba:align-top gba:py-3 gba:pl-4">
                      <div className="gba:flex gba:items-center gba:gap-3">
                        <Avatar className="gba:h-9 gba:w-9 gba:flex-shrink-0">
                          {member.pictureThumbnail ? <AvatarImage src={member.pictureThumbnail} alt="" /> : null}
                          <AvatarFallback className="gba:text-xs gba:font-medium">
                            {(member.firstName?.[0] ?? '') + (member.lastName?.[0] ?? '')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="gba:min-w-0">
                          <div className="gba:font-medium gba:text-foreground gba:leading-tight gba:truncate">
                            {member.displayName}
                          </div>
                          <div className="gba:text-xs gba:text-muted-foreground gba:truncate gba:mt-0.5">
                            {member.jobPosition ?? '—'}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="gba:align-top gba:py-3 gba:text-muted-foreground">
                      <span className="gba:text-xs gba:font-mono">{member.jobLevel ?? '—'}</span>
                    </TableCell>
                    <TableCell className="gba:align-top gba:py-3">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="gba:text-xs gba:text-muted-foreground gba:inline-flex gba:items-center gba:gap-1">
                            <ClockIcon size={12} className="gba:flex-shrink-0" aria-hidden />
                            {tenure(member.hireDate)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {member.hireDate ? t('hire-tooltip', { date: member.hireDate }) : t('hire-unknown')}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="gba:align-top gba:py-3">
                      <div className="gba:space-y-0.5">
                        <div className="gba:font-medium gba:text-foreground gba:tabular-nums">
                          {formatCurrency(member.currentAnnualSalary, member.currency)}
                        </div>
                        <div className="gba:text-xs gba:text-muted-foreground gba:tabular-nums">
                          {formatCurrency(member.currentMonthlySalary, member.currency)}
                          {t('salary-monthly-suffix')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="gba:align-top gba:py-3 gba:min-w-40">
                      <CompaRatioBar
                        compaRatio={member.compaRatio}
                        band={member.compensationBand}
                        currentSalary={member.currentAnnualSalary}
                      />
                    </TableCell>
                    <TableCell className="gba:align-top gba:py-3">
                      <PerformanceBadge
                        rating={member.performanceRating}
                        numericRating={member.performanceRatingNumeric}
                      />
                    </TableCell>
                    <TableCell className="gba:align-top gba:py-3">
                      <div className="gba:space-y-1">
                        {member.lastRaiseDate ? (
                          <>
                            <div className="gba:flex gba:items-center gba:gap-1 gba:text-sm gba:font-medium gba:text-foreground">
                              <CalendarIcon
                                size={12}
                                className="gba:flex-shrink-0 gba:text-muted-foreground"
                                aria-hidden
                              />
                              <span className="gba:tabular-nums">
                                {formatDate(member.lastRaiseDate, 'date.medium') ?? member.lastRaiseDate}
                              </span>
                            </div>
                            {member.lastRaiseAmount != null && (
                              <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground">
                                <TrendUpIcon size={12} className="gba:flex-shrink-0" aria-hidden />
                                <span className="gba:tabular-nums">
                                  {formatCurrency(member.lastRaiseAmount, member.currency)}
                                  {member.lastRaisePercent != null
                                    ? ` (${formatPercent(member.lastRaisePercent)})`
                                    : ''}
                                </span>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground">
                            <CalendarIcon size={12} className="gba:flex-shrink-0" aria-hidden />
                            {t('tenure-never-raise')}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="gba:align-top gba:py-3 gba:text-right gba:tabular-nums">
                      {formatCurrency(member.currentBonusTotal, member.currency)}
                    </TableCell>
                    <TableCell className="gba:align-top gba:py-3 gba:text-right gba:pr-4 gba:tabular-nums">
                      {formatCurrency(member.currentBenefitsTotal, member.currency)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </TooltipProvider>
  )
}
