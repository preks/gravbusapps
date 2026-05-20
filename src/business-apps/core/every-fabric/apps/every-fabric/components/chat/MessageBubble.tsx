import { useCallback, useMemo, useState, useRef, useEffect } from 'react'
import { BrainIcon, CaretDownIcon, CaretUpIcon, CheckIcon, CopyIcon, WarningCircleIcon } from '@phosphor-icons/react'
import type {
  ChatMessage,
  StructuredInputRequestEvent,
  ComposeEmailSubmission,
  EnterprisePresentationMode
} from '../../types/enterpriseAgent'
import { PlanRenderer } from '../renderers/PlanRenderer'
import { ToolCallRenderer } from '../renderers/ToolCallRenderer'
import { ToolResultRenderer } from '../renderers/ToolResultRenderer'
import { ReflectionRenderer } from '../renderers/ReflectionRenderer'
import { ExpertCallRenderer } from '../renderers/ExpertCallRenderer'
import { StructuredInputForm } from '../renderers/StructuredInputForm'
import { ToolPermissionRequest } from '../renderers/ToolPermissionRequest'
import { AttachmentChipList } from './AttachmentChipList'
import { EmailComposerBubble } from './EmailComposerBubble'
import { FinalAnswerRenderer } from '../renderers/FinalAnswerRenderer'
import { MarkdownWithChipsRenderer } from '@/common/components/markdown/MarkdownWithChipsRenderer'
import { findComposeEmailOutcomeAfterMessage } from '../../utils/composeEmailTrace'
import { FABRIC_LIVE_PLAN_MESSAGE_ID } from '../../utils/messageUtils'
import { parseIsoTimestamp } from '../../utils/renderUtils'

const AnimatedMessageWrapper: React.FC<{
  children: React.ReactNode
  messageId: string
  className?: string
  disableEntranceAnimation?: boolean
  'data-testid'?: string
}> = ({ children, messageId, className = '', disableEntranceAnimation = false, 'data-testid': testId }) => {
  const [isNew, setIsNew] = useState(true)
  const mountedRef = useRef(false)

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true
      const timer = setTimeout(() => setIsNew(false), 300)
      return () => clearTimeout(timer)
    }
  }, [])

  const animationClass =
    !disableEntranceAnimation && isNew ? 'gba:animate-in gba:fade-in gba:slide-in-from-bottom-2 gba:duration-200' : ''

  return (
    <div className={`${className} ${animationClass}`} data-testid={testId} data-message-id={messageId}>
      {children}
    </div>
  )
}

/**
 * Returns true if the full transcript contains a real agent-produced message
 * after the given message id. Used to detect that a structured_input_request
 * was answered in a previous turn (the agent has since emitted more output)
 * and should be rendered as a collapsed summary rather than a live form.
 *
 * The `fabric-live-plan` sentinel is deliberately ignored: `deriveMessagesFromEvents`
 * always appends it at the very end of the message list whenever the session
 * has todos, so it sits after a freshly-arrived structured_input_request even
 * when the user hasn't answered yet. Counting it as "a message after" would
 * make the form render locked/read-only on first display and block the user
 * from submitting — exactly the bug this guard prevents.
 */
const hasAnsweredReply = (allMessages: ChatMessage[] | undefined, messageId: string): boolean => {
  if (!allMessages || allMessages.length === 0) return false
  const idx = allMessages.findIndex(m => m.id === messageId)
  if (idx < 0) return false
  for (let i = idx + 1; i < allMessages.length; i += 1) {
    if (allMessages[i].id !== FABRIC_LIVE_PLAN_MESSAGE_ID) return true
  }
  return false
}

const formatMessageTimestamp = (timestamp: string) => {
  const date = parseIsoTimestamp(timestamp)
  if (!date) return ''
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const USER_PROMPT_COLLAPSE_CHARS = 260

const AssistantLockup = ({ trailing }: { trailing?: React.ReactNode }) => (
  <div className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:mb-3">
    <span className="gba:text-[12px] gba:font-bold gba:tracking-[0.01em] gba:text-foreground">
      NEWWORK Enterprise Agents
    </span>
    {trailing}
  </div>
)

/** Strip the [Attached document(s): …]\n\n prefix injected by FabricContext
 *  before the user's actual task text. The chips already show the files. */
const stripAttachmentPrefix = (text: string): string => text.replace(/^\[Attached documents?: [^\]]+\]\n\n/, '')

