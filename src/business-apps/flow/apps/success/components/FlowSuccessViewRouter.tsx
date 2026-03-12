import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ActivityStreamTab } from './tabs/ActivityStreamTab'
import { TrendsTab } from './tabs/TrendsTab'
import { TaskPerformanceTab } from './tabs/TaskPerformanceTab'
import { DecisionTab } from './tabs/DecisionTab'
import { AuditTab } from './tabs/AuditTab'
import { SLATab } from './tabs/SLATab'
import { OperationsOverviewTab } from './tabs/OperationsOverviewTab'
import { SystemReliabilityTab } from './tabs/SystemReliabilityTab'
import { PerformanceWorkspace } from './tabs/PerformanceWorkspace'
import {
  clearFlowSuccessDrilldown,
  type FlowSuccessDecisionFilter,
  type FlowSuccessAuditScope,
  type FlowSuccessDrilldownTarget,
  type FlowSuccessShellState
} from '../shellState'

interface FlowSuccessViewRouterProps extends BusinessAppContextProps {
  shellState: FlowSuccessShellState
  prefixDataTestId: string
  selectedFlowLabel: string
  hasAnalyticsData: boolean
  headerActions?: React.ReactNode
  onShellStateChange: React.Dispatch<React.SetStateAction<FlowSuccessShellState>>
  onDrilldown: (target: FlowSuccessDrilldownTarget) => void
}

export const FlowSuccessViewRouter: React.FC<FlowSuccessViewRouterProps> = ({
  shellState,
  prefixDataTestId,
  accessToken,
  selectedFlowLabel,
  hasAnalyticsData,
  headerActions,
  onShellStateChange,
  onDrilldown,
  ...context
}) => {
  const updateTimeframe = (timeframe: FlowSuccessShellState['timeframe']) =>
    onShellStateChange(prev => ({ ...clearFlowSuccessDrilldown(prev), timeframe }))

  switch (shellState.primaryView) {
    case 'operations':
      if (shellState.operationsView === 'overview') {
        return (
          <OperationsOverviewTab
            accessToken={accessToken}
            prefixDataTestId={`${prefixDataTestId}-operations-overview`}
            timeframe={shellState.timeframe}
            templateId={shellState.templateId}
            onTimeframeChange={updateTimeframe}
            showControls={false}
            headerActions={headerActions}
            section={shellState.section}
            onDrilldown={onDrilldown}
            {...context}
          />
        )
      }

      if (shellState.operationsView === 'activity') {
        return (
          <ActivityStreamTab
            accessToken={accessToken}
            prefixDataTestId={`${prefixDataTestId}-operations-activity`}
            timeframe={shellState.timeframe}
            templateId={shellState.templateId}
            onTimeframeChange={updateTimeframe}
            showControls={false}
            headerActions={headerActions}
            section={shellState.section}
            onDrilldown={onDrilldown}
            {...context}
          />
        )
      }

      if (shellState.operationsView === 'dashboard') {
        return (
          <PerformanceWorkspace
            accessToken={accessToken}
            prefixDataTestId={`${prefixDataTestId}-operations-dashboard`}
            timeframe={shellState.timeframe}
            templateId={shellState.templateId}
            selectedFlowName={selectedFlowLabel}
            hasAnalyticsData={hasAnalyticsData}
            subView="dashboard"
            headerActions={headerActions}
            section={shellState.section}
            onDrilldown={onDrilldown}
            {...context}
          />
        )
      }

      return (
        <SystemReliabilityTab
          accessToken={accessToken}
          prefixDataTestId={`${prefixDataTestId}-operations-reliability`}
          timeframe={shellState.timeframe}
          onTimeframeChange={updateTimeframe}
          templateId={shellState.templateId}
          showControls={false}
          headerActions={headerActions}
          section={shellState.section}
          onDrilldown={onDrilldown}
          {...context}
        />
      )
    case 'performance':
      if (shellState.performanceView === 'trends') {
        return (
          <TrendsTab
            accessToken={accessToken}
            prefixDataTestId={`${prefixDataTestId}-performance-trends`}
            timeframe={shellState.timeframe}
            onTimeframeChange={updateTimeframe}
            templateId={shellState.templateId}
            showControls={false}
            headerActions={headerActions}
            section={shellState.section}
            {...context}
          />
        )
      }

      if (shellState.performanceView === 'tasks') {
        return (
          <TaskPerformanceTab
            accessToken={accessToken}
            prefixDataTestId={`${prefixDataTestId}-performance-tasks`}
            timeframe={shellState.timeframe}
            onTimeframeChange={updateTimeframe}
            templateId={shellState.templateId}
            showControls={false}
            headerActions={headerActions}
            section={shellState.section}
            onDrilldown={onDrilldown}
            {...context}
          />
        )
      }

      return (
        <PerformanceWorkspace
          accessToken={accessToken}
          prefixDataTestId={`${prefixDataTestId}-performance`}
          timeframe={shellState.timeframe}
          templateId={shellState.templateId}
          selectedFlowName={selectedFlowLabel}
          hasAnalyticsData={hasAnalyticsData}
          subView={shellState.performanceView}
          headerActions={headerActions}
          section={shellState.section}
          onDrilldown={onDrilldown}
          {...context}
        />
      )
    case 'governance':
      if (shellState.governanceView === 'sla') {
        return (
          <SLATab
            accessToken={accessToken}
            prefixDataTestId={`${prefixDataTestId}-governance-sla`}
            timeframe={shellState.timeframe}
            onTimeframeChange={updateTimeframe}
            templateId={shellState.templateId}
            showControls={false}
            headerActions={headerActions}
            section={shellState.section}
            {...context}
          />
        )
      }

      if (shellState.governanceView === 'decisions') {
        return (
          <DecisionTab
            accessToken={accessToken}
            prefixDataTestId={`${prefixDataTestId}-governance-decisions`}
            timeframe={shellState.timeframe}
            onTimeframeChange={updateTimeframe}
            showControls={false}
            templateId={shellState.templateId}
            selectedFlowLabel={selectedFlowLabel}
            headerActions={headerActions}
            section={shellState.section}
            decisionFilter={shellState.decisionFilter as FlowSuccessDecisionFilter | undefined}
            {...context}
          />
        )
      }

      return (
        <AuditTab
          accessToken={accessToken}
          prefixDataTestId={`${prefixDataTestId}-governance-audit`}
          timeframe={shellState.timeframe}
          templateId={shellState.templateId}
          headerActions={headerActions}
          section={shellState.section}
          auditScope={shellState.auditScope as FlowSuccessAuditScope | undefined}
          onDrilldown={onDrilldown}
          {...context}
        />
      )
    default:
      return null
  }
}
