import React, { useMemo } from 'react'
import { PageLayout, useTranslation } from '@newwork/nw-design-system'
import { FilesIcon, ChartPieIcon, LightbulbIcon } from '@phosphor-icons/react'

import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { HrAnalyticsView } from './components/views/analytics-view/HrAnalyticsView'
import { InsightsView } from './components/views/insights-view/InsightsView'
import { MODULE_COLORS } from '@/common/constants/ui'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import hrTranslations from './_i18n'
import { useUrlViewState } from '@/business-apps/hr/core/hooks/useUrlViewState'

const moduleColor = MODULE_COLORS.HR

export const HumanResources: React.FC<BusinessAppContextProps> = context => {
  const { t } = useTranslation(hrTranslations)

  const viewOptions = useMemo(
    () => [
      {
        key: 'analytics',
        icon: <ChartPieIcon />,
        label: getTranslationFromI18nKeyAndLabel(
          'lowcoder:human_resources_page.analytics_section.tab_label',
          'Analytics'
        ),
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:human_resources_page.analytics_section.title',
          'HR Analytics & Insights'
        ),
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:human_resources_page.analytics_section.description',
          'Comprehensive workforce insights, analytics, and metrics to drive HR decisions and organizational strategy.'
        )
      },
      {
        key: 'insights',
        icon: <LightbulbIcon />,
        label: 'Insights',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.title', 'HR Insights'),
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:hr_insights.description',
          'Next 30 days Key employee events and milestones including birthdays, anniversaries, new hires, probation periods, and terminations.'
        )
      }
    ],
    []
  )

  const { activeView: activeTab, onViewChange: handleTabChange } = useUrlViewState({
    viewOptions,
    defaultTabByView: { analytics: 'dashboard' }
  })

  const activeTabInfo = viewOptions.find(option => option.key === activeTab) || viewOptions[0]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'analytics':
        return (
          <div data-testid="analytics-tab-content">
            <HrAnalyticsView {...context} />
          </div>
        )
      case 'insights':
        return (
          <div data-testid="insights-tab-content">
            <InsightsView {...context} />
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div data-testid="human-resources-app">
      <PageLayout
        headerIcon={FilesIcon}
        headerTitle={t('hr-reporting-insights-page-title')}
        headerDescription={t('hr-reporting-insights-page-description')}
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

export default HumanResources
