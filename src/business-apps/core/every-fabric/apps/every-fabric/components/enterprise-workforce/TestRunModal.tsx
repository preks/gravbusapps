// "Test run" modal launched from the Workforce Agent configuration view.
//
// Captures one free-form task string, optionally bound to an existing
// trigger (so the operator can rehearse a scheduled job from the UI),
// and hands it to the parent hook's ``startRun`` mutation. The modal
// closes on success; errors are kept inline so the operator can adjust
// and retry without losing the typed task.

import { Button, useTranslation } from '@newwork/nw-design-system'
import { PaperPlaneRightIcon, SpinnerGapIcon, XIcon } from '@phosphor-icons/react'
import React, { useCallback, useEffect, useState } from 'react'
import { findDemoInboundEmail, formatDemoInboundEmailAsTask, INSURANCE_DEMO_INBOUND_EMAILS } from './demoInboundEmails'
import type { WorkforceAgent, WorkforceRun, WorkforceRunCreateInput, WorkforceTrigger } from './workforceTypes'
import translations from '../../_i18n'

export interface TestRunModalProps {
  open: boolean
  agent: WorkforceAgent
  triggers: WorkforceTrigger[]
  isStarting: boolean
  errorMessage?: string | null
  onClose: () => void
  onSubmit: (input: WorkforceRunCreateInput) => Promise<WorkforceRun>
}

const PLACEHOLDER_KEY = 'testrun-task-placeholder'

