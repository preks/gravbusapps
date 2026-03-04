import React, { useMemo, useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@newwork/nw-design-system'
import { ChartBarIcon, UsersIcon, BankIcon, CurrencyCircleDollarIcon, AddressBookIcon } from '@phosphor-icons/react'

import { OverviewTabLayout, OverviewTabLayoutProps } from './overview/OverviewTabLayout'
import { LeadsTabLayout, LeadsTabLayoutProps } from './leads/LeadsTabLayout'
import { AccountsTabLayout, AccountsTabLayoutProps } from './accounts/AccountsTabLayout'
import { OpportunitiesTabLayout, OpportunitiesTabLayoutProps } from './opportunities/OpportunitiesTabLayout'
import ContactsTabLayout, { ContactsTabLayoutProps } from './contacts/ContactsTabLayout'

export type AnalyticsTabKey = 'overview' | 'leads' | 'accounts' | 'opportunities' | 'contacts'

export interface AnalyticsLayoutProps {
  defaultTab?: AnalyticsTabKey
  onTabChange?: (tab: AnalyticsTabKey) => void
  overviewProps?: OverviewTabLayoutProps
  leadsProps?: LeadsTabLayoutProps
  accountsProps?: AccountsTabLayoutProps
  opportunitiesProps?: OpportunitiesTabLayoutProps
  contactsProps?: ContactsTabLayoutProps
  moduleColor?: string
}

export const AnalyticsLayout: React.FC<AnalyticsLayoutProps> = ({
  defaultTab = 'overview',
  onTabChange,
  overviewProps,
  leadsProps,
  accountsProps,
  opportunitiesProps,
  contactsProps,
  moduleColor
}) => {
  const tabs = useMemo(() => {
    const items: Array<{ key: AnalyticsTabKey; label: string; icon: React.ReactNode; content: React.ReactNode }> = []
    if (overviewProps) {
      items.push({
        key: 'overview',
        label: 'Overview',
        icon: <ChartBarIcon size={16} className="gba:mr-2" />,
        content: <OverviewTabLayout moduleColor={moduleColor} {...overviewProps} />
      })
    }
    if (leadsProps) {
      items.push({
        key: 'leads',
        label: 'Leads',
        icon: <UsersIcon size={16} className="gba:mr-2" />,
        content: <LeadsTabLayout moduleColor={moduleColor} {...leadsProps} />
      })
    }
    if (accountsProps) {
      items.push({
        key: 'accounts',
        label: 'Accounts',
        icon: <BankIcon size={16} className="gba:mr-2" />,
        content: <AccountsTabLayout moduleColor={moduleColor} {...accountsProps} />
      })
    }
    if (opportunitiesProps) {
      items.push({
        key: 'opportunities',
        label: 'Opportunities',
        icon: <CurrencyCircleDollarIcon size={16} className="gba:mr-2" />,
        content: <OpportunitiesTabLayout moduleColor={moduleColor} {...opportunitiesProps} />
      })
    }
    if (contactsProps) {
      items.push({
        key: 'contacts',
        label: 'Contacts',
        icon: <AddressBookIcon size={16} className="gba:mr-2" />,
        content: <ContactsTabLayout moduleColor={moduleColor} {...contactsProps} />
      })
    }
    return items
  }, [overviewProps, leadsProps, accountsProps, opportunitiesProps, contactsProps])

  const [internalTab, setInternalTab] = useState<AnalyticsTabKey>(defaultTab)

  // Sync internal state with defaultTab prop changes
  useEffect(() => {
    setInternalTab(defaultTab)
  }, [defaultTab])

  const activeTab = internalTab

  const handleTabChange = (key: string) => {
    const k = key as AnalyticsTabKey
    setInternalTab(k)
    onTabChange?.(k)
  }

  return (
    <div data-testid="analytics-layout" className="gba:h-full">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="gba:h-full" data-testid="analytics-tabs">
        <TabsList className="gba:mb-6 gba:grid gba:w-full gba:grid-cols-5">
          {tabs.map(t => (
            <TabsTrigger key={t.key} value={t.key} data-testid={`${t.key}-analytics-tab`}>
              {t.icon}
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map(t => (
          <TabsContent key={t.key} value={t.key} className="gba:h-full gba:overflow-auto">
            {t.content}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

export default AnalyticsLayout
