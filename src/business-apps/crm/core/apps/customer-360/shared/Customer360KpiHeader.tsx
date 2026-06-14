import React, { useMemo } from 'react'
import { Card, CardContent, useTranslation as useFluentTranslation } from '@newwork/nw-design-system'
import {
  CurrencyDollarIcon,
  FileTextIcon,
  GaugeIcon,
  LifebuoyIcon,
  ReceiptIcon,
  SmileyIcon,
  type Icon
} from '@phosphor-icons/react'
import customer360I18n from '../_i18n'
import type { Customer360Snapshot } from '../data/types'
import { formatCurrency, formatNumber as formatDecimal } from '../utils/format'
import { isOpenStatus } from '../utils/statusBadge'

interface Customer360KpiHeaderProps {
  snapshot: Customer360Snapshot
  loading?: boolean
}

interface KpiItem {
  id: string
  labelKey: string
  value: string
  icon: Icon
}

const EMPTY_VALUE = '-'

function formatMetric(value: number | undefined): string {
  const formatted = formatDecimal(value)
  return formatted || EMPTY_VALUE
}

function countOpen(items: { status?: string }[] | undefined): string {
  return String((items ?? []).filter(item => isOpenStatus(item.status)).length)
}

function formatCount(items: unknown[] | undefined): string {
  return String(items?.length ?? 0)
}

const Customer360KpiHeader: React.FC<Customer360KpiHeaderProps> = ({ snapshot, loading = false }) => {
  const { t } = useFluentTranslation(customer360I18n)

  const items = useMemo<KpiItem[]>(() => {
    const base: KpiItem[] = [
      {
        id: 'score',
        labelKey: 'kpi-score',
        value: snapshot.scores?.scoreLabel ?? formatMetric(snapshot.scores?.aiScore ?? snapshot.scores?.icpScore),
        icon: GaugeIcon
      },
      {
        id: 'satisfaction',
        labelKey: 'kpi-satisfaction',
        value: formatMetric(snapshot.satisfaction?.csat ?? snapshot.satisfaction?.nps),
        icon: SmileyIcon
      },
      {
        id: 'active-contracts',
        labelKey: 'kpi-active-contracts',
        value: formatCount(snapshot.contracts),
        icon: FileTextIcon
      },
      {
        id: 'open-tickets',
        labelKey: 'kpi-open-tickets',
        value: countOpen(snapshot.tickets),
        icon: LifebuoyIcon
      },
      {
        id: 'open-invoices',
        labelKey: 'kpi-open-invoices',
        value: countOpen(snapshot.invoices),
        icon: ReceiptIcon
      },
      {
        id: 'lifetime-value',
        labelKey: 'kpi-lifetime-value',
        value: formatCurrency(snapshot.balance?.lifetimeValue, snapshot.balance?.currency) || EMPTY_VALUE,
        icon: CurrencyDollarIcon
      }
    ]

    return loading ? base.map(item => ({ ...item, value: EMPTY_VALUE })) : base
  }, [snapshot, loading])

  return (
    <div
      className="gba:grid gba:grid-cols-2 gba:gap-4 gba:sm:grid-cols-3 gba:lg:grid-cols-6"
      data-testid="customer-360-kpi-header"
    >
      {items.map(item => {
        const KpiIcon = item.icon
        return (
          <Card key={item.id} variant="surface" data-testid={`customer-360-kpi-${item.id}`}>
            <CardContent className="gba:flex gba:flex-col gba:gap-2 gba:p-4">
              <div className="gba:flex gba:items-center gba:gap-2 gba:text-muted-foreground">
                <KpiIcon className="gba:size-4" />
                <span className="gba:text-sm">{t(item.labelKey)}</span>
              </div>
              <span className="gba:text-2xl gba:font-semibold gba:text-foreground">{item.value}</span>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export default Customer360KpiHeader
export { Customer360KpiHeader }
