import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import { cn } from '@/common/utils/cn'

export interface CompensationCyclePlanItem {
  id: string
  name: string
}

interface CompensationCycleSelectorProps {
  plans: CompensationCyclePlanItem[]
  plansLoading: boolean
  selectedPlanId: string | null
  onPlanChange: (planId: string | null) => void
  t: (key: string) => string
  /** Match `BudgetPlanSelector` `variant="toolbar"` for DataDisplay alignment. */
  variant?: 'default' | 'toolbar'
  fluidToolbarWidth?: boolean
}

export const CompensationCycleSelector: React.FC<CompensationCycleSelectorProps> = ({
  plans,
  plansLoading,
  selectedPlanId,
  onPlanChange,
  t,
  variant = 'default',
  fluidToolbarWidth = false
}) => {
  const planSelectValue =
    selectedPlanId != null && plans.some(p => p.id === selectedPlanId) ? selectedPlanId : undefined

  const selectedPlanName = plans.find(p => p.id === selectedPlanId)?.name?.trim()

  const isToolbar = variant === 'toolbar'
  /** Same width budget as `BudgetPlanSelector` toolbar: long i18n would widen the whole primary-action block vs "Company". */
  const toolbarLabel =
    isToolbar && !fluidToolbarWidth ? t('budget-setup-toolbar-cycle-label') : t('selector-plan-label')

  return (
    <div
      className={cn(
        isToolbar
          ? fluidToolbarWidth
            ? 'gba:flex gba:w-full gba:min-w-0 gba:max-w-full gba:flex-1 gba:flex-wrap gba:items-center gba:justify-end gba:gap-2'
            : 'gba:flex gba:min-w-0 gba:flex-wrap gba:items-center gba:gap-2'
          : 'gba:flex gba:flex-wrap gba:items-center gba:gap-3'
      )}
      data-testid="compensation-cycle-selector"
    >
      <div
        className={cn(
          'gba:flex gba:min-w-0 gba:items-center gba:gap-2',
          isToolbar && fluidToolbarWidth && 'gba:max-w-sm gba:flex-1'
        )}
      >
        <span
          className="gba:shrink-0 gba:text-sm gba:font-medium gba:text-foreground gba:whitespace-nowrap"
          title={isToolbar && !fluidToolbarWidth ? t('selector-plan-label') : undefined}
        >
          {toolbarLabel}
        </span>
        <div
          className={cn(
            isToolbar
              ? fluidToolbarWidth
                ? 'gba:min-w-0 gba:flex-1'
                : 'gba:inline-flex gba:min-w-0 gba:max-w-lg gba:shrink-0'
              : 'gba:inline-flex gba:min-w-0 gba:max-w-lg'
          )}
        >
          <Select
            value={planSelectValue}
            onValueChange={val => onPlanChange(val || null)}
            disabled={plansLoading || plans.length === 0}
          >
            <SelectTrigger
              className={cn(
                isToolbar && fluidToolbarWidth && 'gba:!w-full gba:min-w-0 gba:max-w-full',
                isToolbar && !fluidToolbarWidth && 'gba:!w-max gba:min-w-72 gba:max-w-lg',
                !isToolbar && 'gba:!w-max gba:min-w-64 gba:max-w-lg'
              )}
              title={selectedPlanName !== undefined && selectedPlanName.length > 0 ? selectedPlanName : undefined}
              data-testid="compensation-cycle-selector-plan"
            >
              <SelectValue placeholder={plansLoading ? t('selector-loading') : t('selector-plan-placeholder')} />
            </SelectTrigger>
            <SelectContent>
              {plans.map(plan => (
                <SelectItem key={plan.id} value={plan.id}>
                  {plan.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
