// Triggers section - what makes the agent start working without a chat.
//
// Lists existing triggers with toggle/delete, plus a small inline form
// to create a new one. The trigger type drives which config fields are
// shown so users cannot save a half-configured trigger that the backend
// would reject anyway.

import { Button } from '@newwork/nw-design-system'
import {
  CalendarIcon,
  CheckIcon,
  CopyIcon,
  EnvelopeIcon,
  LightningIcon,
  PlusIcon,
  TrashIcon,
  WebhooksLogoIcon
} from '@phosphor-icons/react'
import React, { useCallback, useMemo, useState } from 'react'
import type {
  WorkforceTrigger,
  WorkforceTriggerCreateInput,
  WorkforceTriggerType,
  WorkforceTriggerUpdateInput
} from '../workforceTypes'
import { formatTimestamp } from '../runDisplay'
import { InboundMailboxPicker } from './InboundMailboxPicker'

interface TriggersSectionProps {
  triggers: WorkforceTrigger[]
  pendingTriggerId: string | null
  onCreate: (input: WorkforceTriggerCreateInput) => Promise<void>
  onUpdate: (triggerId: string, input: WorkforceTriggerUpdateInput) => Promise<void>
  onDelete: (triggerId: string) => Promise<void>
  // Needed by the inbound-email mailbox picker to list the operator's
  // connected mailboxes. Optional so existing render-only tests can omit it.
  accessToken?: string
}

const TYPE_META: Record<WorkforceTriggerType, { label: string; hint: string; Icon: typeof CalendarIcon }> = {
  manual: { label: 'Manual', hint: 'Operator starts the agent from the UI.', Icon: LightningIcon },
  schedule: { label: 'Schedule', hint: 'Runs on a cron schedule or fixed interval.', Icon: CalendarIcon },
  webhook: { label: 'Webhook', hint: 'External system POSTs to start a run.', Icon: WebhooksLogoIcon },
  inbound_email: { label: 'Inbound email', hint: 'New emails to a mailbox start a run.', Icon: EnvelopeIcon }
}

function describeConfig(trigger: WorkforceTrigger): string {
  const cfg = trigger.config || {}
  switch (trigger.type) {
    case 'schedule':
      if (typeof cfg.cron === 'string') return `cron: ${cfg.cron}`
      if (typeof cfg.interval_minutes === 'number') return `every ${cfg.interval_minutes} min`
      return 'not configured'
    case 'inbound_email':
      return typeof cfg.mailbox === 'string' ? cfg.mailbox : 'no mailbox'
    case 'webhook':
      return typeof cfg.secret === 'string' ? 'secret set' : 'no secret'
    default:
      return ''
  }
}

interface CreateFormState {
  type: WorkforceTriggerType
  name: string
  cron: string
  intervalMinutes: string
  mailbox: string
  // Bound from the connected-mailbox picker, never typed. Both mailbox and
  // emailAccountId are set together when an account is selected.
  emailAccountId: string
  webhookSecret: string
}

const EMPTY_FORM: CreateFormState = {
  type: 'schedule',
  name: '',
  cron: '',
  intervalMinutes: '',
  mailbox: '',
  emailAccountId: '',
  webhookSecret: ''
}

function buildCreateInput(form: CreateFormState): WorkforceTriggerCreateInput | { error: string } {
  const base: WorkforceTriggerCreateInput = {
    type: form.type,
    name: form.name.trim(),
    enabled: true,
    config: {}
  }
  switch (form.type) {
    case 'schedule': {
      const cron = form.cron.trim()
      const interval = form.intervalMinutes.trim()
      if (!cron && !interval) {
        return { error: "Schedule triggers need either 'cron' or 'interval_minutes'." }
      }
      if (cron) base.config!.cron = cron
      if (interval) {
        const parsed = Number(interval)
        if (!Number.isFinite(parsed) || parsed <= 0 || Math.floor(parsed) !== parsed) {
          return { error: "'interval_minutes' must be a positive integer." }
        }
        base.config!.interval_minutes = parsed
      }
      return base
    }
    case 'inbound_email': {
      const mailbox = form.mailbox.trim()
      const emailAccountId = form.emailAccountId.trim()
      if (!mailbox || !emailAccountId) {
        return { error: 'Select a connected mailbox for inbound email triggers.' }
      }
      base.config!.mailbox = mailbox
      base.config!.email_account_id = emailAccountId
      return base
    }
    case 'webhook': {
      const secret = form.webhookSecret.trim()
      if (secret) base.config!.secret = secret
      return base
    }
    case 'manual':
    default:
      return base
  }
}

