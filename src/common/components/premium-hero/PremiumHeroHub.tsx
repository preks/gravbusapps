import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Chip } from '@newwork/nw-design-system'
import { PremiumHeroShell } from './PremiumHeroShell'
import type { PremiumHeroChip, PremiumHeroKpiItem } from './types'

export interface HubInfoCard {
  id: string
  title: string
  items: Array<{ text: string; badge?: string; badgeColor?: 'info' | 'destructive' | 'warning' }>
}

export interface PremiumHeroHubProps {
  /** Module label (e.g. "IRM+ Hub") */
  moduleLabel?: string
  /** Section header / title */
  title: string
  /** Subheader */
  subtitle?: string
  /** Secondary chips ON the hero (PDF p89: 2 secondary) */
  chips?: PremiumHeroChip[]
  /** KPI strip on the hero (PDF p89: 5 items, p100: 7 items) */
  kpiStrip?: PremiumHeroKpiItem[]
  /** Info cards on the hero (PDF p100: "What's New", "Next 90 Days") */
  infoCards?: HubInfoCard[]
  /** Action chips below hero */
  actionChips?: PremiumHeroChip[]
  /** Content sections below */
  children?: React.ReactNode
  'data-testid'?: string
}

/**
 * Level 1 — Hub (PDF p89–90, p100).
 *
 * Module entry point. IRM+ Hub, HR+ Hub, Sales+ Hub, etc.
 * Hero contains: module label, section header, subheader, secondary chips,
 * KPI strip, and info cards. Action chips and content below.
 */
