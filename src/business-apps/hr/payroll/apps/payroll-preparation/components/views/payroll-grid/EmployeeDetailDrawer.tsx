import React from 'react'
import { createPortal } from 'react-dom'
import { Badge, Button, Card } from '@newwork/nw-design-system'
import { XIcon, UserIcon, ArrowSquareOutIcon } from '@phosphor-icons/react'
import type { PayrollEmployee, PayrollCountry } from '../../../types/payrollTypes'
import { ReadinessStatusBadge, SeverityBadge } from '../../shared/StatusBadge'
import { Navigation, navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { getPictureDataUrl } from '../../../utils/imageUtils'

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
    <span className="gba:text-foreground gba:font-medium gba:text-right gba:max-w-[60%]">{value || '—'}</span>
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

export const EmployeeDetailDrawer: React.FC<EmployeeDetailDrawerProps> = ({ employee, country, onClose, t }) => {
  if (employee === null) return null

  const openEmployeeRecord = () => {
    navigateTo(buildPlatformUrl(Navigation.HR_EMPLOYEE_RECORD, { id: employee.employeeId }))
  }

  const openIssues = employee.issues.filter(i => i.status === 'open')

  const panel = (
    <>
      <button
        type="button"
        aria-label={t('close')}
        className="gba:fixed gba:inset-0 gba:z-[100] gba:bg-black/20 gba:cursor-default"
        onClick={onClose}
        data-testid="payroll-prep-employee-drawer-backdrop"
      />
      <aside
        className="gba:fixed gba:top-0 gba:bottom-0 gba:right-0 gba:w-[480px] gba:max-w-[100vw] gba:bg-background gba:shadow-2xl gba:z-[101] gba:overflow-y-auto gba:border-l gba:border-border"
        data-testid="payroll-prep-employee-drawer"
      >
        <div className="gba:sticky gba:top-0 gba:bg-background gba:z-10 gba:border-b gba:border-border gba:px-6 gba:py-4">
          <div className="gba:flex gba:items-center gba:justify-between">
            <div className="gba:flex gba:items-center gba:gap-3">
              <div className="gba:w-10 gba:h-10 gba:rounded-full gba:bg-muted gba:flex gba:items-center gba:justify-center">
                {employee.pictureThumbnail ? (
                  <img
                    src={`data:image/jpeg;base64,${employee.pictureThumbnail}`}
                    alt=""
                    className="gba:w-10 gba:h-10 gba:rounded-full gba:object-cover"
                  />
                ) : (
                  <UserIcon size={20} className="gba:text-muted-foreground" />
                )}
              </div>
              <div>
                <h3 className="gba:text-base gba:font-semibold gba:text-foreground">{employee.displayName}</h3>
                <p className="gba:text-xs gba:text-muted-foreground">{employee.code}</p>
              </div>
            </div>
            <div className="gba:flex gba:items-center gba:gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={openEmployeeRecord}
                title={t('employee-detail-title')}
                data-testid="payroll-prep-employee-drawer-open-record-button"
              >
                <ArrowSquareOutIcon size={18} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                data-testid="payroll-prep-employee-drawer-close-button"
              >
                <XIcon size={18} />
              </Button>
            </div>
          </div>
          <div className="gba:mt-2">
            <ReadinessStatusBadge status={employee.readinessStatus} t={t} />
          </div>
        </div>

        <div className="gba:px-6 gba:py-4">
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
              value={employee.bankDetailsPresent ? employee.bankAccountIban || t('label-present') : t('label-missing')}
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
              <Field label={t('grid-missing-presence')} value={`${employee.missingPresenceDays} ${t('label-days')}`} />
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
            {employee.overtimeHours !== null && employee.overtimeHours !== undefined && employee.overtimeHours > 0 && (
              <Field
                label={t('grid-overtime')}
                value={formatHoursValue(employee.overtimeHours, t('unit-hours-short'))}
              />
            )}
          </Section>

          {country === 'DE' && (
            <Section title={t('country-de')}>
              <Field label={t('de-tax-id')} value={employee.taxId || t('label-missing')} />
              <Field label={t('de-social-insurance')} value={employee.socialInsuranceNumber || t('label-missing')} />
              <Field label={t('de-health-insurance')} value={employee.healthInsuranceName || t('label-missing')} />
              <Field label={t('de-employment-type')} value={employee.employmentTypeFlag || t('label-not-set')} />
            </Section>
          )}

          {country === 'RO' && (
            <Section title={t('country-ro')}>
              <Field label={t('ro-cnp')} value={employee.socialInsuranceNumber || t('label-missing')} />
            </Section>
          )}

          {openIssues.length > 0 && (
            <Section title={`${t('employee-detail-issues')} (${openIssues.length})`}>
              <div className="gba:space-y-3">
                {openIssues.map(issue => (
                  <Card key={issue.id} className="gba:p-3">
                    <div className="gba:flex gba:items-start gba:justify-between gba:mb-1">
                      <span className="gba:text-xs gba:font-mono gba:text-muted-foreground">{issue.issueCode}</span>
                      <SeverityBadge severity={issue.severity} t={t} />
                    </div>
                    <p className="gba:text-sm gba:text-foreground gba:mb-1">{issue.message}</p>
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
                  <div key={change.id} className="gba:text-sm gba:py-2 gba:border-b gba:border-border">
                    <div className="gba:flex gba:justify-between">
                      <span className="gba:font-medium gba:text-foreground">{change.fieldName}</span>
                      <span className="gba:text-xs gba:text-muted-foreground">{change.effectiveDate}</span>
                    </div>
                    <div className="gba:flex gba:gap-2 gba:text-xs gba:mt-1">
                      <Badge variant="destructive" className="gba:line-through">
                        {change.oldValue || '—'}
                      </Badge>
                      <span className="gba:text-muted-foreground">&rarr;</span>
                      <Badge variant="success">{change.newValue || '—'}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      </aside>
    </>
  )

  if (typeof document === 'undefined') {
    return null
  }

  return createPortal(panel, document.body)
}
