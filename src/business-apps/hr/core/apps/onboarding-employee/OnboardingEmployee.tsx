import React, { useState, useEffect, useCallback } from 'react'
import { PageLayout, useTranslation } from '@newwork/nw-design-system'
import { ClipboardTextIcon, TicketIcon, GitBranchIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { MODULE_COLORS } from '@/common/constants/ui'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { OnboardingCasesView } from './views/onboarding-cases-view/OnboardingCasesView'
import { OnboardingCaseDetailView } from './views/onboarding-case-detail-view/OnboardingCaseDetailView'
import { OnboardingTicketsView } from './views/onboarding-tickets-view/OnboardingTicketsView'
import onboardingI18n from './_i18n'

const moduleColor = MODULE_COLORS.HR

const VIEW_OPTIONS = [
  {
    key: 'cases',
    icon: <ClipboardTextIcon className="w-5 h-5" />,
    labelKey: 'onboarding-employee-tab-cases',
    titleKey: 'onboarding-employee-section-title',
    descriptionKey: 'onboarding-employee-section-description'
  },
  {
    key: 'tickets',
    icon: <TicketIcon className="w-5 h-5" />,
    labelKey: 'onboarding-employee-tab-tickets',
    titleKey: 'onboarding-employee-section-tickets-title',
    descriptionKey: 'onboarding-employee-section-tickets-description'
  },
  {
    key: 'flows',
    icon: <GitBranchIcon className="w-5 h-5" />,
    labelKey: 'onboarding-employee-tab-flows',
    titleKey: 'onboarding-employee-section-flows-title',
    descriptionKey: 'onboarding-employee-section-flows-description'
  }
]

function getCaseIdFromUrl(): string | null {
  if (typeof globalThis.window === 'undefined') return null
  return new URLSearchParams(globalThis.window.location.search).get('caseId')
}

export const OnboardingEmployee: React.FC<BusinessAppContextProps> = context => {
  const { t } = useTranslation(onboardingI18n)
  const [caseId, setCaseId] = useState<string | null>(getCaseIdFromUrl)

  const getInitialView = () => {
    const urlParams = new URLSearchParams(globalThis.window.location.search)
    const viewFromUrl = urlParams.get('view')
    if (viewFromUrl && VIEW_OPTIONS.some(opt => opt.key === viewFromUrl)) {
      return viewFromUrl
    }
    return VIEW_OPTIONS[0].key
  }

  const [activeTab, setActiveTab] = useState<string>(getInitialView())

  const updateUrl = (view: string, overrides?: { caseId?: string | null }) => {
    const urlParams = new URLSearchParams(globalThis.window.location.search)
    urlParams.set('view', view)
    if (overrides?.caseId !== undefined) {
      if (overrides.caseId) urlParams.set('caseId', overrides.caseId)
      else urlParams.delete('caseId')
    }
    const newUrl = `${globalThis.window.location.pathname}?${urlParams.toString()}`
    globalThis.window.history.replaceState({}, '', newUrl)
  }

  const handleTabChange = (key: string) => {
    if (!key || key === activeTab) return
    setActiveTab(key)
    updateUrl(key)
  }

  const handleBackFromCase = () => {
    setCaseId(null)
    navigateTo(buildPlatformUrl('/platform/onboarding-employee', { view: 'cases' }))
  }

  useEffect(() => {
    const urlParams = new URLSearchParams(globalThis.window.location.search)
    if (!urlParams.has('view')) {
      updateUrl(activeTab)
    }
  }, [])

  useEffect(() => {
    const id = getCaseIdFromUrl()
    setCaseId(id)
  }, [])

  useEffect(() => {
    const handlePopState = () => {
      setActiveTab(getInitialView())
      setCaseId(getCaseIdFromUrl())
    }
    globalThis.window.addEventListener('popstate', handlePopState)
    return () => globalThis.window.removeEventListener('popstate', handlePopState)
  }, [])

  const activeTabInfo = VIEW_OPTIONS.find(opt => opt.key === activeTab) ?? VIEW_OPTIONS[0]

  const onNavigateToCase = useCallback((id: string) => {
    setCaseId(id)
    navigateTo(buildPlatformUrl('/platform/onboarding-employee', { view: 'cases', caseId: id }))
  }, [])

  if (caseId) {
    return (
      <div data-testid="onboarding-employee-app">
        <OnboardingCaseDetailView caseId={caseId} onBack={handleBackFromCase} accessToken={context.accessToken} />
      </div>
    )
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'cases':
        return <OnboardingCasesView {...context} onNavigateToCase={onNavigateToCase} />
      case 'tickets':
        return <OnboardingTicketsView {...context} />
      case 'flows':
        return <div>Flows</div>
      default:
        return null
    }
  }

  return (
    <div data-testid="onboarding-employee-app">
      <PageLayout
        headerIcon={ClipboardTextIcon}
        headerTitle={t('onboarding-employee-title')}
        headerDescription={t('onboarding-employee-description')}
        sectionTitle={t(activeTabInfo.titleKey)}
        sectionDescription={t(activeTabInfo.descriptionKey)}
        headerSubViews={{
          value: activeTab,
          onValueChange: handleTabChange,
          items: VIEW_OPTIONS.map(opt => ({
            value: opt.key,
            label: t(opt.labelKey),
            icon: opt.icon
          }))
        }}
        variant={moduleColor}
        className="gba:min-h-screen"
      >
        <div className="gba:h-full gba:overflow-auto">{renderContent()}</div>
      </PageLayout>
    </div>
  )
}

export default OnboardingEmployee
