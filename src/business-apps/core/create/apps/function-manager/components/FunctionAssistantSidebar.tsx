import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { CreateChatPanel } from '@/common/components/ai-builder'
import { Calculator, KeyRound, Link2, Plug, Scale, Shuffle, Webhook } from 'lucide-react'
import type {
  FunctionAssistantDraftResponse,
  FunctionAssistantExistingSnapshot,
  FunctionAssistantMode
} from '@/common/network/functions/FunctionsServiceClient'
import type { UserInfoProps } from '@/common/BusinessAppContext'
import { useEmployeeAvatar } from '@/business-apps/core/every/apps/every-box/hooks/useEmployeeAvatar'
import type { FunctionDefinitionTab } from './editor/FunctionDefinitionCard'
import { type AssistantFixTestArgs, useFunctionAssistantChat } from '../hooks/useFunctionAssistantChat'
import { AssistantChatMessage } from './assistant/AssistantChatMessage'

function base64ToDataUrl(base64: string | undefined): string | undefined {
  if (!base64) return undefined
  const trimmed = base64.trim()
  if (!trimmed) return undefined
  // Guard: some APIs can return JSON as string
  if (trimmed.startsWith('{')) return undefined
  const isPng = trimmed.startsWith('iVBORw0')
  const mime = isPng ? 'image/png' : 'image/jpeg'
  return `data:${mime};base64,${trimmed}`
}

export interface FunctionAssistantSidebarProps {
  accessToken?: string
  userInfo?: UserInfoProps
  mode: FunctionAssistantMode
  existing?: FunctionAssistantExistingSnapshot
  onApply: (draft: FunctionAssistantDraftResponse) => void
  onOpenDefinitionTab?: (tab: FunctionDefinitionTab) => void
  fixTestRequest?: (AssistantFixTestArgs & { nonce: string }) | null
  onFixTestRequestHandled?: () => void
  onClose?: () => void
  'data-testid'?: string
}

const USE_CASES = [
  {
    key: 'integration' as const,
    icon: Link2,
    title: 'Integration function',
    desc: 'Call an external REST API with auth'
  },
  {
    key: 'rules' as const,
    icon: Scale,
    title: 'Rule evaluator',
    desc: 'Evaluate business rules and return a stable result'
  },
  { key: 'compute' as const, icon: Calculator, title: 'Computation', desc: 'Compute derived values from inputs' },
  { key: 'transform' as const, icon: Shuffle, title: 'Data transformer', desc: 'Map input data to an output schema' },
  {
    key: 'tokenExchange' as const,
    icon: KeyRound,
    title: 'Token exchange',
    desc: 'Exchange user token for a provider token'
  },
  {
    key: 'webhook' as const,
    icon: Webhook,
    title: 'Webhook handler',
    desc: 'Validate signature, parse payload, trigger an action'
  },
  {
    key: 'connector' as const,
    icon: Plug,
    title: 'Board data connector',
    desc: 'Import structured data (Oracle, SAP, REST) into Board Apps'
  },
  {
    key: 'documentConnector' as const,
    icon: Plug,
    title: 'Document connector',
    desc: 'Import documents (Confluence, SharePoint, Drive, S3) into Document Service'
  }
] as const

