import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Spinner
} from '@newwork/nw-design-system'
import { ExternalLink, Plus, Search, ShieldCheck, Trash2 } from 'lucide-react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import { ContentGroup } from '@/common/data/content/constants/contentConstants'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface TaskExpertPoliciesPanelProps extends BusinessAppContextProps {
  promptId?: string
  'data-testid'?: string
}

interface AttachedPolicy {
  policy_id: string
  title: string
}

interface PolicyEntry {
  id: string
  title: string
  preview?: string | null
  updatedAt?: string | null
}

const SEARCH_POLICIES_QUERY = `
  query SearchPolicies($search: String!, $limit: Int!) {
    ContentEntry(
      where: {
        isDeleted: { _eq: false }
        contentGroup: { _eq: "${ContentGroup.POLICY}" }
        _or: [
          { title: { _ilike: $search } }
          { preview: { _ilike: $search } }
          { content: { _ilike: $search } }
        ]
      }
      limit: $limit
      orderBy: { updatedAt: DESC }
    ) {
      id
      title
      preview
      updatedAt
    }
  }
`

const buildPolicyUrl = (policyId: string): string =>
  `/platform/content/intranet/content-record?contentId=${encodeURIComponent(policyId)}`

export const TaskExpertPoliciesPanel: React.FC<TaskExpertPoliciesPanelProps> = ({
  promptId,
  accessToken,
  'data-testid': testId = 'task-expert-policies-panel'
}) => {
  const client = usePromptManagerClient(accessToken)
  const graphqlClient = useGraphQLClient(accessToken)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [policies, setPolicies] = useState<AttachedPolicy[]>([])
  const [excludedPolicyRefs, setExcludedPolicyRefs] = useState<string[]>([])
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [entries, setEntries] = useState<PolicyEntry[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const attachedIds = useMemo(() => new Set(policies.map(policy => policy.policy_id)), [policies])

  useEffect(() => {
    if (!promptId) return
    let cancelled = false
    setIsLoading(true)
    setError(null)
    void client
      .getAgentPolicies(promptId)
      .then(result => {
        if (cancelled) return
        setPolicies(result.policies ?? [])
        setExcludedPolicyRefs(result.excluded_policy_refs ?? [])
      })
      .catch(err => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load policies')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [client, promptId])

  useEffect(() => {
    if (!isPickerOpen) return
    if (!searchQuery.trim()) {
      setEntries([])
      return
    }

    let cancelled = false
    setIsSearching(true)
    const timer = window.setTimeout(() => {
      void graphqlClient
        .request<{ ContentEntry: PolicyEntry[] }>(SEARCH_POLICIES_QUERY, {
          search: `%${searchQuery.trim()}%`,
          limit: 20
        })
        .then(result => {
          if (!cancelled) setEntries(result.ContentEntry ?? [])
        })
        .catch(err => {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : 'Failed to search policies')
            setEntries([])
          }
        })
        .finally(() => {
          if (!cancelled) setIsSearching(false)
        })
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [graphqlClient, isPickerOpen, searchQuery])

  const persistPolicies = useCallback(
    async (nextPolicies: AttachedPolicy[], nextExcludedPolicyRefs = excludedPolicyRefs) => {
      if (!promptId) return
      const previous = policies
      setPolicies(nextPolicies)
      setIsSaving(true)
      setError(null)
      try {
        await client.setAgentPolicies(
          promptId,
          nextPolicies.map(policy => policy.policy_id),
          nextExcludedPolicyRefs
        )
        setExcludedPolicyRefs(nextExcludedPolicyRefs)
      } catch (err) {
        setPolicies(previous)
        setError(err instanceof Error ? err.message : 'Failed to save policies')
      } finally {
        setIsSaving(false)
      }
    },
    [client, excludedPolicyRefs, policies, promptId]
  )

  const addPolicy = useCallback(
    (entry: PolicyEntry) => {
      if (attachedIds.has(entry.id)) return
      void persistPolicies([...policies, { policy_id: entry.id, title: entry.title || entry.id }])
      setIsPickerOpen(false)
      setSearchQuery('')
      setEntries([])
    },
    [attachedIds, persistPolicies, policies]
  )

  const removePolicy = useCallback(
    (policyId: string) => {
      void persistPolicies(policies.filter(policy => policy.policy_id !== policyId))
    },
    [persistPolicies, policies]
  )

  return (
    <Card className="gba:!bg-background" data-testid={testId}>
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <ShieldCheck className="gba:w-5 gba:h-5" />
          Policies
        </CardTitle>
        <CardDescription>
          Attach governing intranet policies that this expert must follow during execution.
        </CardDescription>
      </CardHeader>
      <CardContent className="gba:space-y-4">
        {!promptId ? (
          <div className="gba:rounded-lg gba:border gba:border-border gba:bg-muted/30 gba:p-3 gba:text-sm gba:text-muted-foreground">
            Save the expert before attaching governing policies.
          </div>
        ) : isLoading ? (
          <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground">
            <Spinner size="sm" />
            <span>Loading policies...</span>
          </div>
        ) : (
          <>
            {error && (
              <div className="gba:text-destructive gba:text-sm" data-testid={`${testId}-error`}>
                {error}
              </div>
            )}

            <div className="gba:flex gba:gap-2 gba:flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPickerOpen(true)}
                disabled={isSaving}
                data-testid={`${testId}-add-button`}
              >
                <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
                Add Policy
              </Button>
              {isSaving && (
                <span className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground">
                  <Spinner size="sm" />
                  Saving...
                </span>
              )}
            </div>

            {policies.length > 0 ? (
              <div className="gba:space-y-2">
                {policies.map(policy => (
                  <div
                    key={policy.policy_id}
                    className="gba:flex gba:items-start gba:gap-2 gba:p-3 gba:bg-muted/30 gba:rounded-lg gba:border gba:border-border"
                    data-testid={`${testId}-policy-${policy.policy_id}`}
                  >
                    <div className="gba:w-8 gba:h-8 gba:rounded gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
                      <ShieldCheck className="gba:w-4 gba:h-4 gba:text-primary" />
                    </div>
                    <div className="gba:flex-1 gba:min-w-0">
                      <div className="gba:flex gba:items-start gba:justify-between gba:gap-2">
                        <div className="gba:flex-1 gba:min-w-0">
                          <h4 className="gba:font-medium gba:text-sm gba:truncate">{policy.title}</h4>
                          <a
                            href={buildPolicyUrl(policy.policy_id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="gba:text-xs gba:text-primary gba:hover:underline gba:mt-1 gba:inline-flex gba:items-center gba:gap-1"
                          >
                            View policy
                            <ExternalLink className="gba:w-2.5 gba:h-2.5" />
                          </a>
                        </div>
                        <Badge variant="secondary" className="gba:text-[10px] gba:px-1.5 gba:py-0 gba:flex-shrink-0">
                          policy
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removePolicy(policy.policy_id)}
                      className="gba:text-destructive gba:hover:bg-destructive/10"
                      data-testid={`${testId}-remove-${policy.policy_id}`}
                    >
                      <Trash2 className="gba:w-4 gba:h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="gba:text-center gba:py-8 gba:text-muted-foreground">
                <ShieldCheck className="gba:w-12 gba:h-12 gba:mx-auto gba:mb-2 gba:opacity-50" />
                <p className="gba:text-sm">No governing policies attached</p>
              </div>
            )}
          </>
        )}
      </CardContent>

      <Dialog open={isPickerOpen} onOpenChange={open => !open && setIsPickerOpen(false)}>
        <DialogContent className="gba:max-w-2xl" data-testid={`${testId}-picker`}>
          <DialogHeader>
            <DialogTitle>Select Policy</DialogTitle>
          </DialogHeader>

          <div className="gba:space-y-4">
            <div className="gba:relative">
              <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
              <Input
                placeholder="Search policies..."
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                className="gba:pl-10"
                data-testid={`${testId}-search-input`}
              />
            </div>

            <div className="gba:max-h-96 gba:overflow-y-auto gba:space-y-2">
              {isSearching ? (
                <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
                  <Spinner size="lg" />
                </div>
              ) : entries.length === 0 ? (
                <div className="gba:text-center gba:py-12 gba:text-muted-foreground">
                  <ShieldCheck className="gba:w-12 gba:h-12 gba:mx-auto gba:mb-3 gba:opacity-50" />
                  <p className="gba:text-sm">
                    {searchQuery.trim() ? 'No policies found' : 'Start typing to search policies'}
                  </p>
                </div>
              ) : (
                entries.map(entry => {
                  const alreadyAttached = attachedIds.has(entry.id)
                  return (
                    <button
                      type="button"
                      key={entry.id}
                      disabled={alreadyAttached}
                      onClick={() => addPolicy(entry)}
                      className={[
                        'gba:w-full gba:flex gba:items-start gba:gap-3 gba:p-3 gba:rounded-lg gba:border gba:border-border gba:text-left gba:transition-colors',
                        alreadyAttached
                          ? 'gba:bg-muted/30 gba:opacity-60'
                          : 'gba:bg-background hover:gba:border-primary/50'
                      ].join(' ')}
                      data-testid={`${testId}-picker-policy-${entry.id}`}
                    >
                      <div className="gba:w-8 gba:h-8 gba:rounded gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
                        <ShieldCheck className="gba:w-4 gba:h-4 gba:text-primary" />
                      </div>
                      <div className="gba:flex-1 gba:min-w-0">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <h4 className="gba:font-medium gba:text-sm gba:truncate">{entry.title}</h4>
                          {alreadyAttached && (
                            <Badge variant="secondary" className="gba:text-[10px] gba:px-1.5 gba:py-0">
                              attached
                            </Badge>
                          )}
                        </div>
                        {entry.preview && (
                          <p className="gba:text-xs gba:text-muted-foreground gba:line-clamp-1 gba:mt-1">
                            {entry.preview}
                          </p>
                        )}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsPickerOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export default TaskExpertPoliciesPanel
