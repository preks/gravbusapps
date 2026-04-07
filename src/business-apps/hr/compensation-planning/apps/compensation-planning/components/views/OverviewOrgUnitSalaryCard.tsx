import React, { useCallback, useMemo, useState } from 'react'
import { Card, CardContent, DataDisplay, useTranslation } from '@newwork/nw-design-system'
import { useDebounce } from '@/common/hooks/useDebounce'
import { formatCurrency } from '@/common/utils/numberFormatter'
import { BudgetDistributionDepartmentsPagination } from './BudgetDistributionDepartmentsPagination'
import { useDepartmentPagination } from './useDepartmentPagination'
import translations from '../../_i18n'

/** Departments | annual salary (amount + % of total) | bonuses (amount + % of total). */
const OVERVIEW_ORG_UNIT_SALARY_ROW_GRID_CLASS =
  'gba:grid gba:grid-cols-[minmax(11rem,2.5fr)_minmax(8rem,1.1fr)_minmax(8rem,1.1fr)] gba:items-start gba:gap-x-4 gba:gap-y-1'

export interface OverviewOrgUnitSalaryRow {
  orgUnitId: string
  orgUnitName: string
  headcount: number
  salaryCost: number
  bonusCostYtd: number
}

export interface OverviewOrgUnitSalaryCardProps {
  rows: OverviewOrgUnitSalaryRow[]
  totalSalaryAcrossUnits: number
  totalBonusAcrossUnits: number
  currency: string
  teamMemberCount: number
}

function formatShareOfTotal(part: number, total: number): string {
  if (total <= 0 || !Number.isFinite(part) || !Number.isFinite(total)) {
    return '—'
  }
  return `${((100 * part) / total).toFixed(1)}%`
}

export const OverviewOrgUnitSalaryCard: React.FC<OverviewOrgUnitSalaryCardProps> = ({
  rows,
  totalSalaryAcrossUnits,
  totalBonusAcrossUnits,
  currency,
  teamMemberCount
}) => {
  const { t } = useTranslation(translations)
  const [departmentSearch, setDepartmentSearch] = useState('')
  const debouncedSearch = useDebounce(departmentSearch, 300)

  const filteredRows = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    if (!q) {
      return rows
    }
    return rows.filter(r => r.orgUnitName.toLowerCase().includes(q))
  }, [rows, debouncedSearch])

  const filteredRowsWithId = useMemo(() => filteredRows.map(r => ({ ...r, id: r.orgUnitId })), [filteredRows])

  const {
    pagedItems: pagedRows,
    pageIndex,
    setPageIndex,
    totalPages,
    showPagination,
    total: departmentTotal
  } = useDepartmentPagination(filteredRowsWithId)

  const goPrev = useCallback(() => {
    setPageIndex(p => Math.max(0, p - 1))
  }, [setPageIndex])

  const goNext = useCallback(() => {
    setPageIndex(p => Math.min(totalPages - 1, p + 1))
  }, [setPageIndex, totalPages])

  const showSearchEmpty = rows.length > 0 && filteredRows.length === 0 && debouncedSearch.trim().length > 0

  const showTable = rows.length > 0 && !showSearchEmpty

  return (
    <Card className="gba:w-full" data-testid="compensation-overview-org-unit-salary-card">
      {rows.length === 0 ? (
        <CardContent>
          <p
            className="gba:text-sm gba:text-muted-foreground"
            data-testid="compensation-overview-org-unit-salary-empty"
          >
            {t(teamMemberCount === 0 ? 'overview-org-unit-salary-no-employees' : 'overview-org-unit-salary-empty')}
          </p>
        </CardContent>
      ) : (
        <CardContent className="gba:space-y-4 gba:pt-6">
          <DataDisplay
            data-testid="compensation-overview-departments-display"
            titleSections={[
              {
                id: 'overview-departments',
                label: t('budget-distribution-departments-toolbar-title'),
                metadata: { count: departmentTotal, isLoading: false }
              }
            ]}
            currentSection="overview-departments"
            toolbarDensity="default"
            searchValue={departmentSearch}
            searchPlaceholder={t('budget-distribution-departments-search-placeholder')}
            onSearchChange={setDepartmentSearch}
          >
            <div className="gba:space-y-4">
              {showSearchEmpty ? (
                <p
                  className="gba:text-sm gba:text-muted-foreground"
                  data-testid="compensation-overview-org-unit-salary-search-empty"
                >
                  {t('budget-distribution-departments-search-empty')}
                </p>
              ) : null}

              {showTable ? (
                <>
                  <div
                    className="gba:min-w-0 gba:overflow-x-auto gba:rounded-md gba:border gba:border-border"
                    data-testid="compensation-overview-org-unit-salary-table-scroll"
                  >
                    <ul
                      className="gba:min-w-[28rem] gba:divide-y gba:divide-border"
                      data-testid="compensation-overview-org-unit-salary-list"
                    >
                      <li
                        className={`${OVERVIEW_ORG_UNIT_SALARY_ROW_GRID_CLASS} gba:border-b gba:border-border gba:bg-muted/40 gba:px-4 gba:py-2 gba:text-xs gba:font-medium gba:text-muted-foreground`}
                        data-testid="compensation-overview-org-unit-salary-column-headers"
                      >
                        <span>{t('budget-distribution-col-org-unit')}</span>
                        <span className="gba:text-right">{t('overview-departments-col-group-annual-salary')}</span>
                        <span className="gba:text-right">{t('overview-departments-col-bonuses')}</span>
                      </li>
                      {pagedRows.map(row => (
                        <li
                          key={row.orgUnitId}
                          className={`${OVERVIEW_ORG_UNIT_SALARY_ROW_GRID_CLASS} gba:px-4 gba:py-3`}
                          data-testid={`compensation-overview-org-unit-salary-row-${row.orgUnitId}`}
                        >
                          <div className="gba:min-w-0">
                            <div className="gba:font-semibold gba:text-foreground">{row.orgUnitName}</div>
                            <div className="gba:mt-0.5 gba:text-sm gba:text-muted-foreground">
                              {t('budget-distribution-org-unit-employee-count', { count: row.headcount })}
                            </div>
                          </div>
                          <div className="gba:text-right">
                            <div className="gba:font-semibold gba:tabular-nums gba:text-foreground">
                              {formatCurrency(row.salaryCost, currency)}
                            </div>
                            <div className="gba:mt-1 gba:text-xs gba:text-muted-foreground gba:tabular-nums">
                              {formatShareOfTotal(row.salaryCost, totalSalaryAcrossUnits)}
                            </div>
                          </div>
                          <div className="gba:text-right">
                            <div className="gba:font-semibold gba:tabular-nums gba:text-foreground">
                              {formatCurrency(row.bonusCostYtd, currency)}
                            </div>
                            <div className="gba:mt-1 gba:text-xs gba:text-muted-foreground gba:tabular-nums">
                              {formatShareOfTotal(row.bonusCostYtd, totalBonusAcrossUnits)}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {showPagination ? (
                    <BudgetDistributionDepartmentsPagination
                      pageIndex={pageIndex}
                      totalPages={totalPages}
                      onPrev={goPrev}
                      onNext={goNext}
                      t={t}
                    />
                  ) : null}
                </>
              ) : null}
            </div>
          </DataDisplay>
        </CardContent>
      )}
    </Card>
  )
}
