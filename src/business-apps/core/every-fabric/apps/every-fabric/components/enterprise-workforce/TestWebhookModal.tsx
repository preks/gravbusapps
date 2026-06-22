// Operator modal to fire a webhook trigger with custom message content.
//
// Reuses the authenticated test-webhook API so signed webhooks do not
// require browser-side HMAC. Distinct from TestRunModal, which starts a
// manual run and does not exercise the webhook dispatch path.

import { Button, useTranslation } from '@newwork/nw-design-system'
import { PaperPlaneRightIcon, SpinnerGapIcon, WebhooksLogoIcon, XIcon } from '@phosphor-icons/react'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import type { WorkforceInboundDispatchResponse } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import translations from '../../_i18n'

export interface WebhookTestOption {
  agentId: string
  agentName: string
  triggerId: string
  triggerName: string
}

export interface TestWebhookModalProps {
  open: boolean
  options: WebhookTestOption[]
  preselected?: { agentId: string; triggerId: string }
  isDispatching: boolean
  errorMessage?: string | null
  onClose: () => void
  onSubmit: (triggerId: string, payload: { subject: string; body: string }) => Promise<WorkforceInboundDispatchResponse>
}

const DEFAULT_SUBJECT_KEY = 'testwebhook-default-subject'
const MESSAGE_PLACEHOLDER_KEY = 'testwebhook-message-placeholder'

function triggersForAgent(options: WebhookTestOption[], agentId: string): WebhookTestOption[] {
  return options.filter(option => option.agentId === agentId)
}

function agentIdsFromOptions(options: WebhookTestOption[]): string[] {
  const seen = new Set<string>()
  const ids: string[] = []
  for (const option of options) {
    if (seen.has(option.agentId)) continue
    seen.add(option.agentId)
    ids.push(option.agentId)
  }
  return ids
}

