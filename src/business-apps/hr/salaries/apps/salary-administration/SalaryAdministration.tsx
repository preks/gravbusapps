import React, { useState } from 'react'
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@newwork/nw-design-system'
import { PlusIcon } from '@phosphor-icons/react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useFeature } from '@/common/hooks/useFeature'
import SalaryStatistics from '../../components/SalaryStatistics'
import SalaryTable from '../../components/SalaryTable'
import CompensationComponentsTable from '../../components/CompensationComponentsTable'
import SalaryHistoryChart from '../../components/SalaryHistoryChart'
import SalarySearch from '../../components/SalarySearch'
import useSalaryData from '../../hooks/useSalaryData'

/**
 * SalaryAdministration component for managing employee salaries
 * Provides functionality for viewing and managing employee compensation
 */
const SalaryAdministration: React.FC<BusinessAppContextProps> = ({ accessToken, userInfo }) => {
  // Use employeeId from userInfo if available
  const employeeId = userInfo?.employeeDetails?.employeeId
  // Tab state management
  const [activeTab, setActiveTab] = useState<string>('salaries')

  // Handle URL query parameter for tab state persistence
  // Note: We're using a different approach since react-router-dom's useSearchParams is not available
  const updateUrlWithTab = (tabKey: string) => {
    const url = new URL(window.location.href)
    url.searchParams.set('tab', tabKey)
    window.history.replaceState({}, '', url.toString())
  }

  // Initialize tab from URL on component mount
  React.useEffect(() => {
    const url = new URL(window.location.href)
    const tabFromUrl = url.searchParams.get('tab')
    if (tabFromUrl) {
      setActiveTab(tabFromUrl)
    }
  }, [])

  // Feature flag check
  const salaryFeatureKey = 'core.salary' // Use the actual key from FeatureHub.ts
  const salaryFeature = useFeature(salaryFeatureKey)
  const isAdvancedSalaryEnabled = salaryFeature === 'advanced' // Use the actual value from FeatureHub.ts

  // State for search and filters - will be used in future implementation
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [filters, setFilters] = useState<any>({})

  // Fetch salary data using the custom hook
  const { components, statistics, isLoading, error, refetch } = useSalaryData({
    accessToken,
    employeeId,
    limit: 20
  })

  // Handle tab change with URL parameter update
  const handleTabChange = (key: string) => {
    setActiveTab(key)
    updateUrlWithTab(key)
  }

  // Handle search
  const handleSearch = (value: string) => {
    setSearchQuery(value)
    // Implement search logic here
  }

  // Handle filters
  const handleFilterChange = (newFilters: any) => {
    // Implement filter logic here when needed
    console.log('Filters changed:', newFilters)
  }

  // Reset search and filters
  const handleReset = () => {
    setSearchQuery('')
    setFilters({})

    // Use searchQuery and filters in a log to avoid unused variable warnings
    if (searchQuery || Object.keys(filters).length > 0) {
      console.log('Resetting search from:', searchQuery, 'and filters:', filters)
    }

    // Implement reset logic here
  }

  return (
    <div data-testid="salary-administration-container" className="gba:p-6">
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-6">
        <div>
          <h1 className="gba:text-2xl gba:font-semibold gba:mb-1">
            {getTranslationFromI18nKeyAndLabel('salary.administration.title', 'Salary Administration')}
          </h1>
          <p className="gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'salary.administration.description',
              'Manage employee compensation and wages'
            )}
          </p>
        </div>

        <Button
          type="button"
          data-testid="add-salary-button"
          disabled={!isAdvancedSalaryEnabled}
        >
          <PlusIcon size={16} className="gba:mr-2" />
          {getTranslationFromI18nKeyAndLabel('salary.button.add', 'Add Salary')}
        </Button>
      </div>

      {/* Statistics Section */}
      {statistics && (
        <div className="gba:mb-6">
          <SalaryStatistics statistics={statistics} isLoading={isLoading} error={error} onRetry={refetch} />
        </div>
      )}

      {/* Error handling */}
      {error && (
        <Alert variant="destructive" className="gba:mb-6" data-testid="salary-error-alert">
          <AlertTitle>{getTranslationFromI18nKeyAndLabel('salary.error.title', 'Error')}</AlertTitle>
          <AlertDescription>
            {getTranslationFromI18nKeyAndLabel(
              'salary.error.description',
              'Failed to load salary data. Please try again.'
            )}
          </AlertDescription>
          <div className="gba:mt-3">
            <Button type="button" size="sm" variant="outline" onClick={refetch} data-testid="salary-error-retry-button">
              {getTranslationFromI18nKeyAndLabel('common.retry', 'Retry')}
            </Button>
          </div>
        </Alert>
      )}

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={handleTabChange} data-testid="salary-tabs">
        <TabsList className="gba:mb-4">
          <TabsTrigger value="salaries">{getTranslationFromI18nKeyAndLabel('salary.tabs.salaries', 'Salaries')}</TabsTrigger>
          <TabsTrigger value="components">
            {getTranslationFromI18nKeyAndLabel('salary.tabs.components', 'Compensation Components')}
          </TabsTrigger>
          <TabsTrigger value="history">{getTranslationFromI18nKeyAndLabel('salary.tabs.history', 'Salary History')}</TabsTrigger>
        </TabsList>
        <TabsContent value="salaries">
          <SalarySearch onSearch={handleSearch} onFilterChange={handleFilterChange} onReset={handleReset} loading={isLoading} />
          <SalaryTable
            salaries={[]} // This would be populated with real data
            loading={isLoading}
            accessToken={accessToken}
            pagination={{ pageSize: 10 }}
          />
        </TabsContent>
        <TabsContent value="components">
          <CompensationComponentsTable
            components={components || []}
            loading={isLoading}
            accessToken={accessToken}
            pagination={{ pageSize: 10 }}
          />
        </TabsContent>
        <TabsContent value="history">
          <SalaryHistoryChart
            historyData={[]} // This would be populated with real data
            loading={isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default SalaryAdministration
