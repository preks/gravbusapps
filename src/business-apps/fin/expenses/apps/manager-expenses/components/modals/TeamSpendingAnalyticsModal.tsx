import React, { useMemo } from 'react';
import { Modal, Tabs, Typography, Radio, Empty, Spin, Row, Col, Statistic, DatePicker, Input, Checkbox, Collapse } from 'antd';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useTeamSpendingAnalytics, DateRangeOption } from '../../hooks/useTeamSpendingAnalytics';
import { useExpenseGroupCatalog } from '../../hooks/useExpenseGroupCatalog';
import { LineChartComponent, PieChartComponent, BarChartComponent } from './charts';
import dayjs from 'dayjs';
import { SearchOutlined } from '@ant-design/icons';
import { formatAmount } from '../../utils/currencyUtils';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface TeamSpendingAnalyticsModalProps extends BusinessAppContextProps {
  visible: boolean;
  onCancel: () => void;
}

/**
 * Modal component for displaying team spending analytics
 */
const TeamSpendingAnalyticsModal: React.FC<TeamSpendingAnalyticsModalProps> = ({
  visible,
  onCancel,
  accessToken,
  userInfo
}) => {
  // Local state
  const [activeTab, setActiveTab] = React.useState<string>('expense-items');
  
  // Use the team spending analytics hook
  const { 
    isLoading, 
    error, 
    data, 
    dateRange, 
    setDateRange, 
    customDateRange, 
    setCustomDateRange,
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
  
  // Handle custom date range change
  const handleCustomDateRangeChange = (dates: any) => {
    if (dates && dates[0] && dates[1]) {
      // Store dates in ISO format for API calls but display in DD.MM.YYYY format
      setCustomDateRange({
        startDate: dates[0].format('YYYY-MM-DD'),
        endDate: dates[1].format('YYYY-MM-DD')
      });
      setDateRange(DateRangeOption.CUSTOM);
    }
  };
  
  return (
    <Modal
      title={getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.team_spending_analytics', 'Team Spending Analytics')}
      open={visible}
      onCancel={onCancel}
      footer={null}
      width="90%"
      centered
      className="gba:h-[90vh] gba:max-w-[1400px]"
      bodyStyle={{ height: 'calc(90vh - 110px)', padding: 0, overflow: 'hidden' }}
      data-testid="team-spending-analytics-modal"
    >
      <div className="gba:flex gba:flex-col gba:h-full">
        {/* Top cards section - aligned with content container */}
        <div className="gba:grid gba:grid-cols-4 gba:gap-8 gba:px-6 gba:py-4 gba:border-b gba:border-gray-200" data-testid="analytics-summary-cards">
          <div className="gba:flex gba:flex-col">
            <Text className="gba:text-gray-500 gba:text-sm">{getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.total_expense_items', 'Total Expense Items')}</Text>
            <div className="gba:mt-1">
              <Title level={4} className="gba:m-0">€{data?.totalExpenseAmount ? formatAmount(data.totalExpenseAmount) : '0,00'}</Title>
            </div>
          </div>
          
          <div className="gba:flex gba:flex-col">
            <Text className="gba:text-gray-500 gba:text-sm">{getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.total_expense_requests', 'Total Expense Requests')}</Text>
            <div className="gba:mt-1">
              <Title level={4} className="gba:m-0">€{data?.totalRequestAmount ? formatAmount(data.totalRequestAmount) : '0,00'}</Title>
            </div>
          </div>
          
          <div className="gba:flex gba:flex-col">
            <Text className="gba:text-gray-500 gba:text-sm">{getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.total_expense_plans', 'Total Expense Plans')}</Text>
            <div className="gba:mt-1">
              <Title level={4} className="gba:m-0">€{data?.totalPlanAmount ? formatAmount(data.totalPlanAmount) : '0,00'}</Title>
            </div>
          </div>
          
          <div className="gba:flex gba:flex-col">
            <Text className="gba:text-gray-500 gba:text-sm">{getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.advance_payments_tab.total_advance_payments', 'Total Advance Payments')}</Text>
            <div className="gba:mt-1">
              <Title level={4} className="gba:m-0">€{data?.totalAdvanceAmount ? formatAmount(data.totalAdvanceAmount) : '0,00'}</Title>
            </div>
          </div>
        </div>
        
        <div className="gba:flex gba:flex-1 gba:overflow-hidden">
          {/* Left sidebar - aligned with top section */}
          <div className="gba:w-64 gba:px-6 gba:py-4 gba:border-r gba:border-gray-200 gba:overflow-y-auto">
            <Collapse 
              defaultActiveKey={['1', '2']} 
              className="gba:mb-6" 
              ghost
              expandIconPosition="end"
            >
              <Collapse.Panel header={<Title level={5}>{getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.employee_report_filter.period_title', 'Filter by Time Period')}</Title>} key="1">
                <Radio.Group
                  value={dateRange}
                  onChange={(e) => handleDateRangeChange(e.target.value)}
                  className="gba:w-full gba:mt-2"
                  data-testid="date-range-selector"
                  style={{ display: 'flex', flexDirection: 'column' }}
                >
                  <Radio className="gba:mb-3" value={DateRangeOption.LAST_30_DAYS} data-testid="date-range-30-days">Last 30 Days</Radio>
                  <Radio className="gba:mb-3" value={DateRangeOption.LAST_90_DAYS} data-testid="date-range-90-days">Last 90 Days</Radio>
                  <Radio className="gba:mb-3" value={DateRangeOption.LAST_6_MONTHS} data-testid="date-range-6-months">Last 6 Months</Radio>
                  <Radio className="gba:mb-3" value={DateRangeOption.LAST_YEAR} data-testid="date-range-last-year">Last Year</Radio>
                  <Radio className="gba:mb-3" value={DateRangeOption.YEAR_TO_DATE} data-testid="date-range-year-to-date">Year to Date</Radio>
                  <Radio className="gba:mb-3" value={DateRangeOption.ALL_TIME} data-testid="date-range-all-time">All Time</Radio>
                  <Radio className="gba:mb-3" value={DateRangeOption.CUSTOM} data-testid="date-range-custom">Custom Range</Radio>
                </Radio.Group>
                
                {dateRange === DateRangeOption.CUSTOM && (
                  <div className="gba:mt-3">
                    <DatePicker.RangePicker
                      className="gba:w-full"
                      onChange={handleCustomDateRangeChange}
                      value={customDateRange.startDate && customDateRange.endDate ? [
                        dayjs(customDateRange.startDate),
                        dayjs(customDateRange.endDate)
                      ] : undefined}
                      format="DD.MM.YYYY"
                      allowClear={false}
                      data-testid="custom-date-range-picker"
                    />
                  </div>
                )}
              </Collapse.Panel>
              
              <Collapse.Panel header={<Title level={5}>{getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.employee_report_filter.locations_title', 'Filter by Location')}</Title>} key="2">
                <div className="gba:mb-4">
                  <Input 
                    placeholder="Search" 
                    prefix={<SearchOutlined />} 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    className="gba:w-full"
                    data-testid="location-search"
                  />
                </div>
                
                <div className="gba:max-h-60 gba:overflow-y-auto">
                  {locationFilters && locationFilters.length > 0 ? (
                    locationFilters.map(location => (
                      <div key={location.id} className="gba:mb-2">
                        <Checkbox 
                          checked={location.selected} 
                          onChange={() => toggleLocationFilter(location.id)}
                          data-testid={`location-filter-${location.id}`}
                        >
                          {location.name}
                        </Checkbox>
                      </div>
                    ))
                  ) : (
                    <Text className="gba:text-gray-500">No locations available</Text>
                  )}
                </div>
              </Collapse.Panel>
              
              <Collapse.Panel header={<Title level={5}>{getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.employee_report_filter.department_title', 'Filter by Department')}</Title>} key="3">
                <div className="gba:mb-4">
                  <Input 
                    placeholder="Search" 
                    prefix={<SearchOutlined />} 
                    value={departmentSearchTerm} 
                    onChange={(e) => setDepartmentSearchTerm(e.target.value)} 
                    className="gba:w-full"
                    data-testid="department-search"
                  />
                </div>
                
                <div className="gba:max-h-60 gba:overflow-y-auto">
                  {departmentFilters && departmentFilters.length > 0 ? (
                    departmentFilters.map(department => (
                      <div key={department.id} className="gba:mb-2">
                        <Checkbox 
                          checked={department.selected} 
                          onChange={() => toggleDepartmentFilter(department.id)}
                          data-testid={`department-filter-${department.id}`}
                        >
                          {department.name}
                        </Checkbox>
                      </div>
                    ))
                  ) : (
                    <Text className="gba:text-gray-500">No departments available</Text>
                  )}
                </div>
              </Collapse.Panel>
            </Collapse>
          </div>
          
          {/* Main content area - consistent padding with top section */}
          <div className="gba:flex-1 gba:overflow-y-auto gba:px-6 gba:py-4">
            <Tabs 
              activeKey={activeTab} 
              onChange={setActiveTab}
              className="gba:w-full"
              data-testid="analytics-tabs"
            >
              <TabPane tab={getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.flows_button.expense_items', 'Expense Items')} key="expense-items">
                {isLoading ? (
                  <div className="gba:flex gba:justify-center gba:items-center gba:h-64">
                    <Spin size="large" data-testid="loading-spinner" />
                  </div>
                ) : error ? (
                  <div className="gba:p-4">
                    <Empty 
                      description={<span>Error loading data: {error}</span>} 
                      image={Empty.PRESENTED_IMAGE_SIMPLE} 
                    />
                  </div>
                ) : (
                  <div className="gba:flex gba:flex-col gba:gap-6">
                    <Row gutter={[16, 16]} className="gba:w-full">
                      <Col span={12}>
                        <LineChartComponent 
                          data={data?.expenseItemsByMonth || []} 
                          title={getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.monthly_expense_items', 'Monthly Expense Items')} 
                          lineColor="#1890ff"
                        />
                      </Col>
                      <Col span={12}>
                        <PieChartComponent 
                          data={expenseItemsByCategoryWithNames} 
                          title={getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.expense_items_by_category', 'Expense Items by Category')} 
                          colors={['#1890ff', '#52c41a', '#f5222d', '#fa8c16', '#722ed1', '#13c2c2', '#eb2f96']}
                        />
                      </Col>
                    </Row>
                    <Row gutter={[16, 16]} className="gba:w-full gba:mt-4">
                      <Col span={12}>
                        <PieChartComponent 
                          data={data?.expenseItemsByStatus.map(item => ({ 
                            name: item.status, 
                            value: item.count 
                          })) || []} 
                          title={getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.expense_items_by_status', 'Expense Items by Status')} 
                          colors={['#1890ff', '#52c41a', '#f5222d', '#fa8c16', '#722ed1']}
                        />
                      </Col>
                      <Col span={12}>
                        <div className="gba:h-full gba:flex gba:flex-col gba:justify-center gba:items-center gba:text-center gba:bg-gray-50 gba:rounded-lg gba:p-6 gba:shadow-sm gba:border gba:border-gray-200">
                          <Statistic 
                            title={getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.total_expense_items', 'Total Expense Items')} 
                            value={data?.expenseItemsByStatus?.reduce((sum, item) => sum + item.count, 0) || 0} 
                            className="gba:mb-6" 
                            valueStyle={{ fontSize: '36px', fontWeight: 'bold' }}
                          />
                          <Statistic 
                            title={getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.total_amount', 'Total Amount')} 
                            value={data?.totalExpenseAmount || 0} 
                            precision={2} 
                            prefix="€" 
                            valueStyle={{ color: '#1890ff', fontSize: '28px' }}
                          />
                        </div>
                      </Col>
                    </Row>
                </div>
              )}
            </TabPane>
            
              <TabPane tab="Expense Requests" key="expense-requests">
                {isLoading ? (
                  <div className="gba:flex gba:justify-center gba:items-center gba:h-64">
                    <Spin size="large" data-testid="loading-spinner" />
                  </div>
                ) : error ? (
                  <div className="gba:p-4">
                    <Empty 
                      description={<span>Error loading data: {error}</span>} 
                      image={Empty.PRESENTED_IMAGE_SIMPLE} 
                    />
                  </div>
                ) : (
                  <div className="gba:flex gba:flex-col gba:gap-6">
                    <Row gutter={[16, 16]} className="gba:w-full">
                      <Col span={12}>
                      <LineChartComponent 
                        data={data?.expenseRequestsByMonth || []} 
                        title={getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.monthly_expense_requests', 'Monthly Expense Requests')} 
                        lineColor="#fa8c16" 
                      />
                    </Col>
                    <Col span={12}>
                      <BarChartComponent
                        data={data?.expenseRequestsByStatus.map(item => ({
                          name: item.status,
                          value: item.count
                        })) || []}
                        title="Expense Requests by Status"
                        barColor="#fa8c16"
                      />
                    </Col>
                  </Row>
                    <Row gutter={[16, 16]} className="gba:w-full">
                      <Col span={12}>
                        <PieChartComponent 
                          data={data?.expenseRequestsByStatus.map(item => ({ 
                            name: item.status, 
                            value: item.count 
                          })) || []} 
                          title="Expense Requests by Status" 
                          colors={['#fa8c16', '#52c41a', '#1890ff', '#f5222d', '#722ed1']} 
                        />
                      </Col>
                      <Col span={12}>
                        <div className="gba:h-full gba:flex gba:flex-col gba:justify-center gba:items-center gba:text-center gba:bg-gray-50 gba:rounded-lg gba:p-6 gba:shadow-sm gba:border gba:border-gray-200">
                          <Statistic 
                            title={getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.total_expense_requests', 'Total Expense Requests')} 
                            value={data?.expenseRequestsByStatus?.reduce((sum, item) => sum + item.count, 0) || 0} 
                            className="gba:mb-6" 
                            valueStyle={{ fontSize: '36px', fontWeight: 'bold' }}
                          />
                          <Statistic 
                            title={getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.total_amount', 'Total Amount')} 
                            value={data?.totalRequestAmount || 0} 
                            precision={2} 
                            prefix="€" 
                            valueStyle={{ color: '#fa8c16', fontSize: '28px' }}
                          />
                        </div>
                      </Col>
                    </Row>
                </div>
              )}
            </TabPane>
            
              <TabPane tab="Expense Plans" key="expense-plans">
                {isLoading ? (
                  <div className="gba:flex gba:justify-center gba:items-center gba:h-64">
                    <Spin size="large" data-testid="loading-spinner" />
                  </div>
                ) : error ? (
                  <div className="gba:p-4">
                    <Empty 
                      description={<span>Error loading data: {error}</span>} 
                      image={Empty.PRESENTED_IMAGE_SIMPLE} 
                    />
                  </div>
                ) : (
                  <div className="gba:flex gba:flex-col gba:gap-6">
                    <Row gutter={[16, 16]} className="gba:w-full">
                      <Col span={12}>
                        <LineChartComponent 
                          data={data?.expensePlansByMonth || []} 
                          title="Monthly Expense Plans" 
                          lineColor="#722ed1" 
                        />
                      </Col>
                      <Col span={12}>
                        <BarChartComponent
                          data={data?.expensePlansByStatus.map(item => ({
                            name: item.status,
                            value: item.count
                          })) || []}
                          title="Expense Plans by Status"
                          barColor="#722ed1"
                        />
                      </Col>
                    </Row>
                    <Row gutter={[16, 16]} className="gba:w-full">
                      <Col span={12}>
                        <PieChartComponent 
                          data={data?.expensePlansByStatus.map(item => ({ 
                            name: item.status, 
                            value: item.count 
                          })) || []} 
                          title="Expense Plans by Status" 
                          colors={['#722ed1', '#52c41a', '#1890ff', '#f5222d', '#fa8c16']} 
                        />
                      </Col>
                      <Col span={12}>
                        <div className="gba:h-full gba:flex gba:flex-col gba:justify-center gba:items-center gba:text-center gba:bg-gray-50 gba:rounded-lg gba:p-6 gba:shadow-sm gba:border gba:border-gray-200">
                          <Statistic 
                            title={getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.total_expense_plans', 'Total Expense Plans')} 
                            value={data?.expensePlansByStatus?.reduce((sum, item) => sum + item.count, 0) || 0} 
                            className="gba:mb-6" 
                            valueStyle={{ fontSize: '36px', fontWeight: 'bold' }}
                          />
                          <Statistic 
                            title={getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.total_amount', 'Total Amount')} 
                            value={data?.totalPlanAmount || 0} 
                            precision={2} 
                            prefix="€" 
                            valueStyle={{ color: '#722ed1', fontSize: '28px' }}
                          />
                        </div>
                      </Col>
                    </Row>
                </div>
              )}
            </TabPane>
            
              <TabPane tab="Advance Payments" key="advance-payments">
                {isLoading ? (
                  <div className="gba:flex gba:justify-center gba:items-center gba:h-64">
                    <Spin size="large" data-testid="loading-spinner" />
                  </div>
                ) : error ? (
                  <div className="gba:p-4">
                    <Empty 
                      description={<span>Error loading data: {error}</span>} 
                      image={Empty.PRESENTED_IMAGE_SIMPLE} 
                    />
                  </div>
                ) : (
                  <div className="gba:flex gba:flex-col gba:gap-6">
                    <Row gutter={[16, 16]} className="gba:w-full">
                      <Col span={12}>
                        <LineChartComponent 
                          data={data?.advancePaymentsByMonth || []} 
                          title="Monthly Advance Payments" 
                          lineColor="#13c2c2" 
                        />
                      </Col>
                      <Col span={12}>
                        <BarChartComponent
                          data={data?.advancePaymentsByStatus.map(item => ({
                            name: item.status,
                            value: item.count
                          })) || []}
                          title="Advance Payments by Status"
                          barColor="#13c2c2"
                        />
                      </Col>
                    </Row>
                    <Row gutter={[16, 16]} className="gba:w-full">
                      <Col span={12}>
                        <PieChartComponent 
                          data={data?.advancePaymentsByStatus.map(item => ({ 
                            name: item.status, 
                            value: item.count 
                          })) || []} 
                          title="Advance Payments by Status" 
                          colors={['#13c2c2', '#52c41a', '#1890ff', '#f5222d', '#fa8c16']} 
                        />
                      </Col>
                      <Col span={12}>
                        <div className="gba:h-full gba:flex gba:flex-col gba:justify-center gba:items-center gba:text-center gba:bg-gray-50 gba:rounded-lg gba:p-6 gba:shadow-sm gba:border gba:border-gray-200">
                          <Statistic 
                            title={getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.advance_payments_tab.total_advance_payments', 'Total Advance Payments')} 
                            value={data?.advancePaymentsByStatus?.reduce((sum, item) => sum + item.count, 0) || 0} 
                            className="gba:mb-6" 
                            valueStyle={{ fontSize: '36px', fontWeight: 'bold' }}
                          />
                          <Statistic 
                            title={getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.total_amount', 'Total Amount')} 
                            value={data?.totalAdvanceAmount || 0} 
                            precision={2} 
                            prefix="€" 
                            valueStyle={{ color: '#13c2c2', fontSize: '28px' }}
                          />
                        </div>
                      </Col>
                    </Row>
                </div>
              )}
            </TabPane>
          </Tabs>
        </div>
      </div>
      </div>
    </Modal>
  );
};

export default TeamSpendingAnalyticsModal;
