import React, { useState, useEffect } from 'react'
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  Spinner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@newwork/nw-design-system'
import { CalendarIcon, ChartBarIcon, TableIcon, ArrowsClockwiseIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useAbsenceDataIntegration } from '../../../hooks/useAbsenceDataIntegration'
import AbsenceStatisticsDashboard from './components/AbsenceStatisticsDashboard'
import AbsenceChartsView from './components/AbsenceChartsView'
import AbsenceDetailsTable from './components/AbsenceDetailsTable'

const AbsenceReport: React.FC<BusinessAppContextProps> = context => {
  // Define valid tabs
  const validTabs = ['overview', 'charts', 'details']
  const defaultTab = 'overview'

  // Get content from URL query parameter or use default
  const getInitialTab = () => {
    const urlParams = new URLSearchParams(window.location.search)
    const contentFromUrl = urlParams.get('content')

    if (validTabs.includes(contentFromUrl ?? '')) {
      return contentFromUrl!
    } else {
      // No valid content in URL, set default content in URL
      const url = new URL(window.location.href)
      url.searchParams.set('content', defaultTab)
      window.history.replaceState({}, '', url.toString())
      return defaultTab
    }
  }

  const [activeTab, setActiveTab] = useState<string>(getInitialTab)

  const {
    absenceData,
    balanceData,
    absenceTypes,
    absenceGroups,
    statistics,
    chartData,
    tableData,
    isLoading,
    error,
    refetch
  } = useAbsenceDataIntegration(context)

  const prefixDataTestId = 'AbsenceReport'

  // Update URL when content changes
  const handleTabChange = (key: string) => {
    setActiveTab(key)
    const url = new URL(window.location.href)
    url.searchParams.set('content', key)
    window.history.pushState({}, '', url.toString())
  }

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search)
      const contentFromUrl = urlParams.get('content')
      const newTab = validTabs.includes(contentFromUrl ?? '') ? contentFromUrl! : defaultTab
      setActiveTab(newTab)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  if (error) {
    return (
      <div data-testid={`${prefixDataTestId}-error`} className="gba:bg-muted gba:min-h-full gba:p-6 gba:rounded-lg">
        <Alert variant="destructive">
          <AlertTitle>Failed to Load Absence Data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <div className="gba:mt-3">
            <Button type="button" size="sm" variant="outline" onClick={refetch}>
              <ArrowsClockwiseIcon size={16} className="gba:mr-2" />
              Retry
            </Button>
          </div>
        </Alert>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div
        data-testid={`${prefixDataTestId}-loading`}
        className="gba:bg-muted gba:min-h-full gba:p-6 gba:rounded-lg gba:flex gba:justify-center gba:items-center gba:flex-col"
      >
        <Spinner />
        <span className="gba:mt-4 gba:text-muted-foreground">Loading absence data and analytics...</span>
      </div>
    )
  }

  // Safe access to array properties with fallbacks
  const safeAbsenceTypes = absenceTypes || []
  const safeAbsenceGroups = absenceGroups || []
  const safeAbsenceData = absenceData || []
  const safeBalanceData = balanceData || []

  return (
    <div data-testid={prefixDataTestId} className="gba:bg-muted gba:min-h-full gba:p-6 gba:rounded-lg">
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-6">
        <div className="gba:flex gba:items-center gba:gap-4">
          <h3 className="gba:m-0 gba:text-xl gba:font-semibold gba:text-foreground">
            Absence Report & Analytics
          </h3>
          <div className="gba:flex gba:gap-2">
            <Card className="gba:py-1 gba:px-2">
              <span className="gba:font-semibold gba:text-info">
                {statistics?.totalEmployees || 0} Employees
              </span>
            </Card>
            <Card className="gba:py-1 gba:px-2">
              <span className="gba:font-semibold gba:text-info">
                {safeAbsenceTypes.length} Absence Types
              </span>
            </Card>
            <Card className="gba:py-1 gba:px-2">
              <span className="gba:font-semibold gba:text-success">
                {statistics?.totalAbsenceDays || 0} Total Days
              </span>
            </Card>
          </div>
        </div>
        <Button
          type="button"
          onClick={refetch}
          data-testid={`${prefixDataTestId}-refresh-button`}
        >
          <ArrowsClockwiseIcon size={16} className="gba:mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Main Content */}
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="gba:bg-primary-foreground gba:rounded-lg gba:p-4"
      >
        <TabsList>
          <TabsTrigger value="overview">
              <CalendarIcon size={16} />
              <span data-testid={`${prefixDataTestId}-overview-tab`}>Overview & Statistics</span>
          </TabsTrigger>
          <TabsTrigger value="charts">
              <ChartBarIcon size={16} />
              <span data-testid={`${prefixDataTestId}-charts-tab`}>Charts & Trends</span>
          </TabsTrigger>
          <TabsTrigger value="details">
              <TableIcon size={16} />
              <span data-testid={`${prefixDataTestId}-details-tab`}>Detailed Analysis</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <AbsenceStatisticsDashboard statistics={statistics as any} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="charts">
          <AbsenceChartsView chartData={chartData as any} isLoading={isLoading} dataTestId={prefixDataTestId} />
        </TabsContent>

        <TabsContent value="details">
          <AbsenceDetailsTable tableData={tableData as any} dataTestId={prefixDataTestId} />
        </TabsContent>
      </Tabs>

      {/* Footer Summary */}
      <div className="gba:mt-6">
          <Card className="gba:bg-muted">
            <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
              <div>
                <span className="gba:text-sm gba:text-muted-foreground">
                  Last Updated: {new Date().toLocaleDateString()} • Data includes {safeAbsenceData.length} absence
                  records and {safeBalanceData.length} balance entries
                </span>
              </div>
              <div className="gba:flex gba:gap-4">
                  {safeAbsenceGroups.length > 0 ? (
                    safeAbsenceGroups.map((group, index: number) => (
                      <div key={group?.code || `group-${index}`} className="gba:text-center">
                        <div className="gba:text-xs gba:text-info">{group?.value || 'Unknown'}</div>
                        <div className="gba:text-sm gba:font-bold">
                          {statistics?.groupStats?.find(s => s.groupCode === group?.code)?.totalDays || 0} days
                        </div>
                      </div>
                    ))
                  ) : (
                    <span className="gba:text-sm gba:text-muted-foreground">No absence group data available</span>
                  )}
              </div>
            </div>
          </Card>
      </div>
    </div>
  )
}

export default AbsenceReport
