import React, { useState, useMemo, useEffect, useRef } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
  Spinner,
  Alert,
  Button,
  Badge
} from '@newwork/nw-design-system'
import { ArrowClockwiseIcon, UserIcon } from '@phosphor-icons/react'
import {
  EmployeeSelectionCard,
  TeamComparisonChart,
  TeamEntityCountsChart,
  TeamPerformanceRadarChart
} from '../../components'
import { useEmployeeComparison, usePipelines, useTeamEntityCounts, type CurrencyOption } from '../../hooks'
import { type TimeFilter, COMPARISON_CHART_COLORS } from '../../types'

const DATA_TEST_ID_PREFIX = 'sales-performance-employees-comparison'
const DEFAULT_CURRENCY = 'EUR'

interface CurrencyFilterProps {
  selectedCurrency: string
  currencies: Array<{ code: string; label: string; id: string }>
  onCurrencyChange: (currencyCode: string) => void
  isLoading?: boolean
}

const CurrencyFilter: React.FC<CurrencyFilterProps> = ({
  selectedCurrency,
  currencies,
  onCurrencyChange,
  isLoading = false
}) => {
  if (currencies.length === 0 && !isLoading) return null

  return (
    <div className="gba:flex gba:items-center gba:gap-2">
      <Label className="gba:text-sm gba:font-medium gba:whitespace-nowrap">Currency:</Label>
      <Select value={selectedCurrency} onValueChange={onCurrencyChange} disabled={isLoading}>
        <SelectTrigger className="gba:w-32" data-testid={`${DATA_TEST_ID_PREFIX}-currency-selector`}>
          <SelectValue placeholder="Select currency">{selectedCurrency}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {currencies.map(currency => (
            <SelectItem key={currency.code} value={currency.code}>
              {currency.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

interface EmployeeSelectorProps {
  availableEmployees: Array<{ id: string; name: string; position: string; department: string }>
  selectedEmployeeIds: string[]
  onSelectEmployee: (employeeId: string) => void
  isLoading?: boolean
}

const EmployeeSelector: React.FC<EmployeeSelectorProps> = ({
  availableEmployees,
  selectedEmployeeIds,
  onSelectEmployee,
  isLoading = false
}) => {
  const selectableEmployees = availableEmployees.filter(employee => !selectedEmployeeIds.includes(employee.id))

  return (
    <div className="gba:flex gba:items-center gba:gap-2">
      <Label className="gba:text-sm gba:font-medium gba:whitespace-nowrap gba:flex gba:items-center gba:gap-2">
        <UserIcon className="gba:h-4 gba:w-4" />
        Select Employee:
      </Label>
      <Select value="" onValueChange={onSelectEmployee} disabled={isLoading || selectableEmployees.length === 0}>
        <SelectTrigger className="gba:w-56" data-testid={`${DATA_TEST_ID_PREFIX}-employee-selector`}>
          <SelectValue placeholder="Add employee to compare" />
        </SelectTrigger>
        <SelectContent>
          {selectableEmployees.map(employee => (
            <SelectItem key={employee.id} value={employee.id}>
              {employee.name} ({employee.position})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedEmployeeIds.length > 0 && (
        <Badge variant="secondary" className="gba:ml-2">
          {selectedEmployeeIds.length} selected
        </Badge>
      )}
    </div>
  )
}

export interface EmployeeComparisonViewProps {
  accessToken: string
  currencies: CurrencyOption[]
  currenciesLoading: boolean
  selectedEmployeeIds: string[]
  onEmployeeSelectionChange: (employeeIds: string[]) => void
  activeEmployeeIds: Set<string>
  onActiveEmployeeIdsChange: (activeIds: Set<string>) => void
}

export const EmployeeComparisonView: React.FC<EmployeeComparisonViewProps> = ({
  accessToken,
  currencies,
  currenciesLoading,
  selectedEmployeeIds,
  onEmployeeSelectionChange,
  activeEmployeeIds,
  onActiveEmployeeIdsChange
}) => {
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string>(DEFAULT_CURRENCY)
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('sixMonths')
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | undefined>(undefined)

  const { pipelines, isLoading: pipelinesLoading } = usePipelines(accessToken)

  const selectedCurrencyId = useMemo(() => {
    const currency = currencies.find(item => item.code === selectedCurrencyCode)
    if (currency) return currency.id

    const eurCurrency = currencies.find(item => item.code === DEFAULT_CURRENCY)
    if (eurCurrency) return eurCurrency.id

    return currencies[0]?.id
  }, [selectedCurrencyCode, currencies])

  const {
    availableEmployees,
    selectedEmployees,
    revenueTrends,
    isLoading,
    isLoadingTrends,
    error,
    selectEmployee,
    deselectEmployee,
    refetch
  } = useEmployeeComparison(
    accessToken,
    timeFilter,
    selectedCurrencyId,
    selectedCurrencyCode,
    selectedPipelineId,
    selectedEmployeeIds,
    onEmployeeSelectionChange
  )

  // Entity counts only depend on the selected employee IDs (the query filters by
  // memberIds). Keep this independent of `selectedEmployees` so the metrics load
  // (which populates names a render later) doesn't trigger a second fetch.
  const employeesDataForEntityCounts = useMemo(() => {
    return selectedEmployeeIds.map((employeeId, index) => ({
      id: employeeId,
      name: employeeId,
      memberIds: [employeeId],
      color: COMPARISON_CHART_COLORS[index % COMPARISON_CHART_COLORS.length]
    }))
  }, [selectedEmployeeIds])

  const {
    entityCounts,
    isLoading: isLoadingEntityCounts,
    error: entityCountsError,
    refetch: refetchEntityCounts
  } = useTeamEntityCounts(accessToken, employeesDataForEntityCounts)

  const prevSelectedEmployeeIdsRef = useRef<string[]>([])

  useEffect(() => {
    const prevIds = prevSelectedEmployeeIdsRef.current
    const currentIds = selectedEmployeeIds
    const addedEmployees = currentIds.filter(id => !prevIds.includes(id))
    const removedEmployees = prevIds.filter(id => !currentIds.includes(id))

    if (addedEmployees.length > 0 || removedEmployees.length > 0) {
      const newSet = new Set(activeEmployeeIds)
      addedEmployees.forEach(id => newSet.add(id))
      removedEmployees.forEach(id => newSet.delete(id))
      onActiveEmployeeIdsChange(newSet)
    }

    prevSelectedEmployeeIdsRef.current = currentIds
  }, [selectedEmployeeIds, activeEmployeeIds, onActiveEmployeeIdsChange])

  const handleToggleEmployeeActive = (employeeId: string) => {
    const newSet = new Set(activeEmployeeIds)
    if (newSet.has(employeeId)) {
      newSet.delete(employeeId)
    } else {
      newSet.add(employeeId)
    }
    onActiveEmployeeIdsChange(newSet)
  }

  const handleRemoveEmployee = (employeeId: string) => {
    deselectEmployee(employeeId)
    const newSet = new Set(activeEmployeeIds)
    newSet.delete(employeeId)
    onActiveEmployeeIdsChange(newSet)
  }

  const activeEmployees = useMemo(() => {
    return selectedEmployees.filter(employee => activeEmployeeIds.has(employee.id))
  }, [selectedEmployees, activeEmployeeIds])

  const filteredRevenueTrends = useMemo(() => {
    if (activeEmployeeIds.size === 0) return []

    return revenueTrends.map(point => {
      const filtered: typeof point = { month: point.month }
      activeEmployeeIds.forEach(employeeId => {
        if (point[employeeId] !== undefined) {
          filtered[employeeId] = point[employeeId]
        }
      })
      return filtered
    })
  }, [revenueTrends, activeEmployeeIds])

  if (isLoading && availableEmployees.length === 0) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-64" data-testid={DATA_TEST_ID_PREFIX}>
        <Spinner size="lg" />
      </div>
    )
  }

  if (error && availableEmployees.length === 0) {
    return (
      <Alert
        variant="destructive"
        title="Error loading employees"
        description={error}
        action={
          <Button variant="outline" size="sm" onClick={refetch}>
            <ArrowClockwiseIcon className="gba:mr-2 gba:h-4 gba:w-4" />
            Retry
          </Button>
        }
      />
    )
  }

  return (
    <div className="gba:space-y-6" data-testid={DATA_TEST_ID_PREFIX}>
      <section
        className="gba:flex gba:items-center gba:justify-between gba:flex-wrap gba:gap-4"
        data-testid={`${DATA_TEST_ID_PREFIX}-filters-section`}
      >
        <EmployeeSelector
          availableEmployees={availableEmployees}
          selectedEmployeeIds={selectedEmployeeIds}
          onSelectEmployee={selectEmployee}
          isLoading={isLoading}
        />
        <CurrencyFilter
          selectedCurrency={selectedCurrencyCode}
          currencies={currencies}
          onCurrencyChange={setSelectedCurrencyCode}
          isLoading={currenciesLoading}
        />
      </section>

      {selectedEmployees.length > 0 && (
        <section data-testid={`${DATA_TEST_ID_PREFIX}-cards-section`}>
          <p className="gba:text-xs gba:text-muted-foreground gba:mb-2">
            Click a card to show or hide that employee in the charts below.
          </p>
          <div className="gba:max-h-44 gba:overflow-y-auto gba:grid gba:grid-cols-1 gba:sm:grid-cols-2 gba:lg:grid-cols-3 gba:xl:grid-cols-4 gba:gap-2 gba:pr-1">
            {selectedEmployees.map(employee => (
              <EmployeeSelectionCard
                key={employee.id}
                employee={employee}
                isActive={activeEmployeeIds.has(employee.id)}
                onToggleActive={handleToggleEmployeeActive}
                onRemove={handleRemoveEmployee}
              />
            ))}
          </div>
        </section>
      )}

      {selectedEmployees.length > 0 && (
        <>
          <section data-testid={`${DATA_TEST_ID_PREFIX}-chart-section`}>
            <TeamComparisonChart
              teams={activeEmployees}
              revenueTrends={filteredRevenueTrends}
              isLoading={isLoadingTrends}
              error={error}
              onRetry={refetch}
              variant="employee"
              timeFilter={timeFilter}
              onTimeFilterChange={setTimeFilter}
              pipelines={pipelines}
              selectedPipelineId={selectedPipelineId}
              onPipelineChange={setSelectedPipelineId}
              pipelinesLoading={pipelinesLoading}
            />
          </section>

          <section
            className="gba:grid gba:grid-cols-1 gba:xl:grid-cols-2 gba:gap-6"
            data-testid={`${DATA_TEST_ID_PREFIX}-metrics-section`}
          >
            <TeamPerformanceRadarChart
              teams={activeEmployees}
              isLoading={isLoadingTrends}
              error={error}
              onRetry={refetch}
              variant="employee"
            />
            <TeamEntityCountsChart
              teams={activeEmployees}
              entityCounts={entityCounts}
              isLoading={isLoadingEntityCounts}
              error={entityCountsError}
              onRetry={refetchEntityCounts}
              variant="employee"
            />
          </section>
        </>
      )}
    </div>
  )
}

export default EmployeeComparisonView
