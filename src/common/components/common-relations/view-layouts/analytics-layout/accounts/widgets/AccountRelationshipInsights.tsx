import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'

export interface AccountsByIndustryItem {
  industry: string
  count: number
  percentage: number
}
export interface AccountsBySizeItem {
  sizeRange: string
  count: number
  percentage: number
}

export interface AccountRelationshipInsightsProps {
  data: {
    accountsByIndustry: AccountsByIndustryItem[]
    accountsBySize: AccountsBySizeItem[]
    totalAccounts: number
    accountsWithOpportunities: number
    accountsOverTime: Array<{
      date: string
      accountsCreated: number
      accountsActive: number
      accountsWithOpportunities: number
    }>
  }
  moduleColor?: string
}

export const AccountRelationshipInsights: React.FC<AccountRelationshipInsightsProps> = ({ data }) => {
  const industryInsights = (data?.accountsByIndustry || []).slice(0, 5).map((industry, index) => ({
    category: industry.industry,
    count: industry.count,
    percentage: industry.percentage,
    color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][index] || '#6B7280',
    description: `${industry.percentage.toFixed(1)}% of portfolio`
  }))

  const sizeInsights = (data?.accountsBySize || []).slice(0, 4).map((size, index) => ({
    segment: size.sizeRange,
    count: size.count,
    percentage: size.percentage,
    color: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'][index] || '#6B7280',
    description: `${size.percentage.toFixed(1)}% of accounts`
  }))

  const engagementScore =
    data?.totalAccounts > 0 ? Math.round((data.accountsWithOpportunities / data.totalAccounts) * 100) : 0

  const recentData = (data?.accountsOverTime || []).slice(-3)
  const recentActivity =
    recentData.length > 0
      ? {
          newAccounts: recentData.reduce((sum, item) => sum + item.accountsCreated, 0),
          activeAccounts: recentData.reduce((sum, item) => sum + item.accountsActive, 0),
          accountsWithOpportunities: recentData.reduce((sum, item) => sum + item.accountsWithOpportunities, 0)
        }
      : { newAccounts: 0, activeAccounts: 0, accountsWithOpportunities: 0 }

  return (
    <div className="gba:grid gba:grid-cols-2 gba:gap-6">
      <Card data-testid="account-industry-portfolio">
        <CardHeader>
          <CardTitle className="gba:text-base">Industry Portfolio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:space-y-3">
            {industryInsights.length > 0 ? (
              industryInsights.map(industry => (
                <div key={industry.category} className="gba:p-2 gba:border gba:rounded">
                  <div className="gba:flex gba:items-center gba:justify-between gba:mb-1">
                    <span className="gba:text-sm gba:font-medium">{industry.category}</span>
                    <span className="gba:font-bold">{industry.count}</span>
                  </div>
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <div className="gba:flex-1 gba:bg-gray-200 gba:rounded-full gba:h-2">
                      <div
                        className="gba:h-2 gba:rounded-full"
                        style={{ backgroundColor: industry.color, width: `${industry.percentage}%` }}
                      />
                    </div>
                    <span className="gba:text-xs gba:text-gray-500">{industry.description}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="gba:text-center gba:text-gray-500 gba:py-4">
                <p className="gba:text-sm">No industry data available</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card data-testid="account-size-segments">
        <CardHeader>
          <CardTitle className="gba:text-base">Account Size Segments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:space-y-4">
            <div className="gba:text-center gba:p-3 gba:bg-blue-50 gba:rounded-lg">
              <div className="gba:text-2xl gba:font-bold gba:text-blue-600">{engagementScore}%</div>
              <div className="gba:text-sm gba:text-gray-600">Account Engagement</div>
              <div className="gba:text-xs gba:text-gray-500">Accounts with active opportunities</div>
            </div>

            <div className="gba:space-y-2">
              {sizeInsights.length > 0 ? (
                sizeInsights.map(segment => (
                  <div key={segment.segment} className="gba:space-y-1">
                    <div className="gba:flex gba:justify-between gba:text-sm">
                      <span>{segment.segment}</span>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <span className="gba:font-medium">{segment.count}</span>
                        <span className="gba:text-xs gba:text-gray-500">({segment.percentage.toFixed(0)}%)</span>
                      </div>
                    </div>
                    <div className="gba:w-full gba:bg-gray-200 gba:rounded-full gba:h-2">
                      <div
                        className="gba:h-2 gba:rounded-full"
                        style={{ backgroundColor: segment.color, width: `${segment.percentage}%` }}
                      />
                    </div>
                    <div className="gba:text-xs gba:text-gray-500">{segment.description}</div>
                  </div>
                ))
              ) : (
                <div className="gba:text-center gba:text-gray-500 gba:py-2">
                  <p className="gba:text-sm">No size data available</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="gba:col-span-2">
        <Card data-testid="account-recent-activity">
          <CardHeader>
            <CardTitle className="gba:text-base">Recent Activity Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:grid gba:grid-cols-3 gba:gap-4 gba:text-center">
              <div className="gba:p-3 gba:bg-green-50 gba:rounded-lg">
                <div className="gba:text-xl gba:font-bold gba:text-green-600">{recentActivity.newAccounts}</div>
                <div className="gba:text-sm gba:text-gray-600">New Accounts</div>
                <div className="gba:text-xs gba:text-gray-500">Last 3 months</div>
              </div>
              <div className="gba:p-3 gba:bg-blue-50 gba:rounded-lg">
                <div className="gba:text-xl gba:font-bold gba:text-blue-600">{recentActivity.activeAccounts}</div>
                <div className="gba:text-sm gba:text-gray-600">Active Accounts</div>
                <div className="gba:text-xs gba:text-gray-500">Last 3 months</div>
              </div>
              <div className="gba:p-3 gba:bg-orange-50 gba:rounded-lg">
                <div className="gba:text-xl gba:font-bold gba:text-orange-600">
                  {recentActivity.accountsWithOpportunities}
                </div>
                <div className="gba:text-sm gba:text-gray-600">With Opportunities</div>
                <div className="gba:text-xs gba:text-gray-500">Last 3 months</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AccountRelationshipInsights
