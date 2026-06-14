import React from 'react'
import {
  CalendarCheckIcon,
  ChartLineUpIcon,
  RobotIcon,
  SquaresFourIcon,
  TableIcon,
  TrayIcon
} from '@phosphor-icons/react'
import type { Customer360HomeViewKey, Customer360HomeViewProps } from './types'
import AnalyticsView from './views/analytics/AnalyticsView'
import CockpitView from './views/cockpit/CockpitView'
import PortfolioAgentView from './views/agent/PortfolioAgentView'
import ExplorerView from './views/explorer/ExplorerView'
import InboundView from './views/inbound/InboundView'
import RenewalsView from './views/renewals/RenewalsView'

export { SquaresFourIcon as HOME_HEADER_ICON } from '@phosphor-icons/react'

export const HOME_VIEW_ICONS: Record<Customer360HomeViewKey, React.ReactNode> = {
  cockpit: <SquaresFourIcon />,
  explorer: <TableIcon />,
  inbound: <TrayIcon />,
  renewals: <CalendarCheckIcon />,
  analytics: <ChartLineUpIcon />,
  agent: <RobotIcon />
}

export const HOME_VIEW_LABEL_KEYS: Record<Customer360HomeViewKey, string> = {
  cockpit: 'home-tab-cockpit',
  explorer: 'home-tab-explorer',
  inbound: 'home-tab-inbound',
  renewals: 'home-tab-renewals',
  analytics: 'home-tab-analytics',
  agent: 'home-tab-agent'
}

export function renderCustomer360HomeView(activeView: Customer360HomeViewKey, viewProps: Customer360HomeViewProps) {
  switch (activeView) {
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
