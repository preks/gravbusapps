import React from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Chip,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from '@newwork/nw-design-system'
import { PremiumHeroShell } from './PremiumHeroShell'
import type { PremiumHeroTab, PremiumHeroChip } from './types'

export interface PremiumHeroAppProps {
  /** Module label (e.g. "IRM+") */
  moduleLabel?: string
  /** App name — prominent title (e.g. "Investment Relations") */
  appName: string
  /** Optional description below app name */
  description?: string
  /** Tab bar at bottom of hero (PDF p91) */
  tabs?: PremiumHeroTab[]
  /** Optional action buttons at the right of the header area */
  actionButtons?: PremiumHeroChip[]
  /** Optional right-side ReactNode for custom actions (buttons, dropdowns) */
  actions?: React.ReactNode
  /** Callback when tab changes */
  onTabChange?: (tabId: string) => void
  'data-testid'?: string
}

/**
 * Level 2 — App (PDF p91–92, p102–105).
 *
 * An app within a module. Clean, spacious header with module label + app name +
 * optional description. Tab bar sits at the bottom of the hero, bridging into
 * the content area below. Content (KPIs, data) is below the hero.
 */
export const PremiumHeroApp: React.FC<PremiumHeroAppProps> = ({
  moduleLabel = 'IRM+',
  appName = 'Investment Relations',
  description,
  tabs = DEFAULT_TABS,
  actionButtons,
  actions,
  onTabChange,
  'data-testid': testId = 'hero-app'
}) => {
  const [activeTab, setActiveTab] = React.useState(tabs[0]?.id ?? '')

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    onTabChange?.(value)
  }

  return (
    <div className="gba:flex gba:flex-col gba:bg-background" data-testid={testId}>
      <PremiumHeroShell height="220px" data-testid={`${testId}-shell`}>
        <div className="gba:relative gba:max-w-7xl gba:mx-auto gba:px-10 gba:flex gba:flex-col gba:h-full">
          {/* Header area: module + title + description + actions */}
          <div className="gba:flex gba:items-start gba:justify-between gba:gap-6 gba:pt-8 gba:flex-1">
            <div className="gba:flex gba:flex-col gba:gap-1">
              {moduleLabel && (
                <span
                  className="gba:text-xs gba:font-medium gba:tracking-[0.2em] gba:text-inverse/50 gba:uppercase"
                  data-testid={`${testId}-module`}
                >
                  {moduleLabel}
                </span>
              )}
              <h1
                className="gba:font-funnel-display gba:text-3xl gba:font-light gba:text-inverse gba:tracking-tight"
                data-testid={`${testId}-app-name`}
              >
                {appName}
              </h1>
              {description && (
                <p className="gba:text-sm gba:text-inverse/60 gba:mt-0.5" data-testid={`${testId}-desc`}>
                  {description}
                </p>
              )}
            </div>
            {(actions || (actionButtons && actionButtons.length > 0)) && (
              <div className="gba:flex gba:items-center gba:gap-2 gba:pt-1">
                {actions}
                {actionButtons?.map(b => (
                  <Chip key={b.id} onClick={b.onClick} data-testid={`${testId}-btn-${b.id}`}>
                    {b.label}
                  </Chip>
                ))}
              </div>
            )}
          </div>

          {/* Tab bar at bottom of hero */}
          {tabs.length > 0 && (
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList
                className="gba:bg-transparent gba:border-0 gba:p-0 gba:h-10 gba:gap-0"
                data-testid={`${testId}-tabs`}
              >
                {tabs.map(t => (
                  <TabsTrigger
                    key={t.id}
                    value={t.id}
                    className="gba:text-inverse/60 gba:text-sm gba:px-4 gba:h-10 gba:rounded-none gba:border-b-2 gba:border-transparent gba:data-[state=active]:border-inverse gba:data-[state=active]:text-inverse gba:data-[state=active]:bg-transparent"
                    data-testid={`${testId}-tab-${t.id}`}
                  >
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
        </div>
      </PremiumHeroShell>

      {/* Content area — BELOW the hero */}
      <div className="gba:max-w-7xl gba:mx-auto gba:px-10 gba:py-6 gba:w-full">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          {tabs.map(t => (
            <TabsContent key={t.id} value={t.id} className="gba:mt-0">
              {t.content}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  )
}

/* ── Default demo: IRM+ Investment Relations (PDF p102–105) ── */

const DashboardTab = () => (
  <div className="gba:space-y-6">
    <h2 className="gba:text-lg gba:font-semibold gba:text-foreground">Investment KPIs</h2>
    <div className="gba:grid gba:grid-cols-2 gba:md:grid-cols-4 gba:gap-4">
      {[
        {
          label: 'Total Investments',
          value: '23',
          change: '+130.0%',
          dir: 'up' as const,
          sub: 'vs last quarter · All types'
        },
        {
          label: 'Total Invested',
          value: '€ 468 M',
          change: '>+1000%',
          dir: 'up' as const,
          sub: 'vs last quarter · Total capital'
        },
        {
          label: 'Average Stake %',
          value: '24.5 %',
          change: '-5.8',
          dir: 'down' as const,
          sub: 'vs last quarter · Portfolio avg'
        },
        {
          label: 'Total Market Value',
          value: '€ 469.8 M',
          change: '+778.5%',
          dir: 'up' as const,
          sub: 'vs last quarter · Current valuation'
        }
      ].map(k => (
        <Card key={k.label}>
          <CardContent className="gba:p-5">
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-1">
              <p className="gba:text-xs gba:text-muted-foreground">{k.label}</p>
              <span
                className={`gba:text-xs gba:font-semibold ${k.dir === 'up' ? 'gba:text-success-foreground' : 'gba:text-destructive-foreground'}`}
              >
                {k.change}
              </span>
            </div>
            <p className="gba:text-2xl gba:font-bold gba:text-foreground">{k.value}</p>
            <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">{k.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>

    <h2 className="gba:text-lg gba:font-semibold gba:text-foreground">Investment Groups</h2>
    <p className="gba:text-sm gba:text-muted-foreground">57 total investments across 3 groups</p>
    <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4">
      {[
        {
          group: 'Equity',
          count: '19 investments in EUR',
          change: '+377.1%',
          invested: '€ 468 M',
          value: '€ 48.2 M',
          irr: '14.6%'
        },
        {
          group: 'Liquid Fund',
          count: '6 investments in EUR',
          change: '+24.6%',
          invested: '€ 62.4 M',
          value: '€ 64.1 M',
          irr: '5.1%'
        },
        {
          group: 'Real Estate',
          count: '20 investments in EUR',
          change: '+12.8%',
          invested: '€ 145 M',
          value: '€ 168.5 M',
          irr: '13.2%'
        }
      ].map(g => (
        <Card key={g.group}>
          <CardHeader className="gba:pb-2">
            <CardTitle className="gba:text-base">{g.group}</CardTitle>
            <p className="gba:text-xs gba:text-muted-foreground">{g.count}</p>
          </CardHeader>
          <CardContent className="gba:pt-0">
            <p className="gba:text-xs gba:text-success-foreground gba:mb-2">Last quarter activity {g.change}</p>
            <dl className="gba:space-y-1 gba:text-sm">
              <div className="gba:flex gba:justify-between">
                <dt className="gba:text-muted-foreground">Total invested</dt>
                <dd className="gba:font-medium">{g.invested}</dd>
              </div>
              <div className="gba:flex gba:justify-between">
                <dt className="gba:text-muted-foreground">Current value</dt>
                <dd className="gba:font-medium">{g.value}</dd>
              </div>
              <div className="gba:flex gba:justify-between">
                <dt className="gba:text-muted-foreground">Net IRR</dt>
                <dd className="gba:font-medium">{g.irr}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
)

const InvestmentsTab = () => (
  <div className="gba:space-y-5">
    <div>
      <h2 className="gba:text-lg gba:font-semibold gba:text-foreground">Investment Portfolio</h2>
      <p className="gba:text-sm gba:text-muted-foreground">
        Manage and track investment portfolio across asset classes
      </p>
    </div>
    <div className="gba:grid gba:grid-cols-2 gba:md:grid-cols-4 gba:gap-4">
      {[
        { label: 'Total Investments', value: '23', change: '+130.0%', dir: 'up' as const },
        { label: 'Total Invested', value: '€ 468 M', change: '>+1000%', dir: 'up' as const },
        { label: 'Avg Stake %', value: '24.5 %', change: '-5.8', dir: 'down' as const },
        { label: 'Total Market Value', value: '€ 469.8 M', change: '+778.5%', dir: 'up' as const }
      ].map(k => (
        <Card key={k.label}>
          <CardContent className="gba:p-5">
            <p className="gba:text-xs gba:text-muted-foreground gba:mb-1">{k.label}</p>
            <p className="gba:text-2xl gba:font-bold gba:text-foreground">{k.value}</p>
            <p
              className={`gba:text-xs gba:font-medium gba:mt-1 ${k.dir === 'up' ? 'gba:text-success-foreground' : 'gba:text-destructive-foreground'}`}
            >
              {k.change}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
    <Card>
      <CardContent className="gba:p-0">
        <table className="gba:w-full gba:text-sm">
          <thead>
            <tr className="gba:border-b gba:border-border">
              <th className="gba:text-left gba:px-4 gba:py-3 gba:text-muted-foreground gba:font-medium">Investment</th>
              <th className="gba:text-left gba:px-4 gba:py-3 gba:text-muted-foreground gba:font-medium">Group</th>
              <th className="gba:text-left gba:px-4 gba:py-3 gba:text-muted-foreground gba:font-medium">Type</th>
              <th className="gba:text-right gba:px-4 gba:py-3 gba:text-muted-foreground gba:font-medium">
                Total Investment
              </th>
              <th className="gba:text-left gba:px-4 gba:py-3 gba:text-muted-foreground gba:font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {[
              { name: 'Series C Amadons', group: 'Equity', type: 'Pharma', amount: '$45,000', status: 'Active' },
              { name: 'TechNova AG', group: 'Equity', type: 'Technology', amount: '$10,000,000', status: 'Active' },
              {
                name: 'Minority Contra',
                group: 'Real Estate',
                type: 'Existing Properties',
                amount: '$44,626,000',
                status: 'On hold'
              },
              { name: 'AlphaTech GmbH', group: 'Equity', type: 'Co-Investments', amount: '$1,599', status: 'Active' },
              { name: 'Majority Centauri', group: 'Equity', type: 'Technology', amount: '$100,800', status: 'Active' }
            ].map(r => (
              <tr key={r.name} className="gba:border-b gba:border-border">
                <td className="gba:px-4 gba:py-3 gba:font-medium gba:text-foreground">{r.name}</td>
                <td className="gba:px-4 gba:py-3 gba:text-muted-foreground">{r.group}</td>
                <td className="gba:px-4 gba:py-3 gba:text-muted-foreground">{r.type}</td>
                <td className="gba:px-4 gba:py-3 gba:text-right gba:text-foreground">{r.amount}</td>
                <td className="gba:px-4 gba:py-3">
                  <span
                    className={`gba:text-xs gba:font-medium gba:px-2 gba:py-0.5 gba:rounded ${
                      r.status === 'Active'
                        ? 'gba:bg-success-secondary gba:text-success-secondary-foreground'
                        : 'gba:bg-warning-secondary gba:text-warning-secondary-foreground'
                    }`}
                  >
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  </div>
)

const DEFAULT_TABS: PremiumHeroTab[] = [
  { id: 'dashboard', label: 'Dashboard', content: <DashboardTab /> },
  { id: 'leads', label: 'Leads' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'contacts', label: 'Contacts' },
  { id: 'investments', label: 'Investments', content: <InvestmentsTab /> },
  { id: 'analytics', label: 'Analytics' }
]

export default PremiumHeroApp
