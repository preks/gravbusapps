/**
 * Ribbon group: Voice (Dictate).
 */

import React from 'react'
import { VoiceInputButton } from '@/business-apps/platform/apps/shared'
import { useTranslation } from '@newwork/nw-design-system'
import translations from '../../_i18n'
import { RibbonGroup } from './editorToolbarShared'

interface ToolbarGroupVoiceProps {
  voiceProps: {
    isSupported: boolean
    isListening: boolean
    volume: number
    error: string | null
    errorCode?: string | null
    onStartListening: () => void
    onStopListening: () => void
  }
  testId?: string
}

function getVoiceErrorMessage(
  t: (key: string, args?: Record<string, string>) => string,
  errorCode?: string | null,
  fallbackError?: string | null
): string | null {
  if (!errorCode) {
    return fallbackError ?? null
  }

  if (errorCode === 'not-allowed') {
    return t('editor-dictate-error-not-allowed')
  }
  if (errorCode === 'network') {
    return t('editor-dictate-error-network')
  }
  if (errorCode === 'audio-capture') {
    return t('editor-dictate-error-audio-capture')
  }
  if (errorCode === 'aborted') {
    return t('editor-dictate-error-aborted')
  }
  if (errorCode === 'native-unavailable') {
    return t('editor-dictate-error-native-unavailable')
  }

  if (!fallbackError) {
    return null
  }

  return t('editor-dictate-error-generic', { error: fallbackError })
}

export function ToolbarGroupVoice({ voiceProps, testId = 'editor-toolbar' }: Readonly<ToolbarGroupVoiceProps>) {
  const { t } = useTranslation(translations)
  const translatedError = getVoiceErrorMessage(t, voiceProps.errorCode, voiceProps.error)

  return (
    <RibbonGroup label={t('editor-ribbon-group-voice')} data-testid={testId ? `${testId}-group-voice` : undefined}>
      <VoiceInputButton
        isListening={voiceProps.isListening}
        isSupported={voiceProps.isSupported}
        volume={voiceProps.volume}
        error={translatedError}
        onStartListening={voiceProps.onStartListening}
        onStopListening={voiceProps.onStopListening}
        size="sm"
        label={t('editor-dictate-label')}
        listeningLabel={t('editor-dictate-listening')}
        idleTooltipPrimary={t('editor-dictate-hint')}
        idleTooltipSecondary={t('editor-dictate-tooltip-secondary')}
        unsupportedTooltip={t('editor-dictate-unsupported-browser')}
        errorTitle={t('editor-dictate-unavailable')}
        errorRetryHint={t('editor-dictate-retry')}
        data-testid={testId ? `${testId}-dictate` : undefined}
      />
    </RibbonGroup>
  )
}
