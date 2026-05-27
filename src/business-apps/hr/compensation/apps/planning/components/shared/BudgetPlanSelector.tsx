import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import { cn } from '@/common/utils/cn'

function budgetPlanSelectorRootClass(isToolbar: boolean, fluidToolbarWidth: boolean): string {
  if (!isToolbar) {
    return 'gba:flex gba:flex-wrap gba:items-center gba:gap-3'
  }
  if (fluidToolbarWidth) {
    return 'gba:flex gba:w-full gba:min-w-0 gba:max-w-full gba:flex-1 gba:flex-wrap gba:items-center gba:justify-end gba:gap-2'
  }
  return 'gba:flex gba:min-w-0 gba:flex-wrap gba:items-center gba:gap-2'
}

function budgetPlanSelectorSelectWrapClass(isToolbar: boolean, fluidToolbarWidth: boolean): string {
  if (!isToolbar) {
    return 'gba:inline-flex gba:min-w-0 gba:max-w-lg'
  }
  if (fluidToolbarWidth) {
    return 'gba:min-w-0 gba:flex-1'
  }
  return 'gba:inline-flex gba:min-w-0 gba:max-w-lg gba:shrink-0'
}

function budgetPlanSelectorTriggerClass(isToolbar: boolean, fluidToolbarWidth: boolean): string {
  if (isToolbar && fluidToolbarWidth) {
    return 'gba:!w-full gba:min-w-0 gba:max-w-full'
  }
  if (isToolbar && !fluidToolbarWidth) {
    return 'gba:!w-max gba:min-w-72 gba:max-w-lg'
  }
  return 'gba:!w-max gba:min-w-64 gba:max-w-lg'
}

export interface BudgetPlanSelectorCompany {
  id: string
  name: string
}

interface BudgetPlanSelectorProps {
  companies: BudgetPlanSelectorCompany[]
  companiesLoading: boolean
  selectedCompanyId: string | null
  onCompanyChange: (companyId: string | null) => void
  t: (key: string) => string
  /** Inline next to DataDisplay toolbar: tighter spacing and select width. */
  variant?: 'default' | 'toolbar'
  /**
   * With `toolbar`, lets the select shrink inside flex rows (e.g. Overview plan detail header) so it is not clipped.
   * Uses full width up to `max-w-sm` instead of a fixed `w-72`.
   */
  fluidToolbarWidth?: boolean
  /** Stronger label weight (e.g. Budget distribution next to company budget). */
  labelBold?: boolean
}

export const BudgetPlanSelector: React.FC<BudgetPlanSelectorProps> = ({
  companies,
  companiesLoading,
  selectedCompanyId,
  onCompanyChange,
  t,
  variant = 'default',
  fluidToolbarWidth = false,
  labelBold = false
}) => {
  const companySelectValue =
    selectedCompanyId != null && companies.some(c => c.id === selectedCompanyId) ? selectedCompanyId : undefined

  const selectedCompanyName = companies.find(c => c.id === selectedCompanyId)?.name?.trim()

  const isToolbar = variant === 'toolbar'

  return (
    <div className={cn(budgetPlanSelectorRootClass(isToolbar, fluidToolbarWidth))} data-testid="budget-plan-selector">
      <div
        className={cn(
          'gba:flex gba:min-w-0 gba:items-center gba:gap-2',
          isToolbar && fluidToolbarWidth && 'gba:max-w-sm gba:flex-1'
        )}
      >
        <span
          className={cn(
            'gba:shrink-0 gba:text-sm gba:text-foreground gba:whitespace-nowrap',
            labelBold ? 'gba:font-semibold' : 'gba:font-medium'
          )}
        >
          {t('selector-company-label')}
        </span>
        <div className={cn(budgetPlanSelectorSelectWrapClass(isToolbar, fluidToolbarWidth))}>
          <Select
            value={companySelectValue}
            onValueChange={val => onCompanyChange(val || null)}
            disabled={companiesLoading || companies.length === 0}
          >
            <SelectTrigger
              className={cn(budgetPlanSelectorTriggerClass(isToolbar, fluidToolbarWidth))}
              title={
                selectedCompanyName !== undefined && selectedCompanyName.length > 0 ? selectedCompanyName : undefined
              }
              data-testid="budget-plan-selector-company"
            >
              <SelectValue placeholder={companiesLoading ? t('selector-loading') : t('selector-company-placeholder')} />
            </SelectTrigger>
            <SelectContent>
              {companies.map(company => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
