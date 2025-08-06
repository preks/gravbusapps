import React, { useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle, Button, Alert, Spinner, Badge } from '@newwork/nw-design-system';
import { EyeOutlined, EyeInvisibleOutlined, DollarCircleOutlined } from '@ant-design/icons';
import { DashboardStats, RecentActivity } from '../types';
import { formatNumber } from '../utils/formatters';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

interface ActionFeedProps {
  stats: DashboardStats | undefined;
  isLoading: boolean;
  error: Error | null;
}

// Status badge variant function (same pattern as manager absences)
const getStatusBadgeVariant = (status: string) => {
  switch (status.toUpperCase()) {
    case 'APPROVED':
      return 'success' as const;
    case 'PENDING':
      return 'warning' as const;
    case 'REJECTED':
      return 'destructive' as const;
    case 'PAID':
      return 'success' as const;
    case 'DRAFT':
    case 'CREATED':
      return 'secondary' as const;
    default:
      return 'default' as const;
  }
};

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
          <h4 className="gba:font-semibold">{getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.error_loading_action_feed','Error loading action feed')}</h4>
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
          <CardTitle className="gba:text-sm">{getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.action_feed','Action Feed')}</CardTitle>
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
                  {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.view_less','View Less')}
                </>
              ) : (
                <>
                  <EyeOutlined className="gba:mr-1" />
                  {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.view_all','View All')}
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
            {/* Header Row */}
            <div className="gba:grid gba:grid-cols-12 gba:gap-2 gba:items-center gba:py-1 gba:border-b gba:border-gray-200 gba:mb-2">
              <div className="gba:col-span-5 gba:text-xs gba:font-semibold gba:text-gray-600">
                {getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_item.change_expense_item_container.current_description_label','Description')}
              </div>
              <div className="gba:col-span-2 gba:text-xs gba:font-semibold gba:text-gray-600 gba:text-center">
                {getTranslationFromI18nKeyAndLabel('lowcoder:manager_expense_request_list.expense_table.status','Status')}
              </div>
              <div className="gba:col-span-2 gba:text-xs gba:font-semibold gba:text-gray-600 gba:text-center">
                {getTranslationFromI18nKeyAndLabel('lowcoder:absence_module.type_select','Type')}
              </div>
              <div className="gba:col-span-3 gba:text-xs gba:font-semibold gba:text-gray-600 gba:text-right">
                {getTranslationFromI18nKeyAndLabel('lowcoder:sales_hub.amount','Amount')}
              </div>
            </div>
            <div className="gba:space-y-1">
              {activitiesToShow.map((item: RecentActivity, index: number) => (
                <div 
                  key={index} 
                  className="gba:grid gba:grid-cols-12 gba:gap-2 gba:items-center gba:py-1"
                  data-testid={`activity-item-${index}`}
                >
                  <div className="gba:col-span-5 gba:text-xs gba:font-medium gba:truncate">
                    {item.title}
                  </div>
                  <div className="gba:col-span-2 gba:flex gba:justify-center">
                    <Badge 
                      variant={getStatusBadgeVariant(item.status)} 
                      className="gba:text-xs gba:px-1 gba:py-0"
                    >
                      {item.status}
                    </Badge>
                  </div>
                  <div className="gba:col-span-2 gba:flex gba:justify-center">
                    {item.expenseType ? (
                      <Badge variant="outline" className="gba:text-xs gba:px-1 gba:py-0">
                        {item.expenseType}
                      </Badge>
                    ) : (
                      <div className="gba:text-xs gba:text-gray-400">-</div>
                    )}
                  </div>
                  <div className="gba:col-span-3 gba:text-xs gba:text-gray-500 gba:flex gba:items-center gba:justify-end">
                    <DollarCircleOutlined className="gba:mr-1" />
                    {formatNumber(Number(item.totalAmount))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="gba:text-center gba:py-4 gba:text-gray-500" data-testid="empty-activity">
            <p className="gba:text-sm">{getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.no_recent_activity','No recent activity')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ActionFeed;
