import {
  ArrowSquareOutIcon,
  DownloadSimpleIcon,
  FileIcon,
  FileCsvIcon,
  FileDocIcon,
  FileHtmlIcon,
  FileImageIcon,
  FileJpgIcon,
  FileMdIcon,
  FilePdfIcon,
  FilePngIcon,
  FileTxtIcon,
  SpinnerGapIcon,
  WarningCircleIcon,
  XIcon
} from '@phosphor-icons/react'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, useTranslation } from '@newwork/nw-design-system'
import { useEffect, useMemo, useState } from 'react'
import type {
  MessageAttachmentRef,
  PendingComposerAttachment,
  SessionAttachment,
  SessionAttachmentStatus
} from '../../types/enterpriseAgent'
import { PROMPT_MANAGER_API_URL } from '@/common/utils/serviceResolver'
import { useEnterpriseAgentClient } from '../../hooks/useEnterpriseAgentClient'
import translations from '../../_i18n'

/**
 * Visual states a chip can be in, derived from either a live session
 * attachment, an in-flight upload, or a message-time snapshot.
 *
 * `pending` covers both bytes-in-flight and "indexing on the server" — the
 * chip looks the same to the user (spinner + icon overlay), so we collapse
 * the two into a single visual state at this layer.
 */
type TranslateFn = (key: string, args?: Record<string, string>) => string

type ChipState = 'pending' | 'ready' | 'failed'

interface ChipDescriptor {
  key: string
  id: string
  name: string
  mimeType?: string
  size: number
  state: ChipState
  tooltip: string
  removable: boolean
  previewUrl?: string
}

interface FileTypePresentation {
  label: string
  Icon: PhosphorIcon
}

interface ImagePreviewSelection {
  id: string
  name: string
  src: string
}

export interface AttachmentChipListProps {
  /** Server-confirmed attachments — rendered with their `indexing_status`. */
  attachments?: SessionAttachment[]
  /** Local-only upload rows (composer use). */
  pendingAttachments?: PendingComposerAttachment[]
  /** Message-time snapshot rows (chat bubble use). */
  messageAttachments?: MessageAttachmentRef[]
  /** Compact == workspace variant, looser == landing & user bubble. */
  compact?: boolean
  /** When false, hides the X / remove affordance entirely (chat bubble). */
  readOnly?: boolean
  onRemoveAttachment?: (id: string) => void
  onRemovePending?: (clientId: string) => void
  /** Optional testid prefix so multiple instances on the page don't collide. */
  testIdPrefix?: string
  /**
   * 'chip' (default): render all attachments as inline chips.
   * 'block': render image attachments as larger standalone preview blocks;
   *   non-image attachments still render as chips.
   */
  imageVariant?: 'chip' | 'block'
  /** Session ID required for authenticated image loading when imageVariant='block'. */
  sessionId?: string
  /** Bearer token required for authenticated image loading when imageVariant='block'. */
  accessToken?: string
}

const formatFileSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  const decimals = value >= 100 || unitIndex === 0 ? 0 : 1
  return `${value.toFixed(decimals)} ${units[unitIndex]}`
}

const statusToChipState = (status?: SessionAttachmentStatus): ChipState => {
  if (status === 'ready') return 'ready'
  if (status === 'failed') return 'failed'
  return 'pending'
}

const extensionFromName = (name: string): string => {
  const match = /\.([a-z0-9]+)$/.exec(name.toLowerCase())
  return match?.[1] ?? ''
}

const getAttachmentTooltip = (t: TranslateFn, name: string, state: ChipState, readyPrefix?: string): string => {
  if (state === 'ready') {
    return readyPrefix ? `${readyPrefix}: ${name}` : name
  }

  if (state === 'failed') {
    return t('chat-attachment-index-failed', { name })
  }

  return t('chat-attachment-indexing', { name })
}

const getPendingChipState = (attachment: PendingComposerAttachment): ChipState => {
  if (attachment.state === 'failed') return 'failed'
  if (attachment.state === 'pending' && !attachment.attachment) return 'ready'
  return 'pending'
}

const getPendingTooltip = (t: TranslateFn, attachment: PendingComposerAttachment, state: ChipState): string => {
  if (state === 'failed') {
    return attachment.error || t('chat-attachment-upload-failed', { name: attachment.name })
  }

  if (state === 'ready') {
    return t('chat-attachment-ready-pending', { name: attachment.name })
  }

  if (attachment.state === 'uploading') {
    return t('chat-attachment-uploading', { name: attachment.name })
  }

  return t('chat-attachment-indexing-pending', { name: attachment.name })
}

