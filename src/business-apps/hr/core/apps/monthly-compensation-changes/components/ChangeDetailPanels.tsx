import { useEffect, useMemo, useState } from 'react'
import { Badge, Spinner } from '@newwork/nw-design-system'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { BenefitChangeRecord, BonusRecord, SalaryChangeRecord } from '../types/compensationChanges.types'
import { GET_PREVIOUS_EMPLOYEE_SALARY } from '../queries/compensationChangesQueries'
import {
  formatCurrencyValue,
  formatDateShort,
  getCatalogDisplayValue,
  getEmployeeDepartment,
  humanizeCatalogRef,
  humanizeStatus,
  statusBadgeVariant,
  translateStatusLabel
} from '../utils/formatUtils'
import { EmployeeHero } from './EmployeeHero'
import { FieldRow, Section } from './detailPanelPrimitives'

export type TranslationFn = (key: string) => string

interface SalaryDetailPanelProps {
  readonly record: SalaryChangeRecord
  readonly t: TranslationFn
  readonly accessToken: string
}

interface PreviousSalaryQueryResult {
  EmployeeSalary: SalaryChangeRecord[]
}

function adjustmentBadgeVariant(value: number): 'success' | 'destructive' | 'default' {
  if (value > 0) {
    return 'success'
  }

  if (value < 0) {
    return 'destructive'
  }

  return 'default'
}

function renderAdjustmentBadge(value: string, variant: ReturnType<typeof adjustmentBadgeVariant>) {
  return (
    <Badge variant={variant} size="sm">
      <span className="gba:block gba:max-w-40 gba:truncate" title={value}>
        {value}
      </span>
    </Badge>
  )
}

function getSalaryReasonDisplay(record: SalaryChangeRecord): string {
  if (record.salaryAdjustReason) {
    return getCatalogDisplayValue(record.salaryAdjustReason)
  }

  return humanizeCatalogRef(record.salaryAdjustReasonRef)
}

function getPrimarySalaryPair(record: SalaryChangeRecord, previousSalary: SalaryChangeRecord | null) {
  if (record.hourlyGrossSalary != null || previousSalary?.hourlyGrossSalary != null) {
    return {
      currentValue: record.hourlyGrossSalary,
      previousValue: previousSalary?.hourlyGrossSalary ?? null,
      basis: 'hourly' as const
    }
  }

  if (record.monthlyGrossSalary != null || previousSalary?.monthlyGrossSalary != null) {
    return {
      currentValue: record.monthlyGrossSalary,
      previousValue: previousSalary?.monthlyGrossSalary ?? null,
      basis: 'monthly' as const
    }
  }

  return {
    currentValue: record.annualGrossSalary,
    previousValue: previousSalary?.annualGrossSalary ?? null,
    basis: 'annually' as const
  }
}

function getMonthlyGross(record: SalaryChangeRecord): number | null {
  if (record.monthlyGrossSalary != null) {
    return record.monthlyGrossSalary
  }

  if (record.annualGrossSalary != null) {
    return record.annualGrossSalary / 12
  }

  return null
}

function getAnnualGross(record: SalaryChangeRecord): number | null {
  if (record.annualGrossSalary != null) {
    return record.annualGrossSalary
  }

  if (record.monthlyGrossSalary != null) {
    return record.monthlyGrossSalary * 12
  }

  return null
}

function calculatePercentageFromAmount(currentSalary: number, increaseAmount: number): number | null {
  if (currentSalary <= 0) {
    return null
  }

  return (increaseAmount / currentSalary) * 100
}

function calculateAmountFromPercentage(
  currentSalary: number | null,
  increasePercentage: number | null | undefined
): number | null {
  if (currentSalary == null || increasePercentage == null) {
    return null
  }

  return (currentSalary * increasePercentage) / 100
}

function getAdjustmentSign(value: number): string {
  return value > 0 ? '+' : ''
}

