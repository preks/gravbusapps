import {
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
import { useMemo } from 'react'
import type {
  MessageAttachmentRef,
  PendingComposerAttachment,
  SessionAttachment,
  SessionAttachmentStatus
} from '../../types/enterpriseAgent'

/**
 * Visual states a chip can be in, derived from either a live session
 * attachment, an in-flight upload, or a message-time snapshot.
 *
 * `pending` covers both bytes-in-flight and "indexing on the server" — the
 * chip looks the same to the user (spinner + icon overlay), so we collapse
 * the two into a single visual state at this layer.
 */
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

const getAttachmentTooltip = (name: string, state: ChipState, readyPrefix?: string): string => {
  if (state === 'ready') {
    return readyPrefix ? `${readyPrefix}: ${name}` : name
  }

  if (state === 'failed') {
    return `Failed to index: ${name}`
  }

  return `Indexing: ${name}`
}

const getPendingChipState = (attachment: PendingComposerAttachment): ChipState => {
  if (attachment.state === 'failed') return 'failed'
  if (attachment.state === 'pending' && !attachment.attachment) return 'ready'
  return 'pending'
}

const getPendingTooltip = (attachment: PendingComposerAttachment, state: ChipState): string => {
  if (state === 'failed') {
    return attachment.error || `Failed to upload ${attachment.name}`
  }

  if (state === 'ready') {
    return `Ready: ${attachment.name} (will upload when you send)`
  }

  if (attachment.state === 'uploading') {
    return `Uploading ${attachment.name}...`
  }

  return `Indexing ${attachment.name}...`
}

const addMessageAttachmentChips = (
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
      tooltip: getAttachmentTooltip(ref.name, state),
      removable: false,
      previewUrl: ref.preview_url
    })
  }
}

const addSessionAttachmentChips = (
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
      tooltip: getAttachmentTooltip(attachment.name, state, 'Ready'),
      removable: !readOnly,
      previewUrl: attachment.preview_url
    })
  }
}

const addPendingAttachmentChips = (
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
      tooltip: getPendingTooltip(entry, state),
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

const collectChips = (props: AttachmentChipListProps): ChipDescriptor[] => {
  const { attachments, pendingAttachments, messageAttachments, readOnly } = props
  const chips: ChipDescriptor[] = []
  const seenIds = new Set<string>()

  const pushUnique = (chip: ChipDescriptor) => {
    if (seenIds.has(chip.id)) return
    seenIds.add(chip.id)
    chips.push(chip)
  }

  addMessageAttachmentChips(messageAttachments, pushUnique)
  addSessionAttachmentChips(attachments, readOnly, pushUnique)
  addPendingAttachmentChips(pendingAttachments, readOnly, seenIds, pushUnique)

  return chips
}

export const AttachmentChipList: React.FC<AttachmentChipListProps> = props => {
  const {
    compact = false,
    onRemoveAttachment,
    onRemovePending,
    pendingAttachments,
    attachments,
    testIdPrefix = 'attachment'
  } = props

  const chips = collectChips(props)
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

  return (
    <div
      className={`gba:flex gba:flex-wrap gba:gap-2 ${compact ? 'gba:pt-1 gba:pb-1' : 'gba:pt-2 gba:pb-1'}`}
      data-testid={`${testIdPrefix}-list`}
    >
      {chipsWithType.map(chip => {
        const { Icon: TypeIcon, label } = chip.fileType
        const hasThumbnail = !!chip.previewUrl

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
                  src={chip.previewUrl}
                  alt=""
                  className="gba:h-full gba:w-full gba:object-cover"
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
                aria-label={`Remove ${chip.name}`}
                data-testid={`${testIdPrefix}-chip-remove-${chip.id}`}
              >
                <XIcon className="gba:h-3 gba:w-3" weight="bold" />
              </button>
            )}
          </span>
        )
      })}
    </div>
  )
}
