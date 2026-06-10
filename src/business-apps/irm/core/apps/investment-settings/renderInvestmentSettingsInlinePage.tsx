import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import LeadDataPage from './pages/lead-data/LeadDataPage'
import ActivityDataPage from './pages/activity-data/ActivityDataPage'
import OpportunityDataPage from './pages/opportunity-data/OpportunityDataPage'
import AccountDataPage from './pages/account-data/AccountDataPage'
import InvestmentDataPage from './pages/investment-data/InvestmentDataPage'
import InvestmentGroupsTypesPage from './pages/investment-groups-types/InvestmentGroupsTypesPage'
import InvestmentLiquidFundTypesPage from './pages/investment-liquid-fund-types/InvestmentLiquidFundTypesPage'
import InvestmentSpecificDataPage from './pages/investment-specific-data/InvestmentSpecificDataPage'
import InvestmentCompanyExecutiveTypesPage from './pages/investment-company-executive-types'
import TaskTemplateDataPage from './pages/task-template-data/TaskTemplateDataPage'
import DocumentDataPage from './pages/document-data/DocumentDataPage'
import { FolderTemplateDataPage, ModuleType } from '@/common/components/common-relations/setting-pages/folder-templates'
import InvestmentGroupPermissionsPage from './pages/investment-permissions/InvestmentGroupPermissionsPage'
import IrmDataExportPage from './pages/data-export/DataExportPage'

type LeadDataTab = 'ratings' | 'statuses' | 'sources'

function isValidLeadTab(value: unknown): value is LeadDataTab {
  return value === 'ratings' || value === 'statuses' || value === 'sources'
}

interface RenderInvestmentSettingsInlinePageParams {
  inlinePage: { key: string; tab?: string }
  context: BusinessAppContextProps
  prefixDataTestId?: string
  onBack: () => void
}

export function renderInvestmentSettingsInlinePage({
  inlinePage,
  context,
  prefixDataTestId,
  onBack
}: RenderInvestmentSettingsInlinePageParams): React.ReactElement | null {
  const pageKey = inlinePage.key

  if (pageKey === 'investment-groups-types') {
    return (
      <InvestmentGroupsTypesPage
        {...context}
        prefixDataTestId={`${prefixDataTestId || ''}-InvestmentGroupsTypesSettings`}
        onBack={onBack}
      />
    )
  }

  if (pageKey === 'investment-liquid-fund-types') {
    return (
      <InvestmentLiquidFundTypesPage
        {...context}
        prefixDataTestId={`${prefixDataTestId || ''}-InvestmentLiquidFundTypesSettings`}
        onBack={onBack}
      />
    )
  }

  if (pageKey === 'investment-permissions') {
    return (
      <InvestmentGroupPermissionsPage
        {...context}
        prefixDataTestId={`${prefixDataTestId || ''}-InvestmentPermissionsSettings`}
        onBack={onBack}
      />
    )
  }

  if (pageKey === 'investment-data') {
    return (
      <InvestmentDataPage
        {...context}
        prefixDataTestId={`${prefixDataTestId || ''}-InvestmentDataSettings`}
        onBack={onBack}
      />
    )
  }

  if (pageKey === 'investment-specific-data') {
    const initialTab = inlinePage.tab as 'roles' | 'statuses' | 'stake-types' | undefined
    return (
      <InvestmentSpecificDataPage
        {...context}
        prefixDataTestId={`${prefixDataTestId || ''}-InvestmentSpecificSettings`}
        onBack={onBack}
        initialTab={initialTab || 'roles'}
      />
    )
  }

  if (pageKey === 'investment-company-executive-types') {
    return (
      <InvestmentCompanyExecutiveTypesPage
        {...context}
        prefixDataTestId={`${prefixDataTestId || ''}-InvestmentCompanyExecutiveTypesSettings`}
        onBack={onBack}
      />
    )
  }

  if (pageKey === 'task-template-data') {
    return (
      <TaskTemplateDataPage
        {...context}
        prefixDataTestId={`${prefixDataTestId || ''}-InvestmentTaskTemplateSettings`}
        onBack={onBack}
      />
    )
  }

  if (pageKey === 'lead') {
    const initialTab: LeadDataTab = isValidLeadTab(inlinePage.tab) ? inlinePage.tab : 'ratings'

    return (
      <LeadDataPage
        {...context}
        prefixDataTestId={`${prefixDataTestId || ''}-InvestmentLeadSettings`}
        initialTab={initialTab}
        onBack={onBack}
      />
    )
  }

  if (pageKey === 'activity') {
    return (
      <ActivityDataPage
        {...context}
        prefixDataTestId={`${prefixDataTestId || ''}-InvestmentActivitySettings`}
        onBack={onBack}
      />
    )
  }

  if (pageKey === 'opportunity-data') {
    const initialTab = inlinePage.tab as 'pipelines' | 'statuses' | 'forecasts' | 'stage-types' | undefined
    return (
      <OpportunityDataPage
        {...context}
        prefixDataTestId={`${prefixDataTestId || ''}-InvestmentOpportunitySettings`}
        onBack={onBack}
        initialTab={initialTab || 'pipelines'}
      />
    )
  }

  if (pageKey === 'account-data') {
    const initialTab = inlinePage.tab as 'priorities' | 'types' | undefined
    return (
      <AccountDataPage
        {...context}
        prefixDataTestId={`${prefixDataTestId || ''}-InvestmentAccountSettings`}
        onBack={onBack}
        initialTab={initialTab || 'priorities'}
      />
    )
  }

  if (pageKey === 'folder-templates') {
    return (
      <FolderTemplateDataPage
        accessToken={context.accessToken}
        moduleType={ModuleType.IRM}
        prefixDataTestId={`${prefixDataTestId || ''}-InvestmentFolderTemplateSettings`}
        onBack={onBack}
      />
    )
  }

  if (pageKey === 'document-data') {
    return (
      <DocumentDataPage
        {...context}
        prefixDataTestId={`${prefixDataTestId || ''}-InvestmentDocumentSettings`}
        onBack={onBack}
      />
    )
  }

  if (pageKey === 'data-export') {
    return (
      <IrmDataExportPage
        {...context}
        prefixDataTestId={`${prefixDataTestId || ''}-InvestmentDataExport`}
        onBack={onBack}
      />
    )
  }

  return null
}