const UserMessageBubble = ({
  message,
  sessionId,
  accessToken
}: {
  message: ChatMessage
  sessionId: string
  accessToken?: string
}) => {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const rawContent = message.content as string
  // Strip the file-name prefix that was prepended to the task for the backend;
  // the attachment chips render the file info visually.
  const content = stripAttachmentPrefix(rawContent)
  const timestampLabel = useMemo(() => formatMessageTimestamp(message.timestamp), [message.timestamp])
  const isCollapsible = content.length > USER_PROMPT_COLLAPSE_CHARS
  const visibleContent =
    isCollapsible && !expanded ? `${content.slice(0, USER_PROMPT_COLLAPSE_CHARS).trimEnd()}…` : content

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true)
      globalThis.setTimeout(() => setCopied(false), 1800)
    })
  }, [content])

  const messageAttachments = message.attachments
  const hasAttachments = !!messageAttachments && messageAttachments.length > 0

  return (
    <AnimatedMessageWrapper
      messageId={message.id}
      className="gba:flex gba:flex-col gba:items-end gba:py-2"
      data-testid={`msg-${message.id}`}
    >
      <div className="gba:max-w-[85%] gba:rounded-[1.15rem] gba:bg-muted/40 gba:px-4 gba:py-2.5 gba:text-[14px] gba:leading-6 gba:font-normal gba:text-foreground">
        {hasAttachments && (
          <div className="gba:-mx-1 gba:mb-2 gba:flex gba:flex-wrap gba:justify-end">
            <AttachmentChipList
              messageAttachments={messageAttachments}
              imageVariant="block"
              sessionId={sessionId}
              accessToken={accessToken}
              readOnly
              testIdPrefix={`msg-${message.id}-attachment`}
            />
          </div>
        )}
        {visibleContent}
      </div>
      <div className="gba:mt-2 gba:flex gba:items-center gba:gap-2 gba:px-1">
        <span className="gba:text-[11px] gba:font-medium gba:text-muted-foreground">You</span>
        {timestampLabel && <span className="gba:text-[11px] gba:text-muted-foreground/70">{timestampLabel}</span>}
        {isCollapsible && (
          <button
            type="button"
            onClick={() => setExpanded(value => !value)}
            className="gba:inline-flex gba:items-center gba:gap-1 gba:h-6 gba:px-2 gba:rounded-full gba:text-[11px] gba:font-medium gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors"
            aria-label={expanded ? 'Collapse prompt' : 'Expand prompt'}
            data-testid={`toggle-${message.id}`}
          >
            <span>{expanded ? 'Less' : 'More'}</span>
            {expanded ? <CaretUpIcon className="gba:h-3 gba:w-3" /> : <CaretDownIcon className="gba:h-3 gba:w-3" />}
          </button>
        )}
        <button
          type="button"
          onClick={handleCopy}
          className="gba:inline-flex gba:items-center gba:justify-center gba:h-6 gba:w-6 gba:rounded-full gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors"
          aria-label="Copy prompt"
          data-testid={`copy-${message.id}`}
        >
          {copied ? (
            <CheckIcon className="gba:h-3.5 gba:w-3.5" weight="bold" />
          ) : (
            <CopyIcon className="gba:h-3.5 gba:w-3.5" />
          )}
        </button>
      </div>
    </AnimatedMessageWrapper>
  )
}

interface MessageBubbleProps {
  message: ChatMessage
  sessionId: string
  /**
   * Full, UNFILTERED transcript of the session. Must include `tool_result`
   * and other non-visible message types — they drive post-submit detection
   * for compose_email (looking up the matching tool_result) and for any
   * structured_input_request form (anything after it means it was answered).
   * Filtering this down to only the "bubble-rendered" message types breaks
   * collapse-on-reload for both the email composer and other forms.
   */
  allMessages?: ChatMessage[]
  onReply?: (answer?: string, structuredInput?: Record<string, any>) => void
  onViewArtifact?: (artifactName: string) => void
  accessToken?: string
  presentationMode?: EnterprisePresentationMode
}

const getMarkdownVariant = (presentationMode: EnterprisePresentationMode): 'default' | 'enterprise' =>
  presentationMode === 'enterprise_agents' ? 'enterprise' : 'default'

