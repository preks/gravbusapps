import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Button, Spinner, RecordLayout } from '@newwork/nw-design-system'
import { Users, TrendUp, FileText, Bank } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { useCustomerAccounts } from '@/common/data/customer/hooks/useCustomerAccounts'
import { OpportunityView } from './views/opportunity-view/OpportunityView'
import { DocumentView } from './views/document-view/DocumentView'
import { HomeView } from './views/home-view/HomeView'
import type { CustomerAccount } from '@/common/data/customer/types'

interface AccountRecordContentProps extends BusinessAppContextProps {
  accountId: string
  onBack: () => void
}

const AccountRecordContent: React.FC<AccountRecordContentProps> = ({ accountId, onBack, ...props }) => {
  const [accountData, setAccountData] = useState<CustomerAccount | null>(null)
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

  const { fetchCustomerAccountById } = useCustomerAccounts(props)

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

  // Fetch account data
  const fetchAccountData = useCallback(async () => {
    if (!accountId || !props.accessToken) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const account = await fetchCustomerAccountById(accountId)
      if (account) {
        setAccountData(account)
      } else {
        setError('Account not found')
      }
    } catch (err) {
      console.error('Error fetching account:', err)
      setError(err instanceof Error ? err.message : 'Failed to load account')
    } finally {
      setLoading(false)
    }
  }, [accountId, props.accessToken, fetchCustomerAccountById])

  useEffect(() => {
    fetchAccountData()
  }, [fetchAccountData])

  // Listen for process completion events to refresh account data
  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        // Check for successful completion
        if (event.detail?.resolution === 'success') {
          fetchAccountData()
          return
        }

        // Also check for different event structure
        const response = event.detail?.response
        if (response?.detail?.resolution === 'success' || response?.account) {
          fetchAccountData()
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
  }, [fetchAccountData])

  // Memoize header data - must be called before conditional returns
  const headerDetailGroups = useMemo(
    () => [
      {
        id: 'account-details',
        items: [
          {
            label: 'Email',
            value:
              accountData?.communicationChannels?.find((cc: any) => cc.communicationChannel?.code === 'EMAIL')?.value ||
              'Not set',
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
            value:
              accountData?.ownerEmployee?.displayName ||
              (accountData?.ownerEmployee?.firstName && accountData?.ownerEmployee?.lastName
                ? `${accountData.ownerEmployee.firstName} ${accountData.ownerEmployee.lastName}`.trim()
                : 'Not assigned'),
            icon: Users
          }
        ]
      }
    ],
    [accountData?.communicationChannels, accountData?.foundationDate, accountData?.ownerEmployee]
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

  if (loading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !accountData) {
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
        headerTitle={accountData.name || 'Unknown Account'}
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
