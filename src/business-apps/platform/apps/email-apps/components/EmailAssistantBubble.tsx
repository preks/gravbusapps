import React, { useState } from 'react'
import { Button, Popover, PopoverContent, PopoverTrigger, useTranslation } from '@newwork/nw-design-system'
import { Sparkles, X } from 'lucide-react'
import { EmailAssistantPanel } from './EmailAssistantPanel'
import translations from '../_i18n'

type EmailAssistantPanelProps = React.ComponentProps<typeof EmailAssistantPanel>

interface EmailAssistantBubbleProps extends Omit<EmailAssistantPanelProps, 'data-testid'> {
  'data-testid'?: string
}

export const EmailAssistantBubble: React.FC<EmailAssistantBubbleProps> = ({
  isEnabled,
  isCapabilitiesLoading,
  'data-testid': testId = 'email-assistant-bubble',
  ...panelProps
}) => {
  const { t } = useTranslation(translations)
  const [isOpen, setIsOpen] = useState(false)

  if (!isEnabled && !isCapabilitiesLoading) return null

  return (
    <div className="gba:absolute gba:bottom-3 gba:left-3 gba:z-20" data-testid={testId}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="gba:gap-2"
            data-testid={`${testId}-trigger`}
            aria-label={t('assistant-bubble-open')}
          >
            <Sparkles className="gba:h-4 gba:w-4" />
            <span>{t('assistant-title')}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          side="left"
          align="end"
          sideOffset={8}
          className="gba:w-96 gba:max-w-full gba:p-0 gba:border gba:border-border"
          data-testid={`${testId}-popover`}
          onInteractOutside={event => event.preventDefault()}
        >
          <div className="gba:flex gba:items-center gba:justify-between gba:border-b gba:border-border gba:px-3 gba:py-2">
            <div className="gba:flex gba:items-center gba:gap-2">
              <Sparkles className="gba:h-4 gba:w-4 gba:text-decorative-foreground" />
              <span className="gba:text-sm gba:font-medium">{t('assistant-title')}</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              data-testid={`${testId}-close`}
              aria-label={t('assistant-bubble-close')}
            >
              <X className="gba:h-4 gba:w-4" />
            </Button>
          </div>

          <EmailAssistantPanel
            {...panelProps}
            isEnabled={isEnabled}
            isCapabilitiesLoading={isCapabilitiesLoading}
            defaultAssistantExpanded
            containerClassName="gba:mt-0 gba:border-0 gba:rounded-none"
            loadingClassName="gba:mt-0 gba:border-0 gba:rounded-none"
            data-testid={`${testId}-panel`}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
