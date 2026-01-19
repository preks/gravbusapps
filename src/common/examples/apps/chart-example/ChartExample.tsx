/**
 * Chart Examples App
 *
 * Comprehensive chart examples following shadcn/ui patterns but enhanced with:
 * - NEWWORK design system integration
 * - Module color theming
 * - IconAvatar card headers
 * - Design token usage
 * - Automatic color generation
 * - Legend configurations
 */

import React, { useState, useEffect } from 'react'
import { PageLayout } from '@newwork/nw-design-system'
import { ChartBarIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

// Import tab components
import OverviewTab from './components/overview/OverviewTab'
import AreaChartsTab from './components/area-charts/AreaChartsTab'
import BarChartsTab from './components/bar-charts/BarChartsTab'
import LineChartsTab from './components/line-charts/LineChartsTab'
import PieChartsTab from './components/pie-charts/PieChartsTab'
import RadarChartsTab from './components/radar-charts/RadarChartsTab'
import RadialChartsTab from './components/radial-charts/RadialChartsTab'
import TooltipsTab from './components/tooltips/TooltipsTab'
import LayoutTab from './components/layout/LayoutTab'

interface ChartExampleProps extends BusinessAppContextProps {
  moduleColor?: string
}

// Valid subView values for chart examples
const CHART_SUBVIEW_VALUES = ['overview', 'area', 'bar', 'line', 'pie', 'radar', 'radial', 'tooltips', 'layout']

// Get initial subView from URL
const getInitialChartSubView = () => {
  const urlParams = new URLSearchParams(window.location.search)
  const subViewFromUrl = urlParams.get('subView')

  if (subViewFromUrl && CHART_SUBVIEW_VALUES.includes(subViewFromUrl)) {
    return subViewFromUrl
  }

  return 'overview' // Default
}

const ChartExample: React.FC<ChartExampleProps> = props => {
  const { moduleColor = 'ext3' } = props
  const [activeSubView, setActiveSubView] = useState<string>(getInitialChartSubView())

  const pageTitle = getTranslationFromI18nKeyAndLabel('chart-example.title', 'Chart Examples')

  // Update URL with subView parameter
  const updateUrl = (subView: string) => {
    const urlParams = new URLSearchParams(window.location.search)
    urlParams.set('subView', subView)

    const newUrl = `${window.location.pathname}?${urlParams.toString()}`
    window.history.replaceState({}, '', newUrl)
  }

  // Handle subView changes
  const handleSubViewChange = (subView: string) => {
    setActiveSubView(subView)
    updateUrl(subView)
  }

  // Handle browser navigation
  useEffect(() => {
    const handlePopState = () => {
      const newSubView = getInitialChartSubView()
      setActiveSubView(newSubView)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Set initial URL on load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (!urlParams.has('subView')) {
      updateUrl(activeSubView)
    }
  }, [])

  const tabs = [
    { id: 'overview', label: 'Overview', component: OverviewTab },
    { id: 'area', label: 'Area Charts', component: AreaChartsTab },
    { id: 'bar', label: 'Bar Charts', component: BarChartsTab },
    { id: 'line', label: 'Line Charts', component: LineChartsTab },
    { id: 'pie', label: 'Pie Charts', component: PieChartsTab },
    { id: 'radar', label: 'Radar Charts', component: RadarChartsTab },
    { id: 'radial', label: 'Radial Charts', component: RadialChartsTab },
    { id: 'tooltips', label: 'Tooltips', component: TooltipsTab },
    { id: 'layout', label: 'Layout', component: LayoutTab }
  ]

  return (
    <div data-testid="chart-example-container">
      <PageLayout
        headerPhosphorIcon={{
          icon: ChartBarIcon,
          variant: moduleColor as any,
          size: 'lg',
          label: pageTitle
        }}
        headerTitle={pageTitle}
        headerSubViews={{
          value: activeSubView,
          onValueChange: handleSubViewChange,
          items: tabs.map(tab => ({
            value: tab.id,
            label: tab.label
          }))
        }}
      >
        <div className="gba:container gba:mx-auto gba:py-6">
          {tabs.map(tab => {
            if (tab.id === activeSubView) {
              const TabComponent = tab.component
              return (
                <div key={tab.id} data-testid={`${tab.id}-tab-content`}>
                  <TabComponent moduleColor={moduleColor} />
                </div>
              )
            }
            return null
          })}
        </div>
      </PageLayout>
    </div>
  )
}

export default ChartExample
