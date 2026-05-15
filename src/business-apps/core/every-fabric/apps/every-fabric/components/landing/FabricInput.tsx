import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Textarea } from '@newwork/nw-design-system'
import { ArrowUpIcon, PlusIcon, PlugsIcon, SpinnerGapIcon, StopIcon, XIcon } from '@phosphor-icons/react'
import type {
  PendingComposerAttachment,
  SessionAttachment,
  SessionConfig,
  SpecialistAgent
} from '../../types/enterpriseAgent'
import type { ExternalConnection } from '../../hooks/useFabricConnectors'
import { ActiveConnectorChips } from '../connectors/ActiveConnectorChips'
import { AttachmentChipList } from '../chat/AttachmentChipList'
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
  /** Connectors integration */
  onConnectorsClick?: () => void
  activeConnectors?: ExternalConnection[]
  onRemoveConnector?: (connectionId: string) => void
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

function buildSessionConfig(selectedAgent?: SpecialistAgent): SessionConfig {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_CONFIG, selectedAgent }
    const parsed = JSON.parse(raw)
    return {
      ...DEFAULT_CONFIG,
      enable_memory: parsed.enableMemory ?? DEFAULT_CONFIG.enable_memory,
      enable_reflection:
        parsed.enableReflection === 'always' ? true : parsed.enableReflection === 'disabled' ? false : undefined,
      ...(parsed.maxIterations ? { max_iterations: parsed.maxIterations } : {}),
      selectedAgent
    }
  } catch {
    return { ...DEFAULT_CONFIG, selectedAgent }
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
  handleAddClick: () => void
  uploadEnabled: boolean
  onConnectorsClick?: () => void
  activeConnectors: ExternalConnection[]
  onRemoveConnector?: (connectionId: string) => void
  attachmentChips: React.ReactNode
  attachmentHintText: string
  sendDisabled: boolean
  onSendClick: () => void
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
  handleAddClick,
  uploadEnabled,
  onConnectorsClick,
  activeConnectors,
  onRemoveConnector,
  attachmentChips,
  attachmentHintText,
  sendDisabled,
  onSendClick
}: LandingInputLayoutProps) => (
  <div className="gba:w-full" data-testid="fabric-input-landing">
    <HiddenFileInput fileInputRef={fileInputRef} handleFileChange={handleFileChange} />
    <div className="gba:rounded-4xl gba:border gba:border-foreground/15 gba:bg-card/98 gba:overflow-hidden gba:shadow-[0_12px_32px_rgba(15,23,42,0.05)] gba:transition-shadow gba:focus-within:border-foreground/20 gba:focus-within:ring-1 gba:focus-within:ring-foreground/5">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={event => onValueChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={resolvedPlaceholder}
        disabled={isSubmitting}
        rows={3}
        autoFocus={autoFocus}
        className="gba:min-h-[118px] gba:resize-none gba:border-0 gba:focus-visible:ring-0 gba:rounded-none gba:bg-transparent gba:px-5 gba:pt-5 gba:pb-2 gba:pr-36 gba:text-[1.05rem] gba:leading-8 gba:placeholder:text-muted-foreground/62"
        data-testid="fabric-input-textarea"
      />

      {activeConnectors.length > 0 && onRemoveConnector && (
        <ActiveConnectorChips connectors={activeConnectors} onRemove={onRemoveConnector} />
      )}

      <AttachmentChipSection>{attachmentChips}</AttachmentChipSection>

      <div className="gba:flex gba:items-center gba:gap-2 gba:px-4 gba:py-3">
        <button
          type="button"
          onClick={handleAddClick}
          className="gba:flex gba:items-center gba:justify-center gba:h-9 gba:w-9 gba:rounded-full gba:shrink-0 gba:border gba:border-foreground/15 gba:bg-background gba:text-foreground/70 gba:hover:text-foreground gba:hover:bg-muted/40 gba:transition-colors"
          title={uploadEnabled ? 'Attach file (PDF, DOCX, TXT, PNG, JPG, ...)' : 'Add'}
          data-testid="fabric-input-add"
        >
          <PlusIcon className="gba:h-4 gba:w-4" weight="bold" />
        </button>

        {onConnectorsClick && (
          <button
            type="button"
            onClick={onConnectorsClick}
            className="gba:flex gba:items-center gba:justify-center gba:h-9 gba:w-9 gba:rounded-full gba:shrink-0 gba:border gba:border-foreground/15 gba:bg-background gba:text-foreground/70 gba:hover:text-foreground gba:hover:bg-muted/40 gba:transition-colors"
            title="Connectors"
            data-testid="fabric-input-connectors"
          >
            <PlugsIcon className="gba:h-4 gba:w-4" weight="bold" />
          </button>
        )}

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
  handleAddClick,
  uploadEnabled,
  onConnectorsClick,
  activeConnectors,
  onRemoveConnector,
  selectedAgent,
  onClearAgent,
  attachmentChips,
  attachmentHintText,
  sendDisabled,
  onSendClick,
  isRunning,
  isReplyMode,
  onStop
}: WorkspaceInputLayoutProps) => (
  <div className="gba:w-full" data-testid="fabric-input-workspace">
    <HiddenFileInput fileInputRef={fileInputRef} handleFileChange={handleFileChange} />
    <div className="gba:rounded-[1.75rem] gba:border gba:border-foreground/15 gba:bg-card/95 gba:backdrop-blur-md gba:overflow-hidden gba:shadow-[0_6px_18px_rgba(15,23,42,0.035)] gba:transition-all gba:focus-within:border-foreground/20 gba:focus-within:ring-1 gba:focus-within:ring-foreground/5">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={event => onValueChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={resolvedPlaceholder}
        disabled={isSubmitting || (isRunning && !isReplyMode)}
        rows={2}
        className="gba:min-h-[88px] gba:resize-none gba:border-0 gba:focus-visible:ring-0 gba:rounded-none gba:bg-transparent gba:px-5 gba:pt-4 gba:pb-2 gba:text-[15px] gba:leading-7 gba:placeholder:text-muted-foreground/62"
        data-testid="fabric-input-textarea"
      />

      {activeConnectors.length > 0 && onRemoveConnector && (
        <ActiveConnectorChips connectors={activeConnectors} onRemove={onRemoveConnector} />
      )}

      <AttachmentChipSection>{attachmentChips}</AttachmentChipSection>

      <div className="gba:flex gba:items-center gba:gap-2 gba:px-4 gba:py-2.5">
        <button
          type="button"
          onClick={handleAddClick}
          className="gba:flex gba:items-center gba:justify-center gba:h-8 gba:w-8 gba:rounded-full gba:shrink-0 gba:border gba:border-foreground/15 gba:bg-background gba:text-foreground/70 gba:hover:text-foreground gba:hover:bg-muted/40 gba:transition-colors"
          title={uploadEnabled ? 'Attach file (PDF, DOCX, TXT, PNG, JPG, ...)' : 'Add'}
          data-testid="fabric-input-add"
        >
          <PlusIcon className="gba:h-3.5 gba:w-3.5" weight="bold" />
        </button>

        {onConnectorsClick && (
          <button
            type="button"
            onClick={onConnectorsClick}
            className="gba:flex gba:items-center gba:justify-center gba:h-8 gba:w-8 gba:rounded-full gba:shrink-0 gba:border gba:border-foreground/15 gba:bg-background gba:text-foreground/70 gba:hover:text-foreground gba:hover:bg-muted/40 gba:transition-colors"
            title="Connectors"
            data-testid="fabric-input-connectors"
          >
            <PlugsIcon className="gba:h-3.5 gba:w-3.5" weight="bold" />
          </button>
        )}

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
  onConnectorsClick,
  activeConnectors = [],
  onRemoveConnector,
  onUploadAttachment,
  onRemoveAttachment,
  onRemovePendingAttachment,
  attachments = [],
  pendingAttachments = []
}) => {
  const [value, setValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadEnabled = !!onUploadAttachment

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
    const trimmed = value.trim()
    if (!trimmed || isDisabled || isSubmitting) return

    setIsSubmitting(true)
    try {
      if (isReplyMode && onReply) {
        await Promise.resolve(onReply(trimmed))
      } else {
        const task = buildTaskText(trimmed, selectedAgent)
        await Promise.resolve(onSubmit(task, buildSessionConfig(selectedAgent)))
      }
      setValue('')
    } finally {
      setIsSubmitting(false)
    }
  }, [value, isDisabled, isSubmitting, isReplyMode, onReply, onSubmit, selectedAgent])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return
      e.preventDefault()
      handleSubmit().catch(() => undefined)
    },
    [handleSubmit]
  )

  const handleAddClick = useCallback(() => {
    if (fileInputRef.current) {
      // Clear the current value so picking the same file twice still triggers change.
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
  const hasUploadingAttachments = isLanding
    ? pendingAttachments.some(entry => entry.state === 'uploading')
    : pendingAttachments.some(entry => entry.state === 'uploading' || entry.state === 'pending')
  const hasIndexingAttachments = attachments.some(att => att.indexing_status === 'pending')
  const isAttachmentBusy = hasUploadingAttachments || hasIndexingAttachments
  const canSend = !!value.trim() && !isDisabled && !isSubmitting && !(isRunning && !isReplyMode) && !isAttachmentBusy

  const attachmentBusyHint = getAttachmentBusyHint(hasUploadingAttachments, hasIndexingAttachments)
  const attachmentHintText = attachmentBusyHint ?? 'Enter to send, Shift+Enter for newline'
  const landingHintText = isSubmitting ? 'Starting session...' : attachmentHintText
  const attachmentChips =
    attachments.length > 0 || pendingAttachments.length > 0 ? (
      <AttachmentChipList
        attachments={attachments}
        pendingAttachments={pendingAttachments}
        compact={!isLanding}
        onRemoveAttachment={onRemoveAttachment ? id => runPromiseSilently(handleRemoveAttachment(id)) : undefined}
        onRemovePending={handleRemovePending}
        testIdPrefix="fabric-input-attachment"
      />
    ) : null
  const handleSendClick = () => runPromiseSilently(handleSubmit())

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
        handleAddClick={handleAddClick}
        uploadEnabled={uploadEnabled}
        onConnectorsClick={onConnectorsClick}
        activeConnectors={activeConnectors}
        onRemoveConnector={onRemoveConnector}
        attachmentChips={attachmentChips}
        attachmentHintText={landingHintText}
        sendDisabled={!canSend}
        onSendClick={handleSendClick}
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
      handleAddClick={handleAddClick}
      uploadEnabled={uploadEnabled}
      onConnectorsClick={onConnectorsClick}
      activeConnectors={activeConnectors}
      onRemoveConnector={onRemoveConnector}
      selectedAgent={selectedAgent}
      onClearAgent={onClearAgent}
      attachmentChips={attachmentChips}
      attachmentHintText={attachmentHintText}
      sendDisabled={!canSend}
      onSendClick={handleSendClick}
      isRunning={isRunning}
      isReplyMode={isReplyMode}
      onStop={onStop}
    />
  )
}
