import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Separator,
  useTranslation
} from '@newwork/nw-design-system'
import { CheckCircle2, FilePlus2, Loader2, RefreshCw, Workflow, XCircle } from 'lucide-react'
import { FlowTemplateClient, type FlowTemplate } from '@/common/network/flows/FlowTemplateClient'
import { flowAIClient } from '@/common/network/flows/FlowAIClient'
import { toFlowSteps, buildPolicyFlowPrompt } from '@/business-apps/core/content/utils/flowAIMappers'
import { Navigation, buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { toast } from 'sonner'
import translations from '../../../_i18n'

/* ------------------------------------------------------------------ */
/*  Generation phases for animated progress                            */
/* ------------------------------------------------------------------ */
type Phase = 'loading' | 'choose' | 'analyzing' | 'generating' | 'saving' | 'done' | 'error'

const PHASE_KEYS: Record<string, string> = {
  loading: 'policy_generate_flow_phase_loading',
  analyzing: 'policy_generate_flow_phase_analyzing',
  generating: 'policy_generate_flow_phase_generating',
  saving: 'policy_generate_flow_phase_saving',
  done: 'policy_generate_flow_phase_done',
  error: 'policy_generate_flow_phase_error'
}

/* ------------------------------------------------------------------ */
/*  Dialog component                                                   */
/* ------------------------------------------------------------------ */
interface GenerateFlowDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accessToken: string
  policyRootId: string
  policyVersionId: string
  policyTitle?: string | null
  policyContent?: string | null
  /** Called after template is created/updated so the flow list can refresh */
  onGenerated?: () => void
}

