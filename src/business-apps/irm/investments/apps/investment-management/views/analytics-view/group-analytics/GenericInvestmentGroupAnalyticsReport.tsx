import React, { useState } from 'react'
import { Badge, Tabs, TabsContent, TabsList, TabsTrigger } from '@newwork/nw-design-system'
import { ChartBarIcon, ChartPieIcon, TrendUpIcon } from '@phosphor-icons/react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { InvestmentKPICards } from '@/common/components/investment-kpi-cards'
import { useAvailableCurrencies } from '@/common/data/common/hooks/useAvailableCurrencies'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import type { InvestmentGroup } from '../../investment-view/hooks/useInvestmentGroups'
import { CurrencyFilter } from '../shared/components'
import { InvestmentGroupDistributionCharts } from './components/InvestmentGroupDistributionCharts'
import { InvestmentGroupPerformanceCharts } from './components/InvestmentGroupPerformanceCharts'
import { InvestmentGroupTimelineCharts } from './components/InvestmentGroupTimelineCharts'
import { useInvestmentGroupAnalyticsKpis } from './hooks/useInvestmentGroupAnalyticsKpis'

interface GenericInvestmentGroupAnalyticsReportProps extends BusinessAppContextProps {
  activeChartTab: string
  group: InvestmentGroup
  hasInvestmentTypes?: boolean
  prefixDataTestId?: string
  isActive?: boolean
  onChartTabChange: (value: string) => void
}

export const GenericInvestmentGroupAnalyticsReport: React.FC<GenericInvestmentGroupAnalyticsReportProps> = ({
  activeChartTab,
  group,
  hasInvestmentTypes = false,
  prefixDataTestId = 'InvestmentGroupAnalyticsReport',
  isActive = true,
  onChartTabChange,
  ...context
}) => {
  const [selectedCurrency, setSelectedCurrency] = useState('all')
  const { currencies } = useAvailableCurrencies(context, {
    filters: { entity: 'Investment', investmentGroupId: group.id },
    returnFormat: 'codes'
  })
  const availableCurrencies = Array.isArray(currencies) ? (currencies as string[]) : []
  const kpis = useInvestmentGroupAnalyticsKpis(context, group.id, selectedCurrency, isActive)

  return (
    <div data-testid={formatDataTestId(prefixDataTestId, 'Container')} className="gba:p-6">
      <div className="gba:mb-6 gba:flex gba:flex-col gba:gap-4 gba:lg:flex-row gba:lg:items-center gba:lg:justify-between">
        <div className="gba:flex gba:items-center gba:gap-4">
          <h3 className="gba:m-0 gba:text-2xl gba:font-bold gba:text-gray-900">{group.label} Analytics</h3>
          <Badge variant="secondary">
            {kpis.data.totalInvestments}{' '}
            {getTranslationFromI18nKeyAndLabel('investment.group.analytics.items', 'investments')}
          </Badge>
        </div>

        <CurrencyFilter
          value={selectedCurrency}
          onChange={setSelectedCurrency}
          currencies={availableCurrencies}
          allOptionLabel={getTranslationFromI18nKeyAndLabel('currency.filter.all', 'All')}
          dataTestId={formatDataTestId(prefixDataTestId, 'CurrencyFilter')}
        />
      </div>

      <div className="gba:mb-6">
        <InvestmentKPICards {...kpis} data-testid={formatDataTestId(prefixDataTestId, 'KPICards')} />
      </div>

      <div className="gba:rounded-lg gba:bg-white gba:p-4">
        <Tabs
          value={activeChartTab}
          onValueChange={onChartTabChange}
          data-testid={formatDataTestId(prefixDataTestId, 'ChartTabs')}
        >
          <TabsList className="gba:flex gba:w-full gba:flex-wrap gba:gap-2">
            <TabsTrigger value="distribution" startIcon={<ChartPieIcon />}>
              {getTranslationFromI18nKeyAndLabel('tab.distribution', 'Distribution Analysis')}
            </TabsTrigger>
            <TabsTrigger value="timeline" startIcon={<TrendUpIcon />}>
              {getTranslationFromI18nKeyAndLabel('tab.timeline', 'Timeline Analysis')}
            </TabsTrigger>
            <TabsTrigger value="performance" startIcon={<ChartBarIcon />}>
              {getTranslationFromI18nKeyAndLabel('tab.performance', 'Performance Analysis')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="distribution" className="gba:mt-6">
            {isActive && activeChartTab === 'distribution' && (
              <InvestmentGroupDistributionCharts
                accessToken={context.accessToken}
                availableCurrencies={availableCurrencies}
                groupId={group.id}
                hasInvestmentTypes={hasInvestmentTypes}
                selectedCurrency={selectedCurrency}
              />
            )}
          </TabsContent>

          <TabsContent value="timeline" className="gba:mt-6">
            {isActive && activeChartTab === 'timeline' && (
              <InvestmentGroupTimelineCharts
                accessToken={context.accessToken}
                availableCurrencies={availableCurrencies}
                groupId={group.id}
                selectedCurrency={selectedCurrency}
              />
            )}
          </TabsContent>

          <TabsContent value="performance" className="gba:mt-6">
            {isActive && activeChartTab === 'performance' && (
              <InvestmentGroupPerformanceCharts
                accessToken={context.accessToken}
                availableCurrencies={availableCurrencies}
                groupId={group.id}
                hasInvestmentTypes={hasInvestmentTypes}
                selectedCurrency={selectedCurrency}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default GenericInvestmentGroupAnalyticsReport
