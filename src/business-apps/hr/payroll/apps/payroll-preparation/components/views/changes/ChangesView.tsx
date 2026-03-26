import React, { useState, useMemo } from 'react'
import {
  Badge,
  Card,
  DebouncedInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead
} from '@newwork/nw-design-system'
import { ArrowsClockwiseIcon, MagnifyingGlassIcon, FunnelIcon } from '@phosphor-icons/react'
import type { PayrollEmployee, PayrollChangeEvent, ChangeType } from '../../../types/payrollTypes'

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
  const [searchQuery, setSearchQuery] = useState('')
  const [changeTypeFilter, setChangeTypeFilter] = useState<ChangeType | 'all'>('all')

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

  const filteredChanges = useMemo(() => {
    let result = allChanges

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        c =>
          c.employeeName.toLowerCase().includes(q) ||
          c.employeeCode.toLowerCase().includes(q) ||
          c.fieldName.toLowerCase().includes(q)
      )
    }

    if (changeTypeFilter !== 'all') {
      result = result.filter(c => c.changeType === changeTypeFilter)
    }

    return result
  }, [allChanges, searchQuery, changeTypeFilter])

  const changeTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const change of allChanges) {
      counts[change.changeType] = (counts[change.changeType] || 0) + 1
    }
    return counts
  }, [allChanges])

  const availableChangeTypes = useMemo(() => Object.keys(changeTypeCounts).sort() as ChangeType[], [changeTypeCounts])

  if (changedEmployees.length === 0 && allChanges.length === 0) {
    return (
      <div className="gba:space-y-6">
        <Card className="gba:p-12 gba:text-center">
          <ArrowsClockwiseIcon size={48} className="gba:mx-auto gba:text-muted-foreground/40 gba:mb-4" />
          <h3 className="gba:text-lg gba:font-medium gba:text-foreground gba:mb-2">{t('changes-title')}</h3>
          <p className="gba:text-sm gba:text-muted-foreground">{t('changes-empty')}</p>
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

      <div className="gba:flex gba:items-center gba:gap-3 gba:flex-wrap">
        <div className="gba:relative gba:flex-1 gba:min-w-[200px] gba:max-w-[320px]">
          <MagnifyingGlassIcon
            size={16}
            className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:text-muted-foreground"
          />
          <DebouncedInput
            value={searchQuery}
            onChange={(val: string | number) => setSearchQuery(String(val))}
            placeholder={t('changes-search-placeholder')}
            className="gba:pl-9"
          />
        </div>

        <div className="gba:flex gba:items-center gba:gap-1.5 gba:text-muted-foreground">
          <FunnelIcon size={16} />
        </div>

        <div className="gba:flex gba:items-center gba:gap-2">
          <span className="gba:text-sm gba:font-medium gba:text-foreground gba:whitespace-nowrap">
            {t('changes-type-label')}
          </span>
          <div className="gba:min-w-[180px]">
            <Select
              value={changeTypeFilter}
              onValueChange={(val: string) => setChangeTypeFilter(val as ChangeType | 'all')}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('filter-all')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filter-all')}</SelectItem>
                {availableChangeTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {CHANGE_TYPE_LABELS[type] || type} ({changeTypeCounts[type]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
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
                <TableHead className="gba:whitespace-nowrap">{t('changes-col-type')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">{t('changes-col-field')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">{t('changes-col-old')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">{t('changes-col-new')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">{t('changes-col-effective')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">{t('changes-col-changed-at')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">{t('changes-col-changed-by')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredChanges.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="gba:text-center gba:py-8 gba:text-muted-foreground">
                    {allChanges.length === 0 ? t('changes-empty') : t('changes-no-match')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredChanges.map(change => (
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
