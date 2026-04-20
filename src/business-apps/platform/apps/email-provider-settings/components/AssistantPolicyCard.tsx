import React, { useEffect, useMemo, useState } from 'react'
import { Button, useTranslation } from '@newwork/nw-design-system'
import type { EmailAssistantPolicy, EmailAssistantPolicyUpdateRequest } from '../../email-apps/types'
import translations from '../_i18n'

interface AssistantPolicyCardProps {
  policy: EmailAssistantPolicy | null
  isSaving: boolean
  onSave: (payload: EmailAssistantPolicyUpdateRequest) => Promise<void>
  'data-testid'?: string
}

function toLines(value: string[]): string {
  return value.join('\n')
}

function fromLines(value: string): string[] {
  return value
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean)
}

const defaultPolicy: EmailAssistantPolicy = {
  cultureSummary: '',
  preferredPhrases: [],
  disallowedPhrases: [],
  requiredCourtesyMarkers: [],
  defaultFormality: 'neutral',
  advisoryOnly: true,
  historyWindowSize: 3
}

export const AssistantPolicyCard: React.FC<AssistantPolicyCardProps> = ({
  policy,
  isSaving,
  onSave,
  'data-testid': testId = 'assistant-policy-card'
}) => {
  const { t } = useTranslation(translations)
  const [cultureSummary, setCultureSummary] = useState(defaultPolicy.cultureSummary)
  const [preferredPhrasesText, setPreferredPhrasesText] = useState('')
  const [disallowedPhrasesText, setDisallowedPhrasesText] = useState('')
  const [requiredCourtesyMarkersText, setRequiredCourtesyMarkersText] = useState('')
  const [defaultFormality, setDefaultFormality] = useState<EmailAssistantPolicy['defaultFormality']>('neutral')
  const [advisoryOnly, setAdvisoryOnly] = useState(true)
  const [historyWindowSize, setHistoryWindowSize] = useState(3)
  const [validationErrorKey, setValidationErrorKey] = useState<string | null>(null)

  useEffect(() => {
    const source = policy || defaultPolicy
    setCultureSummary(source.cultureSummary)
    setPreferredPhrasesText(toLines(source.preferredPhrases))
    setDisallowedPhrasesText(toLines(source.disallowedPhrases))
    setRequiredCourtesyMarkersText(toLines(source.requiredCourtesyMarkers))
    setDefaultFormality(source.defaultFormality)
    setAdvisoryOnly(source.advisoryOnly)
    setHistoryWindowSize(source.historyWindowSize)
  }, [policy])

  const payload = useMemo<EmailAssistantPolicyUpdateRequest>(
    () => ({
      cultureSummary: cultureSummary.trim(),
      preferredPhrases: fromLines(preferredPhrasesText),
      disallowedPhrases: fromLines(disallowedPhrasesText),
      requiredCourtesyMarkers: fromLines(requiredCourtesyMarkersText),
      defaultFormality,
      advisoryOnly,
      historyWindowSize
    }),
    [
      cultureSummary,
      preferredPhrasesText,
      disallowedPhrasesText,
      requiredCourtesyMarkersText,
      defaultFormality,
      advisoryOnly,
      historyWindowSize
    ]
  )

  const handleSave = async () => {
    if (payload.historyWindowSize < 1 || payload.historyWindowSize > 20) {
      setValidationErrorKey('assistant-validation-history-window-size')
      return
    }
    setValidationErrorKey(null)
    await onSave(payload)
  }

  return (
    <div className="gba:p-4 gba:rounded-lg gba:border gba:bg-card gba:space-y-3" data-testid={testId}>
      <div>
        <h2 className="gba:text-base gba:font-semibold">{t('assistant-title')}</h2>
        <p className="gba:text-sm gba:text-muted-foreground">{t('assistant-description')}</p>
      </div>

      <label htmlFor={`${testId}-culture-summary`} className="gba:block gba:text-sm gba:font-medium">
        <span className="gba:block gba:mb-1">{t('assistant-label-culture-summary')}</span>
        <textarea
          id={`${testId}-culture-summary`}
          value={cultureSummary}
          onChange={event => setCultureSummary(event.target.value)}
          className="gba:w-full gba:min-h-20 gba:p-2 gba:border gba:rounded gba:bg-background"
          data-testid={`${testId}-culture-summary`}
        />
      </label>

      <label htmlFor={`${testId}-preferred-phrases`} className="gba:block gba:text-sm gba:font-medium">
        <span className="gba:block gba:mb-1">{t('assistant-label-preferred-phrases')}</span>
        <textarea
          id={`${testId}-preferred-phrases`}
          value={preferredPhrasesText}
          onChange={event => setPreferredPhrasesText(event.target.value)}
          className="gba:w-full gba:min-h-16 gba:p-2 gba:border gba:rounded gba:bg-background"
          data-testid={`${testId}-preferred-phrases`}
        />
      </label>

      <label htmlFor={`${testId}-disallowed-phrases`} className="gba:block gba:text-sm gba:font-medium">
        <span className="gba:block gba:mb-1">{t('assistant-label-disallowed-phrases')}</span>
        <textarea
          id={`${testId}-disallowed-phrases`}
          value={disallowedPhrasesText}
          onChange={event => setDisallowedPhrasesText(event.target.value)}
          className="gba:w-full gba:min-h-16 gba:p-2 gba:border gba:rounded gba:bg-background"
          data-testid={`${testId}-disallowed-phrases`}
        />
      </label>

      <label htmlFor={`${testId}-required-courtesy-markers`} className="gba:block gba:text-sm gba:font-medium">
        <span className="gba:block gba:mb-1">{t('assistant-label-required-courtesy-markers')}</span>
        <textarea
          id={`${testId}-required-courtesy-markers`}
          value={requiredCourtesyMarkersText}
          onChange={event => setRequiredCourtesyMarkersText(event.target.value)}
          className="gba:w-full gba:min-h-16 gba:p-2 gba:border gba:rounded gba:bg-background"
          data-testid={`${testId}-required-courtesy-markers`}
        />
      </label>

      <div className="gba:grid gba:grid-cols-2 gba:gap-3">
        <label htmlFor={`${testId}-default-formality`} className="gba:block gba:text-sm gba:font-medium">
          <span className="gba:block gba:mb-1">{t('assistant-label-default-formality')}</span>
          <select
            id={`${testId}-default-formality`}
            value={defaultFormality}
            onChange={event => setDefaultFormality(event.target.value as EmailAssistantPolicy['defaultFormality'])}
            className="gba:w-full gba:h-9 gba:px-2 gba:border gba:rounded gba:bg-background"
            data-testid={`${testId}-default-formality`}
          >
            <option value="formal">{t('assistant-option-formal')}</option>
            <option value="neutral">{t('assistant-option-neutral')}</option>
            <option value="informal">{t('assistant-option-informal')}</option>
          </select>
        </label>

        <label htmlFor={`${testId}-history-window-size`} className="gba:block gba:text-sm gba:font-medium">
          <span className="gba:block gba:mb-1">{t('assistant-label-history-window-size')}</span>
          <input
            id={`${testId}-history-window-size`}
            type="number"
            value={historyWindowSize}
            min={1}
            max={20}
            onChange={event => setHistoryWindowSize(Number(event.target.value) || 1)}
            className="gba:w-full gba:h-9 gba:px-2 gba:border gba:rounded gba:bg-background"
            data-testid={`${testId}-history-window-size`}
          />
        </label>
      </div>

      <label htmlFor={`${testId}-advisory-only`} className="gba:flex gba:items-center gba:gap-2 gba:text-sm">
        <input
          id={`${testId}-advisory-only`}
          type="checkbox"
          checked={advisoryOnly}
          onChange={event => setAdvisoryOnly(event.target.checked)}
          data-testid={`${testId}-advisory-only`}
        />
        <span>{t('assistant-label-advisory-only')}</span>
      </label>

      {validationErrorKey && (
        <p className="gba:text-sm gba:bg-warning-secondary gba:text-warning-secondary-foreground gba:p-2 gba:rounded">
          {t(validationErrorKey, { min: 1, max: 20 })}
        </p>
      )}

      <div className="gba:flex gba:justify-end">
        <Button onClick={handleSave} disabled={isSaving} data-testid={`${testId}-save`}>
          {isSaving ? t('assistant-button-saving') : t('assistant-button-save')}
        </Button>
      </div>
    </div>
  )
}
