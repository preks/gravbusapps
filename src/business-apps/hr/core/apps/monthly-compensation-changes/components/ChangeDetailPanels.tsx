import { Badge } from '@newwork/nw-design-system'
import type { BenefitChangeRecord, BonusRecord, SalaryChangeRecord } from '../types/compensationChanges.types'
import {
  formatCurrencyValue,
  formatDateShort,
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
}

export function SalaryDetailPanel({ record, t }: SalaryDetailPanelProps) {
  const curr = record.currency?.code ?? ''
  const statusLabel = humanizeStatus(record.requestStatus)
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
        <Section title={t('section-salary')}>
          <FieldRow label={t('field-monthly-gross')} value={formatCurrencyValue(record.monthlyGrossSalary, curr)} />
          <FieldRow label={t('field-annual-gross')} value={formatCurrencyValue(record.annualGrossSalary, curr)} />
          <FieldRow label={t('field-hourly-gross')} value={formatCurrencyValue(record.hourlyGrossSalary, curr)} />
        </Section>

        {(record.requestedPercent != null || record.requestedAmount != null) && (
          <Section title={t('section-adjustment')}>
            {record.requestedPercent != null && (
              <FieldRow
                label={t('field-increase-percent')}
                value={
                  <Badge variant="success" size="sm">
                    {record.requestedPercent}%
                  </Badge>
                }
              />
            )}
            {record.requestedAmount != null && (
              <FieldRow
                label={t('field-increase-amount')}
                value={
                  <Badge variant="success" size="sm">
                    {formatCurrencyValue(record.requestedAmount, curr)}
                  </Badge>
                }
              />
            )}
          </Section>
        )}

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
          <FieldRow label={t('field-reason')} value={humanizeCatalogRef(record.salaryAdjustReasonRef)} />
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
          <FieldRow label={t('field-type')} value={record.employeeBonusType?.value ?? '-'} />
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
          <FieldRow label={t('field-type')} value={record.benefitType?.value ?? '-'} />
          <FieldRow label={t('field-provider')} value={record.benefitProvider?.value ?? '-'} />
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
