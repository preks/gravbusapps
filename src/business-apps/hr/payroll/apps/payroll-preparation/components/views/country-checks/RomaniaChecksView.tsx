import React from 'react'
import {
  Badge,
  Card,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
  Avatar,
  AvatarImage,
  AvatarFallback
} from '@newwork/nw-design-system'
import type { PayrollEmployee } from '../../../types/payrollTypes'
import { ReadinessStatusBadge, IssueCountBadge, FieldStatusBadge } from '../../shared/StatusBadge'
import { getPictureDataUrl } from '../../../utils/imageUtils'

interface RomaniaChecksViewProps {
  employees: PayrollEmployee[]
  onSelectEmployee: (employee: PayrollEmployee) => void
  t: (key: string) => string
}

export const RomaniaChecksView: React.FC<RomaniaChecksViewProps> = ({ employees, onSelectEmployee, t }) => {
  const roIssues = employees.reduce((sum, emp) => {
    return sum + emp.issues.filter(i => i.issueCode.startsWith('RO_') && i.status === 'open').length
  }, 0)

  return (
    <div className="gba:space-y-6" data-testid="payroll-prep-country-checks-ro-view">
      <Card
        className="gba:p-4 gba:flex gba:items-center gba:justify-between"
        data-testid="payroll-prep-country-checks-ro-summary-card"
      >
        <div>
          <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">
            {t('country-ro')} - {t('country-checks-title')}
          </h3>
          <p className="gba:text-sm gba:text-muted-foreground">
            {employees.length} {t('summary-total').toLowerCase()}, {roIssues} {t('grid-issues').toLowerCase()}
          </p>
        </div>
      </Card>

      <Card className="gba:overflow-hidden gba:bg-transparent gba:shadow-none gba:border-none gba:pt-2">
        <div className="gba:overflow-x-auto gba:bg-card gba:rounded-lg">
          <Table data-testid="payroll-prep-country-checks-ro-table">
            <TableHeader>
              <TableRow>
                <TableHead className="gba:min-w-[180px]">{t('grid-employee')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">{t('ro-cnp')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">{t('grid-salary')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">{t('grid-weekly-hours')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">{t('grid-sick-leave')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">{t('ro-medical-cert')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">{t('grid-bank-details')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">{t('grid-issues')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">{t('grid-readiness')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map(emp => {
                const openIssues = emp.issues.filter(i => i.status === 'open')
                const hasBlockers = openIssues.some(i => i.severity === 'blocker')

                return (
                  <TableRow
                    key={emp.id}
                    className="gba:cursor-pointer gba:hover:bg-muted"
                    data-testid={`payroll-prep-country-checks-ro-row-${emp.id}`}
                    onClick={() => onSelectEmployee(emp)}
                  >
                    <TableCell>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Avatar size="sm" className="gba:h-7 gba:w-7 gba:flex-shrink-0">
                          <AvatarImage src={getPictureDataUrl(emp.pictureThumbnail)} alt={emp.fullName} />
                          <AvatarFallback className="gba:text-xs gba:font-medium">
                            {emp.firstName?.charAt(0) || ''}
                            {emp.lastName?.charAt(0) || ''}
                          </AvatarFallback>
                        </Avatar>
                        <span className="gba:text-sm gba:font-medium gba:text-foreground">{emp.fullName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <FieldStatusBadge
                        present={!!emp.socialInsuranceNumber}
                        label={emp.socialInsuranceNumber}
                        missingLabel={t('label-missing')}
                      />
                    </TableCell>
                    <TableCell>
                      {emp.baseSalary != null ? (
                        <Badge variant="secondary">
                          {emp.baseSalary} {emp.currency}
                        </Badge>
                      ) : (
                        <Badge variant="destructive">{t('label-missing')}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {emp.weeklyHours != null ? (
                        <Badge variant="secondary">
                          {emp.weeklyHours}
                          {t('unit-hours-short')}
                        </Badge>
                      ) : (
                        <Badge variant="destructive">{t('label-missing')}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="gba:text-sm gba:text-muted-foreground">{emp.sickLeaveDays || 0}</TableCell>
                    <TableCell>
                      {emp.sickLeaveDays > 0 ? (
                        <Badge variant="warning">{t('ro-medical-cert')}</Badge>
                      ) : (
                        <Badge variant="secondary">{t('label-not-applicable')}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <FieldStatusBadge present={emp.bankDetailsPresent} missingLabel={t('label-missing')} />
                    </TableCell>
                    <TableCell>
                      <IssueCountBadge count={openIssues.length} hasBlockers={hasBlockers} />
                    </TableCell>
                    <TableCell>
                      <ReadinessStatusBadge status={emp.readinessStatus} t={t} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
