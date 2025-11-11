import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Button, Spinner, RecordLayout } from '@newwork/nw-design-system'
import { Users, TrendUp, FileText, Bank } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { useAccountData } from './hooks/useAccountData'
import { OpportunityView } from './views/opportunity-view/OpportunityView'
import { DocumentView } from './views/document-view/DocumentView'
import { HomeView } from './views/home-view/HomeView'

interface AccountRecordContentProps extends BusinessAppContextProps {
  accountId: string
  onBack: () => void
}

const AccountRecordContent: React.FC<AccountRecordContentProps> = ({ accountId, onBack, ...props }) => {
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

  const {
    account: accountTransformed,
    accountData: rawAccountData,
    loading: dataLoading,
    error: dataError,
    refetchAccountData
  } = useAccountData(accountId, props.accessToken)

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
  }, [refetchAccountData])

  // Memoize header data - must be called before conditional returns
  const headerDetailGroups = useMemo(
    () => [
      {
        id: 'account-details',
        items: [
          {
            label: 'Email',
            value: accountTransformed?.email || 'Not set',
            icon: TrendUp
          },
          {
            label: 'Founded',
            value: accountTransformed?.foundationDate
              ? new Date(accountTransformed.foundationDate).toLocaleDateString()
              : 'Not set',
            icon: TrendUp
          },
          {
            label: 'Owner',
            value: accountTransformed?.accountOwner?.name || 'Not assigned',
            icon: Users
          }
        ]
      }
    ],
    [accountTransformed?.email, accountTransformed?.foundationDate, accountTransformed?.accountOwner]
  )

  const headerActionButton = useMemo(
    () => (
      <AppActionButton
        data-testid="customer-account-record-action-button"
        size="icon"
        contextsArray={[FlowContextName.customerAccountEntity]}
        externalContextData={{
          accountId: accountId
        }}
        prefixDataTestId="customer-account-record-action"
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
          content: <HomeView accountId={accountId} accountData={rawAccountData} {...props} />
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
    [activeTab, handleTabChange, rawAccountData, accountId, props]
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

        if (accountTransformed) {
          setAccount(accountTransformed)
        } else if (dataError) {
          setError(dataError)
        }
      } catch (err) {
        console.error('Error fetching account:', err)
        setError(err instanceof Error ? err.message : 'Failed to load account')
      } finally {
        setLoading(false)
      }
    }

    if (!dataLoading) {
      fetchAccountData()
    }
  }, [accountId, accountTransformed, dataLoading, dataError])

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
          <p className="gba:text-lg" data-testid="customer-account-error-message">
            {error || getTranslationFromI18nKeyAndLabel('crm.account.notFound', 'Account not found')}
          </p>
          <Button
            onClick={onBack}
            style={{ marginTop: 'var(--nw-spacing-sm)' }}
            variant="default"
            data-testid="customer-account-error-back-button"
          >
            {getTranslationFromI18nKeyAndLabel('crm.common.back', 'Back to Accounts')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div data-testid="customer-account-detail">
      <RecordLayout
        headerOrientation="horizontal"
        headerIcon={Bank}
        headerCategory={getTranslationFromI18nKeyAndLabel('crm.common.account', 'ACCOUNT')}
        onBack={onBack}
        headerTitle={account.name}
        headerDetailGroups={headerDetailGroups}
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
    const fromProps = props.accountId
    const fromQuery = new URLSearchParams(window.location.search).get('accountId')
    if (fromProps) return fromProps
    if (fromQuery) return fromQuery
    const isLocal =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    return isLocal ? '79e8f1a9-f9cd-4135-b03e-008b7589b41c' : undefined
  }, [props.accountId])

  const source = useMemo(() => {
    return props.source || new URLSearchParams(window.location.search).get('source')
  }, [props.source])

  const handleBack = () => {
    if (props.onBack) {
      props.onBack()
    } else {
      // Navigate back based on source
      switch (source) {
        case 'investments':
          navigateTo(buildPlatformUrl('/platform/irm/investment-relations', { view: 'accounts' }))
          break
        case 'customer-relations':
        default:
          navigateTo(buildPlatformUrl('/platform/crm/customer-relations', { view: 'accounts' }))
          break
      }
    }
  }

  if (!accountId) {
    return (
      <div data-testid="contact-record-no-id">
        <p>{getTranslationFromI18nKeyAndLabel('crm.account.noIdProvided', 'No account ID provided')}</p>
      </div>
    )
  }

  return <AccountRecordContent {...props} accountId={accountId} onBack={handleBack} />
}

export { AccountRecord, AccountRecordContent }

export default AccountRecord
