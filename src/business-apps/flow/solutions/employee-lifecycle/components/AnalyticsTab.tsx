import React, { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import {
  BarChart3,
  TrendingUp,
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  UserPlus,
  UserMinus,
  Calendar,
  Filter,
  RefreshCw
} from 'lucide-react'

export interface AnalyticsTabProps extends BusinessAppContextProps {}

interface AnalyticsData {
  totalFlows: number
  completedFlows: number
  activeFlows: number
  averageCompletionTime: number
  onboardingFlows: number
  offboardingFlows: number
  recruitingFlows: number
  completionRate: number
  flowsByMonth: Array<{ month: string; count: number }>
  topTemplates: Array<{ name: string; usage: number }>
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = context => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<string>('30d')
  const [flowType, setFlowType] = useState<string>('all')

  const loadAnalytics = useCallback(async () => {
    if (!context.accessToken) return

    try {
      setIsLoading(true)
      setError(null)

      // For now, we'll simulate analytics data since the actual service implementation
      // would need to be extended. In a real implementation, this would call:
      // const analytics = await EmployeeLifecycleFlowService.getAnalytics(context.accessToken, { timeRange, flowType });

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Mock analytics data
      const mockData: AnalyticsData = {
        totalFlows: 156,
        completedFlows: 132,
        activeFlows: 24,
        averageCompletionTime: 4.2, // hours
        onboardingFlows: 45,
        offboardingFlows: 18,
        recruitingFlows: 93,
        completionRate: 84.6, // percentage
        flowsByMonth: [
          { month: 'Jan', count: 12 },
          { month: 'Feb', count: 18 },
          { month: 'Mar', count: 15 },
          { month: 'Apr', count: 22 },
          { month: 'May', count: 19 },
          { month: 'Jun', count: 25 }
        ],
        topTemplates: [
          { name: 'Employee Onboarding Process', usage: 45 },
          { name: 'Employee Recruiting Process', usage: 32 },
          { name: 'Employee Training', usage: 28 },
          { name: 'Employee Password Reset', usage: 24 },
          { name: 'Employee Service', usage: 18 }
        ]
      }

      setAnalyticsData(mockData)
    } catch (err) {
      console.error('Error loading employee lifecycle analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, timeRange, flowType])

  // Load analytics on mount and when filters change
  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  // Calculate widgets from analytics data
  const widgets: WidgetItem[] = analyticsData
    ? [
        {
          key: 'total-flows',
          title: 'Total Flows',
          value: analyticsData.totalFlows,
          prefix: <BarChart3 className="gba:h-5 gba:w-5 gba:text-blue-600" />,
          color: '#3b82f6',
          description: `Past ${timeRange === '30d' ? '30 days' : timeRange === '90d' ? '90 days' : 'year'}`
        },
        {
          key: 'completed-flows',
          title: 'Completed Flows',
          value: analyticsData.completedFlows,
          prefix: <CheckCircle className="gba:h-5 gba:w-5 gba:text-green-600" />,
          color: '#16a34a',
          description: `${analyticsData.completionRate.toFixed(1)}% completion rate`
        },
        {
          key: 'active-flows',
          title: 'Active Flows',
          value: analyticsData.activeFlows,
          prefix: <Clock className="gba:h-5 gba:w-5 gba:text-orange-600" />,
          color: '#ea580c',
          description: 'Currently in progress'
        },
        {
          key: 'avg-completion-time',
          title: 'Avg. Completion Time',
          value: analyticsData.averageCompletionTime,
          suffix: 'hrs',
          prefix: <TrendingUp className="gba:h-5 gba:w-5 gba:text-purple-600" />,
          color: '#9333ea',
          description: 'Time to complete workflows',
          precision: 1
        }
      ]
    : []

  const flowTypeWidgets: WidgetItem[] = analyticsData
    ? [
        {
          key: 'onboarding-analytics',
          title: 'Onboarding Flows',
          value: analyticsData.onboardingFlows,
          prefix: <UserPlus className="gba:h-5 gba:w-5 gba:text-green-600" />,
          color: '#16a34a',
          description: 'New employee onboarding'
        },
        {
          key: 'recruiting-analytics',
          title: 'Recruiting Flows',
          value: analyticsData.recruitingFlows,
          prefix: <Users className="gba:h-5 gba:w-5 gba:text-purple-600" />,
          color: '#9333ea',
          description: 'Candidate recruiting processes'
        },
        {
          key: 'offboarding-analytics',
          title: 'Offboarding Flows',
          value: analyticsData.offboardingFlows,
          prefix: <UserMinus className="gba:h-5 gba:w-5 gba:text-orange-600" />,
          color: '#ea580c',
          description: 'Employee departure processes'
        }
      ]
    : []

  return (
    <div className="gba:space-y-6" data-testid="employee-lifecycle-analytics-tab">
      {/* Page Header */}
      <div className="gba:flex gba:items-center gba:gap-3 gba:mb-6">
        <BarChart3 className="gba:h-8 gba:w-8 gba:text-blue-600" />
        <div>
          <h1 className="gba:text-2xl gba:font-bold gba:text-gray-900">Lifecycle Analytics</h1>
          <p className="gba:text-gray-600">Insights and metrics for employee lifecycle workflows</p>
        </div>
      </div>

      {/* Filters */}
      <div className="gba:flex gba:flex-col sm:gba:flex-row gba:gap-4 gba:items-start sm:gba:items-center gba:justify-between gba:bg-white gba:p-4 gba:rounded-lg gba:border">
        <div className="gba:flex gba:items-center gba:gap-2">
          <Filter className="gba:h-4 gba:w-4 gba:text-gray-500" />
          <span className="gba:text-sm gba:font-medium gba:text-gray-700">Filters:</span>
        </div>

        <div className="gba:flex gba:gap-3">
          <div className="gba:flex gba:items-center gba:gap-2">
            <Calendar className="gba:h-4 gba:w-4 gba:text-gray-500" />
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="gba:w-32" data-testid="analytics-time-range-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="gba:flex gba:items-center gba:gap-2">
            <Users className="gba:h-4 gba:w-4 gba:text-gray-500" />
            <Select value={flowType} onValueChange={setFlowType}>
              <SelectTrigger className="gba:w-36" data-testid="analytics-flow-type-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="onboarding">Onboarding</SelectItem>
                <SelectItem value="recruiting">Recruiting</SelectItem>
                <SelectItem value="offboarding">Offboarding</SelectItem>
                <SelectItem value="training">Training</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadAnalytics}
            disabled={isLoading}
            data-testid="analytics-refresh-button"
          >
            <RefreshCw className={`gba:h-4 gba:w-4 ${isLoading ? 'gba:animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Main Analytics Widgets */}
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error}
        onRetry={loadAnalytics}
        skeletonCount={4}
        emptyText="No analytics data available."
        data-testid="employee-lifecycle-analytics-main"
      />

      {/* Flow Type Breakdown */}
      <div>
        <h3 className="gba:text-lg gba:font-medium gba:mb-4 gba:text-gray-900">Flow Type Breakdown</h3>
        <WidgetGroup
          widgets={flowTypeWidgets}
          isLoading={isLoading}
          error={error}
          onRetry={loadAnalytics}
          skeletonCount={3}
          emptyText="No flow type data available."
          data-testid="employee-lifecycle-analytics-flow-types"
        />
      </div>

      {/* Detailed Analytics Cards */}
      {!isLoading && !error && analyticsData && (
        <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6">
          {/* Top Templates Card */}
          <Card data-testid="analytics-top-templates-card">
            <CardHeader>
              <CardTitle className="gba:flex gba:items-center gba:gap-2">
                <TrendingUp className="gba:h-5 gba:w-5 gba:text-blue-600" />
                Most Used Templates
              </CardTitle>
              <CardDescription>Templates with highest usage in selected time period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="gba:space-y-3">
                {analyticsData.topTemplates.map((template, index) => (
                  <div
                    key={template.name}
                    className="gba:flex gba:items-center gba:justify-between gba:p-2 gba:rounded gba:bg-gray-50"
                  >
                    <div className="gba:flex gba:items-center gba:gap-3">
                      <div className="gba:bg-blue-100 gba:text-blue-800 gba:text-xs gba:font-medium gba:px-2 gba:py-1 gba:rounded gba:min-w-[1.5rem] gba:text-center">
                        {index + 1}
                      </div>
                      <span className="gba:text-sm gba:font-medium gba:text-gray-900">{template.name}</span>
                    </div>
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <span className="gba:text-sm gba:text-gray-600">{template.usage} uses</span>
                      <div className="gba:w-16 gba:h-2 gba:bg-gray-200 gba:rounded-full">
                        <div
                          className="gba:h-full gba:bg-blue-500 gba:rounded-full"
                          style={{ width: `${(template.usage / analyticsData.topTemplates[0].usage) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Flow Trends Card */}
          <Card data-testid="analytics-flow-trends-card">
            <CardHeader>
              <CardTitle className="gba:flex gba:items-center gba:gap-2">
                <BarChart3 className="gba:h-5 gba:w-5 gba:text-green-600" />
                Flow Trends
              </CardTitle>
              <CardDescription>Monthly flow execution trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="gba:space-y-3">
                {analyticsData.flowsByMonth.map(data => (
                  <div key={data.month} className="gba:flex gba:items-center gba:justify-between">
                    <span className="gba:text-sm gba:font-medium gba:text-gray-900 gba:w-12">{data.month}</span>
                    <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
                      <div className="gba:flex-1 gba:h-4 gba:bg-gray-200 gba:rounded-full gba:overflow-hidden">
                        <div
                          className="gba:h-full gba:bg-green-500 gba:rounded-full gba:transition-all"
                          style={{
                            width: `${(data.count / Math.max(...analyticsData.flowsByMonth.map(d => d.count))) * 100}%`
                          }}
                        />
                      </div>
                      <span className="gba:text-sm gba:text-gray-600 gba:w-8 gba:text-right">{data.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Alert variant="destructive" data-testid="analytics-error-alert">
          <AlertCircle className="gba:h-4 gba:w-4" />
          <div className="gba:flex gba:items-center gba:justify-between gba:w-full">
            <div>
              <h4 className="gba:font-medium">Error Loading Analytics</h4>
              <p className="gba:text-sm">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={loadAnalytics} data-testid="analytics-retry-button">
              Retry
            </Button>
          </div>
        </Alert>
      )}
    </div>
  )
}

export default AnalyticsTab
