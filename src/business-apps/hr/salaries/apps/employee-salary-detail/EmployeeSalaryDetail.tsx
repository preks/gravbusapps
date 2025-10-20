import React, { useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getCurrentActiveUserLocale, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { Card, Row, Col, Descriptions, Button, Divider, Spin, Alert, Empty, Tabs } from 'antd'
import { EditOutlined, HistoryOutlined, PlusOutlined } from '@ant-design/icons'
import { useFeature } from '@/common/hooks/useFeature'
import SalaryHistoryChart from '../../components/SalaryHistoryChart'
import CompensationComponentsTable from '../../components/CompensationComponentsTable'
import useSalaryData from '../../hooks/useSalaryData'
import { formatCurrency, calculateTotalMonthlyCompensation } from '../../utils/salaryCalculations'
import { SalaryType, PaymentFrequency } from '../../types/salaryTypes'

/**
 * EmployeeSalaryDetail component for viewing and managing individual employee salary details
 * Provides detailed information about an employee's compensation package
 */
export interface EmployeeSalaryDetailProps extends BusinessAppContextProps {
  selectedEmployeeId?: string
  // Extending BusinessAppContextProps provides:
  // accessToken: string
  // userInfo?: UserInfoProps
  // additionalData?: { [k: string]: any }
}

const EmployeeSalaryDetail: React.FC<EmployeeSalaryDetailProps> = ({ accessToken, userInfo, selectedEmployeeId }) => {
  // Use userInfo.employeeDetails.employeeId if no selectedEmployeeId is provided
  const employeeId = userInfo?.employeeDetails?.employeeId
  // Use the provided employeeId or selectedEmployeeId
  const targetEmployeeId = selectedEmployeeId || employeeId

  // Get locale for formatting
  const locale = getCurrentActiveUserLocale()

  // Feature flag check - assuming Salary feature is under Core
  // If Feature.Core.Salary doesn't exist, we'll need to check the actual path
  const salaryFeatureKey = 'core.salary' // Use the actual key from FeatureHub.ts
  const salaryFeature = useFeature(salaryFeatureKey)
  const isAdvancedSalaryEnabled = salaryFeature === 'advanced' // Use the actual value from FeatureHub.ts

  // Tab state
  const [activeTab, setActiveTab] = useState<string>('details')

  // Fetch salary data
  const { salary, components, isLoading, error, refetch } = useSalaryData({
    accessToken,
    employeeId: targetEmployeeId,
    limit: 20
  })

  // Calculate total monthly compensation
  const totalMonthlyCompensation = salary && components ? calculateTotalMonthlyCompensation(salary, components) : 0

  // Format salary type for display
  const formatSalaryType = (type: SalaryType) => {
    switch (type) {
      case SalaryType.MONTHLY:
        return getTranslationFromI18nKeyAndLabel('salary.type.monthly', 'Monthly Salary')
      case SalaryType.HOURLY:
        return getTranslationFromI18nKeyAndLabel('salary.type.hourly', 'Hourly Wage')
      default:
        return type
    }
  }

  // Format payment frequency for display
  const formatFrequency = (frequency: PaymentFrequency) => {
    return frequency.replace('_', ' ')
  }

  // Handle tab change
  const handleTabChange = (key: string) => {
    setActiveTab(key)
  }

  // Loading state
  if (isLoading) {
    return (
      <div
        data-testid="employee-salary-detail-loading"
        className="gba:p-6 gba:flex gba:justify-center gba:items-center"
      >
        <Spin size="large" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div data-testid="employee-salary-detail-error" className="gba:p-6">
        <Alert
          message={getTranslationFromI18nKeyAndLabel('salary.error.title', 'Error')}
          description={getTranslationFromI18nKeyAndLabel(
            'salary.error.description',
            'Failed to load salary data. Please try again.'
          )}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={refetch}>
              {getTranslationFromI18nKeyAndLabel('common.retry', 'Retry')}
            </Button>
          }
        />
      </div>
    )
  }

  // No data state
  if (!salary) {
    return (
      <div data-testid="employee-salary-detail-empty" className="gba:p-6">
        <Empty
          description={getTranslationFromI18nKeyAndLabel('salary.empty', 'No salary data available')}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          {isAdvancedSalaryEnabled && (
            <Button type="primary" icon={<PlusOutlined />} data-testid="add-salary-button-empty">
              {getTranslationFromI18nKeyAndLabel('salary.button.add', 'Add Salary')}
            </Button>
          )}
        </Empty>
      </div>
    )
  }

  return (
    <div data-testid="employee-salary-detail-container" className="gba:p-6">
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-6">
        <div>
          <h1 className="gba:text-2xl gba:font-semibold gba:mb-1">
            {getTranslationFromI18nKeyAndLabel('salary.detail.title', 'Employee Salary Detail')}
          </h1>
          <p className="gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'salary.detail.description',
              'View and manage detailed salary information'
            )}
          </p>
        </div>

        {isAdvancedSalaryEnabled && (
          <Button type="primary" icon={<EditOutlined />} data-testid="edit-salary-button">
            {getTranslationFromI18nKeyAndLabel('salary.button.edit', 'Edit Salary')}
          </Button>
        )}
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={[
          {
            key: 'details',
            label: getTranslationFromI18nKeyAndLabel('salary.tabs.details', 'Salary Details'),
            children: (
              <Card data-testid="salary-details-card">
                <Row gutter={[24, 24]}>
                  <Col xs={24} md={12}>
                    <Descriptions
                      title={getTranslationFromI18nKeyAndLabel('salary.details.basic', 'Basic Information')}
                      bordered
                      column={{ xs: 1, sm: 2 }}
                      size="small"
                      data-testid="salary-basic-info"
                    >
                      <Descriptions.Item label={getTranslationFromI18nKeyAndLabel('salary.details.type', 'Type')}>
                        {formatSalaryType(salary.salaryType)}
                      </Descriptions.Item>
                      <Descriptions.Item label={getTranslationFromI18nKeyAndLabel('salary.details.amount', 'Amount')}>
                        {formatCurrency(salary.amount, salary.currency, locale)}
                      </Descriptions.Item>
                      <Descriptions.Item
                        label={getTranslationFromI18nKeyAndLabel('salary.details.frequency', 'Frequency')}
                      >
                        {formatFrequency(salary.paymentFrequency)}
                      </Descriptions.Item>
                      <Descriptions.Item
                        label={getTranslationFromI18nKeyAndLabel('salary.details.effectiveDate', 'Effective Date')}
                      >
                        {new Date(salary.effectiveDate).toLocaleDateString(locale)}
                      </Descriptions.Item>
                      <Descriptions.Item label={getTranslationFromI18nKeyAndLabel('salary.details.status', 'Status')}>
                        <span className={salary.isActive ? 'gba:text-success' : 'gba:text-muted-foreground'}>
                          {salary.isActive
                            ? getTranslationFromI18nKeyAndLabel('salary.status.active', 'Active')
                            : getTranslationFromI18nKeyAndLabel('salary.status.inactive', 'Inactive')}
                        </span>
                      </Descriptions.Item>
                    </Descriptions>
                  </Col>

                  <Col xs={24} md={12}>
                    <Descriptions
                      title={getTranslationFromI18nKeyAndLabel('salary.details.compensation', 'Total Compensation')}
                      bordered
                      column={{ xs: 1, sm: 1 }}
                      size="small"
                      data-testid="salary-total-compensation"
                    >
                      <Descriptions.Item
                        label={getTranslationFromI18nKeyAndLabel('salary.details.baseSalary', 'Base Salary')}
                      >
                        {formatCurrency(salary.amount, salary.currency, locale)}
                      </Descriptions.Item>
                      <Descriptions.Item
                        label={getTranslationFromI18nKeyAndLabel(
                          'salary.details.additionalComponents',
                          'Additional Components'
                        )}
                      >
                        {formatCurrency(totalMonthlyCompensation - salary.amount, salary.currency, locale)}
                      </Descriptions.Item>
                      <Descriptions.Item
                        label={getTranslationFromI18nKeyAndLabel('salary.details.totalMonthly', 'Total Monthly')}
                        className="gba:font-bold"
                      >
                        <span className="gba:text-info gba:font-bold">
                          {formatCurrency(totalMonthlyCompensation, salary.currency, locale)}
                        </span>
                      </Descriptions.Item>
                    </Descriptions>
                  </Col>
                </Row>

                <Divider />

                <div className="gba:mt-6">
                  <div className="gba:flex gba:justify-between gba:items-center gba:mb-4">
                    <h3 className="gba:text-lg gba:font-medium">
                      {getTranslationFromI18nKeyAndLabel('salary.components.title', 'Compensation Components')}
                    </h3>

                    {isAdvancedSalaryEnabled && (
                      <Button icon={<PlusOutlined />} data-testid="add-component-button">
                        {getTranslationFromI18nKeyAndLabel('salary.components.add', 'Add Component')}
                      </Button>
                    )}
                  </div>

                  <CompensationComponentsTable
                    components={components || []}
                    loading={false}
                    accessToken={accessToken}
                    pagination={{ pageSize: 5 }}
                  />
                </div>
              </Card>
            )
          },
          {
            key: 'history',
            label: (
              <span>
                <HistoryOutlined />
                {getTranslationFromI18nKeyAndLabel('salary.tabs.history', 'Salary History')}
              </span>
            ),
            children: (
              <Card data-testid="salary-history-card">
                <SalaryHistoryChart
                  historyData={[]} // This would be populated with real data
                  loading={false}
                />
              </Card>
            )
          }
        ]}
        data-testid="salary-detail-tabs"
      />
    </div>
  )
}

export default EmployeeSalaryDetail
