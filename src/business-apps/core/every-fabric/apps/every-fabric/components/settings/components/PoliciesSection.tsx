import { useCallback, useEffect, useState } from 'react'
import { Button } from '@newwork/nw-design-system'
import { ArrowSquareOutIcon, PlusIcon, ShieldCheckIcon, SpinnerGapIcon, TrashIcon } from '@phosphor-icons/react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import { AddPoliciesModal, buildPolicyDetailUrl, type PickedPolicy } from '../../agents/AddPoliciesModal'
import { SectionHeader } from './SettingsShared'

interface PoliciesSectionProps {
  accessToken: string
  isOpen: boolean
}

interface AttachedPolicy {
  policy_id: string
  title: string
  updated_at?: string
}

function formatDate(iso?: string): string {
  if (!iso) return ''
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso))
  } catch {
    return ''
  }
}

/**
 * Workspace-level "Default Policies" section.
 *
 * These are the always-on intranet policy ContentEntries that every
 * deep agent in the workspace can list and load through ``policy_list``
 * / ``policy_load`` — independent of which expert (if any) the router
 * selects for a given turn. Per-expert ``policy_refs`` extend this set
 * for that specific expert.
 *
 * Titles and updatedAt are stored at write time so this component never
 * needs a GraphQL call for display.
 */
export const PoliciesSection: React.FC<PoliciesSectionProps> = ({ accessToken, isOpen }) => {
  const client = usePromptManagerClient(accessToken)
  const [policies, setPolicies] = useState<AttachedPolicy[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    setIsLoading(true)
    setError(null)
    client
      .getWorkspacePolicies()
      .then(result => {
        if (cancelled) return
        setPolicies(result.policies ?? [])
      })
      .catch(err => {
        if (cancelled) return
        // 404 means no workspace exists yet — treat as empty state, not an error.
        const is404 =
          err instanceof Error && (err.message.includes('404') || err.message.toLowerCase().includes('not found'))
        if (!is404) {
          setError(err instanceof Error ? err.message : 'Failed to load default policies')
        }
      })
      .finally(() => {
        if (cancelled) return
        setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isOpen, client])

  // Persist the canonical set (full list, not a delta). Titles and
  // updatedAt are sent to the backend so GET never needs GraphQL to
  // display friendly names.
  const persist = useCallback(
    async (next: AttachedPolicy[], previous: AttachedPolicy[]) => {
      setPolicies(next)
      setError(null)
      setBusy(true)
      try {
        await client.setWorkspacePolicies(
          next.map(p => ({ policy_id: p.policy_id, title: p.title, updated_at: p.updated_at }))
        )
      } catch (err) {
        setPolicies(previous)
        setError(err instanceof Error ? err.message : 'Failed to save default policies')
      } finally {
        setBusy(false)
      }
    },
    [client]
  )

  const handleAdd = useCallback(
    (picked: PickedPolicy[]) => {
      const seen = new Set(policies.map(p => p.policy_id))
      const additions = picked
        .filter(p => !seen.has(p.id))
        .map(p => ({ policy_id: p.id, title: p.title, updated_at: p.updatedAt }))
      setPickerOpen(false)
      if (additions.length === 0) return
      persist([...policies, ...additions], policies).catch(() => {})
    },
    [persist, policies]
  )

  const handleRemove = useCallback(
    (policyId: string) => {
      const next = policies.filter(p => p.policy_id !== policyId)
      if (next.length === policies.length) return
      persist(next, policies).catch(() => {})
    },
    [persist, policies]
  )

  const renderBody = () => {
    if (isLoading) {
      return (
        <div className="gba:flex gba:items-center gba:justify-center gba:py-6">
          <SpinnerGapIcon className="gba:h-5 gba:w-5 gba:animate-spin gba:text-muted-foreground" />
        </div>
      )
    }
    if (policies.length === 0) {
      return (
        <p className="gba:text-sm gba:text-muted-foreground gba:py-2">
          No default policies attached yet. Click <span className="gba:font-medium">Add Policy</span> to attach intranet
          policies that every agent in this workspace can read.
        </p>
      )
    }
    return (
      <div className="gba:space-y-1.5">
        {policies.map(policy => {
          const dateStr = formatDate(policy.updated_at)
          return (
            <div
              key={policy.policy_id}
              className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:rounded-xl gba:border gba:border-border/60 gba:bg-muted/20 gba:px-3 gba:py-2"
              data-testid={`settings-policy-${policy.policy_id}`}
            >
              <div className="gba:flex gba:items-start gba:gap-2 gba:min-w-0">
                <ShieldCheckIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:shrink-0 gba:mt-0.5" />
                <div className="gba:min-w-0">
                  <a
                    href={buildPolicyDetailUrl(policy.policy_id)}
                    target="_blank"
                    rel="noreferrer"
                    className="gba:text-sm gba:font-medium gba:text-foreground gba:hover:underline gba:inline-flex gba:items-center gba:gap-1 gba:truncate"
                    title={`Open in a new tab (ID: ${policy.policy_id})`}
                  >
                    <span className="gba:truncate">{policy.title}</span>
                    <ArrowSquareOutIcon className="gba:h-3 gba:w-3 gba:text-muted-foreground gba:shrink-0" />
                  </a>
                  {dateStr && <p className="gba:text-[11px] gba:text-muted-foreground gba:mt-0.5">Updated {dateStr}</p>}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(policy.policy_id)}
                disabled={busy}
                className="gba:flex gba:items-center gba:justify-center gba:h-7 gba:w-7 gba:rounded-full gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors gba:shrink-0 gba:disabled:opacity-50"
                data-testid={`settings-policy-remove-${policy.policy_id}`}
                aria-label={`Remove policy ${policy.title}`}
              >
                <TrashIcon className="gba:h-3 gba:w-3" />
              </button>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <>
      <SectionHeader
        icon={<ShieldCheckIcon className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground/60" />}
        title="Default Policies"
      />
      <div className="gba:px-3 sm:gba:px-4 gba:pb-2.5 sm:gba:pb-3">
        <p className="gba:text-xs gba:text-muted-foreground gba:mb-2.5">
          Always-on intranet policies. Every agent in this workspace can list and read them at any point in a
          conversation — no per-agent configuration required.
        </p>

        {error && (
          <div
            className="gba:rounded-lg gba:border gba:border-destructive/30 gba:bg-destructive/5 gba:p-2.5 gba:text-xs gba:text-destructive gba:mb-2.5"
            data-testid="settings-policies-error"
          >
            {error}
          </div>
        )}

        {renderBody()}

        <div className="gba:mt-3 gba:flex gba:justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPickerOpen(true)}
            disabled={busy || isLoading}
            data-testid="settings-policies-add-button"
          >
            <PlusIcon className="gba:mr-1.5 gba:h-3.5 gba:w-3.5" />
            Add Policy
          </Button>
        </div>
      </div>

      {pickerOpen && (
        <AddPoliciesModal
          open={pickerOpen}
          accessToken={accessToken}
          alreadySelected={policies.map(p => p.policy_id)}
          onClose={() => setPickerOpen(false)}
          onAdd={handleAdd}
        />
      )}
    </>
  )
}
