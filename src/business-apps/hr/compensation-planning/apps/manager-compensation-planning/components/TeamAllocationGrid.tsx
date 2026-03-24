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
import type { TeamMemberCompensationData } from '../../../types/compensationPlanningTypes'
import { formatCurrency, formatPercent } from '../../../utils/budgetCalculations'
import { formatTenureSinceHireDate } from '@/business-apps/hr/core/utils/formatTenureSinceHireDate'
import { formatDate } from '@/common/utils/windowUtils'
import { CompaRatioBar } from './CompaRatioBar'
import { SortableTableHead } from '@/business-apps/hr/core/apps/assets/components/SortableTableHead'
import type { ManagerTeamSortField } from '../hooks/useManagerPlanningStore'
import translations from '../_i18n'

interface TeamAllocationGridProps {
  members: TeamMemberCompensationData[]
  sortField: ManagerTeamSortField
  currentSortOrder: 'ASC' | 'DESC'
  onSort: (field: string, order: 'ASC' | 'DESC' | '') => void
}

/** Match Assets table: header widths + nowrap; typography from TableHead defaults. */
const head = (extra = '') => `gba:whitespace-nowrap ${extra}`

export const TeamAllocationGrid: React.FC<TeamAllocationGridProps> = ({
  members,
  sortField,
  currentSortOrder,
  onSort
}) => {
  const { t } = useTranslation(translations)

  const tenure = useCallback(
    (hireDate: string | null): string =>
      formatTenureSinceHireDate(hireDate, {
        year: t('profile-header-year'),
        years: t('profile-header-years'),
        month: t('profile-header-month'),
        months: t('profile-header-months')
      }) ?? '-',
    [t]
  )

  return (
    <TooltipProvider>
      <div className="gba:border gba:rounded-lg" data-testid="manager-team-table-container">
        <div className="gba:overflow-x-auto">
          <h2 className="gba:sr-only">{t('table-section-title')}</h2>
          <Table data-testid="manager-team-table">
            <TableHeader>
              <TableRow>
                <SortableTableHead
                  field="displayName"
                  currentSortField={sortField}
                  currentSortOrder={currentSortOrder}
                  onSort={onSort}
                  className={head('gba:min-w-[220px] gba:pl-6')}
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
                <SortableTableHead field="performance" className={head('gba:min-w-[120px]')}>
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
                  className={head('gba:min-w-[100px] gba:text-right gba:pr-6')}
                >
                  {t('col-bonuses-ytd')}
                </SortableTableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="gba:text-center gba:py-8 gba:text-muted-foreground">
                    {t('table-empty')}
                  </TableCell>
                </TableRow>
              ) : (
                members.map(member => (
                  <TableRow key={member.employeeId} className="gba:border-b gba:border-border gba:hover:bg-muted/40">
                    <TableCell className="gba:align-top gba:py-4 gba:pl-6">
                      <div className="gba:flex gba:items-center gba:gap-3">
                        <Avatar className="gba:h-9 gba:w-9 gba:flex-shrink-0">
                          {member.pictureThumbnail ? <AvatarImage src={member.pictureThumbnail} alt="" /> : null}
                          <AvatarFallback className="gba:text-sm gba:font-medium">
                            {(member.firstName?.[0] ?? '') + (member.lastName?.[0] ?? '')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="gba:min-w-0">
                          <div className="gba:font-medium gba:text-foreground gba:leading-tight gba:truncate">
                            {member.displayName}
                          </div>
                          <div className="gba:text-sm gba:text-muted-foreground gba:truncate gba:mt-0.5">
                            {member.jobPosition ?? '—'}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="gba:align-top gba:py-4 gba:text-muted-foreground">
                      <span className="gba:font-mono gba:text-sm">
                        {member.jobLevel?.trim() ? member.jobLevel : t('table-cell-empty')}
                      </span>
                    </TableCell>
                    <TableCell className="gba:align-top gba:py-4">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="gba:text-muted-foreground gba:cursor-default gba:inline-block">
                            {tenure(member.hireDate)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {member.hireDate
                            ? t('hire-tooltip', {
                                date: formatDate(member.hireDate, 'date.short') ?? member.hireDate
                              })
                            : t('hire-unknown')}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="gba:align-top gba:py-4">
                      {member.currentAnnualSalary == null && member.currentMonthlySalary == null ? (
                        <span className="gba:text-muted-foreground gba:tabular-nums">
                          {formatCurrency(null, member.currency)}
                        </span>
                      ) : (
                        <div className="gba:space-y-0.5">
                          <div className="gba:font-medium gba:text-foreground gba:tabular-nums">
                            {formatCurrency(member.currentAnnualSalary, member.currency)}
                          </div>
                          {(member.currentMonthlySalary != null || member.currentAnnualSalary == null) && (
                            <div className="gba:text-sm gba:text-muted-foreground gba:tabular-nums">
                              {formatCurrency(member.currentMonthlySalary, member.currency)}
                              {member.currentMonthlySalary != null ? t('salary-monthly-suffix') : null}
                            </div>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="gba:align-top gba:py-4 gba:min-w-40">
                      <CompaRatioBar
                        compaRatio={member.compaRatio}
                        band={member.compensationBand}
                        currentSalary={member.currentAnnualSalary}
                      />
                    </TableCell>
                    <TableCell
                      className="gba:align-top gba:py-4 gba:text-muted-foreground"
                      data-testid="team-compensation-performance-placeholder"
                    >
                      {t('table-cell-empty')}
                    </TableCell>
                    <TableCell className="gba:align-top gba:py-4">
                      <div className="gba:space-y-1">
                        {member.lastRaiseDate ? (
                          <>
                            <div className="gba:font-medium gba:text-foreground">
                              <span className="gba:tabular-nums">
                                {formatDate(member.lastRaiseDate, 'date.short') ?? member.lastRaiseDate}
                              </span>
                            </div>
                            {member.lastRaiseAmount != null && (
                              <div className="gba:text-sm gba:text-muted-foreground">
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
                          <span className="gba:text-muted-foreground">{t('tenure-never-raise')}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="gba:align-top gba:py-4 gba:text-right gba:pr-6 gba:tabular-nums">
                      {formatCurrency(member.currentBonusTotal, member.currency)}
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
