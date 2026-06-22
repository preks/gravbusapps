// Tabbed container for the Trace Explorer — Timeline / Tools / Sources / Cost.

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger, useTranslation } from '@newwork/nw-design-system'
import type { TraceModel } from '../../utils/traceModel'
import type { ReplayClockApi } from '../../hooks/useReplayClock'
import translations from '../../_i18n'
import { TraceTimelineView } from './TraceTimelineView'
import { TraceToolsTab } from './TraceToolsTab'
import { TraceSourcesTab } from './TraceSourcesTab'
import { TraceCostTab } from './TraceCostTab'

interface TraceTabsProps {
  model: TraceModel
  clock: ReplayClockApi
  isLive: boolean
}

type TraceTabKey = 'timeline' | 'tools' | 'sources' | 'cost'

export const TraceTabs: React.FC<TraceTabsProps> = ({ model, clock, isLive }) => {
  const { t } = useTranslation(translations)
  const [activeTab, setActiveTab] = useState<TraceTabKey>('timeline')

  return (
    <Tabs
      value={activeTab}
      onValueChange={v => setActiveTab(v as TraceTabKey)}
      className="gba:flex gba:flex-col gba:flex-1 gba:min-h-0 gba:gap-0"
      data-testid="trace-tabs"
    >
      <div className="gba:shrink-0 gba:border-b gba:border-border/40 gba:px-4 gba:pt-3 gba:pb-0">
        <TabsList>
          <TabsTrigger value="timeline" data-testid="trace-tab-timeline">
            {t('trace-view-timeline')}
          </TabsTrigger>
          <TabsTrigger value="tools" data-testid="trace-tab-tools">
            {t('trace-explorer-tab-tools', { count: String(model.summary.toolCallCount) })}
          </TabsTrigger>
          <TabsTrigger value="sources" data-testid="trace-tab-sources">
            {t('trace-explorer-tab-sources', { count: String(model.summary.participantCount) })}
          </TabsTrigger>
          <TabsTrigger value="cost" data-testid="trace-tab-cost">
            {t('trace-explorer-tab-cost')}
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="timeline" className="gba:flex gba:flex-col gba:flex-1 gba:min-h-0 gba:mt-0">
        <TraceTimelineView model={model} clock={clock} isLive={isLive} />
      </TabsContent>
      <TabsContent value="tools" className="gba:flex gba:flex-col gba:flex-1 gba:min-h-0 gba:mt-0">
        <TraceToolsTab model={model} />
      </TabsContent>
      <TabsContent value="sources" className="gba:flex gba:flex-col gba:flex-1 gba:min-h-0 gba:mt-0">
        <TraceSourcesTab model={model} />
      </TabsContent>
      <TabsContent value="cost" className="gba:flex gba:flex-col gba:flex-1 gba:min-h-0 gba:mt-0">
        <TraceCostTab model={model} />
      </TabsContent>
    </Tabs>
  )
}
