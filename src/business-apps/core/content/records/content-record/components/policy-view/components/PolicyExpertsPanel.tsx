import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, AlertDescription, AlertTitle, Badge, Button, Spinner, useTranslation } from '@newwork/nw-design-system'
import { Bot } from 'lucide-react'
import type { PromptODM } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import translations from '../../../_i18n'
import CreateExpertDialog from './CreateExpertDialog'

interface PolicyExpertsPanelProps {
  accessToken: string
  policyRootId: string
  policyVersionId: string
  policyTitle?: string | null
}

export const PolicyExpertsPanel: React.FC<PolicyExpertsPanelProps> = ({
  accessToken,
  policyRootId,
  policyVersionId,
  policyTitle
}) => {
  const { t } = useTranslation(translations)
  const client = usePromptManagerClient(accessToken)
  const [experts, setExperts] = useState<PromptODM[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const policyTag = useMemo(() => `policy:${policyRootId}`, [policyRootId])

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await client.getEveryAIExperts({ tags: [policyTag], limit: 50, offset: 0, returnTotalRecords: true })
      setExperts(res.data || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setIsLoading(false)
    }
  }, [client, policyTag])

  useEffect(() => {
    load().catch(() => undefined)
  }, [load])

  const openCreate = () => setCreateDialogOpen(true)

  const openExpert = (expertId: string) => {
    const url = buildPlatformUrl('/platform/create/prompt-manager', { expertId })
    navigateTo(url)
  }

  if (isLoading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:py-10" data-testid="policy-experts-loading">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:space-y-3" data-testid="policy-experts-error">
        <Alert variant="destructive">
          <AlertTitle>{t('policy_experts_error_title')}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="gba:flex gba:gap-2">
          <Button variant="outline" onClick={load} data-testid="policy-experts-retry">
            {t('retry')}
          </Button>
          <Button variant="outline" onClick={openCreate} data-testid="policy-experts-create">
            <Bot className="gba:h-4 gba:w-4 gba:mr-1.5" />
            {t('policy_action_create_expert')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="gba:space-y-4" data-testid="policy-experts-panel">
      <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-2">
        <Badge variant="outline" data-testid="policy-experts-count">
          {t('policy_experts_count', { count: experts.length })}
        </Badge>
        <Button variant="outline" onClick={openCreate} data-testid="policy-experts-create">
          <Bot className="gba:h-4 gba:w-4 gba:mr-1.5" />
          {t('policy_action_create_expert')}
        </Button>
      </div>

      {experts.length === 0 ? (
        <div className="gba:text-sm gba:text-muted-foreground" data-testid="policy-experts-empty">
          {t('policy_experts_empty')}
        </div>
      ) : (
        <div className="gba:space-y-2" data-testid="policy-experts-list">
          {experts.map(expert => (
            <button
              key={expert._id || expert.name}
              type="button"
              onClick={() => expert._id && openExpert(expert._id)}
              className="gba:w-full gba:text-left gba:p-3 gba:rounded-md gba:border gba:border-border gba:bg-card gba:hover:bg-accent gba:transition-colors"
              data-testid={`policy-expert-row-${expert._id}`}
            >
              <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
                <div className="gba:min-w-0">
                  <div className="gba:font-medium gba:text-foreground gba:truncate">{expert.name}</div>
                  {expert.specialty && <div className="gba:text-xs gba:text-muted-foreground">{expert.specialty}</div>}
                </div>
                <Badge variant="outline" className="gba:shrink-0">
                  everyai
                </Badge>
              </div>
            </button>
          ))}
        </div>
      )}

      <CreateExpertDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        accessToken={accessToken}
        policyRootId={policyRootId}
        policyVersionId={policyVersionId}
        policyTitle={policyTitle}
        onCreated={load}
      />
    </div>
  )
}

export default PolicyExpertsPanel
