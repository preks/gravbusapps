import React from 'react'
import { Alert, AlertDescription } from '@newwork/nw-design-system'
import { formatCurrency } from '@/common/utils/numberFormatter'
import type { CompanyOrganizationalUnit } from '@/common/data/orgchart/hooks/useCompanyOrganizationalUnits'
import type { CustomBudgetInputMode, OrgUnitCustomBudgetInput } from './budgetDistributionCustomTypes'
import { BudgetDistributionDepartmentsPagination } from './BudgetDistributionDepartmentsPagination'
import { BudgetDistributionOrgUnitDepartmentRow } from './BudgetDistributionOrgUnitDepartmentRow'

type BudgetDistributionTranslate = (key: string, args?: Record<string, string | number>) => string

export interface BudgetDistributionOrgUnitListPagedContentProps {
  t: BudgetDistributionTranslate
  isCustom: boolean
  isSalaryCostMethod: boolean
  isPerformanceMethod: boolean
  pagedDepartments: CompanyOrganizationalUnit[]
  allocationByOrgUnitId: ReadonlyMap<string, number>
  headcountByOrgUnitId: ReadonlyMap<string, number>
  salaryCostByOrgUnitId: ReadonlyMap<string, number>
  totalPerformanceScoreByOrgUnitId: ReadonlyMap<string, number>
  totalSalaryCostAcrossOrgUnits: number
  grandTotalPerformanceScore: number
  distributionPool: number | null
  poolForCustomContext: number | null
  totalCustomAllocated: number
  sequentialPoolRemainingByOrgUnitId: ReadonlyMap<string, number>
  customBudgetByOrgUnitId: Record<string, OrgUnitCustomBudgetInput>
  currencyCode: string
  onCustomAmountRawChange: (orgUnitId: string, value: string) => void
  onCustomPercentRawChange: (orgUnitId: string, value: string) => void
  onCustomModeChange: (orgUnitId: string, mode: CustomBudgetInputMode) => void
  showDepartmentPagination: boolean
  departmentPageIndex: number
  departmentTotalPages: number
  onDepartmentPrev: () => void
  onDepartmentNext: () => void
}

export function BudgetDistributionOrgUnitListPagedContent({
  t,
  isCustom,
  isSalaryCostMethod,
  isPerformanceMethod,
  pagedDepartments,
  allocationByOrgUnitId,
  headcountByOrgUnitId,
  salaryCostByOrgUnitId,
  totalPerformanceScoreByOrgUnitId,
  totalSalaryCostAcrossOrgUnits,
  grandTotalPerformanceScore,
  distributionPool,
  poolForCustomContext,
  totalCustomAllocated,
  sequentialPoolRemainingByOrgUnitId,
  customBudgetByOrgUnitId,
  currencyCode,
  onCustomAmountRawChange,
  onCustomPercentRawChange,
  onCustomModeChange,
  showDepartmentPagination,
  departmentPageIndex,
  departmentTotalPages,
  onDepartmentPrev,
  onDepartmentNext
}: Readonly<BudgetDistributionOrgUnitListPagedContentProps>) {
  const showCustomExceedsPool =
    isCustom && poolForCustomContext != null && totalCustomAllocated > poolForCustomContext + 0.01

  return (
    <>
      <ul className="gba:divide-y gba:divide-border gba:rounded-md gba:border gba:border-border gba:min-w-0">
        {isCustom ? (
          <li
            className="gba:grid gba:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] gba:items-center gba:gap-x-4 gba:border-b gba:border-border gba:bg-muted/40 gba:px-4 gba:py-2 gba:text-xs gba:font-medium gba:text-muted-foreground"
            data-testid="budget-distribution-custom-column-headers"
          >
            <span>{t('budget-distribution-col-org-unit')}</span>
            <span>{t('budget-distribution-custom-column-amount')}</span>
            <span>{t('budget-distribution-custom-column-details')}</span>
          </li>
        ) : null}
        {pagedDepartments.map(unit => {
          const amount = allocationByOrgUnitId.get(unit.id) ?? 0
          const headcount = headcountByOrgUnitId.get(unit.id) ?? 0
          const unitSalaryCost = salaryCostByOrgUnitId.get(unit.id) ?? 0
          const unitPerformanceSum = totalPerformanceScoreByOrgUnitId.get(unit.id) ?? 0
          return (
            <BudgetDistributionOrgUnitDepartmentRow
              key={unit.id}
              unit={unit}
              isCustom={isCustom}
              isSalaryCostMethod={isSalaryCostMethod}
              isPerformanceMethod={isPerformanceMethod}
              amount={amount}
              distributionPool={distributionPool}
              poolRemainingSequential={sequentialPoolRemainingByOrgUnitId.get(unit.id) ?? null}
              headcount={headcount}
              unitSalaryCost={unitSalaryCost}
              unitPerformanceSum={unitPerformanceSum}
              totalSalaryCostAcrossOrgUnits={totalSalaryCostAcrossOrgUnits}
              grandTotalPerformanceScore={grandTotalPerformanceScore}
              currencyCode={currencyCode}
              customBudget={customBudgetByOrgUnitId[unit.id]}
              onCustomAmountRawChange={onCustomAmountRawChange}
              onCustomPercentRawChange={onCustomPercentRawChange}
              onCustomModeChange={onCustomModeChange}
              t={t}
            />
          )
        })}
      </ul>
      {showDepartmentPagination ? (
        <BudgetDistributionDepartmentsPagination
          pageIndex={departmentPageIndex}
          totalPages={departmentTotalPages}
          onPrev={onDepartmentPrev}
          onNext={onDepartmentNext}
          t={t}
        />
      ) : null}
      {showCustomExceedsPool ? (
        <div className="gba:pt-2" data-testid="budget-distribution-custom-total-summary">
          <Alert data-testid="budget-distribution-custom-exceeds-pool-alert">
            <AlertDescription>
              {t('budget-distribution-custom-exceeds-pool', {
                total: formatCurrency(totalCustomAllocated, currencyCode),
                pool: formatCurrency(poolForCustomContext, currencyCode),
                diff: formatCurrency(totalCustomAllocated - poolForCustomContext, currencyCode)
              })}
            </AlertDescription>
          </Alert>
        </div>
      ) : null}
    </>
  )
}
