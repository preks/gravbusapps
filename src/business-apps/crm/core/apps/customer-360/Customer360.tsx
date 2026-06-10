import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Spinner, RecordLayout, IconAvatar, useTranslation as useFluentTranslation } from '@newwork/nw-design-system'
import {
  SquaresFourIcon,
  IdentificationCardIcon,
  GaugeIcon,
  FileTextIcon,
  LifebuoyIcon,
  FoldersIcon,
  ReceiptIcon,
  ClockCounterClockwiseIcon,
  RobotIcon,
  UserIcon,
  BankIcon
} from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import customer360I18n from './_i18n'
import { useCustomerRoot } from './data/useCustomerRoot'
import { useCustomer360 } from './data/useCustomer360'
import type { CustomerSubjectType } from './data/types'
import Customer360KpiHeader from './components/Customer360KpiHeader'
import OverviewView from './views/overview/OverviewView'
import DetailsView from './views/details/DetailsView'
import ScoringSatisfactionView from './views/scoring-satisfaction/ScoringSatisfactionView'
import ContractsView from './views/contracts/ContractsView'
import ServiceTicketsView from './views/service-tickets/ServiceTicketsView'
import ServiceCasesView from './views/service-cases/ServiceCasesView'
import TransactionsFibuView from './views/transactions-fibu/TransactionsFibuView'
import JournalView from './views/journal/JournalView'
import AgentView from './views/agent/AgentView'
import Customer360Home from './home/Customer360Home'

/**
 * Ordered tab id list (shared contract). Feature workers wire their own view
 * but should NOT reorder or rename these ids.
 */
export const CUSTOMER_360_TABS = [
  'overview',
  'details',
  'scoring-satisfaction',
  'contracts',
  'service-tickets',
  'service-cases',
  'transactions-fibu',
  'journal',
  'agent'
] as const

export type Customer360TabKey = (typeof CUSTOMER_360_TABS)[number]

const DEFAULT_TAB: Customer360TabKey = 'overview'

function readTabFromUrl(): Customer360TabKey {
  if (typeof window === 'undefined') return DEFAULT_TAB
  const tab = new URLSearchParams(window.location.search).get('tab') || DEFAULT_TAB
  return (CUSTOMER_360_TABS as readonly string[]).includes(tab) ? (tab as Customer360TabKey) : DEFAULT_TAB
}

interface Customer360ContentProps extends BusinessAppContextProps {
  subjectType: CustomerSubjectType
  subjectId: string
}

const Customer360Content: React.FC<Customer360ContentProps> = ({ subjectType, subjectId, ...props }) => {
  const { t } = useFluentTranslation(customer360I18n)
  const [activeTab, setActiveTab] = useState<Customer360TabKey>(readTabFromUrl)

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
    const onPopState = () => setActiveTab(readTabFromUrl())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const handleTabChange = useCallback((value: string) => {
    if (!(CUSTOMER_360_TABS as readonly string[]).includes(value)) return
    setActiveTab(value as Customer360TabKey)
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    params.set('tab', value)
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`)
  }, [])

  const handleOpenAgent = useCallback(() => {
    handleTabChange('agent')
  }, [handleTabChange])

  const { subject, loading, error } = useCustomerRoot(props.accessToken, subjectType, subjectId)
  const { snapshot, loading: snapshotLoading } = useCustomer360(props.accessToken, subject)

  const views = useMemo(() => {
    if (!subject) return []
    const shared = { subject, snapshot, loading: snapshotLoading, ...props }
    return [
      {
        value: 'overview',
        label: t('tab-overview'),
        icon: <SquaresFourIcon className="gba:mr-2" />,
        content: <OverviewView {...shared} onOpenAgent={handleOpenAgent} />
      },
      {
        value: 'details',
        label: t('tab-details'),
        icon: <IdentificationCardIcon className="gba:mr-2" />,
        content: <DetailsView {...shared} />
      },
      {
        value: 'scoring-satisfaction',
        label: t('tab-scoring-satisfaction'),
        icon: <GaugeIcon className="gba:mr-2" />,
        content: <ScoringSatisfactionView {...shared} />
      },
      {
        value: 'contracts',
        label: t('tab-contracts'),
        icon: <FileTextIcon className="gba:mr-2" />,
        content: <ContractsView {...shared} />
      },
      {
        value: 'service-tickets',
        label: t('tab-service-tickets'),
        icon: <LifebuoyIcon className="gba:mr-2" />,
        content: <ServiceTicketsView {...shared} />
      },
      {
        value: 'service-cases',
        label: t('tab-service-cases'),
        icon: <FoldersIcon className="gba:mr-2" />,
        content: <ServiceCasesView {...shared} />
      },
      {
        value: 'transactions-fibu',
        label: t('tab-transactions-fibu'),
        icon: <ReceiptIcon className="gba:mr-2" />,
        content: <TransactionsFibuView {...shared} />
      },
      {
        value: 'journal',
        label: t('tab-journal'),
        icon: <ClockCounterClockwiseIcon className="gba:mr-2" />,
        content: <JournalView {...shared} />
      },
      {
        value: 'agent',
        label: t('tab-agent'),
        icon: <RobotIcon className="gba:mr-2" />,
        content: <AgentView {...shared} />
      }
    ]
  }, [subject, snapshot, snapshotLoading, props, t, handleOpenAgent])

  if (loading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !subject) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <div className="gba:text-center">
          <p className="gba:text-lg" data-testid="customer-360-error-message">
            {error || t('not-found')}
          </p>
        </div>
      </div>
    )
  }

  const isAccount = subject.type === 'account'

  return (
    <RecordLayout
      data-testid="customer-360-detail"
      headerOrientation="horizontal"
      headerAvatar={<IconAvatar icon={isAccount ? BankIcon : UserIcon} variant="decorative" size="xl" />}
      headerOverline={isAccount ? t('overline-account') : t('overline-contact')}
      headerTitle={subject.displayName}
      headerSlotMain={<Customer360KpiHeader snapshot={snapshot} loading={snapshotLoading} />}
      views={views}
      currentView={activeTab}
      onViewChange={handleTabChange}
    />
  )
}

interface Customer360Props extends BusinessAppContextProps {
  type?: CustomerSubjectType
  id?: string
}

interface Customer360Route {
  type: CustomerSubjectType
  id?: string
}

function readRoute(props: Customer360Props): Customer360Route {
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const typeFromQuery = params?.get('type')
  const type: CustomerSubjectType = props.type ?? (typeFromQuery === 'contact' ? 'contact' : 'account')
  const id = props.id || params?.get('id') || undefined
  return { type, id }
}

/**
 * Top-level Customer360 router. With no `?id` it renders the portfolio Home
 * product; with an `?id` it renders the 360° detail. A popstate listener keeps
 * the two in sync so browser back/forward and in-app navigation both work.
 */
const Customer360: React.FC<Customer360Props> = props => {
  const [route, setRoute] = useState<Customer360Route>(() => readRoute(props))

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onPopState = () => setRoute(readRoute(props))
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [props.type, props.id])

  const openCustomer = useCallback((type: CustomerSubjectType, id: string) => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams()
    params.set('type', type)
    params.set('id', id)
    params.set('tab', 'overview')
    window.history.pushState(null, '', `${window.location.pathname}?${params.toString()}`)
    setRoute({ type, id })
  }, [])

  if (!route.id) {
    return <Customer360Home {...props} openCustomer={openCustomer} />
  }

  return <Customer360Content {...props} subjectType={route.type} subjectId={route.id} />
}

export { Customer360, Customer360Content }
export type { Customer360Props }

export default Customer360
