import React, { useMemo } from 'react'
import { PageLayout, useTranslation } from '@newwork/nw-design-system'
import { UsersThreeIcon, BriefcaseIcon } from '@phosphor-icons/react'

import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { MODULE_COLORS } from '@/common/constants/ui'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { EmployeeList } from '../human-resources/components/views/employee-view/EmployeeList'
import { JobPositionList } from '../human-resources/components/views/job-position-view/JobPositionList'
import hrTranslations from '../human-resources/_i18n'
import { useUrlViewState } from '@/business-apps/hr/core/hooks/useUrlViewState'

const moduleColor = MODULE_COLORS.HR

export const WorkforceManagement: React.FC<BusinessAppContextProps> = context => {
  const { t } = useTranslation(hrTranslations)

  const viewOptions = useMemo(
    () => [
      {
        key: 'employees',
        icon: <UsersThreeIcon />,
        label: getTranslationFromI18nKeyAndLabel(
          'lowcoder:human_resources_page.employees_section.tab_label',
          'Employees'
        ),
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:human_resources_page.employees_section.title',
          'Employee Management'
        ),
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:human_resources_page.employees_section.description',
          'View and manage all employees in your organization, including their profiles, roles, and organizational assignments.'
        )
      },
      {
        key: 'positions',
        icon: <BriefcaseIcon />,
        label: getTranslationFromI18nKeyAndLabel(
          'lowcoder:human_resources_page.job_positions_section.tab_label',
          'Job Positions'
        ),
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:human_resources_page.job_positions_section.title',
          'Job Position Management'
        ),
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:human_resources_page.job_positions_section.description',
          'Manage job positions, departments, profiles, and track employee assignments across your organizational structure.'
        )
      }
    ],
    []
  )

  const { activeView: activeTab, onViewChange: handleTabChange } = useUrlViewState({ viewOptions })

  const activeTabInfo = viewOptions.find(option => option.key === activeTab) || viewOptions[0]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'employees':
        return (
          <div data-testid="employees-tab-content">
            <EmployeeList {...context} />
          </div>
        )
      case 'positions':
        return (
          <div data-testid="positions-tab-content">
            <JobPositionList {...context} />
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div data-testid="workforce-management-app">
      <PageLayout
        headerIcon={UsersThreeIcon}
        headerTitle={t('hr-workforce-management-page-title')}
        headerDescription={t('hr-workforce-management-page-description')}
        sectionTitle={activeTabInfo.title}
        sectionDescription={activeTabInfo.description}
        headerSubViews={{
          value: activeTab,
          onValueChange: handleTabChange,
          items: viewOptions.map(option => ({
            value: option.key,
            label: option.label,
            icon: option.icon
          }))
        }}
        variant={moduleColor}
        className="gba:min-h-screen"
      >
        <div className="gba:h-full gba:overflow-auto">{renderTabContent()}</div>
      </PageLayout>
    </div>
  )
}

export default WorkforceManagement
