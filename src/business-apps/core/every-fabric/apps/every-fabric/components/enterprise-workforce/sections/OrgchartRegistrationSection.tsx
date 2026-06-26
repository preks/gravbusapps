// "Orgchart identity" section — registers the workforce agent as a virtual
// assistant in the orgchart via FlowBot's /virtual-assistants API:
//   1. create (or reuse) a Keycloak user for the agent
//   2. create the orgchart employee linked to that user, placed in the
//      operator-chosen organizational unit (defaults to "Virtual Assistants")
//   3. persist {keycloak_user_id, employee_id, org_unit_id} on the agent's
//      workforce profile so headless runs authenticate AS the agent
//      (token exchange in prompt-manager) instead of the shared service account.

import { Badge, Button, Combobox, Input, Label, useTranslation, type ComboboxOption } from '@newwork/nw-design-system'
import { ArrowSquareOutIcon, SpinnerGapIcon, TreeStructureIcon, UserCirclePlusIcon } from '@phosphor-icons/react'
import React, { useMemo, useState } from 'react'
import { flowbotClient } from '@/common/network/flowbot'
import { navigateTo, Navigation } from '@/common/utils/navigationUtils'
import type { WorkforceAgent, WorkforceAgentUpdateInput } from '../workforceTypes'
import { useOrgchartUnitName, useOrgchartUnits, type OrgchartUnit } from './useOrgchartUnits'
import translations from '../../../_i18n'

// The active org chart. It does not yet support deep-linking to a specific
// employee, so we jump to the chart itself (the requested "at least jump to
// orgchart" fallback). Sourced from the shared Navigation map (no hardcoded
// host) so it stays correct across environments.
const ORGCHART_URL = Navigation.PLATFORM_ORGCHART

type TFn = (key: string, vars?: Record<string, unknown>) => string

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

function describeRegistrationError(err: unknown, t: TFn): string {
  const message = err instanceof Error ? err.message : String(err)
  if (message.includes('503')) {
    return t('orgchart-err-503')
  }
  if (message.includes('409')) {
    return t('orgchart-err-409')
  }
  return message
}

/** Secondary line for a unit option (type · company · member count). */
function describeUnit(unit: OrgchartUnit, t: TFn): string {
  const parts: string[] = []
  if (unit.type) parts.push(unit.type.toLowerCase())
  if (unit.companyName) parts.push(unit.companyName)
  parts.push(t('orgchart-unit-members-count', { count: unit.memberCount }))
  return parts.join(' · ')
}

