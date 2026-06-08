import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import RevenueAlignment from './RevenueAlignment'
import EnterpriseABMDashboard from './EnterpriseABMDashboard'
import MarketingActivitiesOverlay from './MarketingActivitiesOverlay'

type CampaignInsightsProps = BusinessAppContextProps

const CampaignInsights: React.FC<CampaignInsightsProps> = context => {
  return (
    <div className="gba:space-y-6" data-testid="campaign-insights-container">
      <RevenueAlignment {...context} />
      <EnterpriseABMDashboard {...context} />
      <MarketingActivitiesOverlay {...context} />
    </div>
  )
}

export default CampaignInsights