const renderStructuredInputRequestBubble = (
  message: ChatMessage,
  allMessages: ChatMessage[] | undefined,
  onReply: MessageBubbleProps['onReply'],
  accessToken: string | undefined
) => {
  const formData = message.content as StructuredInputRequestEvent

  if (formData.form_id === 'compose_email' && formData.email_draft) {
    const traceOutcome =
      allMessages && allMessages.length > 0 ? findComposeEmailOutcomeAfterMessage(allMessages, message.id) : null

    return (
      <div className="gba:py-1" data-testid={`msg-${message.id}`}>
        <EmailComposerBubble
          draft={formData.email_draft}
          rationale={formData.description}
          accessToken={accessToken}
          traceOutcome={traceOutcome}
          onSubmit={(submission: ComposeEmailSubmission) => {
            if (onReply) {
              onReply(undefined, submission as Record<string, any>)
            }
          }}
        />
      </div>
    )
  }

  const alreadySubmitted = hasAnsweredReply(allMessages, message.id)

  if (formData.form_id === 'tool_permission_request') {
    return (
      <div className="gba:py-1" data-testid={`msg-${message.id}`}>
        <ToolPermissionRequest
          request={formData}
          alreadySubmitted={alreadySubmitted}
          onSubmit={payload => {
            if (onReply) {
              onReply(undefined, payload)
            }
          }}
        />
      </div>
    )
  }

  return (
    <div className="gba:py-1" data-testid={`msg-${message.id}`}>
      <StructuredInputForm
        formId={formData.form_id}
        title={formData.title}
        description={formData.description}
        fields={formData.fields}
        allowPartialSubmit={formData.allow_partial_submit}
        accessToken={accessToken}
        alreadySubmitted={alreadySubmitted}
        toolRef={formData.tool_ref}
        requestStatus={formData.request_status}
        onSubmit={(values, aiDelegated) => {
          if (onReply) {
            const structuredPayload = aiDelegated.length > 0 ? { ...values, _ai_should_fill: aiDelegated } : values
            onReply(undefined, structuredPayload)
          }
        }}
        onCancel={
          formData.tool_ref
            ? () => {
                if (onReply) onReply(undefined, { action: 'cancel' })
              }
            : undefined
        }
      />
    </div>
  )
}

const renderErrorBubble = (message: ChatMessage, onReply: MessageBubbleProps['onReply']) => {
  const {
    message: errMsg,
    code,
    retryable
  } = message.content as {
    message: string
    code?: string
    retryable?: boolean
  }
  const needsAuth = code === 'permission_required' || /permission|auth|token|login/i.test(errMsg)

  let errorTitle: string
  if (needsAuth) {
    errorTitle = 'Authentication required'
  } else if (retryable) {
    errorTitle = 'Provider unavailable'
  } else {
    errorTitle = 'Session failed'
  }

  return (
    <AnimatedMessageWrapper messageId={message.id} className="gba:py-1" data-testid={`msg-${message.id}`}>
      <div className="gba:flex gba:items-start gba:gap-3 gba:rounded-2xl gba:border gba:border-destructive/30 gba:bg-destructive/5 gba:px-5 gba:py-4">
        <WarningCircleIcon className="gba:h-4 gba:w-4 gba:text-destructive gba:shrink-0 gba:mt-0.5" />
        <div>
          <p className="gba:text-sm gba:font-medium gba:text-destructive gba:mb-0.5">{errorTitle}</p>
          <p className="gba:text-sm gba:text-muted-foreground">{errMsg}</p>
          <div className="gba:mt-3 gba:flex gba:flex-wrap gba:gap-2">
            {needsAuth && (
              <button
                type="button"
                onClick={() => globalThis.dispatchEvent(new Event('every-fabric:reauth-requested'))}
                className="gba:rounded-md gba:bg-foreground gba:px-3 gba:py-1.5 gba:text-xs gba:font-medium gba:text-background"
              >
                Re-authenticate
              </button>
            )}
            {retryable && onReply && (
              <button
                type="button"
                onClick={() =>
                  onReply('Retry the previous failed provider operation after the user addressed the required action.')
                }
                className="gba:rounded-md gba:border gba:border-border gba:px-3 gba:py-1.5 gba:text-xs gba:font-medium gba:text-foreground"
              >
                Retry after fixing
              </button>
            )}
          </div>
        </div>
      </div>
    </AnimatedMessageWrapper>
  )
}

const renderDefaultBubble = (message: ChatMessage, presentationMode: EnterprisePresentationMode) => {
  const content = message.content as string | undefined

  return (
    <div className="gba:py-1" data-testid={`msg-${message.id}`}>
      <div className="gba:rounded-2xl gba:bg-muted/45 gba:px-5 gba:py-4 gba:text-[15px] gba:leading-7">
        {typeof content === 'string' ? (
          <MarkdownWithChipsRenderer content={content} variant={getMarkdownVariant(presentationMode)} />
        ) : null}
      </div>
    </div>
  )
}

