import React, { useState, useEffect } from 'react'
import { PageLayout } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { CalculatorIcon, CarIcon, GlobeIcon } from '@phosphor-icons/react'
// Tab components
import CalculationRulesView from './components/calculation-rules/CalculationRulesView'
import CalculationRuleRecord from './components/calculation-rule-record/CalculationRuleRecord'
import MileageRulesView from './components/mileage-rules/MileageRulesView'
import TravelRegionRulesView from './components/travel-region-rules/TravelRegionRulesView'

export interface ExpenseSettingsProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  className?: string
}

const ExpenseSettings: React.FC<ExpenseSettingsProps> = context => {
  const { prefixDataTestId = '', className = '' } = context

  // Define main view options for headerSubViews
  const viewOptions = [
    {
      key: 'calculation-rules',
      icon: <CalculatorIcon />,
      label: getTranslationFromI18nKeyAndLabel('expense-settings:calculation_rules', 'Calculation Rules')
    },
    {
      key: 'mileage-rules',
      icon: <CarIcon />,
      label: getTranslationFromI18nKeyAndLabel('expense-settings:mileage_rules', 'Mileage Rules')
    },
    {
      key: 'travel-region-rules',
      icon: <GlobeIcon />,
      label: getTranslationFromI18nKeyAndLabel('expense-settings:travel_region_rules', 'Travel Region Rules')
    }
  ]

  // Get initial view from URL or default to first view
  const getInitialView = () => {
    const urlParams = new URLSearchParams(window.location.search)
    const viewFromUrl = urlParams.get('view')

    // Validate that the view exists in our options
    if (viewFromUrl && viewOptions.some(option => option.key === viewFromUrl)) {
      return viewFromUrl
    }

    // Default to first view
    return viewOptions[0].key
  }

  const [activeView, setActiveView] = useState<string>(getInitialView())

  // Get calculation rule record parameters from URL
  const getCalculationRuleRecordParams = () => {
    const urlParams = new URLSearchParams(window.location.search)
    return {
      ruleId: urlParams.get('ruleId'),
      page: urlParams.get('page')
    }
  }

  const [ruleRecordParams, setRuleRecordParams] = useState(getCalculationRuleRecordParams())

  // Update URL when view changes
  const updateUrl = (view: string, clearRuleRecord = false) => {
    const urlParams = new URLSearchParams(window.location.search)
    urlParams.set('view', view)

    // Clear rule record and tab parameters if requested
    if (clearRuleRecord) {
      urlParams.delete('ruleId')
      urlParams.delete('page')
      urlParams.delete('tab')
      urlParams.delete('subTab')
    }

    const newUrl = `${window.location.pathname}?${urlParams.toString()}`
    window.history.replaceState({}, '', newUrl)
  }

  const handleViewChange = (view: string) => {
    setActiveView(view)
    setRuleRecordParams({ ruleId: null, page: null })
    updateUrl(view, true)
  }

  // Handle navigation back from calculation rule record
  const handleNavigateBackFromRuleRecord = () => {
    setRuleRecordParams({ ruleId: null, page: null })
    updateUrl(activeView, true)
  }

  // Ensure URL always has view parameter on initial load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (!urlParams.has('view')) {
      updateUrl(activeView)
    }
  }, [activeView])

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const newView = getInitialView()
      const newRuleRecordParams = getCalculationRuleRecordParams()
      setActiveView(newView)
      setRuleRecordParams(newRuleRecordParams)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Render content based on active view and rule record parameters
  const renderViewContent = () => {
    // Render the normal view content
    switch (activeView) {
      case 'calculation-rules':
        return <CalculationRulesView {...context} prefixDataTestId={prefixDataTestId} />
      case 'mileage-rules':
        return <MileageRulesView {...context} prefixDataTestId={prefixDataTestId} />
      case 'travel-region-rules':
        return <TravelRegionRulesView {...context} prefixDataTestId={prefixDataTestId} />
      default:
        console.warn('⚠️ Unknown view:', activeView)
        return null
    }
  }

  // If we have a ruleId, show the calculation rule record in full screen mode
  if (ruleRecordParams.ruleId) {
    return (
      <div data-testid={`${prefixDataTestId}-expense-settings`} className={`gba:h-screen gba:w-full ${className}`}>
        <CalculationRuleRecord
          {...context}
          ruleId={ruleRecordParams.ruleId}
          page={ruleRecordParams.page || undefined}
          onNavigateBack={handleNavigateBackFromRuleRecord}
        />
      </div>
    )
  }

  // Otherwise, render the normal PageLayout with views
  return (
    <div data-testid={`${prefixDataTestId}-expense-settings`} className={className}>
      <PageLayout
        headerTitle={getTranslationFromI18nKeyAndLabel('expense-settings:page_title', 'Expense Settings')}
        headerDescription={getTranslationFromI18nKeyAndLabel(
          'expense-settings:page_description',
          'Configure expense rules, assignments, and calculation settings'
        )}
        headerSubViews={{
          value: activeView,
          onValueChange: handleViewChange,
          items: viewOptions.map(option => ({
            value: option.key,
            label: option.label,
            icon: option.icon
          }))
        }}
        className="gba:min-h-screen"
      >
        <div className="gba:h-full gba:overflow-auto">{renderViewContent()}</div>
      </PageLayout>
    </div>
  )
}

export default ExpenseSettings
