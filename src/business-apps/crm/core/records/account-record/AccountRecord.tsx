import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Button, Spinner, RecordLayout, Badge, IconAvatar, HeaderSlot } from '@newwork/nw-design-system'
import {
  UsersIcon,
  TargetIcon,
  FolderIcon,
  BankIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon
} from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { useCustomerAccount } from '@/common/data/customer/hooks/useCustomerAccount'
import { AiActions } from '@/common/components/common-relations/record-sections/header-section/ai-actions'
import { useAccountAiSummary } from './hooks/useAccountAiSummary'
import { OpportunityView } from './views/opportunity-view/OpportunityView'
import { DocumentView } from './views/document-view/DocumentView'
import { HomeView } from './views/home-view/HomeView'
import { getEmailChannel, getPhoneChannel } from '@/common/data/common/utils/communicationChannelHelpers'
import { getAccountPriorityBadgeVariant, getProspectiveBadgeConfig } from '@/common/utils/badgeUtils'

interface AccountRecordContentProps extends BusinessAppContextProps {
  accountId: string
  onBack: () => void
}

const AccountRecordContent: React.FC<AccountRecordContentProps> = ({ accountId, onBack, ...props }) => {
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

  const { account: accountData, loading, error, refetch } = useCustomerAccount(props.accessToken, accountId)

  // AI Summary hook - must be called before any conditional returns
  // Pass already-fetched accountData to avoid a duplicate GetAccountById query
  const aiSummaryHook = useAccountAiSummary(accountId, props.accessToken, accountData)

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

  // Memoized callback for process completion
  const handleProcessSuccess = useCallback(() => {
    refetch()
  }, [refetch])

  // Listen for process completion events to refresh account data
  useProcessCompletion({
    onSuccess: handleProcessSuccess
  })

  // Memoize header data - must be called before conditional returns
  const headerDetailGroups = useMemo(
    () => [
      {
        id: 'account-details',
        items: [
          {
            label: 'Email',
            value: getEmailChannel(accountData?.communicationChannels)?.value || 'Not set',
            icon: EnvelopeIcon
          },
          {
            label: 'Phone',
            value: getPhoneChannel(accountData?.communicationChannels)?.value || 'Not set',
            icon: PhoneIcon
          },
          {
            label: 'Founded',
            value: accountData?.foundationDate ? new Date(accountData.foundationDate).toLocaleDateString() : 'Not set',
            icon: CalendarIcon
          },
          {
            label: 'Owner',
            value:
              accountData?.ownerEmployee?.displayName ||
              (accountData?.ownerEmployee?.firstName && accountData?.ownerEmployee?.lastName
                ? `${accountData.ownerEmployee.firstName} ${accountData.ownerEmployee.lastName}`.trim()
                : 'Not assigned'),
            icon: UsersIcon
          }
        ]
      }
    ],
    [accountData?.communicationChannels, accountData?.foundationDate, accountData?.ownerEmployee]
  )

  const headerMeta = useMemo(() => {
    const badges = []

    // Priority badge
    if (accountData?.accountPriority) {
      const priority = accountData.accountPriority
      const value = priority.value || priority.code || ''
      const additionalValue1 = priority.additionalValue1 || ''
      const displayValue = additionalValue1 ? `${value}: ${additionalValue1}` : value

      badges.push(
        <Badge key="priority" variant={getAccountPriorityBadgeVariant(priority)} data-testid="account-priority-badge">
          {displayValue}
        </Badge>
      )
    }

    // Prospective badge
    const prospectiveConfig = getProspectiveBadgeConfig(accountData?.prospective ?? false, 'crm')
    badges.push(
      <Badge key="prospective" variant={prospectiveConfig.variant} data-testid="account-prospective-badge">
        {prospectiveConfig.label}
      </Badge>
    )

    return badges.length > 0 ? <div className="gba:flex gba:items-center gba:gap-2">{badges}</div> : null
  }, [accountData?.accountPriority, accountData?.prospective])

  const headerActionButton = useMemo(
    () => (
      <AppAction
        data-testid="customer-account-record-action-button"
        variant="header"
        contexts={[
          {
            context: FlowContextName.customerAccountEntity,
            contextData: { accountId }
          }
        ]}
        shareContext={{
          entityType: 'account',
          entityId: accountId,
          entityName: accountData?.name || 'Account',
          entityUrl: `/platform/crm/account-record?accountId=${accountId}`
        }}
        prefixDataTestId="customer-account-record-action"
        accessToken={props.accessToken}
      />
    ),
    [accountId, accountData?.name, props.accessToken]
  )

  const headerActions = (
    <AiActions
      entityType="account"
      entityId={accountId}
      features={['summary', 'meeting-planner']}
      hooks={{ summary: aiSummaryHook, meetingPlanner: aiSummaryHook }}
    />
  )

  const subViewsConfig = useMemo(
    () => ({
      defaultValue: activeTab,
      onValueChange: handleTabChange,
      items: [
        {
          value: 'overview',
          label: getTranslationFromI18nKeyAndLabel('crm.common.overview', 'Overview'),
          icon: <UsersIcon className="gba:mr-2" />,
          content: <HomeView accountId={accountId} accountData={accountData} {...props} />
        },
        {
          value: 'opportunities',
          label: getTranslationFromI18nKeyAndLabel('crm.common.opportunities', 'Opportunities'),
          icon: <TargetIcon className="gba:mr-2" />,
          content: (
            <div className="gba:col-span-12">
              <OpportunityView accountId={accountId} context={props} />
            </div>
          )
        },
        {
          value: 'documents',
          label: getTranslationFromI18nKeyAndLabel('crm.common.documents', 'Documents'),
          icon: <FolderIcon className="gba:mr-2" />,
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
    <RecordLayout
      data-testid="customer-account-detail"
      headerOrientation="horizontal"
      headerAvatar={<IconAvatar icon={BankIcon} variant="decorative" size="xl" />}
      headerOverline={getTranslationFromI18nKeyAndLabel('crm.common.account', 'ACCOUNT')}
      onBack={onBack}
      headerTitle={accountData.name || 'Unknown Account'}
      headerMeta={headerMeta}
      headerSlotMain={<HeaderSlot headerSlotItemGroups={headerDetailGroups} orientation="horizontal" />}
      headerActions={headerActions}
      headerActionButton={headerActionButton}
      views={subViewsConfig.items}
      defaultView={subViewsConfig.defaultValue}
      onViewChange={subViewsConfig.onValueChange}
    />
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
