import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { RiseOutlined } from '@ant-design/icons';
import { AccountsAnalytics } from '../types/analyticsTypes';

interface AccountGrowthAnalysisProps {
  data: AccountsAnalytics;
}

export const AccountGrowthAnalysis: React.FC<AccountGrowthAnalysisProps> = ({ data }) => {
  // Calculate real expansion rate (accounts with opportunities vs total accounts)
  const expansionRate = data?.totalAccounts > 0 
    ? Math.round((data.accountsWithOpportunities / data.totalAccounts) * 100)
    : 0;

  // Calculate real average revenue per account from top accounts data
  const avgRevenuePerAccount = data?.topAccounts?.length > 0
    ? Math.round(data.topAccounts.reduce((sum, account) => sum + account.totalValue, 0) / data.topAccounts.length)
    : 0;

  // Create growth trend data from real accountsOverTime data (aggregate daily data into monthly)
  const aggregateDataByMonth = (dailyData: any[]) => {
    const monthMap = new Map<string, {
      accountsCreated: number;
      accountsWithOpportunities: number;
      accountsActive: number;
      date: string;
    }>();

    dailyData.forEach(item => {
      const date = new Date(item.date);
      // Create month key as YYYY-MM format for proper grouping
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, {
          accountsCreated: 0,
          accountsWithOpportunities: 0,
          accountsActive: 0,
          date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01` // Use first day of month
        });
      }
      
      const monthData = monthMap.get(monthKey)!;
      monthData.accountsCreated += item.accountsCreated || 0;
      monthData.accountsWithOpportunities += item.accountsWithOpportunities || 0;
      monthData.accountsActive += item.accountsActive || 0;
    });

    // Convert to array and sort by date
    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, data]) => data);
  };

  const monthlyData = aggregateDataByMonth(data?.accountsOverTime || []);
  const recentAccountsData = monthlyData.slice(-6); // Last 6 months
  
  const growthTrendData = recentAccountsData.map((item) => {
    const date = new Date(item.date);
    // Format as Mon Year (e.g., "Jan 24")
    const monthYear = date.toLocaleDateString('en-US', { 
      month: 'short',
      year: '2-digit'
    });
    return {
      month: monthYear,
      date: item.date,
      accountsCreated: item.accountsCreated,
      accountsWithOpportunities: item.accountsWithOpportunities,
      accountsActive: item.accountsActive
    };
  });

  // Calculate growth metrics from real data
  const totalRecentAccounts = recentAccountsData.reduce((sum, item) => sum + item.accountsCreated, 0);
  const totalActiveAccounts = recentAccountsData.reduce((sum, item) => sum + item.accountsActive, 0);
  const activityRate = totalRecentAccounts > 0 ? Math.round((totalActiveAccounts / totalRecentAccounts) * 100) : 0;

  return (
    <Card data-testid="account-growth-analysis">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <RiseOutlined />
          Account Growth Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:space-y-4">
          {/* Real Growth Metrics */}
          <div className="gba:grid gba:grid-cols-2 gba:gap-4 gba:text-center">
            <div className="gba:p-3 gba:bg-green-50 gba:rounded-lg">
              <div className="gba:text-2xl gba:font-bold gba:text-green-600">
                {expansionRate}%
              </div>
              <div className="gba:text-sm gba:text-gray-600">Accounts with Opportunities</div>
              <div className="gba:text-xs gba:text-gray-500">
                {data?.accountsWithOpportunities} of {data?.totalAccounts} accounts
              </div>
            </div>
            <div className="gba:p-3 gba:bg-blue-50 gba:rounded-lg">
              <div className="gba:text-2xl gba:font-bold gba:text-blue-600">
                ${avgRevenuePerAccount.toLocaleString()}
              </div>
              <div className="gba:text-sm gba:text-gray-600">Avg Revenue per Account</div>
              <div className="gba:text-xs gba:text-gray-500">
                From top {data?.topAccounts?.length || 0} performing accounts
              </div>
            </div>
          </div>

          {/* Real Account Activity Metric */}
          <div className="gba:p-3 gba:bg-orange-50 gba:rounded-lg gba:text-center">
            <div className="gba:text-xl gba:font-bold gba:text-orange-600">
              {activityRate}%
            </div>
            <div className="gba:text-sm gba:text-gray-600">Account Activity Rate</div>
            <div className="gba:text-xs gba:text-gray-500">
              Active accounts vs new accounts (last 6 months)
            </div>
          </div>

          {/* Real Growth Trend Chart */}
          {growthTrendData.length > 0 ? (
            <div className="gba:h-56">
              <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Recent Growth Trend (Monthly)</h4>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={growthTrendData}
                  maxBarSize={30}
                  barCategoryGap="25%"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 10 }}
                    angle={0}
                    textAnchor="middle"
                    height={40}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip 
                    formatter={(value, name) => {
                      const labelMap: Record<string, string> = {
                        accountsCreated: 'New Accounts',
                        accountsWithOpportunities: 'Accounts with Opportunities',
                        accountsActive: 'Active Accounts'
                      };
                      return [value, labelMap[name] || name];
                    }}
                    labelFormatter={(label) => `Month: ${label}`}
                  />
                  <Bar dataKey="accountsCreated" fill="#3B82F6" name="accountsCreated" />
                  <Bar dataKey="accountsWithOpportunities" fill="#10B981" name="accountsWithOpportunities" />
                  <Bar dataKey="accountsActive" fill="#F59E0B" name="accountsActive" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="gba:text-center gba:text-gray-500 gba:py-4">
              <p className="gba:text-sm">No growth trend data available</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};