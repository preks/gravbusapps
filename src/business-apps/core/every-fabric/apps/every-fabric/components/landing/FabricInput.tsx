import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Textarea } from '@newwork/nw-design-system'
import { ArrowUpIcon, PlugsIcon, SpinnerGapIcon, StopIcon, XIcon } from '@phosphor-icons/react'
import type {
  ModelOption,
  PendingComposerAttachment,
  ReasoningEffort,
  SessionAttachment,
  SessionConfig,
  SpecialistAgent
} from '../../types/enterpriseAgent'
import type { ExternalConnection } from '../../hooks/useFabricConnectors'
import { AttachmentChipList } from '../chat/AttachmentChipList'
import { ModelSelector } from './ModelSelector'
import { ComposerActionMenu } from './ComposerActionMenu'
import { SETTINGS_KEY } from '../settings/agentSettings.types'

export interface FabricInputProps {
  /** 'landing' = full centered card; 'workspace' = compact bottom bar */
  variant?: 'landing' | 'workspace'
  placeholder?: string
  /** When changed, updates the textarea value (chip selection prefill) */
  prefillValue?: string
  onSubmit: (task: string, config: SessionConfig) => void | Promise<unknown>
  onStop?: () => void
  onReply?: (message?: string, structuredInput?: Record<string, any>) => void | Promise<unknown>
  /** When set, input acts as a reply box instead of a new session */
  activeInterrupt?: string
  isRunning?: boolean
  isDisabled?: boolean
  selectedAgent?: SpecialistAgent
  onClearAgent?: () => void
  autoFocus?: boolean
  /** Connectors integration — drives the plus-menu connector submenu and the condensed summary */
  availableConnectors?: ExternalConnection[]
  activeConnectorIds?: Set<string>
  onToggleConnector?: (connectionId: string) => void
  isLoadingConnectors?: boolean
  /**
   * Session attachments (RAG over uploaded files).
   *
   * `pendingAttachments` covers staged/uploading/failed rows owned by the
   * provider hook; `attachments` covers server-confirmed rows. When
   * `onUploadAttachment` is provided, the "+" button opens the native file
   * picker. Even when no session exists yet (landing variant), the upload
   * handler stages files locally and the provider flushes them once a
   * session id materialises.
   */
  onUploadAttachment?: (file: File) => Promise<SessionAttachment | null>
  onRemoveAttachment?: (attachmentId: string) => void | Promise<void>
  onRemovePendingAttachment?: (clientId: string) => void
  attachments?: SessionAttachment[]
  pendingAttachments?: PendingComposerAttachment[]
  /** Model selector — pass the loaded options and handler from the provider */
  modelSelectorModels?: ModelOption[]
  selectedModelId?: string
  selectedEffort?: ReasoningEffort
  onModelChange?: (modelId: string, effort: ReasoningEffort) => void
  isLoadingModels?: boolean
  /** When false, hides the model selector (developer mode off). */
  devModeEnabled?: boolean
}

const ACCEPTED_UPLOAD_TYPES =
  '.pdf,.doc,.docx,.odt,.txt,.md,.csv,.json,.xml,.html,.png,.jpg,.jpeg,.webp,.gif,' +
  'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,' +
  'application/vnd.oasis.opendocument.text,text/plain,text/markdown,text/csv,application/json,application/xml,text/html,' +
  'image/png,image/jpeg,image/webp,image/gif'

const DEFAULT_CONFIG: SessionConfig = {
  mode: 'deep',
  enable_memory: true,
  enable_reflection: undefined
}

