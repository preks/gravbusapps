// Investment Tab Configuration Utilities
import React from 'react'
import {
  HouseIcon,
  ChartBarIcon,
  FolderIcon,
  FileTextIcon,
  TrendUpIcon,
  GridFourIcon,
  TrendDownIcon
} from '@phosphor-icons/react'
import { InvestmentDocuments } from '../components/InvestmentDocuments'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { InvestmentHomeTab, InvestmentReportsTab } from '../components/shared'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { InvestmentTilesTab } from '@/common/components/investment/tiles'
import { DivestmentsTab } from '../components/DivestmentsTab'
import { getRecordGroupConfiguration } from '../config/recordGroupConfigurations'

/**
 * Creates the tab configuration for RecordLayout
 * Uses configuration-driven approach via recordGroupConfigurations.tsx
 */
export const createInvestmentTabsConfig = (
  activeTab: string,
  setActiveTabAndUrl: (tab: string) => void,
  investmentId: string,
  investment: any,
  investmentType: string,
  typeSpecificData: any,
  processedTiles: any[],
  loadData: () => void,
  props: BusinessAppContextProps,
  catalogData?: any
) => {
  // Get configuration for this investment group
  const groupCode = investment?.investmentGroup?.code || ''
  const config = getRecordGroupConfiguration(groupCode)

  // Create base tabs array
  const tabs = [
    // Home Tab (baseline - always present)
    {
      value: 'home',
      label: getTranslationFromI18nKeyAndLabel('crm.investments.tabs.home', 'Home'),
      icon: <HouseIcon className="gba:h-4 gba:w-4 gba:mr-2" />,
      content: <InvestmentHomeTab investmentId={investmentId} investment={investment} {...props} />
    }
  ]

  // Conditionally add Analytics Tab based on configuration
  if (config.additionalTabs?.includes('analytics') && config.analyticsContent) {
    const AnalyticsComponent = config.analyticsContent
    tabs.push({
      value: 'analytics',
      label: getTranslationFromI18nKeyAndLabel('crm.investments.tabs.analytics', 'Analytics'),
      icon: <TrendUpIcon className="gba:h-4 gba:w-4 gba:mr-2" />,
      content: (
        <div className="gba:col-span-12">
          <AnalyticsComponent
            investmentId={investmentId}
            investment={investment}
            equityData={typeSpecificData}
            {...props}
          />
        </div>
      )
    })
  }

  // Add Tiles Tab (baseline - always present)
  tabs.push({
    value: 'tiles',
    label: getTranslationFromI18nKeyAndLabel('crm.investments.tabs.tiles', 'Tiles'),
    icon: <GridFourIcon className="gba:h-4 gba:w-4 gba:mr-2" />,
    content: (
      <div className="gba:col-span-12">
        <InvestmentTilesTab investmentId={investmentId} investment={investment} onRefresh={loadData} {...props} />
      </div>
    )
  })

  // Add Divestments Tab (baseline - always present)
  tabs.push({
    value: 'divestments',
    label: getTranslationFromI18nKeyAndLabel('crm.investments.tabs.divestments', 'Divestments'),
    icon: <TrendDownIcon className="gba:h-4 gba:w-4 gba:mr-2" />,
    content: (
      <div className="gba:col-span-12">
        <DivestmentsTab investmentId={investmentId} {...props} />
      </div>
    )
  })

  // Conditionally add Overview Tab based on configuration
  if (config.additionalTabs?.includes('overview') && config.overviewContent) {
    const OverviewComponent = config.overviewContent
    tabs.push({
      value: 'overview',
      label: getTranslationFromI18nKeyAndLabel('crm.investments.tabs.overview', 'Overview'),
      icon: <ChartBarIcon className="gba:h-4 gba:w-4 gba:mr-2" />,
      content: (
        <OverviewComponent
          investment={investment}
          typeSpecificData={typeSpecificData}
          processedTiles={processedTiles}
          onRefresh={loadData}
          {...props}
        />
      )
    })
  }

  // Add remaining tabs
  tabs.push(
    // Documents Tab
    {
      value: 'documents',
      label: getTranslationFromI18nKeyAndLabel('crm.investments.tabs.documents', 'Documents'),
      icon: <FolderIcon className="gba:h-4 gba:w-4 gba:mr-2" />,
      content: (
        <div className="gba:col-span-12">
          {investmentId ? (
            <InvestmentDocuments
              investmentId={investmentId}
              context={props}
              investmentGroupId={investment?.investmentGroup?.id}
              investmentGroupCode={investment?.investmentGroup?.code}
              data-testid="investment-documents-section"
            />
          ) : (
            <div className="gba:p-8 gba:text-center gba:text-gray-500">
              <p data-testid="investment-documents-loading">
                {getTranslationFromI18nKeyAndLabel('investment.record.loading', 'Loading investment data...')}
              </p>
            </div>
          )}
        </div>
      )
    },
    // Reports Tab
    {
      value: 'reports',
      label: getTranslationFromI18nKeyAndLabel('crm.investments.tabs.reports', 'Reports'),
      icon: <FileTextIcon className="gba:h-4 gba:w-4 gba:mr-2" />,
      content: (
        <div className="gba:col-span-12">
          {/* Investment Reports Tab */}
          <InvestmentReportsTab
            investmentId={investmentId}
            investmentGroupIds={[investment?.investmentGroup?.id].filter(Boolean)}
            specificInvestmentId={investmentId}
            catalogData={catalogData}
            investmentTypeCode={investment?.investmentType?.code || ''}
            liquidFundTypeCode={typeSpecificData?.liquidFundInvestment?.investmentLiquidFundType?.code}
            investment={investment}
            typeSpecificData={typeSpecificData}
            filterHeaderActions={
              <AppAction
                variant="create-primary"
                contexts={[
                  {
                    context: FlowContextName.investmentReportCreate,
                    contextData: { investmentId: investment?.id }
                  }
                ]}
                accessToken={props.accessToken || ''}
                data-testid="investment-record-add-report-action"
                emptyState="hide"
              >
                {getTranslationFromI18nKeyAndLabel('investment.reports.addReport', 'Add Report')}
              </AppAction>
            }
            accessToken={props.accessToken}
            userInfo={props.userInfo}
            additionalData={props.additionalData}
          />
        </div>
      )
    }
  )

  return {
    defaultValue: activeTab,
    onValueChange: (val: string) => {
      setActiveTabAndUrl(val)
    },
    items: tabs
  }
}
