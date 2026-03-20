/**
 * Ribbon group: Voice (Dictate).
 */

import React from 'react'
import { VoiceInputButton } from '../../../shared'
import { useTranslation } from '@newwork/nw-design-system'
import translations from '../../_i18n'
import { RibbonGroup } from './editorToolbarShared'

interface ToolbarGroupVoiceProps {
  voiceProps: {
    isSupported: boolean
    isListening: boolean
    volume: number
    error: string | null
    onStartListening: () => void
    onStopListening: () => void
  }
  testId?: string
}

export function ToolbarGroupVoice({ voiceProps, testId = 'editor-toolbar' }: Readonly<ToolbarGroupVoiceProps>) {
  const { t } = useTranslation(translations)
  return (
    <RibbonGroup label={t('editor-ribbon-group-voice')} data-testid={testId ? `${testId}-group-voice` : undefined}>
      <VoiceInputButton
        isListening={voiceProps.isListening}
        isSupported={voiceProps.isSupported}
        volume={voiceProps.volume}
        error={voiceProps.error}
        onStartListening={voiceProps.onStartListening}
        onStopListening={voiceProps.onStopListening}
        size="sm"
        label={t('editor-dictate-label')}
        data-testid={testId ? `${testId}-dictate` : undefined}
      />
    </RibbonGroup>
  )
}