function buildSessionConfig(
  selectedAgent?: SpecialistAgent,
  modelId?: string,
  reasoningEffort?: ReasoningEffort
): SessionConfig {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return {
      mode: 'deep',
      enable_memory: parsed.enableMemory ?? DEFAULT_CONFIG.enable_memory,
      enable_reflection:
        parsed.enableReflection === 'always' ? true : parsed.enableReflection === 'disabled' ? false : undefined,
      ...(parsed.maxIterations ? { max_iterations: parsed.maxIterations } : {}),
      selectedAgent,
      ...(modelId ? { model: modelId } : {}),
      ...(reasoningEffort && reasoningEffort !== 'none' ? { reasoning_effort: reasoningEffort } : {})
    }
  } catch {
    return {
      ...DEFAULT_CONFIG,
      selectedAgent,
      ...(modelId ? { model: modelId } : {}),
      ...(reasoningEffort && reasoningEffort !== 'none' ? { reasoning_effort: reasoningEffort } : {})
    }
  }
}

function resolveFabricInputPlaceholder(
  placeholder: string | undefined,
  isReplyMode: boolean,
  activeInterrupt: string | undefined,
  isRunning: boolean,
  isLanding: boolean
): string {
  if (placeholder !== undefined) return placeholder
  if (isReplyMode) {
    const tail = (activeInterrupt?.length ?? 0) > 60 ? '…' : ''
    return `Your answer to: "${activeInterrupt?.slice(0, 60)}${tail}"`
  }
  if (isRunning) return 'Agent is working…'
  if (isLanding) return 'Describe a task, research topic, or ask anything…'
  return 'Reply or give feedback…'
}

const buildTaskText = (trimmed: string, selectedAgent?: SpecialistAgent): string => {
  if (!selectedAgent) return trimmed
  return `[Working with: ${selectedAgent.display_name} — ${selectedAgent.description}]\n\n${trimmed}`
}

const getAttachmentBusyHint = (hasUploadingAttachments: boolean, hasIndexingAttachments: boolean): string | null => {
  if (hasUploadingAttachments) return 'Uploading attachment…'
  if (hasIndexingAttachments) return 'Indexing attachment, almost ready…'
  return null
}

function deriveAttachmentState(
  isLanding: boolean,
  pendingAttachments: PendingComposerAttachment[],
  attachments: SessionAttachment[]
) {
  const hasUploadingAttachments = isLanding
    ? pendingAttachments.some(entry => entry.state === 'uploading')
    : pendingAttachments.some(entry => entry.state === 'uploading' || entry.state === 'pending')
  const hasIndexingAttachments = attachments.some(att => att.indexing_status === 'pending')
  const isAttachmentBusy = hasUploadingAttachments || hasIndexingAttachments

  return {
    hasUploadingAttachments,
    hasIndexingAttachments,
    isAttachmentBusy,
    attachmentHintText:
      getAttachmentBusyHint(hasUploadingAttachments, hasIndexingAttachments) ?? 'Enter to send, Shift+Enter for newline'
  }
}

function resolveCanSend(params: {
  value: string
  isDisabled: boolean
  isSubmitting: boolean
  isRunning: boolean
  isReplyMode: boolean
  isAttachmentBusy: boolean
}): boolean {
  const { value, isDisabled, isSubmitting, isRunning, isReplyMode, isAttachmentBusy } = params
  if (!value.trim()) return false
  if (isDisabled || isSubmitting || isAttachmentBusy) return false
  if (isRunning && !isReplyMode) return false
  return true
}

async function submitFabricInputValue(params: {
  value: string
  isReplyMode: boolean
  onReply?: FabricInputProps['onReply']
  onSubmit: FabricInputProps['onSubmit']
  selectedAgent?: SpecialistAgent
  selectedModelId?: string
  selectedEffort: ReasoningEffort
}): Promise<void> {
  const { value, isReplyMode, onReply, onSubmit, selectedAgent, selectedModelId, selectedEffort } = params
  const trimmed = value.trim()
  if (!trimmed) return

  if (isReplyMode && onReply) {
    await Promise.resolve(onReply(trimmed))
    return
  }

  await Promise.resolve(
    onSubmit(buildTaskText(trimmed, selectedAgent), buildSessionConfig(selectedAgent, selectedModelId, selectedEffort))
  )
}

