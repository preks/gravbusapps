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
      return SlidersHorizontalIcon
    default:
      return SlidersHorizontalIcon
  }
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
    case 'custom':
      return {
        title: 'budget-distribution-method-custom-title',
        description: 'budget-distribution-method-custom-description'
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
  /** When true, choice is not interactive (same as before). */
  disabled?: boolean
  sectionTitle: string
  sectionDescription: string
  t: Translate
}

export const BudgetDistributionMethodSelector: React.FC<BudgetDistributionMethodSelectorProps> = ({
  selectedMethod,
  onMethodChange,
  disabled = false,
  sectionTitle,
  sectionDescription,
  t
}) => {
  const options = useMemo(
    () =>
      METHOD_ORDER.map(value => {
        const keys = methodFluentKeys(value)
        const Icon = methodIcon(value)
        return {
          value,
          title: t(keys.title),
          description: t(keys.description),
          Icon
        }
      }),
    [t]
  )

  return (
    <Card className="gba:mb-4" data-testid="budget-distribution-method-selector">
      <CardContent className="gba:space-y-4 gba:p-4">
        <div className="gba:space-y-1">
          <h3 className="gba:text-sm gba:font-semibold gba:leading-none">{sectionTitle}</h3>
          <p className="gba:text-sm gba:text-muted-foreground">{sectionDescription}</p>
        </div>

        <RadioGroup
          value={selectedMethod}
          onValueChange={v => onMethodChange(v as DistributionMethod)}
          disabled={disabled}
          className="gba:grid gba:grid-cols-1 gba:gap-3 md:gba:grid-cols-2"
          data-testid="budget-distribution-method-radio-group"
        >
          {options.map(opt => {
            const isSelected = selectedMethod === opt.value
            const inputId = `budget-distribution-method-${opt.value}`
            const OptionIcon = opt.Icon
            return (
              <div
                key={opt.value}
                className={cn(
                  'gba:flex gba:items-start gba:gap-3 gba:rounded-lg gba:border gba:p-4 gba:transition-colors',
                  isSelected
                    ? 'gba:border-primary gba:bg-muted/40'
                    : 'gba:border-border gba:bg-card gba:hover:bg-muted/25',
                  disabled ? 'gba:pointer-events-none gba:opacity-60' : 'gba:cursor-pointer'
                )}
                data-testid={`budget-distribution-method-option-${opt.value}`}
              >
                <RadioGroupItem
                  value={opt.value}
                  id={inputId}
                  className="gba:mt-0.5"
                  data-testid={`budget-distribution-method-input-${opt.value}`}
                />
                <Label htmlFor={inputId} className="gba:flex gba:min-w-0 gba:flex-1 gba:cursor-pointer gba:gap-3">
                  <span className="gba:mt-0.5 gba:inline-flex gba:h-9 gba:w-9 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-md gba:border gba:border-border gba:bg-background">
                    <OptionIcon className="gba:h-5 gba:w-5" aria-hidden />
                  </span>
                  <span className="gba:min-w-0 gba:flex-1 gba:space-y-1">
                    <span className="gba:block gba:text-sm gba:font-medium gba:leading-snug gba:text-foreground">
                      {opt.title}
                    </span>
                    <span className="gba:block gba:text-xs gba:leading-relaxed gba:text-muted-foreground">
                      {opt.description}
                    </span>
                  </span>
                </Label>
              </div>
            )
          })}
        </RadioGroup>
      </CardContent>
    </Card>
  )
}
