import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { RecordLayout, Spinner } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetInvestmentById } from '@/common/data/investment/hooks/useInvestments'
import { useGetInvestmentCatalogData } from '@/common/data/investment/hooks/useInvestmentCatalogs'
import { AiActions, AiAction } from '@/common/components/common-relations/record-sections/header-section/ai-actions'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { Bot } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { useInvestmentTileFields } from './hooks/useInvestmentTileFields'
import { useInvestmentAiSummary } from './hooks/useInvestmentAiSummary'
import { TrendingUp, Home, BarChart3 } from 'lucide-react'
import { createHeaderMeta, getTypeSpecificDetailGroups } from './utils/investmentHeaderConfig'
import { createInvestmentTabsConfig } from './utils/investmentTabConfig'

type InvestmentRecordProps = BusinessAppContextProps

const InvestmentRecord: React.FC<InvestmentRecordProps> = props => {
  const [investmentId, setInvestmentId] = useState<string | null>(null)
  const ALLOWED_TABS = ['home', 'analytics', 'tiles', 'overview', 'divestments', 'documents', 'reports'] as const
  type TabKey = (typeof ALLOWED_TABS)[number]

  const getInitialTab = (): TabKey => {
    if (typeof window === 'undefined') return 'home'
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab') || 'home'
    return (ALLOWED_TABS as readonly string[]).includes(tab) ? (tab as TabKey) : 'home'
  }
  const [activeTab, setActiveTab] = useState<TabKey>(getInitialTab)
  const [investmentData, setInvestmentData] = useState<any>(null)
  const [catalogData, setCatalogData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dynamic investment type detection using catalog data
  const determineInvestmentType = useCallback((investmentData: any): string => {
    if (!investmentData) return 'generic'

    // Use the actual investment type code for dynamic behavior
    if (investmentData.investmentType?.code) {
      return investmentData.investmentType.code
    }

    // Fallback to group-based detection
    const group = investmentData.investmentGroup?.code || ''
    if (group.includes('EQUITY')) return 'equity'
    if (group.includes('LIQUID_FUND')) return 'liquid_fund'
    if (group.includes('REAL_ESTATE')) return 'real_estate'
    if (group.includes('PRIVATE_EQUITY')) return 'private_equity'

    return 'generic'
  }, [])

  // Extract type-specific data arrays
  const extractTypeSpecificData = useCallback((investmentData: any, documents: any[]): any => {
    if (!investmentData) return null

    const base = { investment: investmentData, documents }

    // Extract all type-specific data - handle both array and object formats
    return {
      ...base,
      equityInvestment: Array.isArray(investmentData.equityInvestment)
        ? investmentData.equityInvestment[0]
        : investmentData.equityInvestment,
      liquidFundInvestment: Array.isArray(investmentData.liquidFundInvestment)
        ? investmentData.liquidFundInvestment[0]
        : investmentData.liquidFundInvestment,
      realEstateInvestment: Array.isArray(investmentData.realEstateInvestment)
        ? investmentData.realEstateInvestment[0]
        : investmentData.realEstateInvestment,
      privateEquityInvestment: Array.isArray(investmentData.privateEquityInvestment)
        ? investmentData.privateEquityInvestment[0]
        : investmentData.privateEquityInvestment
    }
  }, [])

  // Get icon based on investment group (hardcoded for now)
  const getInvestmentIcon = useCallback((investmentData: any) => {
    if (!investmentData) return BarChart3

    const group = investmentData.investmentGroup?.code || ''
    if (group.includes('EQUITY')) return TrendingUp
    if (group.includes('REAL_ESTATE')) return Home
    return BarChart3
  }, [])

  // Get display category based on investment group
  const getInvestmentCategory = useCallback((investmentData: any): string => {
    if (!investmentData) return getTranslationFromI18nKeyAndLabel('crm.investments.category.default', 'INVESTMENT')

    const group = investmentData.investmentGroup?.code || ''
    if (group.includes('EQUITY'))
      return getTranslationFromI18nKeyAndLabel('crm.investments.category.equity', 'EQUITY INVESTMENT')
    if (group.includes('LIQUID_FUND'))
      return getTranslationFromI18nKeyAndLabel('crm.investments.category.liquidFund', 'LIQUID FUND INVESTMENT')
    if (group.includes('REAL_ESTATE'))
      return getTranslationFromI18nKeyAndLabel('crm.investments.category.realEstate', 'REAL ESTATE INVESTMENT')
    if (group.includes('PRIVATE_EQUITY'))
      return getTranslationFromI18nKeyAndLabel('crm.investments.category.privateEquity', 'PRIVATE EQUITY INVESTMENT')

    return getTranslationFromI18nKeyAndLabel('crm.investments.category.default', 'INVESTMENT')
  }, [])

  // Helper function to get the correct FlowContextName based on investment type
  const getInvestmentFlowContext = useCallback((type: string): FlowContextName => {
    switch (type?.toLowerCase()) {
      case 'equity':
        return FlowContextName.equityInvestmentEntity
      case 'private_equity':
      case 'privateequity':
        return FlowContextName.privateEquityInvestmentEntity
      case 'liquid_fund':
      case 'liquidfund':
        return FlowContextName.liquidFundInvestmentEntity
      case 'real_estate':
      case 'realestate':
        return FlowContextName.realEstateInvestmentEntity
      default:
        return FlowContextName.investmentEntity // Fallback to generic investment entity
    }
  }, [])

  // Central hooks for data fetching
  const { fetchInvestmentById } = useGetInvestmentById(props)
  const { fetchInvestmentCatalogData } = useGetInvestmentCatalogData(props)

  // Get investmentId from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const id = urlParams.get('investmentId')
    if (id) {
      setInvestmentId(id)
    }
  }, [])

  // Load catalog data once for dynamic field definitions
  useEffect(() => {
    const loadCatalogData = async () => {
      try {
        const catalog = await fetchInvestmentCatalogData()
        setCatalogData(catalog)
      } catch (err) {
        console.error('Failed to load catalog data:', err)
        // Don't fail the entire component if catalog fails - fallback to static fields
      }
    }

    if (props.accessToken) {
      loadCatalogData()
    }
  }, [props.accessToken, fetchInvestmentCatalogData])

  // Load investment data
  const loadData = useCallback(async () => {
    if (!investmentId || !props.accessToken) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const investmentResult = await fetchInvestmentById(investmentId)

      if (!investmentResult.investment) {
        setError(`No investment found for ID: ${investmentId}`)
        return
      }

      setInvestmentData(investmentResult.investment)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [investmentId, props.accessToken, fetchInvestmentById])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Refresh on process completion success using shared hook
  useProcessCompletion({
    onSuccess: () => {
      loadData()
    }
  })

  // Determine investment type and type-specific data using dynamic approach
  const investmentType = useMemo(
    () => determineInvestmentType(investmentData),
    [investmentData, determineInvestmentType]
  )
  const typeSpecificData = useMemo(
    () => extractTypeSpecificData(investmentData, []),
    [investmentData, extractTypeSpecificData]
  )

  // Hook for tile fields and AI summary
  const { processedTiles } = useInvestmentTileFields(props, investmentData)
  const aiSummaryHook = useInvestmentAiSummary(investmentId || '', props.accessToken)

  // Navigation
  const handleBack = useCallback(() => {
    // Get the fromView and fromSubView parameters from URL
    const urlParams = new URLSearchParams(window.location.search)
    const fromView = urlParams.get('fromView')
    const fromSubView = urlParams.get('fromSubView')

    // Navigate back based on the source view
    if (fromView && fromSubView) {
      switch (fromView) {
        case 'investments':
          navigateTo(buildPlatformUrl('/platform/irm/investment-management', { view: fromView, subView: fromSubView }))
          break
        case 'divestments':
          navigateTo(buildPlatformUrl('/platform/irm/investment-management', { view: fromView, subView: fromSubView }))
          break
        default:
          // Fallback to investment management main view
          navigateTo(buildPlatformUrl('/platform/irm/investment-management', { view: 'investments' }))
          break
      }
    } else {
      // Fallback to investment management main view if no source info
      navigateTo(buildPlatformUrl('/platform/irm/investment-management', { view: 'investments' }))
    }
  }, [])

  // Set default tab in URL on initial load
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (!params.get('tab')) {
      params.set('tab', activeTab)
      window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`)
    }
  }, []) // Only run once on mount

  // Handle browser back/forward navigation
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search)
      const tab = params.get('tab')
      if ((ALLOWED_TABS as readonly string[]).includes(tab || '')) {
        setActiveTab(tab as TabKey)
      }
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  // Tab change handler that updates URL without navigation
  const handleTabChange = useCallback((value: string) => {
    if ((ALLOWED_TABS as readonly string[]).includes(value)) {
      setActiveTab(value as TabKey)
      if (typeof window === 'undefined') return
      const params = new URLSearchParams(window.location.search)
      params.set('tab', value)
      params.delete('subView') // Clear subView when changing main tab
      window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`)
    }
  }, [])

  // Header action button - MUST be before conditional returns (Rules of Hooks)
  const headerActionButton = useMemo(
    () => (
      <AppAction
        variant="header"
        contexts={[
          {
            context: getInvestmentFlowContext(investmentType),
            contextData: { investmentId }
          }
        ]}
        shareContext={{
          entityType: 'investment',
          entityId: investmentId || '',
          entityName: investmentData?.name || 'Investment',
          entityUrl: `/platform/irm/investment-record?investmentId=${investmentId}`
        }}
        prefixDataTestId={`${investmentType}-record-action`}
        accessToken={props.accessToken}
      />
    ),
    [investmentId, investmentType, investmentData?.name, props.accessToken]
  )

  // Loading state
  if (isLoading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <Spinner size="lg" />
      </div>
    )
  }

  // Error state
  if (error || !typeSpecificData) {
    return (
      <div className="gba:p-8 gba:text-center">
        <div className="gba:mb-4">
          <button
            onClick={handleBack}
            className="gba:flex gba:items-center gba:text-primary hover:gba:text-primary gba:mx-auto"
            data-testid="back-to-investments-button"
          >
            <span className="gba:mr-2">←</span>
            {getTranslationFromI18nKeyAndLabel('crm.investments.navigation.backToList', 'Back to Investments')}
          </button>
        </div>
        {error && <p className="gba:text-destructive gba:text-lg gba:mb-4">{error}</p>}
      </div>
    )
  }

  const investment = investmentData

  // Header configuration using centralized utilities
  const headerMeta = createHeaderMeta(investment, investmentType, typeSpecificData, props.accessToken)

  const actions: AiAction[] = [
    {
      key: 'ai-summary',
      label: getTranslationFromI18nKeyAndLabel('crm.ai.summary', 'AI Summary'),
      icon: <Bot size={16} />,
      hook: aiSummaryHook,
      config: {
        entityType: 'investment',
        loadingMessage: getTranslationFromI18nKeyAndLabel(
          'crm.investments.ai.summary.loading',
          'Generating AI Summary...'
        ),
        loadingSubtitle: getTranslationFromI18nKeyAndLabel(
          'crm.investments.ai.summary.subtitle',
          'Analyzing investment data and activities'
        )
      }
    }
  ]

  const headerActions = (
    <AiActions
      actions={actions}
      dataTestId={`${investmentType}-update-button-${investmentId}`}
      buttonText={getTranslationFromI18nKeyAndLabel('crm.ai.summary', 'AI Summary')}
    />
  )

  // Detail groups for header using centralized utilities with dynamic catalog data
  const headerDetailGroups = getTypeSpecificDetailGroups(investmentType, typeSpecificData, investment, catalogData)

  // Tab configuration using centralized utilities
  const subViewsConfig = createInvestmentTabsConfig(
    activeTab,
    handleTabChange,
    investmentId || '',
    investment,
    investmentType,
    typeSpecificData,
    processedTiles,
    loadData,
    props,
    catalogData
  )

  return (
    <div className="gba:investment-details-container" data-testid={`${investmentType}-investment-detail`}>
      <RecordLayout
        headerOrientation="horizontal"
        headerIcon={getInvestmentIcon(investment)}
        headerCategory={getInvestmentCategory(investment)}
        onBack={handleBack}
        headerTitle={
          investment?.name || getTranslationFromI18nKeyAndLabel('crm.investments.record.title', 'Investment Record')
        }
        headerMeta={headerMeta}
        headerActions={headerActions}
        headerActionButton={headerActionButton}
        headerDetailGroups={headerDetailGroups}
        subViews={subViewsConfig}
      />
    </div>
  )
}

export default InvestmentRecord
