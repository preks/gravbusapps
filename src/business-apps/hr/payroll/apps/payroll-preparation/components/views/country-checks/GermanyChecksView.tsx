import React from 'react'
import { Card, Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from '@newwork/nw-design-system'
import { UserIcon } from '@phosphor-icons/react'
import type { PayrollEmployee } from '../../../types/payrollTypes'
import { ReadinessStatusBadge, IssueCountBadge, FieldStatusBadge } from '../../shared/StatusBadge'

interface GermanyChecksViewProps {
  employees: PayrollEmployee[]
  t: (key: string) => string
}

export const GermanyChecksView: React.FC<GermanyChecksViewProps> = ({ employees, t }) => {
  const deIssues = employees.reduce((sum, emp) => {
    return sum + emp.issues.filter(i => i.issueCode.startsWith('DE_') && i.status === 'open').length
  }, 0)

  return (
    <div className="gba:space-y-6">
      <Card className="gba:p-4 gba:flex gba:items-center gba:justify-between">
        <div>
          <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">
            {t('country-de')} — {t('country-checks-title')}
          </h3>
          <p className="gba:text-sm gba:text-muted-foreground">
            {employees.length} {t('summary-total').toLowerCase()}, {deIssues} {t('grid-issues').toLowerCase()}
          </p>
        </div>
      </Card>

      <Card className="gba:overflow-hidden">
        <div className="gba:overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="gba:min-w-[180px]">{t('grid-employee')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">{t('de-tax-id')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">{t('de-elstam')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">{t('de-social-insurance')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">{t('de-health-insurance')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">{t('grid-sick-leave')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">{t('de-eau')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">{t('grid-bank-details')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">{t('grid-issues')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">{t('grid-readiness')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map(emp => {
                const deOpenIssues = emp.issues.filter(i => i.status === 'open')
                const hasBlockers = deOpenIssues.some(i => i.severity === 'blocker')

                return (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <div className="gba:w-7 gba:h-7 gba:rounded-full gba:bg-muted gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
                          {emp.pictureThumbnail ? (
                            <img
                              src={emp.pictureThumbnail}
                              alt=""
                              className="gba:w-7 gba:h-7 gba:rounded-full gba:object-cover"
                            />
                          ) : (
                            <UserIcon size={12} className="gba:text-muted-foreground" />
                          )}
                        </div>
                        <span className="gba:text-sm gba:font-medium gba:text-foreground">{emp.displayName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <FieldStatusBadge present={!!emp.taxId} />
                    </TableCell>
                    <TableCell>
                      <FieldStatusBadge present={!!emp.elstamStatus} label={emp.elstamStatus} />
                    </TableCell>
                    <TableCell>
                      <FieldStatusBadge present={!!emp.socialInsuranceNumber} />
                    </TableCell>
                    <TableCell>
                      <FieldStatusBadge present={!!emp.healthInsuranceName} label={emp.healthInsuranceName} />
                    </TableCell>
                    <TableCell className="gba:text-sm gba:text-muted-foreground">{emp.sickLeaveDays || 0}</TableCell>
                    <TableCell>
                      <FieldStatusBadge present={!!emp.eauStatus} label={emp.eauStatus} />
                    </TableCell>
                    <TableCell>
                      <FieldStatusBadge present={emp.bankDetailsPresent} />
                    </TableCell>
                    <TableCell>
                      <IssueCountBadge count={deOpenIssues.length} hasBlockers={hasBlockers} />
                    </TableCell>
                    <TableCell>
                      <ReadinessStatusBadge status={emp.readinessStatus} />
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
