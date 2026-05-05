import React, { useRef, useEffect } from 'react'
import { Button, Badge } from '@newwork/nw-design-system'
import { CreateChatPanel, CreateChatMessageUser, CreateChatMessageAssistant } from '@/common/components/ai-builder'
import { Database, Loader2, Check, AlertCircle } from 'lucide-react'
import { useCustomDataChat, type ChatMessage } from '../hooks/useCustomDataChat'
import type {
  CustomDataSuggestionApplyResult,
  CustomDataSuggestionRequest,
  CustomDataSuggestionStreamEvent,
  EntitySchemaProposal
} from '../types'

interface CustomDataChatPanelProps {
  onGenerate: (
    request: CustomDataSuggestionRequest,
    options: {
      onEvent: (event: CustomDataSuggestionStreamEvent) => void
      signal?: AbortSignal
    }
  ) => Promise<void>
  onCreate: (proposal: EntitySchemaProposal) => Promise<CustomDataSuggestionApplyResult>
  onSuccess: () => void
  onClose?: () => void
  'data-testid'?: string
}

export const CustomDataChatPanel: React.FC<CustomDataChatPanelProps> = ({
  onGenerate,
  onCreate,
  onSuccess,
  onClose,
  'data-testid': testId = 'custom-data-chat-panel'
}) => {
  const { messages, inputValue, setInputValue, isProcessing, pendingProposal, sendMessage, applyProposal } =
    useCustomDataChat(onGenerate, onCreate, onSuccess)

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  return (
    <CreateChatPanel
      title="Data Model AI"
      subtitle="Describe your data structure"
      onClose={onClose}
      inputValue={inputValue}
      inputOnChange={setInputValue}
      inputOnSend={sendMessage}
      inputDisabled={isProcessing}
      inputIsProcessing={isProcessing}
      inputPlaceholder="Describe the entities you need..."
      inputSendIcon="sparkles"
      data-testid={testId}
    >
      <div ref={scrollRef}>
        {messages.length === 0 && <EmptyState />}
        {messages.map(msg =>
          msg.role === 'user' ? (
            <CreateChatMessageUser key={msg.id}>{msg.content}</CreateChatMessageUser>
          ) : (
            <AssistantMessage
              key={msg.id}
              message={msg}
              pendingProposal={pendingProposal}
              onApply={applyProposal}
              isProcessing={isProcessing}
            />
          )
        )}
      </div>
    </CreateChatPanel>
  )
}

const EmptyState: React.FC = () => (
  <div className="gba:text-center gba:py-8">
    <Database className="gba:h-8 gba:w-8 gba:mx-auto gba:text-muted-foreground gba:mb-3" />
    <p className="gba:text-sm gba:font-medium gba:mb-1">AI Data Model Generator</p>
    <p className="gba:text-xs gba:text-muted-foreground gba:max-w-xs gba:mx-auto">
      Describe the namespace graph you want. The AI will stream its reasoning and return a full draft model.
    </p>
  </div>
)

const AssistantMessage: React.FC<{
  message: ChatMessage
  pendingProposal: EntitySchemaProposal | null
  onApply: () => void
  isProcessing: boolean
}> = ({ message, pendingProposal, onApply, isProcessing }) => {
  if (message.isError) {
    return (
      <div className="gba:flex gba:gap-2 gba:items-start gba:text-sm gba:text-destructive">
        <AlertCircle className="gba:h-4 gba:w-4 gba:shrink-0 gba:mt-0.5" />
        <span>{message.content}</span>
      </div>
    )
  }

  const showApplyButton = Boolean(
    message.proposal && pendingProposal && message.proposal === pendingProposal && !message.result
  )

  return (
    <div className="gba:space-y-2">
      <CreateChatMessageAssistant>
        <div className="gba:space-y-2">
          {message.progressSteps && message.progressSteps.length > 0 ? (
            <div className="gba:space-y-2">
              {message.progressSteps.map(step => (
                <div
                  key={step.id}
                  className="gba:rounded-md gba:border gba:border-border gba:bg-muted/40 gba:px-3 gba:py-2 gba:text-xs"
                >
                  <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
                    <span className="gba:font-medium">{step.title}</span>
                    <Badge variant="outline" className="gba:text-[10px] gba:px-1.5 gba:py-0">
                      {step.status}
                    </Badge>
                  </div>
                  {step.detail ? (
                    <div className="gba:mt-1 gba:text-muted-foreground gba:whitespace-pre-wrap">{step.detail}</div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
          {message.thinkingContent ? (
            <div className="gba:rounded-md gba:border gba:border-border gba:bg-muted/20 gba:px-3 gba:py-2 gba:text-xs gba:whitespace-pre-wrap">
              {message.thinkingContent}
            </div>
          ) : null}
          <div className="gba:whitespace-pre-wrap">
            {message.content || (message.isLoading ? 'Generating model...' : '')}
          </div>
        </div>
      </CreateChatMessageAssistant>
      {message.proposal && <ProposalPreview proposal={message.proposal} />}
      {showApplyButton && (
        <Button size="sm" onClick={onApply} disabled={isProcessing} className="gba:w-full">
          {isProcessing ? (
            <Loader2 className="gba:h-3.5 gba:w-3.5 gba:mr-1 gba:animate-spin" />
          ) : (
            <Check className="gba:h-3.5 gba:w-3.5 gba:mr-1" />
          )}
          Apply Model
        </Button>
      )}
    </div>
  )
}

const ProposalPreview: React.FC<{ proposal: EntitySchemaProposal }> = ({ proposal }) => (
  <div className="gba:border gba:border-border gba:rounded-md gba:p-2 gba:space-y-1.5 gba:bg-muted/30">
    {proposal.entities.map(entity => (
      <div key={entity.key} className="gba:flex gba:items-center gba:gap-1.5 gba:text-xs">
        <Database className="gba:h-3 gba:w-3 gba:text-primary" />
        <span className="gba:font-medium">{entity.displayName}</span>
        <Badge variant="outline" className="gba:text-[9px] gba:px-1 gba:py-0">
          {entity.columns.length} cols
        </Badge>
      </div>
    ))}
  </div>
)