const renderMessageBubbleContent = ({
  message,
  sessionId,
  allMessages,
  onReply,
  onViewArtifact,
  accessToken,
  presentationMode = 'default'
}: MessageBubbleProps) => {
  switch (message.type) {
    case 'user_input':
      return <UserMessageBubble message={message} sessionId={sessionId} accessToken={accessToken} />

    case 'agent_thinking': {
      const content = message.content as string
      return (
        <div className="gba:py-1" data-testid={`msg-${message.id}`}>
          <div className="gba:rounded-2xl gba:border gba:border-border/45 gba:bg-background gba:px-5 gba:py-4 gba:shadow-[0_4px_16px_rgba(15,23,42,0.035)]">
            <AssistantLockup
              trailing={<span className="gba:text-[11px] gba:text-muted-foreground">Working on it</span>}
            />
            <div className="gba:flex gba:items-start gba:gap-3">
              <BrainIcon className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground gba:mt-0.5 gba:shrink-0" />
              <div className="gba:text-[15px] gba:text-foreground/88 gba:leading-7">
                <MarkdownWithChipsRenderer content={content} variant={getMarkdownVariant(presentationMode)} />
              </div>
            </div>
          </div>
        </div>
      )
    }

    case 'plan': {
      const { todos } = message.content as { todos: Parameters<typeof PlanRenderer>[0]['todos'] }
      return (
        <div className="gba:py-1" data-testid={`msg-${message.id}`}>
          <PlanRenderer todos={todos} isLive={!!message.isStreaming} />
        </div>
      )
    }

    case 'tool_call': {
      const content = message.content as Parameters<typeof ToolCallRenderer>[0]
      return (
        <div className="gba:py-0.5" data-testid={`msg-${message.id}`}>
          <ToolCallRenderer {...content} />
        </div>
      )
    }

    case 'tool_result': {
      const content = message.content as Parameters<typeof ToolResultRenderer>[0]
      return (
        <div className="gba:py-0.5" data-testid={`msg-${message.id}`}>
          <ToolResultRenderer {...content} />
        </div>
      )
    }

    case 'reflection': {
      const content = message.content as Parameters<typeof ReflectionRenderer>[0]['result']
      return (
        <div className="gba:py-1" data-testid={`msg-${message.id}`}>
          <ReflectionRenderer result={content} />
        </div>
      )
    }

    case 'expert_call': {
      const content = message.content as Parameters<typeof ExpertCallRenderer>[0]
      return (
        <AnimatedMessageWrapper messageId={message.id} className="gba:py-0.5" data-testid={`msg-${message.id}`}>
          <ExpertCallRenderer {...content} />
        </AnimatedMessageWrapper>
      )
    }

    case 'structured_input_request':
      return renderStructuredInputRequestBubble(message, allMessages, onReply, accessToken)

    case 'human_interrupt': {
      const { question } = message.content as { question: string }
      return (
        <AnimatedMessageWrapper messageId={message.id} className="gba:py-0.5" data-testid={`msg-${message.id}`}>
          <div className="gba:w-fit gba:max-w-full gba:px-1">
            <div className="gba:flex gba:items-start gba:gap-2.5">
              <div className="gba:flex gba:h-5 gba:w-5 gba:items-center gba:justify-center gba:rounded-full gba:bg-muted/55 gba:text-muted-foreground gba:shrink-0 gba:mt-0.5">
                <span className="gba:text-[11px] gba:font-medium">?</span>
              </div>
              <div className="gba:flex-1">
                <p className="gba:text-[12px] gba:font-semibold gba:text-foreground/90 gba:mb-0.5">
                  Agent has a question
                </p>
                <p className="gba:text-[14px] gba:leading-6 gba:text-muted-foreground">{question}</p>
              </div>
            </div>
          </div>
        </AnimatedMessageWrapper>
      )
    }

    case 'final_answer': {
      const content = message.content as Parameters<typeof FinalAnswerRenderer>[0]
      return (
        <AnimatedMessageWrapper
          messageId={message.id}
          className="gba:py-1"
          disableEntranceAnimation
          data-testid={`msg-${message.id}`}
        >
          <FinalAnswerRenderer
            {...content}
            sessionId={sessionId}
            onViewArtifact={onViewArtifact}
            presentationMode={presentationMode}
          />
        </AnimatedMessageWrapper>
      )
    }

    case 'error':
      return renderErrorBubble(message, onReply)

    default:
      return renderDefaultBubble(message, presentationMode)
  }
}

export const MessageBubble = ({
  message,
  sessionId,
  allMessages,
  onReply,
  onViewArtifact,
  accessToken,
  presentationMode = 'default'
}: MessageBubbleProps) =>
  renderMessageBubbleContent({
    message,
    sessionId,
    allMessages,
    onReply,
    onViewArtifact,
    accessToken,
    presentationMode
  })
