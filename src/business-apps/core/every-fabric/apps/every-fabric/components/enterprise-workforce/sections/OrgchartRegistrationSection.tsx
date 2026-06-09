// "Orgchart identity" section — registers the workforce agent as a virtual
// assistant in the orgchart via FlowBot's /virtual-assistants API:
//   1. create (or reuse) a Keycloak user for the agent
//   2. create the orgchart employee linked to that user
//   3. persist {keycloak_user_id, employee_id, org_unit_id} on the agent's
//      workforce profile so headless runs authenticate AS the agent
//      (token exchange in prompt-manager) instead of the shared service account.

import { Button } from '@newwork/nw-design-system'
import { SpinnerGapIcon, UserCirclePlusIcon } from '@phosphor-icons/react'
import React, { useState } from 'react'
import { flowbotClient } from '@/common/network/flowbot'
import type { WorkforceAgent, WorkforceAgentUpdateInput } from '../workforceTypes'

interface OrgchartRegistrationSectionProps {
  agent: WorkforceAgent
  accessToken: string
  isSaving: boolean
  onSave: (patch: WorkforceAgentUpdateInput) => Promise<void>
}

/** Derive a Keycloak-safe username from the agent's machine name. */
export function agentUsername(agentName: string): string {
  const cleaned = agentName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
  return cleaned ? `agent-${cleaned}` : 'agent'
}

/** Split a display name into first/last for the employee record. */
export function splitDisplayName(displayName: string, fallback: string): { firstName: string; lastName: string } {
  const cleaned = (displayName || fallback || 'Agent').trim()
  const parts = cleaned.split(/\s+/)
  if (parts.length === 1) return { firstName: parts[0], lastName: 'Agent' }
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] }
}

function describeRegistrationError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err)
  if (message.includes('503')) {
    return 'Keycloak user creation is disabled on this tenant (KEYCLOAK_USER_CREATION_ENABLED). Create the user manually and paste its ID below.'
  }
  if (message.includes('409')) {
    return 'A Keycloak user or employee with this identity already exists. Paste the existing Keycloak user ID below to link it instead.'
  }
  return message
}

const inputClass =
  'gba:h-8 gba:w-full gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-2.5 gba:text-xs gba:text-foreground gba:focus:outline-none gba:focus:ring-1 gba:focus:ring-ring'

