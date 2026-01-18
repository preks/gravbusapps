import React from 'react'
import { PipelineFunnel, AggregatedFunnelStage } from './widgets/PipelineFunnel'
import { LeadSourceChart, LeadSourceItem } from './widgets/LeadSourceChart'
import { OpportunityStatusPieChart } from './widgets/OpportunityStatusPieChart'
import { RecordSummary, RecentRecordItem, RecordNavigationConfig } from './widgets/RecordSummary'
import { DealSummary, DealItem } from './widgets/DealSummary'

export interface OverviewTabLayoutProps {
  moduleColor?: string
  recordNavigationConfig: RecordNavigationConfig

  // Data props for widgets
  aggregatedFunnel: AggregatedFunnelStage[]
  availableCurrencies?: string[]
  selectedCurrency?: string
  onCurrencyChange?: (currency: string) => void
  revenueBySource: LeadSourceItem[]
  totalRevenue: number
  totalLeadCount: number
  recentRecords: RecentRecordItem[]
  keyDeals: DealItem[]
  onDealClick?: (dealId: string) => void
  selectedDealCurrency?: string
  onDealCurrencyChange?: (currency: string) => void

  // Optional: Opportunity status data for pie chart (used instead of lead sources for IRM)
  opportunityStatuses?: Array<{
    status: string
    statusRef: string | null
    count: number
    totalAmount: number
  }>
  totalOpportunityCount?: number
  openOpportunitiesComparison?: {
    beforeCurrentQuarter: number
    currentQuarter: number
  }
  useOpportunityStatus?: boolean
}

export const OverviewTabLayout: React.FC<OverviewTabLayoutProps> = ({
  moduleColor = 'default',
  recordNavigationConfig,
  aggregatedFunnel,
  availableCurrencies,
  selectedCurrency,
  onCurrencyChange,
  revenueBySource,
  totalLeadCount,
  recentRecords,
  keyDeals,
  onDealClick,
  selectedDealCurrency,
  onDealCurrencyChange,
  opportunityStatuses = [],
  totalOpportunityCount = 0,
  openOpportunitiesComparison = { beforeCurrentQuarter: 0, currentQuarter: 0 },
  useOpportunityStatus = false
}) => {
  return (
    <div className="gba:space-y-6">
      {/* Main Dashboard Grid */}
      <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-12 gba:xl:grid-cols-3 gba:gap-6">
        <div className="gba:lg:col-span-4 gba:xl:col-span-1">
          <PipelineFunnel
            aggregatedFunnel={aggregatedFunnel}
            moduleColor={moduleColor}
            availableCurrencies={availableCurrencies}
            selectedCurrency={selectedCurrency}
            onCurrencyChange={onCurrencyChange}
          />
        </div>
        <div className="gba:lg:col-span-4 gba:xl:col-span-1">
          {useOpportunityStatus ? (
            <OpportunityStatusPieChart
              data={opportunityStatuses}
              totalCount={totalOpportunityCount}
              openComparison={openOpportunitiesComparison}
            />
          ) : (
            <LeadSourceChart items={revenueBySource} totalLeads={totalLeadCount} moduleColor={moduleColor} />
          )}
        </div>
        <div className="gba:lg:col-span-4 gba:xl:col-span-1">
          <RecordSummary records={recentRecords} moduleColor={moduleColor} navigationConfig={recordNavigationConfig} />
        </div>
      </div>

      {/* Key Deals Section */}
      <div>
        <DealSummary
          deals={keyDeals}
          moduleColor={moduleColor}
          onDealClick={onDealClick}
          availableCurrencies={availableCurrencies}
          selectedDealCurrency={selectedDealCurrency}
          onDealCurrencyChange={onDealCurrencyChange}
        />
      </div>
    </div>
  )
}

export default OverviewTabLayout
