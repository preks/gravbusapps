import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Button, Spinner, RecordLayout, Badge, IconAvatar, HeaderSlot } from '@newwork/nw-design-system'
import {
  UsersIcon,
  TrendUpIcon,
  FileTextIcon,
  BankIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon
} from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useInvestmentAccount } from '@/common/data/investment/hooks/useInvestmentAccount'
import { buildInvestmentsByAccountIdQueryBody } from '@/common/data/investment/queries/investmentQueries'
import { toInvestment } from '@/common/data/investment/mappers/investmentMappers'
import type { Investment } from '@/common/data/investment/types/investmentTypes'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { AiActions } from '@/common/components/common-relations/record-sections/header-section/ai-actions'
import { useAccountAiSummary } from './hooks/useAccountAiSummary'
import { useGenerateAIBooklet } from './hooks/useGenerateAIBooklet'
import { OpportunityView } from './views/opportunity-view/OpportunityView'
import { DocumentView } from './views/document-view/DocumentView'
import { HomeView } from './views/home-view/HomeView'
import { getEmailChannel, getPhoneChannel } from '@/common/data/common/utils/communicationChannelHelpers'
import { getAccountPriorityBadgeVariant, getProspectiveBadgeConfig } from '@/common/utils/badgeUtils'

interface AccountRecordContentProps extends BusinessAppContextProps {
  accountId: string
  onBack: () => void
}

const InvestmentAccountRecordContent: React.FC<AccountRecordContentProps> = ({ accountId, onBack, ...props }) => {
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

  const additionalQueries = useMemo(
    () => [
      {
        query: buildInvestmentsByAccountIdQueryBody(accountId),
        data: (result: any) => (result.accountInvestments || []).map(toInvestment) as Investment[],
        key: 'investments' as const
      }
    ],
    [accountId]
  )

  const {
    account: accountData,
    investments,
    loading: dataLoading,
    error: dataError,
    refetch: refetchAccountData
  } = useInvestmentAccount(props.accessToken, accountId, { additionalQueries })

  // AI Summary hook - must be called before any conditional returns
  const aiSummaryHook = useAccountAiSummary(accountId, props.accessToken)
  const aiBookletHook = useGenerateAIBooklet(accountId, props.accessToken, {
    outputFileName: 'ma_booklet_generated.xlsx',
    maxQuestions: 300
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

  // Memoized callback for process completion
  const handleProcessSuccess = useCallback(() => {
    refetchAccountData()
  }, [refetchAccountData])

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
            value: getEmailChannel(accountData?.communicationChannels)?.value || accountData?.email || 'Not set',
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
    [accountData?.email, accountData?.foundationDate, accountData?.ownerEmployee]
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
    const prospectiveConfig = getProspectiveBadgeConfig(accountData?.prospective ?? false, 'irm')
    badges.push(
      <Badge key="prospective" variant={prospectiveConfig.variant} data-testid="account-prospective-badge">
        {prospectiveConfig.label}
      </Badge>
    )

    return badges.length > 0 ? <div className="gba:flex gba:items-center gba:gap-2">{badges}</div> : null
  }, [accountData?.accountPriority, accountData?.prospective])

  const headerActions = (
    <AiActions
      entityType="investment-account"
      entityId={accountId}
      features={['summary', 'booklet']}
      hooks={{ summary: aiSummaryHook, booklet: aiBookletHook }}
      requireAccessToken
      accessToken={props.accessToken}
    />
  )

  const headerActionButton = useMemo(
    () => (
      <AppAction
        data-testid="investment-account-record-action-button"
        variant="header"
        contexts={[
          {
            context: FlowContextName.investmentAccountEntity,
            contextData: { accountId }
          }
        ]}
        shareContext={{
          entityType: 'investment-account',
          entityId: accountId,
          entityName: accountData?.name || 'Account',
          entityUrl: `/platform/irm/account-record?accountId=${accountId}`
        }}
        prefixDataTestId="investment-account-record-action"
        accessToken={props.accessToken}
      />
    ),
    [accountId, accountData?.name, props.accessToken]
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
          content: (
            <HomeView
              accountId={accountId}
              accountData={accountData ?? undefined}
              investments={investments || []}
              investmentsLoading={dataLoading}
              {...props}
            />
          )
        },
        {
          value: 'opportunities',
          label: getTranslationFromI18nKeyAndLabel('crm.common.opportunities', 'Opportunities'),
          icon: <TrendUpIcon className="gba:mr-2" />,
          content: (
            <div className="gba:col-span-12">
              <OpportunityView accountId={accountId} context={props} />
            </div>
          )
        },
        {
          value: 'documents',
          label: getTranslationFromI18nKeyAndLabel('crm.common.documents', 'Documents'),
          icon: <FileTextIcon className="gba:mr-2" />,
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

  if (dataLoading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <Spinner size="lg" />
      </div>
    )
  }

  if (dataError || !accountData) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <div className="gba:text-center">
          <p className="gba:text-lg" data-testid="investment-account-error-message">
            {dataError ||
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
    <RecordLayout
      data-testid="investment-account-detail"
      headerOrientation="horizontal"
      headerAvatar={<IconAvatar icon={BankIcon} variant="decorative" size="xl" />}
      headerOverline={getTranslationFromI18nKeyAndLabel('crm.common.account', 'ACCOUNT')}
      onBack={onBack}
      headerTitle={accountData.name}
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
