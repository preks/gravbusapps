import React, { useState } from 'react'
import { Card, CardContent, useTranslation } from '@newwork/nw-design-system'
import { CaretDownIcon, CaretUpIcon, SparkleIcon } from '@phosphor-icons/react'
import { EmailAssistantPanel } from '../EmailAssistantPanel'
import translations from '../../_i18n'

type AssistantPanelProps = React.ComponentProps<typeof EmailAssistantPanel>

interface EmailThreadAssistantCardProps extends AssistantPanelProps {
  'data-testid'?: string
}

export const EmailThreadAssistantCard: React.FC<EmailThreadAssistantCardProps> = ({
  isEnabled,
  isCapabilitiesLoading,
  'data-testid': testId = 'email-thread-assistant-card',
  ...panelProps
}) => {
  const { t } = useTranslation(translations)
  const [isExpanded, setIsExpanded] = useState(false)
  const assistantThemeStyles = {
    '--background': '217 78% 20%',
    '--foreground': '213 100% 95%',
    '--card': '217 78% 26%',
    '--card-foreground': '213 100% 95%',
    '--card-decorative': '217 75% 31%',
    '--decorative-foreground': '213 100% 95%',
    '--muted': '216 62% 34%',
    '--muted-foreground': '214 72% 82%',
    '--border': '217 47% 52%',
    '--input': '216 55% 43%',
    '--primary': '0 0% 100%',
    '--primary-foreground': '217 78% 26%',
    '--secondary': '216 54% 39%',
    '--secondary-foreground': '213 100% 95%',
    '--accent': '216 54% 39%',
    '--accent-foreground': '213 100% 95%',
    '--destructive-secondary': '358 70% 43%',
    '--destructive-secondary-foreground': '0 0% 98%'
  } as React.CSSProperties

  if (!isEnabled && !isCapabilitiesLoading) return null

  return (
    <Card
      className="gba:overflow-hidden gba:relative gba:bg-card-decorative gba:border gba:border-decorative-foreground/20"
      style={assistantThemeStyles}
      data-testid={testId}
    >
      <button
        type="button"
        onClick={() => setIsExpanded(previous => !previous)}
        className="gba:w-full gba:flex gba:items-center gba:gap-3 gba:px-4 gba:pt-4 gba:pb-3"
        data-testid={`${testId}-toggle`}
      >
        <div className="gba:w-9 gba:h-9 gba:rounded-lg gba:bg-decorative-foreground/20 gba:flex gba:items-center gba:justify-center">
          <SparkleIcon className="gba:w-4 gba:h-4 gba:text-decorative-foreground" weight="fill" />
        </div>
        <div className="gba:flex-1 gba:text-left">
          <p className="gba:text-sm gba:font-bold gba:tracking-tight gba:text-decorative-foreground">
            {t('assistant-title')}
          </p>
          <p className="gba:text-xs gba:text-decorative-foreground/70">{t('thread-compose-assistant-hint')}</p>
        </div>
        {isExpanded ? (
          <CaretUpIcon className="gba:w-4 gba:h-4 gba:text-decorative-foreground/60" />
        ) : (
          <CaretDownIcon className="gba:w-4 gba:h-4 gba:text-decorative-foreground/60" />
        )}
      </button>

      {isExpanded && (
        <CardContent className="gba:px-4 gba:pb-4 gba:pt-0 gba:bg-black/10">
          <EmailAssistantPanel
            {...panelProps}
            isEnabled={isEnabled}
            isCapabilitiesLoading={isCapabilitiesLoading}
            defaultAssistantExpanded
            containerClassName="gba:mt-0 gba:border-0 gba:rounded-none gba:bg-transparent"
            loadingClassName="gba:mt-0 gba:border-0 gba:rounded-none gba:bg-transparent"
            data-testid={`${testId}-panel`}
          />
        </CardContent>
      )}
    </Card>
  )
}