export const FunctionAssistantSidebar: React.FC<FunctionAssistantSidebarProps> = ({
  accessToken,
  userInfo,
  mode,
  existing,
  onApply,
  onOpenDefinitionTab,
  fixTestRequest,
  onFixTestRequestHandled,
  onClose,
  'data-testid': testId = 'function-assistant-sidebar'
}) => {
  const bottomRef = React.useRef<HTMLDivElement | null>(null)

  const {
    input,
    setInput,
    isGenerating,
    messages,
    activityLines,
    clarifyWizard,
    canSend,
    canRetryLast,
    reset,
    send,
    sendText,
    retryLast,
    fixTest,
    applyDraft,
    startUseCase,
    setClarifyAnswer,
    goClarifyBack,
    goClarifyNext,
    submitClarify
  } = useFunctionAssistantChat({ accessToken, mode, existing, onApply })

  const avatarLookupId = userInfo?.employeeDetails?.employeeId || userInfo?.id
  const { employeeData } = useEmployeeAvatar(accessToken || '', avatarLookupId)
  const userAvatarSrc = React.useMemo(
    () => base64ToDataUrl(employeeData?.pictureThumbnail),
    [employeeData?.pictureThumbnail]
  )

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  React.useEffect(() => {
    if (!fixTestRequest) return
    const { nonce, ...args } = fixTestRequest
    void nonce
    fixTest(args)
    onFixTestRequestHandled?.()
  }, [fixTest, fixTestRequest?.nonce, onFixTestRequestHandled])

  const hasUserMessage = messages.some(m => m.role === 'user')

  const chatContent = (
    <div className="gba:space-y-4 gba:overflow-x-hidden" data-testid={`${testId}-scroll`}>
      {!hasUserMessage ? (
        <div className="gba:space-y-5" data-testid={`${testId}-welcome`}>
          <div className="gba:space-y-2">
            <h2 className="gba:text-lg gba:font-semibold gba:text-foreground">Build functions with AI</h2>
            <p className="gba:text-sm gba:text-muted-foreground gba:leading-relaxed">
              Choose a use case below to get started.
            </p>
          </div>
          <div className="gba:space-y-2">
            {USE_CASES.map(uc => (
              <button
                key={uc.key}
                type="button"
                onClick={() => {
                  void startUseCase(uc.key)
                }}
                className="gba:w-full gba:flex gba:items-center gba:gap-4 gba:p-4 gba:rounded-xl gba:border gba:border-border gba:bg-card gba:text-left gba:cursor-pointer gba:transition-colors gba:hover:bg-accent gba:hover:border-accent gba:focus-visible:outline-none gba:focus-visible:ring-2 gba:focus-visible:ring-ring"
                data-testid={`${testId}-usecase-${uc.key}`}
              >
                <div className="gba:flex gba:h-10 gba:w-10 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-lg gba:bg-muted">
                  <uc.icon className="gba:h-5 gba:w-5 gba:text-foreground" />
                </div>
                <div className="gba:min-w-0">
                  <div className="gba:text-sm gba:font-medium gba:text-foreground">{uc.title}</div>
                  <div className="gba:text-xs gba:text-muted-foreground gba:leading-snug">{uc.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="gba:space-y-3" data-testid={`${testId}-messages`}>
        {messages.map(m => (
          <AssistantChatMessage
            key={m.id}
            message={m}
            activityLines={activityLines}
            userInfo={userInfo}
            userAvatarSrc={userAvatarSrc}
            onOpenDefinitionTab={onOpenDefinitionTab}
            onRetryLast={retryLast}
            canRetryLast={canRetryLast}
            clarifyWizard={clarifyWizard}
            onClarifyAnswerChange={setClarifyAnswer}
            onClarifyBack={goClarifyBack}
            onClarifyNext={goClarifyNext}
            onClarifySubmit={submitClarify}
            onQuickInsert={text => {
              const line = String(text || '').trim()
              if (!line) return
              setInput(prev => (prev.trim() ? `${prev.trim()}\n${line}\n` : `${line}\n`))
            }}
            onQuickSubmit={text => {
              void sendText(text)
            }}
            onApplyDraftDirect={applyDraft}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:min-h-0 gba:w-full" data-testid={testId}>
      <CreateChatPanel
        title="AI Assistant"
        subtitle={isGenerating ? 'Thinking...' : 'Ready to help'}
        onClose={onClose}
        headerRightSlot={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={reset}
            className="gba:text-xs gba:text-muted-foreground"
            data-testid={`${testId}-reset`}
          >
            Reset
          </Button>
        }
        inputValue={input}
        inputOnChange={setInput}
        inputOnSend={send}
        inputDisabled={Boolean(clarifyWizard) || !canSend}
        inputIsProcessing={isGenerating}
        inputPlaceholder="Describe your function or ask for changes..."
        inputSendIcon="sparkles"
        data-testid={`${testId}-panel`}
      >
        {chatContent}
      </CreateChatPanel>
    </div>
  )
}

export default FunctionAssistantSidebar
