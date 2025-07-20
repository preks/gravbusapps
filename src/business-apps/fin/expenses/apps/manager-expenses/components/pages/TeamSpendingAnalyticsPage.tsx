import React, { useMemo } from 'react';
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Spinner,
  Alert,
  AlertDescription,
  PageLayout,
  Input,
  Checkbox,
  RadioGroup,
  RadioGroupItem,
  Label,
  Separator
} from '@newwork/nw-design-system';
import { PiArrowLeft, PiChartLineUp, PiMagnifyingGlass } from 'react-icons/pi';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useTeamSpendingAnalytics, DateRangeOption } from '../../hooks/useTeamSpendingAnalytics';
import { useExpenseGroupCatalog } from '../../hooks/useExpenseGroupCatalog';
import { LineChartComponent, PieChartComponent, BarChartComponent } from '../modals/charts';
import { formatNumberFunction, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { WidgetGroup, WidgetItem } from '@/components/widget-group';
import { 
  Users,
  FileText,
  Calendar,
  CurrencyEur
} from '@phosphor-icons/react';

interface TeamSpendingAnalyticsPageProps extends BusinessAppContextProps {
  onNavigateBack: () => void;
}

const TeamSpendingAnalyticsPage: React.FC<TeamSpendingAnalyticsPageProps> = ({
  onNavigateBack,
  accessToken,
  userInfo
}) => {
  const [activeTab, setActiveTab] = React.useState<string>('expense-items');
  
  // Use the team spending analytics hook
  const { 
    isLoading, 
    error, 
    data, 
    dateRange, 
    setDateRange,
    locationFilters,
    toggleLocationFilter,
    searchTerm,
    setSearchTerm,
    departmentFilters,
    toggleDepartmentFilter,
    departmentSearchTerm,
    setDepartmentSearchTerm
  } = useTeamSpendingAnalytics(
    accessToken,
    userInfo?.employeeDetails?.employeeId || '00000000-0000-0000-0000-000000000000'
  );
  
  // Use the expense group catalog hook to get category names
  const { expenseGroups } = useExpenseGroupCatalog(accessToken);
  
  // Transform expense items by category data to use actual category names
  const expenseItemsByCategoryWithNames = useMemo(() => {
    if (!data?.expenseItemsByCategory || !expenseGroups) return data?.expenseItemsByCategory || [];
    
    return data.expenseItemsByCategory.map(item => {
      // Get the friendly name from the catalog
      let friendlyName = expenseGroups[item.name]?.name;
      
      // If no friendly name found, try to extract it from the reference format
      if (!friendlyName && typeof item.name === 'string' && item.name.includes(':')) {
        // Format is typically ExpenseGroup:v1:CATEGORY_NAME
        const parts = item.name.split(':');
        if (parts.length >= 3) {
          // Use the last part and make it more readable
          friendlyName = parts[parts.length - 1]
            .replace(/_/g, ' ')
            .toLowerCase()
            .replace(/\b\w/g, c => c.toUpperCase());
        }
      }
      
      return {
        name: friendlyName || item.name,
        value: item.value
      };
    });
  }, [data?.expenseItemsByCategory, expenseGroups]);

  // Handle date range change
  const handleDateRangeChange = (value: DateRangeOption) => {
    setDateRange(value);
  };

  // Create widgets for summary statistics
  const widgets: WidgetItem[] = [
    {
      key: 'total-expense-items',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.total_expense_items', 'Total Expense Items'),
      value: data?.totalExpenseAmount ? formatNumberFunction(data.totalExpenseAmount.toString(), "0.00[,]00") : '0,00',
      prefix: <CurrencyEur />,
      color: '#1890ff',
      suffix: '€',
      valueIsString: true,
      description: 'Individual expense transactions'
    },
    {
      key: 'total-expense-requests',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.total_expense_requests', 'Total Expense Requests'),
      value: data?.totalRequestAmount ? formatNumberFunction(data.totalRequestAmount.toString(), "0.00[,]00") : '0,00',
      prefix: <FileText />,
      color: '#52c41a',
      suffix: '€',
      valueIsString: true,
      description: 'Submitted expense requests'
    },
    {
      key: 'total-expense-plans',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.total_expense_plans', 'Total Expense Plans'),
      value: data?.totalPlanAmount ? formatNumberFunction(data.totalPlanAmount.toString(), "0.00[,]00") : '0,00',
      prefix: <Calendar />,
      color: '#722ed1',
      suffix: '€',
      valueIsString: true,
      description: 'Budget plans and allocations'
    },
    {
      key: 'total-advance-payments',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.advance_payments_tab.total_advance_payments', 'Total Advance Payments'),
      value: data?.totalAdvanceAmount ? formatNumberFunction(data.totalAdvanceAmount.toString(), "0.00[,]00") : '0,00',
      prefix: <Users />,
      color: '#13c2c2',
      suffix: '€',
      valueIsString: true,
      description: 'Cash advances and prepayments'
    }
  ];

  const renderExpenseItemsTab = () => (
    <div className="gba:flex gba:flex-col gba:gap-6">
      <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.monthly_expense_items', 'Monthly Expense Items')}</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChartComponent 
              data={data?.expenseItemsByMonth || []} 
              title="" 
              lineColor="#1890ff" 
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>{getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.expense_items_by_category', 'Expense Items by Category')}</CardTitle>
          </CardHeader>
          <CardContent>
            <PieChartComponent 
              data={expenseItemsByCategoryWithNames} 
              title="" 
              colors={['#1890ff', '#52c41a', '#722ed1', '#f5222d', '#fa8c16']} 
            />
          </CardContent>
        </Card>
      </div>
      
      <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.expense_items_by_status', 'Expense Items by Status')}</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChartComponent
              data={data?.expenseItemsByStatus.map(item => ({
                name: item.status,
                value: item.count
              })) || []}
              title=""
              barColor="#1890ff"
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Summary Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:space-y-4">
              <div className="gba:text-center">
                <div className="gba:text-3xl gba:font-bold gba:text-primary">
                  {data?.expenseItemsByStatus?.reduce((sum, item) => sum + item.count, 0) || 0}
                </div>
                <div className="gba:text-sm gba:text-muted-foreground">Total Items</div>
              </div>
              <Separator />
              <div className="gba:text-center">
                <div className="gba:text-2xl gba:font-bold gba:text-blue-600">
                  €{data?.totalExpenseAmount ? formatNumberFunction(data.totalExpenseAmount.toString(), "0.00[,]00") : '0,00'}
                </div>
                <div className="gba:text-sm gba:text-muted-foreground">Total Amount</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderExpenseRequestsTab = () => (
    <div className="gba:flex gba:flex-col gba:gap-6">
      <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.monthly_expense_requests', 'Monthly Expense Requests')}</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChartComponent 
              data={data?.expenseRequestsByMonth || []} 
              title="" 
              lineColor="#52c41a" 
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>{getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.expense_requests_by_status', 'Expense Requests by Status')}</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChartComponent
              data={data?.expenseRequestsByStatus.map(item => ({
                name: item.status,
                value: item.count
              })) || []}
              title=""
              barColor="#52c41a"
            />
          </CardContent>
        </Card>
      </div>
      
      <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.expense_requests_by_status', 'Expense Requests by Status')}</CardTitle>
          </CardHeader>
          <CardContent>
            <PieChartComponent 
              data={data?.expenseRequestsByStatus.map(item => ({ 
                name: item.status, 
                value: item.count 
              })) || []} 
              title="" 
              colors={['#52c41a', '#1890ff', '#722ed1', '#f5222d', '#fa8c16']} 
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Summary Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:space-y-4">
              <div className="gba:text-center">
                <div className="gba:text-3xl gba:font-bold gba:text-primary">
                  {data?.expenseRequestsByStatus?.reduce((sum, item) => sum + item.count, 0) || 0}
                </div>
                <div className="gba:text-sm gba:text-muted-foreground">Total Requests</div>
              </div>
              <Separator />
              <div className="gba:text-center">
                <div className="gba:text-2xl gba:font-bold gba:text-green-600">
                  €{data?.totalRequestAmount ? formatNumberFunction(data.totalRequestAmount.toString(), "0.00[,]00") : '0,00'}
                </div>
                <div className="gba:text-sm gba:text-muted-foreground">Total Amount</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderExpensePlansTab = () => (
    <div className="gba:flex gba:flex-col gba:gap-6">
      <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.monthly_expense_plans', 'Monthly Expense Plans')}</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChartComponent 
              data={data?.expensePlansByMonth || []} 
              title="" 
              lineColor="#722ed1" 
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>{getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.expense_plans_by_status', 'Expense Plans by Status')}</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChartComponent
              data={data?.expensePlansByStatus.map(item => ({
                name: item.status,
                value: item.count
              })) || []}
              title=""
              barColor="#722ed1"
            />
          </CardContent>
        </Card>
      </div>
      
      <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.expense_plans_by_status', 'Expense Plans by Status')}</CardTitle>
          </CardHeader>
          <CardContent>
            <PieChartComponent 
              data={data?.expensePlansByStatus.map(item => ({ 
                name: item.status, 
                value: item.count 
              })) || []} 
              title="" 
              colors={['#722ed1', '#52c41a', '#1890ff', '#f5222d', '#fa8c16']} 
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Summary Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:space-y-4">
              <div className="gba:text-center">
                <div className="gba:text-3xl gba:font-bold gba:text-primary">
                  {data?.expensePlansByStatus?.reduce((sum, item) => sum + item.count, 0) || 0}
                </div>
                <div className="gba:text-sm gba:text-muted-foreground">Total Plans</div>
              </div>
              <Separator />
              <div className="gba:text-center">
                <div className="gba:text-2xl gba:font-bold gba:text-purple-600">
                  €{data?.totalPlanAmount ? formatNumberFunction(data.totalPlanAmount.toString(), "0.00[,]00") : '0,00'}
                </div>
                <div className="gba:text-sm gba:text-muted-foreground">Total Amount</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderAdvancePaymentsTab = () => (
    <div className="gba:flex gba:flex-col gba:gap-6">
      <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.monthly_advance_payments', 'Monthly Advance Payments')}</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChartComponent 
              data={data?.advancePaymentsByMonth || []} 
              title="" 
              lineColor="#13c2c2" 
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>{getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.advance_payments_by_status', 'Advance Payments by Status')}</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChartComponent
              data={data?.advancePaymentsByStatus.map(item => ({
                name: item.status,
                value: item.count
              })) || []}
              title=""
              barColor="#13c2c2"
            />
          </CardContent>
        </Card>
      </div>
      
      <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.advance_payments_by_status', 'Advance Payments by Status')}</CardTitle>
          </CardHeader>
          <CardContent>
            <PieChartComponent 
              data={data?.advancePaymentsByStatus.map(item => ({ 
                name: item.status, 
                value: item.count 
              })) || []} 
              title="" 
              colors={['#13c2c2', '#52c41a', '#1890ff', '#f5222d', '#fa8c16']} 
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Summary Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:space-y-4">
              <div className="gba:text-center">
                <div className="gba:text-3xl gba:font-bold gba:text-primary">
                  {data?.advancePaymentsByStatus?.reduce((sum, item) => sum + item.count, 0) || 0}
                </div>
                <div className="gba:text-sm gba:text-muted-foreground">Total Payments</div>
              </div>
              <Separator />
              <div className="gba:text-center">
                <div className="gba:text-2xl gba:font-bold gba:text-cyan-600">
                  €{data?.totalAdvanceAmount ? formatNumberFunction(data.totalAdvanceAmount.toString(), "0.00[,]00") : '0,00'}
                </div>
                <div className="gba:text-sm gba:text-muted-foreground">Total Amount</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderFilters = () => (
    <Card>
      <CardHeader>
        <CardTitle>Filters & Settings</CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-6">
        {/* Date Range Filter */}
        <div>
          <Label className="gba:text-sm gba:font-medium gba:mb-3 gba:block">Date Range</Label>
          <RadioGroup value={dateRange} onValueChange={(value) => handleDateRangeChange(value as DateRangeOption)}>
            <div className="gba:flex gba:items-center gba:space-x-2">
              <RadioGroupItem value={DateRangeOption.LAST_30_DAYS} id="last-30-days" />
              <Label htmlFor="last-30-days">Last 30 Days</Label>
            </div>
            <div className="gba:flex gba:items-center gba:space-x-2">
              <RadioGroupItem value={DateRangeOption.LAST_90_DAYS} id="last-90-days" />
              <Label htmlFor="last-90-days">Last 90 Days</Label>
            </div>
            <div className="gba:flex gba:items-center gba:space-x-2">
              <RadioGroupItem value={DateRangeOption.YEAR_TO_DATE} id="current-year" />
              <Label htmlFor="current-year">Current Year</Label>
            </div>
            <div className="gba:flex gba:items-center gba:space-x-2">
              <RadioGroupItem value={DateRangeOption.CUSTOM} id="custom" />
              <Label htmlFor="custom">Custom Range</Label>
            </div>
          </RadioGroup>
        </div>

        <Separator />

        {/* Location Filters */}
        <div>
          <Label className="gba:text-sm gba:font-medium gba:mb-3 gba:block">Location Filters</Label>
          <div className="gba:relative gba:mb-3">
            <PiMagnifyingGlass className="gba:absolute gba:left-3 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:text-muted-foreground gba:text-sm" />
            <Input
              placeholder="Search locations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="gba:pl-10"
            />
          </div>
          <div className="gba:space-y-2 gba:max-h-32 gba:overflow-y-auto">
            {locationFilters.map((location) => (
              <div key={location.id} className="gba:flex gba:items-center gba:space-x-2">
                <Checkbox
                  id={location.id}
                  checked={location.selected}
                  onCheckedChange={() => toggleLocationFilter(location.id)}
                />
                <Label htmlFor={location.id} className="gba:text-sm">{location.name}</Label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Department Filters */}
        <div>
          <Label className="gba:text-sm gba:font-medium gba:mb-3 gba:block">Department Filters</Label>
          <div className="gba:relative gba:mb-3">
            <PiMagnifyingGlass className="gba:absolute gba:left-3 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:text-muted-foreground gba:text-sm" />
            <Input
              placeholder="Search departments..."
              value={departmentSearchTerm}
              onChange={(e) => setDepartmentSearchTerm(e.target.value)}
              className="gba:pl-10"
            />
          </div>
          <div className="gba:space-y-2 gba:max-h-32 gba:overflow-y-auto">
            {departmentFilters.map((department) => (
              <div key={department.id} className="gba:flex gba:items-center gba:space-x-2">
                <Checkbox
                  id={department.id}
                  checked={department.selected}
                  onCheckedChange={() => toggleDepartmentFilter(department.id)}
                />
                <Label htmlFor={department.id} className="gba:text-sm">{department.name}</Label>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div data-testid="team-spending-analytics-page-container">
      {/* Back Button Above Everything */}
      <div className="gba:px-6 gba:pt-6 gba:pb-0">
        <button
          onClick={onNavigateBack}
          className="gba:flex gba:items-center gba:text-blue-500 gba:hover:text-blue-600"
          data-testid="team-spending-analytics-back-button"
        >
          <PiArrowLeft className="gba:mr-2" />
          <span>Back to Dashboard</span>
        </button>
      </div>

      <PageLayout
        headerTitle={getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.team_spending_analytics', 'Team Spending Analytics')}
        headerDescription="Comprehensive analysis of team spending patterns, trends, and budget allocations across all expense categories"
        headerIcon={<PiChartLineUp />}
        className="gba:min-h-screen"
      >
        <div className="gba:px-6 gba:space-y-6" data-testid="team-spending-analytics-page">
          {/* Summary Statistics */}
          <WidgetGroup
            widgets={widgets}
            isLoading={isLoading}
            error={error ? error : null}
            onRetry={() => window.location.reload()}
            skeletonCount={4}
            emptyText="No analytics data available."
            data-testid="team-spending-analytics-statistics"
          />

          {/* Main Content */}
          <div className="gba:flex gba:gap-6">
            {/* Left Sidebar - Filters */}
            <div className="gba:w-80 gba:flex-shrink-0">
              {renderFilters()}
            </div>

            {/* Main Content Area */}
            <div className="gba:flex-1">
              {error ? (
                <Alert data-testid="team-spending-analytics-error-alert">
                  <AlertDescription>
                    <strong>Error:</strong> {error}
                  </AlertDescription>
                </Alert>
              ) : (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="gba:w-full">
                  <TabsList className="gba:grid gba:w-full gba:grid-cols-4">
                    <TabsTrigger value="expense-items">
                      {getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.expense_items_tab.title', 'Expense Items')}
                    </TabsTrigger>
                    <TabsTrigger value="expense-requests">
                      {getTranslationFromI18nKeyAndLabel('lowcoder:employee_landing_page.expense_requests', 'Expense Requests')}
                    </TabsTrigger>
                    <TabsTrigger value="expense-plans">
                      {getTranslationFromI18nKeyAndLabel('lowcoder:employee_landing_page.expense_plans', 'Expense Plans')}
                    </TabsTrigger>
                    <TabsTrigger value="advance-payments">
                      {getTranslationFromI18nKeyAndLabel('lowcoder:employee_landing_page.advance_payments', 'Advance Payments')}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="expense-items" className="gba:space-y-6 gba:mt-6">
                    {isLoading ? (
                      <div className="gba:flex gba:justify-center gba:p-8">
                        <Spinner data-testid="loading-spinner" />
                      </div>
                    ) : (
                      renderExpenseItemsTab()
                    )}
                  </TabsContent>

                  <TabsContent value="expense-requests" className="gba:space-y-6 gba:mt-6">
                    {isLoading ? (
                      <div className="gba:flex gba:justify-center gba:p-8">
                        <Spinner data-testid="loading-spinner" />
                      </div>
                    ) : (
                      renderExpenseRequestsTab()
                    )}
                  </TabsContent>

                  <TabsContent value="expense-plans" className="gba:space-y-6 gba:mt-6">
                    {isLoading ? (
                      <div className="gba:flex gba:justify-center gba:p-8">
                        <Spinner data-testid="loading-spinner" />
                      </div>
                    ) : (
                      renderExpensePlansTab()
                    )}
                  </TabsContent>

                  <TabsContent value="advance-payments" className="gba:space-y-6 gba:mt-6">
                    {isLoading ? (
                      <div className="gba:flex gba:justify-center gba:p-8">
                        <Spinner data-testid="loading-spinner" />
                      </div>
                    ) : (
                      renderAdvancePaymentsTab()
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </div>
        </div>
      </PageLayout>
    </div>
  );
};

export default TeamSpendingAnalyticsPage; 