const addMessageAttachmentChips = (
  t: TranslateFn,
  messageAttachments: MessageAttachmentRef[] | undefined,
  pushUnique: (chip: ChipDescriptor) => void
): void => {
  if (!messageAttachments) return

  for (const ref of messageAttachments) {
    const state = statusToChipState(ref.indexing_status)
    pushUnique({
      key: `msg-${ref.id}`,
      id: ref.id,
      name: ref.name,
      mimeType: ref.mime_type,
      size: ref.size,
      state,
      tooltip: getAttachmentTooltip(t, ref.name, state),
      removable: false,
      previewUrl: ref.preview_url
    })
  }
}

const addSessionAttachmentChips = (
  t: TranslateFn,
  attachments: SessionAttachment[] | undefined,
  readOnly: boolean | undefined,
  pushUnique: (chip: ChipDescriptor) => void
): void => {
  if (!attachments) return

  for (const attachment of attachments) {
    const state = statusToChipState(attachment.indexing_status)
    pushUnique({
      key: `att-${attachment.id}`,
      id: attachment.id,
      name: attachment.name,
      mimeType: attachment.mime_type,
      size: attachment.size,
      state,
      tooltip: getAttachmentTooltip(t, attachment.name, state, t('chat-attachment-ready-prefix')),
      removable: !readOnly,
      previewUrl: attachment.preview_url
    })
  }
}

const addPendingAttachmentChips = (
  t: TranslateFn,
  pendingAttachments: PendingComposerAttachment[] | undefined,
  readOnly: boolean | undefined,
  seenIds: Set<string>,
  pushUnique: (chip: ChipDescriptor) => void
): void => {
  if (!pendingAttachments) return

  for (const entry of pendingAttachments) {
    if (entry.attachment && seenIds.has(entry.attachment.id)) continue

    const state = getPendingChipState(entry)
    pushUnique({
      key: `pending-${entry.client_id}`,
      id: entry.client_id,
      name: entry.name,
      mimeType: entry.mime_type,
      size: entry.size,
      state,
      tooltip: getPendingTooltip(t, entry, state),
      removable: !readOnly,
      previewUrl: entry.preview_url
    })
  }
}

const resolveFileTypePresentation = (name: string, mimeType?: string): FileTypePresentation => {
  const ext = extensionFromName(name)
  const normalizedMime = (mimeType ?? '').toLowerCase()

  if (ext === 'pdf' || normalizedMime === 'application/pdf') {
    return { label: 'PDF', Icon: FilePdfIcon }
  }
  if (ext === 'md' || normalizedMime === 'text/markdown') {
    return { label: 'MD', Icon: FileMdIcon }
  }
  if (
    ext === 'doc' ||
    ext === 'docx' ||
    normalizedMime === 'application/msword' ||
    normalizedMime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return { label: 'DOC', Icon: FileDocIcon }
  }
  if (ext === 'odt' || normalizedMime === 'application/vnd.oasis.opendocument.text') {
    return { label: 'ODT', Icon: FileDocIcon }
  }
  if (ext === 'txt' || normalizedMime === 'text/plain') {
    return { label: 'TXT', Icon: FileTxtIcon }
  }
  if (ext === 'csv' || normalizedMime === 'text/csv') {
    return { label: 'CSV', Icon: FileCsvIcon }
  }
  if (ext === 'json' || normalizedMime === 'application/json') {
    return { label: 'JSON', Icon: FileIcon }
  }
  if (ext === 'xml' || normalizedMime === 'application/xml' || normalizedMime === 'text/xml') {
    return { label: 'XML', Icon: FileIcon }
  }
  if (ext === 'html' || normalizedMime === 'text/html') {
    return { label: 'HTML', Icon: FileHtmlIcon }
  }
  if (ext === 'png' || normalizedMime === 'image/png') {
    return { label: 'PNG', Icon: FilePngIcon }
  }
  if (ext === 'jpg' || ext === 'jpeg' || normalizedMime === 'image/jpeg') {
    return { label: 'JPG', Icon: FileJpgIcon }
  }
  if (ext === 'gif' || ext === 'webp' || normalizedMime === 'image/gif' || normalizedMime === 'image/webp') {
    return { label: 'IMG', Icon: FileImageIcon }
  }
  return { label: 'FILE', Icon: FileIcon }
}

