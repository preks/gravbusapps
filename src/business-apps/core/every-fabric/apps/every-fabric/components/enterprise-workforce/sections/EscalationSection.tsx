// Escalation section - who and how the agent hands work back.
//
// Required by the backend whenever autonomy is full_auto or budget is
// set to "escalate". The UI shows that contract inline so users don't
// hit a surprise 400 on save.

import { Button } from '@newwork/nw-design-system'
import { BellIcon, TrashIcon } from '@phosphor-icons/react'
import React, { useEffect, useState } from 'react'
import type { WorkforceAgent, WorkforceAgentUpdateInput } from '../workforceTypes'
import { SectionShell } from './SectionShell'

interface EscalationSectionProps {
  agent: WorkforceAgent
  isSaving: boolean
  onSave: (patch: WorkforceAgentUpdateInput) => Promise<void>
}

interface FormState {
  ownerUserId: string
  ticketQueue: string
  notifyEmails: string[]
  emailDraft: string
  confidenceThreshold: number
  blockedIntents: string[]
  intentDraft: string
}

function fromAgent(agent: WorkforceAgent): FormState {
  const policy = agent.workforce_profile.escalation
  return {
    ownerUserId: policy.owner_user_id ?? '',
    ticketQueue: policy.ticket_queue ?? '',
    notifyEmails: [...policy.notify_emails],
    emailDraft: '',
    confidenceThreshold: policy.confidence_threshold,
    blockedIntents: [...policy.blocked_intents],
    intentDraft: ''
  }
}

function asPatchPolicy(form: FormState) {
  return {
    owner_user_id: form.ownerUserId.trim() || null,
    ticket_queue: form.ticketQueue.trim() || null,
    notify_emails: form.notifyEmails,
    confidence_threshold: form.confidenceThreshold,
    blocked_intents: form.blockedIntents
  }
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  return a.every((v, i) => v === b[i])
}

function isDirty(form: FormState, baseline: FormState): boolean {
  return (
    form.ownerUserId !== baseline.ownerUserId ||
    form.ticketQueue !== baseline.ticketQueue ||
    form.confidenceThreshold !== baseline.confidenceThreshold ||
    !arraysEqual(form.notifyEmails, baseline.notifyEmails) ||
    !arraysEqual(form.blockedIntents, baseline.blockedIntents)
  )
}

