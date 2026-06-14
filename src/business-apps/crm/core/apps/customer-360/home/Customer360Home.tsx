import React, { useMemo } from 'react'
import { PageLayout, useTranslation as useFluentTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { MODULE_COLORS } from '@/common/constants/ui'
import customer360I18n from '../_i18n'
import { useCustomerPortfolio } from '../data/portfolio/useCustomerPortfolio'
import { CUSTOMER_360_HOME_VIEWS, type Customer360HomeViewProps } from './types'
import { HOME_HEADER_ICON, HOME_VIEW_ICONS, HOME_VIEW_LABEL_KEYS, renderCustomer360HomeView } from './homeViews'
import { useCustomer360HomeRoute } from './useCustomer360HomeRoute'

const moduleColor = MODULE_COLORS.CRM

export interface Customer360HomeProps extends BusinessAppContextProps {
  openCustomer: (id: string) => void
}

/**
 * Customer360 Home — the portfolio product shell. Renders when no specific
 * customer is selected. Owns portfolio data + sub-view routing (`?view=`) and
 * delegates to the cockpit, explorer, inbound triage, renewals, analytics and
 * portfolio-agent views.
 */
const Customer360Home: React.FC<Customer360HomeProps> = ({ openCustomer, ...context }) => {
  const { t } = useFluentTranslation(customer360I18n)
  const { activeView, handleViewChange } = useCustomer360HomeRoute()
  const portfolio = useCustomerPortfolio(context)

  const viewProps: Customer360HomeViewProps = useMemo(
    () => ({ ...context, portfolio, openCustomer, onNavigateView: handleViewChange }),
    [context, portfolio, openCustomer, handleViewChange]
  )

  const subViewItems = useMemo(
    () =>
      CUSTOMER_360_HOME_VIEWS.map(view => ({
        value: view,
        label: t(HOME_VIEW_LABEL_KEYS[view]),
        icon: HOME_VIEW_ICONS[view]
      })),
    [t]
  )

  return (
    <div data-testid="customer-360-home">
      <PageLayout
        headerIcon={HOME_HEADER_ICON}
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
        <div className="gba:h-full gba:overflow-auto gba:p-4">{renderCustomer360HomeView(activeView, viewProps)}</div>
      </PageLayout>
    </div>
  )
}

export default Customer360Home
export { Customer360Home }
