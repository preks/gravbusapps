import React, { useMemo, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Textarea,
  useTranslation
} from '@newwork/nw-design-system'
import type { ContentEntry } from '@/common/data/content/types/contentTypes'
import {
  AssignmentMode,
  FlowStepType,
  FlowTemplateClient,
  type TaskAssignment,
  type FlowTemplate
} from '@/common/network/flows/FlowTemplateClient'
import { AssignmentSelector } from '@/components/assignment-selector'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { toast } from 'sonner'
import translations from '../../../_i18n'

/* ------------------------------------------------------------------ */
/*  Variant configuration                                              */
/* ------------------------------------------------------------------ */

type DialogVariant = 'acknowledgement' | 'approval'

interface VariantConfig {
  stepType: FlowStepType
  tagApp: string
  allowedAssignmentTypes?: string[]
  i18n: {
    title: string
    description: string
    audienceLabel: string
    messageLabel: string
    messagePlaceholder: string
    dueLabel: string
    cancel: string
    send: string
    sending: string
    initiatorMissing: string
    assignmentMissing: string
    templateNamePrefix: string
    templateDescription: string
    stepTitle: string
    linkLabel: string
    successToast: string
    errorToast: string
  }
  testIdPrefix: string
}

const VARIANT_CONFIG: Record<DialogVariant, VariantConfig> = {
  acknowledgement: {
    stepType: FlowStepType.ACKNOWLEDGE,
    tagApp: 'policy',
    i18n: {
      title: 'policy_ack_title',
      description: 'policy_ack_description',
      audienceLabel: 'policy_ack_audience_label',
      messageLabel: 'policy_ack_message_label',
      messagePlaceholder: 'policy_ack_message_placeholder',
      dueLabel: 'policy_ack_due_label',
      cancel: 'policy_ack_cancel',
      send: 'policy_ack_send',
      sending: 'policy_ack_sending',
      initiatorMissing: 'policy_ack_initiator_missing',
      assignmentMissing: 'policy_ack_assignment_missing',
      templateNamePrefix: 'policy_ack_template_name_prefix',
      templateDescription: 'policy_ack_template_description',
      stepTitle: 'policy_ack_step_title',
      linkLabel: 'policy_ack_link_open_policy',
      successToast: 'policy_ack_success',
      errorToast: 'policy_ack_error'
    },
    testIdPrefix: 'policy-ack'
  },
  approval: {
    stepType: FlowStepType.APPROVAL,
    tagApp: 'policy-approval',
    allowedAssignmentTypes: ['people'],
    i18n: {
      title: 'policy_approval_title',
      description: 'policy_approval_description',
      audienceLabel: 'policy_approval_approvers_label',
      messageLabel: 'policy_approval_message_label',
      messagePlaceholder: 'policy_approval_message_placeholder',
      dueLabel: 'policy_approval_due_label',
      cancel: 'policy_approval_cancel',
      send: 'policy_approval_send',
      sending: 'policy_approval_sending',
      initiatorMissing: 'policy_approval_initiator_missing',
      assignmentMissing: 'policy_approval_assignment_missing',
      templateNamePrefix: 'policy_approval_template_name_prefix',
      templateDescription: 'policy_approval_template_description',
      stepTitle: 'policy_approval_step_title',
      linkLabel: 'policy_approval_link_open_policy',
      successToast: 'policy_approval_success',
      errorToast: 'policy_approval_error'
    },
    testIdPrefix: 'policy-approval'
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface PolicyFlowDialogProps {
  variant: DialogVariant
  open: boolean
  onOpenChange: (open: boolean) => void
  policy: ContentEntry
  accessToken: string
  initiatorUserId?: string
  onSent?: () => void
}

export const PolicyFlowDialog: React.FC<PolicyFlowDialogProps> = ({
  variant,
  open,
  onOpenChange,
  policy,
  accessToken,
  initiatorUserId,
  onSent
}) => {
  const cfg = VARIANT_CONFIG[variant]
  const { t } = useTranslation(translations)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [dueDate, setDueDate] = useState('')

  const [assignment, setAssignment] = useState<TaskAssignment>({
    targets: null,
    assignmentMode: AssignmentMode.ASSIGN,
    allowReassignment: true
  })

  const policyRootId = (policy as any).rootContentEntryId || policy.id
  const policyVersionId = policy.id
  const policyVersion = (policy as any).entryVersion

  const policyLink = useMemo(
    () => buildPlatformUrl('/platform/content/intranet/content-record', { contentId: policy.id, tab: 'policies' }),
    [policy.id]
  )

  const canSubmit = Boolean(initiatorUserId) && Boolean(assignment.targets)

  /** Convert selected date to minutes from now */
  const computeDueInMinutes = (): number | undefined => {
    if (!dueDate) return undefined
    const target = new Date(dueDate + 'T23:59:59')
    const minutes = Math.max(0, Math.round((target.getTime() - Date.now()) / 60000))
    return minutes > 0 ? minutes : undefined
  }

  const handleSend = async () => {
    if (!initiatorUserId) {
      toast.error(t(cfg.i18n.initiatorMissing))
      return
    }
    if (!assignment.targets) {
      toast.error(t(cfg.i18n.assignmentMissing))
      return
    }

    setIsSubmitting(true)
    try {
      const client = new FlowTemplateClient(accessToken)

      const templatePayload: Omit<FlowTemplate, 'id'> = {
        type: 'TEMPLATE',
        name: `${t(cfg.i18n.templateNamePrefix)}: ${policy.title}`,
        description: t(cfg.i18n.templateDescription),
        version: 1,
        tags: {
          app: cfg.tagApp,
          policyRootId: String(policyRootId || ''),
          policyVersionId: String(policyVersionId || ''),
          ...(policyVersion !== undefined && policyVersion !== null ? { policyVersion: String(policyVersion) } : {})
        },
        steps: [
          {
            type: cfg.stepType,
            title: t(cfg.i18n.stepTitle, { title: policy.title }),
            message: message?.trim() ? message.trim() : undefined,
            dueInMinutes: computeDueInMinutes(),
            links: [{ name: t(cfg.i18n.linkLabel), url: policyLink, type: 'URL' }],
            assignment
          }
        ]
      }

      const executed = await client.executeDynamicTemplate({
        templateDefinition: templatePayload,
        initiatorId: initiatorUserId
      })

      toast.success(t(cfg.i18n.successToast), { description: executed.workflowName })
      onSent?.()
      onOpenChange(false)
    } catch (e) {
      toast.error(t(cfg.i18n.errorToast), { description: e instanceof Error ? e.message : String(e) })
    } finally {
      setIsSubmitting(false)
    }
  }

  const prefix = cfg.testIdPrefix

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (!isSubmitting) onOpenChange(next)
      }}
    >
      <DialogContent data-testid={`${prefix}-dialog`}>
        <DialogHeader>
          <DialogTitle>{t(cfg.i18n.title)}</DialogTitle>
          <DialogDescription>{t(cfg.i18n.description)}</DialogDescription>
        </DialogHeader>

        <div className="gba:space-y-4 gba:py-2">
          <div className="gba:space-y-2">
            <div className="gba:text-sm gba:font-medium">{t(cfg.i18n.audienceLabel)}</div>
            <AssignmentSelector
              value={assignment}
              onChange={setAssignment}
              assignmentMode={AssignmentMode.ASSIGN}
              accessToken={accessToken}
              {...(cfg.allowedAssignmentTypes ? { allowedTypes: cfg.allowedAssignmentTypes } : {})}
              data-testid={`${prefix}-assignment-selector`}
            />
          </div>

          <div className="gba:space-y-2">
            <label className="gba:text-sm gba:font-medium" htmlFor={`${prefix}-message`}>
              {t(cfg.i18n.messageLabel)}
            </label>
            <Textarea
              id={`${prefix}-message`}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={t(cfg.i18n.messagePlaceholder)}
              data-testid={`${prefix}-message`}
            />
          </div>

          <div className="gba:space-y-2">
            <label className="gba:text-sm gba:font-medium" htmlFor={`${prefix}-due`}>
              {t(cfg.i18n.dueLabel)}
            </label>
            <Input
              id={`${prefix}-due`}
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              data-testid={`${prefix}-due`}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            data-testid={`${prefix}-cancel`}
            type="button"
          >
            {t(cfg.i18n.cancel)}
          </Button>
          <Button
            variant="default"
            onClick={handleSend}
            disabled={!canSubmit || isSubmitting}
            data-testid={`${prefix}-send`}
            type="button"
          >
            {isSubmitting ? t(cfg.i18n.sending) : t(cfg.i18n.send)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default PolicyFlowDialog
