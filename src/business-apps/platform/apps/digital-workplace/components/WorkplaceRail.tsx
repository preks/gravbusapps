import React, { useState } from 'react'
import { Card, Tabs, TabsList, TabsTrigger } from '@newwork/nw-design-system'
import { EnvelopeSimpleIcon, ChatCircleIcon, FileTextIcon } from '@phosphor-icons/react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useWorkplaceTranslation } from '../_i18n/useWorkplaceTranslation'
import WeekCalendar from './WeekCalendar'
import MessagesPanel, { type MessagesTab } from './MessagesPanel'
import DocumentsPanel from './DocumentsPanel'
import type { WorkplaceMetricKey } from '../types'

const TEST_ID = 'digital-workplace-rail'

type RailTab = 'mail' | 'chats' | 'files'

export interface WorkplaceRailProps {
  context: BusinessAppContextProps
  onMetric: (key: WorkplaceMetricKey, value: number) => void
}

/**
 * Quiet secondary rail. Keeps reference content (calendar, messages and files)
 * available without competing with the primary focus feed: messages and files
 * share one tabbed surface.
 */
const WorkplaceRail: React.FC<WorkplaceRailProps> = ({ context, onMetric }) => {
  const { t } = useWorkplaceTranslation()
  const [tab, setTab] = useState<RailTab>('mail')

  const messagesTab: MessagesTab = tab === 'chats' ? 'chats' : 'mail'

  return (
    <div className="gba:flex gba:min-h-0 gba:flex-col gba:gap-4 gba:overflow-y-auto" data-testid={TEST_ID}>
      <WeekCalendar context={context} />

      <Card variant="surface" className="gba:flex gba:flex-col gba:overflow-hidden gba:p-3">
        <Tabs value={tab} onValueChange={value => setTab(value as RailTab)}>
          <TabsList className="gba:w-full">
            <TabsTrigger value="mail" startIcon={<EnvelopeSimpleIcon />} data-testid={`${TEST_ID}-tab-mail`}>
              {t('messages-tab-mail')}
            </TabsTrigger>
            <TabsTrigger value="chats" startIcon={<ChatCircleIcon />} data-testid={`${TEST_ID}-tab-chats`}>
              {t('messages-tab-chats')}
            </TabsTrigger>
            <TabsTrigger value="files" startIcon={<FileTextIcon />} data-testid={`${TEST_ID}-tab-files`}>
              {t('rail-files')}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="gba:h-72 gba:pt-3">
          {/* Messages stays mounted (just hidden) on the files tab so unread counts keep updating. */}
          <div className={tab === 'files' ? 'gba:hidden' : 'gba:h-full'}>
            <MessagesPanel context={context} onMetric={onMetric} embedded forcedTab={messagesTab} />
          </div>
          {tab === 'files' ? (
            <div className="gba:h-full">
              <DocumentsPanel context={context} onMetric={onMetric} embedded />
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  )
}

export default WorkplaceRail
export { WorkplaceRail }