const isImageMime = (mimeType?: string): boolean => (mimeType ?? '').toLowerCase().startsWith('image/')

const resolvePromptManagerBase = (): string =>
  PROMPT_MANAGER_API_URL.endsWith('/') ? PROMPT_MANAGER_API_URL.slice(0, -1) : PROMPT_MANAGER_API_URL

/**
 * Allow-list preview URLs for <img src>. Rejects javascript:, data:, unknown hosts, etc.
 * (Static analysis / security review: do not bind unsanitized strings to src.)
 */
const sanitizeImagePreviewSrc = (raw: string | undefined): string | undefined => {
  if (!raw) return undefined
  const trimmed = raw.trim()
  if (!trimmed) return undefined

  if (trimmed.startsWith('blob:')) {
    return /^blob:https?:\/\//i.test(trimmed) ? trimmed : undefined
  }

  const allowedOrigins = new Set<string>()
  try {
    allowedOrigins.add(new URL(PROMPT_MANAGER_API_URL).origin)
  } catch {
    // ignore invalid service URL config
  }
  if (typeof globalThis !== 'undefined' && 'location' in globalThis) {
    const loc = (globalThis as { location?: { origin?: string } }).location
    if (loc?.origin) allowedOrigins.add(loc.origin)
  }

  let parsed: URL
  try {
    parsed =
      trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? new URL(trimmed)
        : new URL(trimmed, `${resolvePromptManagerBase()}/`)
  } catch {
    return undefined
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return undefined
  if (!allowedOrigins.has(parsed.origin)) return undefined
  return parsed.href
}

const resolveViewportSize = (): { width: number; height: number } | null => {
  const browserWindow = globalThis.window
  if (!browserWindow) return null

  return {
    width: browserWindow.innerWidth,
    height: browserWindow.innerHeight
  }
}

const ImagePreviewDialog: React.FC<{
  preview: ImagePreviewSelection | null
  onClose: () => void
}> = ({ preview, onClose }) => {
  const { t } = useTranslation(translations)
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null)

  useEffect(() => {
    setImageDimensions(null)
  }, [preview?.id, preview?.src])

  if (!preview) return null

  const getDialogStyle = () => {
    const viewport = resolveViewportSize()
    if (!viewport || !imageDimensions) {
      return {
        maxWidth: 'calc(100vw - 32px)',
        width: 'calc(100vw - 32px)',
        height: 'calc(100vh - 32px)',
        maxHeight: 'calc(100vh - 32px)'
      }
    }

    const maxWidth = viewport.width - 64
    const maxHeight = viewport.height - 64
    const headerFooterHeight = 112
    const availableHeight = maxHeight - headerFooterHeight
    const scaleX = maxWidth / imageDimensions.width
    const scaleY = availableHeight / imageDimensions.height
    const scale = Math.min(scaleX, scaleY, 1)
    const dialogWidth = Math.max(400, imageDimensions.width * scale + 32)

    return {
      maxWidth: `${Math.min(dialogWidth, maxWidth)}px`,
      width: 'auto',
      height: 'auto',
      maxHeight: `${maxHeight}px`
    }
  }

  const dialogStyle = getDialogStyle()

  return (
    <Dialog open={!!preview} onOpenChange={open => !open && onClose()}>
      <DialogContent
        className="gba:p-0! gba:flex gba:flex-col gba:overflow-hidden"
        style={{
          maxWidth: dialogStyle.maxWidth,
          width: dialogStyle.width,
          height: dialogStyle.height,
          maxHeight: dialogStyle.maxHeight
        }}
        data-testid="attachment-image-preview-dialog"
      >
        <DialogHeader className="gba:border-b gba:border-border gba:px-4 gba:py-3 gba:pr-12">
          <DialogTitle className="gba:min-w-0 gba:flex-1 gba:truncate gba:text-sm gba:font-medium">
            {preview.name}
          </DialogTitle>
        </DialogHeader>

        <div className="gba:flex gba:min-h-0 gba:flex-1 gba:items-center gba:justify-center gba:bg-muted/30">
          <img
            src={preview.src}
            alt={preview.name}
            className="gba:max-h-full gba:max-w-full gba:object-contain"
            onLoad={event => {
              const image = event.currentTarget
              setImageDimensions({ width: image.naturalWidth, height: image.naturalHeight })
            }}
            data-testid="attachment-image-preview-image"
          />
        </div>

        <div className="gba:flex gba:shrink-0 gba:items-center gba:justify-end gba:gap-2 gba:border-t gba:border-border gba:bg-background gba:px-4 gba:py-3">
          <Button variant="outline" size="sm" asChild>
            <a href={preview.src} target="_blank" rel="noopener noreferrer" data-testid="attachment-image-preview-open">
              <ArrowSquareOutIcon className="gba:mr-1.5 gba:h-3.5 gba:w-3.5" weight="bold" />
              {t('chat-attachment-preview-open')}
            </a>
          </Button>
          <Button variant="default" size="sm" asChild>
            <a href={preview.src} download={preview.name} data-testid="attachment-image-preview-download">
              <DownloadSimpleIcon className="gba:mr-1.5 gba:h-3.5 gba:w-3.5" weight="bold" />
              {t('chat-attachment-preview-download')}
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Renders a single image attachment as a larger standalone block (imageVariant='block'). */
const ImageBlock: React.FC<{
  chip: ChipDescriptor
  sessionId?: string
  accessToken?: string
  testIdPrefix: string
  onRemove?: (chip: ChipDescriptor) => void
  onPreviewOpen?: (preview: ImagePreviewSelection) => void
}> = ({ chip, sessionId, accessToken, testIdPrefix, onRemove, onPreviewOpen }) => {
  const { t } = useTranslation(translations)
  const { fetchAttachmentContent } = useEnterpriseAgentClient(accessToken ?? '')
  const [resolvedUrl, setResolvedUrl] = useState<string | undefined>(() => sanitizeImagePreviewSrc(chip.previewUrl))

  useEffect(() => {
    const safePreview = sanitizeImagePreviewSrc(chip.previewUrl)
    if (safePreview) {
      setResolvedUrl(safePreview)
      return
    }
    // No preview URL — try to fetch from the authenticated proxy.
    // Only works for persisted attachments (UUID-shaped IDs, not pending client_ids).
    if (!sessionId || !accessToken || !chip.id) return
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidPattern.test(chip.id)) return

    let revoked = false
    let createdBlobUrl: string | null = null

    fetchAttachmentContent(sessionId, chip.id)
      .then(blob => {
        if (revoked) return
        createdBlobUrl = URL.createObjectURL(blob)
        const safeBlob = sanitizeImagePreviewSrc(createdBlobUrl)
        if (!safeBlob) {
          URL.revokeObjectURL(createdBlobUrl)
          createdBlobUrl = null
          return
        }
        setResolvedUrl(safeBlob)
      })
      .catch(() => {})

    return () => {
      revoked = true
      if (createdBlobUrl) URL.revokeObjectURL(createdBlobUrl)
    }
  }, [chip.previewUrl, chip.id, sessionId, accessToken, fetchAttachmentContent])

  const displaySrc = sanitizeImagePreviewSrc(resolvedUrl)
  const canPreview = !!displaySrc
  const previewLabel = canPreview ? t('chat-attachment-preview-aria', { name: chip.name }) : undefined
  const previewBody = (
    <>
      {displaySrc ? (
        <img
          src={displaySrc}
          alt={chip.name}
          className="gba:block gba:h-auto gba:max-h-[200px] gba:max-w-[240px] gba:w-auto gba:rounded-xl gba:object-contain"
        />
      ) : (
        <div className="gba:flex gba:h-[60px] gba:w-[80px] gba:items-center gba:justify-center gba:rounded-xl gba:bg-muted/40">
          <SpinnerGapIcon
            className="gba:h-4 gba:w-4 gba:animate-spin gba:text-muted-foreground"
            weight="bold"
            aria-hidden="true"
          />
        </div>
      )}
      {chip.state === 'pending' && (
        <div className="gba:absolute gba:inset-0 gba:flex gba:items-center gba:justify-center gba:rounded-xl gba:bg-black/25">
          <SpinnerGapIcon
            className="gba:h-5 gba:w-5 gba:animate-spin gba:text-white"
            weight="bold"
            aria-hidden="true"
          />
        </div>
      )}
      {chip.state === 'failed' && !displaySrc && (
        <div className="gba:absolute gba:inset-0 gba:flex gba:items-center gba:justify-center gba:rounded-xl gba:bg-muted/40">
          <WarningCircleIcon className="gba:h-5 gba:w-5 gba:text-rose-500" weight="fill" aria-hidden="true" />
        </div>
      )}
    </>
  )
  const previewContainerClass = `gba:relative gba:inline-block gba:max-w-[240px] gba:overflow-hidden gba:rounded-xl ${
    canPreview
      ? 'gba:cursor-zoom-in gba:outline-none gba:ring-offset-background focus-visible:gba:ring-2 focus-visible:gba:ring-primary/60'
      : ''
  }`

  return (
    <div
      className="gba:relative gba:inline-block gba:max-w-[240px]"
      title={chip.tooltip}
      data-testid={`${testIdPrefix}-img-block-${chip.id}`}
    >
      {canPreview ? (
        <button
          type="button"
          className={`${previewContainerClass} gba:border-0 gba:bg-transparent gba:p-0`}
          aria-label={previewLabel}
          onClick={() => onPreviewOpen?.({ id: chip.id, name: chip.name, src: displaySrc })}
        >
          {previewBody}
        </button>
      ) : (
        <div className={previewContainerClass}>{previewBody}</div>
      )}
      {chip.removable && onRemove && (
        <button
          type="button"
          className="gba:absolute gba:top-1 gba:right-1 gba:h-5 gba:w-5 gba:rounded-full gba:bg-black/50 gba:flex gba:items-center gba:justify-center gba:text-white gba:hover:bg-black/70 gba:transition-colors"
          onClick={event => {
            event.preventDefault()
            event.stopPropagation()
            onRemove(chip)
          }}
          aria-label={t('chat-attachment-remove', { name: chip.name })}
          data-testid={`${testIdPrefix}-img-remove-${chip.id}`}
        >
          <XIcon className="gba:h-3 gba:w-3" weight="bold" />
        </button>
      )}
    </div>
  )
}

const collectChips = (t: TranslateFn, props: AttachmentChipListProps): ChipDescriptor[] => {
  const { attachments, pendingAttachments, messageAttachments, readOnly } = props
  const chips: ChipDescriptor[] = []
  const seenIds = new Set<string>()

  const pushUnique = (chip: ChipDescriptor) => {
    if (seenIds.has(chip.id)) return
    seenIds.add(chip.id)
    chips.push(chip)
  }

  addMessageAttachmentChips(t, messageAttachments, pushUnique)
  addSessionAttachmentChips(t, attachments, readOnly, pushUnique)
  addPendingAttachmentChips(t, pendingAttachments, readOnly, seenIds, pushUnique)

  return chips
}

export const AttachmentChipList: React.FC<AttachmentChipListProps> = props => {
  const {
    compact = false,
    onRemoveAttachment,
    onRemovePending,
    pendingAttachments,
    attachments,
    testIdPrefix = 'attachment',
    imageVariant = 'chip',
    sessionId,
    accessToken
  } = props
  const { t } = useTranslation(translations)
  const [selectedPreview, setSelectedPreview] = useState<ImagePreviewSelection | null>(null)

  const chips = collectChips(t, props)
  const chipsWithType = useMemo(
    () =>
      chips.map(chip => ({
        ...chip,
        fileType: resolveFileTypePresentation(chip.name, chip.mimeType)
      })),
    [chips]
  )
  if (chipsWithType.length === 0) return null

  const chipBase = compact
    ? 'gba:inline-flex gba:items-center gba:gap-1.5 gba:h-7 gba:rounded-full gba:border gba:px-2 gba:text-[11px]'
    : 'gba:inline-flex gba:items-center gba:gap-2 gba:h-8 gba:rounded-full gba:border gba:px-2.5 gba:text-xs'

  const typeBadgeClass = compact
    ? 'gba:inline-flex gba:items-center gba:rounded-md gba:px-1.5 gba:py-0.5 gba:text-[9px] gba:font-semibold gba:tracking-[0.08em]'
    : 'gba:inline-flex gba:items-center gba:rounded-md gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-semibold gba:tracking-[0.08em]'

  const handleRemove = (chip: ChipDescriptor) => {
    if (!chip.removable) return
    // Live composer attachment -> server delete; staged pending -> local drop.
    const matchedAttachment = attachments?.find(a => a.id === chip.id)
    if (matchedAttachment) {
      onRemoveAttachment?.(chip.id)
      return
    }
    const matchedPending = pendingAttachments?.find(p => p.client_id === chip.id)
    if (matchedPending) {
      if (onRemovePending) {
        onRemovePending(chip.id)
        return
      }
      onRemoveAttachment?.(chip.id)
    }
  }

  // Split chips into image blocks vs file chips when imageVariant='block'.
  const imageChips = imageVariant === 'block' ? chipsWithType.filter(c => isImageMime(c.mimeType)) : []
  const fileChips = imageVariant === 'block' ? chipsWithType.filter(c => !isImageMime(c.mimeType)) : chipsWithType

  return (
    <div
      className={`gba:flex gba:flex-col gba:gap-2 ${compact ? 'gba:pt-1 gba:pb-1' : 'gba:pt-2 gba:pb-1'}`}
      data-testid={`${testIdPrefix}-list`}
    >
      {/* Larger image preview blocks (only when imageVariant='block') */}
      {imageChips.length > 0 && (
        <div className="gba:flex gba:flex-wrap gba:gap-2">
          {imageChips.map(chip => (
            <ImageBlock
              key={chip.key}
              chip={chip}
              sessionId={sessionId}
              accessToken={accessToken}
              testIdPrefix={testIdPrefix}
              onRemove={chip.removable ? handleRemove : undefined}
              onPreviewOpen={setSelectedPreview}
            />
          ))}
        </div>
      )}

      {/* Standard file chips (always; also image chips when imageVariant='chip') */}
      {fileChips.length > 0 && (
        <div className="gba:flex gba:flex-wrap gba:gap-2">
          {fileChips.map(chip => {
            const { Icon: TypeIcon, label } = chip.fileType
            const safePreviewSrc = sanitizeImagePreviewSrc(chip.previewUrl)
            const hasThumbnail = !!safePreviewSrc

            const iconContainerSize = compact ? 'gba:h-5 gba:w-5' : 'gba:h-6 gba:w-6'
            const fileIconSize = compact ? 'gba:h-3 gba:w-3' : 'gba:h-3.5 gba:w-3.5'
            const spinnerSize = compact ? 'gba:h-5 gba:w-5' : 'gba:h-6 gba:w-6'

            return (
              <span
                key={chip.key}
                className={`${chipBase} gba:border-border/20 gba:bg-muted/50 gba:text-foreground/75`}
                title={chip.tooltip}
                data-testid={`${testIdPrefix}-chip-${chip.id}`}
              >
                {/* Icon container: thumbnail image for images, file-type icon otherwise */}
                <span
                  className={`gba:relative gba:inline-flex gba:items-center gba:justify-center gba:shrink-0 gba:rounded-md gba:overflow-hidden gba:bg-muted ${iconContainerSize}`}
                >
                  {hasThumbnail ? (
                    <img
                      src={safePreviewSrc}
                      alt=""
                      className="gba:h-full gba:w-full gba:object-contain"
                      aria-hidden="true"
                    />
                  ) : (
                    <TypeIcon className={`${fileIconSize} gba:text-foreground/50`} weight="fill" aria-hidden="true" />
                  )}
                  {chip.state === 'pending' && (
                    <SpinnerGapIcon
                      className={`gba:absolute gba:animate-spin ${spinnerSize} ${hasThumbnail ? 'gba:text-white/70' : 'gba:text-foreground/35'}`}
                      weight="bold"
                      aria-hidden="true"
                    />
                  )}
                  {chip.state === 'failed' && (
                    <WarningCircleIcon
                      className="gba:absolute gba:-bottom-1 gba:-right-1 gba:h-3 gba:w-3 gba:text-rose-500"
                      weight="fill"
                      aria-hidden="true"
                    />
                  )}
                </span>

                {/* Type label badge — hide for image thumbnails to keep chips clean */}
                {!hasThumbnail && (
                  <span className={`${typeBadgeClass} gba:bg-muted gba:text-foreground/50`} aria-hidden="true">
                    {label}
                  </span>
                )}

                <span className="gba:max-w-[160px] gba:truncate">{chip.name}</span>
                {chip.size > 0 && <span className="gba:opacity-50">{formatFileSize(chip.size)}</span>}

                {chip.removable && (
                  <button
                    type="button"
                    className="gba:ml-0.5 gba:opacity-50 gba:hover:opacity-100 gba:transition-opacity"
                    onClick={event => {
                      event.preventDefault()
                      event.stopPropagation()
                      handleRemove(chip)
                    }}
                    aria-label={t('chat-attachment-remove', { name: chip.name })}
                    data-testid={`${testIdPrefix}-chip-remove-${chip.id}`}
                  >
                    <XIcon className="gba:h-3 gba:w-3" weight="bold" />
                  </button>
                )}
              </span>
            )
          })}
        </div>
      )}
      <ImagePreviewDialog preview={selectedPreview} onClose={() => setSelectedPreview(null)} />
    </div>
  )
}
