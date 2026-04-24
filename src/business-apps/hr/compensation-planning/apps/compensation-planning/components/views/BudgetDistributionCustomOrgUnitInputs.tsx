import React from 'react'
import { Input, Label, RadioGroup, RadioGroupItem } from '@newwork/nw-design-system'
import { formatCurrency } from '@/common/utils/numberFormatter'
import { cn } from '@/common/utils/cn'
import { parseCustomAmountInput, roundMoney2 } from '../../utils/parseCustomBudgetInputs'
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
   * Increase pool still unallocated after all departments’ custom amounts (order-independent).
   * Null when there is no pool.
   */
  customPoolUnallocatedGlobal: number | null
  customBudget: OrgUnitCustomBudgetInput | undefined
  onAmountRawChange: (orgUnitId: string, value: string) => void
  onPercentRawChange: (orgUnitId: string, value: string) => void
  onModeChange: (orgUnitId: string, mode: CustomBudgetInputMode) => void
  t: Translate
  disabled?: boolean
  /**
   * When false, the row does not repeat the global “pool still unallocated” line (same value on every row).
   * Use where the parent already shows the same KPI (e.g. manager team preview).
   */
  showGlobalPoolRemainingInDetails?: boolean
  /**
   * Manager team custom: percent applies to the pool left after previous rows (waterfall). Updates radio + field labels.
   */
  useRemainingPoolForPercentSemantics?: boolean
}

export function BudgetDistributionCustomOrgUnitInputs({
  orgUnitId,
  currencyCode,
  amount,
  distributionPool,
  customPoolUnallocatedGlobal,
  customBudget,
  onAmountRawChange,
  onPercentRawChange,
  onModeChange,
  t,
  disabled = false,
  showGlobalPoolRemainingInDetails = true,
  useRemainingPoolForPercentSemantics = false
}: Readonly<BudgetDistributionCustomOrgUnitInputsProps>) {
  const entry = customBudget ?? defaultOrgUnitCustomBudgetInput()
  const mode = entry.mode
  const poolForPercent = distributionPool != null && distributionPool > 0 ? distributionPool : null

  const modePoolPercentLabelKey = useRemainingPoolForPercentSemantics
    ? 'budget-distribution-custom-mode-pool-percent-remaining'
    : 'budget-distribution-custom-mode-pool-percent'
  const percentFieldLabelKey = useRemainingPoolForPercentSemantics
    ? 'budget-distribution-custom-percent-label-remaining'
    : 'budget-distribution-custom-percent-label'

  const groupName = `budget-distribution-custom-mode-${orgUnitId}`
  const amountInputId = `budget-distribution-custom-amount-${orgUnitId}`
  const percentInputId = `budget-distribution-custom-percent-${orgUnitId}`

  const amountRequested = mode === 'amount' ? parseCustomAmountInput(entry.amountRaw) : 0
  const rowRequestExceedsPreviewAmount =
    mode === 'amount' && entry.amountRaw.trim() !== '' && amountRequested > roundMoney2(amount) + 0.01
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
      {showGlobalPoolRemainingInDetails &&
      customPoolUnallocatedGlobal != null &&
      Number.isFinite(customPoolUnallocatedGlobal) ? (
        <p data-testid={`budget-distribution-custom-pool-remaining-${orgUnitId}`}>
          {t('budget-distribution-custom-pool-unallocated-global', {
            amount: formatCurrency(customPoolUnallocatedGlobal, currencyCode)
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
              disabled={disabled}
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
              disabled={disabled}
            />
            <Label
              htmlFor={`${groupName}-percent`}
              className="gba:cursor-pointer gba:text-xs gba:font-normal gba:text-muted-foreground"
            >
              {t(modePoolPercentLabelKey)}
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
              className={cn(
                'gba:w-full gba:max-w-full',
                rowRequestExceedsPreviewAmount && 'gba:border-destructive gba:ring-1 gba:ring-destructive/30'
              )}
              aria-invalid={rowRequestExceedsPreviewAmount}
              value={entry.amountRaw}
              onChange={e => onAmountRawChange(orgUnitId, e.target.value)}
              placeholder="0"
              data-testid={`budget-distribution-custom-input-${orgUnitId}`}
              disabled={disabled}
            />
            {rowRequestExceedsPreviewAmount ? (
              <p
                className="gba:text-xs gba:font-medium gba:leading-snug gba:text-destructive"
                data-testid={`budget-distribution-custom-row-exceeds-${orgUnitId}`}
              >
                {t('budget-distribution-custom-row-exceeds-preview', {
                  requested: formatCurrency(amountRequested, currencyCode),
                  applied: formatCurrency(amount, currencyCode)
                })}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="gba:flex gba:flex-col gba:gap-1">
            <Label htmlFor={percentInputId} className="gba:text-xs gba:text-muted-foreground">
              {t(percentFieldLabelKey)}
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
              disabled={disabled}
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
