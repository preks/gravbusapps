import React from 'react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from '@newwork/nw-design-system'
import { PremiumHeroShell } from './PremiumHeroShell'
import type { PremiumHeroTab, PremiumHeroChip, PremiumHeroInfoCard } from './types'

export interface PremiumHeroRecordProps {
  /** Module label (e.g. "IRM+") */
  moduleLabel?: string
  /** Breadcrumb path (PDF p95: "App Name / Breadcrumb View Name") */
  breadcrumbs?: Array<{ label: string; href?: string }>
  /** "Title Information" label above the content title (PDF p95) */
  titleInfo?: string
  /** Content Title — the entity name (PDF p95) */
  title: string
  /** Status chips next to or below the title (PDF p107: "C Corporation · Investment") */
  statusChips?: PremiumHeroChip[]
  /** Tabs at bottom of hero (PDF p95: Overview, Analytics, …) */
  tabs?: PremiumHeroTab[]
  /** Info cards on the hero (PDF p95: Foundation Date ×8, p107: investment summary) */
  infoCards?: PremiumHeroInfoCard[]
  /** Callback when tab changes */
  onTabChange?: (tabId: string) => void
  'data-testid'?: string
}

/**
 * Level 4 — Record / Detail (PDF p95–96, p107–109).
 *
 * Single entity view. Breadcrumb + module label, title info + content title,
 * status chips, info cards, and tabs. Tabs switch content below the hero.
 */
