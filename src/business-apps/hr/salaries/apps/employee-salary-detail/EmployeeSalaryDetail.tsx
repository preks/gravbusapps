import React, { useState } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getCurrentActiveUserLocale, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  Spinner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@newwork/nw-design-system'
import { PencilIcon, ClockCounterClockwiseIcon, PlusIcon } from '@phosphor-icons/react'
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

  const renderDetailItem = (label: string, value: React.ReactNode, testId?: string) => (
    <div className="gba:rounded-md gba:border gba:border-border gba:p-3" data-testid={testId}>
      <dt className="gba:text-xs gba:font-medium gba:text-muted-foreground">{label}</dt>
      <dd className="gba:mt-1 gba:text-sm gba:text-foreground">{value}</dd>
    </div>
  )

  // Loading state
  if (isLoading) {
    return (
      <div
        data-testid="employee-salary-detail-loading"
        className="gba:p-6 gba:flex gba:justify-center gba:items-center"
      >
        <Spinner />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div data-testid="employee-salary-detail-error" className="gba:p-6">
        <Alert variant="destructive">
          <AlertTitle>{getTranslationFromI18nKeyAndLabel('salary.error.title', 'Error')}</AlertTitle>
          <AlertDescription>
            {getTranslationFromI18nKeyAndLabel(
            'salary.error.description',
            'Failed to load salary data. Please try again.'
            )}
          </AlertDescription>
          <div className="gba:mt-3">
            <Button type="button" size="sm" variant="outline" onClick={refetch} data-testid="employee-salary-detail-retry-button">
              {getTranslationFromI18nKeyAndLabel('common.retry', 'Retry')}
            </Button>
          </div>
        </Alert>
      </div>
    )
  }

  // No data state
  if (!salary) {
    return (
      <div data-testid="employee-salary-detail-empty" className="gba:p-6">
        <Card>
          <CardContent className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-3 gba:py-12 gba:text-center">
            <p className="gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel('salary.empty', 'No salary data available')}
            </p>
          {isAdvancedSalaryEnabled && (
              <Button type="button" data-testid="add-salary-button-empty">
                <PlusIcon size={16} className="gba:mr-2" />
              {getTranslationFromI18nKeyAndLabel('salary.button.add', 'Add Salary')}
            </Button>
          )}
          </CardContent>
        </Card>
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
          <Button type="button" data-testid="edit-salary-button">
            <PencilIcon size={16} className="gba:mr-2" />
            {getTranslationFromI18nKeyAndLabel('salary.button.edit', 'Edit Salary')}
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} data-testid="salary-detail-tabs">
        <TabsList className="gba:mb-4">
          <TabsTrigger value="details">
            {getTranslationFromI18nKeyAndLabel('salary.tabs.details', 'Salary Details')}
          </TabsTrigger>
          <TabsTrigger value="history">
            <ClockCounterClockwiseIcon size={16} className="gba:mr-2" />
            {getTranslationFromI18nKeyAndLabel('salary.tabs.history', 'Salary History')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="details">
          <Card data-testid="salary-details-card">
            <CardContent className="gba:p-6">
              <div className="gba:grid gba:grid-cols-1 gba:gap-6 md:gba:grid-cols-2">
                <section data-testid="salary-basic-info">
                  <h2 className="gba:mb-3 gba:text-base gba:font-semibold">
                    {getTranslationFromI18nKeyAndLabel('salary.details.basic', 'Basic Information')}
                  </h2>
                  <dl className="gba:grid gba:grid-cols-1 gba:gap-3 sm:gba:grid-cols-2">
                    {renderDetailItem(getTranslationFromI18nKeyAndLabel('salary.details.type', 'Type'), formatSalaryType(salary.salaryType))}
                    {renderDetailItem(
                      getTranslationFromI18nKeyAndLabel('salary.details.amount', 'Amount'),
                      formatCurrency(salary.amount, salary.currency, locale)
                    )}
                    {renderDetailItem(
                      getTranslationFromI18nKeyAndLabel('salary.details.frequency', 'Frequency'),
                      formatFrequency(salary.paymentFrequency)
                    )}
                    {renderDetailItem(
                      getTranslationFromI18nKeyAndLabel('salary.details.effectiveDate', 'Effective Date'),
                      new Date(salary.effectiveDate).toLocaleDateString(locale)
                    )}
                    {renderDetailItem(
                      getTranslationFromI18nKeyAndLabel('salary.details.status', 'Status'),
                      <span className={salary.isActive ? 'gba:text-success' : 'gba:text-muted-foreground'}>
                        {salary.isActive
                          ? getTranslationFromI18nKeyAndLabel('salary.status.active', 'Active')
                          : getTranslationFromI18nKeyAndLabel('salary.status.inactive', 'Inactive')}
                      </span>
                    )}
                  </dl>
                </section>

                <section data-testid="salary-total-compensation">
                  <h2 className="gba:mb-3 gba:text-base gba:font-semibold">
                    {getTranslationFromI18nKeyAndLabel('salary.details.compensation', 'Total Compensation')}
                  </h2>
                  <dl className="gba:grid gba:grid-cols-1 gba:gap-3">
                    {renderDetailItem(
                      getTranslationFromI18nKeyAndLabel('salary.details.baseSalary', 'Base Salary'),
                      formatCurrency(salary.amount, salary.currency, locale)
                    )}
                    {renderDetailItem(
                      getTranslationFromI18nKeyAndLabel('salary.details.additionalComponents', 'Additional Components'),
                      formatCurrency(totalMonthlyCompensation - salary.amount, salary.currency, locale)
                    )}
                    {renderDetailItem(
                      getTranslationFromI18nKeyAndLabel('salary.details.totalMonthly', 'Total Monthly'),
                      <span className="gba:font-bold gba:text-info">
                        {formatCurrency(totalMonthlyCompensation, salary.currency, locale)}
                      </span>
                    )}
                  </dl>
                </section>
              </div>

              <div className="gba:my-6 gba:border-t gba:border-border" />

              <div className="gba:mt-6">
                <div className="gba:mb-4 gba:flex gba:items-center gba:justify-between">
                  <h3 className="gba:text-lg gba:font-medium">
                    {getTranslationFromI18nKeyAndLabel('salary.components.title', 'Compensation Components')}
                  </h3>

                  {isAdvancedSalaryEnabled && (
                    <Button type="button" data-testid="add-component-button">
                      <PlusIcon size={16} className="gba:mr-2" />
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
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="history">
          <Card data-testid="salary-history-card">
            <CardContent>
              <SalaryHistoryChart
                historyData={[]} // This would be populated with real data
                loading={false}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default EmployeeSalaryDetail