export const OrgchartRegistrationSection: React.FC<OrgchartRegistrationSectionProps> = ({
  agent,
  accessToken,
  isSaving,
  onSave
}) => {
  const identity = agent.workforce_profile?.orgchart ?? null
  const registered = Boolean(identity?.keycloak_user_id)

  const defaults = splitDisplayName(agent.display_name, agent.name)
  const [firstName, setFirstName] = useState(defaults.firstName)
  const [lastName, setLastName] = useState(defaults.lastName)
  const [jobPosition, setJobPosition] = useState(agent.workforce_profile?.role ?? '')
  const [existingUserId, setExistingUserId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const register = async () => {
    setBusy(true)
    setError(null)
    try {
      flowbotClient.setAccessToken(accessToken)

      let userId = existingUserId.trim()
      if (!userId) {
        const created = await flowbotClient.createVirtualAssistantKeycloakUser({
          username: agentUsername(agent.name),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          enabled: true
        })
        userId = created.user_id
      }

      const assistant = await flowbotClient.createVirtualAssistant({
        user_id: userId,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        display_name: agent.display_name || undefined,
        job_position_name: jobPosition.trim() || undefined
      })

      await onSave({
        orgchart: {
          keycloak_user_id: assistant.user_id,
          employee_id: assistant.employee_id,
          org_unit_id: assistant.org_unit_id,
          registered_at: new Date().toISOString()
        }
      })
    } catch (err) {
      setError(describeRegistrationError(err))
    } finally {
      setBusy(false)
    }
  }

  const unlink = async () => {
    setBusy(true)
    setError(null)
    try {
      await onSave({ orgchart: null })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlink orgchart identity')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      data-testid="workforce-config-section-orgchart"
      className="gba:rounded-2xl gba:border gba:border-border gba:bg-card"
    >
      <header className="gba:border-b gba:border-border/60 gba:px-5 gba:py-3">
        <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">Orgchart identity</h3>
        <p className="gba:mt-0.5 gba:text-xs gba:text-muted-foreground">
          Register this agent as a virtual assistant in the orgchart. Registered agents run inbound and scheduled work
          under their own identity instead of the shared service account.
        </p>
      </header>

      <div className="gba:space-y-3 gba:px-5 gba:py-4">
        {registered ? (
          <div
            className="gba:rounded-lg gba:border gba:border-emerald-200 gba:bg-emerald-50/50 gba:px-3 gba:py-2.5"
            data-testid="workforce-orgchart-registered"
          >
            <p className="gba:text-xs gba:font-medium gba:text-emerald-800">Registered in orgchart</p>
            <dl className="gba:mt-1.5 gba:space-y-0.5 gba:text-[11px] gba:text-emerald-900/80">
              <div className="gba:flex gba:gap-1.5">
                <dt className="gba:font-medium">Employee:</dt>
                <dd className="gba:font-mono">{identity?.employee_id ?? '—'}</dd>
              </div>
              <div className="gba:flex gba:gap-1.5">
                <dt className="gba:font-medium">Keycloak user:</dt>
                <dd className="gba:font-mono">{identity?.keycloak_user_id}</dd>
              </div>
              {identity?.registered_at && (
                <div className="gba:flex gba:gap-1.5">
                  <dt className="gba:font-medium">Since:</dt>
                  <dd>{new Date(identity.registered_at).toLocaleString()}</dd>
                </div>
              )}
            </dl>
          </div>
        ) : (
          <>
            <div className="gba:grid gba:grid-cols-2 gba:gap-3">
              <label className="gba:block">
                <span className="gba:mb-1 gba:block gba:text-[11px] gba:font-medium gba:text-muted-foreground">
                  First name
                </span>
                <input
                  value={firstName}
                  onChange={event => setFirstName(event.target.value)}
                  className={inputClass}
                  data-testid="workforce-orgchart-first-name"
                />
              </label>
              <label className="gba:block">
                <span className="gba:mb-1 gba:block gba:text-[11px] gba:font-medium gba:text-muted-foreground">
                  Last name
                </span>
                <input
                  value={lastName}
                  onChange={event => setLastName(event.target.value)}
                  className={inputClass}
                  data-testid="workforce-orgchart-last-name"
                />
              </label>
            </div>
            <label className="gba:block">
              <span className="gba:mb-1 gba:block gba:text-[11px] gba:font-medium gba:text-muted-foreground">
                Job position
              </span>
              <input
                value={jobPosition}
                onChange={event => setJobPosition(event.target.value)}
                placeholder="e.g. Customer Service Agent"
                className={inputClass}
                data-testid="workforce-orgchart-job-position"
              />
            </label>
            <label className="gba:block">
              <span className="gba:mb-1 gba:block gba:text-[11px] gba:font-medium gba:text-muted-foreground">
                Existing Keycloak user ID (optional)
              </span>
              <input
                value={existingUserId}
                onChange={event => setExistingUserId(event.target.value)}
                placeholder="Leave empty to create a new user automatically"
                className={inputClass}
                data-testid="workforce-orgchart-existing-user-id"
              />
            </label>
          </>
        )}

        {error && (
          <p className="gba:text-[11px] gba:text-destructive" data-testid="workforce-orgchart-error">
            {error}
          </p>
        )}
      </div>

      <footer className="gba:flex gba:items-center gba:justify-end gba:gap-2 gba:border-t gba:border-border/60 gba:bg-muted/20 gba:px-5 gba:py-3">
        {registered ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={busy || isSaving}
            onClick={() => void unlink()}
            data-testid="workforce-orgchart-unlink"
          >
            Unlink identity
          </Button>
        ) : (
          <button
            type="button"
            disabled={busy || isSaving || !firstName.trim() || !lastName.trim()}
            onClick={() => void register()}
            className="gba:inline-flex gba:h-8 gba:items-center gba:justify-center gba:gap-1.5 gba:rounded-md gba:bg-primary gba:px-3 gba:text-xs gba:font-medium gba:text-primary-foreground gba:shadow-sm gba:transition-colors gba:hover:bg-primary/90 gba:disabled:cursor-not-allowed gba:disabled:opacity-50"
            data-testid="workforce-orgchart-register"
          >
            {busy || isSaving ? (
              <SpinnerGapIcon className="gba:h-3.5 gba:w-3.5 gba:animate-spin" />
            ) : (
              <UserCirclePlusIcon className="gba:h-3.5 gba:w-3.5" />
            )}
            {busy || isSaving ? 'Registering…' : 'Register in orgchart'}
          </button>
        )}
      </footer>
    </section>
  )
}