export const PremiumHeroHub: React.FC<PremiumHeroHubProps> = ({
  moduleLabel = 'IRM+ Hub',
  title = 'Portfolio Overview',
  subtitle,
  chips = DEFAULT_CHIPS,
  kpiStrip = DEFAULT_KPI,
  infoCards = DEFAULT_INFO,
  actionChips = DEFAULT_ACTIONS,
  children,
  'data-testid': testId = 'hero-hub'
}) => {
  return (
    <div className="gba:flex gba:flex-col gba:bg-background" data-testid={testId}>
      <PremiumHeroShell height="520px" data-testid={`${testId}-shell`}>
        <div className="gba:relative gba:max-w-7xl gba:mx-auto gba:px-10 gba:pt-8 gba:pb-10 gba:flex gba:flex-col gba:justify-end gba:h-full">
          {/* Module label */}
          {moduleLabel && (
            <span
              className="gba:block gba:text-xs gba:font-medium gba:text-inverse/60 gba:uppercase gba:tracking-wider gba:mb-3"
              data-testid={`${testId}-module`}
            >
              {moduleLabel}
            </span>
          )}

          {/* Section Header + Subheader (PDF p89) */}
          <h1
            className="gba:font-funnel-display gba:text-4xl gba:font-light gba:text-inverse gba:tracking-tight"
            data-testid={`${testId}-title`}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="gba:text-sm gba:text-inverse/60 gba:mt-2 gba:mb-6" data-testid={`${testId}-subtitle`}>
              {subtitle}
            </p>
          )}

          {/* Secondary chips (PDF p89) */}
          {chips.length > 0 && (
            <div className="gba:flex gba:flex-wrap gba:gap-2 gba:mb-5" data-testid={`${testId}-chips`}>
              {chips.map(c => (
                <Chip key={c.id} onClick={c.onClick} data-testid={`${testId}-chip-${c.id}`}>
                  {c.label}
                </Chip>
              ))}
            </div>
          )}

          {/* KPI strip (PDF p89: 5 cards, p100: 7 items) */}
          {kpiStrip.length > 0 && (
            <div className="gba:flex gba:flex-wrap gba:gap-3 gba:mb-5" data-testid={`${testId}-kpi-strip`}>
              {kpiStrip.map(k => (
                <Card
                  key={k.id}
                  variant="surface"
                  className="gba:backdrop-blur-xl gba:border-inverse/10 gba:min-w-[140px] gba:flex-1"
                  data-testid={`${testId}-kpi-${k.id}`}
                >
                  <CardContent className="gba:p-4">
                    <p className="gba:text-xs gba:text-muted-foreground gba:mb-1">{k.label}</p>
                    <p className="gba:text-xl gba:font-semibold gba:text-foreground">{k.value}</p>
                    {k.change && (
                      <p
                        className={`gba:text-xs gba:font-medium gba:mt-0.5 ${
                          k.changeDirection === 'down'
                            ? 'gba:text-destructive-foreground'
                            : 'gba:text-success-foreground'
                        }`}
                      >
                        {k.change}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Info cards (PDF p100: "What's New", "Next 90 Days") */}
          {infoCards.length > 0 && (
            <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4" data-testid={`${testId}-info`}>
              {infoCards.map(card => (
                <Card
                  key={card.id}
                  variant="decorative"
                  className="gba:backdrop-blur-xl"
                  data-testid={`${testId}-info-${card.id}`}
                >
                  <CardHeader className="gba:pb-2">
                    <CardTitle className="gba:text-base">{card.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="gba:pt-0">
                    <ul className="gba:space-y-2">
                      {card.items.map((item, i) => (
                        <li key={i} className="gba:flex gba:items-center gba:justify-between gba:text-sm">
                          <span className="gba:text-muted-foreground">{item.text}</span>
                          {item.badge && (
                            <span
                              className={`gba:text-xs gba:font-medium gba:px-1.5 gba:py-0.5 gba:rounded ${
                                item.badgeColor === 'destructive'
                                  ? 'gba:bg-destructive-secondary gba:text-destructive-secondary-foreground'
                                  : item.badgeColor === 'warning'
                                    ? 'gba:bg-warning-secondary gba:text-warning-secondary-foreground'
                                    : 'gba:bg-info-secondary gba:text-info-foreground'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </PremiumHeroShell>

      {/* Action chips + content below hero */}
      <div className="gba:max-w-7xl gba:mx-auto gba:px-10 gba:w-full">
        {actionChips.length > 0 && (
          <div className="gba:flex gba:flex-wrap gba:gap-2.5 gba:pt-5" data-testid={`${testId}-actions`}>
            {actionChips.map(c => (
              <Chip key={c.id} onClick={c.onClick} data-testid={`${testId}-action-${c.id}`}>
                {c.label}
              </Chip>
            ))}
          </div>
        )}
        {children && <div className="gba:pt-6">{children}</div>}
      </div>
    </div>
  )
}

/* ── Default demo data (PDF p100 — IRM+ Hub) ── */

const DEFAULT_CHIPS: PremiumHeroChip[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'analytics', label: 'Analytics' }
]

const DEFAULT_KPI: PremiumHeroKpiItem[] = [
  { id: 'portfolio', label: 'Total Portfolio Value', value: '€ 469.8 M', change: '+7.2% QoQ', changeDirection: 'up' },
  { id: 'invested', label: 'Invested Capital', value: '€ 468 M' },
  { id: 'irr', label: 'Net IRR', value: '14.3%' },
  { id: 'moic', label: 'MOIC', value: '1.42×' },
  { id: 'active', label: 'Active Investments', value: '23' },
  { id: 'funds', label: 'Funds / Vehicles', value: '3' },
  { id: 'target', label: 'Target IRR', value: '12%' }
]

const DEFAULT_INFO: HubInfoCard[] = [
  {
    id: 'whats-new',
    title: "What's New / What Changed",
    items: [
      { text: 'Acquisition closed: GammaMed – 25 %, €20 M', badge: 'New', badgeColor: 'info' },
      { text: 'Valuation update: TechNova AG +18 % vs last quarter' },
      { text: 'Risk flag: AISeeds GmbH – burn rate +22 %', badge: 'Risk', badgeColor: 'destructive' },
      { text: 'Distribution received: Liquid Fund I – €3.4 M' }
    ]
  },
  {
    id: 'next-90',
    title: 'Next 90 Days – Outlook',
    items: [
      { text: 'Expected Cash In: €18.6 M' },
      { text: 'Expected Cash Out: €12.2 M' },
      { text: 'Planned Closings: 2 · Potential Exits: 1' },
      { text: 'Capital Calls Expected: €9.0 M' }
    ]
  }
]

const DEFAULT_ACTIONS: PremiumHeroChip[] = [
  { id: '1', label: 'Add new lead' },
  { id: '2', label: 'Create opportunity' },
  { id: '3', label: 'Add contact' },
  { id: '4', label: 'Add account' },
  { id: '5', label: 'Add investment' },
  { id: '6', label: 'Generate report' }
]

export default PremiumHeroHub