export const TriggersSection: React.FC<TriggersSectionProps> = ({
  triggers,
  pendingTriggerId,
  onCreate,
  onUpdate,
  onDelete,
  accessToken = ''
}) => {
  const [isAdding, setIsAdding] = useState(false)
  const [form, setForm] = useState<CreateFormState>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const isCreating = pendingTriggerId === '__create__'

  const handleSubmit = async () => {
    const result = buildCreateInput(form)
    if ('error' in result) {
      setFormError(result.error)
      return
    }
    setFormError(null)
    try {
      await onCreate(result)
      setForm(EMPTY_FORM)
      setIsAdding(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create trigger.')
    }
  }

  const sortedTriggers = useMemo(
    () => [...triggers].sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0)),
    [triggers]
  )

  return (
    <section
      data-testid="workforce-config-section-triggers"
      className="gba:rounded-2xl gba:border gba:border-border gba:bg-card"
    >
      <header className="gba:flex gba:items-start gba:justify-between gba:gap-4 gba:border-b gba:border-border/60 gba:px-5 gba:py-3">
        <div>
          <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">Triggers</h3>
          <p className="gba:mt-0.5 gba:text-xs gba:text-muted-foreground">
            What makes this agent start working without a chat.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setIsAdding(prev => !prev)
            setFormError(null)
          }}
          data-testid="workforce-trigger-toggle-add"
        >
          <PlusIcon className="gba:mr-1 gba:h-3.5 gba:w-3.5" />
          {isAdding ? 'Cancel' : 'New trigger'}
        </Button>
      </header>

      <div className="gba:px-5 gba:py-4">
        {isAdding && (
          <div
            className="gba:mb-4 gba:rounded-lg gba:border gba:border-dashed gba:border-border gba:bg-muted/20 gba:p-3"
            data-testid="workforce-trigger-create-form"
          >
            <div className="gba:grid gba:grid-cols-1 gba:gap-2 gba:sm:grid-cols-2">
              <select
                aria-label="Trigger type"
                value={form.type}
                onChange={e => setForm(prev => ({ ...prev, type: e.target.value as WorkforceTriggerType }))}
                className="gba:h-9 gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-2 gba:text-xs gba:text-foreground"
                data-testid="workforce-trigger-create-type"
              >
                {(Object.keys(TYPE_META) as WorkforceTriggerType[]).map(type => (
                  <option key={type} value={type}>
                    {TYPE_META[type].label}
                  </option>
                ))}
              </select>
              <input
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Optional name"
                className="gba:h-9 gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:text-sm gba:text-foreground"
                data-testid="workforce-trigger-create-name"
              />
            </div>

            {form.type === 'schedule' && (
              <div className="gba:mt-2 gba:grid gba:grid-cols-1 gba:gap-2 gba:sm:grid-cols-2">
                <input
                  value={form.cron}
                  onChange={e => setForm(prev => ({ ...prev, cron: e.target.value }))}
                  placeholder="cron e.g. 0 8 * * MON"
                  className="gba:h-9 gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:text-sm"
                  data-testid="workforce-trigger-create-cron"
                />
                <input
                  type="number"
                  min={1}
                  value={form.intervalMinutes}
                  onChange={e => setForm(prev => ({ ...prev, intervalMinutes: e.target.value }))}
                  placeholder="or interval (minutes)"
                  className="gba:h-9 gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:text-sm"
                  data-testid="workforce-trigger-create-interval"
                />
              </div>
            )}

            {form.type === 'inbound_email' && (
              <InboundMailboxPicker
                accessToken={accessToken}
                selectedAccountId={form.emailAccountId || null}
                onSelect={account =>
                  setForm(prev => ({
                    ...prev,
                    mailbox: account?.emailAddress ?? '',
                    emailAccountId: account?.id ?? ''
                  }))
                }
              />
            )}

            {form.type === 'webhook' && (
              <input
                value={form.webhookSecret}
                onChange={e => setForm(prev => ({ ...prev, webhookSecret: e.target.value }))}
                placeholder="Optional shared secret"
                className="gba:mt-2 gba:h-9 gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:text-sm"
                data-testid="workforce-trigger-create-secret"
              />
            )}

            <p className="gba:mt-2 gba:text-[11px] gba:text-muted-foreground">{TYPE_META[form.type].hint}</p>

            {formError && (
              <p className="gba:mt-2 gba:text-[11px] gba:text-destructive" data-testid="workforce-trigger-create-error">
                {formError}
              </p>
            )}

            <div className="gba:mt-3 gba:flex gba:justify-end gba:gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsAdding(false)
                  setForm(EMPTY_FORM)
                  setFormError(null)
                }}
              >
                Cancel
              </Button>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={isCreating}
                className="gba:inline-flex gba:h-8 gba:items-center gba:rounded-md gba:bg-primary gba:px-3 gba:text-xs gba:font-medium gba:text-primary-foreground gba:hover:bg-primary/90 gba:disabled:opacity-50"
                data-testid="workforce-trigger-create-submit"
              >
                {isCreating ? 'Creating…' : 'Create trigger'}
              </button>
            </div>
          </div>
        )}

        {sortedTriggers.length === 0 ? (
          <p className="gba:text-xs gba:italic gba:text-muted-foreground" data-testid="workforce-trigger-empty">
            No triggers yet — add a schedule, inbound mailbox, or webhook to make this agent proactive.
          </p>
        ) : (
          <ul className="gba:space-y-2" data-testid="workforce-trigger-list">
            {sortedTriggers.map(trigger => {
              const meta = TYPE_META[trigger.type]
              const Icon = meta.Icon
              const isPending = pendingTriggerId === trigger.trigger_id
              return (
                <li
                  key={trigger.trigger_id}
                  className="gba:flex gba:flex-col gba:gap-2 gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2"
                  data-testid={`workforce-trigger-${trigger.trigger_id}`}
                >
                  <div className="gba:flex gba:items-center gba:justify-between gba:gap-3">
                    <div className="gba:flex gba:min-w-0 gba:items-center gba:gap-2">
                      <span
                        className={`gba:inline-flex gba:h-7 gba:w-7 gba:items-center gba:justify-center gba:rounded-md ${
                          trigger.enabled
                            ? 'gba:bg-emerald-50 gba:text-emerald-700'
                            : 'gba:bg-muted gba:text-muted-foreground'
                        }`}
                      >
                        <Icon className="gba:h-3.5 gba:w-3.5" />
                      </span>
                      <div className="gba:min-w-0">
                        <p className="gba:truncate gba:text-xs gba:font-medium gba:text-foreground">
                          {trigger.name || meta.label}
                        </p>
                        <p className="gba:truncate gba:text-[11px] gba:text-muted-foreground">
                          {meta.label} · {describeConfig(trigger)}
                        </p>
                      </div>
                    </div>
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isPending}
                        onClick={() => void onUpdate(trigger.trigger_id, { enabled: !trigger.enabled })}
                        data-testid={`workforce-trigger-toggle-${trigger.trigger_id}`}
                      >
                        {trigger.enabled ? 'Disable' : 'Enable'}
                      </Button>
                      <button
                        type="button"
                        onClick={() => void onDelete(trigger.trigger_id)}
                        disabled={isPending}
                        aria-label={`Delete trigger ${trigger.name || trigger.type}`}
                        className="gba:inline-flex gba:h-7 gba:w-7 gba:items-center gba:justify-center gba:rounded-md gba:text-muted-foreground gba:hover:bg-destructive/10 gba:hover:text-destructive gba:disabled:opacity-50"
                        data-testid={`workforce-trigger-delete-${trigger.trigger_id}`}
                      >
                        <TrashIcon className="gba:h-3.5 gba:w-3.5" />
                      </button>
                    </div>
                  </div>
                  <InboundConnectionDetails trigger={trigger} />
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Inbound connection details (webhook URL / mailbox)
// ---------------------------------------------------------------------------

// Resolves the absolute URL operators give to upstream callers. The
// backend ships a path-relative ``webhook_url``; the UI joins it with
// the current origin so the displayed value is copy-paste ready.
function resolveAbsoluteWebhookUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path
  const origin = typeof window !== 'undefined' && window.location ? window.location.origin : ''
  if (!origin) return path
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`
}

function formatLastFired(iso: string | null | undefined): string | null {
  if (!iso) return null
  const formatted = formatTimestamp(iso)
  return formatted === '—' ? null : formatted
}

interface InboundConnectionDetailsProps {
  trigger: WorkforceTrigger
}

const InboundConnectionDetails: React.FC<InboundConnectionDetailsProps> = ({ trigger }) => {
  if (trigger.type !== 'webhook' && trigger.type !== 'inbound_email') return null
  return (
    <div
      className="gba:flex gba:flex-col gba:gap-1 gba:rounded-md gba:bg-muted/30 gba:px-3 gba:py-2"
      data-testid={`workforce-trigger-inbound-${trigger.trigger_id}`}
    >
      {trigger.type === 'webhook' && <WebhookDetails trigger={trigger} />}
      {trigger.type === 'inbound_email' && <InboundEmailDetails trigger={trigger} />}
      <LastFiredHint trigger={trigger} />
    </div>
  )
}

interface DetailsProps {
  trigger: WorkforceTrigger
}

const WebhookDetails: React.FC<DetailsProps> = ({ trigger }) => {
  const absoluteUrl = useMemo(() => resolveAbsoluteWebhookUrl(trigger.webhook_url), [trigger.webhook_url])
  const hasSecret = typeof trigger.config?.secret === 'string' && (trigger.config.secret as string).length > 0

  if (!absoluteUrl) {
    return (
      <p
        className="gba:text-[11px] gba:italic gba:text-muted-foreground"
        data-testid={`workforce-trigger-webhook-url-missing-${trigger.trigger_id}`}
      >
        Webhook URL not provided by the backend. Re-fetch the trigger to populate it.
      </p>
    )
  }

  return (
    <div className="gba:flex gba:flex-col gba:gap-1">
      <p className="gba:text-[11px] gba:font-medium gba:text-foreground">Webhook URL</p>
      <div className="gba:flex gba:items-center gba:gap-2">
        <code
          className="gba:flex-1 gba:overflow-hidden gba:rounded gba:border gba:border-border gba:bg-background gba:px-2 gba:py-1 gba:text-[11px] gba:text-foreground"
          data-testid={`workforce-trigger-webhook-url-${trigger.trigger_id}`}
          title={absoluteUrl}
        >
          {absoluteUrl}
        </code>
        <CopyButton value={absoluteUrl} testId={`workforce-trigger-webhook-copy-${trigger.trigger_id}`} />
      </div>
      <p className="gba:text-[11px] gba:text-muted-foreground">
        {hasSecret
          ? 'POST a JSON body with header X-Workforce-Signature: sha256=<HMAC-SHA256 of the body using your secret>.'
          : 'POST a JSON body. Optional: configure a secret to require an X-Workforce-Signature header.'}
      </p>
    </div>
  )
}

const InboundEmailDetails: React.FC<DetailsProps> = ({ trigger }) => {
  const mailbox = typeof trigger.config?.mailbox === 'string' ? (trigger.config.mailbox as string) : ''
  if (!mailbox) {
    return <p className="gba:text-[11px] gba:italic gba:text-muted-foreground">No mailbox configured.</p>
  }
  return (
    <div className="gba:flex gba:flex-col gba:gap-1">
      <p className="gba:text-[11px] gba:font-medium gba:text-foreground">Inbound mailbox</p>
      <div className="gba:flex gba:items-center gba:gap-2">
        <code
          className="gba:flex-1 gba:overflow-hidden gba:rounded gba:border gba:border-border gba:bg-background gba:px-2 gba:py-1 gba:text-[11px] gba:text-foreground"
          data-testid={`workforce-trigger-mailbox-${trigger.trigger_id}`}
        >
          {mailbox}
        </code>
        <CopyButton value={mailbox} testId={`workforce-trigger-mailbox-copy-${trigger.trigger_id}`} />
      </div>
      <p className="gba:text-[11px] gba:text-muted-foreground">
        Forward messages here from your email provider. The router fires the agent once per matched recipient.
      </p>
    </div>
  )
}

const LastFiredHint: React.FC<DetailsProps> = ({ trigger }) => {
  const lastFired = formatLastFired(trigger.last_fired_at)
  if (!lastFired) return null
  return (
    <p
      className="gba:text-[11px] gba:text-muted-foreground"
      data-testid={`workforce-trigger-last-fired-${trigger.trigger_id}`}
    >
      Last fired {lastFired}
    </p>
  )
}

interface CopyButtonProps {
  value: string
  testId: string
}

const CopyButton: React.FC<CopyButtonProps> = ({ value, testId }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1500)
      }
    } catch {
      // Clipboard failures are non-fatal; the value is selectable in
      // the rendered <code> block as a fallback.
    }
  }, [value])

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className="gba:inline-flex gba:h-7 gba:w-7 gba:items-center gba:justify-center gba:rounded-md gba:border gba:border-border gba:bg-background gba:text-muted-foreground gba:hover:bg-muted/60 gba:hover:text-foreground"
      data-testid={testId}
      aria-label="Copy to clipboard"
    >
      {copied ? (
        <CheckIcon className="gba:h-3.5 gba:w-3.5 gba:text-emerald-600" />
      ) : (
        <CopyIcon className="gba:h-3.5 gba:w-3.5" />
      )}
    </button>
  )
}
