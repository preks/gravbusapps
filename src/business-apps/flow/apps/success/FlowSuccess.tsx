import React, { useEffect, useState } from 'react'
import { Combobox, useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import translations from './_i18n'
import { FlowSuccessViewRouter } from './components/FlowSuccessViewRouter'
import { FlowSuccessHeader } from './components/FlowSuccessHeader'
import { useFlowSuccessContext } from './hooks/useFlowSuccessContext'
import {
  applyFlowSuccessDrilldown,
  clearFlowSuccessDrilldown,
  DEFAULT_FLOW_SUCCESS_SHELL_STATE,
  getFlowSuccessActiveSubview,
  parseFlowSuccessShellState,
  type FlowSuccessDrilldownTarget,
  type FlowSuccessGovernanceView,
  type FlowSuccessOperationsView,
  type FlowSuccessPerformanceView,
  type FlowSuccessPrimaryView,
  updateFlowSuccessShellUrl
} from './shellState'
import { getFlowSuccessPrimaryViewOptions, getFlowSuccessSecondaryViewOptions } from './utils/flowSuccessNavigation'
import { getSuccessTimeframeOptions } from './utils/timeframe'

interface FlowSuccessProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

const FlowSuccessContent: React.FC<FlowSuccessProps> = ({
  prefixDataTestId = 'flow-success',
  accessToken,
  ...context
}) => {
  const { t } = useTranslation(translations)
  const [shellState, setShellState] = useState(() =>
    typeof window === 'undefined' ? DEFAULT_FLOW_SUCCESS_SHELL_STATE : parseFlowSuccessShellState()
  )
  const flowContext = useFlowSuccessContext({
    accessToken,
    timeframe: shellState.timeframe,
    templateId: shellState.templateId,
    allFlowsLabel: t('filter-all-templates'),
    dynamicFlowLabel: t('filter-dynamic-flows')
  })

  useEffect(() => {
    const applyLocation = () => setShellState(parseFlowSuccessShellState())
    window.addEventListener('hashchange', applyLocation)
    window.addEventListener('popstate', applyLocation)
    return () => {
      window.removeEventListener('hashchange', applyLocation)
      window.removeEventListener('popstate', applyLocation)
    }
  }, [])

  useEffect(() => {
    updateFlowSuccessShellUrl(shellState)
  }, [shellState])

  useEffect(() => {
    if (shellState.primaryView !== 'performance' || shellState.performanceView !== 'dashboard') return

    setShellState(prev => {
      if (prev.primaryView !== 'performance' || prev.performanceView !== 'dashboard') return prev
      return { ...prev, performanceView: 'trends' }
    })
  }, [shellState])

  const primaryViewOptions = getFlowSuccessPrimaryViewOptions(t)
  const secondaryViewOptions = getFlowSuccessSecondaryViewOptions(t)
  const activeSubview = getFlowSuccessActiveSubview(shellState)
  const timeframeOptions = getSuccessTimeframeOptions(t, { includeLast24h: true })
  const showHeaderFlowSelector = true
  const isAuditSubview = shellState.primaryView === 'governance' && shellState.governanceView === 'audit'

  const headerFlowSelect = showHeaderFlowSelector ? (
    <Combobox
      className={isAuditSubview ? 'gba:w-full gba:sm:w-56 gba:lg:w-64' : 'gba:w-full gba:sm:w-72'}
      options={flowContext.comboboxOptions as any}
      value={shellState.templateId}
      onValueChange={value =>
        setShellState(prev => ({
          ...clearFlowSuccessDrilldown(prev),
          templateId: String(value || 'ALL')
        }))
      }
      placeholder={t('placeholder-select-template')}
      searchPlaceholder={t('placeholder-search-templates')}
      emptyText={flowContext.isLoading ? t('state-loading') : t('state-empty')}
      loading={flowContext.isLoading}
      align="end"
      data-testid={`${prefixDataTestId}-template-select`}
    />
  ) : undefined

  const setPrimaryView = (primaryView: FlowSuccessPrimaryView) => {
    setShellState(prev => ({
      ...clearFlowSuccessDrilldown(prev),
      primaryView,
      performanceView:
        primaryView === 'performance' && prev.performanceView === 'dashboard' ? 'trends' : prev.performanceView
    }))
  }

  const setPerformanceView = (performanceView: FlowSuccessPerformanceView) => {
    setShellState(prev => ({ ...clearFlowSuccessDrilldown(prev), performanceView, primaryView: 'performance' }))
  }

  const setOperationsView = (operationsView: FlowSuccessOperationsView) => {
    setShellState(prev => ({ ...clearFlowSuccessDrilldown(prev), operationsView, primaryView: 'operations' }))
  }

  const setGovernanceView = (governanceView: FlowSuccessGovernanceView) => {
    setShellState(prev => ({ ...clearFlowSuccessDrilldown(prev), governanceView, primaryView: 'governance' }))
  }

  const handleDrilldown = (target: FlowSuccessDrilldownTarget) => {
    setShellState(prev => applyFlowSuccessDrilldown(prev, target))
  }

  return (
    <div className="gba:min-h-screen gba:bg-background" data-testid={prefixDataTestId}>
      <FlowSuccessHeader
        timeframe={shellState.timeframe}
        timeframeOptions={timeframeOptions}
        onTimeframeChange={value => setShellState(prev => ({ ...clearFlowSuccessDrilldown(prev), timeframe: value }))}
        secondaryOptions={[]}
        scopeBadgeLabel={shellState.templateId !== 'ALL' ? flowContext.selectedFlowLabel : undefined}
        emptyStateReason={flowContext.emptyStateReason}
        showHero
        showControls={false}
        showSecondaryNavigation={false}
        heroClassName="gba:rounded-none"
        data-testid={`${prefixDataTestId}-hero-header`}
      />

      <div className="gba:border-b gba:border-border gba:bg-background">
        <div
          className="gba:mx-auto gba:w-full gba:max-w-7xl gba:px-4 gba:lg:px-6"
          data-testid={`${prefixDataTestId}-primary-nav`}
        >
          <div className="gba:flex gba:gap-8 gba:overflow-x-auto" role="tablist" aria-label={t('app-title')}>
            {primaryViewOptions.map(option => {
              const isActive = shellState.primaryView === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setPrimaryView(option.value)}
                  className={[
                    'gba:flex gba:shrink-0 gba:items-center gba:gap-2 gba:border-b-2 gba:bg-transparent gba:px-0 gba:pb-4 gba:pt-3 gba:text-sm gba:font-medium gba:transition-colors',
                    isActive
                      ? 'gba:border-foreground gba:text-foreground'
                      : 'gba:border-transparent gba:text-muted-foreground hover:gba:text-foreground'
                  ].join(' ')}
                  data-testid={`${prefixDataTestId}-primary-nav-${option.value}`}
                >
                  {option.icon}
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div
        className="gba:mx-auto gba:flex gba:w-full gba:max-w-7xl gba:flex-col gba:gap-8 gba:px-4 gba:pb-8 gba:pt-6 gba:lg:px-6"
        data-testid={`${prefixDataTestId}-content-shell`}
      >
        {secondaryViewOptions[shellState.primaryView].length ? (
          <FlowSuccessHeader
            timeframe={shellState.timeframe}
            timeframeOptions={timeframeOptions}
            onTimeframeChange={value =>
              setShellState(prev => ({ ...clearFlowSuccessDrilldown(prev), timeframe: value }))
            }
            secondaryOptions={secondaryViewOptions[shellState.primaryView].map(item => ({
              value: item.value,
              label: item.label,
              isActive: activeSubview === item.value,
              onClick:
                shellState.primaryView === 'performance'
                  ? () => setPerformanceView(item.value as FlowSuccessPerformanceView)
                  : shellState.primaryView === 'operations'
                    ? () => setOperationsView(item.value as FlowSuccessOperationsView)
                    : () => setGovernanceView(item.value as FlowSuccessGovernanceView)
            }))}
            emptyStateReason={flowContext.emptyStateReason}
            showHero={false}
            showControls
            showSecondaryNavigation
            showTimeframeControl={!isAuditSubview}
            data-testid={`${prefixDataTestId}-header`}
          />
        ) : null}

        <FlowSuccessViewRouter
          accessToken={accessToken}
          shellState={shellState}
          prefixDataTestId={prefixDataTestId}
          selectedFlowLabel={flowContext.selectedFlowLabel}
          hasAnalyticsData={flowContext.hasAnalyticsData}
          headerActions={headerFlowSelect}
          onShellStateChange={setShellState}
          onDrilldown={handleDrilldown}
          {...context}
        />
      </div>
    </div>
  )
}

export const FlowSuccess: React.FC<FlowSuccessProps> = props => {
  // Pre-register the bundle before the shell renders so labels do not flash raw keys.
  useTranslation(translations)
  return <FlowSuccessContent {...props} />
}

export default FlowSuccess
