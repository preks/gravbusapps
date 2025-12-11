import React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useTranslation
} from '@newwork/nw-design-system'
import { MonthlyWorkdaysData } from '../../../../../hooks/usePerformanceData'
import { OrgEntityType } from '../tabs/Performance'
import translations from './_i18n/index'

interface MonthlyWorkdaysTableProps {
  data: MonthlyWorkdaysData[]
  entityType: OrgEntityType
  dataTestId: string
}

const MonthlyWorkdaysTable: React.FC<MonthlyWorkdaysTableProps> = ({ data, entityType, dataTestId }) => {
  const { t } = useTranslation(translations)

  const getEntityTypeLabel = (type: OrgEntityType): string => {
    switch (type) {
      case 'location':
        return t('entity-type-location')
      case 'company':
        return t('entity-type-company')
      case 'costCenter':
        return t('entity-type-cost-center')
      case 'organizationalUnit':
        return t('entity-type-org-unit')
      default:
        return t('entity-type-generic')
    }
  }

  const getEntityTypeLabelPlural = (type: OrgEntityType): string => {
    switch (type) {
      case 'location':
        return t('entity-type-plural-location')
      case 'company':
        return t('entity-type-plural-company')
      case 'costCenter':
        return t('entity-type-plural-cost-center')
      case 'organizationalUnit':
        return t('entity-type-plural-org-unit')
      default:
        return t('entity-type-plural-generic')
    }
  }

  const formatWorkdays = (workdays: number): string => {
    return workdays.toFixed(1)
  }

  if (!data || data.length === 0) {
    return (
      <div data-testid={`${dataTestId}-empty`} className="gba:text-center gba:py-8 gba:text-muted-foreground">
        <p>{t('empty-no-data', { entityType: getEntityTypeLabel(entityType) })}</p>
        <p className="gba:text-sm gba:mt-1">{t('empty-try-different')}</p>
      </div>
    )
  }

  // Get current month names
  const currentDate = new Date()
  const getMonthKey = (monthIndex: number): string => {
    const monthKeys = [
      'month-jan-short',
      'month-feb-short',
      'month-mar-short',
      'month-apr-short',
      'month-may-short',
      'month-jun-short',
      'month-jul-short',
      'month-aug-short',
      'month-sep-short',
      'month-oct-short',
      'month-nov-short',
      'month-dec-short'
    ]
    return monthKeys[monthIndex]
  }
  const formatMonthLabel = (date: Date): string => {
    const monthKey = getMonthKey(date.getMonth())
    const year = date.getFullYear()
    return `${t(monthKey)} ${year}`
  }
  const lastMonthName = formatMonthLabel(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  const thisMonthName = formatMonthLabel(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1))
  const nextMonthName = formatMonthLabel(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))

  return (
    <div data-testid={dataTestId} className="gba:w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="gba:w-[200px]">{getEntityTypeLabel(entityType)}</TableHead>
            <TableHead className="gba:text-center gba:w-[100px]">{lastMonthName}</TableHead>
            <TableHead className="gba:text-center gba:w-[100px] gba:font-semibold">{thisMonthName}</TableHead>
            <TableHead className="gba:text-center gba:w-[100px]">{nextMonthName}</TableHead>
            <TableHead className="gba:text-center gba:w-[100px]">{t('header-avg-days')}</TableHead>
            <TableHead className="gba:text-center gba:w-[100px]">{t('header-employees')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((entity, index) => (
            <TableRow key={entity.entityId} data-testid={`${dataTestId}-row-${index}`} className="hover:gba:bg-muted">
              <TableCell className="gba:font-medium">
                <div>
                  <div className="gba:font-medium gba:text-foreground">{entity.entityName}</div>
                  {entity.totalEmployees > 0 && (
                    <div className="gba:text-sm gba:text-muted-foreground">
                      {t('row-employees', { count: entity.totalEmployees })}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell className="gba:text-center">
                <span className="gba:text-foreground">{formatWorkdays(entity.lastMonth)}</span>
              </TableCell>
              <TableCell className="gba:text-center">
                <span className="gba:font-semibold gba:text-info">{formatWorkdays(entity.thisMonth)}</span>
              </TableCell>
              <TableCell className="gba:text-center">
                <span className="gba:text-foreground">{formatWorkdays(entity.nextMonth)}</span>
              </TableCell>
              <TableCell className="gba:text-center">
                <span className="gba:font-medium gba:text-success">{formatWorkdays(entity.averageWorkdays)}</span>
              </TableCell>
              <TableCell className="gba:text-center">
                <span className="gba:text-muted-foreground">{entity.totalEmployees}</span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Summary Row */}
      <div className="gba:mt-4 gba:p-3 gba:bg-background gba:rounded gba:border gba:text-sm">
        <div className="gba:flex gba:justify-between gba:items-center">
          <span className="gba:font-medium gba:text-foreground">
            {t('summary-total', {
              count: data.length,
              entityType: data.length === 1 ? getEntityTypeLabel(entityType) : getEntityTypeLabelPlural(entityType)
            })}
          </span>
          <span className="gba:text-muted-foreground">
            {t('summary-total-employees', {
              count: data.reduce((sum, entity) => sum + entity.totalEmployees, 0)
            })}
          </span>
        </div>
      </div>
    </div>
  )
}

export default MonthlyWorkdaysTable
