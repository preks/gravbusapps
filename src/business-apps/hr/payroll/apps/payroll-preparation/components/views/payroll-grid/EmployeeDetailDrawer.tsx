import React from 'react'
import { Badge, Card } from '@newwork/nw-design-system'
import { XIcon, UserIcon, ArrowSquareOutIcon } from '@phosphor-icons/react'
import type { PayrollEmployee, PayrollCountry } from '../../../types/payrollTypes'
import { ReadinessStatusBadge, SeverityBadge } from '../../shared/StatusBadge'
import { Navigation, navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'

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

export const EmployeeDetailDrawer: React.FC<EmployeeDetailDrawerProps> = ({ employee, country, onClose, t }) => {
  if (!employee) return null

  const openEmployeeRecord = () => {
    navigateTo(buildPlatformUrl(Navigation.HR_EMPLOYEE_RECORD, { id: employee.employeeId }))
  }

  const openIssues = employee.issues.filter(i => i.status === 'open')

  return (
    <div className="gba:fixed gba:inset-y-0 gba:right-0 gba:w-[480px] gba:bg-background gba:shadow-2xl gba:z-50 gba:overflow-y-auto gba:border-l gba:border-border">
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
          <div className="gba:flex gba:items-center gba:gap-2">
            <button
              onClick={openEmployeeRecord}
              className="gba:p-1.5 gba:rounded gba:hover:bg-muted gba:text-muted-foreground"
              title="Open Employee Record"
            >
              <ArrowSquareOutIcon size={18} />
            </button>
            <button onClick={onClose} className="gba:p-1.5 gba:rounded gba:hover:bg-muted gba:text-muted-foreground">
              <XIcon size={18} />
            </button>
          </div>
        </div>
        <div className="gba:mt-2">
          <ReadinessStatusBadge status={employee.readinessStatus} />
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
          <Field label={t('grid-hire-date')} value={employee.hireDate} />
          <Field label={t('grid-termination-date')} value={employee.terminationDate} />
          <Field label={t('grid-fte')} value={employee.fte != null ? String(employee.fte) : null} />
          <Field label="Weekly Hours" value={employee.weeklyHours != null ? String(employee.weeklyHours) : null} />
          <Field
            label={t('grid-base-salary')}
            value={employee.baseSalary != null ? `${employee.baseSalary.toLocaleString()} ${employee.currency}` : null}
          />
          <Field
            label={t('grid-bank-details')}
            value={employee.bankDetailsPresent ? employee.bankAccountIban || 'Present' : 'Missing'}
          />
        </Section>

        <Section title={t('employee-detail-time')}>
          <Field label={t('grid-paid-leave')} value={`${employee.paidLeaveDays} days`} />
          <Field label={t('grid-sick-leave')} value={`${employee.sickLeaveDays} days`} />
          <Field label={t('grid-unpaid-leave')} value={`${employee.unpaidLeaveDays} days`} />
          <Field label="Other Leave" value={`${employee.otherLeaveDays} days`} />
          {employee.loggedHours != null && <Field label={t('grid-logged-hours')} value={`${employee.loggedHours}h`} />}
          {employee.contractCapacityHours != null && (
            <Field label={t('grid-capacity')} value={`${employee.contractCapacityHours}h`} />
          )}
          {employee.balanceHours != null && (
            <Field
              label={t('grid-balance')}
              value={
                <Badge variant={employee.balanceHours >= 0 ? 'success' : 'destructive'}>
                  {employee.balanceHours >= 0 ? '+' : ''}
                  {employee.balanceHours}h
                </Badge>
              }
            />
          )}
          {employee.overtimeHours != null && employee.overtimeHours > 0 && (
            <Field label={t('grid-overtime')} value={`${employee.overtimeHours}h`} />
          )}
        </Section>

        {country === 'DE' && (
          <Section title={t('country-de')}>
            <Field label={t('de-tax-id')} value={employee.taxId || 'Missing'} />
            <Field label={t('de-social-insurance')} value={employee.socialInsuranceNumber || 'Missing'} />
            <Field label={t('de-health-insurance')} value={employee.healthInsuranceName || 'Missing'} />
            <Field label={t('de-employment-type')} value={employee.employmentTypeFlag || 'Not set'} />
          </Section>
        )}

        {country === 'RO' && (
          <Section title={t('country-ro')}>
            <Field label={t('ro-cnp')} value={employee.socialInsuranceNumber || 'Missing'} />
          </Section>
        )}

        {openIssues.length > 0 && (
          <Section title={`${t('employee-detail-issues')} (${openIssues.length})`}>
            <div className="gba:space-y-3">
              {openIssues.map(issue => (
                <Card key={issue.id} className="gba:p-3">
                  <div className="gba:flex gba:items-start gba:justify-between gba:mb-1">
                    <span className="gba:text-xs gba:font-mono gba:text-muted-foreground">{issue.issueCode}</span>
                    <SeverityBadge severity={issue.severity} />
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
    </div>
  )
}
