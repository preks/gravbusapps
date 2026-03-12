import React, { useEffect, useMemo, useState } from 'react'
import { Button } from '@newwork/nw-design-system'
import type { EmailAssistantPolicy, EmailAssistantPolicyUpdateRequest } from '../../email-apps/types'

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
  const [cultureSummary, setCultureSummary] = useState(defaultPolicy.cultureSummary)
  const [preferredPhrasesText, setPreferredPhrasesText] = useState('')
  const [disallowedPhrasesText, setDisallowedPhrasesText] = useState('')
  const [requiredCourtesyMarkersText, setRequiredCourtesyMarkersText] = useState('')
  const [defaultFormality, setDefaultFormality] = useState<EmailAssistantPolicy['defaultFormality']>('neutral')
  const [advisoryOnly, setAdvisoryOnly] = useState(true)
  const [historyWindowSize, setHistoryWindowSize] = useState(3)
  const [validationError, setValidationError] = useState<string | null>(null)

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
      setValidationError('History window size must be between 1 and 20')
      return
    }
    setValidationError(null)
    await onSave(payload)
  }

  return (
    <div className="gba:p-4 gba:rounded-lg gba:border gba:bg-card gba:space-y-3" data-testid={testId}>
      <div>
        <h2 className="gba:text-base gba:font-semibold">Email Assistant Policy</h2>
        <p className="gba:text-sm gba:text-muted-foreground">Configure assistant behavior for your tenant.</p>
      </div>

      <label className="gba:block gba:text-sm gba:font-medium">
        Culture summary
        <textarea
          value={cultureSummary}
          onChange={event => setCultureSummary(event.target.value)}
          className="gba:mt-1 gba:w-full gba:min-h-20 gba:p-2 gba:border gba:rounded gba:bg-background"
          data-testid={`${testId}-culture-summary`}
        />
      </label>

      <label className="gba:block gba:text-sm gba:font-medium">
        Preferred phrases (one per line)
        <textarea
          value={preferredPhrasesText}
          onChange={event => setPreferredPhrasesText(event.target.value)}
          className="gba:mt-1 gba:w-full gba:min-h-16 gba:p-2 gba:border gba:rounded gba:bg-background"
          data-testid={`${testId}-preferred-phrases`}
        />
      </label>

      <label className="gba:block gba:text-sm gba:font-medium">
        Disallowed phrases (one per line)
        <textarea
          value={disallowedPhrasesText}
          onChange={event => setDisallowedPhrasesText(event.target.value)}
          className="gba:mt-1 gba:w-full gba:min-h-16 gba:p-2 gba:border gba:rounded gba:bg-background"
          data-testid={`${testId}-disallowed-phrases`}
        />
      </label>

      <label className="gba:block gba:text-sm gba:font-medium">
        Required courtesy markers (one per line)
        <textarea
          value={requiredCourtesyMarkersText}
          onChange={event => setRequiredCourtesyMarkersText(event.target.value)}
          className="gba:mt-1 gba:w-full gba:min-h-16 gba:p-2 gba:border gba:rounded gba:bg-background"
          data-testid={`${testId}-required-courtesy-markers`}
        />
      </label>

      <div className="gba:grid gba:grid-cols-2 gba:gap-3">
        <label className="gba:block gba:text-sm gba:font-medium">
          Default formality
          <select
            value={defaultFormality}
            onChange={event => setDefaultFormality(event.target.value as EmailAssistantPolicy['defaultFormality'])}
            className="gba:mt-1 gba:w-full gba:h-9 gba:px-2 gba:border gba:rounded gba:bg-background"
            data-testid={`${testId}-default-formality`}
          >
            <option value="formal">Formal</option>
            <option value="neutral">Neutral</option>
            <option value="informal">Informal</option>
          </select>
        </label>

        <label className="gba:block gba:text-sm gba:font-medium">
          History window size
          <input
            type="number"
            value={historyWindowSize}
            min={1}
            max={20}
            onChange={event => setHistoryWindowSize(Number(event.target.value) || 1)}
            className="gba:mt-1 gba:w-full gba:h-9 gba:px-2 gba:border gba:rounded gba:bg-background"
            data-testid={`${testId}-history-window-size`}
          />
        </label>
      </div>

      <label className="gba:flex gba:items-center gba:gap-2 gba:text-sm">
        <input
          type="checkbox"
          checked={advisoryOnly}
          onChange={event => setAdvisoryOnly(event.target.checked)}
          data-testid={`${testId}-advisory-only`}
        />
        Advisory only (assistant never blocks sending)
      </label>

      {validationError && (
        <p className="gba:text-sm gba:bg-warning-secondary gba:text-warning-secondary-foreground gba:p-2 gba:rounded">
          {validationError}
        </p>
      )}

      <div className="gba:flex gba:justify-end">
        <Button onClick={handleSave} disabled={isSaving} data-testid={`${testId}-save`}>
          {isSaving ? 'Saving policy...' : 'Save policy'}
        </Button>
      </div>
    </div>
  )
}
