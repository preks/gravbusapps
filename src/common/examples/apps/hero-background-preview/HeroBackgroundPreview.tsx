import React, { useState } from 'react'
import { PageLayout, Tabs, TabsContent, TabsList, TabsTrigger } from '@newwork/nw-design-system'
import { SparkleIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  PremiumHeroMainStage,
  PremiumHeroHub,
  PremiumHeroApp,
  PremiumHeroRecord
} from '@/common/components/premium-hero'

interface HeroBackgroundPreviewProps extends BusinessAppContextProps {
  'data-testid'?: string
}

const LEVELS = [
  {
    id: 'l0',
    label: 'L0 Main Stage',
    pdf: 'p88, p112–130',
    desc: 'Intelligent Workplace home. Hero: greeting, stage tabs, action chips, search. Content tabs: My Briefing, My Team, My News, My KPIs.'
  },
  {
    id: 'l1',
    label: 'L1 Hub',
    pdf: 'p89–90, p100',
    desc: 'Module entry point. Hero: module label, section header, KPI strip, info cards. Below: action chips.'
  },
  {
    id: 'l2',
    label: 'L2 App',
    pdf: 'p91–92, p102–105',
    desc: 'App-level view. Clean header with module label, app name, optional description, and tab bar at bottom of the hero. Content and KPIs sit below.'
  },
  {
    id: 'l3',
    label: 'L3 Record',
    pdf: 'p95–96, p107–109',
    desc: 'Single entity view. Hero: breadcrumb, title info, entity name, info cards, tabs. Content: account details.'
  }
] as const

export const HeroBackgroundPreview: React.FC<HeroBackgroundPreviewProps> = ({
  'data-testid': testId = 'hero-preview'
}) => {
  const [active, setActive] = useState<string>('l0')
  const meta = LEVELS.find(l => l.id === active)

  return (
    <div className="gba:h-full gba:w-full gba:bg-background" data-testid={testId}>
      <PageLayout
        headerPhosphorIcon={{ icon: SparkleIcon, variant: 'ext3' as any, size: 'lg', label: 'Hero Variants' }}
        headerTitle="Premium Hero Variants"
      >
        <div className="gba:container gba:mx-auto gba:py-6 gba:max-w-7xl">
          <p className="gba:text-sm gba:text-muted-foreground gba:mb-6">
            4 navigation levels from the design document. Each matches a specific hierarchy depth. The Boards Hub hero
            is live in the Boards app.
          </p>

          <Tabs value={active} onValueChange={setActive} data-testid={`${testId}-tabs`}>
            <TabsList className="gba:mb-4" data-testid={`${testId}-level-tabs`}>
              {LEVELS.map(l => (
                <TabsTrigger key={l.id} value={l.id} data-testid={`${testId}-tab-${l.id}`}>
                  {l.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {meta && (
              <div className="gba:mb-4 gba:px-4 gba:py-3 gba:rounded-lg gba:bg-muted/50 gba:border gba:border-border">
                <p className="gba:text-xs gba:text-muted-foreground gba:mb-1">PDF {meta.pdf}</p>
                <p className="gba:text-sm gba:text-foreground">{meta.desc}</p>
              </div>
            )}

            <TabsContent value="l0" className="gba:mt-0">
              <div className="gba:rounded-xl gba:overflow-hidden gba:border gba:border-border">
                <PremiumHeroMainStage
                  greeting="Hey John, good morning."
                  stageTabs={[
                    { id: 'start', label: 'Start View' },
                    { id: 's1', label: 'Stage View 1' },
                    { id: 's2', label: 'Stage View 2' }
                  ]}
                  data-testid={`${testId}-l0`}
                />
              </div>
            </TabsContent>

            <TabsContent value="l1" className="gba:mt-0">
              <div className="gba:rounded-xl gba:overflow-hidden gba:border gba:border-border">
                <PremiumHeroHub subtitle="Investment overview and key metrics" data-testid={`${testId}-l1`} />
              </div>
            </TabsContent>

            <TabsContent value="l2" className="gba:mt-0">
              <div className="gba:rounded-xl gba:overflow-hidden gba:border gba:border-border">
                <PremiumHeroApp
                  description="Manage and monitor investments across all asset classes"
                  actionButtons={[
                    { id: 'eur', label: 'EUR' },
                    { id: 'add', label: 'Add Investment' }
                  ]}
                  data-testid={`${testId}-l2`}
                />
              </div>
            </TabsContent>

            <TabsContent value="l3" className="gba:mt-0">
              <div className="gba:rounded-xl gba:overflow-hidden gba:border gba:border-border">
                <PremiumHeroRecord data-testid={`${testId}-l3`} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </PageLayout>
    </div>
  )
}

export default HeroBackgroundPreview
