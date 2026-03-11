import React, { useMemo } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  IconAvatar,
  ChartContainer,
  useTranslation
} from '@newwork/nw-design-system'
import { BarChart, Bar } from 'recharts'
import { ChartBarIcon } from '@phosphor-icons/react'
import { getChartColor } from '../../../../../utils/chartColorUtils'
import ExpenseBarChartDecorators from '../../../../charts/ExpenseBarChartDecorators'
import translations from '../../../../../_i18n'

// Chart layout constants
// Note: Recharts requires numeric values for margin and radius props
// These values are optimized for chart readability and cannot use CSS variables
const CHART_MARGIN = { top: 20, right: 30, left: 20, bottom: 20 }
const BAR_BORDER_RADIUS: [number, number, number, number] = [4, 4, 0, 0] // Top-left, top-right, bottom-right, bottom-left

interface PlanVsRequestChartProps {
  chartData: Array<{
    month: string
    a_planned: number
    b_actual: number
  }>
  selectedCurrencyCode: string
}

export const PlanVsRequestChart: React.FC<PlanVsRequestChartProps> = ({ chartData, selectedCurrencyCode }) => {
  const { t } = useTranslation(translations)
  const chartWrapperRef = React.useRef<HTMLDivElement | null>(null)
  const [hasChartSpace, setHasChartSpace] = React.useState(false)

  React.useEffect(() => {
    const wrapper = chartWrapperRef.current
    if (!wrapper) return

    const syncChartSpace = () => {
      setHasChartSpace(wrapper.clientWidth > 0 && wrapper.clientHeight > 0)
    }

    syncChartSpace()
    const observer = new ResizeObserver(syncChartSpace)
    observer.observe(wrapper)

    return () => observer.disconnect()
  }, [chartData.length])

  // Chart configuration - using design system tokens resolved to actual colors
  // Recharts requires actual color values, so we resolve CSS variables at runtime
  const chartConfig = useMemo(
    () => ({
      a_planned: {
        label: t('pvr-planned-legend'),
        color: getChartColor('chart1')
      },
      b_actual: {
        label: t('pvr-actual-legend'),
        color: getChartColor('chart3')
      }
    }),
    [t]
  )

  return (
    <Card data-testid="trends-chart">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <IconAvatar icon={ChartBarIcon} variant="default" size="md" decorative />
          {t('pvr-monthly-trend')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="gba:text-center gba:p-8" data-testid="chart-empty-state">
            <ChartBarIcon className="gba:mx-auto gba:h-12 gba:w-12 gba:text-muted-foreground" />
            <h3 className="gba:mt-2 gba:text-sm gba:font-medium gba:text-foreground">{t('empty-no-data')}</h3>
            <p className="gba:mt-1 gba:text-sm gba:text-muted-foreground">{t('empty-no-trend-period')}</p>
          </div>
        ) : (
          <div ref={chartWrapperRef} className="gba:w-full gba:h-[320px]">
            {hasChartSpace ? (
              <ChartContainer
                config={chartConfig}
                className="gba:h-[320px] gba:w-full"
                data-testid="plan-vs-request-chart"
              >
                <BarChart data={chartData} margin={CHART_MARGIN}>
                  <ExpenseBarChartDecorators
                    xDataKey="month"
                    tooltipLabelKey="month"
                    selectedCurrencyCode={selectedCurrencyCode}
                  />
                  <Bar dataKey="a_planned" fill="var(--color-a_planned)" radius={BAR_BORDER_RADIUS} />
                  <Bar dataKey="b_actual" fill="var(--color-b_actual)" radius={BAR_BORDER_RADIUS} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="gba:w-full gba:h-[320px]" />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
