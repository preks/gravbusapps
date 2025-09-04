import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@newwork/nw-design-system';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { StarOutlined, ClockCircleOutlined, RiseOutlined, TrophyOutlined } from '@ant-design/icons';

export interface OpportunityVelocityData {
  averageDaysInPipeline: number;
  velocityTrend: { month: string; averageDays: number; opportunityCount: number; conversionRate: number }[];
  quickWins: { id: string; title: string; value: number; closeDate: string; daysSinceClosed: number; isWon: boolean }[];
  slowMovers: { id: string; title: string; value: number; createdAt: string; daysSinceCreated: number }[];
}

interface OpportunityVelocityAnalysisProps {
  data: OpportunityVelocityData;
}

export const OpportunityVelocityAnalysis: React.FC<OpportunityVelocityAnalysisProps> = ({ data }) => {
  return (
    <Card data-testid="opportunity-velocity-analysis">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <StarOutlined />
          Opportunity Velocity Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4 gba:mb-6">
          <div className="gba:bg-blue-50 gba:p-4 gba:rounded-lg" data-testid="avg-pipeline-days">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <ClockCircleOutlined className="gba:text-blue-600" />
              <span className="gba:text-sm gba:font-medium gba:text-blue-600">Avg. Pipeline Days</span>
            </div>
            <div className="gba:text-2xl gba:font-bold gba:text-blue-900">{data.averageDaysInPipeline}</div>
          </div>
          <div className="gba:bg-purple-50 gba:p-4 gba:rounded-lg" data-testid="velocity-trend">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <RiseOutlined className="gba:text-purple-600" />
              <span className="gba:text-sm gba:font-medium gba:text-purple-600">Velocity Trend</span>
            </div>
            <div className="gba:text-2xl gba:font-bold gba:text-purple-900">
              {data.velocityTrend.length > 1
                ? data.velocityTrend[data.velocityTrend.length - 1].averageDays < data.velocityTrend[data.velocityTrend.length - 2].averageDays
                  ? '↗️'
                  : '↘️'
                : '→'}
            </div>
          </div>
        </div>

        <div className="gba:h-80 gba:mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.velocityTrend}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: number, name: string) => [name === 'averageDays' ? `${value} days` : name === 'conversionRate' ? `${value}%` : value, name === 'averageDays' ? 'Avg Days' : name === 'conversionRate' ? 'Conversion Rate' : 'Opportunities']} />
              <Legend />
              <Line type="monotone" dataKey="averageDays" stroke="#3B82F6" strokeWidth={3} name="Avg Days" />
              <Line type="monotone" dataKey="conversionRate" stroke="#10B981" strokeWidth={2} name="Conversion Rate (%)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6 gba:mt-6">
          <div>
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4">
              <TrophyOutlined className="gba:text-green-600" />
              <h4 className="gba:text-lg gba:font-semibold gba:text-green-800">Recent Wins</h4>
              <Badge variant="secondary" className="gba:ml-2">{data.quickWins.length}</Badge>
            </div>
            <div className="gba:space-y-3">
              {data.quickWins.map((win) => (
                <div key={win.id} className="gba:p-3 gba:bg-green-50 gba:border gba:border-green-200 gba:rounded-lg" data-testid={`recent-win-${win.id}`}>
                  <div className="gba:flex gba:justify-between gba:items-start">
                    <div className="gba:flex-1">
                      <h5 className="gba:font-medium gba:text-green-900 gba:text-sm gba:truncate">{win.title}</h5>
                      <p className="gba:text-xs gba:text-green-600 gba:mt-1">Closed {win.daysSinceClosed} days ago</p>
                    </div>
                    <div className="gba:text-right">
                      <div className="gba:text-sm gba:font-semibold gba:text-green-800">€{win.value.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4">
              <ClockCircleOutlined className="gba:text-orange-600" />
              <h4 className="gba:text-lg gba:font-semibold gba:text-orange-800">Oldest Open</h4>
              <Badge variant="secondary" className="gba:ml-2">{data.slowMovers.length}</Badge>
            </div>
            <div className="gba:space-y-3">
              {data.slowMovers.map((mover) => (
                <div key={mover.id} className="gba:p-3 gba:bg-orange-50 gba:border gba:border-orange-200 gba:rounded-lg" data-testid={`slow-mover-${mover.id}`}>
                  <div className="gba:flex gba:justify-between gba:items-start">
                    <div className="gba:flex-1">
                      <h5 className="gba:font-medium gba:text-orange-900 gba:text-sm gba:truncate">{mover.title}</h5>
                      <p className="gba:text-xs gba:text-orange-600 gba:mt-1">Open for {mover.daysSinceCreated} days</p>
                    </div>
                    <div className="gba:text-right">
                      <div className="gba:text-sm gba:font-semibold gba:text-orange-800">€{mover.value.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OpportunityVelocityAnalysis;


