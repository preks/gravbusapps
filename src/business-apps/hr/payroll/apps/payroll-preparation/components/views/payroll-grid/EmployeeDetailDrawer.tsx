import React from 'react'
import { Badge, Card, ScrollArea, Sheet, SheetContent, SheetHeader, SheetTitle } from '@newwork/nw-design-system'
import type { PayrollEmployee, PayrollCountry } from '../../../types/payrollTypes'
import { ReadinessStatusBadge, SeverityBadge } from '../../shared/StatusBadge'
import { Navigation, navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { payrollIssueCodeTitle } from '../../../utils/payrollIssueCodeLabels'
import { EmployeeDrawerHero } from '../../shared/EmployeeDrawerHero'

interface EmployeeDetailDrawerProps {
  employee: PayrollEmployee | null
  country: PayrollCountry
  onClose: () => void
  t: (key: string) => string
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="gba:mb-6">
    <h4 className="gba:text-sm gba:font-semibold gba:text-foreground gba:mb-3 gba:border-b gba:border-border gba:pb-2">
      {title}
    </h4>
    {children}
  </div>
)

const Field: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="gba:flex gba:justify-between gba:py-1.5 gba:text-sm">
    <span className="gba:text-muted-foreground">{label}</span>
    <span className="gba:text-foreground gba:font-medium gba:text-right gba:max-w-[60%]">{value || '-'}</span>
  </div>
)

function formatHoursValue(value: number | null | undefined, unitHoursShort: string): string | null {
  if (value === null || value === undefined) {
    return null
  }

  return `${value}${unitHoursShort}`
}

function formatOptionalValue(value: number | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null
  }

  return String(value)
}

/** Matches Changes tab / payroll grid date display for `PayrollChangeEvent.effectiveDate`. */
function formatChangeEffectiveDate(isoDate: string | undefined): string {
  if (!isoDate) {
    return '-'
  }

  return new Date(isoDate).toLocaleDateString()
}