const runPromiseSilently = (promise: Promise<unknown>) => {
  promise.catch(() => undefined)
}

interface BaseInputLayoutProps {
  fileInputRef: React.Ref<HTMLInputElement>
  textareaRef: React.Ref<HTMLTextAreaElement>
  value: string
  onValueChange: (nextValue: string) => void
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void
  resolvedPlaceholder: string
  isSubmitting: boolean
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  attachmentChips: React.ReactNode
  attachmentHintText: string
  sendDisabled: boolean
  onSendClick: () => void
  /** Pre-built composer action menu (plus button + upload/connectors). */
  composerActionMenuNode: React.ReactNode
  /** Condensed connector summary shown when connectors are active. */
  connectorSummaryNode?: React.ReactNode
  /** Rendered model selector node — caller owns its state. */
  modelSelectorNode?: React.ReactNode
}

interface LandingInputLayoutProps extends BaseInputLayoutProps {
  autoFocus: boolean
}

interface WorkspaceInputLayoutProps extends BaseInputLayoutProps {
  selectedAgent?: SpecialistAgent
  onClearAgent?: () => void
  isRunning: boolean
  isReplyMode: boolean
  onStop?: () => void
}

const HiddenFileInput = ({
  fileInputRef,
  handleFileChange
}: Pick<BaseInputLayoutProps, 'fileInputRef' | 'handleFileChange'>) => (
  <input
    ref={fileInputRef}
    type="file"
    multiple
    accept={ACCEPTED_UPLOAD_TYPES}
    className="gba:hidden"
    onChange={handleFileChange}
    data-testid="fabric-input-file-upload"
  />
)

const AttachmentChipSection = ({ children }: { children: React.ReactNode }) =>
  children ? <div className="gba:px-4">{children}</div> : null

