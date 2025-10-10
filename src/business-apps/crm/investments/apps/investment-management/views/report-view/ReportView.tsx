import React, { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@newwork/nw-design-system'
import { BarChart3, TrendingUp, Building2, PieChart } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { LiquidFundReport } from './liquid-fund-report/LiquidFundReport'
import { RealEstateReport } from './real-estate-report/RealEstateReport'
import { EquityReport } from './equity-report/EquityReport'

export interface ReportViewProps extends BusinessAppContextProps {
  initialSubTab?: string
  onSubTabChange?: (subTab: string) => void
}

export const ReportView: React.FC<ReportViewProps> = ({
  accessToken,
  userInfo,
  initialSubTab = 'liquid-fund',
  onSubTabChange
}) => {
  const [activeSubTab, setActiveSubTab] = useState(initialSubTab)

  // Update URL when tab changes using safe navigation
  useEffect(() => {
    const updateURL = () => {
      try {
        const currentUrl = new URL(window.location.href)
        const params: Record<string, string> = {}

        // Preserve existing query parameters
        currentUrl.searchParams.forEach((value, key) => {
          params[key] = value
        })

        // Update the analytics sub view parameter
        params.analyticsSubView = activeSubTab

        // Use platform URL builder for safe navigation
        const newUrl = buildPlatformUrl(currentUrl.pathname, params)

        // Use safe history manipulation
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, '', newUrl)
        }
      } catch (error) {
        console.warn('Failed to update URL:', error)
        // Fallback: just update the state without URL manipulation
      }
    }

    updateURL()

    // Notify parent component of tab change
    if (onSubTabChange) {
      onSubTabChange(activeSubTab)
    }
  }, [activeSubTab, onSubTabChange])

  const handleTabChange = (tabValue: string) => {
    setActiveSubTab(tabValue)
  }

  return (
    <div className="gba:h-full" data-testid="analytics-container">
      <Tabs value={activeSubTab} onValueChange={handleTabChange} className="gba:h-full">
        <div className="gba:border-b gba:border-gray-200 gba:bg-white gba:px-6 gba:py-4">
          <div>
            <h2 className="gba:text-xl gba:font-semibold gba:text-gray-900 gba:flex gba:items-center gba:gap-2">
              <BarChart3 className="gba:h-6 gba:w-6" />
              Investment Analytics
            </h2>
            <p className="gba:text-sm gba:text-gray-600 gba:mt-1">
              Analyze investment performance and portfolio metrics
            </p>
          </div>

          <TabsList className="gba:mt-4 gba:grid gba:w-full gba:grid-cols-3 gba:max-w-2xl">
            <TabsTrigger value="liquid-fund" startIcon={<TrendingUp />} data-testid="liquid-fund-analytics-tab">
              Liquid Fund
            </TabsTrigger>
            <TabsTrigger value="real-estate" startIcon={<Building2 />} data-testid="real-estate-analytics-tab">
              Real Estate
            </TabsTrigger>
            <TabsTrigger value="equity" startIcon={<PieChart />} data-testid="equity-analytics-tab">
              Equity
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="gba:flex-1 gba:overflow-auto">
          <TabsContent value="liquid-fund" className="gba:h-full gba:mt-0">
            <LiquidFundReport accessToken={accessToken} userInfo={userInfo} data-testid="liquid-fund-analytics" />
          </TabsContent>

          <TabsContent value="real-estate" className="gba:h-full gba:mt-0">
            <RealEstateReport accessToken={accessToken} userInfo={userInfo} data-testid="real-estate-analytics" />
          </TabsContent>

          <TabsContent value="equity" className="gba:h-full gba:mt-0">
            <EquityReport accessToken={accessToken} userInfo={userInfo} data-testid="equity-analytics" />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

export default ReportView
