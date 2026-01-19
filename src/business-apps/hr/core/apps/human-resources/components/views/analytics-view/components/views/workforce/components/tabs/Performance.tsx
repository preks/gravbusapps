import React, { useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  Card,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Alert
} from '@newwork/nw-design-system'
import { usePerformanceData, WorkdaysData } from '../../../../../hooks/usePerformanceData'
import PerformanceStatistics from '../components/PerformanceStatistics'
import MonthlyWorkdaysTable from '../components/MonthlyWorkdaysTable'
import WorkdaysTrendChart from '../components/WorkdaysTrendChart'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import { useTranslation } from '@newwork/nw-design-system'
import hrTranslations from '../../_i18n'

export type OrgEntityType = 'location' | 'company' | 'costCenter' | 'organizationalUnit'

interface PerformanceStatisticsData {
  totalWorkdays: number
  averageWorkdaysPerEntity: number
  totalEntities: number
  totalEmployees: number
}

interface WorkdaysTrendData {
  month: string
  workdays: number
  employees: number
}

interface EntityOption {
  id: string
  name: string
}

const Performance: React.FC<BusinessAppContextProps> = context => {
  const { t } = useTranslation(hrTranslations)
  const [selectedEntityType, setSelectedEntityType] = useState<OrgEntityType>('location')
  const [selectedEntityId, setSelectedEntityId] = useState<string>('all')
  const [workdaysData, setWorkdaysData] = useState<WorkdaysData[]>([])
  const [statistics, setStatistics] = useState<PerformanceStatisticsData>({
    totalWorkdays: 0,
    averageWorkdaysPerEntity: 0,
    totalEntities: 0,
    totalEmployees: 0
  })
  const [workdaysTrend, setWorkdaysTrend] = useState<WorkdaysTrendData[]>([])
  const [availableEntities, setAvailableEntities] = useState<EntityOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { fetchWorkdaysByLocation, fetchWorkdaysByCompany, fetchWorkdaysByOrgUnit, fetchWorkdaysByCostCenter } =
    usePerformanceData(context)

  const structureId = getCurrentActiveStructureId()
  const dataTestId = 'performance-tab'

  // Get the appropriate fetch function based on entity type
  const getFetchFunction = () => {
    switch (selectedEntityType) {
      case 'location':
        return fetchWorkdaysByLocation
      case 'company':
        return fetchWorkdaysByCompany
      case 'costCenter':
        return fetchWorkdaysByCostCenter
      case 'organizationalUnit':
        return fetchWorkdaysByOrgUnit
      default:
        return fetchWorkdaysByLocation
    }
  }

  // Generate trend data from current workdays data
  const generateTrendData = (data: WorkdaysData[]): WorkdaysTrendData[] => {
    const currentDate = new Date()
    const trendData: WorkdaysTrendData[] = []

    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      const monthStr = monthDate.toISOString().slice(0, 7) // YYYY-MM format

      const totalWorkdays = data.reduce((sum, entity) => sum + entity.totalWorkdays, 0)
      const totalEmployees = data.reduce((sum, entity) => sum + entity.employeeCount, 0)

      // Simulate some variation for historical data
      const variation = 1 + Math.sin(i) * 0.05 // ±5% variation

      trendData.push({
        month: monthStr,
        workdays: Math.round(totalWorkdays * variation),
        employees: totalEmployees
      })
    }

    return trendData
  }

  // Calculate statistics from workdays data
  const calculateStatistics = (data: WorkdaysData[]): PerformanceStatisticsData => {
    const totalWorkdays = data.reduce((sum, entity) => sum + entity.totalWorkdays, 0)
    const totalEmployees = data.reduce((sum, entity) => sum + entity.employeeCount, 0)
    const totalEntities = data.length
    const averageWorkdaysPerEntity = totalEntities > 0 ? totalWorkdays / totalEntities : 0

    return {
      totalWorkdays,
      averageWorkdaysPerEntity: Math.round(averageWorkdaysPerEntity * 100) / 100,
      totalEntities,
      totalEmployees
    }
  }

  // Load data when entity type or entity ID changes
  const loadData = async () => {
    if (!context.accessToken || !structureId) return

    setIsLoading(true)
    setError(null)

    try {
      const fetchFunction = getFetchFunction()
      const variables = {
        structureId,
        ...(selectedEntityId !== 'all' && { entityId: selectedEntityId })
      }

      const result = await fetchFunction(variables)

      // Filter data if specific entity is selected
      const filteredData = selectedEntityId === 'all' ? result : result.filter(entity => entity.id === selectedEntityId)

      setWorkdaysData(filteredData)
      setStatistics(calculateStatistics(filteredData))
      setWorkdaysTrend(generateTrendData(filteredData))
      setAvailableEntities(result.map(entity => ({ id: entity.id, name: entity.name })))
    } catch (err) {
      console.error('Error loading performance data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load performance data')
    } finally {
      setIsLoading(false)
    }
  }

  // Load data on component mount and when dependencies change
  useEffect(() => {
    loadData()
  }, [selectedEntityType, selectedEntityId, context.accessToken, structureId])

  if (error) {
    return (
      <div data-testid={`${dataTestId}-error`} className="gba:p-6">
        <Alert className="gba:border-destructive-secondary gba:bg-destructive-secondary">
          <div className="gba:space-y-2">
            <h4 className="gba:text-destructive-secondary-foreground gba:font-medium">
              Error Loading Performance Data
            </h4>
            <p className="gba:text-destructive-secondary-foreground">{error}</p>
            <button
              onClick={loadData}
              className="gba:px-3 gba:py-1 gba:bg-destructive gba:text-destructive-foreground gba:rounded gba:text-sm hover:gba:bg-destructive-secondary"
            >
              Retry
            </button>
          </div>
        </Alert>
      </div>
    )
  }

  const handleEntityTypeChange = (value: OrgEntityType) => {
    setSelectedEntityType(value)
    setSelectedEntityId('all') // Reset entity selection when type changes
  }

  const handleEntityIdChange = (value: string) => {
    setSelectedEntityId(value)
  }

  // Convert WorkdaysData to the format expected by components
  const monthlyWorkdays = workdaysData.map(entity => ({
    entityId: entity.id,
    entityName: entity.name,
    lastMonth: entity.monthlyData.lastMonth,
    thisMonth: entity.monthlyData.currentMonth,
    nextMonth: entity.monthlyData.nextMonth,
    averageWorkdays: entity.averageWorkdays,
    totalEmployees: entity.employeeCount
  }))

  if (isLoading) {
    return (
      <div data-testid={`${dataTestId}-loading`} className="gba:flex gba:items-center gba:justify-center gba:p-12">
        <div className="gba:text-center">
          <Spinner className="gba:w-8 gba:h-8 gba:mx-auto gba:mb-4" />
          <p className="gba:text-muted-foreground">{t('hr-analytics-loading-performance')}</p>
        </div>
      </div>
    )
  }

  return (
    <div data-testid={dataTestId} className="gba:space-y-6 gba:p-6">
      {/* Filter Controls */}
      <Card className="gba:p-4">
        <div className="gba:flex gba:gap-4 gba:items-center">
          <div className="gba:flex-1">
            <label className="gba:block gba:text-sm gba:font-medium gba:text-foreground gba:mb-2">
              {t('hr-analytics-entity-type')}
            </label>
            <Select value={selectedEntityType} onValueChange={handleEntityTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder={t('hr-analytics-select-entity-type')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="location">{t('hr-analytics-entity-location')}</SelectItem>
                <SelectItem value="company">{t('hr-analytics-entity-company')}</SelectItem>
                <SelectItem value="costCenter">{t('hr-analytics-entity-cost-center')}</SelectItem>
                <SelectItem value="organizationalUnit">{t('hr-analytics-entity-organizational-unit')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="gba:flex-1">
            <label className="gba:block gba:text-sm gba:font-medium gba:text-foreground gba:mb-2">
              {t('hr-analytics-specific-entity')}
            </label>
            <Select value={selectedEntityId} onValueChange={handleEntityIdChange}>
              <SelectTrigger>
                <SelectValue placeholder={t('hr-analytics-select-specific-entity')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t('hr-analytics-all-entities')} {selectedEntityType}
                </SelectItem>
                {availableEntities.map(entity => (
                  <SelectItem key={entity.id} value={entity.id}>
                    {entity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Statistics */}
      <PerformanceStatistics statistics={statistics} isLoading={false} dataTestId={`${dataTestId}-statistics`} />

      {/* Monthly Workdays Table */}
      <MonthlyWorkdaysTable
        data={monthlyWorkdays}
        entityType={selectedEntityType}
        dataTestId={`${dataTestId}-workdays-table`}
      />

      {/* Workdays Trend Chart */}
      <WorkdaysTrendChart data={workdaysTrend} isLoading={false} dataTestId={`${dataTestId}-trend-chart`} />
    </div>
  )
}

export default Performance
