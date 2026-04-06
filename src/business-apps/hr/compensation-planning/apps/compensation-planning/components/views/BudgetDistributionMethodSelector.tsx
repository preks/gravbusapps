import React, { useMemo } from 'react'
import { Card, CardContent, Label, RadioGroup, RadioGroupItem } from '@newwork/nw-design-system'
import type { IconProps } from '@phosphor-icons/react'
import {
  ChartLineIcon,
  CurrencyDollarIcon,
  EqualsIcon,
  SlidersHorizontalIcon,
  UsersThreeIcon
} from '@phosphor-icons/react'
import type { DistributionMethod } from '../../../../types/compensationPlanningTypes'
import { cn } from '@/common/utils/cn'

type Translate = (id: string, args?: Record<string, string | number>) => string

const METHOD_ORDER: DistributionMethod[] = [
  'proportional_headcount',
  'proportional_salary_cost',
  'performance_weighted',
  'equal',
  'custom'
]

function methodIcon(method: DistributionMethod): React.ComponentType<IconProps> {
  switch (method) {
    case 'proportional_headcount':
      return UsersThreeIcon
    case 'proportional_salary_cost':
      return CurrencyDollarIcon
    case 'performance_weighted':
      return ChartLineIcon
    case 'equal':
      return EqualsIcon
    case 'custom':
    default:
      return SlidersHorizontalIcon
  }
}

/** Title message key for i18n (e.g. toolbar summary next to the distribution preview). */
export function budgetDistributionMethodTitleKey(method: DistributionMethod): string {
  return methodFluentKeys(method).title
}

function methodFluentKeys(method: DistributionMethod): { title: string; description: string } {
  switch (method) {
    case 'proportional_headcount':
      return {
        title: 'budget-distribution-method-headcount-title',
        description: 'budget-distribution-method-headcount-description'
      }
    case 'proportional_salary_cost':
      return {
        title: 'budget-distribution-method-salary-cost-title',
        description: 'budget-distribution-method-salary-cost-description'
      }
    case 'performance_weighted':
      return {
        title: 'budget-distribution-method-performance-title',
        description: 'budget-distribution-method-performance-description'
      }
    case 'equal':
      return {
        title: 'budget-distribution-method-equal-title',
        description: 'budget-distribution-method-equal-description'
      }
    default:
      return {
        title: 'budget-distribution-method-custom-title',
        description: 'budget-distribution-method-custom-description'
      }
  }
}

export interface BudgetDistributionMethodSelectorProps {
  selectedMethod: DistributionMethod
  onMethodChange: (method: DistributionMethod) => void
  disabled?: boolean
  sectionTitle: string
  t: Translate
  /** Methods omitted from the radio list (e.g. manager team view excludes headcount). */
  excludedMethods?: readonly DistributionMethod[]
}

export const BudgetDistributionMethodSelector: React.FC<BudgetDistributionMethodSelectorProps> = ({
  selectedMethod,
  onMethodChange,
  disabled = false,
  sectionTitle,
  t,
  excludedMethods
}) => {
  const options = useMemo(() => {
    const excluded = new Set(excludedMethods ?? [])
    return METHOD_ORDER.filter(value => !excluded.has(value)).map(value => {
      const keys = methodFluentKeys(value)
      const Icon = methodIcon(value)
      return {
        value,
        title: t(keys.title),
        description: t(keys.description),
        Icon
      }
    })
  }, [t, excludedMethods])

  const selectedDetail = useMemo(
    () => options.find(o => o.value === selectedMethod) ?? options[0],
    [options, selectedMethod]
  )

  const radioValue = selectedDetail?.value ?? selectedMethod

  return (
    <Card className="gba:overflow-hidden" data-testid="budget-distribution-method-selector">
      <CardContent className="gba:space-y-2 gba:p-3">
        <div>
          <h3 className="gba:text-sm gba:font-semibold gba:leading-tight gba:text-foreground">{sectionTitle}</h3>
        </div>

        <RadioGroup
          value={radioValue}
          onValueChange={v => onMethodChange(v as DistributionMethod)}
          disabled={disabled}
          className="gba:flex gba:w-full gba:min-w-0 gba:flex-nowrap gba:gap-1"
          data-testid="budget-distribution-method-radio-group"
        >
          {options.map(opt => {
            const isSelected = radioValue === opt.value
            const inputId = `budget-distribution-method-${opt.value}`
            const OptionIcon = opt.Icon
            return (
              <div
                key={opt.value}
                className={cn(
                  'gba:relative gba:min-w-0 gba:flex-1 gba:basis-0',
                  disabled ? 'gba:pointer-events-none gba:opacity-60' : 'gba:cursor-pointer'
                )}
                data-testid={`budget-distribution-method-option-${opt.value}`}
                title={opt.description}
              >
                <div
                  className={cn(
                    'gba:flex gba:h-full gba:flex-col gba:items-center gba:gap-0.5 gba:rounded-md gba:border gba:px-1 gba:py-1.5 gba:transition-colors',
                    isSelected
                      ? 'gba:border-primary gba:bg-muted/50'
                      : 'gba:border-border gba:bg-card gba:hover:bg-muted/30'
                  )}
                >
                  <RadioGroupItem
                    value={opt.value}
                    id={inputId}
                    className="gba:absolute gba:right-1 gba:top-1 gba:size-4 gba:!rounded-sm [&_[data-slot=radio-group-indicator]_span]:!rounded-sm"
                    data-testid={`budget-distribution-method-input-${opt.value}`}
                  />
                  <Label
                    htmlFor={inputId}
                    className="gba:flex gba:w-full gba:cursor-pointer gba:flex-col gba:items-center gba:justify-center gba:gap-0.5 gba:px-0.5 gba:pt-2 gba:text-center"
                  >
                    <span
                      className={cn(
                        'gba:inline-flex gba:h-6 gba:w-6 gba:shrink-0 gba:items-center gba:justify-center gba:rounded gba:border gba:border-border gba:bg-background',
                        isSelected && 'gba:border-primary/60'
                      )}
                    >
                      <OptionIcon className="gba:h-3 gba:w-3" aria-hidden />
                    </span>
                    <span
                      className="gba:block gba:w-full gba:truncate gba:text-center gba:text-xs gba:font-medium gba:leading-tight gba:text-foreground"
                      title={opt.title}
                    >
                      {opt.title}
                    </span>
                  </Label>
                </div>
              </div>
            )
          })}
        </RadioGroup>

        <p
          className="gba:border-t gba:border-border gba:pt-2 gba:text-xs gba:leading-snug gba:text-muted-foreground"
          data-testid="budget-distribution-method-selected-description"
        >
          {selectedDetail?.description ?? ''}
        </p>
      </CardContent>
    </Card>
  )
}