export const EscalationSection: React.FC<EscalationSectionProps> = ({ agent, isSaving, onSave }) => {
  const baseline = fromAgent(agent)
  const [form, setForm] = useState<FormState>(baseline)

  useEffect(() => {
    setForm(fromAgent(agent))
  }, [agent])

  const dirty = isDirty(form, baseline)

  const addEmail = () => {
    const trimmed = form.emailDraft.trim()
    if (!trimmed || form.notifyEmails.includes(trimmed)) return
    setForm(prev => ({ ...prev, notifyEmails: [...prev.notifyEmails, trimmed], emailDraft: '' }))
  }

  const removeEmail = (email: string) => {
    setForm(prev => ({ ...prev, notifyEmails: prev.notifyEmails.filter(e => e !== email) }))
  }

  const addIntent = () => {
    const trimmed = form.intentDraft.trim()
    if (!trimmed || form.blockedIntents.includes(trimmed)) return
    setForm(prev => ({ ...prev, blockedIntents: [...prev.blockedIntents, trimmed], intentDraft: '' }))
  }

  const removeIntent = (intent: string) => {
    setForm(prev => ({ ...prev, blockedIntents: prev.blockedIntents.filter(i => i !== intent) }))
  }

  return (
    <SectionShell
      id="escalation"
      title="Escalation"
      icon={BellIcon}
      description="How the agent hands work back to humans. Full-auto agents and 'escalate' budgets need at least one channel."
      isDirty={dirty}
      isSaving={isSaving}
      onSave={() => void onSave({ escalation: asPatchPolicy(form) })}
      onReset={() => setForm(baseline)}
    >
      <div className="gba:grid gba:grid-cols-1 gba:gap-3 gba:sm:grid-cols-2">
        <div>
          <label
            htmlFor="ws-esc-owner"
            className="gba:mb-1 gba:block gba:text-xs gba:font-semibold gba:text-foreground"
          >
            Owner user ID
          </label>
          <input
            id="ws-esc-owner"
            value={form.ownerUserId}
            onChange={e => setForm(prev => ({ ...prev, ownerUserId: e.target.value }))}
            className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
            data-testid="workforce-escalation-owner"
          />
        </div>
        <div>
          <label
            htmlFor="ws-esc-queue"
            className="gba:mb-1 gba:block gba:text-xs gba:font-semibold gba:text-foreground"
          >
            Ticket queue
          </label>
          <input
            id="ws-esc-queue"
            value={form.ticketQueue}
            onChange={e => setForm(prev => ({ ...prev, ticketQueue: e.target.value }))}
            placeholder="e.g. ops-tier-1"
            className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
            data-testid="workforce-escalation-queue"
          />
        </div>
      </div>

      <div className="gba:mt-4">
        <label className="gba:mb-1 gba:block gba:text-xs gba:font-semibold gba:text-foreground">Notify emails</label>
        <div className="gba:flex gba:gap-2">
          <input
            type="email"
            value={form.emailDraft}
            onChange={e => setForm(prev => ({ ...prev, emailDraft: e.target.value }))}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addEmail()
              }
            }}
            placeholder="ops@acme.com"
            className="gba:h-9 gba:flex-1 gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
            data-testid="workforce-escalation-email-input"
          />
          <Button size="sm" variant="outline" onClick={addEmail} data-testid="workforce-escalation-email-add">
            Add
          </Button>
        </div>
        <ul className="gba:mt-2 gba:flex gba:flex-wrap gba:gap-1.5" data-testid="workforce-escalation-email-list">
          {form.notifyEmails.map(email => (
            <li
              key={email}
              className="gba:inline-flex gba:items-center gba:gap-1 gba:rounded-full gba:bg-muted gba:px-2 gba:py-0.5 gba:text-[11px] gba:text-foreground"
            >
              <span>{email}</span>
              <button
                type="button"
                onClick={() => removeEmail(email)}
                aria-label={`Remove ${email}`}
                className="gba:text-muted-foreground gba:hover:text-destructive"
                data-testid={`workforce-escalation-email-remove-${email}`}
              >
                <TrashIcon className="gba:h-3 gba:w-3" />
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="gba:mt-4">
        <label
          htmlFor="ws-esc-confidence"
          className="gba:mb-1 gba:block gba:text-xs gba:font-semibold gba:text-foreground"
        >
          Confidence threshold ({form.confidenceThreshold.toFixed(2)})
        </label>
        <input
          id="ws-esc-confidence"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={form.confidenceThreshold}
          onChange={e => setForm(prev => ({ ...prev, confidenceThreshold: Number(e.target.value) }))}
          className="gba:w-full"
          data-testid="workforce-escalation-confidence"
        />
        <p className="gba:mt-1 gba:text-[11px] gba:text-muted-foreground">
          The agent escalates if its self-assessed confidence on the next action falls below this.
        </p>
      </div>

      <div className="gba:mt-4">
        <label className="gba:mb-1 gba:block gba:text-xs gba:font-semibold gba:text-foreground">Blocked intents</label>
        <div className="gba:flex gba:gap-2">
          <input
            value={form.intentDraft}
            onChange={e => setForm(prev => ({ ...prev, intentDraft: e.target.value }))}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addIntent()
              }
            }}
            placeholder="e.g. cancel_contract"
            className="gba:h-9 gba:flex-1 gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
            data-testid="workforce-escalation-intent-input"
          />
          <Button size="sm" variant="outline" onClick={addIntent} data-testid="workforce-escalation-intent-add">
            Add
          </Button>
        </div>
        <ul className="gba:mt-2 gba:flex gba:flex-wrap gba:gap-1.5" data-testid="workforce-escalation-intent-list">
          {form.blockedIntents.map(intent => (
            <li
              key={intent}
              className="gba:inline-flex gba:items-center gba:gap-1 gba:rounded-full gba:bg-destructive/10 gba:px-2 gba:py-0.5 gba:text-[11px] gba:text-destructive"
            >
              <span>{intent}</span>
              <button
                type="button"
                onClick={() => removeIntent(intent)}
                aria-label={`Remove ${intent}`}
                className="gba:hover:text-destructive/70"
                data-testid={`workforce-escalation-intent-remove-${intent}`}
              >
                <TrashIcon className="gba:h-3 gba:w-3" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </SectionShell>
  )
}
