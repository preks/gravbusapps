// Reusable per-agent intranet policy editor.
//
// Renders the agent's effective policy list (workspace defaults + explicit
// per-agent policies), lets the user attach real intranet policies through
// AddPoliciesModal, and deep-links each chip to its intranet record. Used by
// both the Enterprise Agent Studio and the Workforce agent config screen so
// the two surfaces share identical "real policies" behaviour. Persistence is
// handled by useAgentPolicies (registry PUT, UUID-validated).

import React, { useState } from 'react'
import { Button, useTranslation } from '@newwork/nw-design-system'
import { ArrowSquareOutIcon, PlusIcon, ShieldCheckIcon, SpinnerGapIcon, XIcon } from '@phosphor-icons/react'
import { AddPoliciesModal, buildPolicyDetailUrl, isPolicyUuid } from './AddPoliciesModal'
import { useAgentPolicies } from './useAgentPolicies'
import translations from '../../_i18n'

interface AgentPoliciesEditorProps {
  agentId: string
  accessToken: string
  title?: string
  description?: string
  testId?: string
  chipTestIdPrefix?: string
  addButtonTestId?: string
}

const DEFAULT_DESCRIPTION = 'agents-policies-description'

export const AgentPoliciesEditor: React.FC<AgentPoliciesEditorProps> = ({
  agentId,
  accessToken,
  title: titleProp,
  description: descriptionProp,
  testId = 'agent-config-policies',
  chipTestIdPrefix = 'config-policy',
  addButtonTestId = 'config-policy-add-button'
}) => {
  const { t } = useTranslation(translations)
  const title = titleProp ?? t('agents-policies-title')
  const description = descriptionProp ?? t(DEFAULT_DESCRIPTION)
  const {
    supported,
    isLoading,
    error,
    effectivePolicies,
    attachedPolicyIds,
    workspaceDefaultIds,
    excludedPolicyIds,
    applyPicked,
    removePolicy
  } = useAgentPolicies(agentId, accessToken)
  const [modalOpen, setModalOpen] = useState(false)

  if (!supported) return null

  return (
    <section data-testid={testId}>
      <div className="gba:flex gba:items-center gba:justify-between gba:mb-1">
        <h2 className="gba:flex gba:items-center gba:gap-2 gba:text-base gba:font-semibold gba:text-foreground">
          <ShieldCheckIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
          {title}
        </h2>
      </div>
      <p className="gba:text-xs gba:text-muted-foreground gba:mb-4">{description}</p>

      {error && (
        <div className="gba:rounded-lg gba:border gba:border-destructive/30 gba:bg-destructive/5 gba:p-3 gba:text-sm gba:text-destructive gba:mb-3">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
          <SpinnerGapIcon className="gba:h-6 gba:w-6 gba:animate-spin gba:text-muted-foreground" />
        </div>
      ) : (
        <div className="gba:space-y-3">
          {effectivePolicies.length === 0 ? (
            <p className="gba:text-sm gba:text-muted-foreground gba:py-2">{t('agents-policies-empty')}</p>
          ) : (
            <div className="gba:space-y-2">
              {effectivePolicies.map(policy => (
                <div
                  key={policy.policy_id}
                  className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:rounded-lg gba:border gba:border-border gba:bg-muted/30 gba:px-3 gba:py-2"
                  data-testid={`${chipTestIdPrefix}-${policy.policy_id}`}
                >
                  <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0">
                    <ShieldCheckIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:shrink-0" />
                    {isPolicyUuid(policy.policy_id) ? (
                      <a
                        href={buildPolicyDetailUrl(policy.policy_id)}
                        target="_blank"
                        rel="noreferrer"
                        className="gba:text-sm gba:text-foreground gba:hover:underline gba:truncate gba:inline-flex gba:items-center gba:gap-1"
                        title={policy.title}
                      >
                        <span className="gba:truncate">{policy.title || policy.policy_id}</span>
                        <ArrowSquareOutIcon className="gba:h-3 gba:w-3 gba:text-muted-foreground gba:shrink-0" />
                      </a>
                    ) : (
                      <span className="gba:text-sm gba:text-muted-foreground gba:truncate" title={policy.title}>
                        {policy.title || policy.policy_id}
                      </span>
                    )}
                    {policy.isDefault && (
                      <span
                        className="gba:flex-shrink-0 gba:rounded-full gba:bg-primary/10 gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-medium gba:text-primary"
                        title={t('agents-policies-workspace-default')}
                      >
                        {t('agents-policies-workspace-default')}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removePolicy(policy.policy_id, policy.isDefault)}
                    className="gba:inline-flex gba:items-center gba:justify-center gba:h-6 gba:w-6 gba:rounded gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors gba:shrink-0"
                    data-testid={`${chipTestIdPrefix}-remove-${policy.policy_id}`}
                    aria-label={policy.isDefault ? t('agents-policies-exclude-aria') : t('agents-policies-remove-aria')}
                  >
                    <XIcon className="gba:h-3.5 gba:w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Button size="sm" variant="outline" onClick={() => setModalOpen(true)} data-testid={addButtonTestId}>
            <PlusIcon className="gba:mr-1.5 gba:h-3.5 gba:w-3.5" />
            {t('agents-policies-add')}
          </Button>
        </div>
      )}

      {modalOpen && (
        <AddPoliciesModal
          open={modalOpen}
          accessToken={accessToken}
          alreadySelected={attachedPolicyIds}
          workspaceDefaultIds={workspaceDefaultIds}
          excludedPolicyIds={excludedPolicyIds}
          onClose={() => setModalOpen(false)}
          onAdd={picked => {
            applyPicked(picked)
            setModalOpen(false)
          }}
        />
      )}
    </section>
  )
}
