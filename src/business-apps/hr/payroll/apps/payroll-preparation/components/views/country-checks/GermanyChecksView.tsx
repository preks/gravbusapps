import React from 'react'
import {
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

interface GermanyChecksViewProps {
  employees: PayrollEmployee[]
  t: (key: string) => string
}

export const GermanyChecksView: React.FC<GermanyChecksViewProps> = ({ employees, t }) => {
  const deIssues = employees.reduce((sum, emp) => {
    return sum + emp.issues.filter(i => i.issueCode.startsWith('DE_') && i.status === 'open').length
  }, 0)

  return (
    <div className="gba:space-y-6" data-testid="payroll-prep-country-checks-de-view">
      <Card
        className="gba:p-4 gba:flex gba:items-center gba:justify-between"
        data-testid="payroll-prep-country-checks-de-summary-card"
      >
        <div>
          <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">
            {t('country-de')} — {t('country-checks-title')}
          </h3>
          <p className="gba:text-sm gba:text-muted-foreground">
            {employees.length} {t('summary-total').toLowerCase()}, {deIssues} {t('grid-issues').toLowerCase()}
          </p>
        </div>
      </Card>

      <Card className="gba:overflow-hidden gba:bg-transparent gba:shadow-none gba:border-none gba:pt-2">
        <div className="gba:overflow-x-auto gba:bg-card gba:rounded-lg">
          <Table data-testid="payroll-prep-country-checks-de-table">
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
                  <TableRow key={emp.id} data-testid={`payroll-prep-country-checks-de-row-${emp.id}`}>
                    <TableCell>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Avatar size="sm" className="gba:h-7 gba:w-7 gba:flex-shrink-0">
                          <AvatarImage src={getPictureDataUrl(emp.pictureThumbnail)} alt={emp.displayName} />
                          <AvatarFallback className="gba:text-xs gba:font-medium">
                            {emp.firstName?.charAt(0) || ''}
                            {emp.lastName?.charAt(0) || ''}
                          </AvatarFallback>
                        </Avatar>
                        <span className="gba:text-sm gba:font-medium gba:text-foreground">{emp.displayName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <FieldStatusBadge present={!!emp.taxId} missingLabel={t('label-missing')} />
                    </TableCell>
                    <TableCell>
                      <FieldStatusBadge
                        present={!!emp.elstamStatus}
                        label={emp.elstamStatus}
                        missingLabel={t('label-missing')}
                      />
                    </TableCell>
                    <TableCell>
                      <FieldStatusBadge present={!!emp.socialInsuranceNumber} missingLabel={t('label-missing')} />
                    </TableCell>
                    <TableCell>
                      <FieldStatusBadge
                        present={!!emp.healthInsuranceName}
                        label={emp.healthInsuranceName}
                        missingLabel={t('label-missing')}
                      />
                    </TableCell>
                    <TableCell className="gba:text-sm gba:text-muted-foreground">{emp.sickLeaveDays || 0}</TableCell>
                    <TableCell>
                      <FieldStatusBadge
                        present={!!emp.eauStatus}
                        label={emp.eauStatus}
                        missingLabel={t('label-missing')}
                      />
                    </TableCell>
                    <TableCell>
                      <FieldStatusBadge present={emp.bankDetailsPresent} missingLabel={t('label-missing')} />
                    </TableCell>
                    <TableCell>
                      <IssueCountBadge count={deOpenIssues.length} hasBlockers={hasBlockers} />
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
