import React, { useState } from 'react'
import { Badge, Button, Switch, Textarea, useTranslation } from '@newwork/nw-design-system'
import type {
  EmailAssistantDraft,
  EmailAssistantFormality,
  EmailAssistantLength,
  EmailAssistantResponse,
  EmailAssistantRewriteAction,
  EmailAssistantTone
} from '../types'
import translations from '../_i18n'

interface EmailAssistantPanelProps {
  isEnabled: boolean
  isCapabilitiesLoading: boolean
  loading: {
    draft: boolean
    rewrite: boolean
    replySuggest: boolean
    temperatureCheck: boolean
  }
  mode: 'new' | 'reply' | 'reply-all' | 'forward'
  bulletDraft: string
  onBulletDraftChange: (value: string) => void
  replyIntent: string
  onReplyIntentChange: (value: string) => void
  tone: EmailAssistantTone
  onToneChange: (value: EmailAssistantTone) => void
  formality: EmailAssistantFormality
  onFormalityChange: (value: EmailAssistantFormality) => void
  length: EmailAssistantLength
  onLengthChange: (value: EmailAssistantLength) => void
  customInstruction: string
  onCustomInstructionChange: (value: string) => void
  latestOutput: EmailAssistantResponse | null
  previewDraft: EmailAssistantDraft | null
  lastError: string | null
  autoTemperatureCheck: boolean
  onAutoTemperatureCheckChange: (value: boolean) => void
  onGenerateDraft: () => void
  onSuggestReply: () => void
  onRewrite: (action: EmailAssistantRewriteAction) => void
  onRewriteFormal: () => void
  onRewriteInformal: () => void
  onRunTemperatureCheck: () => void
  onAcceptPreview: () => void
  onRejectPreview: () => void
  onRetry: () => void
  onCancel: (action: 'draft' | 'rewrite' | 'replySuggest' | 'temperatureCheck') => void
  defaultAssistantExpanded?: boolean
  containerClassName?: string
  loadingClassName?: string
  'data-testid'?: string
}

function riskVariant(risk: string): 'success' | 'warning' | 'destructive' {
  if (risk === 'high') return 'destructive'
  if (risk === 'medium') return 'warning'
  return 'success'
}

