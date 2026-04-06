import React from 'react'
import { Input, Label, RadioGroup, RadioGroupItem } from '@newwork/nw-design-system'
import { formatCurrency } from '@/common/utils/numberFormatter'
import type { CustomBudgetInputMode, OrgUnitCustomBudgetInput } from './budgetDistributionCustomTypes'
import { defaultOrgUnitCustomBudgetInput } from './budgetDistributionCustomTypes'

type Translate = (id: string, args?: Record<string, string | number>) => string

function formatPercentOfWhole(part: number, whole: number): string | null {
  if (whole <= 0 || !Number.isFinite(part) || !Number.isFinite(whole)) {
    return null
  }
  return ((100 * part) / whole).toFixed(1)
}

export interface BudgetDistributionCustomOrgUnitInputsProps {
  orgUnitId: string
  currencyCode: string
  /** Parsed allocation for this row (from amount or % of pool). */
  amount: number
  distributionPool: number | null
  /**
   * Remaining increase pool after cumulative allocations from the start of the department list through this row
   * (inclusive). Null when there is no pool.
   */
  poolRemainingSequential: number | null
  customBudget: OrgUnitCustomBudgetInput | undefined
  onAmountRawChange: (orgUnitId: string, value: string) => void
  onPercentRawChange: (orgUnitId: string, value: string) => void
  onModeChange: (orgUnitId: string, mode: CustomBudgetInputMode) => void
  t: Translate
}

export function BudgetDistributionCustomOrgUnitInputs({
  orgUnitId,
  currencyCode,
  amount,
  distributionPool,
  poolRemainingSequential,
  customBudget,
  onAmountRawChange,
  onPercentRawChange,
  onModeChange,
  t
}: BudgetDistributionCustomOrgUnitInputsProps) {
  const entry = customBudget ?? defaultOrgUnitCustomBudgetInput()
  const mode = entry.mode
  const poolForPercent = distributionPool != null && distributionPool > 0 ? distributionPool : null

  const groupName = `budget-distribution-custom-mode-${orgUnitId}`
  const amountInputId = `budget-distribution-custom-amount-${orgUnitId}`
  const percentInputId = `budget-distribution-custom-percent-${orgUnitId}`

  const showDerivedDetails = amount > 0 || entry.amountRaw.trim() !== '' || entry.percentRaw.trim() !== ''

  const summaryColumn = showDerivedDetails ? (
    <div
      className="gba:flex gba:min-w-0 gba:flex-col gba:gap-0.5 gba:border-l gba:border-border gba:pl-4 gba:text-xs gba:text-muted-foreground"
      data-testid={`budget-distribution-custom-meaning-${orgUnitId}`}
    >
      <p data-testid={`budget-distribution-custom-parsed-${orgUnitId}`}>
        {t('budget-distribution-custom-parsed-amount', {
          amount: formatCurrency(amount, currencyCode)
        })}
      </p>
      {poolForPercent != null && amount > 0 ? (
        <p data-testid={`budget-distribution-custom-pool-pct-${orgUnitId}`}>
          {t('budget-distribution-custom-percent-of-pool', {
            percent: formatPercentOfWhole(amount, poolForPercent) ?? '—'
          })}
        </p>
      ) : null}
      {poolRemainingSequential != null && Number.isFinite(poolRemainingSequential) ? (
        <p data-testid={`budget-distribution-custom-pool-remaining-${orgUnitId}`}>
          {t('budget-distribution-custom-pool-remaining-after-all', {
            amount: formatCurrency(poolRemainingSequential, currencyCode)
          })}
        </p>
      ) : null}
    </div>
  ) : (
    <div className="gba:min-w-0" data-testid={`budget-distribution-custom-details-placeholder-${orgUnitId}`} />
  )

  return (
    <div className="gba:contents">
      <div
        className="gba:flex gba:min-w-0 gba:flex-col gba:gap-2"
        data-testid={`budget-distribution-custom-controls-${orgUnitId}`}
      >
        <RadioGroup
          value={mode}
          onValueChange={v => onModeChange(orgUnitId, v as CustomBudgetInputMode)}
          className="gba:flex gba:flex-row gba:flex-wrap gba:items-center gba:gap-x-4 gba:gap-y-1"
          data-testid={`budget-distribution-custom-mode-group-${orgUnitId}`}
        >
          <div className="gba:flex gba:items-center gba:gap-2">
            <RadioGroupItem
              value="amount"
              id={`${groupName}-amount`}
              data-testid={`budget-distribution-custom-mode-amount-${orgUnitId}`}
            />
            <Label
              htmlFor={`${groupName}-amount`}
              className="gba:cursor-pointer gba:text-xs gba:font-normal gba:text-muted-foreground"
            >
              {t('budget-distribution-custom-mode-amount')}
            </Label>
          </div>
          <div className="gba:flex gba:items-center gba:gap-2">
            <RadioGroupItem
              value="percent"
              id={`${groupName}-percent`}
              data-testid={`budget-distribution-custom-mode-percent-${orgUnitId}`}
            />
            <Label
              htmlFor={`${groupName}-percent`}
              className="gba:cursor-pointer gba:text-xs gba:font-normal gba:text-muted-foreground"
            >
              {t('budget-distribution-custom-mode-pool-percent')}
            </Label>
          </div>
        </RadioGroup>

        {mode === 'amount' ? (
          <div className="gba:flex gba:flex-col gba:gap-1">
            <Label htmlFor={amountInputId} className="gba:text-xs gba:text-muted-foreground">
              {t('budget-distribution-custom-amount-label')}
            </Label>
            <Input
              id={amountInputId}
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              className="gba:w-full gba:max-w-full"
              value={entry.amountRaw}
              onChange={e => onAmountRawChange(orgUnitId, e.target.value)}
              placeholder="0"
              data-testid={`budget-distribution-custom-input-${orgUnitId}`}
            />
          </div>
        ) : (
          <div className="gba:flex gba:flex-col gba:gap-1">
            <Label htmlFor={percentInputId} className="gba:text-xs gba:text-muted-foreground">
              {t('budget-distribution-custom-percent-label')}
            </Label>
            <Input
              id={percentInputId}
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              className="gba:w-full gba:max-w-full"
              value={entry.percentRaw}
              onChange={e => onPercentRawChange(orgUnitId, e.target.value)}
              placeholder="0"
              data-testid={`budget-distribution-custom-percent-input-${orgUnitId}`}
            />
            {poolForPercent == null ? (
              <p
                className="gba:text-xs gba:text-muted-foreground"
                data-testid={`budget-distribution-custom-percent-no-pool-${orgUnitId}`}
              >
                {t('budget-distribution-custom-percent-needs-pool')}
              </p>
            ) : null}
          </div>
        )}
      </div>

      {summaryColumn}
    </div>
  )
}
