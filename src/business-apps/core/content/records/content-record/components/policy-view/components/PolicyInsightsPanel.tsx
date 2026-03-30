import React, { useMemo } from 'react'
import { Badge, Button, Spinner, useTranslation } from '@newwork/nw-design-system'
import { openEveryAI } from '@/common/utils/openEveryAI'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { useContentEntries } from '@/common/data/content/hooks/useContentEntries'
import { ContentRole } from '@/common/data/content/types/contentEnums'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { AppAction } from '@/components/app-action'
import type { ContentEntry } from '@/common/data/content/types/contentTypes'
import translations from '../../../_i18n'
import { usePolicySignals } from '../hooks/usePolicySignals'

interface PolicyInsightsPanelProps {
  accessToken: string
  userId?: string
  policy: ContentEntry
  policyRootId: string
  policyVersionId: string
}

export const PolicyInsightsPanel: React.FC<PolicyInsightsPanelProps> = ({
  accessToken,
  userId,
  policy,
  policyRootId,
  policyVersionId
}) => {
  const { t } = useTranslation(translations)
  const { signals: counts, isLoading: isLoadingCounts } = usePolicySignals({ accessToken, userId, policyRootId })

  const policyTag = useMemo(() => `policy:${policyRootId}`, [policyRootId])

  // Recent feedback comments (direct comments only)
  const { entries: comments, isLoading: isLoadingComments } = useContentEntries(
    {
      role: ContentRole.COMMENT,
      parentContentEntryId: policyVersionId,
      limit: 5,
      offset: 0,
      sortBy: 'createdAt' as const,
      sortOrder: 'DESC' as const
    },
    accessToken
  )

  const openMonitoring = () => {
    const url = buildPlatformUrl('/platform/task-manager', {
      view: 'outbox',
      search: `Policy:${policyRootId}`
    })
    navigateTo(url)
  }

  const openExecutionMonitoring = () => {
    const url = buildPlatformUrl('/platform/create/prompt-manager', {
      pmTab: 'monitoring',
      policyRootId
    })
    navigateTo(url)
  }

  const analyzeAndProposeUpdate = () => {
    const commentSnippets = (comments || [])
      .map(c => (c.content || c.preview || '').trim())
      .filter(Boolean)
      .slice(0, 5)

    const prompt = [
      'You are a policy improvement assistant.',
      '',
      'Analyze execution signals and feedback for this policy, then propose:',
      '- the top 3 improvements to the policy wording',
      '- a short employee communication summary',
      '- what parts should be moved into a flow (operational steps)',
      '',
      `Policy title: ${policy.title}`,
      `Policy root id: ${policyRootId}`,
      `Policy version id: ${policyVersionId}`,
      `Linked experts: ${counts.experts}`,
      `Linked flows: ${counts.flows}`,
      `Acknowledgement campaigns: ${counts.acknowledgementCampaigns}`,
      `Executions using this policy: ${counts.executions}`,
      '',
      'Recent feedback comments:',
      ...(commentSnippets.length > 0 ? commentSnippets.map((c, i) => `${i + 1}. ${c}`) : ['(none)']),
      '',
      'Policy content:',
      policy.content || ''
    ].join('\n')

    openEveryAI({ prompt })
  }

  return (
    <div className="gba:space-y-6" data-testid="policy-insights-panel">
      <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-2">
        <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
          <Badge variant="secondary" data-testid="policy-insights-tag">
            {policyTag}
          </Badge>
          {isLoadingCounts ? (
            <Badge variant="outline" data-testid="policy-insights-loading-badge">
              {t('policy_insights_loading')}
            </Badge>
          ) : (
            <>
              <Badge variant="outline" data-testid="policy-insights-experts-count">
                {t('policy_insights_experts', { count: counts.experts })}
              </Badge>
              <Badge variant="outline" data-testid="policy-insights-flows-count">
                {t('policy_insights_flows', { count: counts.flows })}
              </Badge>
              <Badge variant="outline" data-testid="policy-insights-acks-count">
                {t('policy_insights_ack_campaigns', { count: counts.acknowledgementCampaigns })}
              </Badge>
              <Badge variant="outline" data-testid="policy-insights-executions-count">
                {t('policy_insights_executions', { count: counts.executions })}
              </Badge>
            </>
          )}
        </div>

        <div className="gba:flex gba:flex-wrap gba:gap-2">
          <Button
            variant="outline"
            onClick={openMonitoring}
            data-testid="policy-insights-open-monitoring"
            type="button"
          >
            {t('policy_insights_open_monitoring')}
          </Button>
          <Button
            variant="outline"
            onClick={openExecutionMonitoring}
            data-testid="policy-insights-open-executions"
            type="button"
          >
            {t('policy_insights_open_executions')}
          </Button>
          <Button
            variant="secondary"
            onClick={analyzeAndProposeUpdate}
            data-testid="policy-insights-analyze"
            type="button"
          >
            {t('policy_insights_analyze')}
          </Button>
          <AppAction
            contexts={[
              {
                context: FlowContextName.contentEntryCreate,
                contextData: {
                  contentGroup: policy.contentGroup,
                  rootContentEntryId: policyRootId,
                  parentContentEntryId: policyVersionId
                }
              }
            ]}
            accessToken={accessToken}
            emptyState="enable"
            lazyLoad
            data-testid="policy-insights-create-version-action"
          >
            <Button variant="default" type="button">
              {t('policy_insights_create_new_version')}
            </Button>
          </AppAction>
        </div>
      </div>

      <div className="gba:space-y-2" data-testid="policy-insights-comments">
        <div className="gba:text-sm gba:font-medium">{t('policy_insights_recent_feedback')}</div>
        {isLoadingComments ? (
          <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground">
            <Spinner size="sm" />
            {t('policy_insights_loading_feedback')}
          </div>
        ) : comments.length === 0 ? (
          <div className="gba:text-sm gba:text-muted-foreground">{t('policy_insights_no_feedback')}</div>
        ) : (
          <div className="gba:space-y-2">
            {comments.map(c => (
              <div
                key={c.id}
                className="gba:p-3 gba:rounded-md gba:border gba:border-border gba:bg-card"
                data-testid={`policy-insights-comment-${c.id}`}
              >
                <div className="gba:text-sm gba:text-foreground gba:line-clamp-3">
                  {(c.content || c.preview || '').trim()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!isLoadingCounts && (
        <div className="gba:text-xs gba:text-muted-foreground" data-testid="policy-insights-retention-note">
          {t('policy_insights_note')}
        </div>
      )}
    </div>
  )
}

export default PolicyInsightsPanel
