// Investment Tab Configuration Utilities
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
import {
  GenerateOnePagerButton,
  InvestmentTileSection,
  InvestmentHomeTab,
  InvestmentReportsTab
} from '../components/shared'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { EquityInvestmentRounds, RealEstateLiquidityForecast, EquityAnalyticsTab } from '../components/group-specific'
import { InvestmentTilesTab } from '@/common/components/investment/tiles'
import { DivestmentsTab } from '../components/DivestmentsTab'
// Remove dependency on investmentTypeUtils - now using dynamic types

/**
 * Gets type-specific overview content with enhanced equity detection
 */
export const getTypeSpecificOverviewContent = (
  investmentType: string,
  typeSpecificData: any,
  businessAppContext?: BusinessAppContextProps,
  onRefresh?: () => void
) => {
  // Enhanced equity detection - check multiple conditions (exclude PRIVATE_EQUITY)
  const groupCode = typeSpecificData?.investment?.investmentGroup?.code || ''
  const isEquityInvestment =
    !groupCode.includes('PRIVATE_EQUITY') && // Exclude Private Equity
    (investmentType === 'equity' ||
      (investmentType || '').toLowerCase().includes('equity') ||
      groupCode.includes('EQUITY') ||
      (typeSpecificData?.investment?.investmentType?.code || '').toLowerCase().includes('equity') ||
      typeSpecificData?.equityInvestment) // Has equity data

  // Enhanced real estate detection - check multiple conditions
  const isRealEstateInvestment =
    investmentType === 'real_estate' ||
    (investmentType || '').toLowerCase().includes('real_estate') ||
    (investmentType || '').toLowerCase().includes('realestate') ||
    (typeSpecificData?.investment?.investmentGroup?.code || '').includes('REAL_ESTATE') ||
    (typeSpecificData?.investment?.investmentType?.code || '').toLowerCase().includes('real_estate') ||
    typeSpecificData?.realEstateInvestment // Has real estate data

  if (isEquityInvestment) {
    return (
      <div data-testid="equity-overview-section">
        <EquityInvestmentRounds
          equityData={typeSpecificData}
          isLoading={false}
          onRefresh={onRefresh}
          data-testid="equity-investment-rounds-overview"
          accessToken={businessAppContext?.accessToken || ''}
          userInfo={businessAppContext?.userInfo}
          additionalData={businessAppContext?.additionalData}
        />
      </div>
    )
  }

  if (isRealEstateInvestment) {
    return (
      <div data-testid="real-estate-overview-section">
        <RealEstateLiquidityForecast
          realEstateData={typeSpecificData}
          isLoading={false}
          accessToken={businessAppContext?.accessToken || ''}
          data-testid="real-estate-liquidity-forecast-overview"
        />
      </div>
    )
  }

  switch (investmentType) {
    case 'real_estate':
      return (
        <RealEstateLiquidityForecast
          realEstateData={typeSpecificData}
          isLoading={false}
          accessToken={businessAppContext?.accessToken || ''}
        />
      )
    default:
      return null
  }
}

/**
 * Creates the tab configuration for RecordLayout
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
  // Create base tabs array
  const tabs = [
    // Home Tab
    {
      value: 'home',
      label: getTranslationFromI18nKeyAndLabel('crm.investments.tabs.home', 'Home'),
      icon: <HouseIcon className="gba:h-4 gba:w-4 gba:mr-2" />,
      content: <InvestmentHomeTab investmentId={investmentId} investment={investment} {...props} />
    }
  ]

  // Add Analytics Tab only for equity investments (exclude PRIVATE_EQUITY)
  const groupCode = investment?.investmentGroup?.code || ''
  const isEquityInvestment =
    !groupCode.includes('PRIVATE_EQUITY') && // Exclude Private Equity
    (investmentType === 'equity' ||
      (investmentType || '').toLowerCase().includes('equity') ||
      groupCode.includes('EQUITY') ||
      (investment?.investmentType?.code || '').toLowerCase().includes('equity') ||
      typeSpecificData?.equityInvestment)

  if (isEquityInvestment) {
    tabs.push({
      value: 'analytics',
      label: getTranslationFromI18nKeyAndLabel('crm.investments.tabs.analytics', 'Analytics'),
      icon: <TrendUpIcon className="gba:h-4 gba:w-4 gba:mr-2" />,
      content: (
        <div className="gba:col-span-12">
          <EquityAnalyticsTab
            investmentId={investmentId}
            investment={investment}
            equityData={typeSpecificData}
            {...props}
          />
        </div>
      )
    })
  }

  // Add Tiles Tab for ALL investment types
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

  // Add Divestments Tab - shows all divestment opportunities for this investment
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

  // Add Overview Tab only for investments with specialized group-specific content
  // Only EQUITY and REAL_ESTATE have complex visualizations (tiles, shareholders, forecasts, etc.)
  // All other groups (LIQUID_FUND, PRIVATE_EQUITY, TEST, etc.) are simple and don't need an overview tab
  const investmentGroupCode = (investment?.investmentGroup?.code || '').toUpperCase()
  const hasComplexContent =
    (investmentGroupCode.includes('EQUITY') && !investmentGroupCode.includes('PRIVATE_EQUITY')) ||
    investmentGroupCode.includes('REAL_ESTATE')

  if (hasComplexContent) {
    tabs.push({
      value: 'overview',
      label: getTranslationFromI18nKeyAndLabel('crm.investments.tabs.overview', 'Overview'),
      icon: <ChartBarIcon className="gba:h-4 gba:w-4 gba:mr-2" />,
      content: (
        <div className="gba:col-span-12 gba:space-y-6">
          {/* Generate One-Pager Action */}
          <div
            className="gba:flex gba:justify-end"
            style={{ marginBottom: 'var(--nw-spacing-lg)' }}
            data-testid="investment-generate-onepager-section"
          >
            <GenerateOnePagerButton
              investmentId={investment?.id}
              accessToken={props.accessToken}
              userInfo={props.userInfo}
              investmentData={investment}
            />
          </div>

          {/* Investment Tile Section - only show if tile fields are configured */}
          {processedTiles.length > 0 && (
            <InvestmentTileSection
              investment={investment}
              isLoading={false}
              accessToken={props.accessToken}
              userInfo={props.userInfo}
              additionalData={props.additionalData}
              data-testid={`${investmentType}-record-tiles`}
            />
          )}

          {/* Type-specific content */}
          {getTypeSpecificOverviewContent(investmentType, typeSpecificData, props, loadData)}

          {/* Note: Account and Contact sections removed - now available in Home tab */}
        </div>
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
