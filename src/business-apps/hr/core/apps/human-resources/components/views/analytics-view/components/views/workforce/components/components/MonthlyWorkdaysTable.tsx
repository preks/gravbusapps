import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { MonthlyWorkdaysData } from '../../../../../hooks/usePerformanceData'
import { OrgEntityType } from '../tabs/Performance'
import translations from './_i18n/index'
import AnalyticsDataTable from '../../../../shared/AnalyticsDataTable'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

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

  const locale = getCurrentActiveUserLocale() ?? 'en-US'
  // Get current month names
  const currentDate = new Date()
  const formatMonthLabel = (date: Date): string => {
    return date.toLocaleDateString(locale, { month: 'short', year: 'numeric' })
  }
  const lastMonthName = formatMonthLabel(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  const thisMonthName = formatMonthLabel(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1))
  const nextMonthName = formatMonthLabel(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))

  const columns = [
    { key: 'entityName', header: getEntityTypeLabel(entityType) },
    { key: 'lastMonth', header: lastMonthName },
    { key: 'thisMonth', header: thisMonthName },
    { key: 'nextMonth', header: nextMonthName },
    { key: 'averageWorkdays', header: t('header-avg-days') },
    { key: 'totalEmployees', header: t('header-employees') }
  ]

  return (
    <AnalyticsDataTable
      dataTestId={dataTestId}
      title={t('summary-total', {
        count: data.length,
        entityType: data.length === 1 ? getEntityTypeLabel(entityType) : getEntityTypeLabelPlural(entityType)
      })}
      entriesText={t('summary-total-employees', {
        count: data.reduce((sum, entity) => sum + entity.totalEmployees, 0)
      })}
      columns={columns}
      rows={data}
      getRowKey={row => row.entityId}
      renderCell={(entity, col, index) => {
        if (col.key === 'entityName') {
          return (
            <div data-testid={`${dataTestId}-row-${index}`}>
              <div className="gba:font-medium gba:text-foreground">{entity.entityName}</div>
              {entity.totalEmployees > 0 && (
                <div className="gba:text-sm gba:text-muted-foreground">
                  {t('row-employees', { count: entity.totalEmployees })}
                </div>
              )}
            </div>
          )
        }
        if (col.key === 'lastMonth')
          return <span className="gba:text-foreground">{formatWorkdays(entity.lastMonth)}</span>
        if (col.key === 'thisMonth') {
          return <span className="gba:font-semibold gba:text-info">{formatWorkdays(entity.thisMonth)}</span>
        }
        if (col.key === 'nextMonth')
          return <span className="gba:text-foreground">{formatWorkdays(entity.nextMonth)}</span>
        if (col.key === 'averageWorkdays') {
          return <span className="gba:font-medium gba:text-success">{formatWorkdays(entity.averageWorkdays)}</span>
        }
        if (col.key === 'totalEmployees')
          return <span className="gba:text-muted-foreground">{entity.totalEmployees}</span>
        return '-'
      }}
    />
  )
}

export default MonthlyWorkdaysTable
