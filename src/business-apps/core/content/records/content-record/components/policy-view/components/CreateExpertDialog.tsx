import React, { useCallback, useEffect, useState } from 'react'
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Separator,
  Spinner,
  Textarea,
  useTranslation
} from '@newwork/nw-design-system'
import { ExternalLink, FileText } from 'lucide-react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { toast } from 'sonner'
import translations from '../../../_i18n'

/* ------------------------------------------------------------------ */
/*  Compliance Check system prompt (hidden from user)                  */
/* ------------------------------------------------------------------ */
const buildSystemPrompt = (title: string) =>
  [
    `You are a compliance verification agent for the policy "${title}".`,
    'When given a situation or question, analyze it against the linked policy document and respond with:',
    '',
    '1. **Verdict**: Compliant, Non-Compliant, or Needs Review',
    '2. **Cited sections**: List the specific policy sections relevant to your assessment',
    '3. **Reasoning**: Explain why this verdict applies',
    '4. **Recommendations**: Suggest next steps or actions',
    '',
    'Always be precise and cite specific parts of the policy.'
  ].join('\n')

/* ------------------------------------------------------------------ */
/*  Dialog component                                                   */
/* ------------------------------------------------------------------ */
interface CreateExpertDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accessToken: string
  policyRootId: string
  policyVersionId: string
  policyTitle?: string | null
  onCreated?: () => void
}

export const CreateExpertDialog: React.FC<CreateExpertDialogProps> = ({
  open,
  onOpenChange,
  accessToken,
  policyRootId,
  policyVersionId,
  policyTitle,
  onCreated
}) => {
  const { t } = useTranslation(translations)
  const client = usePromptManagerClient(accessToken)

  // Auto-resolved defaults (fetched once)
  const [workspaceId, setWorkspaceId] = useState<string>('')
  const [modelId, setModelId] = useState<string>('')
  const [isReady, setIsReady] = useState(false)

  // Form fields
  const title = policyTitle || ''
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [customInstructions, setCustomInstructions] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName(`Compliance Check — ${title}`)
      setDescription(`Checks situations against policy: ${title}`)
      setCustomInstructions('')
    }
  }, [open, title])

  // Fetch workspace and model defaults
  useEffect(() => {
    if (!open || isReady) return
    let cancelled = false

    const resolve = async () => {
      try {
        const [ws, models] = await Promise.all([
          client.getWorkspaces({ limit: 50 }),
          client.getAiModels({ limit: 100 })
        ])
        if (cancelled) return

        const defaultWs = ws.data.find(w => w.default && w._id)?._id
        const fallbackWs = ws.data.find(w => w._id)?._id
        setWorkspaceId(defaultWs || fallbackWs || '')

        if (models.data.length > 0) {
          setModelId(models.data[0]._id || '')
        }
        setIsReady(true)
      } catch {
        setIsReady(true)
      }
    }
    resolve()
    return () => {
      cancelled = true
    }
  }, [open, isReady, client])

  const handleSubmit = useCallback(async () => {
    if (!name.trim() || !workspaceId || !modelId) return
    setIsSubmitting(true)
    try {
      // Backend requires name to be alphanumeric + underscores only
      const slugName = name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_/, '')
        .replace(/_$/, '')

      const created = await client.createPrompt({
        name: slugName,
        description: name.trim(),
        type: 'completion',
        systemContent: buildSystemPrompt(title),
        userContent: customInstructions.trim() || '{{input}}',
        modelId,
        workspaceId,
        agentType: 'everyai',
        specialty: `Policy: ${title}`,
        tags: [`policy:${policyRootId}`]
      })

      // Link the policy as a knowledge source
      const expertId = created._id
      if (expertId) {
        await client.addKnowledgeSourceContent(expertId, policyVersionId, title || 'Policy document')
      }

      toast.success(t('policy_create_expert_success'))
      onOpenChange(false)
      onCreated?.()
    } catch (e) {
      toast.error(t('policy_create_expert_error'), {
        description: e instanceof Error ? e.message : String(e)
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [
    name,
    description,
    customInstructions,
    workspaceId,
    modelId,
    title,
    policyRootId,
    policyVersionId,
    client,
    t,
    onOpenChange,
    onCreated
  ])

  const handleOpenExpertMode = () => {
    const url = buildPlatformUrl('/platform/create/prompt-manager', {
      expertId: 'new',
      sourceContentEntryId: policyVersionId,
      policyRootId,
      policyTitle: title || undefined
    })
    navigateTo(url)
    onOpenChange(false)
  }

  const canSubmit = name.trim().length > 0 && isReady && !!workspaceId && !!modelId

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-lg" data-testid="create-expert-dialog">
        <DialogHeader>
          <DialogTitle>{t('policy_create_expert_dialog_title')}</DialogTitle>
        </DialogHeader>

        {!isReady ? (
          <div className="gba:flex gba:items-center gba:justify-center gba:py-10">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="gba:space-y-4 gba:py-2">
            {/* Name */}
            <div className="gba:space-y-1.5">
              <Label htmlFor="expert-name">{t('policy_create_expert_name_label')}</Label>
              <Input
                id="expert-name"
                value={name}
                onChange={e => setName(e.target.value)}
                data-testid="create-expert-name"
              />
            </div>

            {/* Description */}
            <div className="gba:space-y-1.5">
              <Label htmlFor="expert-desc">{t('policy_create_expert_desc_label')}</Label>
              <Input
                id="expert-desc"
                value={description}
                onChange={e => setDescription(e.target.value)}
                data-testid="create-expert-desc"
              />
            </div>

            {/* Custom instructions (maps to userContent) */}
            <div className="gba:space-y-1.5">
              <Label htmlFor="expert-instructions">{t('policy_create_expert_instructions_label')}</Label>
              <Textarea
                id="expert-instructions"
                value={customInstructions}
                onChange={e => setCustomInstructions(e.target.value)}
                placeholder={t('policy_create_expert_instructions_placeholder')}
                rows={3}
                data-testid="create-expert-instructions"
              />
            </div>

            {/* Knowledge source (read-only) */}
            <div className="gba:space-y-1.5">
              <Label>{t('policy_create_expert_knowledge_label')}</Label>
              <div className="gba:flex gba:items-center gba:gap-2 gba:rounded-md gba:border gba:border-border gba:bg-muted/30 gba:px-3 gba:py-2">
                <FileText className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:shrink-0" />
                <span className="gba:text-sm gba:truncate">{title || policyVersionId}</span>
                <Badge variant="outline" className="gba:ml-auto gba:shrink-0">
                  content
                </Badge>
              </div>
            </div>

            {/* Expert mode link */}
            <Separator />
            <button
              type="button"
              onClick={handleOpenExpertMode}
              className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground gba:hover:text-foreground gba:transition-colors"
              data-testid="create-expert-advanced"
            >
              <ExternalLink className="gba:h-3.5 gba:w-3.5" />
              {t('policy_create_expert_advanced')}
            </button>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            data-testid="create-expert-cancel"
            type="button"
          >
            {t('cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            data-testid="create-expert-submit"
            type="button"
          >
            {isSubmitting ? <Spinner size="sm" className="gba:mr-2" /> : null}
            {t('policy_create_expert_submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CreateExpertDialog
