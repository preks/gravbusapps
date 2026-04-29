import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, AlertDescription, AlertTitle, Badge, Button, Spinner, useTranslation } from '@newwork/nw-design-system'
import { Sparkles } from 'lucide-react'
import { Navigation, buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { FlowTemplateClient, type FlowTemplate } from '@/common/network/flows/FlowTemplateClient'
import { flowAIClient } from '@/common/network/flows/FlowAIClient'
import { toFlowSteps, buildPolicyFlowPrompt } from '@/business-apps/core/content/utils/flowAIMappers'
import translations from '../../../_i18n'
import { toast } from 'sonner'

interface PolicyFlowsPanelProps {
  accessToken: string
  policyRootId: string
  policyVersionId: string
  policyTitle?: string | null
  policyContent?: string | null
}

export const PolicyFlowsPanel: React.FC<PolicyFlowsPanelProps> = ({
  accessToken,
  policyRootId,
  policyVersionId,
  policyTitle,
  policyContent
}) => {
  const { t } = useTranslation(translations)
  const [templates, setTemplates] = useState<FlowTemplate[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [updatingTemplateId, setUpdatingTemplateId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const client = new FlowTemplateClient(accessToken)
      const res = await client.getTemplatesList({
        limit: 50,
        offset: 0,
        includeDrafts: true,
        tags: { policyRootId: String(policyRootId) }
      })
      setTemplates(res.templates || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, policyRootId])

  useEffect(() => {
    load().catch(() => undefined)
  }, [load])

  const openFlowCreator = (templateId?: string | null) => {
    const base = buildPlatformUrl(Navigation.CREATE_FLOW_CREATOR, templateId ? { flowId: templateId } : undefined)
    navigateTo(templateId ? base : `${base}#create`)
  }

  const buildAIPrompt = useMemo(
    () => buildPolicyFlowPrompt({ policyTitle, policyContent, policyRootId, policyVersionId }),
    [policyTitle, policyContent, policyRootId, policyVersionId]
  )

  const generateWithAI = async () => {
    if (!policyTitle && !policyContent) {
      toast.error(t('policy_flows_generate_missing_policy'))
      return
    }

    setIsGenerating(true)
    try {
      const aiTemplate = await flowAIClient.generateFlowTemplate(buildAIPrompt, accessToken)
      const client = new FlowTemplateClient(accessToken)

      const payload: Omit<FlowTemplate, 'id'> = {
        type: 'TEMPLATE',
        name: aiTemplate.name || `${t('policy_flows_generated_name_prefix')}: ${policyTitle || policyRootId}`,
        description: aiTemplate.description || t('policy_flows_generated_description'),
        version: 1,
        tags: {
          app: 'policy',
          policyRootId: String(policyRootId),
          policyVersionId: String(policyVersionId)
        },
        steps: toFlowSteps(aiTemplate)
      }

      const created = await client.createTemplate(payload)
      toast.success(t('policy_flows_generate_success'), { description: created.name })
      await load()
      openFlowCreator(created.id)
    } catch (e) {
      toast.error(t('policy_flows_generate_error'), { description: e instanceof Error ? e.message : String(e) })
    } finally {
      setIsGenerating(false)
    }
  }

  const generateDraftUpdate = async (tpl: FlowTemplate) => {
    if (!tpl.id) return
    if (!policyTitle && !policyContent) {
      toast.error(t('policy_flows_generate_missing_policy'))
      return
    }

    setUpdatingTemplateId(tpl.id)
    try {
      const updatePrompt = [
        'Update the following flow template to match the newest policy version.',
        '',
        'Instructions:',
        '- Keep the flow intent and structure where still valid',
        '- Adjust step titles/messages to reflect the updated policy content',
        '- If acknowledgement is required, use ACKNOWLEDGE step type',
        '- Preserve assignment mode unless the policy implies otherwise',
        '',
        `Policy title: ${policyTitle || ''}`,
        `Policy root id: ${policyRootId}`,
        `New policy version id: ${policyVersionId}`,
        '',
        'New policy content:',
        policyContent || '',
        '',
        'Existing flow template (JSON):',
        JSON.stringify(
          {
            id: tpl.id,
            name: tpl.name,
            description: tpl.description,
            tags: tpl.tags,
            steps: tpl.steps
          },
          null,
          2
        )
      ]
        .filter(Boolean)
        .join('\n')

      const aiTemplate = await flowAIClient.generateFlowTemplate(updatePrompt, accessToken)
      const client = new FlowTemplateClient(accessToken)

      const payload: Omit<FlowTemplate, 'id'> = {
        type: 'TEMPLATE',
        name: `${tpl.name} — ${t('policy_flows_update_draft_suffix')}`,
        description: aiTemplate.description || tpl.description || t('policy_flows_generated_description'),
        version: 1,
        tags: {
          ...(tpl.tags || {}),
          app: 'policy',
          policyRootId: String(policyRootId),
          policyVersionId: String(policyVersionId),
          sourceTemplateId: String(tpl.id)
        },
        steps: toFlowSteps(aiTemplate)
      }

      const created = await client.createTemplate(payload)
      toast.success(t('policy_flows_update_success'), { description: created.name })
      await load()
      openFlowCreator(created.id)
    } catch (e) {
      toast.error(t('policy_flows_update_error'), { description: e instanceof Error ? e.message : String(e) })
    } finally {
      setUpdatingTemplateId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:py-10" data-testid="policy-flows-loading">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:space-y-3" data-testid="policy-flows-error">
        <Alert variant="destructive">
          <AlertTitle>{t('policy_flows_error_title')}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="gba:flex gba:flex-wrap gba:gap-2">
          <Button variant="outline" onClick={load} data-testid="policy-flows-retry">
            {t('retry')}
          </Button>
          <Button
            variant="outline"
            onClick={generateWithAI}
            disabled={isGenerating}
            data-testid="policy-flows-generate-ai"
          >
            <Sparkles className="gba:h-4 gba:w-4 gba:mr-1.5" />
            {isGenerating ? t('policy_flows_generating') : t('policy_action_generate_flow')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="gba:space-y-4" data-testid="policy-flows-panel">
      <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-2">
        <Badge variant="outline" data-testid="policy-flows-count">
          {t('policy_flows_count', { count: templates.length })}
        </Badge>
        <Button
          variant="outline"
          onClick={generateWithAI}
          disabled={isGenerating}
          data-testid="policy-flows-generate-ai"
        >
          <Sparkles className="gba:h-4 gba:w-4 gba:mr-1.5" />
          {isGenerating ? t('policy_flows_generating') : t('policy_action_generate_flow')}
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="gba:text-sm gba:text-muted-foreground" data-testid="policy-flows-empty">
          {t('policy_flows_empty')}
        </div>
      ) : (
        <div className="gba:space-y-2" data-testid="policy-flows-list">
          {templates.map(tpl => {
            const tplPolicyVersionId = tpl.tags?.policyVersionId
            const isOutdated = Boolean(tplPolicyVersionId) && tplPolicyVersionId !== String(policyVersionId)
            const isUpdatingThis = updatingTemplateId === tpl.id
            return (
              <div
                key={tpl.id || tpl.name}
                className="gba:w-full gba:text-left gba:p-3 gba:rounded-md gba:border gba:border-border gba:bg-card"
                data-testid={`policy-flow-row-${tpl.id}`}
              >
                <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
                  <button
                    type="button"
                    onClick={() => openFlowCreator(tpl.id)}
                    className="gba:flex-1 gba:min-w-0 gba:text-left gba:hover:underline"
                    data-testid={`policy-flow-open-${tpl.id}`}
                  >
                    <div className="gba:font-medium gba:text-foreground gba:truncate">{tpl.name}</div>
                    {tpl.description && (
                      <div className="gba:text-xs gba:text-muted-foreground gba:line-clamp-2">{tpl.description}</div>
                    )}
                  </button>
                  <div className="gba:flex gba:items-center gba:gap-2 gba:shrink-0">
                    {isOutdated && <Badge variant="destructive">{t('policy_flows_outdated')}</Badge>}
                    <Badge variant="outline">{tpl.type}</Badge>
                  </div>
                </div>

                {isOutdated && (
                  <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-end gba:gap-2 gba:mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openFlowCreator(tpl.id)}
                      data-testid={`policy-flow-review-updates-${tpl.id}`}
                      type="button"
                    >
                      {t('policy_flows_review_updates')}
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => generateDraftUpdate(tpl)}
                      disabled={Boolean(updatingTemplateId) && !isUpdatingThis}
                      data-testid={`policy-flow-generate-update-${tpl.id}`}
                      type="button"
                    >
                      {isUpdatingThis ? t('policy_flows_generating_update') : t('policy_flows_generate_update')}
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default PolicyFlowsPanel
