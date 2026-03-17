import React, { useMemo } from 'react'
import { Badge, Card, Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from '@newwork/nw-design-system'
import { ArrowsClockwiseIcon } from '@phosphor-icons/react'
import type { PayrollEmployee, PayrollChangeEvent } from '../../../types/payrollTypes'

interface ChangesViewProps {
  employees: PayrollEmployee[]
  t: (key: string) => string
}

const CHANGE_TYPE_LABELS: Record<string, string> = {
  new_hire: 'New Hire',
  termination: 'Termination',
  salary_change: 'Salary Change',
  working_time_change: 'Working Time Change',
  contract_type_change: 'Contract Type Change',
  legal_entity_change: 'Legal Entity Change',
  department_change: 'Department Change',
  bank_details_change: 'Bank Details Change',
  variable_pay_change: 'Variable Pay Change',
  one_off_payment: 'One-off Payment',
  deduction_change: 'Deduction Change',
  absence_change: 'Absence Change',
  country_specific_change: 'Country-Specific Change'
}

interface ChangeWithEmployee extends PayrollChangeEvent {
  employeeName: string
  employeeCode: string
}

export const ChangesView: React.FC<ChangesViewProps> = ({ employees, t }) => {
  const changedEmployees = useMemo(() => employees.filter(e => e.changedSinceLastPayroll), [employees])

  const allChanges = useMemo(() => {
    const changes: ChangeWithEmployee[] = []
    for (const emp of changedEmployees) {
      for (const change of emp.changes) {
        changes.push({
          ...change,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          employeeCode: emp.code
        })
      }
    }
    return changes.sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())
  }, [changedEmployees])

  const changeTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const change of allChanges) {
      counts[change.changeType] = (counts[change.changeType] || 0) + 1
    }
    return counts
  }, [allChanges])

  if (changedEmployees.length === 0 && allChanges.length === 0) {
    return (
      <div className="gba:space-y-6">
        <Card className="gba:p-12 gba:text-center">
          <ArrowsClockwiseIcon size={48} className="gba:mx-auto gba:text-muted-foreground/40 gba:mb-4" />
          <h3 className="gba:text-lg gba:font-medium gba:text-foreground gba:mb-2">{t('changes-title')}</h3>
          <p className="gba:text-sm gba:text-muted-foreground">
            No changes detected since the last payroll run. Change tracking will be available once a previous payroll
            run has been closed.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="gba:space-y-6">
      <div className="gba:grid gba:grid-cols-2 md:gba:grid-cols-4 gba:gap-4">
        <Card className="gba:p-4 gba:text-center">
          <p className="gba:text-2xl gba:font-bold gba:text-primary">{changedEmployees.length}</p>
          <p className="gba:text-sm gba:text-muted-foreground">{t('changes-employees')}</p>
        </Card>
        <Card className="gba:p-4 gba:text-center">
          <p className="gba:text-2xl gba:font-bold gba:text-foreground">{allChanges.length}</p>
          <p className="gba:text-sm gba:text-muted-foreground">{t('changes-total')}</p>
        </Card>
      </div>

      {Object.keys(changeTypeCounts).length > 0 && (
        <div className="gba:flex gba:gap-3 gba:flex-wrap">
          {Object.entries(changeTypeCounts).map(([type, count]) => (
            <Card key={type} className="gba:px-3 gba:py-2">
              <span className="gba:text-sm gba:text-foreground">
                {CHANGE_TYPE_LABELS[type] || type}: <span className="gba:font-semibold">{count}</span>
              </span>
            </Card>
          ))}
        </div>
      )}

      <Card className="gba:overflow-hidden">
        <div className="gba:overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="gba:whitespace-nowrap">{t('grid-employee')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">Change Type</TableHead>
                <TableHead className="gba:whitespace-nowrap">Field</TableHead>
                <TableHead className="gba:whitespace-nowrap">Old Value</TableHead>
                <TableHead className="gba:whitespace-nowrap">New Value</TableHead>
                <TableHead className="gba:whitespace-nowrap">Effective Date</TableHead>
                <TableHead className="gba:whitespace-nowrap">Changed At</TableHead>
                <TableHead className="gba:whitespace-nowrap">Changed By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allChanges.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="gba:text-center gba:py-8 gba:text-muted-foreground">
                    No change events recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                allChanges.map(change => (
                  <TableRow key={change.id}>
                    <TableCell>
                      <div>
                        <p className="gba:text-sm gba:font-medium gba:text-foreground">{change.employeeName}</p>
                        <p className="gba:text-xs gba:text-muted-foreground gba:font-mono">{change.employeeCode}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{CHANGE_TYPE_LABELS[change.changeType] || change.changeType}</Badge>
                    </TableCell>
                    <TableCell className="gba:text-sm gba:text-foreground">{change.fieldName}</TableCell>
                    <TableCell>
                      <Badge variant="destructive" className="gba:line-through">
                        {change.oldValue || '—'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="success">{change.newValue || '—'}</Badge>
                    </TableCell>
                    <TableCell className="gba:text-sm gba:text-muted-foreground">{change.effectiveDate}</TableCell>
                    <TableCell className="gba:text-sm gba:text-muted-foreground">
                      {new Date(change.changedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="gba:text-sm gba:text-muted-foreground">{change.changedBy || '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