export const GenerateFlowDialog: React.FC<GenerateFlowDialogProps> = ({
  open,
  onOpenChange,
  accessToken,
  policyRootId,
  policyVersionId,
  policyTitle,
  policyContent,
  onGenerated
}) => {
  const { t } = useTranslation(translations)
  const [phase, setPhase] = useState<Phase>('loading')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [createdTemplateId, setCreatedTemplateId] = useState<string | null>(null)
  const [existingTemplates, setExistingTemplates] = useState<FlowTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const abortRef = useRef(false)

  /* ---------- Check for existing linked templates on open ---------- */
  const checkExisting = useCallback(async () => {
    abortRef.current = false
    setPhase('loading')
    setErrorMsg(null)
    setCreatedTemplateId(null)
    setExistingTemplates([])
    setSelectedTemplateId(null)

    try {
      const client = new FlowTemplateClient(accessToken)
      const res = await client.getTemplatesList({
        limit: 20,
        offset: 0,
        includeDrafts: true,
        tags: { policyRootId: String(policyRootId) }
      })
      if (abortRef.current) return

      if (res.templates.length > 0) {
        setExistingTemplates(res.templates)
        setPhase('choose')
      } else {
        // No existing templates -> go straight to generation
        runGeneration(null)
      }
    } catch {
      // If check fails, just proceed with new creation
      runGeneration(null)
    }
  }, [accessToken, policyRootId])

  /* ---------- Build AI prompt ---------- */
  const buildPrompt = useCallback(
    () => buildPolicyFlowPrompt({ policyTitle, policyContent, policyRootId, policyVersionId }),
    [policyTitle, policyContent, policyRootId, policyVersionId]
  )

  /* ---------- Run the AI generation + save ---------- */
  const runGeneration = useCallback(
    async (updateTemplateId: string | null) => {
      abortRef.current = false
      setPhase('analyzing')
      setErrorMsg(null)
      setCreatedTemplateId(null)

      const title = policyTitle || ''

      try {
        await delay(600)
        if (abortRef.current) return
        setPhase('generating')

        const aiTemplate = await flowAIClient.generateFlowTemplate(buildPrompt(), accessToken)
        if (abortRef.current) return

        setPhase('saving')
        const client = new FlowTemplateClient(accessToken)

        const steps = toFlowSteps(aiTemplate)
        let resultId: string | undefined

        if (updateTemplateId) {
          // Update existing template -> auto-increments version
          const updated = await client.updateTemplate(updateTemplateId, {
            steps,
            description: aiTemplate.description || undefined
          })
          resultId = updated.id || updateTemplateId
          toast.success(t('policy_generate_flow_updated'), { description: updated.name || updateTemplateId })
        } else {
          // Create new template
          const payload: Omit<FlowTemplate, 'id'> = {
            type: 'TEMPLATE',
            name: aiTemplate.name || `Policy Flow: ${title || policyRootId}`,
            description: aiTemplate.description || 'Generated Flow derived from a policy',
            version: 1,
            tags: {
              app: 'policy',
              policyRootId: String(policyRootId),
              policyVersionId: String(policyVersionId)
            },
            steps
          }
          const created = await client.createTemplate(payload)
          resultId = created.id
          toast.success(t('policy_flows_generate_success'), { description: created.name })
        }

        if (abortRef.current) return
        setCreatedTemplateId(resultId || null)
        setPhase('done')
        onGenerated?.()
      } catch (e) {
        if (abortRef.current) return
        setErrorMsg(e instanceof Error ? e.message : String(e))
        setPhase('error')
      }
    },
    [policyTitle, policyRootId, policyVersionId, accessToken, buildPrompt, t, onGenerated]
  )

  /* ---------- Start check when dialog opens ---------- */
  useEffect(() => {
    if (open) {
      checkExisting()
    }
    return () => {
      abortRef.current = true
    }
  }, [open, checkExisting])

  const handleOpenInCreator = () => {
    if (!createdTemplateId) return
    const url = buildPlatformUrl(Navigation.CREATE_FLOW_CREATOR, { flowId: createdTemplateId })
    navigateTo(url)
    onOpenChange(false)
  }

  const handleClose = () => {
    abortRef.current = true
    onOpenChange(false)
  }

  const handleChooseUpdate = (templateId: string) => {
    setSelectedTemplateId(templateId)
    runGeneration(templateId)
  }

  const handleChooseNew = () => {
    setSelectedTemplateId(null)
    runGeneration(null)
  }

  const isRunning = phase === 'analyzing' || phase === 'generating' || phase === 'saving'

  return (
    <Dialog open={open} onOpenChange={isRunning ? undefined : onOpenChange}>
      <DialogContent className="gba:max-w-md" data-testid="generate-flow-dialog">
        <DialogHeader>
          <DialogTitle>
            {phase === 'choose' ? t('policy_generate_flow_choose_title') : t('policy_generate_flow_dialog_title')}
          </DialogTitle>
        </DialogHeader>

        {/* ---- Choice phase: existing templates found ---- */}
        {phase === 'choose' && (
          <div className="gba:flex gba:flex-col gba:gap-3" data-testid="generate-flow-choose">
            <p className="gba:text-sm gba:text-muted-foreground">{t('policy_generate_flow_choose_desc')}</p>

            <div className="gba:flex gba:flex-col gba:gap-2">
              {existingTemplates.map(tmpl => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => handleChooseUpdate(tmpl.id!)}
                  className="gba:flex gba:items-center gba:gap-3 gba:rounded-md gba:border gba:border-border gba:px-3 gba:py-2.5 gba:text-left gba:hover:bg-accent gba:transition-colors gba:cursor-pointer"
                  data-testid={`generate-flow-update-${tmpl.id}`}
                >
                  <RefreshCw className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:shrink-0" />
                  <div className="gba:flex-1 gba:min-w-0">
                    <div className="gba:text-sm gba:font-medium gba:truncate">{tmpl.name}</div>
                    <div className="gba:text-xs gba:text-muted-foreground">
                      {t('policy_generate_flow_update_version', { version: String(tmpl.version || 1) })}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <Separator />

            <button
              type="button"
              onClick={handleChooseNew}
              className="gba:flex gba:items-center gba:gap-3 gba:rounded-md gba:border gba:border-border gba:px-3 gba:py-2.5 gba:text-left gba:hover:bg-accent gba:transition-colors gba:cursor-pointer"
              data-testid="generate-flow-create-new"
            >
              <FilePlus2 className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:shrink-0" />
              <div className="gba:flex-1 gba:min-w-0">
                <div className="gba:text-sm gba:font-medium">{t('policy_generate_flow_create_new')}</div>
                <div className="gba:text-xs gba:text-muted-foreground">{t('policy_generate_flow_create_new_desc')}</div>
              </div>
            </button>
          </div>
        )}

        {/* ---- Loading phase: checking for existing templates ---- */}
        {phase === 'loading' && (
          <div className="gba:flex gba:flex-col gba:items-center gba:gap-4 gba:py-8">
            <Loader2 className="gba:h-8 gba:w-8 gba:text-muted-foreground gba:animate-spin" />
            <div className="gba:text-sm gba:text-muted-foreground">{t(PHASE_KEYS.loading)}</div>
          </div>
        )}

        {/* ---- Generation / saving / done / error ---- */}
        {(isRunning || phase === 'done' || phase === 'error') && (
          <div className="gba:flex gba:flex-col gba:items-center gba:gap-4 gba:py-8">
            {isRunning && (
              <div className="gba:relative gba:flex gba:items-center gba:justify-center gba:h-16 gba:w-16">
                <Loader2 className="gba:h-16 gba:w-16 gba:text-primary gba:animate-spin gba:absolute" />
                <Workflow className="gba:h-7 gba:w-7 gba:text-primary" />
              </div>
            )}
            {phase === 'done' && (
              <div className="gba:flex gba:items-center gba:justify-center gba:h-16 gba:w-16">
                <CheckCircle2 className="gba:h-12 gba:w-12 gba:text-success" />
              </div>
            )}
            {phase === 'error' && (
              <div className="gba:flex gba:items-center gba:justify-center gba:h-16 gba:w-16">
                <XCircle className="gba:h-12 gba:w-12 gba:text-destructive" />
              </div>
            )}

            <div className="gba:text-center gba:space-y-1">
              <div className="gba:text-sm gba:font-medium">{PHASE_KEYS[phase] ? t(PHASE_KEYS[phase]) : ''}</div>
              {isRunning && (
                <div className="gba:text-xs gba:text-muted-foreground">{t('policy_generate_flow_patience')}</div>
              )}
              {errorMsg && <div className="gba:text-xs gba:text-destructive">{errorMsg}</div>}
            </div>
          </div>
        )}

        {/* ---- Footer ---- */}
        {phase !== 'choose' && phase !== 'loading' && (
          <DialogFooter>
            {phase === 'done' && (
              <Button onClick={handleOpenInCreator} data-testid="generate-flow-open-creator" type="button">
                {t('policy_generate_flow_open_creator')}
              </Button>
            )}
            {phase === 'error' && (
              <Button
                variant="outline"
                onClick={() => runGeneration(selectedTemplateId)}
                data-testid="generate-flow-retry"
                type="button"
              >
                {t('retry')}
              </Button>
            )}
            <Button variant="outline" onClick={handleClose} data-testid="generate-flow-close" type="button">
              {isRunning ? t('cancel') : t('policy_generate_flow_close')}
            </Button>
          </DialogFooter>
        )}

        {/* Choose phase footer */}
        {phase === 'choose' && (
          <DialogFooter>
            <Button variant="outline" onClick={handleClose} data-testid="generate-flow-cancel" type="button">
              {t('cancel')}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export default GenerateFlowDialog
