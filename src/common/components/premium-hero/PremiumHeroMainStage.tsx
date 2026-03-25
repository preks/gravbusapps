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
  TabsContent,
  Input
} from '@newwork/nw-design-system'
import { PremiumHeroShell } from './PremiumHeroShell'
import type { PremiumHeroChip, PremiumHeroTab } from './types'

export interface HeroCard {
  id: string
  title: string
  subtitle?: string
  content: React.ReactNode
}

export interface PremiumHeroMainStageProps {
  /** Greeting line, e.g. "Hey John, good morning." */
  greeting?: string
  /** Brand label above the main title (e.g. "NEWWORK") */
  brandLabel?: string
  /** Main hero title (e.g. "Intelligent Workplace") */
  title?: string
  /** Stage tabs: Start View, Stage View 1, … (PDF p115–121) */
  stageTabs?: PremiumHeroTab[]
  /** Cards sitting on the hero gradient (PDF p112: Morning Briefing + Key Insights) */
  heroCards?: HeroCard[]
  /** Quick-action chips (always present, PDF p88) */
  chips?: PremiumHeroChip[]
  /** Search bar placeholder */
  searchPlaceholder?: string
  /** Content tabs below hero: My Briefing, My Team, My News, My KPIs (PDF p122–126) */
  contentTabs?: PremiumHeroTab[]
  'data-testid'?: string
}

/**
 * Level 0 — Main Stage / Intelligent Workplace (PDF p88, p112–130).
 *
 * The home screen. Tall hero (~520px) with greeting, brand label, large title,
 * optional stage tabs, hero cards (Morning Briefing + Key Insights), action chips,
 * and search bar. Content tabs below for My Briefing, My Team, My News, My KPIs.
 */
