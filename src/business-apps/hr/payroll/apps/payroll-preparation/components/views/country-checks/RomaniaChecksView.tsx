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
  t: (key: string) => string
}

export const RomaniaChecksView: React.FC<RomaniaChecksViewProps> = ({ employees, t }) => {
  const roIssues = employees.reduce((sum, emp) => {
    return sum + emp.issues.filter(i => i.issueCode.startsWith('RO_') && i.status === 'open').length
  }, 0)

  return (
    <div className="gba:space-y-6">
      <Card className="gba:p-4 gba:flex gba:items-center gba:justify-between">
        <div>
          <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">
            {t('country-ro')} — {t('country-checks-title')}
          </h3>
          <p className="gba:text-sm gba:text-muted-foreground">
            {employees.length} {t('summary-total').toLowerCase()}, {roIssues} {t('grid-issues').toLowerCase()}
          </p>
        </div>
      </Card>

      <Card className="gba:overflow-hidden">
        <div className="gba:overflow-x-auto">
          <Table>
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
                  <TableRow key={emp.id}>
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
                      <FieldStatusBadge present={!!emp.socialInsuranceNumber} label={emp.socialInsuranceNumber} />
                    </TableCell>
                    <TableCell>
                      {emp.baseSalary != null ? (
                        <Badge variant="secondary">
                          {emp.baseSalary} {emp.currency}
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Missing</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {emp.weeklyHours != null ? (
                        <Badge variant="secondary">{emp.weeklyHours}h</Badge>
                      ) : (
                        <Badge variant="destructive">Missing</Badge>
                      )}
                    </TableCell>
                    <TableCell className="gba:text-sm gba:text-muted-foreground">{emp.sickLeaveDays || 0}</TableCell>
                    <TableCell>
                      {emp.sickLeaveDays > 0 ? (
                        <Badge variant="warning">{t('ro-medical-cert')}</Badge>
                      ) : (
                        <Badge variant="secondary">N/A</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <FieldStatusBadge present={emp.bankDetailsPresent} />
                    </TableCell>
                    <TableCell>
                      <IssueCountBadge count={openIssues.length} hasBlockers={hasBlockers} />
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