export const OrgchartRegistrationSection: React.FC<OrgchartRegistrationSectionProps> = ({
  agent,
  accessToken,
  isSaving,
  onSave
}) => {
  const { t } = useTranslation(translations)
  const identity = agent.workforce_profile?.orgchart ?? null
  const registered = Boolean(identity?.keycloak_user_id)

  const defaults = splitDisplayName(agent.display_name, agent.name)
  const [firstName, setFirstName] = useState(defaults.firstName)
  const [lastName, setLastName] = useState(defaults.lastName)
  const [jobPosition, setJobPosition] = useState(agent.workforce_profile?.role ?? '')
  const [existingUserId, setExistingUserId] = useState('')
  const [orgUnitId, setOrgUnitId] = useState('')
  const [orgUnitLabel, setOrgUnitLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    units,
    loading: unitsLoading,
    error: unitsError,
    hasMore,
    setSearch,
    loadMore
  } = useOrgchartUnits(accessToken)
  const registeredUnitName = useOrgchartUnitName(accessToken, registered ? identity?.org_unit_id : null)

  // Keep the chosen unit visible on the trigger even when it scrolls out of
  // the currently-loaded/searched page.
  const unitOptions = useMemo<ComboboxOption[]>(() => {
    const opts = units.map(unit => ({
      value: unit.id,
      label: unit.name,
      optionLabel: (
        <span className="gba:flex gba:flex-col">
          <span className="gba:text-sm gba:text-foreground">{unit.name}</span>
          <span className="gba:text-xs gba:text-muted-foreground">{describeUnit(unit, t)}</span>
        </span>
      )
    }))
    if (orgUnitId && !units.some(unit => unit.id === orgUnitId)) {
      opts.unshift({ value: orgUnitId, label: orgUnitLabel || orgUnitId })
    }
    return opts
  }, [units, orgUnitId, orgUnitLabel, t])

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
        job_position_name: jobPosition.trim() || undefined,
        org_unit_id: orgUnitId || undefined
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
      setError(describeRegistrationError(err, t))
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
      setError(err instanceof Error ? err.message : t('orgchart-unlink-error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      data-testid="workforce-config-section-orgchart"
      className="gba:rounded-2xl gba:border gba:border-border gba:bg-card"
    >
      <header className="gba:flex gba:items-start gba:gap-2.5 gba:border-b gba:border-border/60 gba:px-5 gba:py-3">
        <TreeStructureIcon
          className="gba:mt-0.5 gba:h-4 gba:w-4 gba:shrink-0 gba:text-muted-foreground"
          weight="duotone"
        />
        <div>
          <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">{t('orgchart-section-title')}</h3>
          <p className="gba:mt-0.5 gba:text-xs gba:text-muted-foreground">{t('orgchart-section-desc')}</p>
        </div>
      </header>

      <div className="gba:space-y-3 gba:px-5 gba:py-4">
        {registered ? (
          <div
            className="gba:rounded-lg gba:border gba:border-border gba:bg-muted/40 gba:px-3 gba:py-2.5"
            data-testid="workforce-orgchart-registered"
          >
            <Badge variant="success" size="sm">
              {t('orgchart-registered-badge')}
            </Badge>
            <dl className="gba:mt-2 gba:space-y-0.5 gba:text-[11px] gba:text-muted-foreground">
              <div className="gba:flex gba:gap-1.5">
                <dt className="gba:font-medium gba:text-foreground">{t('orgchart-org-unit-label')}</dt>
                <dd>{registeredUnitName ?? <span className="gba:font-mono">{identity?.org_unit_id ?? '—'}</span>}</dd>
              </div>
              <div className="gba:flex gba:gap-1.5">
                <dt className="gba:font-medium gba:text-foreground">{t('orgchart-employee-label')}</dt>
                <dd className="gba:font-mono">{identity?.employee_id ?? '—'}</dd>
              </div>
              <div className="gba:flex gba:gap-1.5">
                <dt className="gba:font-medium gba:text-foreground">{t('orgchart-keycloak-label')}</dt>
                <dd className="gba:font-mono">{identity?.keycloak_user_id}</dd>
              </div>
              {identity?.registered_at && (
                <div className="gba:flex gba:gap-1.5">
                  <dt className="gba:font-medium gba:text-foreground">{t('orgchart-since-label')}</dt>
                  <dd>{new Date(identity.registered_at).toLocaleString()}</dd>
                </div>
              )}
            </dl>
          </div>
        ) : (
          <>
            <div className="gba:grid gba:grid-cols-2 gba:gap-3">
              <div className="gba:space-y-1">
                <Label htmlFor="workforce-orgchart-first-name" className="gba:text-[11px] gba:text-muted-foreground">
                  {t('orgchart-first-name')}
                </Label>
                <Input
                  id="workforce-orgchart-first-name"
                  value={firstName}
                  onChange={event => setFirstName(event.target.value)}
                  data-testid="workforce-orgchart-first-name"
                />
              </div>
              <div className="gba:space-y-1">
                <Label htmlFor="workforce-orgchart-last-name" className="gba:text-[11px] gba:text-muted-foreground">
                  {t('orgchart-last-name')}
                </Label>
                <Input
                  id="workforce-orgchart-last-name"
                  value={lastName}
                  onChange={event => setLastName(event.target.value)}
                  data-testid="workforce-orgchart-last-name"
                />
              </div>
            </div>

            <div className="gba:space-y-1">
              <Label htmlFor="workforce-orgchart-job-position" className="gba:text-[11px] gba:text-muted-foreground">
                {t('orgchart-job-position')}
              </Label>
              <Input
                id="workforce-orgchart-job-position"
                value={jobPosition}
                onChange={event => setJobPosition(event.target.value)}
                placeholder={t('orgchart-job-position-placeholder')}
                data-testid="workforce-orgchart-job-position"
              />
            </div>

            <div className="gba:space-y-1">
              <Label className="gba:text-[11px] gba:text-muted-foreground">{t('orgchart-org-unit')}</Label>
              <Combobox
                mode="single"
                value={orgUnitId}
                options={unitOptions}
                placeholder={t('orgchart-org-unit-placeholder')}
                searchPlaceholder={t('orgchart-org-unit-search')}
                emptyText={unitsError ?? t('orgchart-org-unit-empty')}
                loading={unitsLoading}
                error={Boolean(unitsError)}
                errorText={unitsError ?? undefined}
                hasMore={hasMore}
                onLoadMore={loadMore}
                onSearch={setSearch}
                searchDebounce={300}
                showClearButton
                onValueChange={value => {
                  setOrgUnitId(value)
                  setOrgUnitLabel(units.find(unit => unit.id === value)?.name ?? '')
                }}
                data-testid="workforce-orgchart-org-unit"
              />
              <p className="gba:text-[11px] gba:text-muted-foreground">{t('orgchart-org-unit-hint')}</p>
            </div>

            <div className="gba:space-y-1">
              <Label
                htmlFor="workforce-orgchart-existing-user-id"
                className="gba:text-[11px] gba:text-muted-foreground"
              >
                {t('orgchart-existing-user-id')}
              </Label>
              <Input
                id="workforce-orgchart-existing-user-id"
                value={existingUserId}
                onChange={event => setExistingUserId(event.target.value)}
                placeholder={t('orgchart-existing-user-id-placeholder')}
                data-testid="workforce-orgchart-existing-user-id"
              />
            </div>
          </>
        )}

        {error && (
          <p className="gba:text-[11px] gba:text-destructive" data-testid="workforce-orgchart-error">
            {error}
          </p>
        )}
      </div>

      <footer className="gba:flex gba:items-center gba:justify-between gba:gap-2 gba:border-t gba:border-border/60 gba:bg-muted/20 gba:px-5 gba:py-3">
        {registered ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateTo(ORGCHART_URL)}
            data-testid="workforce-orgchart-open"
          >
            <ArrowSquareOutIcon className="gba:h-3.5 gba:w-3.5" />
            {t('orgchart-open')}
          </Button>
        ) : (
          <span />
        )}
        {registered ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={busy || isSaving}
            onClick={() => void unlink()}
            data-testid="workforce-orgchart-unlink"
          >
            {t('orgchart-unlink')}
          </Button>
        ) : (
          <Button
            variant="default"
            size="sm"
            disabled={busy || isSaving || !firstName.trim() || !lastName.trim()}
            onClick={() => void register()}
            data-testid="workforce-orgchart-register"
          >
            {busy || isSaving ? (
              <SpinnerGapIcon className="gba:h-3.5 gba:w-3.5 gba:animate-spin" />
            ) : (
              <UserCirclePlusIcon className="gba:h-3.5 gba:w-3.5" />
            )}
            {busy || isSaving ? t('orgchart-registering') : t('orgchart-register')}
          </Button>
        )}
      </footer>
    </section>
  )
}