export const TestWebhookModal: React.FC<TestWebhookModalProps> = ({
  open,
  options,
  preselected,
  isDispatching,
  errorMessage,
  onClose,
  onSubmit
}) => {
  const { t } = useTranslation(translations)
  const defaultSubject = t(DEFAULT_SUBJECT_KEY)
  const [selectedAgentId, setSelectedAgentId] = useState('')
  const [selectedTriggerId, setSelectedTriggerId] = useState('')
  const [subject, setSubject] = useState(defaultSubject)
  const [message, setMessage] = useState('')

  const agentIds = useMemo(() => agentIdsFromOptions(options), [options])
  const triggerOptions = useMemo(
    () => (selectedAgentId ? triggersForAgent(options, selectedAgentId) : []),
    [options, selectedAgentId]
  )

  const isPreselected = Boolean(preselected)
  const showAgentPicker = !isPreselected && agentIds.length > 1
  const showTriggerPicker = !isPreselected && triggerOptions.length > 1

  useEffect(() => {
    if (!open) {
      setSelectedAgentId('')
      setSelectedTriggerId('')
      setSubject(defaultSubject)
      setMessage('')
      return
    }

    if (preselected) {
      setSelectedAgentId(preselected.agentId)
      setSelectedTriggerId(preselected.triggerId)
      return
    }

    const firstAgentId = agentIds[0] ?? ''
    setSelectedAgentId(firstAgentId)
    const firstTrigger = triggersForAgent(options, firstAgentId)[0]
    setSelectedTriggerId(firstTrigger?.triggerId ?? '')
  }, [open, preselected, agentIds, options, defaultSubject])

  useEffect(() => {
    if (!open || preselected) return
    const triggers = triggersForAgent(options, selectedAgentId)
    if (triggers.length === 0) {
      setSelectedTriggerId('')
      return
    }
    const stillValid = triggers.some(trigger => trigger.triggerId === selectedTriggerId)
    if (!stillValid) {
      setSelectedTriggerId(triggers[0].triggerId)
    }
  }, [open, preselected, options, selectedAgentId, selectedTriggerId])

  const isValid = message.trim().length > 0 && selectedTriggerId.length > 0
  const canSubmit = isValid && !isDispatching && options.length > 0

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return
    try {
      await onSubmit(selectedTriggerId, {
        subject: subject.trim() || defaultSubject,
        body: message.trim()
      })
      onClose()
    } catch {
      // Parent captures the error; keep the modal open for retry.
    }
  }, [canSubmit, defaultSubject, message, onClose, onSubmit, selectedTriggerId, subject])

  if (!open) return null

  const selectedAgentName = options.find(option => option.agentId === selectedAgentId)?.agentName ?? ''
  const selectedTriggerName = options.find(option => option.triggerId === selectedTriggerId)?.triggerName ?? ''

  return (
    <div
      className="gba:fixed gba:inset-0 gba:z-[60] gba:flex gba:items-center gba:justify-center gba:bg-background/70 gba:p-4 gba:backdrop-blur-sm"
      data-testid="workforce-test-webhook-modal"
    >
      <div className="gba:flex gba:max-h-[90vh] gba:w-full gba:max-w-xl gba:flex-col gba:overflow-hidden gba:rounded-2xl gba:border gba:border-border gba:bg-background gba:shadow-2xl">
        <div className="gba:flex gba:items-start gba:justify-between gba:gap-3 gba:border-b gba:border-border/60 gba:px-5 gba:py-4">
          <div>
            <h2 className="gba:flex gba:items-center gba:gap-2 gba:text-base gba:font-semibold gba:text-foreground">
              <WebhooksLogoIcon className="gba:h-4 gba:w-4" />
              {t('testwebhook-title')}
            </h2>
            <p className="gba:text-xs gba:text-muted-foreground">{t('testwebhook-desc')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="gba:inline-flex gba:h-8 gba:w-8 gba:items-center gba:justify-center gba:rounded-lg gba:text-muted-foreground gba:hover:bg-muted/60 gba:hover:text-foreground"
            aria-label={t('testwebhook-close-aria')}
            data-testid="workforce-test-webhook-close"
          >
            <XIcon className="gba:h-4 gba:w-4" />
          </button>
        </div>

        <div className="gba:flex-1 gba:overflow-y-auto gba:px-5 gba:py-4">
          {errorMessage && (
            <div
              className="gba:mb-4 gba:rounded-lg gba:border gba:border-destructive/40 gba:bg-destructive/5 gba:px-3 gba:py-2 gba:text-xs gba:text-destructive"
              data-testid="workforce-test-webhook-error"
              role="alert"
            >
              {errorMessage}
            </div>
          )}

          {options.length === 0 ? (
            <p className="gba:text-sm gba:text-muted-foreground" data-testid="workforce-test-webhook-empty">
              {t('testwebhook-empty')}
            </p>
          ) : (
            <div className="gba:space-y-4">
              {isPreselected && (
                <div className="gba:rounded-lg gba:border gba:border-border/60 gba:bg-muted/20 gba:px-3 gba:py-2">
                  <p className="gba:text-[11px] gba:font-medium gba:text-foreground">{selectedAgentName}</p>
                  <p className="gba:text-[11px] gba:text-muted-foreground">{selectedTriggerName}</p>
                </div>
              )}

              {showAgentPicker && (
                <div>
                  <label
                    htmlFor="workforce-test-webhook-agent"
                    className="gba:mb-1 gba:block gba:text-xs gba:font-semibold gba:text-foreground"
                  >
                    {t('testwebhook-agent-label')}
                  </label>
                  <select
                    id="workforce-test-webhook-agent"
                    value={selectedAgentId}
                    onChange={e => setSelectedAgentId(e.target.value)}
                    className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
                    data-testid="workforce-test-webhook-agent"
                  >
                    {agentIds.map(agentId => {
                      const name = options.find(option => option.agentId === agentId)?.agentName ?? agentId
                      return (
                        <option key={agentId} value={agentId}>
                          {name}
                        </option>
                      )
                    })}
                  </select>
                </div>
              )}

              {showTriggerPicker && (
                <div>
                  <label
                    htmlFor="workforce-test-webhook-trigger"
                    className="gba:mb-1 gba:block gba:text-xs gba:font-semibold gba:text-foreground"
                  >
                    {t('testwebhook-trigger-label')}
                  </label>
                  <select
                    id="workforce-test-webhook-trigger"
                    value={selectedTriggerId}
                    onChange={e => setSelectedTriggerId(e.target.value)}
                    className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
                    data-testid="workforce-test-webhook-trigger"
                  >
                    {triggerOptions.map(trigger => (
                      <option key={trigger.triggerId} value={trigger.triggerId}>
                        {trigger.triggerName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label
                  htmlFor="workforce-test-webhook-subject"
                  className="gba:mb-1 gba:block gba:text-xs gba:font-semibold gba:text-foreground"
                >
                  {t('testwebhook-subject-label')}
                </label>
                <input
                  id="workforce-test-webhook-subject"
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
                  data-testid="workforce-test-webhook-subject"
                />
              </div>

              <div>
                <label
                  htmlFor="workforce-test-webhook-message"
                  className="gba:mb-1 gba:block gba:text-xs gba:font-semibold gba:text-foreground"
                >
                  {t('testwebhook-message-label')}
                </label>
                <textarea
                  id="workforce-test-webhook-message"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder={t(MESSAGE_PLACEHOLDER_KEY)}
                  rows={6}
                  className="gba:w-full gba:resize-y gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:font-mono gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
                  data-testid="workforce-test-webhook-message"
                />
                <p className="gba:mt-1 gba:text-[11px] gba:text-muted-foreground">{t('testwebhook-message-hint')}</p>
              </div>
            </div>
          )}
        </div>

        <div className="gba:flex gba:items-center gba:justify-end gba:gap-2 gba:border-t gba:border-border/60 gba:bg-muted/20 gba:px-5 gba:py-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t('action-cancel')}
          </Button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
            className="gba:inline-flex gba:h-9 gba:items-center gba:justify-center gba:gap-1.5 gba:rounded-md gba:bg-primary gba:px-4 gba:text-sm gba:font-medium gba:text-primary-foreground gba:shadow-sm gba:transition-colors gba:hover:bg-primary/90 gba:disabled:cursor-not-allowed gba:disabled:opacity-50"
            data-testid="workforce-test-webhook-submit"
          >
            {isDispatching ? (
              <SpinnerGapIcon className="gba:h-3.5 gba:w-3.5 gba:animate-spin" />
            ) : (
              <PaperPlaneRightIcon className="gba:h-3.5 gba:w-3.5" />
            )}
            {isDispatching ? t('testwebhook-sending') : t('testwebhook-submit')}
          </button>
        </div>
      </div>
    </div>
  )
}
