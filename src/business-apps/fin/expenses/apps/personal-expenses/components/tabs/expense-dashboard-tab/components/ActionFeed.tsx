import React, { useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle, Button, Alert, Spinner, Badge } from '@newwork/nw-design-system';
import { EyeOutlined, EyeInvisibleOutlined, DollarCircleOutlined } from '@ant-design/icons';
import { DashboardStats, RecentActivity } from '../types';
import { formatNumber, getStatusColor } from '../utils/formatters';

interface ActionFeedProps {
  stats: DashboardStats | undefined;
  isLoading: boolean;
  error: Error | null;
}

export const ActionFeed: React.FC<ActionFeedProps> = ({ stats, isLoading, error }) => {
  const [showAll, setShowAll] = useState(false);
  
  if (isLoading) {
    return (
      <Card className="gba:action-feed-card" data-testid="action-feed-loading">
        <div className="gba:flex gba:justify-center gba:p-6">
          <Spinner size="lg" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="gba:action-feed-card" data-testid="action-feed-error">
        <Alert variant="destructive">
          <h4 className="gba:font-semibold">Error loading action feed</h4>
          <p>{error.message}</p>
        </Alert>
      </Card>
    );
  }

  const recentActivity = stats?.recentActivity || [];
  const activitiesToShow = showAll ? recentActivity : recentActivity.slice(0, 10);

  return (
    <Card className="gba:action-feed-card" data-testid="action-feed-card">
      <CardHeader className="gba:py-3">
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle className="gba:text-sm">Action Feed</CardTitle>
          {recentActivity.length > 10 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className="gba:text-xs gba:h-auto gba:p-1"
              data-testid="action-feed-toggle"
            >
              {showAll ? (
                <>
                  <EyeInvisibleOutlined className="gba:mr-1" />
                  View Less
                </>
              ) : (
                <>
                  <EyeOutlined className="gba:mr-1" />
                  View All
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="gba:py-1 gba:px-2">
        {recentActivity.length > 0 ? (
          <div 
            className={showAll ? "gba:max-h-[300px] gba:overflow-y-auto gba:pr-2" : ""}
            data-testid="activity-list"
          >
            <div className="gba:space-y-1">
              {activitiesToShow.map((item: RecentActivity, index: number) => (
                <div 
                  key={index} 
                  className="gba:flex gba:items-center gba:justify-between gba:py-1"
                  data-testid={`activity-item-${index}`}
                >
                  <div className="gba:text-xs gba:font-medium gba:truncate gba:flex-1 gba:mr-2">
                    {item.title}
                  </div>
                  <div className="gba:flex gba:items-center gba:space-x-1 gba:flex-shrink-0">
                    <Badge 
                      variant="secondary" 
                      className="gba:text-xs gba:px-1 gba:py-0"
                      style={{ backgroundColor: getStatusColor(item.status), color: 'white' }}
                    >
                      {item.status}
                    </Badge>
                    {item.expenseType && (
                      <Badge variant="outline" className="gba:text-xs gba:px-1 gba:py-0">
                        {item.expenseType}
                      </Badge>
                    )}
                    <div className="gba:text-xs gba:text-gray-500 gba:flex gba:items-center">
                      <DollarCircleOutlined className="gba:mr-1" />
                      {formatNumber(Number(item.totalAmount))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="gba:text-center gba:py-4 gba:text-gray-500" data-testid="empty-activity">
            <p className="gba:text-sm">No recent activity</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ActionFeed;
