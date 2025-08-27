import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@newwork/nw-design-system';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  StarOutlined,
  ClockCircleOutlined,
  RiseOutlined,
  TrophyOutlined
} from '@ant-design/icons';

interface OpportunityVelocityData {
  averageDaysInPipeline: number;
  velocityTrend: {
    month: string;
    averageDays: number;
    opportunityCount: number;
    conversionRate: number;
  }[];
  quickWins: {
    id: string;
    title: string;
    value: number;
    closeDate: string;
    daysSinceClosed: number;
    isWon: boolean;
  }[];
  slowMovers: {
    id: string;
    title: string;
    value: number;
    createdAt: string;
    daysSinceCreated: number;
  }[];
}

interface OpportunityVelocityAnalysisProps extends BusinessAppContextProps {
  data?: any; // Accept basic data from parent
}

export const OpportunityVelocityAnalysis: React.FC<OpportunityVelocityAnalysisProps> = ({ 
  accessToken
}) => {
  const [velocityData, setVelocityData] = useState<OpportunityVelocityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const graphqlClient = useGraphQLClient(accessToken);

  useEffect(() => {
    const fetchVelocityData = async () => {
      try {
        setIsLoading(true);
        
        // Get opportunities with dates for velocity calculation
        const query = `
          query GetOpportunityVelocityData(
            $recentWhere: OpportunityBoolExp
            $recentOrderBy: [OpportunityOrderBy!]
            $recentLimit: Int
            $quickWinsWhere: OpportunityBoolExp
            $quickWinsOrderBy: [OpportunityOrderBy!]
            $quickWinsLimit: Int
            $slowMoversWhere: OpportunityBoolExp
            $slowMoversOrderBy: [OpportunityOrderBy!]
            $slowMoversLimit: Int
          ) {
            opportunities: Opportunity(
              where: $recentWhere
              orderBy: $recentOrderBy
              limit: $recentLimit
            ) {
              id
              name
              estimatedAmount
              winningChance
              createdAt
              updatedAt
              closeDate
              account {
                name
              }
            }
            quickWins: Opportunity(
              where: $quickWinsWhere
              orderBy: $quickWinsOrderBy
              limit: $quickWinsLimit
            ) {
              id
              name
              estimatedAmount
              closeDate
              account {
                name
              }
            }
            slowMovers: Opportunity(
              where: $slowMoversWhere
              orderBy: $slowMoversOrderBy
              limit: $slowMoversLimit
            ) {
              id
              name
              estimatedAmount
              createdAt
              account {
                name
              }
            }
          }
        `;

        const variables = {
          recentWhere: {
            isDeleted: { _eq: false },
            createdAt: { _gte: "2024-01-01T00:00:00Z" }
          },
          recentOrderBy: [{ createdAt: 'DESC' }],
          recentLimit: 200,
          quickWinsWhere: {
            isDeleted: { _eq: false },
            closeDate: { _neq: null },
            winningChance: { _gte: 80 }
          },
          quickWinsOrderBy: [{ closeDate: 'DESC' }],
          quickWinsLimit: 5,
          slowMoversWhere: {
            isDeleted: { _eq: false },
            closeDate: { _eq: null }
          },
          slowMoversOrderBy: [{ createdAt: 'ASC' }],
          slowMoversLimit: 5
        };

        const result = await graphqlClient.request(query, variables);
        
        // Calculate velocity metrics
        const currentDate = new Date();
        const avgDaysInPipeline = result.opportunities.reduce((sum: number, opp: any) => {
          const createdDate = new Date(opp.createdAt);
          const daysInPipeline = Math.floor((currentDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
          return sum + daysInPipeline;
        }, 0) / (result.opportunities.length || 1);

        // Group by month for velocity trends
        const monthlyData = new Map();
        result.opportunities.forEach((opp: any) => {
          const date = new Date(opp.createdAt);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          
          if (!monthlyData.has(monthKey)) {
            monthlyData.set(monthKey, { opportunities: [], totalDays: 0 });
          }
          
          const daysInPipeline = Math.floor((currentDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
          monthlyData.get(monthKey).opportunities.push(opp);
          monthlyData.get(monthKey).totalDays += daysInPipeline;
        });

        const velocityTrend = Array.from(monthlyData.entries())
          .map(([month, data]: [string, any]) => {
            const avgDays = data.totalDays / data.opportunities.length;
            const highWinChance = data.opportunities.filter((o: any) => o.winningChance >= 70).length;
            return {
              month,
              averageDays: Math.round(avgDays),
              opportunityCount: data.opportunities.length,
              conversionRate: Math.round((highWinChance / data.opportunities.length) * 100)
            };
          })
          .slice(-6); // Last 6 months

        // Process Quick Wins (Recent Wins)
        const processedQuickWins = result.quickWins.map((opp: any) => {
          const closeDate = new Date(opp.closeDate);
          const daysSinceClosed = Math.floor((currentDate.getTime() - closeDate.getTime()) / (1000 * 60 * 60 * 24));
          return {
            id: opp.id,
            title: opp.name,
            value: opp.estimatedAmount || 0,
            closeDate: opp.closeDate,
            daysSinceClosed,
            isWon: true
          };
        });

        // Process Slow Movers (Oldest Open)
        const processedSlowMovers = result.slowMovers.map((opp: any) => {
          const createdDate = new Date(opp.createdAt);
          const daysSinceCreated = Math.floor((currentDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
            return {
              id: opp.id,
            title: opp.name,
            value: opp.estimatedAmount || 0,
            createdAt: opp.createdAt,
            daysSinceCreated
            };
          });

        setVelocityData({
          averageDaysInPipeline: Math.round(avgDaysInPipeline),
          velocityTrend,
          quickWins: processedQuickWins,
          slowMovers: processedSlowMovers
        });

      } catch (error) {
        // console.error('Error fetching velocity data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (accessToken) {
      fetchVelocityData();
    }
  }, [accessToken, graphqlClient]);

  if (isLoading) {
    return (
      <Card data-testid="opportunity-velocity-loading">
        <CardContent className="gba:p-6">
          <div className="gba:animate-pulse gba:space-y-4">
            <div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:w-3/4"></div>
            <div className="gba:h-32 gba:bg-gray-200 gba:rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!velocityData) {
    return (
      <Card data-testid="opportunity-velocity-error">
        <CardContent className="gba:p-6">
          <div className="gba:text-center gba:text-gray-500">
            Unable to load velocity data
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="opportunity-velocity-analysis">
      <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
                            <StarOutlined />
            Opportunity Velocity Analysis
          </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Key Metrics Row */}
        <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4 gba:mb-6">
          <div className="gba:bg-blue-50 gba:p-4 gba:rounded-lg" data-testid="avg-pipeline-days">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <ClockCircleOutlined className="gba:text-blue-600" />
              <span className="gba:text-sm gba:font-medium gba:text-blue-600">Avg. Pipeline Days</span>
            </div>
            <div className="gba:text-2xl gba:font-bold gba:text-blue-900">
              {velocityData.averageDaysInPipeline}
            </div>
          </div>

          <div className="gba:bg-purple-50 gba:p-4 gba:rounded-lg" data-testid="velocity-trend">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <RiseOutlined className="gba:text-purple-600" />
              <span className="gba:text-sm gba:font-medium gba:text-purple-600">Velocity Trend</span>
            </div>
            <div className="gba:text-2xl gba:font-bold gba:text-purple-900">
              {velocityData.velocityTrend.length > 1 
                ? (velocityData.velocityTrend[velocityData.velocityTrend.length - 1].averageDays < 
                   velocityData.velocityTrend[velocityData.velocityTrend.length - 2].averageDays ? '↗️' : '↘️')
                : '→'
              }
            </div>
          </div>
        </div>

        {/* Velocity Trends Chart */}
        <div className="gba:h-80 gba:mb-6">
          <ResponsiveContainer width="100%" height="100%">
              <LineChart data={velocityData.velocityTrend}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    name === 'averageDays' ? `${value} days` : 
                    name === 'conversionRate' ? `${value}%` : value,
                    name === 'averageDays' ? 'Avg Days' :
                    name === 'conversionRate' ? 'Conversion Rate' : 'Opportunities'
                  ]}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="averageDays" 
                  stroke="#3B82F6" 
                  strokeWidth={3}
                  name="Avg Days"
                />
                <Line 
                  type="monotone" 
                  dataKey="conversionRate" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  name="Conversion Rate (%)"
                />
              </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Wins and Oldest Open Sections */}
        <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6 gba:mt-6">
          {/* Recent Wins Section */}
          <div>
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4">
              <TrophyOutlined className="gba:text-green-600" />
              <h4 className="gba:text-lg gba:font-semibold gba:text-green-800">Recent Wins</h4>
              <Badge variant="secondary" className="gba:ml-2">
                {velocityData.quickWins.length}
              </Badge>
            </div>
            <div className="gba:space-y-3">
              {velocityData.quickWins.length > 0 ? (
                velocityData.quickWins.map((win) => (
                  <div
                    key={win.id}
                    className="gba:p-3 gba:bg-green-50 gba:border gba:border-green-200 gba:rounded-lg"
                    data-testid={`recent-win-${win.id}`}
                  >
                    <div className="gba:flex gba:justify-between gba:items-start">
                      <div className="gba:flex-1">
                        <h5 className="gba:font-medium gba:text-green-900 gba:text-sm gba:truncate">
                          {win.title}
                        </h5>
                        <p className="gba:text-xs gba:text-green-600 gba:mt-1">
                          Closed {win.daysSinceClosed} days ago
                        </p>
                      </div>
                      <div className="gba:text-right">
                        <div className="gba:text-sm gba:font-semibold gba:text-green-800">
                          €{win.value.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="gba:text-center gba:py-4 gba:text-gray-500 gba:text-sm">
                  No recent wins found
                </div>
              )}
            </div>
          </div>

          {/* Oldest Open Section */}
          <div>
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4">
              <ClockCircleOutlined className="gba:text-orange-600" />
              <h4 className="gba:text-lg gba:font-semibold gba:text-orange-800">Oldest Open</h4>
              <Badge variant="secondary" className="gba:ml-2">
                {velocityData.slowMovers.length}
              </Badge>
            </div>
            <div className="gba:space-y-3">
              {velocityData.slowMovers.length > 0 ? (
                velocityData.slowMovers.map((mover) => (
                  <div
                    key={mover.id}
                    className="gba:p-3 gba:bg-orange-50 gba:border gba:border-orange-200 gba:rounded-lg"
                    data-testid={`slow-mover-${mover.id}`}
                  >
                    <div className="gba:flex gba:justify-between gba:items-start">
                      <div className="gba:flex-1">
                        <h5 className="gba:font-medium gba:text-orange-900 gba:text-sm gba:truncate">
                          {mover.title}
                        </h5>
                        <p className="gba:text-xs gba:text-orange-600 gba:mt-1">
                          Open for {mover.daysSinceCreated} days
                        </p>
                      </div>
                      <div className="gba:text-right">
                        <div className="gba:text-sm gba:font-semibold gba:text-orange-800">
                          €{mover.value.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="gba:text-center gba:py-4 gba:text-gray-500 gba:text-sm">
                  No open opportunities found
                </div>
              )}
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  );
};
export default OpportunityVelocityAnalysis;