function formatAdjustmentPercent(
  requestedPercent: number | null | undefined,
  calculatedPercent: number | null
): string {
  if (requestedPercent != null) {
    return ` (${getAdjustmentSign(requestedPercent)}${requestedPercent}%)`
  }

  if (calculatedPercent != null) {
    return ` (${getAdjustmentSign(calculatedPercent)}${calculatedPercent.toFixed(2)}%)`
  }

  return ''
}

function buildCalculatedChangeLabel(params: {
  amount: number | null
  percent: number | null
  requestedPercent: number | null | undefined
  currencyCode: string
}): { value: string; numericValue: number } | null {
  const { amount, percent, requestedPercent, currencyCode } = params

  if (amount == null) {
    return null
  }

  const formattedAmount = `${getAdjustmentSign(amount)}${formatCurrencyValue(amount, currencyCode)}`
  const formattedPercent = formatAdjustmentPercent(requestedPercent, percent)

  return {
    value: `${formattedAmount}${formattedPercent}`,
    numericValue: amount
  }
}

function buildFallbackChangeLabel(
  record: SalaryChangeRecord,
  currencyCode: string
): { value: string; numericValue: number } | null {
  if (record.requestedAmount != null) {
    const amount = `${getAdjustmentSign(record.requestedAmount)}${formatCurrencyValue(record.requestedAmount, currencyCode)}`

    return { value: amount, numericValue: record.requestedAmount }
  }

  if (record.requestedPercent != null) {
    return {
      value: `${getAdjustmentSign(record.requestedPercent)}${record.requestedPercent}%`,
      numericValue: record.requestedPercent
    }
  }

  return null
}

function resolveCalculatedAmount(calculatedAmount: number | null, fallbackAmount: number | null) {
  return calculatedAmount ?? fallbackAmount
}