function formatFlagLabel(flagId: string): string {
  return flagId
    .split('_')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export const EmailAssistantPanel: React.FC<EmailAssistantPanelProps> = ({
  isEnabled,
  isCapabilitiesLoading,
  loading,
  mode,
  bulletDraft,
  onBulletDraftChange,
  replyIntent,
  onReplyIntentChange,
  tone,
  onToneChange,
  formality,
  onFormalityChange,
  length,
  onLengthChange,
  customInstruction,
  onCustomInstructionChange,
  latestOutput,
  previewDraft,
  lastError,
  autoTemperatureCheck,
  onAutoTemperatureCheckChange,
  onGenerateDraft,
  onSuggestReply,
  onRewrite,
  onRewriteFormal,
  onRewriteInformal,
  onRunTemperatureCheck,
  onAcceptPreview,
  onRejectPreview,
  onRetry,
  onCancel,
  defaultAssistantExpanded = false,
  containerClassName,
  loadingClassName,
  'data-testid': testId = 'email-assistant-panel'
}) => {
  const { t } = useTranslation(translations)
  const isReplyMode = mode === 'reply' || mode === 'reply-all'
  const [isAdvancedExpanded, setIsAdvancedExpanded] = useState(() => !isReplyMode)
  const [isAssistantExpanded, setIsAssistantExpanded] = useState(defaultAssistantExpanded)
  const [isInsightsExpanded, setIsInsightsExpanded] = useState(false)
  const [isRiskExpanded, setIsRiskExpanded] = useState(false)
  const shouldExpandContainer = isAdvancedExpanded || Boolean(previewDraft)
  const controlBaseClassName =
    'gba:bg-background/60 gba:text-foreground gba:border gba:border-input gba:placeholder:text-muted-foreground gba:focus-visible:ring-1 gba:focus-visible:ring-border'
  const primaryActionButtonClassName =
    'gba:bg-primary gba:text-primary-foreground gba:border gba:border-transparent hover:gba:bg-primary/90'
  const secondaryActionButtonClassName =
    'gba:bg-background/35 gba:text-foreground gba:border gba:border-border hover:gba:bg-background/55'
  const ghostActionButtonClassName =
    'gba:bg-transparent gba:text-muted-foreground hover:gba:bg-background/45 hover:gba:text-foreground'

  if (isCapabilitiesLoading) {
    return (
      <div
        className={['gba:mt-3 gba:p-3 gba:rounded-lg gba:border gba:bg-muted', loadingClassName]
          .filter(Boolean)
          .join(' ')}
        data-testid={`${testId}-loading`}
      >
        <p className="gba:text-xs gba:text-muted-foreground">{t('assistant-loading-capabilities')}</p>
      </div>
    )
  }

  if (!isEnabled) return null

  return (
    <div
      className={[
        'gba:mt-3 gba:p-3 gba:rounded-lg gba:border gba:space-y-3',
        shouldExpandContainer ? 'gba:max-h-none gba:overflow-visible' : 'gba:max-h-96 gba:overflow-y-auto',
        containerClassName
      ]
        .filter(Boolean)
        .join(' ')}
      data-testid={testId}
    >
      <button
        type="button"
        className="gba:w-full gba:flex gba:items-center gba:justify-between"
        onClick={() => setIsAssistantExpanded(prev => !prev)}
        data-testid={`${testId}-assistant-toggle`}
      >
        <p className="gba:text-sm gba:font-medium gba:text-decorative-foreground">{t('assistant-title')}</p>
        <span className="gba:text-xs gba:text-muted-foreground">{isAssistantExpanded ? '▾' : '▸'}</span>
      </button>

      {isAssistantExpanded && (
        <>
          <div className="gba:space-y-1">
            <Textarea
              value={bulletDraft}
              onChange={event => onBulletDraftChange(event.target.value)}
              placeholder={t('assistant-bullets-placeholder')}
              className={`gba:min-h-20 ${controlBaseClassName}`}
              data-testid={`${testId}-bullet-draft`}
            />
            {isReplyMode && (
              <p className="gba:text-xs gba:text-muted-foreground" data-testid={`${testId}-bullet-hint`}>
                {t('assistant-bullets-hint')}
              </p>
            )}
          </div>

          <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
            <Button
              size="sm"
              onClick={onGenerateDraft}
              disabled={loading.draft}
              className={primaryActionButtonClassName}
              data-testid={`${testId}-generate-draft`}
            >
              {isReplyMode ? t('assistant-generate-reply') : t('assistant-generate-draft')}
            </Button>
            {isReplyMode && (
              <Button
                size="sm"
                variant="outline"
                onClick={onSuggestReply}
                disabled={loading.replySuggest}
                className={secondaryActionButtonClassName}
                data-testid={`${testId}-suggest-reply`}
              >
                {t('assistant-suggest-reply')}
              </Button>
            )}
            <div className="gba:ml-auto gba:flex gba:items-center gba:gap-2">
              <span className="gba:text-xs gba:text-muted-foreground">{t('assistant-auto-temperature')}</span>
              <Switch
                id={`${testId}-auto-temperature`}
                checked={autoTemperatureCheck}
                onCheckedChange={onAutoTemperatureCheckChange}
                data-testid={`${testId}-auto-temperature`}
              />
            </div>
            {(loading.draft || loading.replySuggest) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (loading.draft) onCancel('draft')
                  if (loading.replySuggest) onCancel('replySuggest')
                }}
                className={ghostActionButtonClassName}
                data-testid={`${testId}-cancel-request`}
              >
                {t('assistant-cancel')}
              </Button>
            )}
          </div>

          <button
            type="button"
            className="gba:w-full gba:flex gba:items-center gba:justify-between gba:text-xs gba:text-muted-foreground"
            onClick={() => setIsAdvancedExpanded(prev => !prev)}
            data-testid={`${testId}-advanced-toggle`}
          >
            <span>{isAdvancedExpanded ? t('assistant-advanced-hide') : t('assistant-advanced-show')}</span>
            <span>{isAdvancedExpanded ? '▾' : '▸'}</span>
          </button>

          {isAdvancedExpanded && (
            <>
              {isReplyMode && (
                <Textarea
                  value={replyIntent}
                  onChange={event => onReplyIntentChange(event.target.value)}
                  placeholder={t('assistant-reply-intent-placeholder')}
                  className={`gba:min-h-16 ${controlBaseClassName}`}
                  data-testid={`${testId}-reply-intent`}
                />
              )}

              <div className="gba:grid gba:grid-cols-3 gba:gap-2">
                <label className="gba:text-xs ">
                  {t('assistant-tone')}
                  <select
                    value={tone}
                    onChange={event => onToneChange(event.target.value as EmailAssistantTone)}
                    className={`gba:mt-1 gba:w-full gba:h-8 gba:text-sm gba:rounded gba:px-2 ${controlBaseClassName}`}
                    data-testid={`${testId}-tone`}
                  >
                    <option value="formal">{t('assistant-tone-formal')}</option>
                    <option value="informal">{t('assistant-tone-informal')}</option>
                    <option value="friendly">{t('assistant-tone-friendly')}</option>
                    <option value="professional">{t('assistant-tone-professional')}</option>
                    <option value="concise">{t('assistant-tone-concise')}</option>
                  </select>
                </label>
                <label className="gba:text-xs ">
                  {t('assistant-formality')}
                  <select
                    value={formality}
                    onChange={event => onFormalityChange(event.target.value as EmailAssistantFormality)}
                    className={`gba:mt-1 gba:w-full gba:h-8 gba:text-sm gba:rounded gba:px-2 ${controlBaseClassName}`}
                    data-testid={`${testId}-formality`}
                  >
                    <option value="formal">{t('assistant-formality-formal')}</option>
                    <option value="neutral">{t('assistant-formality-neutral')}</option>
                    <option value="informal">{t('assistant-formality-informal')}</option>
                  </select>
                </label>
                <label className="gba:text-xs">
                  {t('assistant-length')}
                  <select
                    value={length}
                    onChange={event => onLengthChange(event.target.value as EmailAssistantLength)}
                    className={`gba:mt-1 gba:w-full gba:h-8 gba:text-sm gba:rounded gba:px-2 ${controlBaseClassName}`}
                    data-testid={`${testId}-length`}
                  >
                    <option value="short">{t('assistant-length-short')}</option>
                    <option value="medium">{t('assistant-length-medium')}</option>
                    <option value="long">{t('assistant-length-long')}</option>
                  </select>
                </label>
              </div>

              <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRewrite('improve')}
                  className={secondaryActionButtonClassName}
                  data-testid={`${testId}-rewrite-improve`}
                >
                  {t('assistant-rewrite-improve')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onRewriteFormal}
                  className={secondaryActionButtonClassName}
                  data-testid={`${testId}-rewrite-make-formal`}
                >
                  {t('assistant-rewrite-make-formal')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onRewriteInformal}
                  className={secondaryActionButtonClassName}
                  data-testid={`${testId}-rewrite-make-informal`}
                >
                  {t('assistant-rewrite-make-informal')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRewrite('shorten')}
                  className={secondaryActionButtonClassName}
                  data-testid={`${testId}-rewrite-shorten`}
                >
                  {t('assistant-rewrite-shorten')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRewrite('expand')}
                  className={secondaryActionButtonClassName}
                  data-testid={`${testId}-rewrite-expand`}
                >
                  {t('assistant-rewrite-expand')}
                </Button>
              </div>

              <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onRunTemperatureCheck}
                  disabled={loading.temperatureCheck}
                  className={secondaryActionButtonClassName}
                  data-testid={`${testId}-temperature-check-inline`}
                >
                  {t('assistant-temperature-check')}
                </Button>
              </div>

              <div className="gba:flex gba:items-center gba:gap-2">
                <input
                  value={customInstruction}
                  onChange={event => onCustomInstructionChange(event.target.value)}
                  placeholder={t('assistant-custom-placeholder')}
                  className={`gba:flex-1 gba:h-8 gba:text-sm gba:rounded gba:px-2 ${controlBaseClassName}`}
                  data-testid={`${testId}-custom-instruction`}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRewrite('custom')}
                  disabled={!customInstruction.trim() || loading.rewrite}
                  className={secondaryActionButtonClassName}
                  data-testid={`${testId}-rewrite-custom`}
                >
                  {t('assistant-rewrite-custom')}
                </Button>
                {loading.rewrite && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onCancel('rewrite')}
                    className={ghostActionButtonClassName}
                    data-testid={`${testId}-cancel-rewrite`}
                  >
                    {t('assistant-cancel')}
                  </Button>
                )}
              </div>
            </>
          )}

          {lastError && (
            <div
              className="gba:p-2 gba:rounded-md gba:bg-destructive-secondary gba:text-destructive-secondary-foreground gba:text-xs gba:flex gba:items-center gba:justify-between gba:gap-2"
              data-testid={`${testId}-error`}
            >
              <span>{lastError}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={onRetry}
                className={ghostActionButtonClassName}
                data-testid={`${testId}-retry`}
              >
                {t('assistant-retry')}
              </Button>
            </div>
          )}

          {previewDraft && (
            <div
              className="gba:p-2 gba:rounded-md gba:border gba:border-input gba:bg-background/45 gba:space-y-2 gba:max-h-64 gba:overflow-y-auto"
              data-testid={`${testId}-preview`}
            >
              <p className="gba:text-xs gba:text-muted-foreground">{t('assistant-preview')}</p>
              <p className="gba:text-sm gba:font-medium gba:text-foreground">{previewDraft.subject}</p>
              <p className="gba:text-sm gba:whitespace-pre-wrap gba:text-foreground">{previewDraft.textBody}</p>
              <div className="gba:flex gba:items-center gba:gap-2">
                <Button
                  size="sm"
                  onClick={onAcceptPreview}
                  className={primaryActionButtonClassName}
                  data-testid={`${testId}-accept`}
                >
                  {t('assistant-accept')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onRejectPreview}
                  className={secondaryActionButtonClassName}
                  data-testid={`${testId}-reject`}
                >
                  {t('assistant-reject')}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {latestOutput?.insights && (
        <div
          className="gba:p-2 gba:rounded-md gba:border gba:border-input gba:bg-background/35 gba:space-y-1"
          data-testid={`${testId}-insights`}
        >
          <button
            type="button"
            className="gba:w-full gba:flex gba:items-center gba:justify-between"
            onClick={() => setIsInsightsExpanded(prev => !prev)}
            data-testid={`${testId}-insights-toggle`}
          >
            <p className="gba:text-xs">{t('assistant-insights')}</p>
            <span className="gba:text-xs gba:text-muted-foreground">{isInsightsExpanded ? '▾' : '▸'}</span>
          </button>
          {isInsightsExpanded && (
            <>
              <p className="gba:text-xs">
                {t('assistant-insight-scores', {
                  clarity: latestOutput.insights.clarity ?? 0,
                  formality: latestOutput.insights.formality ?? 0,
                  directness: latestOutput.insights.directness ?? 0,
                  recipientFit: latestOutput.insights.recipientFit ?? 0
                })}
              </p>
              {latestOutput.insights.suggestions.map((suggestion, index) => (
                <p key={`${suggestion}-${index}`} className="gba:text-xs">
                  - {suggestion}
                </p>
              ))}
            </>
          )}
        </div>
      )}

      {latestOutput?.temperatureCheck && (
        <div
          className="gba:p-2 gba:rounded-md gba:border gba:border-input gba:bg-background/35 gba:space-y-2"
          data-testid={`${testId}-temperature-block`}
        >
          <button
            type="button"
            className="gba:w-full gba:flex gba:items-center gba:justify-between"
            onClick={() => setIsRiskExpanded(prev => !prev)}
            data-testid={`${testId}-risk-toggle`}
          >
            <div className="gba:flex gba:items-center gba:gap-2">
              <span className="gba:text-xs">{t('assistant-risk-label')}</span>
              <Badge variant={riskVariant(latestOutput.temperatureCheck.riskLevel)}>
                {latestOutput.temperatureCheck.riskLevel}
              </Badge>
            </div>
            <span className="gba:text-xs gba:text-muted-foreground">{isRiskExpanded ? '▾' : '▸'}</span>
          </button>
          {isRiskExpanded && (
            <>
              {latestOutput.temperatureCheck.flags.length > 0 && (
                <div className="gba:space-y-1">
                  {latestOutput.temperatureCheck.flags.map(flagId => {
                    const label = t(`assistant-flag-${flagId}-label`)
                    const meaning = t(`assistant-flag-${flagId}-meaning`)
                    const resolvedLabel = label === `assistant-flag-${flagId}-label` ? formatFlagLabel(flagId) : label
                    const resolvedMeaning = meaning === `assistant-flag-${flagId}-meaning` ? '' : meaning

                    return (
                      <div key={flagId} className="gba:text-xs">
                        <p className="gba:font-medium">{resolvedLabel}</p>
                        {resolvedMeaning && <p className="gba:text-muted-foreground">{resolvedMeaning}</p>}
                      </div>
                    )
                  })}
                </div>
              )}
              {latestOutput.temperatureCheck.explanations.map((item, index) => (
                <p key={`${item}-${index}`} className="gba:text-xs">
                  {item}
                </p>
              ))}
              {latestOutput.temperatureCheck.alternatives.map((item, index) => (
                <p key={`${item}-${index}`} className="gba:text-xs">
                  {item}
                </p>
              ))}
            </>
          )}
        </div>
      )}

      {latestOutput?.missingContextPrompts && latestOutput.missingContextPrompts.length > 0 && (
        <div className="gba:flex gba:flex-wrap gba:gap-2" data-testid={`${testId}-missing-context`}>
          {latestOutput.missingContextPrompts.map(item => (
            <Badge key={item.key} variant="outline">
              {item.label}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