const LandingFabricInput = ({
  fileInputRef,
  textareaRef,
  value,
  onValueChange,
  onKeyDown,
  resolvedPlaceholder,
  isSubmitting,
  autoFocus,
  handleFileChange,
  attachmentChips,
  attachmentHintText,
  sendDisabled,
  onSendClick,
  composerActionMenuNode,
  connectorSummaryNode,
  modelSelectorNode
}: LandingInputLayoutProps) => (
  <div className="gba:w-full" data-testid="fabric-input-landing">
    <HiddenFileInput fileInputRef={fileInputRef} handleFileChange={handleFileChange} />
    <div className="gba:rounded-4xl gba:border gba:border-input gba:bg-white gba:overflow-hidden gba:shadow-[0_12px_32px_rgba(15,23,42,0.05)] gba:transition-shadow gba:focus-within:border-ring gba:focus-within:ring-1 gba:focus-within:ring-ring/20">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={event => onValueChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={resolvedPlaceholder}
        disabled={isSubmitting}
        rows={3}
        autoFocus={autoFocus}
        className="gba:min-h-[102px] gba:resize-none gba:border-0 gba:focus-visible:ring-0 gba:rounded-none gba:bg-white gba:px-5 gba:pt-4 gba:pb-1.5 gba:pr-36 gba:text-[1.05rem] gba:leading-8 gba:placeholder:text-muted-foreground/62"
        data-testid="fabric-input-textarea"
      />

      <AttachmentChipSection>{attachmentChips}</AttachmentChipSection>

      <div className="gba:flex gba:items-center gba:gap-2 gba:bg-white gba:px-3 gba:py-2.5">
        {composerActionMenuNode}

        {connectorSummaryNode}

        {modelSelectorNode}

        <span
          className="gba:ml-auto gba:text-[11px] gba:text-muted-foreground/50 gba:text-right gba:max-w-[min(100%,12rem)] gba:leading-snug"
          data-testid="fabric-input-hint"
        >
          {attachmentHintText}
        </span>

        <Button
          size="icon"
          className="gba:h-9 gba:w-9 gba:rounded-full gba:ml-1 gba:shrink-0"
          onClick={onSendClick}
          disabled={sendDisabled}
          data-testid="fabric-input-send"
        >
          {isSubmitting ? (
            <SpinnerGapIcon className="gba:h-3.5 gba:w-3.5 gba:animate-spin" weight="bold" />
          ) : (
            <ArrowUpIcon className="gba:h-3.5 gba:w-3.5" weight="bold" />
          )}
        </Button>
      </div>
    </div>
  </div>
)

const WorkspaceFabricInput = ({
  fileInputRef,
  textareaRef,
  value,
  onValueChange,
  onKeyDown,
  resolvedPlaceholder,
  isSubmitting,
  handleFileChange,
  selectedAgent,
  onClearAgent,
  attachmentChips,
  attachmentHintText,
  sendDisabled,
  onSendClick,
  isRunning,
  isReplyMode,
  onStop,
  composerActionMenuNode,
  connectorSummaryNode,
  modelSelectorNode
}: WorkspaceInputLayoutProps) => (
  <div className="gba:w-full" data-testid="fabric-input-workspace">
    <HiddenFileInput fileInputRef={fileInputRef} handleFileChange={handleFileChange} />
    <div className="gba:rounded-[1.75rem] gba:border gba:border-input gba:bg-white gba:overflow-hidden gba:shadow-[0_6px_18px_rgba(15,23,42,0.035)] gba:transition-all gba:focus-within:border-ring gba:focus-within:ring-1 gba:focus-within:ring-ring/20">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={event => onValueChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={resolvedPlaceholder}
        disabled={isSubmitting || (isRunning && !isReplyMode)}
        rows={2}
        className="gba:min-h-[88px] gba:resize-none gba:border-0 gba:focus-visible:ring-0 gba:rounded-none gba:bg-white gba:px-5 gba:pt-4 gba:pb-2 gba:text-[15px] gba:leading-7 gba:placeholder:text-muted-foreground/62"
        data-testid="fabric-input-textarea"
      />

      <AttachmentChipSection>{attachmentChips}</AttachmentChipSection>

      <div className="gba:flex gba:items-center gba:gap-2 gba:bg-white gba:px-3 gba:py-2.5">
        {composerActionMenuNode}

        {connectorSummaryNode}

        {selectedAgent && (
          <button
            type="button"
            onClick={onClearAgent}
            className="gba:inline-flex gba:items-center gba:gap-1 gba:h-6 gba:px-2 gba:rounded-full gba:bg-primary/10 gba:text-primary gba:text-xs gba:font-medium gba:hover:bg-primary/20 gba:transition-colors"
            data-testid="fabric-input-selected-agent"
          >
            {selectedAgent.display_name}
            <XIcon className="gba:h-3 gba:w-3" />
          </button>
        )}

        {modelSelectorNode}

        <span
          className="gba:ml-auto gba:text-[11px] gba:font-medium gba:tracking-[0.02em] gba:text-muted-foreground/55 gba:text-right gba:max-w-[min(100%,11rem)] gba:leading-snug"
          data-testid="fabric-input-hint"
        >
          {attachmentHintText}
        </span>

        {isRunning && !isReplyMode ? (
          <button
            type="button"
            onClick={onStop}
            className="gba:flex gba:items-center gba:justify-center gba:h-8 gba:w-8 gba:rounded-full gba:ml-1 gba:shrink-0 gba:bg-foreground gba:text-background gba:hover:opacity-90 gba:transition-opacity"
            data-testid="fabric-input-stop"
            aria-label="Stop"
          >
            <StopIcon className="gba:h-3.5 gba:w-3.5" weight="fill" />
          </button>
        ) : (
          <Button
            size="icon"
            className="gba:h-8 gba:w-8 gba:rounded-full gba:ml-1 gba:shrink-0"
            onClick={onSendClick}
            disabled={sendDisabled}
            data-testid="fabric-input-send"
          >
            <ArrowUpIcon className="gba:h-3.5 gba:w-3.5" weight="bold" />
          </Button>
        )}
      </div>
    </div>
  </div>
)

export const FabricInput: React.FC<FabricInputProps> = ({
  variant = 'landing',
  placeholder,
  prefillValue,
  onSubmit,
  onStop,
  onReply,
  activeInterrupt,
  isRunning = false,
  isDisabled = false,
  selectedAgent,
  onClearAgent,
  autoFocus = false,
  availableConnectors = [],
  activeConnectorIds = new Set(),
  onToggleConnector,
  isLoadingConnectors = false,
  onUploadAttachment,
  onRemoveAttachment,
  onRemovePendingAttachment,
  attachments = [],
  pendingAttachments = [],
  modelSelectorModels = [],
  selectedModelId,
  selectedEffort = 'none',
  onModelChange,
  isLoadingModels = false,
  devModeEnabled = false
}) => {
  const [value, setValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sync external prefill (chip selection) into the textarea
  useEffect(() => {
    if (prefillValue !== undefined && prefillValue !== '') {
      setValue(prefillValue)
      textareaRef.current?.focus()
    }
  }, [prefillValue])

  const isReplyMode = !!activeInterrupt
  const isLanding = variant === 'landing'

  const resolvedPlaceholder = resolveFabricInputPlaceholder(
    placeholder,
    isReplyMode,
    activeInterrupt,
    isRunning,
    isLanding
  )

  const handleSubmit = useCallback(async () => {
    if (!value.trim() || isDisabled || isSubmitting) return

    setIsSubmitting(true)
    try {
      await submitFabricInputValue({
        value,
        isReplyMode,
        onReply,
        onSubmit,
        selectedAgent,
        selectedModelId,
        selectedEffort
      })
      setValue('')
    } finally {
      setIsSubmitting(false)
    }
  }, [value, isDisabled, isSubmitting, isReplyMode, onReply, onSubmit, selectedAgent, selectedModelId, selectedEffort])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return
      e.preventDefault()
      handleSubmit().catch(() => undefined)
    },
    [handleSubmit]
  )

  const handleTriggerFileUpload = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }, [])

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || [])
      event.target.value = ''
      if (!files.length || !onUploadAttachment) return
      // The provider hook owns the staging/upload lifecycle. We fire-and-forget;
      // chip state flows back through `attachments` + `pendingAttachments`.
      await Promise.all(files.map(file => onUploadAttachment(file).catch(() => null)))
    },
    [onUploadAttachment]
  )

  const handleRemovePending = useCallback(
    (clientId: string) => {
      if (onRemovePendingAttachment) {
        onRemovePendingAttachment(clientId)
        return
      }

      if (!onRemoveAttachment) return
      runPromiseSilently(Promise.resolve(onRemoveAttachment(clientId)))
    },
    [onRemoveAttachment, onRemovePendingAttachment]
  )

  const handleRemoveAttachment = useCallback(
    async (attachmentId: string) => {
      if (!onRemoveAttachment) return
      try {
        await Promise.resolve(onRemoveAttachment(attachmentId))
      } catch {
        // Errors are surfaced via parent state; nothing else to do here.
      }
    },
    [onRemoveAttachment]
  )

  // Block sending while any attachment is mid-flight (bytes uploading or
  // server-side staging) OR still being indexed by document-service. The
  // chip itself already shows a spinner for both, but the agent would
  // answer with no doc context if it ran before indexing finished, so we
  // disable Send (and surface a contextual hint) until everything is
  // searchable.
  //
  // CRITICAL FIX: On the landing page, files are staged with state='pending'
  // BEFORE any session exists. These should NOT block sending — they're
  // waiting for the user to send the first message to create a session,
  // which triggers the flush. Only block for actively uploading files.
  const { isAttachmentBusy, attachmentHintText } = deriveAttachmentState(isLanding, pendingAttachments, attachments)
  const canSend = resolveCanSend({
    value,
    isDisabled,
    isSubmitting,
    isRunning,
    isReplyMode,
    isAttachmentBusy
  })
  const landingHintText = isSubmitting ? 'Starting session...' : attachmentHintText
  const attachmentChips =
    attachments.length > 0 || pendingAttachments.length > 0 ? (
      <AttachmentChipList
        attachments={attachments}
        pendingAttachments={pendingAttachments}
        compact={!isLanding}
        imageVariant={isLanding ? 'block' : 'chip'}
        onRemoveAttachment={onRemoveAttachment ? id => runPromiseSilently(handleRemoveAttachment(id)) : undefined}
        onRemovePending={handleRemovePending}
        testIdPrefix="fabric-input-attachment"
      />
    ) : null
  const handleSendClick = () => runPromiseSilently(handleSubmit())

  const modelSelectorNode =
    devModeEnabled && modelSelectorModels.length > 0 ? (
      <ModelSelector
        models={modelSelectorModels}
        selectedModelId={selectedModelId ?? ''}
        selectedEffort={selectedEffort}
        isLoading={isLoadingModels}
        variant={variant}
        onChange={onModelChange ?? (() => undefined)}
        disabled={isDisabled}
      />
    ) : null

  const composerActionMenuNode = (
    <ComposerActionMenu
      onTriggerFileUpload={handleTriggerFileUpload}
      availableConnectors={availableConnectors}
      activeConnectorIds={activeConnectorIds}
      onToggleConnector={onToggleConnector ?? (() => undefined)}
      isLoadingConnectors={isLoadingConnectors}
      variant={variant}
    />
  )

  const activeConnectors = availableConnectors.filter(c => activeConnectorIds.has(c.connection_id))

  const connectorSummaryNode =
    activeConnectors.length > 0 ? (
      <span
        className="gba:flex gba:items-center gba:gap-1 gba:text-[11px] gba:text-muted-foreground/60 gba:shrink-0 gba:select-none"
        data-testid="fabric-input-connector-summary"
      >
        <PlugsIcon className="gba:h-3 gba:w-3" weight="bold" />
        <span>
          {activeConnectors.length === 1 ? activeConnectors[0].name : `${activeConnectors.length} connectors`}
        </span>
      </span>
    ) : null

  if (isLanding) {
    return (
      <LandingFabricInput
        fileInputRef={fileInputRef}
        textareaRef={textareaRef}
        value={value}
        onValueChange={setValue}
        onKeyDown={handleKeyDown}
        resolvedPlaceholder={resolvedPlaceholder}
        isSubmitting={isSubmitting}
        autoFocus={autoFocus}
        handleFileChange={handleFileChange}
        attachmentChips={attachmentChips}
        attachmentHintText={landingHintText}
        sendDisabled={!canSend}
        onSendClick={handleSendClick}
        composerActionMenuNode={composerActionMenuNode}
        connectorSummaryNode={connectorSummaryNode}
        modelSelectorNode={modelSelectorNode}
      />
    )
  }

  return (
    <WorkspaceFabricInput
      fileInputRef={fileInputRef}
      textareaRef={textareaRef}
      value={value}
      onValueChange={setValue}
      onKeyDown={handleKeyDown}
      resolvedPlaceholder={resolvedPlaceholder}
      isSubmitting={isSubmitting}
      handleFileChange={handleFileChange}
      selectedAgent={selectedAgent}
      onClearAgent={onClearAgent}
      attachmentChips={attachmentChips}
      attachmentHintText={attachmentHintText}
      sendDisabled={!canSend}
      onSendClick={handleSendClick}
      isRunning={isRunning}
      isReplyMode={isReplyMode}
      onStop={onStop}
      composerActionMenuNode={composerActionMenuNode}
      connectorSummaryNode={connectorSummaryNode}
      modelSelectorNode={modelSelectorNode}
    />
  )
}
