// Connections section - bind external connections (e.g. a Salesforce
// structured connection) to the agent. Bound connections are activated on
// every headless run so the deep-agent builds the matching connector tools.

import { useTranslation } from '@newwork/nw-design-system'
import { CheckIcon, PlugsConnectedIcon, SpinnerGapIcon } from '@phosphor-icons/react'
import React, { useEffect, useMemo, useState } from 'react'
import { ConnectorLogo } from '@/business-apps/core/create/apps/newwork-connect/components/ConnectorLogo'
import { useFabricConnectors } from '../../../hooks/useFabricConnectors'
import type { WorkforceAgent, WorkforceAgentUpdateInput } from '../workforceTypes'
import { SectionShell } from './SectionShell'
import translations from '../../../_i18n'

interface ConnectionsSectionProps {
  agent: WorkforceAgent
  accessToken: string
  isSaving: boolean
  onSave: (patch: WorkforceAgentUpdateInput) => Promise<void>
}

function selectedFromAgent(agent: WorkforceAgent): string[] {
  return [...(agent.workforce_profile.connection_ids ?? [])]
}

function sameIds(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const other = new Set(b)
  return a.every(id => other.has(id))
}

export const ConnectionsSection: React.FC<ConnectionsSectionProps> = ({
  agent,
  accessToken,
  isSaving,
  onSave
}) => {
  const { t } = useTranslation(translations)
  const { availableConnectors, isLoading, error } = useFabricConnectors(accessToken)

  const baseline = useMemo(() => selectedFromAgent(agent), [agent])
  const [selected, setSelected] = useState<string[]>(baseline)

  useEffect(() => {
    setSelected(selectedFromAgent(agent))
  }, [agent])

  const dirty = !sameIds(selected, baseline)
  const selectedSet = new Set(selected)

  const toggle = (connectionId: string) => {
    setSelected(prev =>
      prev.includes(connectionId) ? prev.filter(id => id !== connectionId) : [...prev, connectionId]
    )
  }

  return (
    <SectionShell
      id="connections"
      title={t('connections-section-title')}
      icon={PlugsConnectedIcon}
      description={t('connections-section-desc')}
      isDirty={dirty}
      isSaving={isSaving}
      onSave={() => void onSave({ connection_ids: selected })}
      onReset={() => setSelected(baseline)}
    >
      {isLoading && (
        <p className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-muted-foreground">
          <SpinnerGapIcon className="gba:h-3.5 gba:w-3.5 gba:animate-spin" />
          {t('connections-loading')}
        </p>
      )}

      {!isLoading && error && (
        <p className="gba:text-xs gba:text-destructive" data-testid="workforce-connections-error">
          {t('connections-load-error')}
        </p>
      )}

      {!isLoading && !error && availableConnectors.length === 0 && (
        <p className="gba:text-[11px] gba:italic gba:text-muted-foreground">{t('connections-empty')}</p>
      )}

      {!isLoading && !error && availableConnectors.length > 0 && (
        <ul className="gba:space-y-1" data-testid="workforce-connections-list">
          {availableConnectors.map(conn => {
            const isActive = selectedSet.has(conn.connection_id)
            return (
              <li key={conn.connection_id}>
                <button
                  type="button"
                  onClick={() => toggle(conn.connection_id)}
                  aria-pressed={isActive}
                  title={conn.description || conn.name}
                  className={`gba:flex gba:w-full gba:items-center gba:gap-2.5 gba:rounded-xl gba:p-2.5 gba:text-left gba:transition-all gba:hover:bg-muted/45 ${
                    isActive ? 'gba:bg-primary/8 gba:ring-1 gba:ring-primary/20' : ''
                  }`}
                  data-testid={`workforce-connection-${conn.connection_id}`}
                >
                  <ConnectorLogo providerId={conn.providerIdForLogo} size="sm" />
                  <span className="gba:line-clamp-1 gba:flex-1 gba:text-xs gba:font-medium gba:text-foreground">
                    {conn.name}
                  </span>
                  {isActive && (
                    <CheckIcon className="gba:h-3.5 gba:w-3.5 gba:shrink-0 gba:text-primary" weight="bold" />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {!isLoading && !error && selected.length === 0 && availableConnectors.length > 0 && (
        <p className="gba:mt-2 gba:text-[11px] gba:italic gba:text-muted-foreground">
          {t('connections-none-selected')}
        </p>
      )}
    </SectionShell>
  )
}
