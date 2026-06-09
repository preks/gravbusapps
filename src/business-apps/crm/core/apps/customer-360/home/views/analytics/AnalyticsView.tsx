import React, { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  useTranslation as useFluentTranslation
} from '@newwork/nw-design-system'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import customer360I18n from '../../../_i18n'
import { attentionBand } from '../../attention'
import ProvisionalNote from '../../components/ProvisionalNote'
import type { Customer360HomeViewProps } from '../../types'

/**
 * Portfolio analytics — composition (accounts vs contacts) and the attention
 * distribution across the book of business. Risk-at-revenue and cohort trends
 * arrive once the customer-summary backend provides historical metrics.
 */
const AnalyticsView: React.FC<Customer360HomeViewProps> = ({ portfolio }) => {
  const { t } = useFluentTranslation(customer360I18n)
  const { rows, stats } = portfolio

  const compositionConfig = useMemo(
    () => ({
      accounts: { label: t('cockpit-accounts'), color: 'hsl(var(--primary))' },
      contacts: { label: t('cockpit-contacts'), color: 'hsl(var(--muted-foreground))' }
    }),
    [t]
  )

  const compositionData = useMemo(
    () => [
      { key: 'accounts', label: t('cockpit-accounts'), value: stats.totalAccounts },
      { key: 'contacts', label: t('cockpit-contacts'), value: stats.totalContacts }
    ],
    [stats, t]
  )

  const attentionConfig = useMemo(
    () => ({
      count: { label: t('analytics-customers'), color: 'hsl(var(--primary))' }
    }),
    [t]
  )

  const attentionData = useMemo(() => {
    const buckets = { high: 0, medium: 0, low: 0 }
    rows.forEach(row => {
      buckets[attentionBand(row.attentionScore)] += 1
    })
    return [
      { band: t('analytics-band-high'), count: buckets.high },
      { band: t('analytics-band-medium'), count: buckets.medium },
      { band: t('analytics-band-low'), count: buckets.low }
    ]
  }, [rows, t])

  return (
    <div className="gba:flex gba:flex-col gba:gap-4" data-testid="customer-360-analytics-view">
      {portfolio.provisional ? <ProvisionalNote /> : null}

      <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:lg:grid-cols-2">
        <Card variant="surface">
          <CardHeader>
            <CardTitle className="gba:text-base">{t('analytics-composition-title')}</CardTitle>
            <CardDescription>{t('analytics-composition-hint')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={compositionConfig} className="gba:h-[300px] gba:w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie data={compositionData} dataKey="value" nameKey="label" innerRadius={60} outerRadius={100}>
                  {compositionData.map(entry => (
                    <Cell key={entry.key} fill={`var(--nw-color-${entry.key})`} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card variant="surface">
          <CardHeader>
            <CardTitle className="gba:text-base">{t('analytics-attention-title')}</CardTitle>
            <CardDescription>{t('analytics-attention-hint')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={attentionConfig} className="gba:h-[300px] gba:w-full">
              <BarChart data={attentionData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="band" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--nw-color-count)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AnalyticsView
export { AnalyticsView }