export const PremiumHeroMainStage: React.FC<PremiumHeroMainStageProps> = ({
  greeting = 'Hey John, good morning.',
  brandLabel = 'NEWWORK',
  title = 'Intelligent Workplace',
  stageTabs,
  heroCards = DEFAULT_HERO_CARDS,
  chips = DEFAULT_CHIPS,
  searchPlaceholder = 'Search or send message to Every',
  contentTabs = DEFAULT_CONTENT_TABS,
  'data-testid': testId = 'hero-main-stage'
}) => {
  const [activeStage, setActiveStage] = React.useState(stageTabs?.[0]?.id ?? '')
  const [activeContent, setActiveContent] = React.useState(contentTabs[0]?.id ?? '')

  return (
    <div className="gba:flex gba:flex-col gba:bg-background" data-testid={testId}>
      <PremiumHeroShell height="520px" data-testid={`${testId}-shell`}>
        <div className="gba:relative gba:max-w-7xl gba:mx-auto gba:px-10 gba:flex gba:flex-col gba:h-full">
          {/* Top bar: greeting + stage tabs */}
          <div className="gba:flex gba:items-center gba:justify-between gba:pt-5 gba:mb-auto">
            {greeting && (
              <p className="gba:text-sm gba:text-inverse/80" data-testid={`${testId}-greeting`}>
                {greeting}
              </p>
            )}
            {stageTabs && stageTabs.length > 0 && (
              <Tabs value={activeStage} onValueChange={setActiveStage}>
                <TabsList
                  className="gba:bg-inverse/10 gba:border-0 gba:p-0.5 gba:h-8 gba:gap-0 gba:w-fit"
                  data-testid={`${testId}-stage-tabs`}
                >
                  {stageTabs.map(t => (
                    <TabsTrigger
                      key={t.id}
                      value={t.id}
                      className="gba:text-inverse/60 gba:text-xs gba:data-[state=active]:bg-inverse/20 gba:data-[state=active]:text-inverse gba:px-3"
                      data-testid={`${testId}-stage-${t.id}`}
                    >
                      {t.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            )}
          </div>

          {/* Center: brand + title */}
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-8">
            {brandLabel && (
              <span className="gba:text-xs gba:font-bold gba:text-inverse/70 gba:uppercase gba:tracking-[0.25em] gba:mb-2">
                {brandLabel}
              </span>
            )}
            <h1
              className="gba:font-funnel-display gba:text-5xl gba:font-light gba:text-inverse gba:tracking-tight gba:text-center"
              data-testid={`${testId}-title`}
            >
              {title}
            </h1>
          </div>

          {/* Hero cards on gradient (PDF p112: Morning Briefing + Key Insights) */}
          {heroCards.length > 0 && (
            <div
              className="gba:grid gba:grid-cols-1 gba:md:grid-cols-[2fr_1fr] gba:gap-4 gba:mb-6"
              data-testid={`${testId}-hero-cards`}
            >
              {heroCards.map(card => (
                <Card
                  key={card.id}
                  variant="surface"
                  className="gba:backdrop-blur-xl gba:border-inverse/10"
                  data-testid={`${testId}-card-${card.id}`}
                >
                  <CardHeader className="gba:pb-2">
                    <CardTitle className="gba:text-base">{card.title}</CardTitle>
                    {card.subtitle && <p className="gba:text-xs gba:text-muted-foreground">{card.subtitle}</p>}
                  </CardHeader>
                  <CardContent className="gba:pt-0">{card.content}</CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </PremiumHeroShell>

      {/* Content tabs below hero */}
      <div className="gba:max-w-7xl gba:mx-auto gba:px-10 gba:w-full">
        {contentTabs.length > 0 && (
          <div className="gba:pt-4 gba:pb-2">
            <Tabs value={activeContent} onValueChange={setActiveContent}>
              <TabsList data-testid={`${testId}-content-tabs`}>
                {contentTabs.map(t => (
                  <TabsTrigger key={t.id} value={t.id} data-testid={`${testId}-ct-${t.id}`}>
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        )}

        {/* Action chips */}
        <div className="gba:flex gba:flex-wrap gba:gap-2.5 gba:py-3" data-testid={`${testId}-chips`}>
          {chips.map(c => (
            <Chip key={c.id} onClick={c.onClick} data-testid={`${testId}-chip-${c.id}`}>
              {c.label}
            </Chip>
          ))}
        </div>

        {/* Search bar */}
        <Input
          placeholder={searchPlaceholder}
          className="gba:max-w-full gba:rounded-xl gba:mb-4"
          data-testid={`${testId}-search`}
          readOnly
        />

        {/* Tab content */}
        {contentTabs.length > 0 && (
          <Tabs value={activeContent} onValueChange={setActiveContent}>
            {contentTabs.map(t => (
              <TabsContent key={t.id} value={t.id} className="gba:mt-0 gba:pb-6">
                {t.content}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </div>
  )
}

/* ── Default hero cards (on the gradient, PDF p112) ── */

const DEFAULT_HERO_CARDS: HeroCard[] = [
  {
    id: 'briefing',
    title: 'My Morning Briefing',
    subtitle: 'Newwork AI Summary delivering Insights to Actions',
    content: (
      <div className="gba:flex gba:items-center gba:gap-3 gba:py-2">
        <div className="gba:flex-1 gba:h-1.5 gba:bg-muted/30 gba:rounded-full gba:overflow-hidden">
          <div className="gba:w-3/5 gba:h-full gba:bg-warning gba:rounded-full" />
        </div>
        <span className="gba:text-xs gba:text-muted-foreground">02:13 left</span>
      </div>
    )
  },
  {
    id: 'insights',
    title: 'Key Insights',
    content: (
      <ul className="gba:space-y-2.5 gba:text-sm">
        <li className="gba:flex gba:items-start gba:gap-2">
          <span className="gba:text-muted-foreground gba:leading-snug">
            5 new customer orders were created since yesterday and have not yet been scheduled
          </span>
        </li>
        <li className="gba:flex gba:items-start gba:gap-2">
          <span className="gba:text-muted-foreground gba:leading-snug">
            Project Manitou is currently 12% over budget. Main driver: external services
          </span>
        </li>
        <li className="gba:flex gba:items-start gba:gap-2">
          <span className="gba:text-muted-foreground gba:leading-snug">
            3 of your purchase orders will exceed the agreed delivery date today. One affects a key customer.
          </span>
        </li>
      </ul>
    )
  }
]

const DEFAULT_CHIPS: PremiumHeroChip[] = [
  { id: '1', label: 'Start IT service request' },
  { id: '2', label: 'Create CRM note for an account' },
  { id: '3', label: 'Create detailed note linked to opportunity' },
  { id: '4', label: 'Update my employee information' },
  { id: '5', label: 'Update payroll information of my team' }
]

const TeamContent = () => (
  <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-5">
    <Card>
      <CardHeader>
        <CardTitle>Team Availability Today</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="gba:text-3xl gba:font-bold gba:text-foreground gba:mb-1">7 / 9</p>
        <p className="gba:text-sm gba:text-muted-foreground">Capacity slightly reduced</p>
      </CardContent>
    </Card>
    <Card>
      <CardHeader>
        <CardTitle>My Team Snapshot</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="gba:space-y-1.5 gba:text-sm">
          <div className="gba:flex gba:justify-between">
            <dt className="gba:text-muted-foreground">Team size</dt>
            <dd className="gba:font-medium">9 members</dd>
          </div>
          <div className="gba:flex gba:justify-between">
            <dt className="gba:text-muted-foreground">Avg tenure</dt>
            <dd className="gba:font-medium">2y 4m</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  </div>
)

const NewsContent = () => (
  <Card className="gba:max-w-2xl">
    <CardHeader>
      <CardTitle className="gba:text-xl">Strengthening Leadership and Collaboration</CardTitle>
      <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">HR · 9 mins read</p>
    </CardHeader>
    <CardContent>
      <p className="gba:text-sm gba:text-muted-foreground">
        The focus is on further developing our leadership culture through new learning formats and practical exchange
        opportunities.
      </p>
    </CardContent>
  </Card>
)

const KpisContent = () => (
  <div className="gba:grid gba:grid-cols-2 gba:md:grid-cols-4 gba:gap-4">
    {[
      { label: 'Total Invested', value: '€ 468 M', change: '>+1000%', dir: 'up' as const },
      { label: 'Avg Stake %', value: '24.5 %', change: '-5.8', dir: 'down' as const },
      { label: 'Total Market Value', value: '€ 469.8 M', change: '+778.5%', dir: 'up' as const },
      { label: 'Active Investments', value: '23', change: '+130%', dir: 'up' as const }
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
)

const DEFAULT_CONTENT_TABS: PremiumHeroTab[] = [
  { id: 'briefing', label: 'My Briefing' },
  { id: 'team', label: 'My Team', content: <TeamContent /> },
  { id: 'news', label: 'My News', content: <NewsContent /> },
  { id: 'kpis', label: 'My KPIs', content: <KpisContent /> }
]

export default PremiumHeroMainStage
