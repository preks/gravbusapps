import React, { useState } from 'react'
import { Card, List, Typography, Button } from 'antd'
import { ArrowsClockwiseIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AIActionItem } from '../../../types'

const { Text } = Typography

export interface SalesOrderAnalyticsTabProps extends BusinessAppContextProps {}

const SalesOrderAnalyticsTab: React.FC<SalesOrderAnalyticsTabProps> = ({
  accessToken,
  userInfo,
  additionalData,
  activeStructureId
}) => {
  const [aiActionsLoading, setAiActionsLoading] = useState(false)

  // Mock AI actions data
  const aiActions: AIActionItem[] = [
    {
      id: '1',
      icon: '🧠',
      message: 'You have 34 orders pending approval — consider bulk releasing low-risk ones.',
      priority: 'high',
      actionType: 'approval'
    },
    {
      id: '2',
      icon: '📊',
      message: 'Order volume this week is down 12% — monitor key customers.',
      priority: 'medium',
      actionType: 'monitoring'
    },
    {
      id: '3',
      icon: '💡',
      message: '3 customers placed duplicate orders within 24h — consider merging or validating intent.',
      priority: 'medium',
      actionType: 'suggestion'
    },
    {
      id: '4',
      icon: '🔁',
      message: 'Suggest sending confirmation reminders for all Draft orders older than 7 days.',
      priority: 'low',
      actionType: 'reminder'
    },
    {
      id: '5',
      icon: '⚡',
      message: 'Top customer ABC Corp has increased order frequency by 25% this month.',
      priority: 'medium',
      actionType: 'insight'
    },
    {
      id: '6',
      icon: '🎯',
      message: 'Consider offering volume discounts to customers with 5+ pending orders.',
      priority: 'low',
      actionType: 'opportunity'
    }
  ]

  const handleRefreshAI = () => {
    setAiActionsLoading(true)
    setTimeout(() => setAiActionsLoading(false), 1000)
  }

  const handleActionClick = (action: AIActionItem) => {
    console.log('AI Action clicked:', action)
    // Navigate to relevant tab or perform action
    if (action.actionType === 'approval' || action.actionType === 'monitoring') {
      // Navigate to orders tab
      if (window.salesOrderTabNavigationAPI) {
        window.salesOrderTabNavigationAPI.setActiveTab('orders')
      }
    }
  }

  return (
    <div className="gba:p-6" data-testid="sales-order-analytics-tab">
      {/* AI Actions & Suggestions */}
      <Card
        title={
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:text-lg">✨</span>
            <span>AI Actions & Suggestions</span>
          </div>
        }
        extra={
          <Button
            type="text"
            icon={<ArrowsClockwiseIcon size={16} />}
            loading={aiActionsLoading}
            onClick={handleRefreshAI}
            data-testid="refresh-ai-btn"
          />
        }
        className="gba:mb-6"
        style={{ backgroundColor: 'rgba(145,202,255,0.1)' }}
        data-testid="ai-actions-card"
      >
        <List
          dataSource={aiActions}
          renderItem={item => (
            <List.Item
              key={item.id}
              className="gba:cursor-pointer gba:hover:bg-gray-50 gba:p-3 gba:rounded gba:transition-colors"
              onClick={() => handleActionClick(item)}
              data-testid={`ai-action-${item.id}`}
            >
              <div className="gba:flex gba:items-start gba:space-x-3 gba:w-full">
                <span className="gba:text-lg gba:flex-shrink-0">{item.icon}</span>
                <div className="gba:flex-1">
                  <Text className="gba:text-sm gba:block">{item.message}</Text>
                  <div className="gba:mt-1 gba:flex gba:items-center gba:gap-2">
                    <span
                      className={`gba:text-xs gba:px-2 gba:py-1 gba:rounded gba:font-medium ${
                        item.priority === 'high'
                          ? 'gba:bg-red-100 gba:text-red-700'
                          : item.priority === 'medium'
                            ? 'gba:bg-yellow-100 gba:text-yellow-700'
                            : 'gba:bg-green-100 gba:text-green-700'
                      }`}
                    >
                      {item.priority.toUpperCase()}
                    </span>
                    <span className="gba:text-xs gba:text-gray-500 gba:capitalize">{item.actionType}</span>
                  </div>
                </div>
              </div>
            </List.Item>
          )}
          style={{ maxHeight: '600px', overflowY: 'auto' }}
        />
      </Card>

      {/* Analytics Overview */}
      <Card title="Sales Analytics Overview" data-testid="analytics-overview-card">
        <div className="gba:space-y-4">
          <div className="gba:p-4 gba:bg-blue-50 gba:rounded-lg">
            <Text strong className="gba:block gba:mb-2">
              📈 Performance Insights
            </Text>
            <Text className="gba:text-sm gba:text-gray-600">
              AI-powered analytics help you identify trends, opportunities, and potential issues in your sales order
              pipeline. Click on any suggestion above to take action.
            </Text>
          </div>

          <div className="gba:p-4 gba:bg-green-50 gba:rounded-lg">
            <Text strong className="gba:block gba:mb-2">
              🎯 Recommendations
            </Text>
            <Text className="gba:text-sm gba:text-gray-600">
              Based on your sales data, we provide actionable recommendations to improve order processing efficiency and
              customer satisfaction.
            </Text>
          </div>

          <div className="gba:p-4 gba:bg-purple-50 gba:rounded-lg">
            <Text strong className="gba:block gba:mb-2">
              🔍 Predictive Analysis
            </Text>
            <Text className="gba:text-sm gba:text-gray-600">
              Our AI models analyze historical patterns to predict future trends and help you make informed business
              decisions.
            </Text>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default SalesOrderAnalyticsTab
