import React, { useCallback, useEffect, useState } from 'react'
import { Alert, AlertDescription, AlertTitle, Badge, Button, Spinner, useTranslation } from '@newwork/nw-design-system'
import { Sparkles } from 'lucide-react'
import { Navigation, buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { FlowTemplateClient, type FlowTemplate } from '@/common/network/flows/FlowTemplateClient'
import { openPolicyFlowInEveryAI } from '@/business-apps/core/content/utils/flowAIMappers'
import translations from '../../../_i18n'
import { toast } from 'sonner'

interface PolicyFlowsPanelProps {
  accessToken: string
  policyRootId: string
  policyVersionId: string
  policyTitle?: string | null
}

export const PolicyFlowsPanel: React.FC<PolicyFlowsPanelProps> = ({
  accessToken,
  policyRootId,
  policyVersionId,
  policyTitle
}) => {
  const { t } = useTranslation(translations)
  const [templates, setTemplates] = useState<FlowTemplate[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const startEveryAIFlowGeneration = () => {
    if (!policyVersionId) {
      toast.error(t('policy_flows_generate_missing_policy'))
      return
    }

    openPolicyFlowInEveryAI({
      policyTitle,
      policyRootId,
      policyVersionId
    })
  }

  const startEveryAIFlowUpdate = (tpl: FlowTemplate) => {
    if (!policyVersionId) {
      toast.error(t('policy_flows_generate_missing_policy'))
      return
    }

    openPolicyFlowInEveryAI({
      policyTitle,
      policyRootId,
      policyVersionId,
      mode: 'update',
      existingTemplate: tpl
    })
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
          <Button variant="outline" onClick={startEveryAIFlowGeneration} data-testid="policy-flows-generate-ai">
            <Sparkles className="gba:h-4 gba:w-4 gba:mr-1.5" />
            {t('policy_action_generate_flow')}
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
        <Button variant="outline" onClick={startEveryAIFlowGeneration} data-testid="policy-flows-generate-ai">
          <Sparkles className="gba:h-4 gba:w-4 gba:mr-1.5" />
          {t('policy_action_generate_flow')}
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
                      onClick={() => startEveryAIFlowUpdate(tpl)}
                      data-testid={`policy-flow-generate-update-${tpl.id}`}
                      type="button"
                    >
                      {t('policy_flows_generate_update')}
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