export const EmployeeDetailDrawer: React.FC<EmployeeDetailDrawerProps> = ({ employee, country, onClose, t }) => {
  if (employee === null) {
    return null
  }

  const openEmployeeRecord = () => {
    navigateTo(buildPlatformUrl(Navigation.HR_EMPLOYEE_RECORD, { id: employee.employeeId }))
  }

  const openIssues = employee.issues.filter(i => i.status === 'open')

  return (
    <Sheet open={employee !== null} onOpenChange={open => !open && onClose()}>
      <SheetContent side="right" className="gba:flex gba:flex-col gba:p-0" data-testid="payroll-prep-employee-drawer">
        <SheetHeader className="gba:border-b gba:border-border gba:px-6 gba:py-4 gba:pr-14">
          <SheetTitle className="gba:text-left">{t('employee-information-title')}</SheetTitle>
        </SheetHeader>

        <ScrollArea className="gba:flex-1 gba:min-h-0">
          <div className="gba:px-6 gba:py-4">
            <EmployeeDrawerHero
              employee={employee}
              onOpenProfile={openEmployeeRecord}
              t={t}
              testIdPrefix="payroll-prep-employee-drawer"
            />

            <div className="gba:mb-6">
              <ReadinessStatusBadge status={employee.readinessStatus} t={t} />
            </div>

            <Section title={t('employee-detail-summary')}>
              <Field label={t('grid-status')} value={employee.employmentStatus} />
              <Field label={t('grid-department')} value={employee.department} />
              <Field label={t('grid-cost-center')} value={employee.costCenter} />
              <Field label={t('grid-location')} value={employee.workLocation} />
              <Field label={t('grid-legal-entity')} value={employee.legalEntityName} />
            </Section>

            <Section title={t('employee-detail-contract')}>
              <Field label={t('grid-contract-type')} value={employee.contractType} />
              <Field
                label={t('grid-hire-date')}
                value={employee.hireDate ? new Date(employee.hireDate).toLocaleDateString() : null}
              />
              <Field
                label={t('grid-termination-date')}
                value={employee.terminationDate ? new Date(employee.terminationDate).toLocaleDateString() : null}
              />
              <Field label={t('grid-fte')} value={formatOptionalValue(employee.fte)} />
              <Field label={t('grid-capacity')} value={formatHoursValue(employee.weeklyHours, t('unit-hours-short'))} />
              <Field
                label={t('grid-base-salary')}
                value={
                  employee.baseSalary === null || employee.baseSalary === undefined
                    ? null
                    : `${employee.baseSalary.toLocaleString()} ${employee.currency}`
                }
              />
              <Field
                label={t('grid-bank-details')}
                value={
                  employee.bankDetailsPresent ? employee.bankAccountIban || t('label-present') : t('label-missing')
                }
              />
            </Section>

            <Section title={t('employee-detail-time')}>
              <Field
                label={t('grid-paid-leave')}
                value={`${employee.paidLeaveHours}${t('unit-hours-short')} (${employee.paidLeaveDays}${t('unit-days-short')})`}
              />
              <Field
                label={t('grid-sick-leave')}
                value={`${employee.sickLeaveHours}${t('unit-hours-short')} (${employee.sickLeaveDays}${t('unit-days-short')})`}
              />
              <Field label={t('grid-unpaid-leave')} value={`${employee.unpaidLeaveDays} ${t('label-days')}`} />
              <Field label={t('grid-other-leave')} value={`${employee.otherLeaveDays} ${t('label-days')}`} />
              {employee.missingPresenceDays > 0 && (
                <Field
                  label={t('grid-missing-presence')}
                  value={`${employee.missingPresenceDays} ${t('label-days')}`}
                />
              )}
              {employee.loggedHours !== null && employee.loggedHours !== undefined && (
                <Field
                  label={t('grid-logged-hours')}
                  value={formatHoursValue(employee.loggedHours, t('unit-hours-short'))}
                />
              )}
              {employee.contractCapacityHours !== null && employee.contractCapacityHours !== undefined && (
                <Field
                  label={t('grid-capacity')}
                  value={formatHoursValue(employee.contractCapacityHours, t('unit-hours-short'))}
                />
              )}
              {employee.balanceHours !== null && employee.balanceHours !== undefined && (
                <Field
                  label={t('grid-balance')}
                  value={
                    <Badge variant={employee.balanceHours >= 0 ? 'success' : 'destructive'}>
                      {employee.balanceHours >= 0 ? '+' : ''}
                      {employee.balanceHours}
                      {t('unit-hours-short')}
                    </Badge>
                  }
                />
              )}
              {employee.overtimeHours !== null &&
                employee.overtimeHours !== undefined &&
                employee.overtimeHours > 0 && (
                  <Field
                    label={t('grid-overtime')}
                    value={formatHoursValue(employee.overtimeHours, t('unit-hours-short'))}
                  />
                )}
            </Section>

            {country === 'DE' && (
              <Section title={t('country-de')}>
                <Field label={t('de-tax-id')} value={employee.taxId || t('label-missing')} />
                <Field label={t('de-elstam')} value={employee.elstamStatus || t('label-missing')} />
                <Field label={t('de-social-insurance')} value={employee.socialInsuranceNumber || t('label-missing')} />
                <Field label={t('de-health-insurance')} value={employee.healthInsuranceName || t('label-missing')} />
                <Field label={t('de-eau')} value={employee.eauStatus || t('label-missing')} />
                <Field label={t('de-employment-type')} value={employee.employmentTypeFlag || t('label-not-set')} />
              </Section>
            )}

            {country === 'RO' && (
              <Section title={t('country-ro')}>
                <Field label={t('ro-cnp')} value={employee.socialInsuranceNumber || t('label-missing')} />
                <Field
                  label={t('ro-medical-cert')}
                  value={
                    employee.sickLeaveDays > 0 ? (
                      <Badge variant="warning">{t('ro-medical-cert')}</Badge>
                    ) : (
                      <Badge variant="secondary">{t('label-not-applicable')}</Badge>
                    )
                  }
                />
              </Section>
            )}

            {openIssues.length > 0 && (
              <Section title={`${t('employee-detail-issues')} (${openIssues.length})`}>
                <div className="gba:space-y-3">
                  {openIssues.map(issue => (
                    <Card
                      key={issue.id}
                      className="gba:p-3"
                      data-issue-code={issue.issueCode}
                      data-testid={`payroll-prep-employee-issue-${issue.id}`}
                    >
                      <div className="gba:mb-1 gba:flex gba:items-start gba:justify-between gba:gap-2">
                        <p className="gba:min-w-0 gba:text-sm gba:font-medium gba:text-foreground">
                          {payrollIssueCodeTitle(issue.issueCode, t)}
                        </p>
                        <SeverityBadge severity={issue.severity} t={t} />
                      </div>
                      <p className="gba:mb-1 gba:text-sm gba:text-foreground">{issue.message}</p>
                      <p className="gba:text-xs gba:text-primary">{issue.recommendedAction}</p>
                    </Card>
                  ))}
                </div>
              </Section>
            )}

            {employee.changes.length > 0 && (
              <Section title={t('employee-detail-changes')}>
                <div className="gba:space-y-2">
                  {employee.changes.map(change => (
                    <div key={change.id} className="gba:border-b gba:border-border gba:py-2 gba:text-sm">
                      <div className="gba:flex gba:justify-between">
                        <span className="gba:font-medium gba:text-foreground">{change.fieldName}</span>
                        <span className="gba:text-xs gba:text-muted-foreground">
                          {formatChangeEffectiveDate(change.effectiveDate)}
                        </span>
                      </div>
                      <div className="gba:mt-1 gba:flex gba:gap-2 gba:text-xs">
                        <Badge variant="destructive" className="gba:line-through">
                          {change.oldValue || '-'}
                        </Badge>
                        <span className="gba:text-muted-foreground">&rarr;</span>
                        <Badge variant="success">{change.newValue || '-'}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