export const PremiumHeroRecord: React.FC<PremiumHeroRecordProps> = ({
  moduleLabel = 'IRM+',
  breadcrumbs = DEFAULT_BREADCRUMBS,
  titleInfo = 'Account Information',
  title = 'Contra Manufacturing',
  statusChips = DEFAULT_STATUS_CHIPS,
  tabs = DEFAULT_TABS,
  infoCards = DEFAULT_INFO_CARDS,
  onTabChange,
  'data-testid': testId = 'hero-record'
}) => {
  const [activeTab, setActiveTab] = React.useState(tabs[0]?.id ?? '')

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    onTabChange?.(value)
  }

  return (
    <div className="gba:flex gba:flex-col gba:bg-background" data-testid={testId}>
      <PremiumHeroShell height="400px" data-testid={`${testId}-shell`}>
        <div className="gba:relative gba:max-w-7xl gba:mx-auto gba:px-10 gba:flex gba:flex-col gba:justify-end gba:h-full gba:pb-0">
          {/* Breadcrumb + Module (PDF p95: "App Name / Breadcrumb View Name | Module") */}
          <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
            <Breadcrumb
              className="gba:[&_a]:text-inverse/60 gba:[&_a]:hover:text-inverse gba:[&_span]:text-inverse/80 gba:[&_svg]:text-inverse/40"
              data-testid={`${testId}-breadcrumb`}
            >
              {breadcrumbs.map((item, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <BreadcrumbSeparator />}
                  <BreadcrumbItem>
                    {i < breadcrumbs.length - 1 && item.href ? (
                      <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage>{item.label}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              ))}
            </Breadcrumb>
            {moduleLabel && (
              <span
                className="gba:text-xs gba:font-medium gba:text-inverse/50 gba:uppercase gba:tracking-wider"
                data-testid={`${testId}-module`}
              >
                {moduleLabel}
              </span>
            )}
          </div>

          {/* Title Information + Content Title (PDF p95) */}
          {titleInfo && (
            <p
              className="gba:text-xs gba:text-inverse/50 gba:uppercase gba:tracking-wider gba:mb-1"
              data-testid={`${testId}-title-info`}
            >
              {titleInfo}
            </p>
          )}
          <h1
            className="gba:font-funnel-display gba:text-4xl gba:font-light gba:text-inverse gba:tracking-tight"
            data-testid={`${testId}-title`}
          >
            {title}
          </h1>

          {/* Status chips (PDF p107: "C Corporation · Investment") */}
          {statusChips.length > 0 && (
            <div className="gba:flex gba:flex-wrap gba:gap-2 gba:mt-2 gba:mb-4" data-testid={`${testId}-status`}>
              {statusChips.map(c => (
                <span key={c.id} className="gba:text-xs gba:text-inverse/60">
                  {c.label}
                </span>
              ))}
            </div>
          )}

          {/* Info cards on hero (PDF p95: Foundation Date ×8) */}
          {infoCards.length > 0 && (
            <div className="gba:grid gba:grid-cols-4 gba:gap-3 gba:mb-4" data-testid={`${testId}-info-cards`}>
              {infoCards.map(card => (
                <Card
                  key={card.id}
                  variant="surface"
                  className="gba:backdrop-blur-xl gba:border-inverse/10"
                  data-testid={`${testId}-info-${card.id}`}
                >
                  <CardContent className="gba:p-3">
                    <p className="gba:text-xs gba:text-muted-foreground gba:mb-0.5">{card.title}</p>
                    <p className="gba:text-sm gba:font-medium gba:text-foreground">{card.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Tabs at bottom of hero (PDF p107: Overview | Analytics | …) */}
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

      {/* Tab content below hero */}
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

/* ── Default demo: Contra Manufacturing Account (PDF p107–109) ── */

const OverviewTab = () => (
  <div className="gba:space-y-6">
    <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="gba:space-y-2 gba:text-sm">
            <div className="gba:flex gba:justify-between">
              <dt className="gba:text-muted-foreground">Type</dt>
              <dd className="gba:font-medium">C Corporation · Investment</dd>
            </div>
            <div className="gba:flex gba:justify-between">
              <dt className="gba:text-muted-foreground">Employees</dt>
              <dd className="gba:font-medium">51–500</dd>
            </div>
            <div className="gba:flex gba:justify-between">
              <dt className="gba:text-muted-foreground">Revenue</dt>
              <dd className="gba:font-medium">100.000–500.000</dd>
            </div>
            <div className="gba:flex gba:justify-between">
              <dt className="gba:text-muted-foreground">Industry</dt>
              <dd className="gba:font-medium">Manufacturing</dd>
            </div>
            <div className="gba:flex gba:justify-between">
              <dt className="gba:text-muted-foreground">Website</dt>
              <dd className="gba:font-medium">contra.com</dd>
            </div>
            <div className="gba:flex gba:justify-between">
              <dt className="gba:text-muted-foreground">Address</dt>
              <dd className="gba:font-medium">Cora-Berliner-Straße 1, 10117 Berlin, DE</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="gba:text-sm gba:font-medium gba:text-foreground">Daniel Fischer</p>
          <p className="gba:text-xs gba:text-muted-foreground gba:mb-3">Analyst – Investments</p>
          <dl className="gba:space-y-2 gba:text-sm">
            <div className="gba:flex gba:justify-between">
              <dt className="gba:text-muted-foreground">Email</dt>
              <dd className="gba:font-medium">daniel.fischer@email.com</dd>
            </div>
            <div className="gba:flex gba:justify-between">
              <dt className="gba:text-muted-foreground">Phone</dt>
              <dd className="gba:font-medium">+49 30 1000003</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
    <Card>
      <CardHeader>
        <CardTitle>Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="gba:space-y-3 gba:text-sm">
          <li className="gba:flex gba:justify-between gba:items-start">
            <div>
              <p className="gba:font-medium gba:text-foreground">Monthly ESG Report</p>
              <p className="gba:text-xs gba:text-muted-foreground">Nov 11, 2025 · James Almera</p>
            </div>
            <span className="gba:text-xs gba:font-medium gba:px-2 gba:py-0.5 gba:rounded gba:bg-success-secondary gba:text-success-secondary-foreground">
              Completed
            </span>
          </li>
          <li className="gba:flex gba:justify-between gba:items-start">
            <div>
              <p className="gba:font-medium gba:text-foreground">Upload the Quarterly Report</p>
              <p className="gba:text-xs gba:text-muted-foreground">Nov 11, 2025 · James Almera</p>
            </div>
            <span className="gba:text-xs gba:font-medium gba:px-2 gba:py-0.5 gba:rounded gba:bg-destructive-secondary gba:text-destructive-secondary-foreground">
              Overdue
            </span>
          </li>
        </ul>
      </CardContent>
    </Card>
    <Card>
      <CardHeader>
        <CardTitle>Activities</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="gba:space-y-3 gba:text-sm">
          <li>
            <p className="gba:font-medium gba:text-foreground">Acquisition Closed</p>
            <p className="gba:text-xs gba:text-muted-foreground">
              Nov 30, 2025 · Minority stake (25%) acquired for €20,000,000
            </p>
          </li>
          <li>
            <p className="gba:font-medium gba:text-foreground">Due Diligence Completed</p>
            <p className="gba:text-xs gba:text-muted-foreground">
              Nov 25, 2025 · Financial, legal and ESG due diligence finalized
            </p>
          </li>
          <li>
            <p className="gba:font-medium gba:text-foreground">First Contact / Deal Initiated</p>
            <p className="gba:text-xs gba:text-muted-foreground">
              Nov 11, 2025 · Initial discussion with GammaMed management team
            </p>
          </li>
        </ul>
      </CardContent>
    </Card>
  </div>
)

const AnalyticsTab = () => (
  <div className="gba:space-y-6">
    <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-5">
      <Card>
        <CardHeader>
          <CardTitle>MOIC</CardTitle>
          <p className="gba:text-xs gba:text-muted-foreground">Market value / Invested capital</p>
        </CardHeader>
        <CardContent>
          <dl className="gba:space-y-3 gba:text-sm">
            <div>
              <dt className="gba:text-muted-foreground">Current</dt>
              <dd className="gba:text-2xl gba:font-bold gba:text-foreground">1.00 X</dd>
              <p className="gba:text-xs gba:text-muted-foreground">Calculated from market value</p>
            </div>
            <div>
              <dt className="gba:text-muted-foreground">Planned</dt>
              <dd className="gba:text-2xl gba:font-bold gba:text-foreground">2.50 X</dd>
              <p className="gba:text-xs gba:text-muted-foreground">Target multiplier</p>
            </div>
          </dl>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>IRR</CardTitle>
          <p className="gba:text-xs gba:text-muted-foreground">Annualized return based on cash-flow timing</p>
        </CardHeader>
        <CardContent>
          <dl className="gba:space-y-3 gba:text-sm">
            <div>
              <dt className="gba:text-muted-foreground">Current</dt>
              <dd className="gba:text-2xl gba:font-bold gba:text-foreground">0.0 %</dd>
              <p className="gba:text-xs gba:text-muted-foreground">Actual return rate</p>
            </div>
            <div>
              <dt className="gba:text-muted-foreground">Planned</dt>
              <dd className="gba:text-2xl gba:font-bold gba:text-foreground">Not set</dd>
              <p className="gba:text-xs gba:text-muted-foreground">Set target IRR</p>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
    <Card>
      <CardHeader>
        <CardTitle>Shareholder Structure</CardTitle>
        <p className="gba:text-xs gba:text-muted-foreground">Ownership distribution</p>
      </CardHeader>
      <CardContent>
        <dl className="gba:space-y-2 gba:text-sm">
          <div className="gba:flex gba:justify-between">
            <dt className="gba:text-muted-foreground">Your stake</dt>
            <dd className="gba:font-medium">25%</dd>
          </div>
          <div className="gba:flex gba:justify-between">
            <dt className="gba:text-muted-foreground">Founders / Management</dt>
            <dd className="gba:font-medium">35%</dd>
          </div>
          <div className="gba:flex gba:justify-between">
            <dt className="gba:text-muted-foreground">Other investors</dt>
            <dd className="gba:font-medium">40%</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  </div>
)

const DEFAULT_BREADCRUMBS = [
  { label: 'Investment Relations', href: '#' },
  { label: 'Accounts', href: '#' },
  { label: 'Contra Manufacturing' }
]

const DEFAULT_STATUS_CHIPS: PremiumHeroChip[] = [
  { id: 'type', label: 'C Corporation · Investment' },
  { id: 'size', label: '51–500 employees' },
  { id: 'industry', label: 'Manufacturing' }
]

const DEFAULT_INFO_CARDS: PremiumHeroInfoCard[] = [
  { id: 'foundation', title: 'Foundation Date', value: 'Nov 29, 2025' },
  { id: 'acquisition', title: 'Acquisition Date', value: 'Nov 30, 2025' },
  { id: 'total-inv', title: 'Total Investment', value: '€ 20,000,000' },
  { id: 'market-val', title: 'Market Value', value: '€ 20,000,000' },
  { id: 'stake-type', title: 'Stake Type', value: 'Minority Stake' },
  { id: 'stake-pct', title: 'Stake %', value: '25 %' },
  { id: 'turnover', title: 'Turnover', value: '€ 10,000' },
  { id: 'ebitda', title: 'EBITDA', value: '€ 10,000' }
]

const DEFAULT_TABS: PremiumHeroTab[] = [
  { id: 'overview', label: 'Overview', content: <OverviewTab /> },
  { id: 'analytics', label: 'Analytics', content: <AnalyticsTab /> },
  { id: 'tiles', label: 'Tiles' },
  { id: 'divestments', label: 'Divestments' },
  { id: 'documents', label: 'Documents' },
  { id: 'reports', label: 'Reports' }
]

export default PremiumHeroRecord
