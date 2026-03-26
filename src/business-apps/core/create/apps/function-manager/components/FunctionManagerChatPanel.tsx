/**
 * Function Manager chat panel: placeholder for AI wizard (create/edit function assistance).
 * Can later be wired to a function-specific AI or ChatDrawer.
 */

import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { Bot } from 'lucide-react'
import translations from '../_i18n'

const DATA_TEST_ID = 'function-manager-chat-panel'

export const FunctionManagerChatPanel: React.FC = () => {
  const { t } = useTranslation(translations)

  return (
    <div
      className="gba:flex gba:flex-col gba:h-full gba:min-h-0"
      data-testid={DATA_TEST_ID}
    >
      <div className="gba:shrink-0 gba:px-4 gba:py-3 gba:border-b gba:border-border gba:flex gba:items-center gba:gap-2">
        <Bot className="gba:w-5 gba:h-5 gba:text-muted-foreground" />
        <span className="gba:font-funnel-display gba:text-lg gba:font-semibold gba:text-primary">
          {t('chat-panel-title')}
        </span>
      </div>
      <div className="gba:flex-1 gba:overflow-y-auto gba:px-4 gba:py-4">
        <p className="gba:text-sm gba:text-muted-foreground">
          {t('chat-panel-description')}
        </p>
      </div>
    </div>
  )
}
