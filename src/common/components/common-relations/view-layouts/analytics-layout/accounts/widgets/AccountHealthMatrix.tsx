import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge, Spinner } from '@newwork/nw-design-system'
import { BankOutlined } from '@ant-design/icons'

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

export interface AccountHealthMatrixProps {
  data: {
    totalAccounts: number
    accountsWithOpportunities: number
    avgOpportunitiesPerAccount: number
    topAccounts: Array<{ totalValue: number }>
    accountsByIndustry: AccountsByIndustryItem[]
    accountsBySize: AccountsBySizeItem[]
  }
  isLoading?: boolean
  moduleColor?: string
}

// Helper function to calculate health metrics
const calculateHealthMetrics = (data: AccountHealthMatrixProps['data']) => {
  const opportunityRatio = data?.totalAccounts > 0 ? (data.accountsWithOpportunities / data.totalAccounts) * 100 : 0
  const avgOpportunitiesScore = data?.avgOpportunitiesPerAccount
    ? Math.min((data.avgOpportunitiesPerAccount / 5) * 100, 100)
    : 0
  const revenueScore =
    data?.topAccounts?.length > 0 ? Math.min((data.topAccounts.length / data.totalAccounts) * 100 * 10, 100) : 0
  const healthScore = Math.round((opportunityRatio + avgOpportunitiesScore + revenueScore) / 3)
  return { opportunityRatio, avgOpportunitiesScore, revenueScore, healthScore }
}

// Helper function to calculate performance distribution
const calculatePerformanceCategories = (data: AccountHealthMatrixProps['data']) => {
  const topAccountsCount = data?.topAccounts?.length || 0
  const highPerformingAccounts = data?.accountsWithOpportunities || 0
  const mediumPerformingAccounts = Math.max(0, (data?.totalAccounts || 0) - highPerformingAccounts - topAccountsCount)
  const lowPerformingAccounts = Math.max(0, (data?.totalAccounts || 0) - highPerformingAccounts)

  return [
    { category: 'High Performers', count: topAccountsCount, color: '#10B981', description: 'Top revenue accounts' },
    {
      category: 'Good Performance',
      count: highPerformingAccounts - topAccountsCount,
      color: '#3B82F6',
      description: 'Accounts with opportunities'
    },
    {
      category: 'Standard',
      count: mediumPerformingAccounts,
      color: '#F59E0B',
      description: 'Stable but room for growth'
    },
    {
      category: 'Needs Attention',
      count: lowPerformingAccounts,
      color: '#EF4444',
      description: 'No recent opportunities'
    }
  ].filter(cat => cat.count > 0)
}

// Helper function to calculate diversification score
const calculateDiversificationScore = (data: AccountHealthMatrixProps['data']) => {
  const industryDiversification = data?.accountsByIndustry?.length || 0
  const sizeDiversification = data?.accountsBySize?.length || 0
  const diversificationScore = Math.min(((industryDiversification + sizeDiversification) / 10) * 100, 100)
  return { industryDiversification, sizeDiversification, diversificationScore }
}

export const AccountHealthMatrix: React.FC<AccountHealthMatrixProps> = ({ data, isLoading = false }) => {
  const { opportunityRatio, avgOpportunitiesScore, healthScore } = calculateHealthMetrics(data)
  const performanceCategories = calculatePerformanceCategories(data)
  const { industryDiversification, sizeDiversification, diversificationScore } = calculateDiversificationScore(data)

  return (
    <Card data-testid="account-health-matrix">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <BankOutlined />
          Account Health Matrix
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div
            className="gba:flex gba:justify-center gba:items-center gba:h-[400px]"
            data-testid="account-health-matrix-loading"
          >
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="gba:space-y-4">
            <div className="gba:text-center gba:p-4 gba:bg-linear-to-r gba:from-blue-50 gba:to-green-50 gba:rounded-lg">
              <div className="gba:text-3xl gba:font-bold gba:text-green-600">{healthScore}%</div>
              <div className="gba:text-sm gba:text-gray-600">Overall Account Health</div>
              <div className="gba:text-xs gba:text-gray-500 gba:mt-1">
                Based on opportunity ratio, performance, and diversification
              </div>
            </div>

            <div className="gba:space-y-2">
              <h4 className="gba:text-sm gba:font-medium gba:text-gray-700">Performance Distribution</h4>
              {performanceCategories.map(category => (
                <div
                  key={category.category}
                  className="gba:flex gba:items-center gba:justify-between gba:p-2 gba:bg-gray-50 gba:rounded"
                >
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <div className="gba:w-3 gba:h-3 gba:rounded-full" style={{ backgroundColor: category.color }} />
                    <div>
                      <span className="gba:text-sm gba:font-medium">{category.category}</span>
                      <div className="gba:text-xs gba:text-gray-500">{category.description}</div>
                    </div>
                  </div>
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <span className="gba:text-sm gba:font-medium">{category.count}</span>
                    <Badge variant="outline" className="gba:text-xs">
                      {data?.totalAccounts > 0 ? Math.round((category.count / data.totalAccounts) * 100) : 0}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            <div className="gba:space-y-2">
              <h4 className="gba:text-sm gba:font-medium gba:text-gray-700">Health Factors</h4>
              <div className="gba:space-y-1">
                <div className="gba:flex gba:justify-between gba:text-sm">
                  <span>Opportunity Engagement</span>
                  <span className="gba:font-medium">{Math.round(opportunityRatio)}%</span>
                </div>
                <div className="gba:w-full gba:bg-gray-200 gba:rounded-full gba:h-2">
                  <div
                    className={`${opportunityRatio >= 60 ? 'gba:bg-green-500' : opportunityRatio >= 30 ? 'gba:bg-yellow-500' : 'gba:bg-red-500'} gba:h-2 gba:rounded-full`}
                    style={{ width: `${opportunityRatio}%` }}
                  />
                </div>
                <div className="gba:text-xs gba:text-gray-500">
                  {data?.accountsWithOpportunities} of {data?.totalAccounts} accounts have opportunities
                </div>
              </div>
              <div className="gba:space-y-1">
                <div className="gba:flex gba:justify-between gba:text-sm">
                  <span>Average Opportunities</span>
                  <span className="gba:font-medium">{data?.avgOpportunitiesPerAccount?.toFixed(1) || '0.0'}</span>
                </div>
                <div className="gba:w-full gba:bg-gray-200 gba:rounded-full gba:h-2">
                  <div
                    className={`${avgOpportunitiesScore >= 60 ? 'gba:bg-green-500' : avgOpportunitiesScore >= 30 ? 'gba:bg-yellow-500' : 'gba:bg-red-500'} gba:h-2 gba:rounded-full`}
                    style={{ width: `${avgOpportunitiesScore}%` }}
                  />
                </div>
              </div>
              <div className="gba:space-y-1">
                <div className="gba:flex gba:justify-between gba:text-sm">
                  <span>Portfolio Diversification</span>
                  <span className="gba:font-medium">{Math.round(diversificationScore)}%</span>
                </div>
                <div className="gba:w-full gba:bg-gray-200 gba:rounded-full gba:h-2">
                  <div
                    className={`${diversificationScore >= 60 ? 'gba:bg-green-500' : diversificationScore >= 30 ? 'gba:bg-yellow-500' : 'gba:bg-red-500'} gba:h-2 gba:rounded-full`}
                    style={{ width: `${diversificationScore}%` }}
                  />
                </div>
                <div className="gba:text-xs gba:text-gray-500">
                  {industryDiversification} industries, {sizeDiversification} size categories
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default AccountHealthMatrix
