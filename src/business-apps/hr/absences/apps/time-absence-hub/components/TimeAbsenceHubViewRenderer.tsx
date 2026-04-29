import React from 'react'
import { PageLayout } from '@newwork/nw-design-system'
import { CalendarBlankIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '../../../../../../common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { MODULE_COLORS } from '@/common/constants/ui'
import { HUB_VIEW_OPTIONS } from '../constants/viewOptions'
import { HubView } from '../constants/routes'
import { UseTimeAbsenceHubNavigationReturn } from '../hooks/useTimeAbsenceHubNavigation'
import { UseHubGlobalFiltersReturn } from '../hooks/useHubGlobalFilters'
import { HubFilterOptionsState } from '../hooks/useHubFilterOptions'
import HubGlobalFilters from './HubGlobalFilters'
import {
  AbsencesView,
  AttendanceView,
  ComplianceView,
  DashboardView,
  EntitlementsView,
  InsightsView,
  ReportsView
} from './views'
import { AbsenceDetails, EntitlementsDetails } from './pages'

interface TimeAbsenceHubViewRendererProps extends BusinessAppContextProps {
  navigation: UseTimeAbsenceHubNavigationReturn
  globalFilters: UseHubGlobalFiltersReturn
  filterOptions: HubFilterOptionsState
  dashboardData: any
}

const moduleColor = MODULE_COLORS.HR

const renderHubView = (
  view: HubView,
  context: BusinessAppContextProps,
  navigation: UseTimeAbsenceHubNavigationReturn,
  globalFilters: UseHubGlobalFiltersReturn,
  dashboardData: any
): React.ReactNode => {
  const baseProps = { ...context }
  switch (view) {
    case 'dashboard':
      return (
        <DashboardView
          {...baseProps}
          dashboardData={dashboardData}
          timeFilter={globalFilters.legacyTimeFilter}
          onTimeFilterChange={filter => globalFilters.setTimeScope(filter)}
          onMonthClick={navigation.handleNavigateToAbsenceDetails}
          onNavigateToDetails={navigation.handleNavigateToAbsenceDetailsWithFilters}
          onNavigateToEntitlements={navigation.handleNavigateToEntitlementsDetails}
        />
      )
    case 'absences':
      return (
        <AbsencesView
          {...baseProps}
          activeSubTab={navigation.activeTab}
          onSubTabChange={navigation.setActiveTab}
          dashboardData={dashboardData}
        />
      )
    case 'attendance':
      return (
        <AttendanceView
          {...baseProps}
          activeSubTab={navigation.activeTab}
          onSubTabChange={navigation.setActiveTab}
          globalFilters={globalFilters.filters}
          derivedDateRange={globalFilters.derivedDateRange}
        />
      )
    case 'entitlements':
      return (
        <EntitlementsView
          {...baseProps}
          globalFilters={globalFilters.filters}
          onNavigateToEntitlementsDetails={navigation.handleNavigateToEntitlementsDetails}
        />
      )
    case 'compliance':
      return <ComplianceView {...baseProps} />
    case 'insights':
      return (
        <InsightsView
          {...baseProps}
          dashboardData={dashboardData}
          globalFilters={globalFilters.filters}
          derivedDateRange={globalFilters.derivedDateRange}
        />
      )
    case 'reports':
      return (
        <ReportsView
          {...baseProps}
          dashboardData={dashboardData}
          globalFilters={globalFilters.filters}
          derivedDateRange={globalFilters.derivedDateRange}
        />
      )
    default:
      return null
  }
}

export const TimeAbsenceHubViewRenderer: React.FC<TimeAbsenceHubViewRendererProps> = ({
  accessToken,
  userInfo,
  navigation,
  globalFilters,
  filterOptions,
  dashboardData
}) => {
  const context: BusinessAppContextProps = { accessToken, userInfo }

  if (navigation.currentView === 'absence-details') {
    const filters = navigation.absenceDetailsFilter
    const displayDepartment =
      filters.department === 'NO_DEPARTMENT_SPECIAL'
        ? getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.no_department', 'No Department')
        : filters.department

    return (
      <div data-testid="time-absence-hub-container">
        <AbsenceDetails
          accessToken={accessToken}
          userInfo={userInfo}
          month={filters.month}
          startDate={filters.startDate}
          endDate={filters.endDate}
          status={filters.status}
          department={displayDepartment}
          departmentId={filters.departmentId}
          dashboardData={dashboardData}
          onNavigateBack={navigation.handleNavigateBackToDashboard}
        />
      </div>
    )
  }

  if (navigation.currentView === 'entitlements-details') {
    return (
      <div data-testid="time-absence-hub-container">
        <EntitlementsDetails
          accessToken={accessToken}
          userInfo={userInfo}
          timeFilter={globalFilters.legacyTimeFilter}
          onNavigateBack={navigation.handleNavigateBackToDashboard}
        />
      </div>
    )
  }

  return (
    <div data-testid="time-absence-hub-container">
      <PageLayout
        headerIcon={CalendarBlankIcon}
        headerTitle={getTranslationFromI18nKeyAndLabel('lowcoder:time_absence_hub.title', 'Time & Absence Hub')}
        headerDescription={getTranslationFromI18nKeyAndLabel(
          'lowcoder:time_absence_hub.description',
          'Unified time tracking and absence management for the entire organization'
        )}
        headerSubViews={{
          value: navigation.currentView,
          onValueChange: navigation.handleTabChange,
          items: HUB_VIEW_OPTIONS.map(option => ({
            value: option.key,
            label: option.label,
            icon: option.icon
          }))
        }}
        variant={moduleColor}
        className="gba:min-h-screen"
      >
        <div className="gba:flex gba:flex-col gba:gap-4 gba:p-6">
          <HubGlobalFilters
            filters={globalFilters.filters}
            options={filterOptions}
            onTimeScopeChange={globalFilters.setTimeScope}
            onDateRangeChange={globalFilters.setDateRange}
            onDepartmentsChange={globalFilters.setDepartmentIds}
            onLocationsChange={globalFilters.setLocationIds}
            onLegalEntitiesChange={globalFilters.setLegalEntityIds}
            onManagersChange={globalFilters.setManagerIds}
            onEmployeeQueryChange={globalFilters.setEmployeeQuery}
            onReset={globalFilters.resetFilters}
          />
          {renderHubView(navigation.currentView, context, navigation, globalFilters, dashboardData)}
        </div>
      </PageLayout>
    </div>
  )
}

export default TimeAbsenceHubViewRenderer