function usePreviousSalary(accessToken: string, record: SalaryChangeRecord) {
  const graphqlClient = useGraphQLClient(accessToken)
  const [previousSalary, setPreviousSalary] = useState<SalaryChangeRecord | null>(null)
  const [isLoadingPreviousSalary, setIsLoadingPreviousSalary] = useState(false)
  const [hasPreviousSalaryError, setHasPreviousSalaryError] = useState(false)

  useEffect(() => {
    if (!record.employeeId || !record.startDate) {
      setPreviousSalary(null)
      setHasPreviousSalaryError(false)
      return
    }

    let isActive = true
    setIsLoadingPreviousSalary(true)
    setHasPreviousSalaryError(false)
    graphqlClient
      .request<PreviousSalaryQueryResult>(GET_PREVIOUS_EMPLOYEE_SALARY, {
        employeeId: record.employeeId,
        startDate: record.startDate
      })
      .then(result => {
        if (isActive) {
          setPreviousSalary(result.EmployeeSalary?.[0] ?? null)
        }
      })
      .catch(() => {
        if (isActive) {
          setPreviousSalary(null)
          setHasPreviousSalaryError(true)
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingPreviousSalary(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [graphqlClient, record.employeeId, record.startDate])

  return { previousSalary, isLoadingPreviousSalary, hasPreviousSalaryError }
}

export function SalaryDetailPanel({ record, t, accessToken }: SalaryDetailPanelProps) {
  const curr = record.currency?.code ?? ''
  const statusLabel = humanizeStatus(record.requestStatus)
  const translatedStatusLabel = translateStatusLabel(statusLabel, t)
  const hasAdjustment = record.requestedPercent != null || record.requestedAmount != null
  const { previousSalary, isLoadingPreviousSalary, hasPreviousSalaryError } = usePreviousSalary(accessToken, record)
  const salaryBasis = getPrimarySalaryPair(record, previousSalary).basis
  const isHourlySalary = salaryBasis === 'hourly'
  const calculatedAdjustment = useMemo(() => {
    if (!previousSalary) {
      return {
        primaryAmount: null,
        primaryPercent: null,
        monthlyAmount: null,
        monthlyPercent: null,
        annualAmount: null,
        annualPercent: null
      }
    }

    const { currentValue, previousValue } = getPrimarySalaryPair(record, previousSalary)
    const currentMonthlyGross = getMonthlyGross(record)
    const previousMonthlyGross = getMonthlyGross(previousSalary)
    const currentAnnualGross = getAnnualGross(record)
    const previousAnnualGross = getAnnualGross(previousSalary)
    const monthlyAmount =
      currentMonthlyGross != null && previousMonthlyGross != null ? currentMonthlyGross - previousMonthlyGross : null
    const annualAmount =
      currentAnnualGross != null && previousAnnualGross != null ? currentAnnualGross - previousAnnualGross : null
    const fallbackMonthlyAmount =
      record.requestedAmount ?? calculateAmountFromPercentage(previousMonthlyGross, record.requestedPercent)
    const fallbackAnnualAmount =
      record.requestedAmount != null
        ? record.requestedAmount * 12
        : calculateAmountFromPercentage(previousAnnualGross, record.requestedPercent)
    const resolvedMonthlyAmount = resolveCalculatedAmount(monthlyAmount, fallbackMonthlyAmount)
    const resolvedAnnualAmount = resolveCalculatedAmount(annualAmount, fallbackAnnualAmount)
    const monthlyPercent =
      resolvedMonthlyAmount != null && previousMonthlyGross != null
        ? calculatePercentageFromAmount(previousMonthlyGross, resolvedMonthlyAmount)
        : null
    const annualPercent =
      resolvedAnnualAmount != null && previousAnnualGross != null
        ? calculatePercentageFromAmount(previousAnnualGross, resolvedAnnualAmount)
        : null

    if (currentValue == null || previousValue == null) {
      return {
        primaryAmount: null,
        primaryPercent: null,
        monthlyAmount: resolvedMonthlyAmount,
        monthlyPercent,
        annualAmount: resolvedAnnualAmount,
        annualPercent
      }
    }

    const primaryAmount = currentValue - previousValue
    const fallbackPrimaryAmount =
      record.requestedAmount ?? calculateAmountFromPercentage(previousValue, record.requestedPercent)
    const resolvedPrimaryAmount = resolveCalculatedAmount(primaryAmount, fallbackPrimaryAmount)
    const primaryPercent =
      resolvedPrimaryAmount != null ? calculatePercentageFromAmount(previousValue, resolvedPrimaryAmount) : null
    return {
      primaryAmount: resolvedPrimaryAmount,
      primaryPercent,
      monthlyAmount: resolvedMonthlyAmount,
      monthlyPercent,
      annualAmount: resolvedAnnualAmount,
      annualPercent
    }
  }, [previousSalary, record])
  const shouldShowCalculatedFieldsSpinner = isLoadingPreviousSalary && !hasPreviousSalaryError && !previousSalary
  const fallbackChangeLabel = buildFallbackChangeLabel(record, curr)
  const hourlyChangeLabel = buildCalculatedChangeLabel({
    amount: calculatedAdjustment.primaryAmount,
    percent: calculatedAdjustment.primaryPercent,
    requestedPercent: record.requestedPercent,
    currencyCode: curr
  })
  const monthlyChangeLabel = buildCalculatedChangeLabel({
    amount: calculatedAdjustment.monthlyAmount,
    percent: calculatedAdjustment.monthlyPercent,
    requestedPercent: record.requestedPercent,
    currencyCode: curr
  })
  const annualChangeLabel = buildCalculatedChangeLabel({
    amount: calculatedAdjustment.annualAmount,
    percent: calculatedAdjustment.annualPercent,
    requestedPercent: record.requestedPercent,
    currencyCode: curr
  })
  const visibleHourlyChangeLabel = hourlyChangeLabel ?? fallbackChangeLabel
  const visibleMonthlyChangeLabel = monthlyChangeLabel ?? fallbackChangeLabel

  return (
    <>
      <EmployeeHero
        name={record.employee?.displayName ?? record.employee?.fullName ?? '-'}
        picture={record.employee?.pictureThumbnail}
        subtitle={getEmployeeDepartment(record.employee)}
        employeeId={record.employee?.id}
        t={t}
      />

      <div className="gba:space-y-4">
        {shouldShowCalculatedFieldsSpinner && (
          <Section title={t('section-previous-salary')}>
            {isHourlySalary ? (
              <FieldRow label={t('field-hourly-gross')} value={<Spinner size="sm" />} />
            ) : (
              <>
                <FieldRow label={t('field-monthly-gross')} value={<Spinner size="sm" />} />
                <FieldRow label={t('field-annual-gross')} value={<Spinner size="sm" />} />
              </>
            )}
          </Section>
        )}

        {previousSalary && (
          <Section title={t('section-previous-salary')}>
            {isHourlySalary ? (
              <FieldRow
                label={t('field-hourly-gross')}
                value={formatCurrencyValue(previousSalary.hourlyGrossSalary, curr)}
              />
            ) : (
              <>
                <FieldRow
                  label={t('field-monthly-gross')}
                  value={formatCurrencyValue(previousSalary.monthlyGrossSalary, curr)}
                />
                <FieldRow
                  label={t('field-annual-gross')}
                  value={formatCurrencyValue(previousSalary.annualGrossSalary, curr)}
                />
              </>
            )}
          </Section>
        )}

        {hasAdjustment && (
          <Section title={t('section-adjustment')}>
            {shouldShowCalculatedFieldsSpinner && isHourlySalary ? (
              <FieldRow label={t('field-change-per-hour')} value={<Spinner size="sm" />} />
            ) : null}
            {shouldShowCalculatedFieldsSpinner && !isHourlySalary ? (
              <>
                <FieldRow label={t('field-change-per-month')} value={<Spinner size="sm" />} />
                <FieldRow label={t('field-change-per-year')} value={<Spinner size="sm" />} />
              </>
            ) : null}
            {!shouldShowCalculatedFieldsSpinner && isHourlySalary && visibleHourlyChangeLabel ? (
              <FieldRow
                label={t('field-change-per-hour')}
                value={renderAdjustmentBadge(
                  visibleHourlyChangeLabel.value,
                  adjustmentBadgeVariant(visibleHourlyChangeLabel.numericValue)
                )}
              />
            ) : null}
            {!shouldShowCalculatedFieldsSpinner && !isHourlySalary && visibleMonthlyChangeLabel ? (
              <FieldRow
                label={t('field-change-per-month')}
                value={renderAdjustmentBadge(
                  visibleMonthlyChangeLabel.value,
                  adjustmentBadgeVariant(visibleMonthlyChangeLabel.numericValue)
                )}
              />
            ) : null}
            {!shouldShowCalculatedFieldsSpinner && !isHourlySalary && annualChangeLabel ? (
              <FieldRow
                label={t('field-change-per-year')}
                value={renderAdjustmentBadge(
                  annualChangeLabel.value,
                  adjustmentBadgeVariant(annualChangeLabel.numericValue)
                )}
              />
            ) : null}
          </Section>
        )}

        <Section title={t('section-resulting-salary')}>
          {isHourlySalary ? (
            <FieldRow label={t('field-hourly-gross')} value={formatCurrencyValue(record.hourlyGrossSalary, curr)} />
          ) : (
            <>
              <FieldRow label={t('field-monthly-gross')} value={formatCurrencyValue(record.monthlyGrossSalary, curr)} />
              <FieldRow label={t('field-annual-gross')} value={formatCurrencyValue(record.annualGrossSalary, curr)} />
            </>
          )}
        </Section>

        <Section title={t('section-details')}>
          <FieldRow label={t('field-effective-from')} value={formatDateShort(record.startDate)} />
          <FieldRow label={t('field-effective-to')} value={formatDateShort(record.endDate)} />
          <FieldRow
            label={t('col-status')}
            value={
              <Badge variant={statusBadgeVariant(statusLabel)} size="sm">
                {translatedStatusLabel}
              </Badge>
            }
          />
          <FieldRow label={t('field-decision-date')} value={formatDateShort(record.decisionDate)} />
          <FieldRow label={t('field-reason')} value={getSalaryReasonDisplay(record)} />
        </Section>

        {record.notes && (
          <Section title={t('section-notes')}>
            <p className="gba:text-sm gba:text-foreground">{record.notes}</p>
          </Section>
        )}
      </div>
    </>
  )
}

interface BonusDetailPanelProps {
  readonly record: BonusRecord
  readonly t: TranslationFn
}

export function BonusDetailPanel({ record, t }: BonusDetailPanelProps) {
  const curr = record.currency?.code ?? ''
  const statusLabel = humanizeStatus(record.status)
  const translatedStatusLabel = translateStatusLabel(statusLabel, t)
  return (
    <>
      <EmployeeHero
        name={record.employee?.displayName ?? record.employee?.fullName ?? '-'}
        picture={record.employee?.pictureThumbnail}
        subtitle={getEmployeeDepartment(record.employee)}
        employeeId={record.employee?.id}
        t={t}
      />

      <div className="gba:space-y-4">
        <Section title={t('section-bonus')}>
          <FieldRow label={t('field-type')} value={getCatalogDisplayValue(record.employeeBonusType)} />
          <FieldRow label={t('field-amount')} value={formatCurrencyValue(record.amount, curr)} />
          <FieldRow
            label={t('col-status')}
            value={
              statusLabel === '-' ? (
                '-'
              ) : (
                <Badge variant={statusBadgeVariant(statusLabel)} size="sm">
                  {translatedStatusLabel}
                </Badge>
              )
            }
          />
        </Section>

        <Section title={t('section-details')}>
          <FieldRow label={t('field-payment-date')} value={formatDateShort(record.paymentDate)} />
          <FieldRow label={t('field-fiscal-year')} value={record.fiscalYear?.toString() ?? '-'} />
          <FieldRow label={t('field-description')} value={record.description ?? '-'} />
        </Section>

        {record.notes && (
          <Section title={t('section-notes')}>
            <p className="gba:text-sm gba:text-foreground">{record.notes}</p>
          </Section>
        )}
      </div>
    </>
  )
}

interface BenefitDetailPanelProps {
  readonly record: BenefitChangeRecord
  readonly t: TranslationFn
}

export function BenefitDetailPanel({ record, t }: BenefitDetailPanelProps) {
  const curr = record.currency?.code ?? ''
  const statusLabel = humanizeStatus(record.benefitStatus ?? record.status)
  const translatedStatusLabel = translateStatusLabel(statusLabel, t)
  return (
    <>
      <EmployeeHero
        name={record.employee?.displayName ?? record.employee?.fullName ?? '-'}
        picture={record.employee?.pictureThumbnail}
        subtitle={getEmployeeDepartment(record.employee)}
        employeeId={record.employee?.id}
        t={t}
      />

      <div className="gba:space-y-4">
        <Section title={t('section-benefit')}>
          <FieldRow label={t('field-type')} value={getCatalogDisplayValue(record.benefitType)} />
          <FieldRow label={t('field-provider')} value={getCatalogDisplayValue(record.benefitProvider)} />
          <FieldRow
            label={t('col-status')}
            value={
              <Badge variant={statusBadgeVariant(statusLabel)} size="sm">
                {translatedStatusLabel}
              </Badge>
            }
          />
        </Section>

        <Section title={t('section-amounts')}>
          <FieldRow label={t('field-monthly-amount')} value={formatCurrencyValue(record.monthlyAmount, curr)} />
          <FieldRow label={t('field-yearly-amount')} value={formatCurrencyValue(record.yearlyAmount, curr)} />
          <FieldRow
            label={t('field-employee-monthly-contrib')}
            value={formatCurrencyValue(record.employeeMonthlyContribution, curr)}
          />
        </Section>

        <Section title={t('section-period')}>
          <FieldRow label={t('field-start-date')} value={formatDateShort(record.startDate)} />
          <FieldRow label={t('field-end-date')} value={formatDateShort(record.endDate)} />
        </Section>

        {record.notes && (
          <Section title={t('section-notes')}>
            <p className="gba:text-sm gba:text-foreground">{record.notes}</p>
          </Section>
        )}
      </div>
    </>
  )
}
