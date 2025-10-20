import React from 'react'
import { PageLayout } from '@newwork/nw-design-system'
import { CalendarBlankIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '../../../../../../common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { MODULE_COLORS } from '@/common/constants/ui'
import { AbsenceDetailsFilter } from '../types'
import { BACKOFFICE_VIEW_OPTIONS } from '../constants/viewOptions'
import { DashboardTab, AbsenceListTab, CalendarTab, ReportsTab, StatisticsTab } from './tabs'
import { AbsenceDetails, EntitlementsDetails } from './pages'

interface BackofficeViewRendererProps extends BusinessAppContextProps {
  currentView: 'tabs' | 'absence-details' | 'entitlements-details'
  activeTab: string
  absenceDetailsFilter: AbsenceDetailsFilter
  timeFilter: 'current-year' | 'quarter' | 'month' | 'everything'
  dashboardData: any
  onTabChange: (value: string) => void
  onNavigateBack: () => void
  onTimeFilterChange: (filter: 'current-year' | 'quarter' | 'month' | 'everything') => void
  onNavigateToAbsenceDetails: (month: string, year?: number) => void
  onNavigateToAbsenceDetailsWithFilters: (filters: AbsenceDetailsFilter) => void
  onNavigateToEntitlementsDetails: () => void
}

const moduleColor = MODULE_COLORS.HR

export const BackofficeViewRenderer: React.FC<BackofficeViewRendererProps> = ({
  accessToken,
  userInfo,
  currentView,
  activeTab,
  absenceDetailsFilter,
  timeFilter,
  dashboardData,
  onTabChange,
  onNavigateBack,
  onTimeFilterChange,
  onNavigateToAbsenceDetails,
  onNavigateToAbsenceDetailsWithFilters,
  onNavigateToEntitlementsDetails
}) => {
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardTab
            accessToken={accessToken}
            userInfo={userInfo}
            dashboardData={dashboardData}
            onMonthClick={onNavigateToAbsenceDetails}
            timeFilter={timeFilter}
            onTimeFilterChange={onTimeFilterChange}
            onNavigateToDetails={onNavigateToAbsenceDetailsWithFilters}
            onNavigateToEntitlements={onNavigateToEntitlementsDetails}
          />
        )
      case 'absence-list':
        return <AbsenceListTab accessToken={accessToken} userInfo={userInfo} dashboardData={dashboardData} />
      case 'calendar':
        return <CalendarTab accessToken={accessToken} userInfo={userInfo} dashboardData={dashboardData} />
      case 'reports':
        return <ReportsTab accessToken={accessToken} userInfo={userInfo} dashboardData={dashboardData} />
      case 'statistics':
        return <StatisticsTab accessToken={accessToken} userInfo={userInfo} dashboardData={dashboardData} />
      default:
        return null
    }
  }

  // Render absence details page
  if (currentView === 'absence-details') {
    // Convert special "NO_DEPARTMENT_SPECIAL" identifier back to display name
    const displayDepartment =
      absenceDetailsFilter.department === 'NO_DEPARTMENT_SPECIAL'
        ? getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.no_department', 'No Department')
        : absenceDetailsFilter.department

    return (
      <div data-testid="backoffice-absences-container">
        <AbsenceDetails
          accessToken={accessToken}
          userInfo={userInfo}
          month={absenceDetailsFilter.month}
          startDate={absenceDetailsFilter.startDate}
          endDate={absenceDetailsFilter.endDate}
          status={absenceDetailsFilter.status}
          department={displayDepartment}
          departmentId={absenceDetailsFilter.departmentId}
          dashboardData={dashboardData}
          onNavigateBack={onNavigateBack}
        />
      </div>
    )
  }

  // Render entitlements details page
  if (currentView === 'entitlements-details') {
    return (
      <div data-testid="backoffice-absences-container">
        <EntitlementsDetails
          accessToken={accessToken}
          userInfo={userInfo}
          timeFilter={timeFilter}
          onNavigateBack={onNavigateBack}
        />
      </div>
    )
  }

  // Default tabs view
  return (
    <div data-testid="backoffice-absences-container">
      <PageLayout
        headerIcon={CalendarBlankIcon}
        headerTitle={getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_backoffice.absence_management_hub_backoffice_title',
          'Absence Management Hub (Backoffice)'
        )}
        headerDescription={getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_backoffice.absence_management_hub_backoffice_description',
          'Manage and monitor all absence requests across the organization'
        )}
        headerSubViews={{
          value: activeTab,
          onValueChange: onTabChange,
          items: BACKOFFICE_VIEW_OPTIONS.map(option => ({
            value: option.key,
            label: option.label,
            icon: option.icon
          }))
        }}
        variant={moduleColor}
        className="gba:min-h-screen"
      >
        {renderTabContent()}
      </PageLayout>
    </div>
  )
}

export default BackofficeViewRenderer
