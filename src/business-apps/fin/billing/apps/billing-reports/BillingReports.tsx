import React, { useMemo } from 'react'
import {
  PageLayout,
  Card,
  Button,
  Spinner,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
  useTranslation
} from '@newwork/nw-design-system'
import { ChartBarIcon, DownloadSimpleIcon } from '@phosphor-icons/react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import billingTranslations from '../../common/_i18n'
import { useBillingData } from '../../common/hooks/useBillingData'
import { useBillingPermissions } from '../../common/hooks/useBillingPermissions'
import { useBillingReports } from '../../common/hooks/useBillingReports'
import { BillingSampleNotice } from '../../common/components/BillingSampleNotice'
import { computeArAging } from '../../common/utils/arAging'
import { formatCurrency } from '../../common/utils/currency'
import { invoicesToCsv, downloadCsv } from '../../common/utils/invoiceExport'
import { DEFAULT_CURRENCY } from '../../common/constants'

type BillingReportsProps = BusinessAppContextProps

const BillingReports: React.FC<BillingReportsProps> = props => {
  const { t } = useTranslation(billingTranslations)
  const billing = useBillingData(props)
  const permissions = useBillingPermissions(props)
  const reports = useBillingReports(props)

  const fallbackAging = useMemo(() => computeArAging(billing.invoices), [billing.invoices])
  const aging = reports.available && reports.arAging.length > 0 ? reports.arAging : fallbackAging
  const totalOutstanding = useMemo(() => aging.reduce((sum, bucket) => sum + bucket.amount, 0), [aging])

  const chartConfig = useMemo(
    () =>
      ({
        amount: { label: t('billing-reports-amount'), color: '#2563eb' }
      }) satisfies ChartConfig,
    [t]
  )

  const handleExport = () => {
    downloadCsv('invoices.csv', invoicesToCsv(billing.invoices))
  }

  if (billing.loading) {
    return (
      <div
        className="gba:flex gba:items-center gba:justify-center gba:min-h-[200px]"
        data-testid="billing-reports-loading"
      >
        <Spinner />
      </div>
    )
  }

  return (
    <PageLayout
      headerIcon={ChartBarIcon}
      headerTitle={t('billing-reports-title')}
      headerDescription={t('billing-reports-ar-aging')}
      variant="default"
    >
      <BillingSampleNotice
        show={billing.usingSampleData}
        error={billing.error}
        dataTestId="billing-reports-sample-notice"
      />

      <div className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:mb-4 gba:flex-wrap">
        <div className="gba:text-sm gba:text-muted-foreground">
          {t('billing-reports-total-outstanding')}:{' '}
          <span className="gba:font-semibold gba:text-foreground">
            {formatCurrency(totalOutstanding, DEFAULT_CURRENCY)}
          </span>
        </div>
        {permissions.canExport && (
          <Button variant="outline" size="sm" onClick={handleExport} data-testid="reports-export-button">
            <DownloadSimpleIcon size={16} className="gba:mr-1" />
            {t('billing-reports-export-invoices')}
          </Button>
        )}
      </div>

      <Card className="gba:p-6 gba:mb-4" data-testid="reports-ar-aging-chart">
        <h2 className="gba:text-base gba:font-semibold gba:mb-3">{t('billing-reports-ar-aging')}</h2>
        <ChartContainer config={chartConfig} className="gba:h-[300px] gba:w-full">
          <BarChart data={aging} margin={{ top: 8, right: 12, left: 8, bottom: 4 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              width={72}
              tickFormatter={(value: number) => formatCurrency(value, DEFAULT_CURRENCY)}
            />
            <ChartTooltip
              content={<ChartTooltipContent formatter={(value: number) => formatCurrency(value, DEFAULT_CURRENCY)} />}
            />
            <Bar dataKey="amount" fill="var(--color-amount)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </Card>

      <Card className="gba:p-6" data-testid="reports-ar-aging">
        <table className="gba:w-full gba:text-sm">
          <thead>
            <tr className="gba:border-b gba:text-left gba:text-muted-foreground">
              <th className="gba:py-2">{t('billing-reports-bucket')}</th>
              <th className="gba:py-2 gba:text-right">{t('billing-reports-count')}</th>
              <th className="gba:py-2 gba:text-right">{t('billing-reports-amount')}</th>
            </tr>
          </thead>
          <tbody>
            {aging.map(bucket => (
              <tr key={bucket.key} className="gba:border-b" data-testid={`aging-bucket-${bucket.key}`}>
                <td className="gba:py-2">{bucket.label}</td>
                <td className="gba:py-2 gba:text-right">{bucket.count}</td>
                <td className="gba:py-2 gba:text-right">{formatCurrency(bucket.amount, DEFAULT_CURRENCY)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {reports.available && reports.revenue.length > 0 && (
        <Card className="gba:p-6 gba:mt-4" data-testid="reports-revenue">
          <h2 className="gba:text-base gba:font-semibold gba:mb-3">{t('billing-reports-revenue')}</h2>
          <table className="gba:w-full gba:text-sm">
            <thead>
              <tr className="gba:border-b gba:text-left gba:text-muted-foreground">
                <th className="gba:py-2">{t('billing-reports-period')}</th>
                <th className="gba:py-2">{t('billing-reports-currency')}</th>
                <th className="gba:py-2 gba:text-right">{t('billing-reports-net')}</th>
                <th className="gba:py-2 gba:text-right">{t('billing-reports-tax')}</th>
                <th className="gba:py-2 gba:text-right">{t('billing-reports-gross')}</th>
              </tr>
            </thead>
            <tbody>
              {reports.revenue.map(row => (
                <tr
                  key={`${row.period}-${row.currency}`}
                  className="gba:border-b"
                  data-testid={`revenue-${row.period}-${row.currency}`}
                >
                  <td className="gba:py-2">{row.period}</td>
                  <td className="gba:py-2">{row.currency}</td>
                  <td className="gba:py-2 gba:text-right">{formatCurrency(row.net, row.currency)}</td>
                  <td className="gba:py-2 gba:text-right">{formatCurrency(row.tax, row.currency)}</td>
                  <td className="gba:py-2 gba:text-right">{formatCurrency(row.gross, row.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {reports.available && reports.vat.length > 0 && (
        <Card className="gba:p-6 gba:mt-4" data-testid="reports-vat">
          <h2 className="gba:text-base gba:font-semibold gba:mb-3">{t('billing-reports-vat')}</h2>
          <table className="gba:w-full gba:text-sm">
            <thead>
              <tr className="gba:border-b gba:text-left gba:text-muted-foreground">
                <th className="gba:py-2">{t('billing-reports-currency')}</th>
                <th className="gba:py-2 gba:text-right">{t('billing-reports-net')}</th>
                <th className="gba:py-2 gba:text-right">{t('billing-reports-tax')}</th>
                <th className="gba:py-2 gba:text-right">{t('billing-reports-gross')}</th>
              </tr>
            </thead>
            <tbody>
              {reports.vat.map(row => (
                <tr key={row.currency} className="gba:border-b" data-testid={`vat-${row.currency}`}>
                  <td className="gba:py-2">{row.currency}</td>
                  <td className="gba:py-2 gba:text-right">{formatCurrency(row.net, row.currency)}</td>
                  <td className="gba:py-2 gba:text-right">{formatCurrency(row.tax, row.currency)}</td>
                  <td className="gba:py-2 gba:text-right">{formatCurrency(row.gross, row.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </PageLayout>
  )
}

export default BillingReports
