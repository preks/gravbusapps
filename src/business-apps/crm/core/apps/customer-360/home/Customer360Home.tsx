import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { PageLayout, useTranslation as useFluentTranslation } from '@newwork/nw-design-system'
import {
  SquaresFourIcon,
  WarningCircleIcon,
  TableIcon,
  TrayIcon,
  CalendarCheckIcon,
  ChartLineUpIcon,
  RobotIcon
} from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { MODULE_COLORS } from '@/common/constants/ui'
import customer360I18n from '../_i18n'
import { useCustomerPortfolio } from '../data/portfolio/useCustomerPortfolio'
import type { CustomerSubjectType } from '../data/types'
import {
  CUSTOMER_360_HOME_VIEWS,
  DEFAULT_HOME_VIEW,
  type Customer360HomeViewKey,
  type Customer360HomeViewProps
} from './types'
import CockpitView from './views/cockpit/CockpitView'
import WorklistView from './views/worklist/WorklistView'
import ExplorerView from './views/explorer/ExplorerView'
import InboundView from './views/inbound/InboundView'
import RenewalsView from './views/renewals/RenewalsView'
import AnalyticsView from './views/analytics/AnalyticsView'
import PortfolioAgentView from './views/agent/PortfolioAgentView'

const moduleColor = MODULE_COLORS.CRM

export interface Customer360HomeProps extends BusinessAppContextProps {
  openCustomer: (type: CustomerSubjectType, id: string) => void
}

function readViewFromUrl(): Customer360HomeViewKey {
  if (typeof window === 'undefined') return DEFAULT_HOME_VIEW
  const view = new URLSearchParams(window.location.search).get('view') || DEFAULT_HOME_VIEW
  return (CUSTOMER_360_HOME_VIEWS as readonly string[]).includes(view)
    ? (view as Customer360HomeViewKey)
    : DEFAULT_HOME_VIEW
}

const VIEW_ICONS: Record<Customer360HomeViewKey, React.ReactNode> = {
  cockpit: <SquaresFourIcon />,
  worklist: <WarningCircleIcon />,
  explorer: <TableIcon />,
  inbound: <TrayIcon />,
  renewals: <CalendarCheckIcon />,
  analytics: <ChartLineUpIcon />,
  agent: <RobotIcon />
}

const VIEW_LABEL_KEYS: Record<Customer360HomeViewKey, string> = {
  cockpit: 'home-tab-cockpit',
  worklist: 'home-tab-worklist',
  explorer: 'home-tab-explorer',
  inbound: 'home-tab-inbound',
  renewals: 'home-tab-renewals',
  analytics: 'home-tab-analytics',
  agent: 'home-tab-agent'
}

/**
 * Customer360 Home — the portfolio product shell. Renders when no specific
 * customer is selected. Owns portfolio data + sub-view routing (`?view=`) and
 * delegates to the cockpit, attention worklist, explorer, inbound triage,
 * renewals, analytics and portfolio-agent views.
 */
const Customer360Home: React.FC<Customer360HomeProps> = ({ openCustomer, ...context }) => {
  const { t } = useFluentTranslation(customer360I18n)
  const [activeView, setActiveView] = useState<Customer360HomeViewKey>(readViewFromUrl)

  const portfolio = useCustomerPortfolio(context)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (!params.get('view')) {
      params.set('view', activeView)
      window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`)
    }
  }, []) // seed default view in URL on initial mount

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onPopState = () => setActiveView(readViewFromUrl())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const handleViewChange = useCallback((value: string) => {
    if (!(CUSTOMER_360_HOME_VIEWS as readonly string[]).includes(value)) return
    const next = value as Customer360HomeViewKey
    setActiveView(next)
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    params.set('view', next)
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`)
  }, [])

  const viewProps: Customer360HomeViewProps = useMemo(
    () => ({ ...context, portfolio, openCustomer, onNavigateView: handleViewChange }),
    [context, portfolio, openCustomer, handleViewChange]
  )

  const subViewItems = useMemo(
    () =>
      CUSTOMER_360_HOME_VIEWS.map(view => ({
        value: view,
        label: t(VIEW_LABEL_KEYS[view]),
        icon: VIEW_ICONS[view]
      })),
    [t]
  )

  const renderView = () => {
    switch (activeView) {
      case 'worklist':
        return <WorklistView {...viewProps} />
      case 'explorer':
        return <ExplorerView {...viewProps} />
      case 'inbound':
        return <InboundView {...viewProps} />
      case 'renewals':
        return <RenewalsView {...viewProps} />
      case 'analytics':
        return <AnalyticsView {...viewProps} />
      case 'agent':
        return <PortfolioAgentView {...viewProps} />
      default:
        return <CockpitView {...viewProps} />
    }
  }

  return (
    <div data-testid="customer-360-home">
      <PageLayout
        headerIcon={SquaresFourIcon}
        headerTitle={t('home-title')}
        headerDescription={t('home-description')}
        headerSubViews={{
          value: activeView,
          onValueChange: handleViewChange,
          items: subViewItems
        }}
        variant={moduleColor}
        className="gba:min-h-screen"
      >
        <div className="gba:h-full gba:overflow-auto gba:p-4">{renderView()}</div>
      </PageLayout>
    </div>
  )
}

export default Customer360Home
export { Customer360Home }
