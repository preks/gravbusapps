import React from 'react'
import { Button, Spinner, Card, CardContent } from '@newwork/nw-design-system'
import { PiArrowClockwise } from 'react-icons/pi'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useDemographicsDataIntegration } from '../../../hooks/useDemographicsDataIntegration'
import DemographicsChartsView from './components/DemographicsChartsView'
import DemographicsStatistics from './components/DemographicsStatistics'

const Demographics: React.FC<BusinessAppContextProps> = context => {
  const { demographicsData, statistics, isLoading, error, refetch } = useDemographicsDataIntegration(context)

  const prefixDataTestId = 'Demographics'

  if (error) {
    return (
      <div
        data-testid={`${prefixDataTestId}-error`}
        className="gba:bg-gradient-to-b gba:from-background gba:to-muted gba:min-h-full gba:p-6 gba:rounded-lg"
      >
        <Card className="gba:border-destructive-secondary gba:bg-destructive-secondary">
          <CardContent className="gba:p-6">
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:flex-1">
                <h3 className="gba:text-destructive-secondary-foreground gba:font-medium gba:mb-2">
                  Failed to Load Demographics Data
                </h3>
                <p className="gba:text-destructive-secondary-foreground">{error}</p>
              </div>
              <Button variant="outline" onClick={refetch} className="gba:flex gba:items-center gba:gap-2">
                <PiArrowClockwise />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div
        data-testid={`${prefixDataTestId}-loading`}
        className="gba:bg-gradient-to-b gba:from-background gba:to-muted gba:min-h-full gba:p-6 gba:rounded-lg gba:flex gba:justify-center gba:items-center gba:flex-col"
      >
        <Spinner className="gba:w-8 gba:h-8" />
        <p className="gba:mt-4 gba:text-muted-foreground">Loading demographics data and analytics...</p>
      </div>
    )
  }

  return (
    <div
      data-testid={prefixDataTestId}
      className="gba:bg-gradient-to-b gba:from-gray-50 gba:to-gray-100 gba:min-h-full gba:p-6 gba:rounded-lg"
    >
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-6">
        <div className="gba:flex gba:items-center gba:gap-4">
          <h2 className="gba:text-2xl gba:font-bold gba:text-foreground gba:m-0">Employee Demographics</h2>
          <div className="gba:bg-primary-foreground gba:px-3 gba:py-1 gba:rounded-full gba:border gba:border-border">
            <span className="gba:font-semibold gba:text-info">{statistics.totalEmployees} Employees</span>
          </div>
        </div>
        <Button
          onClick={refetch}
          data-testid={`${prefixDataTestId}-refresh-button`}
          className="gba:flex gba:items-center gba:gap-2"
        >
          <PiArrowClockwise />
          Refresh Data
        </Button>
      </div>

      {/* Statistics Overview */}
      <DemographicsStatistics statistics={statistics} isLoading={isLoading} dataTestId={prefixDataTestId} />

      {/* Interactive Charts with Expandable Tables */}
      <div className="gba:mt-6">
        <div className="gba:mb-4">
          <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">Demographics Breakdown</h3>
          <p className="gba:text-sm gba:text-muted-foreground">Click on any chart to view detailed data table</p>
        </div>

        <DemographicsChartsView
          demographicsData={demographicsData}
          isLoading={isLoading}
          dataTestId={prefixDataTestId}
        />
      </div>
    </div>
  )
}

export default Demographics