export const TestRunModal: React.FC<TestRunModalProps> = ({
  open,
  agent,
  triggers,
  isStarting,
  errorMessage,
  onClose,
  onSubmit
}) => {
  const { t } = useTranslation(translations)
  const [task, setTask] = useState('')
  const [selectedTriggerId, setSelectedTriggerId] = useState<string>('')
  const [selectedDemoEmailId, setSelectedDemoEmailId] = useState<string>('')

  useEffect(() => {
    if (!open) {
      setTask('')
      setSelectedTriggerId('')
      setSelectedDemoEmailId('')
    }
  }, [open])

  const selectedDemoEmail = selectedDemoEmailId ? findDemoInboundEmail(selectedDemoEmailId) : undefined

  const handleDemoEmailChange = useCallback((emailId: string) => {
    setSelectedDemoEmailId(emailId)
    if (!emailId) return
    const email = findDemoInboundEmail(emailId)
    if (email) {
      setTask(formatDemoInboundEmailAsTask(email))
    }
  }, [])

  const isValid = task.trim().length > 0
  const canSubmit = isValid && !isStarting

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return
    try {
      await onSubmit({
        input: task.trim(),
        trigger_id: selectedTriggerId || null
      })
      onClose()
    } catch {
      // Hook captured the error in shared state; keep the modal open
      // so the operator can adjust and retry.
    }
  }, [canSubmit, onClose, onSubmit, selectedTriggerId, task])

  if (!open) return null

  return (
    <div
      className="gba:fixed gba:inset-0 gba:z-[60] gba:flex gba:items-center gba:justify-center gba:bg-background/70 gba:p-4 gba:backdrop-blur-sm"
      data-testid="workforce-test-run-modal"
    >
      <div className="gba:flex gba:max-h-[90vh] gba:w-full gba:max-w-xl gba:flex-col gba:overflow-hidden gba:rounded-2xl gba:border gba:border-border gba:bg-background gba:shadow-2xl">
        <div className="gba:flex gba:items-start gba:justify-between gba:gap-3 gba:border-b gba:border-border/60 gba:px-5 gba:py-4">
          <div>
            <h2 className="gba:text-base gba:font-semibold gba:text-foreground">
              {t('testrun-title', { name: agent.display_name || agent.name })}
            </h2>
            <p className="gba:text-xs gba:text-muted-foreground">{t('testrun-desc')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="gba:inline-flex gba:h-8 gba:w-8 gba:items-center gba:justify-center gba:rounded-lg gba:text-muted-foreground gba:hover:bg-muted/60 gba:hover:text-foreground"
            aria-label={t('action-close')}
            data-testid="workforce-test-run-close"
          >
            <XIcon className="gba:h-4 gba:w-4" />
          </button>
        </div>

        <div className="gba:flex-1 gba:overflow-y-auto gba:px-5 gba:py-4">
          {errorMessage && (
            <div
              className="gba:mb-4 gba:rounded-lg gba:border gba:border-destructive/40 gba:bg-destructive/5 gba:px-3 gba:py-2 gba:text-xs gba:text-destructive"
              data-testid="workforce-test-run-error"
              role="alert"
            >
              {errorMessage}
            </div>
          )}

          <div className="gba:space-y-4">
            <div>
              <label
                htmlFor="workforce-test-run-demo-email"
                className="gba:mb-1 gba:block gba:text-xs gba:font-semibold gba:text-foreground"
              >
                {t('testrun-demo-email')}
              </label>
              <select
                id="workforce-test-run-demo-email"
                value={selectedDemoEmailId}
                onChange={e => handleDemoEmailChange(e.target.value)}
                className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
                data-testid="workforce-test-run-demo-email"
              >
                <option value="">{t('testrun-custom-task')}</option>
                {INSURANCE_DEMO_INBOUND_EMAILS.map(email => (
                  <option key={email.id} value={email.id}>
                    {email.scenario}
                  </option>
                ))}
              </select>
              {selectedDemoEmail && (
                <p
                  className="gba:mt-1 gba:text-[11px] gba:text-muted-foreground"
                  data-testid="workforce-test-run-demo-email-hint"
                >
                  {t('testrun-expected', { path: selectedDemoEmail.expected_path })}
                </p>
              )}
              {!selectedDemoEmail && (
                <p className="gba:mt-1 gba:text-[11px] gba:text-muted-foreground">{t('testrun-demo-hint')}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="workforce-test-run-task"
                className="gba:mb-1 gba:block gba:text-xs gba:font-semibold gba:text-foreground"
              >
                {t('testrun-task')}
              </label>
              <textarea
                id="workforce-test-run-task"
                value={task}
                onChange={e => setTask(e.target.value)}
                placeholder={t(PLACEHOLDER_KEY)}
                rows={6}
                className="gba:w-full gba:resize-y gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:font-mono gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
                data-testid="workforce-test-run-task"
              />
              <p className="gba:mt-1 gba:text-[11px] gba:text-muted-foreground">{t('testrun-task-hint')}</p>
            </div>

            {triggers.length > 0 && (
              <div>
                <label
                  htmlFor="workforce-test-run-trigger"
                  className="gba:mb-1 gba:block gba:text-xs gba:font-semibold gba:text-foreground"
                >
                  {t('testrun-trigger-label')}
                </label>
                <select
                  id="workforce-test-run-trigger"
                  value={selectedTriggerId}
                  onChange={e => setSelectedTriggerId(e.target.value)}
                  className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
                  data-testid="workforce-test-run-trigger"
                >
                  <option value="">{t('testrun-trigger-none')}</option>
                  {triggers.map(trigger => (
                    <option key={trigger.trigger_id} value={trigger.trigger_id}>
                      {trigger.name || trigger.type} · {trigger.type}
                    </option>
                  ))}
                </select>
                <p className="gba:mt-1 gba:text-[11px] gba:text-muted-foreground">{t('testrun-trigger-hint')}</p>
              </div>
            )}
          </div>
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
            data-testid="workforce-test-run-submit"
          >
            {isStarting ? (
              <SpinnerGapIcon className="gba:h-3.5 gba:w-3.5 gba:animate-spin" />
            ) : (
              <PaperPlaneRightIcon className="gba:h-3.5 gba:w-3.5" />
            )}
            {isStarting ? t('testrun-starting') : t('testrun-submit')}
          </button>
        </div>
      </div>
    </div>
  )
}
