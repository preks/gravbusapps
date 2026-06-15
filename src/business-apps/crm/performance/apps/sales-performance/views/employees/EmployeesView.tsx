import React, { useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@newwork/nw-design-system'
import { ChartBarIcon, ListBulletsIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useEmployeesViewState } from '../../hooks/useEmployeesViewState'
import { type CurrencyOption } from '../../hooks'
import { EmployeeComparisonView } from './EmployeeComparisonView'
import { EmployeesListView } from './EmployeesListView'
import { EmployeePerformanceView } from './EmployeePerformanceView'

const DATA_TEST_ID_PREFIX = 'sales-performance-employees'

interface EmployeesViewProps extends BusinessAppContextProps {
  currencies: CurrencyOption[]
  currenciesLoading: boolean
  selectedEmployeeId?: string | null
  onEmployeeSelect?: (employeeId: string | null) => void
  selectedComparisonEmployeeIds: string[]
  onComparisonEmployeeSelectionChange: (employeeIds: string[]) => void
  activeComparisonEmployeeIds: Set<string>
  onActiveComparisonEmployeeIdsChange: (activeIds: Set<string>) => void
}

export const EmployeesView: React.FC<EmployeesViewProps> = ({
  accessToken,
  userInfo,
  currencies,
  currenciesLoading,
  selectedEmployeeId,
  onEmployeeSelect,
  selectedComparisonEmployeeIds,
  onComparisonEmployeeSelectionChange,
  activeComparisonEmployeeIds,
  onActiveComparisonEmployeeIdsChange
}) => {
  const { activeTab, handleTabChange } = useEmployeesViewState()

  const handleBack = useCallback(() => {
    onEmployeeSelect?.(null)
  }, [onEmployeeSelect])

  const handleEmployeeSelect = useCallback(
    (employeeId: string) => {
      onEmployeeSelect?.(employeeId)
    },
    [onEmployeeSelect]
  )

  if (selectedEmployeeId) {
    return (
      <div className="gba:h-full gba:p-6" data-testid={`${DATA_TEST_ID_PREFIX}-employee-detail`}>
        <EmployeePerformanceView
          employeeId={selectedEmployeeId}
          onBack={handleBack}
          accessToken={accessToken}
          userInfo={userInfo}
        />
      </div>
    )
  }

  return (
    <div className="gba:h-full gba:p-6" data-testid={DATA_TEST_ID_PREFIX}>
      <Tabs
        value={activeTab}
        onValueChange={value => {
          if (value === 'comparison' || value === 'list') {
            handleTabChange(value)
          }
        }}
        className="gba:h-full"
        data-testid={`${DATA_TEST_ID_PREFIX}-tabs`}
      >
        <TabsList className="gba:mb-6">
          <TabsTrigger
            value="comparison"
            startIcon={<ChartBarIcon size={16} />}
            data-testid={`${DATA_TEST_ID_PREFIX}-tab-comparison`}
          >
            Comparison
          </TabsTrigger>
          <TabsTrigger
            value="list"
            startIcon={<ListBulletsIcon size={16} />}
            data-testid={`${DATA_TEST_ID_PREFIX}-tab-list`}
          >
            Employee Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="comparison" className="gba:h-full gba:overflow-auto">
          <EmployeeComparisonView
            accessToken={accessToken}
            currencies={currencies}
            currenciesLoading={currenciesLoading}
            selectedEmployeeIds={selectedComparisonEmployeeIds}
            onEmployeeSelectionChange={onComparisonEmployeeSelectionChange}
            activeEmployeeIds={activeComparisonEmployeeIds}
            onActiveEmployeeIdsChange={onActiveComparisonEmployeeIdsChange}
          />
        </TabsContent>

        <TabsContent value="list" className="gba:h-full gba:overflow-auto">
          <EmployeesListView
            accessToken={accessToken}
            userInfo={userInfo}
            currencies={currencies}
            currenciesLoading={currenciesLoading}
            onEmployeeSelect={handleEmployeeSelect}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default EmployeesView
