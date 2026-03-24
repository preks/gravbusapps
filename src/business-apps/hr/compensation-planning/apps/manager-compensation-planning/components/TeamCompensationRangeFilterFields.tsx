import React, { useCallback, useEffect, useRef, useState } from 'react'
import { DateInput, Input, Label, useTranslation } from '@newwork/nw-design-system'
import { parseLocalizedNumber } from '@/common/utils/numberFormatter'
import { formatLocaleInteger } from '../../../utils/budgetCalculations'
import translations from '../_i18n'

type DateInputValue = string | [string | null, string | null] | null

function formatSalaryFilterAmount(value: number): string {
  return formatLocaleInteger(Math.round(value))
}

export interface TeamCompensationSalaryFilterFieldsProps {
  salaryMin: number | null
  salaryMax: number | null
  /** Locale-grouped integers only — no currency symbol (team may mix RON, EUR, etc.). */
  onSalaryMinMaxChange: (min: number | null, max: number | null) => void
}

export const TeamCompensationSalaryFilterFields: React.FC<TeamCompensationSalaryFilterFieldsProps> = ({
  salaryMin,
  salaryMax,
  onSalaryMinMaxChange
}) => {
  const { t } = useTranslation(translations)

  const minFocused = useRef(false)
  const maxFocused = useRef(false)

  const [minText, setMinText] = useState('')
  const [maxText, setMaxText] = useState('')

  useEffect(() => {
    if (minFocused.current) return
    setMinText(salaryMin == null ? '' : formatSalaryFilterAmount(salaryMin))
  }, [salaryMin])

  useEffect(() => {
    if (maxFocused.current) return
    setMaxText(salaryMax == null ? '' : formatSalaryFilterAmount(salaryMax))
  }, [salaryMax])

  const commitMin = useCallback(
    (raw: string) => {
      const trimmed = raw.trim()
      if (trimmed === '') {
        onSalaryMinMaxChange(null, salaryMax)
        setMinText('')
        return
      }
      const n = parseLocalizedNumber(trimmed)
      if (!Number.isFinite(n) || n < 0) {
        setMinText(salaryMin == null ? '' : formatSalaryFilterAmount(salaryMin))
        return
      }
      const rounded = Math.round(n)
      onSalaryMinMaxChange(rounded, salaryMax)
      setMinText(formatSalaryFilterAmount(rounded))
    },
    [onSalaryMinMaxChange, salaryMax, salaryMin]
  )

  const commitMax = useCallback(
    (raw: string) => {
      const trimmed = raw.trim()
      if (trimmed === '') {
        onSalaryMinMaxChange(salaryMin, null)
        setMaxText('')
        return
      }
      const n = parseLocalizedNumber(trimmed)
      if (!Number.isFinite(n) || n < 0) {
        setMaxText(salaryMax == null ? '' : formatSalaryFilterAmount(salaryMax))
        return
      }
      const rounded = Math.round(n)
      onSalaryMinMaxChange(salaryMin, rounded)
      setMaxText(formatSalaryFilterAmount(rounded))
    },
    [onSalaryMinMaxChange, salaryMin, salaryMax]
  )

  return (
    <div
      className="gba:flex gba:flex-row gba:flex-wrap gba:items-center gba:gap-x-3 gba:gap-y-2 gba:pb-2"
      data-testid="manager-compensation-salary-filters"
    >
      <div className="gba:flex gba:min-w-0 gba:flex-1 gba:items-center gba:gap-2">
        <Label htmlFor="manager-filter-salary-min" className="gba:sr-only">
          {t('filter-salary-min-label')}
        </Label>
        <span className="gba:shrink-0 gba:text-sm gba:font-medium gba:text-foreground" aria-hidden>
          {t('filter-salary-min-placeholder')}
        </span>
        <Input
          id="manager-filter-salary-min"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          className="gba:min-w-0 gba:flex-1"
          value={minText}
          onChange={e => setMinText(e.target.value)}
          onFocus={() => {
            minFocused.current = true
            setMinText(salaryMin == null ? '' : formatSalaryFilterAmount(salaryMin))
          }}
          onBlur={() => {
            minFocused.current = false
            commitMin(minText)
          }}
          data-testid="manager-filter-salary-min"
        />
      </div>
      <div className="gba:flex gba:min-w-0 gba:flex-1 gba:items-center gba:gap-2">
        <Label htmlFor="manager-filter-salary-max" className="gba:sr-only">
          {t('filter-salary-max-label')}
        </Label>
        <span className="gba:shrink-0 gba:text-sm gba:font-medium gba:text-foreground" aria-hidden>
          {t('filter-salary-max-placeholder')}
        </span>
        <Input
          id="manager-filter-salary-max"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          className="gba:min-w-0 gba:flex-1"
          value={maxText}
          onChange={e => setMaxText(e.target.value)}
          onFocus={() => {
            maxFocused.current = true
            setMaxText(salaryMax == null ? '' : formatSalaryFilterAmount(salaryMax))
          }}
          onBlur={() => {
            maxFocused.current = false
            commitMax(maxText)
          }}
          data-testid="manager-filter-salary-max"
        />
      </div>
    </div>
  )
}

export interface TeamCompensationLastRaiseFilterFieldsProps {
  lastRaiseFrom: string | null
  lastRaiseTo: string | null
  onLastRaiseRangeChange: (from: string | null, to: string | null) => void
}

export const TeamCompensationLastRaiseFilterFields: React.FC<TeamCompensationLastRaiseFilterFieldsProps> = ({
  lastRaiseFrom,
  lastRaiseTo,
  onLastRaiseRangeChange
}) => {
  const { t } = useTranslation(translations)

  const handleRaiseRangeChange = useCallback(
    (value: DateInputValue) => {
      if (value == null) {
        onLastRaiseRangeChange(null, null)
        return
      }
      if (typeof value === 'string') {
        const d = value.slice(0, 10)
        onLastRaiseRangeChange(d || null, d || null)
        return
      }
      const [from, to] = value
      onLastRaiseRangeChange(from?.slice(0, 10) ?? null, to?.slice(0, 10) ?? null)
    },
    [onLastRaiseRangeChange]
  )

  const raiseValue: [string | null, string | null] | null =
    lastRaiseFrom || lastRaiseTo ? [lastRaiseFrom, lastRaiseTo] : null

  return (
    <div className="gba:flex gba:flex-col gba:gap-2 gba:pb-2" data-testid="manager-compensation-last-raise-filters">
      <DateInput
        type="date"
        mode="range"
        value={raiseValue}
        onChange={handleRaiseRangeChange}
        outputFormat="iso"
        captionLayout="dropdown"
        placeholder={t('filter-last-raise-from-placeholder')}
        placeholderEnd={t('filter-last-raise-to-placeholder')}
        data-testid="manager-filter-last-raise-range"
      />
    </div>
  )
}
