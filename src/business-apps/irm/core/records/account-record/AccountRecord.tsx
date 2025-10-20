import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Button, Spinner, RecordLayout } from '@newwork/nw-design-system'
import { Users, TrendUp, FileText, Bank } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useGetInvestmentAccountById } from '@/common/data/investment/hooks/useInvestmentAccounts'
import { InvestmentAccount } from '@/common/data/investment/types'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { AiActions, AiAction } from '@/common/components/common-relations/record-sections/header-section/ai-actions'
import { useAccountAiSummary } from './hooks/useAccountAiSummary'
import { useGenerateAIBooklet } from './hooks/useGenerateAIBooklet'
import { Bot } from 'lucide-react'
import { OpportunityView } from './views/opportunity-view/OpportunityView'
import { DocumentView } from './views/document-view/DocumentView'
import { HomeView } from './views/home-view/HomeView'

interface AccountRecordContentProps extends BusinessAppContextProps {
  accountId: string
  onBack: () => void
}

const InvestmentAccountRecordContent: React.FC<AccountRecordContentProps> = ({ accountId, onBack, ...props }) => {
  const [account, setAccount] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const ALLOWED_TABS = ['overview', 'opportunities', 'documents'] as const
  type TabKey = (typeof ALLOWED_TABS)[number]
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    if (typeof window === 'undefined') return 'overview'
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab') || 'overview'
    return (ALLOWED_TABS as readonly string[]).includes(tab) ? (tab as TabKey) : 'overview'
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (!params.get('tab')) {
      params.set('tab', activeTab)
      window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`)
    }
  }, []) // set default tab in URL on initial load

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onPopState = () => {
      if (typeof window === 'undefined') return
      const params = new URLSearchParams(window.location.search)
      const tab = params.get('tab')
      if ((ALLOWED_TABS as readonly string[]).includes(tab || '')) setActiveTab(tab as TabKey)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const { fetchInvestmentAccountById } = useGetInvestmentAccountById(props)
  const [accountData, setAccountData] = useState<InvestmentAccount | undefined>(undefined)
  const [dataLoading, setDataLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)

  // Fetch account data
  useEffect(() => {
    const loadAccountData = async () => {
      if (!accountId) return

      try {
        setDataLoading(true)
        setDataError(null)
        const result = await fetchInvestmentAccountById(accountId)
        if (result?.account) {
          setAccountData(result.account)
        }
      } catch (error) {
        console.error('Error fetching investment account:', error)
        setDataError(error instanceof Error ? error.message : 'Unknown error')
      } finally {
        setDataLoading(false)
      }
    }

    loadAccountData()
  }, [accountId, fetchInvestmentAccountById])

  // AI Summary hook - must be called before any conditional returns
  const aiSummaryHook = useAccountAiSummary(accountId, props.accessToken)
  const aiBookletHook = useGenerateAIBooklet(accountId, props.accessToken, {
    outputFileName: 'ma_booklet_generated.xlsx',
    maxQuestions: 14
  })

  const handleTabChange = useCallback((value: string) => {
    if ((ALLOWED_TABS as readonly string[]).includes(value)) {
      setActiveTab(value as TabKey)
      if (typeof window === 'undefined') return
      const params = new URLSearchParams(window.location.search)
      params.set('tab', value)
      params.delete('subView') // clear subView when changing main tab
      window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`)
    }
  }, [])

  // Refetch function for process completion
  const refetchAccountData = useCallback(async () => {
    if (!accountId) return

    try {
      setDataLoading(true)
      setDataError(null)
      const result = await fetchInvestmentAccountById(accountId)
      if (result?.account) {
        setAccountData(result.account)
      }
    } catch (error) {
      console.error('Error refetching investment account:', error)
      setDataError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setDataLoading(false)
    }
  }, [accountId, fetchInvestmentAccountById])

  // Listen for process completion events to refresh account data
  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        // Check for successful completion
        if (event.detail?.resolution === 'success') {
          refetchAccountData()
          return
        }

        // Also check for different event structure
        const response = event.detail?.response
        if (response?.detail?.resolution === 'success' || response?.account) {
          refetchAccountData()
        }
      } catch (err) {
        console.error('Error handling process completion in AccountRecord:', err)
      }
    }

    // Listen to multiple possible event names for account updates
    const eventNames = [
      'com.newwork.process.taskCompletion',
      'com.newwork.process.completion',
      'com.newwork.process.continue',
      'com.newwork.process.processCompletion',
      'processCompletion',
      'taskCompletion',
      'taskCompleted',
      'processCompleted',
      'task-completion',
      'process-completion'
    ]

    eventNames.forEach(eventName => {
      window.addEventListener(eventName, handleProcessCompletion as EventListener)
    })

    return () => {
      eventNames.forEach(eventName => {
        window.removeEventListener(eventName, handleProcessCompletion as EventListener)
      })
    }
  }, [accountId, refetchAccountData])

  // Memoize header data - must be called before conditional returns
  const headerDetailGroups = useMemo(
    () => [
      {
        id: 'account-details',
        items: [
          {
            label: 'Email',
            value: accountData?.email || 'Not set',
            icon: TrendUp
          },
          {
            label: 'Founded',
            value: accountData?.foundationDate ? new Date(accountData.foundationDate).toLocaleDateString() : 'Not set',
            icon: TrendUp
          },
          {
            label: 'Owner',
            value: (accountData as any)?.ownerDisplayName || account?.accountOwner?.name || 'Not assigned',
            icon: Users
          }
        ]
      }
    ],
    [accountData?.email, accountData?.foundationDate, (accountData as any)?.ownerDisplayName, account?.accountOwner]
  )

  const headerActions = useMemo(() => {
    const aiActions: AiAction[] = props.accessToken
      ? [
          {
            key: 'ai-summary',
            label: getTranslationFromI18nKeyAndLabel('crm.ai.summary', 'AI Summary'),
            icon: <Bot size={16} />,
            hook: aiSummaryHook,
            config: {
              entityType: 'account',
              loadingMessage: getTranslationFromI18nKeyAndLabel('crm.ai.generatingSummary', 'Generating AI Summary...'),
              loadingSubtitle: getTranslationFromI18nKeyAndLabel(
                'crm.ai.analyzingAccount',
                'Analyzing account data and activities'
              ),
              emptyStateMessage: getTranslationFromI18nKeyAndLabel(
                'crm.ai.summary.emptyState',
                "Click to generate intelligent insights about this account's performance and next steps"
              )
            }
          },
          {
            key: 'ai-booklet',
            label: getTranslationFromI18nKeyAndLabel('crm.ai.booklet', 'AI Booklet'),
            icon: <Bot size={16} />,
            hook: aiBookletHook,
            config: {
              entityType: 'account',
              loadingMessage: getTranslationFromI18nKeyAndLabel('crm.ai.booklet.loading', 'Generating AI Booklet...'),
              loadingSubtitle: getTranslationFromI18nKeyAndLabel(
                'crm.ai.booklet.subtitle',
                'Analyzing account documents for creating a booklet'
              ),
              emptyStateMessage: getTranslationFromI18nKeyAndLabel(
                'crm.ai.booklet.emptyState',
                'Click to generate an M&A booklet from account documents'
              )
            }
          }
        ]
      : []

    return (
      <AiActions
        actions={aiActions}
        dataTestId={`account-ai-actions-${accountId}`}
        buttonText={getTranslationFromI18nKeyAndLabel('crm.ai.actions', 'AI Actions')}
      />
    )
  }, [props.accessToken, aiSummaryHook, aiBookletHook, accountId])

  const headerActionButton = useMemo(
    () => (
      <AppActionButton
        data-testid="investment-account-record-action-button"
        size="icon"
        contextsArray={[FlowContextName.investmentAccountEntity]}
        externalContextData={{
          accountId: accountId
        }}
        prefixDataTestId="investment-account-record-action"
        accessToken={props.accessToken}
        emptyStateBehavior="hide"
        deferMainContextRequestsUntilClick={false}
      />
    ),
    [accountId, props.accessToken]
  )

  const subViewsConfig = useMemo(
    () => ({
      defaultValue: activeTab,
      onValueChange: handleTabChange,
      items: [
        {
          value: 'overview',
          label: getTranslationFromI18nKeyAndLabel('crm.common.overview', 'Overview'),
          icon: <Users className="gba:mr-2" />,
          content: <HomeView accountId={accountId} accountData={accountData} {...props} />
        },
        {
          value: 'opportunities',
          label: getTranslationFromI18nKeyAndLabel('crm.common.opportunities', 'Opportunities'),
          icon: <TrendUp className="gba:mr-2" />,
          content: (
            <div className="gba:col-span-12">
              <OpportunityView accountId={accountId} context={props} />
            </div>
          )
        },
        {
          value: 'documents',
          label: getTranslationFromI18nKeyAndLabel('crm.common.documents', 'Documents'),
          icon: <FileText className="gba:mr-2" />,
          content: (
            <div className="gba:col-span-12">
              <DocumentView accountId={accountId} context={props} />
            </div>
          )
        }
      ]
    }),
    [activeTab, handleTabChange, accountData, accountId, props]
  )

  useEffect(() => {
    const fetchAccountData = async () => {
      if (!accountId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        if (accountData) {
          setAccount(accountData)
        } else if (dataError) {
          setError(dataError)
        }
      } catch (err) {
        console.error('Error fetching investment account:', err)
        setError(err instanceof Error ? err.message : 'Failed to load investment account')
      } finally {
        setLoading(false)
      }
    }

    if (!dataLoading) {
      fetchAccountData()
    }
  }, [accountId, accountData, dataLoading, dataError])

  // Update loading state based on data loading
  useEffect(() => {
    setLoading(dataLoading)
  }, [dataLoading])

  if (loading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !account) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <div className="gba:text-center">
          <p className="gba:text-lg" data-testid="investment-account-error-message">
            {error ||
              getTranslationFromI18nKeyAndLabel('crm.investments.account.notFound', 'Investment Account not found')}
          </p>
          <Button
            onClick={onBack}
            style={{ marginTop: 'var(--nw-spacing-sm)' }}
            variant="default"
            data-testid="investment-account-error-back-button"
          >
            {getTranslationFromI18nKeyAndLabel('crm.common.back', 'Back to Investment Accounts')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div data-testid="investment-account-detail">
      <RecordLayout
        headerOrientation="horizontal"
        headerIcon={Bank}
        headerCategory={getTranslationFromI18nKeyAndLabel('crm.common.account', 'ACCOUNT')}
        onBack={onBack}
        headerTitle={account.name}
        headerDetailGroups={headerDetailGroups}
        headerActions={headerActions}
        headerActionButton={headerActionButton}
        subViews={subViewsConfig}
      />
    </div>
  )
}

interface AccountRecordProps extends BusinessAppContextProps {
  accountId?: string
  source?: string
  onBack?: () => void
}

const AccountRecord: React.FC<AccountRecordProps> = props => {
  const accountId = useMemo(() => {
    return props.accountId || new URLSearchParams(window.location.search).get('accountId')
  }, [props.accountId])

  const handleBack = () => {
    if (props.onBack) {
      props.onBack()
    } else {
      // Always navigate to investment relations
      navigateTo(buildPlatformUrl('/platform/irm/investment-relations', { view: 'accounts' }))
    }
  }

  if (!accountId) {
    return (
      <div data-testid="investment-account-record-no-id">
        <p>
          {getTranslationFromI18nKeyAndLabel(
            'crm.investments.account.noIdProvided',
            'No investment account ID provided'
          )}
        </p>
      </div>
    )
  }

  return <InvestmentAccountRecordContent {...props} accountId={accountId} onBack={handleBack} />
}

export { AccountRecord, InvestmentAccountRecordContent }

export default AccountRecord
