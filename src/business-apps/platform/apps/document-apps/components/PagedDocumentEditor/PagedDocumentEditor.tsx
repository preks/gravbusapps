/**
 * PagedDocumentEditor Component
 *
 * A professional document editor with proper A4 page layout,
 * page breaks, and Word-like editing experience.
 */

import React, { useState, useCallback, useEffect, useMemo, useRef, forwardRef, useImperativeHandle } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { DOMSerializer } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import { Placeholder } from '@tiptap/extension-placeholder'
import { TextAlign } from '@tiptap/extension-text-align'
import { Underline } from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Highlight } from '@tiptap/extension-highlight'
import { Link } from '@tiptap/extension-link'
import { FontFamily } from '@tiptap/extension-font-family'
import { FontSize } from '@tiptap/extension-text-style/font-size'
import { Subscript } from '@tiptap/extension-subscript'
import { Superscript } from '@tiptap/extension-superscript'
import { Typography } from '@tiptap/extension-typography'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import {
  Button,
  Input,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Badge,
  Label,
  Separator,
  Textarea,
  Avatar,
  AvatarImage,
  AvatarFallback,
  AiButton,
  useTranslation
} from '@newwork/nw-design-system'
import {
  ArrowLeft,
  Save,
  FileText,
  Clock,
  CheckCircle,
  Printer,
  FileDown,
  BookTemplate,
  Send,
  LayoutPanelLeft,
  ChevronRight,
  UserCheck,
  AlertCircle,
  XCircle,
  History,
  Lock,
  Unlock,
  MessageSquare,
  Upload,
  Wand2
} from 'lucide-react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { Document, DocumentApprovalRequest, DocumentFormatting, DocumentPagesFormatting } from '../../types'
import {
  getPaginationConfigFromFormatting,
  getPagesConfigFromFormatting,
  normalizeStoredPagesFormatting,
  resolvePageLayout,
  getDefaultPageLayout,
  DEFAULT_PAGE_COLOR
} from '../../utils/pageLayoutUtils'
import { isAllowedHref, escapeHtmlAttr, escapeHtmlText } from '../../utils/linkUtils'
import { normalizeDocumentHtmlForEditor, sanitizePaginationRuntimeHtml } from '../../utils/documentContentUtils'
import { computePanelCommentAnchor, type PanelCommentAnchor } from '../../utils/commentPanelAnchor'
import {
  useDocumentEditorAvatars,
  useYjsDocumentSync,
  useDocumentEditorShortcuts,
  useVersionUserDisplays
} from '../../hooks'
import { useEditorKeyboardIsolation } from '../../../shared/hooks/useEditorKeyboardIsolation'
import {
  Pages,
  markNextPaginationHydrationDocChange,
  type ActivePagesEditorState,
  type PaginationPlusStorage as PagesStorage
} from '@/components/tiptap-extensions/tiptap-custom-pagination'
import { LineAndParagraphSpacing } from './extensions/LineAndParagraphSpacing'
import { ParagraphIndent } from './extensions/ParagraphIndent'
import { DocumentImage, PageBreak, SearchHighlight } from './extensions'
import { createYjsCursorExtension } from './extensions/YjsCursor'
import { EditorToolbar } from './EditorToolbar'
import DOMPurify from 'dompurify'
import { exportToWord, exportToPDF, printHtmlDocument, embedImagesInHtml } from '../../utils/exportUtils'
import { useImageDataUrlResolver } from '../../hooks/useImageDataUrlResolver'
import { DocumentApiService } from '../../services/DocumentApiService'
import { useCollaboration } from '../../../shared/hooks/useCollaboration'
import { PresenceIndicator } from '../../../shared/components/PresenceIndicator'
import { useVersioning } from '../../../shared/hooks/useVersioning'
import { useFileLock } from '../../../shared/hooks/useFileLock'
import { useComments } from '../../../shared/hooks/useComments'
import { usePublishing } from '../../../shared/hooks/usePublishing'
import { emitDocumentActivity, emitDocumentActivityEnd } from '../../../spaces/hooks/useSpaceDocumentActivity'
import { buildDocumentEditAdditionInfo } from '@/common/utils/buildDocumentEditPrompt'
import { openEveryAI } from '@/common/utils/openEveryAI'
import { navigateTo } from '@/common/utils/navigationUtils'
import { env } from '@/common/env/EnvUtils'
import { flowbotClient } from '@/common/network/flowbot/FlowbotClient'
import { Table, TableCell, TableHeader, TableRow } from '@/components/tiptap-extensions/tiptap-custom-tables'
import { VersionHistory } from '../../../shared/components/VersionHistory'
import { CheckpointDialog } from '../../../shared/components/CheckpointDialog'
import { StatusBadge } from '../../../shared/components/StatusBadge'
import { PublishDialog } from '../../../shared/components/PublishDialog'
import { CommentPanel } from '../../../shared/components/CommentPanel'
import { InlineCommentPopover } from '../../../shared/components/InlineCommentPopover'
import { InlineComment as InlineCommentExtension } from '../../../shared/extensions/InlineCommentExtension'
import { AiEditPanel } from '../AiEditPanel'
import { PageSetupDialog } from './PageSetupDialog'
import { LinkDialog, type LinkDialogInitialValues, type LinkDialogMode } from './LinkDialog'
import { LinkBubbleMenu } from './LinkBubbleMenu'
import { InsertImageDialog } from './InsertImageDialog'
import { InsertTableDialog } from './InsertTableDialog'
import { NavigationPanel } from './NavigationPanel'
import { DocumentBottomBar } from './DocumentBottomBar'
import { useEditorImageHandlers } from './hooks/useEditorImageHandlers'
import translations from '../../_i18n'
import * as Y from 'yjs'
import { Awareness } from 'y-protocols/awareness'

// A4 dimensions and margins at 96 DPI (aligned with pageLayoutConstants)
const PAGE_GAP_PX = 24

/** Delay before auto-saving new documents/templates (no document id). 5 minutes. */
const AUTO_SAVE_DELAY_MS = 5 * 60 * 1000

// Collaboration cursor styles
const CURSOR_STYLES = `
  @keyframes cursor-fade-in {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes cursor-blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
  
  /* Only the cursor line blinks, not the label */
  .collaboration-cursor__line {
    animation: cursor-blink 1s ease-in-out infinite;
  }
  
  /* Label does NOT blink - stays visible */
  .collaboration-cursor__label {
    transition: transform 0.15s ease, opacity 0.15s ease;
  }
  
  .collaboration-cursor__caret:hover .collaboration-cursor__label {
    transform: scale(1.03);
  }
  
  /* Avatar styling */
  .collaboration-cursor__avatar {
    transition: transform 0.15s ease;
  }
  
  .collaboration-cursor__caret:hover .collaboration-cursor__avatar {
    transform: scale(1.1);
  }
  
  .collaboration-cursor__selection {
    transition: background-color 0.15s ease;
  }
`

/**
 * Format approval date for display
 */
function formatApprovalDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Get initials from name
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Get avatar image URL from base64 data
 * Handles both raw base64 and data: prefixed strings
 */
function getAvatarUrl(picture?: string): string | undefined {
  if (!picture) return undefined
  // If already has data: prefix, use as-is
  if (picture.startsWith('data:')) return picture
  // Otherwise, add the prefix (try png first, browser will handle it)
  return `data:image/png;base64,${picture}`
}

function stripHtmlTagsLinear(input: string): string {
  let result = ''
  let insideTag = false
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i]
    if (char === '<') {
      insideTag = true
      continue
    }
    if (char === '>' && insideTag) {
      insideTag = false
      continue
    }
    if (!insideTag) {
      result += char
    }
  }
  return result
}

function collapseWhitespaceLinear(input: string): string {
  let result = ''
  let previousWasWhitespace = false
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i]
    const isWhitespace = /\s/.test(char)
    if (isWhitespace) {
      if (!previousWasWhitespace) {
        result += ' '
        previousWasWhitespace = true
      }
      continue
    }
    result += char
    previousWasWhitespace = false
  }
  return result.trim()
}

function normalizeHtmlForComparison(html: string): string {
  try {
    if (globalThis.window === undefined) {
      return html.trim()
    }
    const doc = new globalThis.DOMParser().parseFromString(html, 'text/html')
    const normalized = doc.body.innerHTML
      .split('\u200B')
      .join('')
      .split(/>\s+</)
      .join('><')
      .split(/\s+/)
      .join(' ')
      .trim()
    return normalized
  } catch {
    return html.split('\u200B').join('').split(/>\s+</).join('><').split(/\s+/).join(' ').trim()
  }
}

function areHtmlSemanticallyEquivalent(left: string, right: string): boolean {
  if (left === right) return true
  const normalizedLeft = normalizeHtmlForComparison(left)
  const normalizedRight = normalizeHtmlForComparison(right)
  if (normalizedLeft === normalizedRight) return true

  try {
    if (globalThis.window !== undefined) {
      const leftDoc = new globalThis.DOMParser().parseFromString(left, 'text/html')
      const rightDoc = new globalThis.DOMParser().parseFromString(right, 'text/html')
      const leftText = (leftDoc.body.textContent || '').split(/\s+/).join(' ').trim()
      const rightText = (rightDoc.body.textContent || '').split(/\s+/).join(' ').trim()
      return leftText === rightText
    }
  } catch {
    // ignore and return false below
  }
  return false
}

function readPagesFormattingFromStorage(storage?: PagesStorage | null): DocumentPagesFormatting | undefined {
  if (!storage) return undefined

  return normalizeStoredPagesFormatting({
    differentFirstPage: storage.differentFirstPage,
    differentOddEven: storage.differentOddEven,
    header: storage.headerHTML,
    footer: storage.footerHTML,
    headerFirstPage: storage.headerFirstPageHTML,
    footerFirstPage: storage.footerFirstPageHTML,
    headerOdd: storage.headerOddHTML,
    headerEven: storage.headerEvenHTML,
    footerOdd: storage.footerOddHTML,
    footerEven: storage.footerEvenHTML,
    headerHeight: storage.headerHeight,
    footerHeight: storage.footerHeight,
    headerTopMargin: storage.headerTopMargin,
    footerBottomMargin: storage.footerBottomMargin
  })
}

/**
 * ApprovalStatusBadge Component - Shows detailed approval status in header
 */
const ApprovalStatusBadge: React.FC<{ approvalRequest: DocumentApprovalRequest }> = ({ approvalRequest }) => {
  const { t } = useTranslation(translations)
  const approvedBy = approvalRequest.approvers?.filter(a => a.status === 'approved') || []
  const pendingApprovers = approvalRequest.approvers?.filter(a => a.status === 'pending') || []
  const rejectedBy = approvalRequest.approvers?.filter(a => a.status === 'rejected') || []
  const isPending = approvalRequest.status === 'pending'
  const isApproved = approvalRequest.status === 'approved'
  const isRejected = approvalRequest.status === 'rejected'

  if (isPending && pendingApprovers.length > 0) {
    return (
      <div className="gba:ml-4 gba:px-3 gba:py-2 gba:rounded-lg gba:bg-warning/10 gba:border gba:border-warning/30">
        <div className="gba:flex gba:items-center gba:gap-2 gba:text-warning">
          <AlertCircle className="gba:w-4 gba:h-4" />
          <span className="gba:text-sm gba:font-medium">{t('editor-approval-pending')}</span>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2 gba:mt-2">
          {pendingApprovers.slice(0, 3).map((approver, idx) => (
            <Avatar key={idx} className="gba:w-6 gba:h-6">
              <AvatarImage
                src={getAvatarUrl(approver.userPicture)}
                alt={approver.userName || t('editor-approval-approver-alt')}
              />
              <AvatarFallback className="gba:text-[8px] gba:bg-warning/20 gba:text-warning">
                {approver.userName ? getInitials(approver.userName) : '?'}
              </AvatarFallback>
            </Avatar>
          ))}
          {pendingApprovers.length > 3 && (
            <span className="gba:text-xs gba:text-muted-foreground">+{pendingApprovers.length - 3}</span>
          )}
        </div>
      </div>
    )
  }

  if (isApproved && approvedBy.length > 0) {
    const lastApproved = approvedBy[approvedBy.length - 1]
    return (
      <div className="gba:ml-4 gba:px-3 gba:py-2 gba:rounded-lg gba:bg-success/10 gba:border gba:border-success/30">
        <div className="gba:flex gba:items-center gba:gap-2 gba:text-success">
          <CheckCircle className="gba:w-4 gba:h-4" />
          <span className="gba:text-sm gba:font-medium">{t('editor-approval-approved')}</span>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2 gba:mt-2">
          <Avatar className="gba:w-6 gba:h-6">
            <AvatarImage
              src={getAvatarUrl(lastApproved.userPicture)}
              alt={lastApproved.userName || t('editor-approval-approver-alt')}
            />
            <AvatarFallback className="gba:text-[8px] gba:bg-success/20 gba:text-success">
              {lastApproved.userName ? getInitials(lastApproved.userName) : <UserCheck className="gba:w-3 gba:h-3" />}
            </AvatarFallback>
          </Avatar>
          <div className="gba:flex gba:flex-col">
            <span className="gba:text-xs gba:font-medium gba:text-foreground">
              {lastApproved.userName || lastApproved.userId}
            </span>
            {lastApproved.respondedAt && (
              <span className="gba:text-[10px] gba:text-muted-foreground">
                {formatApprovalDateTime(lastApproved.respondedAt)}
              </span>
            )}
          </div>
        </div>
        {approvedBy.length > 1 && (
          <div className="gba:text-xs gba:text-muted-foreground/70 gba:mt-1">
            {t('editor-approval-more', { count: approvedBy.length - 1 })}
          </div>
        )}
      </div>
    )
  }

  if (isRejected && rejectedBy.length > 0) {
    const lastRejected = rejectedBy[rejectedBy.length - 1]
    return (
      <div className="gba:ml-4 gba:px-3 gba:py-2 gba:rounded-lg gba:bg-destructive/10 gba:border gba:border-destructive/30">
        <div className="gba:flex gba:items-center gba:gap-2 gba:text-destructive">
          <XCircle className="gba:w-4 gba:h-4" />
          <span className="gba:text-sm gba:font-medium">{t('editor-approval-rejected')}</span>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2 gba:mt-2">
          <Avatar className="gba:w-6 gba:h-6">
            <AvatarImage
              src={getAvatarUrl(lastRejected.userPicture)}
              alt={lastRejected.userName || t('editor-approval-rejector-alt')}
            />
            <AvatarFallback className="gba:text-[8px] gba:bg-destructive/20 gba:text-destructive">
              {lastRejected.userName ? getInitials(lastRejected.userName) : '?'}
            </AvatarFallback>
          </Avatar>
          <div className="gba:flex gba:flex-col">
            <span className="gba:text-xs gba:font-medium gba:text-foreground">
              {lastRejected.userName || lastRejected.userId}
            </span>
            {lastRejected.respondedAt && (
              <span className="gba:text-[10px] gba:text-muted-foreground">
                {formatApprovalDateTime(lastRejected.respondedAt)}
              </span>
            )}
          </div>
        </div>
        {lastRejected.comments && (
          <div className="gba:text-xs gba:text-muted-foreground/70 gba:mt-1 gba:italic">"{lastRejected.comments}"</div>
        )}
      </div>
    )
  }

  return null
}

export interface PagedDocumentEditorProps extends Partial<BusinessAppContextProps> {
  document?: Document
  initialContent?: string
  initialTitle?: string
  initialFormatting?: DocumentFormatting
  onSave: (title: string, content: string, formatting?: DocumentFormatting) => Promise<void>
  onBack: () => void
  /** When provided, page setup changes are persisted immediately on OK (so layout survives when leaving without Save). */
  onPersistFormatting?: (formatting: DocumentFormatting) => Promise<void>
  onSaveAsTemplate?: (title: string, content: string) => void
  onSendForApproval?: () => void
  isReadOnly?: boolean
  /** Left panel (e.g. Insert field for templates); shown when editing a template */
  leftPanel?: React.ReactNode
  /** Extra content rendered below the title row (e.g. external-source badge) */
  headerExtra?: React.ReactNode
  'data-testid'?: string
}

export interface PagedDocumentEditorRef {
  insertAtCursor: (htmlOrText: string) => void
}

type InlineCommentMeta = {
  selectionStart?: number
  selectionEnd?: number
  selectedText?: string
}

/**
 * Resolves the full document range for an inline comment. The previous implementation
 * only used the first text node with the mark; formatted selections (bold/mixed marks)
 * split into multiple text nodes, so only a fragment was highlighted.
 * When marks are split across pagination, we fall back to stored selection positions.
 */
function findInlineCommentSelection(
  editor: { state: { doc: any } },
  commentId: string,
  comment?: InlineCommentMeta | null
): { from: number; to: number } | null {
  const { doc } = editor.state
  const ranges: { from: number; to: number }[] = []

  doc.descendants((node: any, pos: number) => {
    if (!node.isText) return
    for (const mark of node.marks ?? []) {
      if (mark?.type?.name === 'inlineComment' && mark?.attrs?.commentId === commentId) {
        ranges.push({ from: pos, to: pos + node.nodeSize })
        break
      }
    }
  })

  const docSize = doc.content.size
  const tryStoredRange = (): { from: number; to: number } | null => {
    if (
      comment?.selectionStart == null ||
      comment?.selectionEnd == null ||
      comment.selectionEnd <= comment.selectionStart
    ) {
      return null
    }
    const from = Math.max(0, Math.min(comment.selectionStart, docSize))
    const to = Math.max(from, Math.min(comment.selectionEnd, docSize))
    return to > from ? { from, to } : null
  }

  // Resolved (or legacy) comments may have no doc marks; navigate via stored positions
  if (!ranges.length) {
    return tryStoredRange()
  }

  ranges.sort((a, b) => a.from - b.from)
  const merged: { from: number; to: number }[] = []
  for (const r of ranges) {
    const prev = merged[merged.length - 1]
    if (prev && r.from <= prev.to) prev.to = Math.max(prev.to, r.to)
    else merged.push({ ...r })
  }

  if (merged.length > 1) {
    const stored = tryStoredRange()
    if (stored) return stored
    return merged.reduce((a, b) => (b.to - b.from > a.to - a.from ? b : a))
  }

  const single = merged[0]
  const expectedLen = comment?.selectedText?.trim().length ?? 0
  const markLen = single.to - single.from
  if (expectedLen > 0 && markLen < expectedLen * 0.85) {
    const stored = tryStoredRange()
    if (stored && stored.to - stored.from >= expectedLen * 0.85) return stored
  }

  return single
}

function scrollInlineCommentRangeIntoView(editor: { view: any }, from: number, to: number, commentId?: string) {
  requestAnimationFrame(() => {
    const view = editor.view
    const domFallback = () => {
      if (!commentId) return
      globalThis.document
        .querySelector(`[data-comment-id="${commentId}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    let startCoords: { top: number; bottom: number }
    let endCoords: { top: number; bottom: number }
    try {
      startCoords = view.coordsAtPos(from)
      endCoords = view.coordsAtPos(to > from ? to - 1 : from)
    } catch {
      domFallback()
      return
    }
    const viewport = view.dom.closest('.document-editor-viewport') as HTMLElement | null
    if (!viewport) {
      domFallback()
      return
    }
    const top = Math.min(startCoords.top, endCoords.top)
    const bottom = Math.max(startCoords.bottom, endCoords.bottom)
    const vp = viewport.getBoundingClientRect()
    const pad = 24
    if (top < vp.top + pad) {
      viewport.scrollTop -= vp.top + pad - top
    } else if (bottom > vp.bottom - pad) {
      viewport.scrollTop += bottom - (vp.bottom - pad)
    }
  })
}

function renderSaveStatus(
  isSaving: boolean,
  hasUnsavedChanges: boolean,
  lastSaved: Date | null,
  formatLastSaved: (d: Date | null) => string,
  t: (key: string) => string
): React.ReactNode {
  if (isSaving) {
    return (
      <Badge variant="secondary" className="gba:gap-1">
        <Clock className="gba:w-3 gba:h-3 gba:animate-spin" />
        {t('editor-saving')}
      </Badge>
    )
  }
  if (hasUnsavedChanges) {
    return (
      <Badge variant="outline" className="gba:gap-1">
        <Clock className="gba:w-3 gba:h-3" />
        {t('editor-unsaved')}
      </Badge>
    )
  }
  if (lastSaved) {
    return (
      <span className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1">
        <CheckCircle className="gba:w-3 gba:h-3 gba:text-success" />
        {formatLastSaved(lastSaved)}
      </span>
    )
  }
  return null
}

interface TabKeyEditorRef {
  state: { selection: { $from: { depth: number; node: (d: number) => { type: { name: string } } } } }
  commands: {
    goToPreviousCell: () => void
    goToNextCell: () => boolean
    insertContent: (c: string) => void
  }
  chain: () => { addRowAfter: () => { goToNextCell: () => { run: () => void } } }
}

/** Tab key handler for editor: table cell navigation or insert tab. Extracted to keep component complexity low. */
function handleTabKeyInPagedEditor(event: KeyboardEvent, editorRef: React.RefObject<TabKeyEditorRef | null>): boolean {
  if (event.key !== 'Tab') return false
  event.preventDefault()
  const ed = editorRef.current
  if (!ed) return true
  const $from = ed.state.selection.$from
  let inTableCell = false
  for (let d = $from.depth; d > 0; d--) {
    const nodeName = $from.node(d).type.name
    if (nodeName === 'tableCell' || nodeName === 'tableHeader') {
      inTableCell = true
      break
    }
  }
  if (inTableCell) {
    if (event.shiftKey) {
      ed.commands.goToPreviousCell()
    } else {
      const moved = ed.commands.goToNextCell()
      if (!moved) ed.chain().addRowAfter().goToNextCell().run()
    }
  } else if (!event.shiftKey) {
    ed.commands.insertContent('\t')
  }
  return true
}

function getSpaceIdFromWindow(): string | null {
  if (globalThis.window === undefined) return null
  return new URLSearchParams(globalThis.window.location.search).get('spaceId')
}

function parseIsoDateMs(value?: string): number {
  if (!value) return 0
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function useNavigationPanelState(): [boolean, React.Dispatch<React.SetStateAction<boolean>>] {
  const [show, setShow] = useState(() => {
    if (globalThis.window === undefined) return false
    return globalThis.window.localStorage.getItem('document-editor-navigation-panel-open') === 'true'
  })
  useEffect(() => {
    if (globalThis.window === undefined) return
    globalThis.window.localStorage.setItem('document-editor-navigation-panel-open', String(show))
  }, [show])
  return [show, setShow]
}

function useCollaborationCursorStyles(): void {
  useEffect(() => {
    if (globalThis.window === undefined) return
    const styleId = 'collaboration-cursor-styles'
    const doc = globalThis.window.document
    if (doc.getElementById(styleId)) return
    const styleEl = doc.createElement('style')
    styleEl.id = styleId
    styleEl.textContent = CURSOR_STYLES
    doc.head.appendChild(styleEl)
  }, [])
}

/**
 * PagedDocumentEditor Component
 */
export const PagedDocumentEditor = forwardRef<PagedDocumentEditorRef, PagedDocumentEditorProps>(
  function PagedDocumentEditor(
    {
      document,
      initialContent = '',
      initialTitle,
      initialFormatting,
      onSave,
      onBack,
      onPersistFormatting,
      onSaveAsTemplate,
      onSendForApproval,
      isReadOnly = false,
      leftPanel,
      headerExtra,
      accessToken: accessTokenProp,
      'data-testid': testId = 'paged-document-editor'
    },
    ref
  ) {
    const { t } = useTranslation(translations)
    // Editor state
    const [title, setTitle] = useState(document?.title || initialTitle || t('title-untitled-document'))
    const [isSaving, setIsSaving] = useState(false)
    const [lastSaved, setLastSaved] = useState<Date | null>(document ? new Date(document.updatedAt) : null)
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const [zoom, setZoom] = useState(100)
    const [pageCount, setPageCount] = useState(1)
    const [currentPage, setCurrentPage] = useState(1)
    const [layoutFormatting, setLayoutFormatting] = useState<DocumentFormatting>(() => getDefaultPageLayout())

    const editorContainerRef = useRef<HTMLDivElement | null>(null)
    const editorChromeRef = useRef<HTMLDivElement | null>(null)
    const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const titleInputRef = useRef<HTMLInputElement>(null)
    const editorRef = useRef<any>(null) // Store editor instance

    useEffect(() => {
      DocumentApiService.setAccessToken(accessTokenProp || null)
    }, [accessTokenProp])

    useEffect(() => {
      lastRemoteUpdateMsRef.current = parseIsoDateMs(document?.updatedAt)
    }, [document?.id, document?.updatedAt])

    useEffect(() => {
      if (!document?.id) return

      type FlowbotDocumentStreamCompleteDetail = {
        documentId?: string
        mode?: 'document' | 'selection'
        changed?: boolean
        changeSummary?: string
      }

      const handleFlowbotDocumentStreamComplete = async (evt: Event) => {
        const customEvent = evt as CustomEvent<FlowbotDocumentStreamCompleteDetail>
        const targetDocumentId = customEvent.detail?.documentId
        if (!targetDocumentId || targetDocumentId !== document.id) return

        try {
          const latest = await DocumentApiService.getDocument(document.id)
          if (!latest || !editorRef.current) return

          const nextTitle = latest.title || title
          setTitle(nextTitle)

          const latestHtml = latest.content || '<p></p>'
          const currentHtml = editorRef.current.getHTML?.() || ''
          if (latestHtml && latestHtml !== currentHtml) {
            isApplyingRemoteContentRef.current = true
            editorRef.current.commands?.setContent?.(latestHtml, false)
            queueMicrotask(() => {
              isApplyingRemoteContentRef.current = false
            })
          }

          setLastSaved(new Date())
          setHasUnsavedChanges(false)
        } catch (error) {
          console.error('[PagedDocumentEditor] Failed to refresh document after stream commit:', error)
        }
      }

      globalThis.window.addEventListener('flowbot:document-stream-complete', handleFlowbotDocumentStreamComplete)
      return () => {
        globalThis.window.removeEventListener('flowbot:document-stream-complete', handleFlowbotDocumentStreamComplete)
      }
    }, [document?.id, title])

    const resolvedLayout = resolvePageLayout(layoutFormatting)
    const paginationConfig = getPaginationConfigFromFormatting(layoutFormatting)
    const pagesFormattingConfig = getPagesConfigFromFormatting(layoutFormatting)
    const isPageless = resolvedLayout.pageless
    const pageColor = resolvedLayout.pageColor ?? DEFAULT_PAGE_COLOR
    const isHeaderFooterEditing = pagesEditorState.activeEditorType !== null
    const paginationDebugDisabled = useMemo(() => isDocumentPaginationDisabled(), [])

    useEffect(() => {
      const sourceFormatting = document?.formatting ?? initialFormatting
      const fromDoc = resolvePageLayout(sourceFormatting)
      setLayoutFormatting({
        ...getDefaultPageLayout(),
        ...sourceFormatting,
        pageSize: fromDoc.pageSize,
        orientation: fromDoc.orientation,
        margins: fromDoc.margins,
        marginUnit: fromDoc.marginUnit,
        pageColor: fromDoc.pageColor,
        pageless: fromDoc.pageless
      })
    }, [document?.id, initialFormatting])

    useEffect(() => {
      setPagesEditorState({
        activeEditor: null,
        activeEditorType: null,
        activePageNumber: null
      })
    }, [document?.id])

    // Versioning UI state
    const [showVersionHistory, setShowVersionHistory] = useState(false)
    const [showCheckpointDialog, setShowCheckpointDialog] = useState(false)
    const [showPublishDialog, setShowPublishDialog] = useState(false)
    const [showPageSetupDialog, setShowPageSetupDialog] = useState(false)
    const [showInsertImageDialog, setShowInsertImageDialog] = useState(false)
    const [showInsertTableDialog, setShowInsertTableDialog] = useState(false)
    const [showLinkDialog, setShowLinkDialog] = useState(false)
    const [linkDialogMode, setLinkDialogMode] = useState<LinkDialogMode>('insert')
    const [linkDialogInitialValues, setLinkDialogInitialValues] = useState<LinkDialogInitialValues | undefined>()
    const [linkDialogInsertWithNoSelection, setLinkDialogInsertWithNoSelection] = useState(false)
    // Right sidebar: only one can be open at a time (comments vs AI editor)
    type RightSidebar = 'closed' | 'comments' | 'ai'
    type NavigationPanelTab = 'headings' | 'find' | 'replace'
    const [rightSidebar, setRightSidebar] = useState<RightSidebar>('closed')
    const [showNavigationPanel, setShowNavigationPanel] = useNavigationPanelState()
    const [navigationPanelTab, setNavigationPanelTab] = useState<NavigationPanelTab>('headings')
    const [showInlineCommentPopover, setShowInlineCommentPopover] = useState(false)
    const [inlineCommentPosition, setInlineCommentPosition] = useState<{ top: number; left: number } | null>(null)
    const [pendingSelection, setPendingSelection] = useState<{
      from: number
      to: number
      text: string
      html: string
    } | null>(null)
    const [showAiInstructionDialog, setShowAiInstructionDialog] = useState(false)
    const [aiInstruction, setAiInstruction] = useState('')
    const [aiSelectionSnapshot, setAiSelectionSnapshot] = useState('')
    const [aiSelectionSnapshotHtml, setAiSelectionSnapshotHtml] = useState('')
    const panelCommentAnchorRef = useRef<PanelCommentAnchor | null>(null)
    const activeEditorRef = useRef<ReturnType<typeof useEditor> | null>(null)
    const everyAiFallbackPollRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const suppressYjsSnapshotSaveRef = useRef(false)
    const [isAutocompleteToggleEnabled, setIsAutocompleteToggleEnabled] = useState(false)
    const [autocompleteSuggestion, setAutocompleteSuggestion] = useState('')
    const [autocompleteCursorPos, setAutocompleteCursorPos] = useState<number | null>(null)
    const [currentSelectionRange, setCurrentSelectionRange] = useState<{ from: number; to: number } | null>(null)
    const isAutocompleteLoadingRef = useRef(false)
    const autocompleteSuggestionRef = useRef('')
    const autocompleteCursorPosRef = useRef<number | null>(null)
    const autocompleteDebounceRef = useRef<NodeJS.Timeout | null>(null)
    const autocompleteRequestControllerRef = useRef<AbortController | null>(null)
    const scheduleAutocompleteRef = useRef<() => void>(() => {})
    const autocompleteRolloutEnabled = useMemo(() => isAutocompleteRolloutEnabled(), [])
    const [isAiSelectionPreviewExpanded, setIsAiSelectionPreviewExpanded] = useState(false)
    const aiSelectionPreviewText = useMemo(() => {
      const directText = aiSelectionSnapshot.trim()
      if (directText) return directText

      const html = aiSelectionSnapshotHtml.trim()
      if (!html) return ''

      if (globalThis.window === undefined) {
        return collapseWhitespaceLinear(stripHtmlTagsLinear(html))
      }

      const parsed = new globalThis.DOMParser().parseFromString(html, 'text/html')
      return collapseWhitespaceLinear(parsed.body.textContent || '')
    }, [aiSelectionSnapshot, aiSelectionSnapshotHtml])
    const hasLongAiSelectionPreview = aiSelectionPreviewText.length > 220

    const ydoc = React.useMemo(() => new Y.Doc(), [document?.id])
    const awareness = React.useMemo(() => new Awareness(ydoc), [ydoc])

    // Collaborative page layout (formatting) sync via Yjs.
    // Content is already synced via Collaboration; formatting must be synced separately.
    const formattingYMap = React.useMemo(() => ydoc.getMap('documentFormatting'), [ydoc])
    const metaYMap = React.useMemo(() => ydoc.getMap('documentMeta'), [ydoc])

    const collaborationExtension = React.useMemo(
      () => (document?.id ? Collaboration.configure({ document: ydoc }) : null),
      [document?.id, ydoc]
    )
    const yjsCursorExtension = React.useMemo(
      () => (document?.id ? createYjsCursorExtension(awareness) : null),
      [document?.id, awareness]
    )

    const onErrorCallback = useCallback((error: Error) => {
      console.error('[PagedDocumentEditor] Collaboration error:', error)
    }, [])

    const applyRemoteOperationContent = useCallback(
      (nextHtml: string, nextTitle?: string) => {
        const editorInstance = editorRef.current as {
          getHTML?: () => string
          commands?: { setContent?: (html: string, emit?: boolean) => void }
        } | null
        if (!editorInstance || !nextHtml) return

        const currentHtml = editorInstance.getHTML?.() || ''
        if (currentHtml === nextHtml) return

        isApplyingRemoteContentRef.current = true
        editorInstance.commands?.setContent?.(nextHtml, false)
        queueMicrotask(() => {
          isApplyingRemoteContentRef.current = false
        })
        if (nextTitle) {
          setTitle(prev => (prev === nextTitle ? prev : nextTitle))
        }
        setLastSaved(new Date())
        setHasUnsavedChanges(false)
      },
      [setLastSaved, setHasUnsavedChanges]
    )

    const onCollaborationOperationReceived = useCallback(
      (payload: {
        userId: string
        userName: string
        operation: {
          type: string
          data?: unknown
        }
        version?: number
        timestamp: number
      }) => {
        if (!document?.id) return
        if (payload?.operation?.type !== 'content_update') return

        const operationData =
          payload.operation.data && typeof payload.operation.data === 'object'
            ? (payload.operation.data as Record<string, unknown>)
            : null
        const source = typeof operationData?.source === 'string' ? operationData.source : ''
        if (typeof source === 'string' && !source.startsWith('flowbot_realtime')) {
          return
        }

        const nextHtml = typeof operationData?.content === 'string' ? operationData.content : null
        if (!nextHtml) return
        const nextTitle = typeof operationData?.title === 'string' ? operationData.title : null
        const typingAgeMs = Date.now() - lastLocalTypingMsRef.current
        if (typingAgeMs < DOCUMENT_REMOTE_TYPING_GUARD_MS) {
          pendingRemoteContentRef.current = nextHtml
          pendingRemoteTitleRef.current = nextTitle
          if (pendingRemoteApplyTimeoutRef.current) {
            clearTimeout(pendingRemoteApplyTimeoutRef.current)
          }
          pendingRemoteApplyTimeoutRef.current = setTimeout(() => {
            pendingRemoteApplyTimeoutRef.current = null
            const pendingHtml = pendingRemoteContentRef.current
            const pendingTitle = pendingRemoteTitleRef.current || undefined
            pendingRemoteContentRef.current = null
            pendingRemoteTitleRef.current = null
            if (pendingHtml) {
              applyRemoteOperationContent(pendingHtml, pendingTitle)
            }
          }, DOCUMENT_REMOTE_TYPING_GUARD_MS)
          return
        }

        applyRemoteOperationContent(nextHtml, nextTitle || undefined)
      },
      [applyRemoteOperationContent, document?.id]
    )

    // Only use the injected access token so editor behavior never depends on browser storage.
    const accessToken = accessTokenProp || ''

    useEffect(() => {
      flowbotClient.setAccessToken(accessToken)
    }, [accessToken])

    const entityId = document?.id || ''

    // Collaboration state
    const { participants: rawParticipants, socket: collaborationSocket } = useCollaboration({
      entityType: 'document',
      entityId,
      enabled: !!document?.id,
      accessToken,
      onOperationReceived: onCollaborationOperationReceived,
      onError: onErrorCallback
    })

    const { participants, currentUserId, currentUserName, currentUserAvatar } = useDocumentEditorAvatars({
      accessToken,
      rawParticipants
    })
    const autocompleteToggleStorageKey = useMemo(
      () => (currentUserId ? `${AUTOCOMPLETE_TOGGLE_STORAGE_KEY}:${currentUserId}` : AUTOCOMPLETE_TOGGLE_STORAGE_KEY),
      [currentUserId]
    )

    // Versioning, Comments, Locking, Publishing hooks
    const versioning = useVersioning({
      entityId,
      entityType: 'document',
      apiService: DocumentApiService,
      autoSaveEnabled: !!document?.id && !isReadOnly,
      autoSaveInterval: 30000,
      onVersionCreated: () => {}
    })

    const versionUserDisplayMap = useVersionUserDisplays(versioning.versions, accessToken)

    const comments = useComments({
      entityId,
      entityType: 'document',
      apiService: DocumentApiService
    })

    const fileLock = useFileLock({
      entityId,
      entityType: 'document',
      currentUserId: currentUserId || undefined,
      apiService: DocumentApiService
    })

    const currentPublishStatus = document?.publishMetadata?.status || 'draft'

    const publishing = usePublishing({
      entityId,
      entityType: 'document',
      currentStatus: currentPublishStatus,
      apiService: DocumentApiService
    })

    const getPagesStorageSnapshot = useCallback((): PagesStorage | null => {
      const editorInstance = editorRef.current as { storage?: { pages?: PagesStorage } } | null
      return editorInstance?.storage?.pages ?? null
    }, [])

    const getPersistedPagesFormatting = useCallback(
      (fallback?: DocumentPagesFormatting): DocumentPagesFormatting | undefined => {
        const pagesFromEditor = readPagesFormattingFromStorage(getPagesStorageSnapshot())
        return pagesFromEditor ?? normalizeStoredPagesFormatting(fallback)
      },
      [getPagesStorageSnapshot]
    )

    const buildPersistedFormatting = useCallback(
      (
        formattingSource: DocumentFormatting = layoutFormatting,
        pagesOverride?: DocumentPagesFormatting
      ): DocumentFormatting => {
        const resolved = resolvePageLayout(formattingSource)
        return {
          ...document?.formatting,
          ...formattingSource,
          pageSize: resolved.pageSize,
          orientation: resolved.orientation,
          margins: resolved.margins,
          marginUnit: resolved.marginUnit,
          pageColor: resolved.pageColor,
          pageless: resolved.pageless,
          pages: getPersistedPagesFormatting(pagesOverride ?? formattingSource.pages)
        }
      },
      [document?.formatting, getPersistedPagesFormatting, layoutFormatting]
    )

    const { isYjsSynced } = useYjsDocumentSync({
      documentId: document?.id,
      collaborationSocket,
      ydoc,
      awareness,
      editorRef,
      suppressSnapshotSaveRef: suppressYjsSnapshotSaveRef,
      isReadOnly,
      title,
      getFormattingForSave: () => buildPersistedFormatting(layoutFormatting),
      setLastSaved,
      setHasUnsavedChanges
    })

    useEffect(() => {
      if (!ENABLE_DOCUMENT_LIVE_SYNC_POLL_FALLBACK) return
      if (!document?.id || !isYjsSynced) return

      let cancelled = false

      const pollLatestDocumentState = async () => {
        try {
          const latest = await DocumentApiService.getDocument(document.id)
          if (!latest || cancelled) return

          const latestUpdatedAtMs = parseIsoDateMs(latest.updatedAt)
          if (latestUpdatedAtMs <= lastRemoteUpdateMsRef.current) return
          lastRemoteUpdateMsRef.current = latestUpdatedAtMs

          const editorInstance = editorRef.current as {
            getHTML?: () => string
            commands?: { setContent?: (html: string, emit?: boolean) => void }
          } | null
          if (!editorInstance) return

          const latestHtml = latest.content || '<p></p>'
          const currentHtml = editorInstance.getHTML?.() || ''
          if (latestHtml && latestHtml !== currentHtml) {
            isApplyingRemoteContentRef.current = true
            editorInstance.commands?.setContent?.(latestHtml, false)
            queueMicrotask(() => {
              isApplyingRemoteContentRef.current = false
            })
          }

          const nextTitle = latest.title || title
          setTitle(prev => (prev === nextTitle ? prev : nextTitle))
          setLastSaved(new Date(latestUpdatedAtMs || Date.now()))
          setHasUnsavedChanges(false)
        } catch (error) {
          if (!cancelled) {
            console.error('[PagedDocumentEditor] Live sync poll failed:', error)
          }
        }
      }

      void pollLatestDocumentState()
      const pollInterval = globalThis.window.setInterval(() => {
        void pollLatestDocumentState()
      }, DOCUMENT_LIVE_SYNC_POLL_INTERVAL_MS)

      return () => {
        cancelled = true
        globalThis.window.clearInterval(pollInterval)
      }
    }, [document?.id, isYjsSynced, title])

    useEffect(() => {
      return () => {
        if (pendingRemoteApplyTimeoutRef.current) {
          clearTimeout(pendingRemoteApplyTimeoutRef.current)
          pendingRemoteApplyTimeoutRef.current = null
        }
      }
    }, [])

    // Seed collaborative title once synced (do not overwrite an existing value from the room).
    useEffect(() => {
      if (!document?.id) return
      if (!isYjsSynced) return
      if (metaYMap.get('title')) return
      const initial = (document?.title || '').trim()
      if (!initial) return
      metaYMap.set('title', initial)
    }, [document?.id, document?.title, isYjsSynced, metaYMap])

    // Seed collaborative formatting once synced (do not overwrite an existing value from the room).
    useEffect(() => {
      if (!document?.id) return
      if (!isYjsSynced) return
      if (formattingYMap.get('formatting')) return
      if (!document?.formatting) return
      formattingYMap.set('formatting', document.formatting)
    }, [document?.id, document?.formatting, formattingYMap, isYjsSynced])

    // Apply title updates from other collaborators.
    useEffect(() => {
      if (!document?.id) return

      const applyFromYjs = () => {
        const next = metaYMap.get('title')
        if (typeof next !== 'string') return
        const nextTitle = next.trim()
        if (!nextTitle) return
        setTitle(prev => (prev === nextTitle ? prev : nextTitle))
        lastSavedTitleRef.current = nextTitle
      }

      applyFromYjs()
      const handler = () => applyFromYjs()
      metaYMap.observe(handler)
      return () => metaYMap.unobserve(handler)
    }, [document?.id, metaYMap])

    // Apply formatting updates from other collaborators.
    useEffect(() => {
      if (!document?.id) return

      const applyFromYjs = () => {
        const next = formattingYMap.get('formatting') as DocumentFormatting | undefined
        if (!next) return
        setLayoutFormatting(prev => {
          const prevJson = JSON.stringify(prev ?? {})
          const nextJson = JSON.stringify(next ?? {})
          if (prevJson === nextJson) return prev
          return next
        })
      }

      // Apply immediately in case the map already has a value.
      applyFromYjs()

      const handler = () => applyFromYjs()
      formattingYMap.observe(handler)
      return () => formattingYMap.unobserve(handler)
    }, [document?.id, formattingYMap])

    const editorContent = React.useMemo(() => {
      const rawContent = document?.content || initialContent || '<p></p>'
      return normalizeDocumentHtmlForEditor(rawContent)
    }, [document?.content, initialContent])
    const editorEditable = React.useMemo(
      () => !isReadOnly && (!document?.id || (isYjsSynced && fileLock.canEdit)),
      [isReadOnly, document?.id, isYjsSynced, fileLock.canEdit]
    )
    const isAutocompleteActive = autocompleteRolloutEnabled && isAutocompleteToggleEnabled && editorEditable

    useEffect(() => {
      if (!autocompleteRolloutEnabled) {
        setIsAutocompleteToggleEnabled(false)
        return
      }
      try {
        const stored = globalThis.localStorage.getItem(autocompleteToggleStorageKey)
        if (stored === null) {
          setIsAutocompleteToggleEnabled(false)
        } else {
          setIsAutocompleteToggleEnabled(stored === 'true')
        }
      } catch {
        setIsAutocompleteToggleEnabled(false)
      }
    }, [autocompleteRolloutEnabled, autocompleteToggleStorageKey])

    useEffect(() => {
      if (!autocompleteRolloutEnabled) return
      try {
        globalThis.localStorage.setItem(autocompleteToggleStorageKey, String(isAutocompleteToggleEnabled))
      } catch {
        // ignore storage write issues
      }
    }, [autocompleteRolloutEnabled, autocompleteToggleStorageKey, isAutocompleteToggleEnabled])

    const clearAutocompleteSuggestion = useCallback(() => {
      setAutocompleteSuggestion('')
      setAutocompleteCursorPos(null)
      isAutocompleteLoadingRef.current = false
    }, [])

    const getAutocompleteContext = useCallback(() => {
      const editorInstance = editorRef.current
      if (!editorInstance) return null
      const selection = editorInstance.state.selection
      if (!selection.empty) return null

      const { $from } = selection
      const parentText = $from.parent.textContent || ''
      const prefixText = parentText.slice(0, $from.parentOffset)
      const suffixText = parentText.slice($from.parentOffset)
      if (prefixText.trim().length < 3) return null

      return {
        cursorPos: selection.from,
        prefixText: prefixText.slice(-600),
        suffixText: suffixText.slice(0, 250)
      }
    }, [])

    const requestAutocomplete = useCallback(
      async (context: { cursorPos: number; prefixText: string; suffixText: string }) => {
        if (!isAutocompleteActive) return
        autocompleteRequestControllerRef.current?.abort()
        const controller = new AbortController()
        autocompleteRequestControllerRef.current = controller
        isAutocompleteLoadingRef.current = true

        try {
          const response = await flowbotClient.getDocumentAutocomplete(
            {
              document_id: document?.id,
              title,
              prefix_text: context.prefixText,
              suffix_text: context.suffixText,
              max_tokens: 80,
              llm_provider: 'openai'
            },
            { signal: controller.signal }
          )

          const editorInstance = editorRef.current
          if (!editorInstance) return
          if (!editorInstance.state.selection.empty || editorInstance.state.selection.from !== context.cursorPos) return

          const completion = (response.completion_text || '').trim()
          if (!completion) {
            clearAutocompleteSuggestion()
            return
          }

          setAutocompleteSuggestion(completion)
          setAutocompleteCursorPos(context.cursorPos)
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') return
          clearAutocompleteSuggestion()
        } finally {
          if (autocompleteRequestControllerRef.current === controller) {
            autocompleteRequestControllerRef.current = null
          }
          isAutocompleteLoadingRef.current = false
        }
      },
      [clearAutocompleteSuggestion, document?.id, isAutocompleteActive, title]
    )

    const scheduleAutocomplete = useCallback(() => {
      if (!isAutocompleteActive) {
        if (autocompleteDebounceRef.current) {
          clearTimeout(autocompleteDebounceRef.current)
        }
        autocompleteRequestControllerRef.current?.abort()
        clearAutocompleteSuggestion()
        return
      }

      if (autocompleteDebounceRef.current) {
        clearTimeout(autocompleteDebounceRef.current)
      }
      autocompleteRequestControllerRef.current?.abort()
      clearAutocompleteSuggestion()

      const context = getAutocompleteContext()
      if (!context) return

      autocompleteDebounceRef.current = setTimeout(() => {
        void requestAutocomplete(context)
      }, AUTOCOMPLETE_DEBOUNCE_MS)
    }, [clearAutocompleteSuggestion, getAutocompleteContext, isAutocompleteActive, requestAutocomplete])

    // Set local awareness state (user meta shown in cursors/selections).
    // Defer until editor view is mounted so collaboration cursor does not dispatch before view exists.
    useEffect(() => {
      if (!document?.id) return
      if (!currentUserId) return
      if (!isYjsSynced) return

      const userState = {
        id: currentUserId,
        userId: currentUserId,
        name: currentUserName || t('editor-user-fallback'),
        color: participants.find(p => p.userId === currentUserId)?.userColor || '#4ECDC4',
        avatar: currentUserAvatar
      }

      let cancelled = false
      const deadline = Date.now() + 5000
      const applyWhenViewReady = () => {
        if (cancelled) return
        try {
          const ed = editorRef.current as { view?: unknown } | null
          if (ed?.view) {
            awareness.setLocalStateField('user', userState)
            return
          }
        } catch {
          // view getter may throw when not mounted
        }
        if (Date.now() > deadline) return
        setTimeout(applyWhenViewReady, 50)
      }
      setTimeout(applyWhenViewReady, 0)
      return () => {
        cancelled = true
      }
    }, [document?.id, awareness, currentUserId, currentUserName, currentUserAvatar, participants, isYjsSynced])

    // Broadcast document activity to Spaces app
    useEffect(() => {
      if (!document?.id || !currentUserId) return

      const activityType = isReadOnly ? 'viewing' : 'editing'
      const docTitle = document.title || t('title-untitled-document')
      const urlSpaceId = getSpaceIdFromWindow()

      // Emit activity when starting
      emitDocumentActivity({
        userId: currentUserId,
        userName: currentUserName || t('editor-user-fallback'),
        userAvatar: currentUserAvatar || undefined,
        documentId: document.id,
        documentTitle: docTitle,
        documentType: 'document',
        activityType,
        spaceId: urlSpaceId || undefined
      })

      // Keep-alive: re-emit activity every 30 seconds
      const keepAliveInterval = setInterval(() => {
        emitDocumentActivity({
          userId: currentUserId,
          userName: currentUserName || t('editor-user-fallback'),
          userAvatar: currentUserAvatar || undefined,
          documentId: document.id,
          documentTitle: docTitle,
          documentType: 'document',
          activityType,
          spaceId: urlSpaceId || undefined
        })
      }, 30000)

      // Cleanup: emit activity end when leaving
      return () => {
        clearInterval(keepAliveInterval)
        emitDocumentActivityEnd(currentUserId, document.id)
      }
    }, [document?.id, document?.title, currentUserId, currentUserName, currentUserAvatar, isReadOnly, t])

    const isCollaborationMode = Boolean(document?.id)

    const imageHandlers = useEditorImageHandlers({
      editorRef,
      documentId: document?.id ?? null,
      accessToken
    })

    // Page count and current page from PaginationPlus DOM.
    //
    // PaginationPlus renders a `[data-rm-pagination]` wrapper with one `.rm-page-break` child per page.
    // Each `.rm-page-break` contains a `.breaker` element positioned at the end of that page.
    // We compute:
    // - total pages = number of `.rm-page-break` children (fallback to 1)
    // - current page = 1 + number of *page boundaries* (breaker elements except last page) above viewport center
    const paginationModelRef = useRef<{ totalPages: number; boundaryEls: HTMLElement[] }>({
      totalPages: 1,
      boundaryEls: []
    })
    const paginationRafRef = useRef<number | null>(null)
    const paginationDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const PAGINATION_DEBOUNCE_MS = 150

    const computeCurrentPageFromBoundaries = useCallback(
      (container: HTMLDivElement, totalPages: number, boundaryEls: HTMLElement[]) => {
        if (totalPages <= 1 || boundaryEls.length === 0) return 1
        const containerRect = container.getBoundingClientRect()
        const viewportCenterY = containerRect.top + containerRect.height / 2

        let passedBoundaries = 0
        for (const boundaryEl of boundaryEls) {
          const boundaryTop = boundaryEl.getBoundingClientRect().top
          if (viewportCenterY >= boundaryTop) {
            passedBoundaries += 1
          } else {
            break
          }
        }

        return Math.min(Math.max(1, 1 + passedBoundaries), totalPages)
      },
      []
    )

    const rebuildPaginationModel = useCallback(() => {
      const container = editorContainerRef.current
      if (!container) return

      const paginationRoot = container.querySelector('[data-rm-pagination]')
      const pageEls = paginationRoot ? Array.from(paginationRoot.children) : []
      const pageBreakEls = pageEls.filter((el): el is HTMLElement => el instanceof HTMLElement)
      const totalPages = pageBreakEls.length > 0 ? pageBreakEls.length : 1

      // Boundaries between pages are the `.breaker` elements for all but the last page.
      const boundaryEls = pageBreakEls
        .slice(0, -1)
        .map(el => el.querySelector('.breaker'))
        .filter((el): el is HTMLElement => el instanceof HTMLElement)

      paginationModelRef.current = { totalPages, boundaryEls }

      setPageCount(totalPages)
      setCurrentPage(previousPage => Math.min(Math.max(1, previousPage), totalPages))
    }, [])

    const schedulePaginationRebuild = useCallback(
      (immediate = false) => {
        const run = () => {
          if (paginationRafRef.current) cancelAnimationFrame(paginationRafRef.current)
          paginationRafRef.current = requestAnimationFrame(() => {
            paginationRafRef.current = null
            rebuildPaginationModel()
          })
        }
        if (immediate) {
          if (paginationDebounceRef.current) {
            clearTimeout(paginationDebounceRef.current)
            paginationDebounceRef.current = null
          }
          run()
          return
        }
        if (paginationDebounceRef.current) clearTimeout(paginationDebounceRef.current)
        paginationDebounceRef.current = setTimeout(() => {
          paginationDebounceRef.current = null
          run()
        }, PAGINATION_DEBOUNCE_MS)
      },
      [rebuildPaginationModel]
    )

    const handlePagesActiveEditorChange = useCallback((state: ActivePagesEditorState) => {
      setPagesEditorState(state)
    }, [])

    const headerFooterExtensions = useMemo(
      () =>
        [
          StarterKit.configure({
            heading: {
              levels: [1, 2, 3, 4, 5, 6]
            },
            link: false,
            underline: false
          } as any),
          TextAlign.configure({
            types: ['heading', 'paragraph']
          }),
          LineAndParagraphSpacing.configure({
            types: ['heading', 'paragraph']
          }),
          ParagraphIndent,
          Underline,
          TextStyle,
          Color,
          Highlight.configure({
            multicolor: true
          }),
          Link.configure({
            openOnClick: true,
            HTMLAttributes: {
              class: 'editor-link',
              rel: 'noopener noreferrer'
            },
            isAllowedUri: (url, ctx) => !!ctx.defaultValidate(url) && isAllowedHref(url)
          }),
          DocumentImage.configure({
            getAccessToken: () => accessToken,
            HTMLAttributes: {
              class: 'editor-image'
            }
          }),
          Table.configure({
            resizable: true,
            renderWrapper: false,
            HTMLAttributes: {
              class: 'editor-table'
            }
          }),
          TableRow,
          TableHeader,
          TableCell,
          FontFamily,
          FontSize.configure({ types: ['textStyle'] }),
          Subscript,
          Superscript,
          Typography,
          TaskList,
          TaskItem.configure({
            nested: true,
            HTMLAttributes: {
              class: 'editor-task-item'
            }
          })
        ] as any[],
      [accessToken]
    )

    // Initialize TipTap editor
    const editor = useEditor(
      {
        extensions: [
          StarterKit.configure({
            heading: {
              levels: [1, 2, 3, 4, 5, 6]
            },
            // Disable local history/undo-redo in collaboration mode (Yjs provides this).
            ...(isCollaborationMode ? { history: false, undoRedo: false } : {}),
            // Avoid duplicate names when Link/Underline are configured explicitly below.
            link: false,
            underline: false
          } as any),
          Placeholder.configure({
            placeholder: t('editor-content-placeholder')
          }),
          TextAlign.configure({
            types: ['heading', 'paragraph']
          }),
          LineAndParagraphSpacing.configure({
            types: ['heading', 'paragraph']
          }),
          ParagraphIndent,
          Underline,
          TextStyle,
          Color,
          Highlight.configure({
            multicolor: true
          }),
          Link.configure({
            openOnClick: true,
            HTMLAttributes: {
              class: 'editor-link',
              rel: 'noopener noreferrer'
            },
            isAllowedUri: (url, ctx) => !!ctx.defaultValidate(url) && isAllowedHref(url)
          }),
          DocumentImage.configure({
            getAccessToken: () => accessToken,
            HTMLAttributes: {
              class: 'editor-image'
            }
          }),
          Table.configure({
            resizable: true,
            renderWrapper: false,
            HTMLAttributes: {
              class: 'editor-table'
            }
          }),
          TableRow,
          TableHeader,
          TableCell,
          FontFamily,
          FontSize.configure({ types: ['textStyle'] }),
          Subscript,
          Superscript,
          Typography,
          TaskList,
          TaskItem.configure({
            nested: true,
            HTMLAttributes: {
              class: 'editor-task-item'
            }
          }),
          PageBreak,
          SearchHighlight,
          ...(paginationConfig && !paginationDebugDisabled
            ? [
                Pages.configure({
                  pageFormat: paginationConfig.pageFormat,
                  pageGap: PAGE_GAP_PX,
                  pageBreakBackground: '#f3f4f6',
                  header: pagesFormattingConfig.header,
                  footer: pagesFormattingConfig.footer,
                  headerFirstPage: pagesFormattingConfig.headerFirstPage,
                  footerFirstPage: pagesFormattingConfig.footerFirstPage,
                  headerOdd: pagesFormattingConfig.headerOdd,
                  headerEven: pagesFormattingConfig.headerEven,
                  footerOdd: pagesFormattingConfig.footerOdd,
                  footerEven: pagesFormattingConfig.footerEven,
                  differentFirstPage: pagesFormattingConfig.differentFirstPage,
                  differentOddEven: pagesFormattingConfig.differentOddEven,
                  headerHeight: pagesFormattingConfig.headerHeight ?? 50,
                  footerHeight: pagesFormattingConfig.footerHeight ?? 50,
                  headerTopMargin: pagesFormattingConfig.headerTopMargin,
                  footerBottomMargin: pagesFormattingConfig.footerBottomMargin,
                  accentColor: pagesFormattingConfig.accentColor,
                  headerAccentColor: pagesFormattingConfig.headerAccentColor,
                  footerAccentColor: pagesFormattingConfig.footerAccentColor,
                  headerFooterExtensions,
                  uiLabels: {
                    headerLabel: t('editor-header-footer-label-header'),
                    footerLabel: t('editor-header-footer-label-footer'),
                    doubleClickHint: t('editor-header-footer-double-click'),
                    doubleClickExitHint: t('editor-header-footer-double-click-exit'),
                    doneLabel: t('editor-header-footer-close')
                  },
                  onActiveEditorChange: handlePagesActiveEditorChange,
                  onDblClickHeaderFooterPreventClose: event =>
                    (event.target instanceof Node && editorChromeRef.current?.contains(event.target)) ?? false
                })
              ]
            : []),
          InlineCommentExtension.configure({
            onCommentClick: commentId => {
              setRightSidebar('comments')
              setTimeout(() => {
                const commentElement = globalThis.document.querySelector(`[data-testid="comment-thread-${commentId}"]`)
                commentElement?.scrollIntoView({ behavior: 'smooth', block: 'center' })
              }, 300)
            }
          }),
          ...(collaborationExtension ? [collaborationExtension] : []),
          ...(yjsCursorExtension ? [yjsCursorExtension] : [])
        ],
        // In CRDT mode, the Yjs doc becomes the single source of truth.
        content: editorContent,
        editable: editorEditable,
        editorProps: {
          attributes: {
            dir: 'auto'
          },
          handlePaste: imageHandlers.handlePaste,
          handleDrop: imageHandlers.handleDrop,
          handleKeyDown(view, event) {
            const currentSuggestion = autocompleteSuggestionRef.current
            const currentCursorPos = autocompleteCursorPosRef.current

            if (
              event.key === 'Tab' &&
              currentSuggestion &&
              currentCursorPos === view.state.selection.from &&
              view.state.selection.empty
            ) {
              event.preventDefault()
              const tr = view.state.tr.insertText(currentSuggestion, view.state.selection.from, view.state.selection.to)
              view.dispatch(tr)
              clearAutocompleteSuggestion()
              return true
            }

            if (event.key === 'Escape' && currentSuggestion) {
              event.preventDefault()
              clearAutocompleteSuggestion()
              return true
            }

            return handleTabKeyInPagedEditor(event, editorRef)
          }
        },
        onUpdate: () => {
          schedulePaginationRebuild()
          if (document?.id) versioning.markAsChanged()
          if (!document?.id) {
            setHasUnsavedChanges(true)
            if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current)
            autoSaveTimeoutRef.current = setTimeout(() => handleSave(), AUTO_SAVE_DELAY_MS)
          }
          scheduleAutocompleteRef.current()
        }
      },
      [
        document?.id,
        ydoc,
        isCollaborationMode,
        t,
        isPageless,
        accessToken,
        imageHandlers.handlePaste,
        imageHandlers.handleDrop
      ]
    )

    useCollaborationCursorStyles()

    // Update refs when values change
    useEffect(() => {
      editorRef.current = editor
    }, [editor])

    const activeEditor = (pagesEditorState.activeEditor as typeof editor | null) ?? editor

    useEffect(() => {
      activeEditorRef.current = activeEditor
    }, [activeEditor])

    useEffect(() => {
      if (!editor) return
      const editors: NonNullable<typeof editor>[] = []
      if (editor) editors.push(editor)
      if (activeEditor && activeEditor !== editor) editors.push(activeEditor)

      const sync = (ed: NonNullable<typeof editor>) => {
        const next = computePanelCommentAnchor(ed)
        panelCommentAnchorRef.current = next
      }

      const subs: { ed: NonNullable<typeof editor>; fn: () => void }[] = []
      for (const ed of editors) {
        const fn = () => sync(ed)
        ed.on('selectionUpdate', fn)
        subs.push({ ed, fn })
      }
      return () => {
        for (const { ed, fn } of subs) {
          ed.off('selectionUpdate', fn)
        }
      }
    }, [editor, activeEditor])

    const pagesOptionsSyncEditorRef = useRef<typeof editor | null>(null)

    useEffect(() => {
      if (!editor || !paginationConfig) return

      if (pagesOptionsSyncEditorRef.current !== editor) {
        pagesOptionsSyncEditorRef.current = editor
        return
      }

      const commands = editor.commands as typeof editor.commands & Record<string, (...args: any[]) => boolean>
      commands.setPagesOptions?.({
        pageFormat: paginationConfig.pageFormat,
        differentFirstPage: pagesFormattingConfig.differentFirstPage,
        differentOddEven: pagesFormattingConfig.differentOddEven,
        header: pagesFormattingConfig.header,
        footer: pagesFormattingConfig.footer,
        headerFirstPage: pagesFormattingConfig.headerFirstPage ?? '',
        footerFirstPage: pagesFormattingConfig.footerFirstPage ?? '',
        headerOdd: pagesFormattingConfig.headerOdd ?? '',
        headerEven: pagesFormattingConfig.headerEven ?? '',
        footerOdd: pagesFormattingConfig.footerOdd ?? '',
        footerEven: pagesFormattingConfig.footerEven ?? '',
        headerTopMargin: pagesFormattingConfig.headerTopMargin,
        footerBottomMargin: pagesFormattingConfig.footerBottomMargin,
        accentColor: pagesFormattingConfig.accentColor,
        headerAccentColor: pagesFormattingConfig.headerAccentColor,
        footerAccentColor: pagesFormattingConfig.footerAccentColor
      })
    }, [
      editor,
      paginationConfig?.pageFormat.name,
      paginationConfig?.pageFormat.width,
      paginationConfig?.pageFormat.height,
      paginationConfig?.pageFormat.margins.top,
      paginationConfig?.pageFormat.margins.right,
      paginationConfig?.pageFormat.margins.bottom,
      paginationConfig?.pageFormat.margins.left,
      pagesFormattingConfig.accentColor,
      pagesFormattingConfig.differentFirstPage,
      pagesFormattingConfig.differentOddEven,
      pagesFormattingConfig.footer,
      pagesFormattingConfig.footerBottomMargin,
      pagesFormattingConfig.footerEven,
      pagesFormattingConfig.footerFirstPage,
      pagesFormattingConfig.footerOdd,
      pagesFormattingConfig.footerAccentColor,
      pagesFormattingConfig.header,
      pagesFormattingConfig.headerTopMargin,
      pagesFormattingConfig.headerEven,
      pagesFormattingConfig.headerFirstPage,
      pagesFormattingConfig.headerOdd,
      pagesFormattingConfig.headerAccentColor
    ])

    const previousPagesEditorTypeRef = useRef<ActivePagesEditorState['activeEditorType']>(null)

    useEffect(() => {
      const previousType = previousPagesEditorTypeRef.current
      previousPagesEditorTypeRef.current = pagesEditorState.activeEditorType

      if (previousType === null || pagesEditorState.activeEditorType !== null) {
        return
      }

      const nextPagesFormatting = getPersistedPagesFormatting(layoutFormatting.pages)
      const nextFormatting = buildPersistedFormatting(
        { ...layoutFormatting, pages: nextPagesFormatting },
        nextPagesFormatting
      )
      setLayoutFormatting(prev => {
        const previousPages = JSON.stringify(prev.pages ?? {})
        const nextPages = JSON.stringify(nextPagesFormatting ?? {})
        if (previousPages === nextPages) return prev
        return { ...prev, pages: nextPagesFormatting }
      })

      if (document?.id && isYjsSynced) {
        formattingYMap.set('formatting', nextFormatting)
      }
      if (document?.id && onPersistFormatting) {
        void onPersistFormatting(nextFormatting)
      }
    }, [
      buildPersistedFormatting,
      document?.id,
      formattingYMap,
      getPersistedPagesFormatting,
      isYjsSynced,
      layoutFormatting,
      onPersistFormatting,
      pagesEditorState.activeEditorType
    ])

    useEffect(() => {
      scheduleAutocompleteRef.current = scheduleAutocomplete
    }, [scheduleAutocomplete])

    useEffect(() => {
      autocompleteSuggestionRef.current = autocompleteSuggestion
      autocompleteCursorPosRef.current = autocompleteCursorPos
    }, [autocompleteSuggestion, autocompleteCursorPos])

    useEffect(() => {
      if (!editor) return
      const existing = AUTOCOMPLETE_PLUGIN_KEY.get(editor.state)
      if (existing) editor.unregisterPlugin(AUTOCOMPLETE_PLUGIN_KEY)

      if (
        !isAutocompleteActive ||
        !autocompleteSuggestion ||
        autocompleteCursorPos === null ||
        !editor.state.selection.empty ||
        editor.state.selection.from !== autocompleteCursorPos
      ) {
        return
      }

      const plugin = new Plugin({
        key: AUTOCOMPLETE_PLUGIN_KEY,
        props: {
          decorations(state) {
            const position = Math.min(Math.max(autocompleteCursorPos, 0), state.doc.content.size)
            const ghost = globalThis.document.createElement('span')
            ghost.className = 'document-autocomplete-ghost-text'
            ghost.textContent = autocompleteSuggestion
            return DecorationSet.create(state.doc, [
              Decoration.widget(position, ghost, {
                side: 1,
                ignoreSelection: true
              })
            ])
          }
        }
      })

      editor.registerPlugin(plugin)
      return () => {
        const activePlugin = AUTOCOMPLETE_PLUGIN_KEY.get(editor.state)
        if (activePlugin) editor.unregisterPlugin(AUTOCOMPLETE_PLUGIN_KEY)
      }
    }, [editor, isAutocompleteActive, autocompleteSuggestion, autocompleteCursorPos])

    useEffect(() => {
      if (!editor) return
      const handleSelectionUpdate = () => {
        clearAutocompleteSuggestion()
        const { from, to, empty } = editor.state.selection
        setCurrentSelectionRange(empty ? null : { from, to })
      }
      const { from, to, empty } = editor.state.selection
      setCurrentSelectionRange(empty ? null : { from, to })
      editor.on('selectionUpdate', handleSelectionUpdate)
      return () => {
        editor.off('selectionUpdate', handleSelectionUpdate)
      }
    }, [editor, clearAutocompleteSuggestion])

    useEffect(() => {
      if (!editor) return
      const existing = CURRENT_SELECTION_PLUGIN_KEY.get(editor.state)
      if (existing) {
        editor.unregisterPlugin(CURRENT_SELECTION_PLUGIN_KEY)
      }

      if (!currentSelectionRange) return

      const plugin = new Plugin({
        key: CURRENT_SELECTION_PLUGIN_KEY,
        props: {
          decorations(state) {
            const from = Math.max(0, Math.min(currentSelectionRange.from, state.doc.content.size))
            const to = Math.max(from, Math.min(currentSelectionRange.to, state.doc.content.size))
            if (from === to) return DecorationSet.empty
            return DecorationSet.create(state.doc, [
              Decoration.inline(from, to, {
                class: 'current-selection-highlight'
              })
            ])
          }
        }
      })

      editor.registerPlugin(plugin)
      return () => {
        const active = CURRENT_SELECTION_PLUGIN_KEY.get(editor.state)
        if (active) {
          editor.unregisterPlugin(CURRENT_SELECTION_PLUGIN_KEY)
        }
      }
    }, [editor, currentSelectionRange])

    // Expose insertAtCursor for template "Insert field" panel
    useImperativeHandle(
      ref,
      () => ({
        insertAtCursor(htmlOrText: string) {
          const ed = editorRef.current
          if (ed) {
            const sanitized = DOMPurify.sanitize(htmlOrText, { USE_PROFILES: { html: true } }) || ''
            if (sanitized) ed.commands.insertContent(sanitized)
          }
        }
      }),
      []
    )

    // Update editor editable state when Yjs sync status or lock changes
    useEffect(() => {
      if (!editor) return
      // For new documents (no ID), always editable if not read-only
      // For existing documents, check Yjs sync and lock status
      const shouldBeEditable = !isReadOnly && (!document?.id || (isYjsSynced && fileLock.canEdit))
      if (editor.isEditable !== shouldBeEditable) {
        editor.setEditable(shouldBeEditable)
      }
    }, [editor, isReadOnly, document?.id, isYjsSynced, fileLock.canEdit])

    // Handler for inline comment (defined after editor)
    const handleAddInlineComment = useCallback(
      (contextMenuPosition?: { x: number; y: number }, selectionRange?: { from: number; to: number }) => {
        if (!editor) return

        const from = selectionRange?.from ?? editor.state.selection.from
        const to = selectionRange?.to ?? editor.state.selection.to
        if (from === to) return // No selection

        const selectedText = editor.state.doc.textBetween(from, to, '\n\n', '\n').trim()
        const slice = editor.state.doc.slice(from, to)
        const serializer = DOMSerializer.fromSchema(editor.schema)
        const domFragment = serializer.serializeFragment(slice.content)
        const selectedContainer = globalThis.document.createElement('div')
        selectedContainer.appendChild(domFragment)
        const selectedHtml = selectedContainer.innerHTML.trim()
        const { view } = editor
        const coords = view.coordsAtPos(from)

        setPendingSelection({ from, to, text: selectedText, html: selectedHtml })
        setInlineCommentPosition({
          top: contextMenuPosition?.y ? contextMenuPosition.y + 8 : coords.top + 30,
          left: contextMenuPosition?.x ? contextMenuPosition.x + 8 : coords.left
        })
        setShowInlineCommentPopover(true)
      },
      [editor]
    )

    useEffect(() => {
      schedulePaginationRebuild(true)
      const onResize = () => schedulePaginationRebuild(true)
      globalThis.window.addEventListener('resize', onResize)
      return () => globalThis.window.removeEventListener('resize', onResize)
    }, [schedulePaginationRebuild])

    // Keep pagination model synced in edit/collaboration mode (DOM updates are async).
    useEffect(() => {
      if (!document?.id) return
      schedulePaginationRebuild(true)
    }, [document?.id, isYjsSynced, schedulePaginationRebuild])

    // Observe top-level editor DOM changes so the page model updates when pagination widgets
    // are inserted/removed, without reacting to every text-node mutation inside the document.
    useEffect(() => {
      const container = editorContainerRef.current
      if (!container) return

      // Prefer the actual editor DOM root if available.
      const root: HTMLElement | null = (editor?.view?.dom ??
        container.querySelector('.ProseMirror')) as HTMLElement | null

      if (!root) return

      const observer = new MutationObserver(() => {
        schedulePaginationRebuild(false)
      })

      observer.observe(root, {
        childList: true,
        subtree: false,
        attributes: false,
        characterData: false
      })

      schedulePaginationRebuild(true)

      return () => {
        observer.disconnect()
        if (paginationDebounceRef.current) {
          clearTimeout(paginationDebounceRef.current)
          paginationDebounceRef.current = null
        }
      }
    }, [editor, schedulePaginationRebuild])

    const scrollThrottleRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null)
    const handleScroll = useCallback(
      (e: React.UIEvent<HTMLDivElement>) => {
        const container = e.currentTarget
        if (scrollThrottleRef.current) return
        scrollThrottleRef.current = requestAnimationFrame(() => {
          scrollThrottleRef.current = null
          const { totalPages, boundaryEls } = paginationModelRef.current
          setCurrentPage(computeCurrentPageFromBoundaries(container, totalPages, boundaryEls))
        })
      },
      [computeCurrentPageFromBoundaries]
    )

    // Cleanup auto-save timeout on unmount
    useEffect(() => {
      return () => {
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current)
        }
        if (autocompleteDebounceRef.current) {
          clearTimeout(autocompleteDebounceRef.current)
        }
        autocompleteRequestControllerRef.current?.abort()
      }
    }, [])

    // Handle title changes
    const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setTitle(e.target.value)
      setHasUnsavedChanges(true)
    }, [])

    const handlePageSetupApply = useCallback(
      (nextFormatting: DocumentFormatting) => {
        setLayoutFormatting(nextFormatting)
        const persistedFormatting = buildPersistedFormatting(nextFormatting, nextFormatting.pages)
        // Sync formatting to other collaborators (edit mode only).
        if (document?.id && isYjsSynced) {
          formattingYMap.set('formatting', persistedFormatting)
        }
        if (document?.id && onPersistFormatting) {
          void onPersistFormatting(persistedFormatting)
        }
      },
      [buildPersistedFormatting, document?.id, formattingYMap, isYjsSynced, onPersistFormatting]
    )

    const openNavigationPanelTab = useCallback(
      (tab: NavigationPanelTab) => {
        setNavigationPanelTab(tab)
        setShowNavigationPanel(true)
      },
      [setShowNavigationPanel]
    )

    const openLinkDialog = useCallback(() => {
      if (!activeEditor) return
      const { from, to } = activeEditor.state.selection
      const isEmpty = from === to
      if (activeEditor.isActive('link')) {
        setLinkDialogMode('edit')
        setLinkDialogInitialValues({
          href: activeEditor.getAttributes('link').href || '',
          displayText: activeEditor.state.doc.textBetween(from, to),
          openInNewTab: activeEditor.getAttributes('link').target === '_blank'
        })
        setLinkDialogInsertWithNoSelection(false)
      } else if (isEmpty) {
        setLinkDialogMode('insert')
        setLinkDialogInitialValues({ href: '', displayText: '', openInNewTab: false })
        setLinkDialogInsertWithNoSelection(true)
      } else {
        setLinkDialogMode('insert')
        setLinkDialogInitialValues({
          href: '',
          displayText: activeEditor.state.doc.textBetween(from, to),
          openInNewTab: false
        })
        setLinkDialogInsertWithNoSelection(false)
      }
      setShowLinkDialog(true)
    }, [activeEditor])

    const handleLinkApply = useCallback(
      (values: { href: string; displayText?: string; openInNewTab: boolean }) => {
        if (!activeEditor) return
        const { href, displayText: displayTextVal, openInNewTab } = values
        if (!isAllowedHref(href)) return
        const target = openInNewTab ? '_blank' : undefined
        if (linkDialogMode === 'edit') {
          activeEditor.chain().focus().extendMarkRange('link').setLink({ href, target }).run()
          return
        }
        if (linkDialogInsertWithNoSelection) {
          const text = displayTextVal?.trim() || href
          const rel = 'noopener noreferrer'
          const targetAttr = openInNewTab ? ' target="_blank"' : ''
          const html = `<a href="${escapeHtmlAttr(href)}"${targetAttr} rel="${rel}">${escapeHtmlText(text)}</a>`
          activeEditor.chain().focus().insertContent(html).run()
          return
        }
        activeEditor.chain().focus().setLink({ href, target }).run()
      },
      [activeEditor, linkDialogMode, linkDialogInsertWithNoSelection]
    )

    const handleLinkRemove = useCallback(() => {
      if (!activeEditor) return
      activeEditor.chain().focus().extendMarkRange('link').unsetLink().run()
    }, [activeEditor])

    // Save document (pass merged formatting so layout is persisted)
    const handleSave = useCallback(async () => {
      if (isReadOnly || isSaving || !editor) return

      setIsSaving(true)
      try {
        const nextTitle = title.trim() || title
        // Keep collaborative title in sync when saving from toolbar/shortcuts
        // (e.g. when user saves without blurring the title input).
        if (document?.id && isYjsSynced) {
          metaYMap.set('title', nextTitle.trim())
        }

        const content = sanitizePaginationRuntimeHtml(editor.getHTML())
        const formatting = buildPersistedFormatting(layoutFormatting)
        await onSave(nextTitle, content, formatting)
        setLastSaved(new Date())
        setHasUnsavedChanges(false)

        // Same as Save Checkpoint: open the checkpoint modal so user can enter a description
        if (document?.id) {
          setShowCheckpointDialog(true)
        }
      } catch (error) {
        console.error('[PagedDocumentEditor] Save failed:', error)
      } finally {
        setIsSaving(false)
      }
    }, [
      title,
      editor,
      onSave,
      isReadOnly,
      isSaving,
      document?.id,
      document?.formatting,
      buildPersistedFormatting,
      isYjsSynced,
      metaYMap,
      layoutFormatting
    ])

    const lastSavedTitleRef = useRef(title)

    useEffect(() => {
      // Keep in sync when title is loaded/changed programmatically.
      lastSavedTitleRef.current = title
    }, [document?.id])

    const persistTitleIfChanged = useCallback(() => {
      if (isReadOnly) return
      if (isSaving) return

      const nextTitle = title.trim()
      if (!nextTitle) return

      if (nextTitle === lastSavedTitleRef.current) return
      lastSavedTitleRef.current = nextTitle
      setTitle(nextTitle)

      // Sync to other collaborators (edit mode only).
      if (document?.id && isYjsSynced) {
        metaYMap.set('title', nextTitle)
      }

      void handleSave()
    }, [document?.id, handleSave, isReadOnly, isSaving, isYjsSynced, metaYMap, title])

    const handleTitleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter') return
      e.preventDefault()
      e.currentTarget.blur()
    }, [])

    const handleTitleBlur = useCallback(() => {
      persistTitleIfChanged()
    }, [persistTitleIfChanged])

    useDocumentEditorShortcuts({
      onSave: () => {
        void handleSave()
      },
      onAddInlineComment: handleAddInlineComment,
      onOpenLinkDialog: openLinkDialog,
      editor: activeEditor,
      editorContainerRef
    })

    useEditorKeyboardIsolation(editorContainerRef)

    const getImageDataUrl = useImageDataUrlResolver(accessToken)

    // Build HTML with images embedded (each img src resolved to data URL so PDF/print show pictures)
    const getExportHtmlWithEmbeddedImages = useCallback(async (): Promise<string> => {
      if (!editor) return ''
      return embedImagesInHtml(editor.getHTML(), getImageDataUrl)
    }, [editor, getImageDataUrl])

    // Export to Word — CWE-79: use DOMPurify.sanitize so SAST recognizes the sanitizer
    const handleExportWord = useCallback(async () => {
      if (!editor) return
      setIsExporting(true)
      try {
        const htmlWithImages = await getExportHtmlWithEmbeddedImages()
        const safeHtml = DOMPurify.sanitize(htmlWithImages, {
          FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
          FORBID_ATTR: [],
          ALLOW_DATA_ATTR: true
        })
        await exportToWord(title, safeHtml)
      } catch (error) {
        console.error('[PagedDocumentEditor] Export to Word failed:', error)
      } finally {
        setIsExporting(false)
      }
    }, [title, editor, getExportHtmlWithEmbeddedImages])

    // Export to PDF — CWE-79: use DOMPurify.sanitize so SAST recognizes the sanitizer
    const handleExportPDF = useCallback(async () => {
      if (!editor) return
      setIsExporting(true)
      try {
        const htmlWithImages = await getExportHtmlWithEmbeddedImages()
        const safeHtml = DOMPurify.sanitize(htmlWithImages, {
          FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
          FORBID_ATTR: [],
          ALLOW_DATA_ATTR: true
        })
        await exportToPDF(title, safeHtml)
      } catch (error) {
        console.error('[PagedDocumentEditor] Export to PDF failed:', error)
      } finally {
        setIsExporting(false)
      }
    }, [title, editor, getExportHtmlWithEmbeddedImages])

    // Print document — CWE-79: use DOMPurify.sanitize so SAST recognizes the sanitizer
    const handlePrint = useCallback(async () => {
      if (!editor) return
      try {
        const htmlContent = await getExportHtmlWithEmbeddedImages()
        const safeHtml = DOMPurify.sanitize(htmlContent, {
          FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
          FORBID_ATTR: [],
          ALLOW_DATA_ATTR: true
        })
        printHtmlDocument({
          title,
          htmlContent: safeHtml,
          extraCss: `
        .page-break { page-break-after: always; break-after: page; }
        @media print { .page-break { page-break-after: always; break-after: page; height: 0; border: none; } }
      `
        })
      } catch (error) {
        console.error('[PagedDocumentEditor] Print failed:', error)
      }
    }, [title, editor, getExportHtmlWithEmbeddedImages])

    // Zoom controls
    const handleZoomIn = useCallback(() => {
      setZoom(prev => Math.min(prev + 10, 200))
    }, [])

    const handleZoomOut = useCallback(() => {
      setZoom(prev => Math.max(prev - 10, 50))
    }, [])

    const getCurrentEditorSelectionContext = useCallback(() => {
      if (!editor) return { text: '', html: '' }
      const { from, to } = editor.state.selection
      if (from === to) return { text: '', html: '' }
      const text = editor.state.doc.textBetween(from, to, '\n\n', '\n').trim()
      const slice = editor.state.doc.slice(from, to)
      const div = globalThis.document.createElement('div')
      const serializer = DOMSerializer.fromSchema(editor.schema)
      const domFragment = serializer.serializeFragment(slice.content)
      div.appendChild(domFragment)
      const selectedHtml = div.innerHTML.trim()
      return { text, html: selectedHtml }
    }, [editor])

    useEffect(() => {
      if (!editor || !showAiInstructionDialog) return

      const syncSelectionSnapshot = () => {
        const selectionContext = getCurrentEditorSelectionContext()
        setAiSelectionSnapshot(selectionContext.text)
        setAiSelectionSnapshotHtml(selectionContext.html)
      }

      // Sync immediately when panel opens, then keep it updated.
      syncSelectionSnapshot()
      editor.on('selectionUpdate', syncSelectionSnapshot)
      return () => {
        editor.off('selectionUpdate', syncSelectionSnapshot)
      }
    }, [editor, getCurrentEditorSelectionContext, showAiInstructionDialog])

    const handleAiEditClick = useCallback(() => {
      if (!document?.id) return

      const useDialogEntrypoint =
        globalThis.window !== undefined && globalThis.localStorage.getItem('document-ai-edit-entrypoint') === 'dialog'
      if (!useDialogEntrypoint) {
        setRightSidebar(prev => (prev === 'ai' ? 'closed' : 'ai'))
        return
      }

      if (showAiInstructionDialog) {
        setShowAiInstructionDialog(false)
        setAiInstruction('')
        setAiSelectionSnapshot('')
        setAiSelectionSnapshotHtml('')
        return
      }

      const selectionContext = getCurrentEditorSelectionContext()
      setAiSelectionSnapshot(selectionContext.text)
      setAiSelectionSnapshotHtml(selectionContext.html)
      setAiInstruction('')
      setShowAiInstructionDialog(true)
    }, [document?.id, getCurrentEditorSelectionContext, showAiInstructionDialog])

    const handleConfirmAiInstruction = useCallback(() => {
      if (!document?.id) return
      const trimmedInstruction = aiInstruction.trim()
      if (!trimmedInstruction) return

      const prompt = trimmedInstruction
      const additionInfo = buildDocumentEditAdditionInfo({
        documentId: document.id,
        documentTitle: title,
        selectedText: aiSelectionSnapshot,
        selectedHtml: aiSelectionSnapshotHtml,
        fullDocumentHtml: editor?.getHTML() || ''
      })

      setShowAiInstructionDialog(false)
      setAiInstruction('')
      setAiSelectionSnapshot('')
      setAiSelectionSnapshotHtml('')

      openEveryAI({ prompt, additionInfo, skills: ['Documents'] })

      // Fallback: if this shell does not handle openEveryAI events, navigate directly.
      globalThis.setTimeout(() => {
        const everyAiMounted = Boolean(globalThis.document.querySelector('[data-testid="every-ai-app"]'))
        if (!everyAiMounted) {
          navigateTo('/platform/every-ai')
        }
      }, 800)
    }, [aiInstruction, aiSelectionSnapshot, aiSelectionSnapshotHtml, document?.id, editor, title])

    const applyLatestDocumentContent = useCallback(
      async (html: string, updatedAt?: string): Promise<boolean> => {
        if (!editor) return false
        const scrollContainer = editorContainerRef.current
        const scrollTopBefore = scrollContainer?.scrollTop ?? 0
        const normalizedHtml = normalizeDocumentHtmlForEditor(html)

        try {
          suppressYjsSnapshotSaveRef.current = true
          const fragment = ydoc.getXmlFragment('default')
          ydoc.transact(() => {
            fragment.delete(0, fragment.length)
          })

          markNextPaginationHydrationDocChange(editor)
          editor.commands.setContent(normalizedHtml, { emitUpdate: true })
          await new Promise(resolve => setTimeout(resolve, 0))

          const applied = areHtmlSemanticallyEquivalent(sanitizePaginationRuntimeHtml(editor.getHTML()), normalizedHtml)

          if (applied) {
            setHasUnsavedChanges(false)
            if (updatedAt) {
              setLastSaved(new Date(updatedAt))
            }
          }
          return applied
        } finally {
          setTimeout(() => {
            suppressYjsSnapshotSaveRef.current = false
          }, 1500)
          if (scrollContainer) {
            const container = scrollContainer
            requestAnimationFrame(() => {
              container.scrollTop = scrollTopBefore
            })
          }
        }
      },
      [editor, ydoc]
    )

    const syncEditorFromLatestDocument = useCallback(async (): Promise<boolean> => {
      if (!document?.id || !editor) return false
      try {
        const latest = await DocumentApiService.getDocument(document.id, { fresh: true })
        if (!latest?.content) return false
        const latestHtml = normalizeDocumentHtmlForEditor(latest.content)
        const currentHtml = sanitizePaginationRuntimeHtml(editor.getHTML())
        if (areHtmlSemanticallyEquivalent(latestHtml, currentHtml)) return false
        return await applyLatestDocumentContent(latest.content, latest.updatedAt)
      } catch (error) {
        console.warn('[PagedDocumentEditor] Failed syncing document after AI edit', error)
        return false
      }
    }, [applyLatestDocumentContent, document?.id, editor])

    const clearEveryAiFallbackPoll = useCallback(() => {
      if (everyAiFallbackPollRef.current) {
        clearTimeout(everyAiFallbackPollRef.current)
        everyAiFallbackPollRef.current = null
      }
    }, [])

    const startEveryAiFallbackPoll = useCallback(() => {
      clearEveryAiFallbackPoll()
      // Start later to give AI time, then keep retrying until chat completion event clears polling.
      const initialDelayMs = 8000
      const repeatDelayMs = 2000
      const maxPollDurationMs = 3 * 60 * 1000
      const startedAt = Date.now()

      const runAttempt = () => {
        if (!document?.id) return
        const elapsedMs = Date.now() - startedAt
        if (elapsedMs >= maxPollDurationMs) {
          clearEveryAiFallbackPoll()
          return
        }
        void syncEditorFromLatestDocument().then(applied => {
          if (applied) {
            clearEveryAiFallbackPoll()
            return
          }

          // Keep polling until completion event arrives and clears this timer.
          everyAiFallbackPollRef.current = setTimeout(runAttempt, repeatDelayMs)
        })
      }

      everyAiFallbackPollRef.current = setTimeout(runAttempt, initialDelayMs)
    }, [clearEveryAiFallbackPoll, document?.id, syncEditorFromLatestDocument])

    useEffect(() => {
      if (!document?.id) return

      const handleEveryAiOpened = (event: Event) => {
        const customEvent = event as CustomEvent<{ type?: string; payload?: { prompt?: string } }>
        if (customEvent.detail?.type !== 'OPEN_EVERY_AI') return

        startEveryAiFallbackPoll()
      }

      globalThis.addEventListener('openEveryAI', handleEveryAiOpened)
      return () => globalThis.removeEventListener('openEveryAI', handleEveryAiOpened)
    }, [document?.id, startEveryAiFallbackPoll])

    useEffect(() => () => clearEveryAiFallbackPoll(), [clearEveryAiFallbackPoll])

    // Get word count
    const wordCount =
      editor?.storage.characterCount?.words?.() || editor?.getText().trim().split(/\s+/).filter(Boolean).length || 0

    // Get character count
    const charCount = editor?.storage.characterCount?.characters?.() || editor?.getText().length || 0

    // Format last saved time
    const formatLastSaved = (date: Date | null): string => {
      if (!date) return t('editor-status-not-saved')
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMinutes = Math.floor(diffMs / 60000)

      if (diffMinutes < 1) return t('editor-status-saved-now')
      if (diffMinutes === 1) return t('editor-status-saved-minute')
      if (diffMinutes < 60) return t('editor-status-saved-minutes', { count: diffMinutes })

      return t('editor-status-saved-at', { time: date.toLocaleTimeString() })
    }

    // Measure header + toolbar height for sidebar alignment
    const headerToolbarRef = useRef<HTMLDivElement | null>(null)
    const [measuredHeaderHeight, setMeasuredHeaderHeight] = useState(0)

    useEffect(() => {
      if (!headerToolbarRef.current) return
      const measure = () => {
        const rect = headerToolbarRef.current?.getBoundingClientRect()
        if (rect) setMeasuredHeaderHeight(rect.bottom)
      }
      measure()
      const observer = new ResizeObserver(measure)
      observer.observe(headerToolbarRef.current)
      return () => observer.disconnect()
    }, [])

    return (
      <div className="gba:flex gba:flex-col gba:h-full gba:bg-background gba:relative" data-testid={testId}>
        {/* Header */}
        <div
          ref={node => {
            headerToolbarRef.current = node
            editorChromeRef.current = node
          }}
          className="gba:border-b gba:border-border/50 gba:bg-background"
        >
          <div className="gba:px-4 gba:py-3">
            <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
              {/* Left side - Back button and title */}
              <div className="gba:flex gba:items-center gba:gap-4 gba:min-w-0 gba:flex-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onBack}
                  title={t('editor-back-title')}
                  className="gba:shrink-0"
                >
                  <ArrowLeft className="gba:w-5 gba:h-5" />
                </Button>

                <div className="gba:flex gba:items-center gba:gap-3 gba:min-w-0 gba:flex-1">
                  <div className="gba:relative gba:flex-shrink-0">
                    <div className="gba:flex gba:h-8 gba:w-8 gba:items-center gba:justify-center gba:rounded-lg gba:bg-gradient-to-br gba:from-primary gba:to-primary/70 gba:shadow-sm">
                      <FileText className="gba:h-4 gba:w-4 gba:text-primary-foreground" />
                    </div>
                  </div>
                  <div className="gba:flex gba:flex-col gba:min-w-0 gba:flex-1">
                    <Input
                      ref={titleInputRef}
                      value={title}
                      onChange={handleTitleChange}
                      onKeyDown={handleTitleKeyDown}
                      onBlur={handleTitleBlur}
                      placeholder={t('editor-title-placeholder')}
                      disabled={isReadOnly}
                      className="gba:h-auto gba:min-w-0 gba:w-full gba:border-0 gba:bg-transparent gba:p-0 gba:text-base gba:font-semibold focus-visible:gba:ring-0 focus-visible:gba:ring-offset-0"
                    />
                  </div>
                </div>

                {/* Approval Status Badge */}
                {document?.approvalRequest && <ApprovalStatusBadge approvalRequest={document.approvalRequest} />}
              </div>

              {/* Right side - Actions */}
              <div className="gba:flex gba:items-center gba:gap-2">
                {/* Collaboration presence indicator */}
                {participants.length > 0 && (
                  <PresenceIndicator
                    participants={participants}
                    maxVisible={3}
                    size="sm"
                    showLabel={false}
                    className="gba:mr-2"
                  />
                )}
                {/* Save status - main save flow (lastSaved) so user always sees "Saved" feedback */}
                <div className="gba:flex gba:items-center gba:gap-2 gba:mr-2">
                  {renderSaveStatus(isSaving, hasUnsavedChanges, lastSaved, formatLastSaved, t)}
                </div>

                <Separator orientation="vertical" className="gba:h-6" />

                {/* For new documents, show prominent save button */}
                {!document?.id && !isReadOnly && (
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    variant="default"
                    size="sm"
                    data-testid="save-new-document-button"
                    className="gba:bg-primary gba:text-primary-foreground"
                  >
                    <Save className="gba:w-4 gba:h-4 gba:mr-2" />
                    {isSaving ? t('editor-saving') : t('editor-save-document')}
                  </Button>
                )}

                {document?.id && !isReadOnly && (
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    variant="ghost"
                    size="sm"
                    title={isSaving ? t('editor-saving') : t('editor-save-document')}
                    data-testid="save-document-button"
                    className="gba:h-8"
                  >
                    <Save className="gba:w-4 gba:h-4" />
                  </Button>
                )}

                {document?.id && (
                  <>
                    {/* Comments button */}
                    <Button
                      variant={rightSidebar === 'comments' ? 'default' : 'ghost'}
                      size="sm"
                      onPointerDownCapture={() => {
                        if (rightSidebar === 'comments') return
                        const ed = activeEditorRef.current ?? editorRef.current
                        if (ed && !ed.isDestroyed) {
                          panelCommentAnchorRef.current = computePanelCommentAnchor(ed)
                        }
                      }}
                      onClick={() => setRightSidebar(prev => (prev === 'comments' ? 'closed' : 'comments'))}
                      title={t('editor-comments-title')}
                      data-testid="comments-button"
                      className="gba:h-8"
                    >
                      <MessageSquare className="gba:w-4 gba:h-4" />
                      {comments.unresolvedCount > 0 && (
                        <Badge variant="warning" className="gba:ml-1 gba:px-1 gba:py-0 gba:h-4 gba:text-xs">
                          {comments.unresolvedCount}
                        </Badge>
                      )}
                    </Button>

                    {/* Lock status indicator (compact) */}
                    {fileLock.lock?.isLocked && fileLock.isLockedByMe && (
                      <Badge variant="default" className="gba:flex gba:items-center gba:gap-1">
                        <Lock className="gba:h-3 gba:w-3" />
                        {t('editor-locked')}
                      </Badge>
                    )}

                    {/* Status badge */}
                    <StatusBadge status={publishing.metadata?.status || 'draft'} />
                  </>
                )}

                {/* Document Actions Menu (includes Export) */}
                {document?.id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <FileText className="gba:w-4 gba:h-4 gba:mr-2" />
                        {t('editor-document-menu')}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setShowVersionHistory(true)}>
                        <History className="gba:w-4 gba:h-4 gba:mr-2" />
                        {t('editor-version-history')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowCheckpointDialog(true)}>
                        <Save className="gba:w-4 gba:h-4 gba:mr-2" />
                        {t('editor-save-checkpoint')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {fileLock.isLockedByMe ? (
                        <DropdownMenuItem onClick={() => fileLock.releaseLock()}>
                          <Unlock className="gba:w-4 gba:h-4 gba:mr-2" />
                          {t('editor-unlock-document')}
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => fileLock.acquireLock()}>
                          <Lock className="gba:w-4 gba:h-4 gba:mr-2" />
                          {t('editor-lock-document')}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setShowPublishDialog(true)}>
                        <Upload className="gba:w-4 gba:h-4 gba:mr-2" />
                        {t('editor-publish')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowPageSetupDialog(true)} data-testid="page-setup-button">
                        <LayoutPanelLeft className="gba:w-4 gba:h-4 gba:mr-2" />
                        {t('page-setup-title')}
                      </DropdownMenuItem>
                      {onSaveAsTemplate && (
                        <DropdownMenuItem
                          onClick={() =>
                            editor && onSaveAsTemplate(title, sanitizePaginationRuntimeHtml(editor.getHTML()))
                          }
                        >
                          <BookTemplate className="gba:w-4 gba:h-4 gba:mr-2" />
                          {t('editor-save-template')}
                        </DropdownMenuItem>
                      )}
                      {onSendForApproval && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={onSendForApproval}>
                            <Send className="gba:w-4 gba:h-4 gba:mr-2" />
                            {t('editor-send-for-approval')}
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleExportWord} disabled={isExporting}>
                        <FileDown className="gba:w-4 gba:h-4 gba:mr-2" />
                        {t('editor-export-word')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleExportPDF} disabled={isExporting}>
                        <FileDown className="gba:w-4 gba:h-4 gba:mr-2" />
                        {t('editor-export-pdf')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handlePrint}>
                        <Printer className="gba:w-4 gba:h-4 gba:mr-2" />
                        {t('editor-print')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {document?.id && (
                  <AiButton
                    size="sm"
                    showIcon
                    icon={<Wand2 className="gba:w-4 gba:h-4" />}
                    iconPosition="before"
                    onClick={handleAiEditClick}
                    data-testid="ai-edit-button"
                  >
                    {t('editor-ai-edit')}
                  </AiButton>
                )}
              </div>
            </div>
          </div>

          {headerExtra && <div className="gba:px-4 gba:pb-3">{headerExtra}</div>}

          {isHeaderFooterEditing && (
            <div className="gba:border-t gba:border-border/50 gba:bg-muted/20 gba:px-4 gba:py-1.5">
              <div className="gba:flex gba:items-center gba:justify-between gba:gap-3">
                <div className="gba:flex gba:min-w-0 gba:items-center gba:gap-2 gba:text-xs gba:text-muted-foreground">
                  <span className="gba:h-2 gba:w-2 gba:flex-shrink-0 gba:rounded-full gba:bg-primary/70" />
                  <span className="gba:truncate gba:text-sm gba:font-medium gba:text-foreground">
                    {pagesEditorState.activeEditorType === 'header'
                      ? t('editor-header-footer-editing-header', {
                          page: pagesEditorState.activePageNumber ?? 1
                        })
                      : t('editor-header-footer-editing-footer', {
                          page: pagesEditorState.activePageNumber ?? 1
                        })}
                  </span>
                  <span className="gba:hidden lg:gba:inline gba:truncate">
                    {t('editor-header-footer-mode-description')}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gba:h-8 gba:px-2 gba:text-primary hover:gba:text-primary"
                  onClick={() => editor?.commands.closeHeaderFooterEditors()}
                  data-testid="document-header-footer-close-mode"
                >
                  {t('editor-header-footer-close')}
                </Button>
              </div>
            </div>
          )}

          <EditorToolbar
            editor={activeEditor}
            onOpenLinkDialog={openLinkDialog}
            onOpenInsertImageDialog={() => setShowInsertImageDialog(true)}
            onOpenInsertTableDialog={() => setShowInsertTableDialog(true)}
            onOpenFind={() => openNavigationPanelTab('find')}
            onOpenReplace={() => openNavigationPanelTab('replace')}
            data-testid={`${testId}-toolbar`}
          />
        </div>

        {/* Main content: Navigation panel, or expand strip + optional template panel, then editor */}
        <div className="gba:flex gba:flex-1 gba:min-h-0 gba:flex-row">
          {showNavigationPanel ? (
            <div className="gba:flex-shrink-0 gba:w-64 gba:min-h-0 gba:flex gba:flex-col gba:overflow-hidden">
              <NavigationPanel
                editor={editor}
                requestedTab={navigationPanelTab}
                onClose={() => {
                  setShowNavigationPanel(false)
                  editor?.commands.clearSearchHighlights?.()
                }}
                data-testid={`${testId}-navigation-panel`}
              />
            </div>
          ) : (
            <>
              {/* Expand strip: icon-only button when navigation is collapsed (nicer, no text) */}
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => openNavigationPanelTab('headings')}
                title={t('navigation-panel-show')}
                aria-label={t('navigation-panel-show')}
                data-testid="navigation-panel-expand"
                className="gba:flex-shrink-0 gba:h-full gba:rounded-none gba:border-r gba:border-y-0 gba:border-l-0 gba:w-10 gba:min-w-10"
              >
                <ChevronRight className="gba:h-5 gba:w-5" aria-hidden />
              </Button>
              {leftPanel ? (
                <div className="gba:flex-shrink-0 gba:w-64 gba:min-h-0 gba:flex gba:flex-col gba:overflow-hidden">
                  {leftPanel}
                </div>
              ) : null}
            </>
          )}
          {/* Editor Area with Page Layout - background matches page gap for consistent document canvas */}
          <div
            ref={editorContainerRef}
            className="gba:flex-1 gba:overflow-auto gba:min-w-0 document-editor-viewport"
            onScroll={handleScroll}
          >
            <div className="gba:flex gba:justify-center gba:py-8" style={{ minHeight: '100%' }}>
              <div
                className="paged-document-editor"
                style={{
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: 'top center'
                }}
              >
                <EditorContent editor={editor} className="editor-content" />
                {editor && (
                  <BubbleMenu
                    editor={editor}
                    shouldShow={({ editor: e }) => e.isActive('link')}
                    pluginKey="linkBubbleMenu"
                  >
                    <LinkBubbleMenu editor={editor} onEdit={openLinkDialog} data-testid="document-link-bubble-menu" />
                  </BubbleMenu>
                )}
                {/* Cursors/selections are rendered by Yjs cursor plugin inside the editor. */}
              </div>
            </div>
          </div>
        </div>

        <DocumentBottomBar
          zoom={zoom}
          wordCount={wordCount}
          charCount={charCount}
          currentPage={pagesEditorState.activePageNumber ?? Math.min(currentPage, pageCount)}
          pageCount={pageCount}
          onZoomOut={handleZoomOut}
          onZoomChange={setZoom}
          onZoomIn={handleZoomIn}
          data-testid={`${testId}-bottom-bar`}
        />

        {document?.id && showAiInstructionDialog && (
          <div className="gba:absolute gba:top-24 gba:right-6 gba:z-30 gba:pointer-events-none">
            <div
              className="gba:pointer-events-auto gba:w-[420px] gba:max-w-[calc(100vw-3rem)] gba:rounded-md gba:border gba:bg-background gba:p-3 gba:space-y-2 gba:shadow-lg"
              data-testid="document-ai-instruction-inline"
            >
              <Label htmlFor="document-ai-instruction-input">Instruction</Label>
              <Textarea
                id="document-ai-instruction-input"
                value={aiInstruction}
                onChange={e => setAiInstruction(e.target.value)}
                onInput={e => {
                  const textarea = e.currentTarget
                  textarea.style.height = 'auto'
                  textarea.style.height = `${Math.min(textarea.scrollHeight, 220)}px`
                }}
                onKeyDown={e => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && aiInstruction.trim()) {
                    e.preventDefault()
                    handleConfirmAiInstruction()
                  }
                }}
                placeholder="Example: rewrite this in a more formal tone and fix grammar mistakes."
                rows={4}
                className="gba:min-h-[96px] gba:max-h-[220px] gba:overflow-y-auto"
                autoFocus
                data-testid="document-ai-instruction-input"
              />
              {aiSelectionPreviewText && (
                <div className="gba:space-y-1">
                  <p className="gba:text-xs gba:text-muted-foreground" data-testid="document-ai-selection-hint">
                    Selection detected. Edits will focus on this content unless you say otherwise.
                  </p>
                  <button
                    type="button"
                    className={`gba:overflow-y-auto gba:rounded-md gba:border gba:bg-muted/30 gba:px-2 gba:py-1 gba:text-xs gba:text-muted-foreground gba:text-left gba:w-full gba:appearance-none ${
                      isAiSelectionPreviewExpanded ? 'gba:max-h-52' : 'gba:max-h-24'
                    } ${hasLongAiSelectionPreview ? 'gba:cursor-pointer' : ''}`}
                    data-testid="document-ai-selection-preview"
                    onDoubleClick={() => {
                      if (hasLongAiSelectionPreview) {
                        setIsAiSelectionPreviewExpanded(prev => !prev)
                      }
                    }}
                    title={hasLongAiSelectionPreview ? 'Double-click to expand/collapse preview' : undefined}
                  >
                    <div className="gba:whitespace-pre-wrap">{aiSelectionPreviewText}</div>
                  </button>
                  {hasLongAiSelectionPreview && (
                    <p className="gba:text-[10px] gba:text-muted-foreground">
                      Double-click to {isAiSelectionPreviewExpanded ? 'collapse' : 'expand'}.
                    </p>
                  )}
                </div>
              )}
              <div className="gba:flex gba:justify-end gba:gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAiInstructionDialog(false)
                    setAiInstruction('')
                    setAiSelectionSnapshot('')
                    setAiSelectionSnapshotHtml('')
                  }}
                >
                  Close
                </Button>
                <Button
                  onClick={handleConfirmAiInstruction}
                  disabled={!aiInstruction.trim()}
                  data-testid="document-ai-instruction-confirm"
                >
                  Submit
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Editor Styles — viewport/canvas: light gray; pages: white */}
        <style>{`
        .document-editor-viewport {
          background-color: #f3f4f6;
        }
        /* Base defaults; font-family/font-size from toolbar (textStyle marks) override via inline styles */
        .paged-document-editor .ProseMirror {
          outline: none;
          background-color: ${pageColor};
          font-family: 'Times New Roman', Georgia, serif;
          font-size: 16px;
          line-height: 1.15;
          color: #1a1a1a;
          min-height: ${paginationConfig ? paginationConfig.pageHeight - paginationConfig.marginTop - paginationConfig.marginBottom : 400}px;
        }

        .paged-document-editor .ProseMirror .editor-link {
          color: var(--nw-primary);
          text-decoration: underline;
          cursor: pointer;
        }
        .paged-document-editor .ProseMirror .navigation-search-highlight {
          background: color-mix(in srgb, var(--nw-primary) 22%, transparent);
          border-radius: 2px;
        }
        .paged-document-editor .ProseMirror .navigation-search-highlight-current {
          background: color-mix(in srgb, var(--nw-primary) 45%, transparent);
          border-radius: 2px;
          outline: 2px solid var(--nw-primary);
          outline-offset: 1px;
        }

        .paged-document-editor .ProseMirror p {
          margin: 0;
        }

        /* Lists (Tailwind preflight resets list-style to none) */
        .paged-document-editor .ProseMirror ol {
          list-style: decimal;
          list-style-position: outside;
          padding-inline-start: 24pt;
          margin: 0 0 12pt 0;
        }

        .paged-document-editor .ProseMirror ul {
          list-style: disc;
          list-style-position: outside;
          padding-inline-start: 24pt;
          margin: 0 0 12pt 0;
        }

        /* Task list: no bullets, checkbox per item (NodeView uses .editor-task-item) */
        .paged-document-editor .ProseMirror ul[data-type="taskList"] {
          list-style: none;
          padding-inline-start: 24pt;
        }
        .paged-document-editor .ProseMirror li.editor-task-item,
        .paged-document-editor .ProseMirror li[data-type="taskItem"] {
          display: flex;
          align-items: flex-start;
          gap: 8pt;
        }
        .paged-document-editor .ProseMirror li.editor-task-item > label,
        .paged-document-editor .ProseMirror li[data-type="taskItem"] > label {
          flex-shrink: 0;
          cursor: pointer;
          margin: 0.2em 0 0 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .paged-document-editor .ProseMirror li.editor-task-item > label input[type="checkbox"],
        .paged-document-editor .ProseMirror li[data-type="taskItem"] > label input[type="checkbox"] {
          cursor: pointer;
          width: 1em;
          height: 1em;
          margin: 0;
        }
        .paged-document-editor .ProseMirror li.editor-task-item > div,
        .paged-document-editor .ProseMirror li[data-type="taskItem"] > div {
          flex: 1;
          min-width: 0;
        }
        .paged-document-editor .ProseMirror li.editor-task-item[data-checked="true"] > div,
        .paged-document-editor .ProseMirror li[data-type="taskItem"][data-checked="true"] > div {
          text-decoration: line-through;
          color: var(--nw-muted-foreground, #6b7280);
        }

        .paged-document-editor .ProseMirror li {
          margin: 0 0 6pt 0;
        }

        /* TipTap often wraps list-item text in <p>. Keep it inline so markers align nicely. */
        .paged-document-editor .ProseMirror li > p {
          display: inline;
          margin: 0;
        }

        .document-ai-selection-preview-content ul {
          list-style: disc;
          list-style-position: outside;
          padding-left: 1.25rem;
          margin: 0.25rem 0;
        }

        .document-ai-selection-preview-content ol {
          list-style: decimal;
          list-style-position: outside;
          padding-left: 1.25rem;
          margin: 0.25rem 0;
        }

        .document-ai-selection-preview-content li {
          margin: 0.15rem 0;
        }

        .document-ai-selection-preview-content li > p {
          display: inline;
          margin: 0;
        }

        .paged-document-editor .ProseMirror h1 {
          font-size: 2rem;
          font-weight: 700;
          margin: 0 0 16pt 0;
          line-height: 1.2;
        }

        .paged-document-editor .ProseMirror h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 20pt 0 12pt 0;
          line-height: 1.3;
        }

        .paged-document-editor .ProseMirror h3 {
          font-size: 1.125rem;
          font-weight: 600;
          margin: 16pt 0 10pt 0;
          line-height: 1.4;
        }

        .paged-document-editor .ProseMirror h4,
        .paged-document-editor .ProseMirror h5,
        .paged-document-editor .ProseMirror h6 {
          font-size: 1rem;
          font-weight: 600;
          margin: 14pt 0 8pt 0;
        }

        .paged-document-editor .ProseMirror ul,
        .paged-document-editor .ProseMirror ol {
          padding-left: 24pt;
          margin: 0 0 10pt 0;
        }

        .paged-document-editor .ProseMirror li {
          margin-bottom: 4pt;
        }

        .paged-document-editor .ProseMirror blockquote {
          border-left: 3pt solid #d0d0d0;
          padding-left: 16pt;
          margin: 16pt 0;
          color: #555;
          font-style: italic;
        }

        .paged-document-editor .ProseMirror pre {
          background: #f5f5f5;
          border: 1pt solid #e0e0e0;
          border-radius: 4pt;
          padding: 12pt;
          overflow-x: auto;
          font-family: 'Courier New', monospace;
          font-size: 0.875rem;
          margin: 12pt 0;
        }

        .paged-document-editor .ProseMirror code {
          background: #f0f0f0;
          padding: 2pt 4pt;
          border-radius: 2pt;
          font-family: 'Courier New', monospace;
          font-size: 0.875rem;
        }

        .paged-document-editor .ProseMirror a {
          color: #0066cc;
          text-decoration: underline;
        }

        .paged-document-editor .ProseMirror img {
          max-width: 100%;
          height: auto;
          margin: 0;
          vertical-align: bottom;
          border-radius: 4pt;
        }
        .paged-document-editor .ProseMirror .editor-image {
          margin: 0;
        }

        /* Tables: print-first (no horizontal scrolling) */
        .paged-document-editor .ProseMirror .tableWrapper {
          overflow: visible;
          margin: 0;
          border: 0;
          border-radius: 0;
          background: transparent;
        }

        .paged-document-editor .ProseMirror table {
          border-collapse: collapse;
          max-width: 100%;
          table-layout: fixed;
          margin: 16pt 0;
          background: #fff;
          border: 1pt solid #d0d0d0;
          border-radius: 4pt;
          break-inside: auto;
          page-break-inside: auto;
        }

        .paged-document-editor .ProseMirror td,
        .paged-document-editor .ProseMirror th {
          border: 1pt solid #333;
          padding: 4pt 6pt;
          text-align: start;
          vertical-align: top;
          font-size: 0.875rem;
          line-height: 1.3;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .paged-document-editor .ProseMirror th {
          background: #f5f5f5;
          font-weight: bold;
        }

        /* Let header rows behave nicely in print/page flows */
        .paged-document-editor .ProseMirror thead {
          display: table-header-group;
        }

        .paged-document-editor .ProseMirror tr {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .paged-document-editor .ProseMirror hr {
          border: none;
          border-top: 1pt solid #d0d0d0;
          margin: 20pt 0;
        }

        /* Page break styling */
        .paged-document-editor .ProseMirror .page-break {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 40pt 0;
          padding: 20pt 0;
          user-select: none;
          cursor: default;
        }

        .paged-document-editor .ProseMirror .page-break .page-break-line {
          position: absolute;
          left: 0;
          right: 0;
          height: 0;
          border-top: 2px dashed #ccc;
        }

        .paged-document-editor .ProseMirror .page-break .page-break-label {
          position: relative;
          background: white;
          padding: 4pt 12pt;
          font-size: 0.75rem;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 1pt;
          border: 1pt solid #ddd;
          border-radius: 4pt;
        }

        /* Placeholder styling */
        .paged-document-editor .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #aaa;
          pointer-events: none;
          height: 0;
          font-style: italic;
        }

        /* Selection styling */
        .paged-document-editor .ProseMirror ::selection {
          background: #b4d5fe;
        }

        /* AI selection highlight (persistent decoration while AI panel is open) */
        .paged-document-editor .ProseMirror .ai-selection-highlight {
          background: rgba(139, 180, 254, 0.35);
          border-bottom: 2px solid rgba(99, 140, 230, 0.6);
          border-radius: 2px;
          transition: background 0.2s ease;
        }

        /* Subtle live selection decoration (non-invasive) */
        .paged-document-editor .ProseMirror .current-selection-highlight {
          background: rgba(147, 197, 253, 0.22);
          border-bottom: 1px solid rgba(59, 130, 246, 0.35);
          border-radius: 2px;
        }

        .paged-document-editor .ProseMirror .document-autocomplete-ghost-text {
          color: #9ca3af;
          opacity: 0.9;
          user-select: none;
          pointer-events: none;
          white-space: pre-wrap;
        }

        /* Table resize handles */
        .paged-document-editor .ProseMirror .selectedCell:after {
          z-index: 2;
          position: absolute;
          content: "";
          left: 0;
          right: 0;
          top: 0;
          bottom: 0;
          background: rgba(200, 200, 255, 0.4);
          pointer-events: none;
        }

        .paged-document-editor .ProseMirror .column-resize-handle {
          position: absolute;
          right: -2px;
          top: 0;
          bottom: -2px;
          width: 4px;
          background-color: #adf;
          pointer-events: none;
        }

        /* Print styles */
        @media print {
          .paged-document-editor .ProseMirror .page-break {
            page-break-after: always;
            break-after: page;
            border: none;
            margin: 0;
            padding: 0;
            height: 0;
          }

          .paged-document-editor .ProseMirror .page-break .page-break-line,
          .paged-document-editor .ProseMirror .page-break .page-break-label {
            display: none;
          }
        }
      `}</style>

        {/* Versioning Dialogs */}
        {document?.id && showVersionHistory && (
          <VersionHistory
            versions={versioning.versions}
            isLoading={versioning.isLoading}
            userDisplayMap={versionUserDisplayMap}
            onRestore={async versionNumber => {
              // Get the version data first
              const versionData = await DocumentApiService.getVersion(document.id, versionNumber)

              if (!versionData) {
                console.error('[PagedDocumentEditor] Failed to get version data')
                return
              }

              // Now restore on backend
              const success = await versioning.restoreVersion(versionNumber)

              if (success && editor && versionData.content) {
                markNextPaginationHydrationDocChange(editor)
                editor.commands.setContent(normalizeDocumentHtmlForEditor(versionData.content))
                setTitle(versionData.title)
                setHasUnsavedChanges(false)
                setLastSaved(new Date())

                // Reload versions to show the new "Restored" checkpoint
                await versioning.loadVersions()

                // Close the dialog
                setShowVersionHistory(false)
              }
            }}
            onClose={() => setShowVersionHistory(false)}
            currentVersion={versioning.currentVersion?.version}
            showAutoSaves={false}
            data-testid="document-version-history"
          />
        )}

        {document?.id && showCheckpointDialog && (
          <CheckpointDialog
            isOpen={showCheckpointDialog}
            onClose={() => setShowCheckpointDialog(false)}
            onSave={async description => {
              await versioning.createCheckpoint(description)
            }}
            isSaving={versioning.isSaving}
            data-testid="document-checkpoint-dialog"
          />
        )}

        {document?.id && showPublishDialog && (
          <PublishDialog
            isOpen={showPublishDialog}
            onClose={() => setShowPublishDialog(false)}
            onPublish={async (publishNotes, createCheckpoint) => {
              await publishing.publish(publishNotes, createCheckpoint)
            }}
            isPublishing={publishing.isPublishing}
            entityType="document"
            data-testid="document-publish-dialog"
          />
        )}

        {showPageSetupDialog && (
          <PageSetupDialog
            open={showPageSetupDialog}
            onOpenChange={setShowPageSetupDialog}
            formatting={layoutFormatting}
            onApply={handlePageSetupApply}
            data-testid="document-page-setup-dialog"
          />
        )}

        {showInsertImageDialog && activeEditor && (
          <InsertImageDialog
            open={showInsertImageDialog}
            onOpenChange={setShowInsertImageDialog}
            editor={activeEditor}
            documentId={document?.id ?? null}
            accessToken={accessToken}
            data-testid="document-insert-image-dialog"
          />
        )}

        {showInsertTableDialog && activeEditor && (
          <InsertTableDialog
            open={showInsertTableDialog}
            onOpenChange={setShowInsertTableDialog}
            editor={activeEditor}
            data-testid="document-insert-table-dialog"
          />
        )}

        {showLinkDialog && (
          <LinkDialog
            open={showLinkDialog}
            onOpenChange={setShowLinkDialog}
            mode={linkDialogMode}
            initialValues={linkDialogInitialValues}
            onApply={handleLinkApply}
            onRemoveLink={linkDialogMode === 'edit' ? handleLinkRemove : undefined}
            data-testid="document-link-dialog"
          />
        )}

        {document?.id && rightSidebar === 'comments' && (
          <CommentPanel
            comments={comments.comments}
            messages={{
              title: t('shared-comment-panel-title'),
              unresolvedCount: t('shared-comment-unresolved'),
              unresolvedTab: t('shared-comment-unresolved-tab'),
              resolvedTab: t('shared-comment-resolved-tab'),
              allCaughtUp: t('shared-comment-all-caught-up'),
              allResolved: t('shared-comment-all-resolved'),
              noResolved: t('shared-comment-no-resolved'),
              resolvedHere: t('shared-comment-resolved-here'),
              loading: t('shared-comment-loading'),
              addPlaceholder: t('shared-comment-placeholder')
            }}
            threadMessages={{
              reply: t('shared-comment-reply'),
              edit: t('shared-comment-edit'),
              resolve: t('shared-comment-resolve'),
              delete: t('shared-comment-delete'),
              resolved: t('shared-comment-resolved'),
              confirmDelete: t('shared-comment-confirm-delete'),
              editPlaceholder: t('shared-comment-edit-placeholder'),
              replyPlaceholder: t('shared-comment-reply-placeholder')
            }}
            editorMessages={{
              cancel: t('shared-comment-cancel'),
              send: t('shared-comment-send'),
              sending: t('shared-comment-sending'),
              sendHint: t('shared-comment-send-hint')
            }}
            unresolvedCount={comments.unresolvedCount}
            isLoading={comments.isLoading}
            onCreateComment={async (content, parentId) => {
              if (parentId) {
                await comments.createComment({
                  type: 'document',
                  content,
                  parentId,
                  createdByName: currentUserName || undefined,
                  createdByAvatar: currentUserAvatar || undefined
                })
                return
              }

              const anchor = panelCommentAnchorRef.current
              const ed = anchor?.editor
              const docSize = ed && !ed.isDestroyed ? ed.state.doc.content.size : 0
              const hasAnchor =
                anchor && ed && !ed.isDestroyed && anchor.from < anchor.to && anchor.from >= 0 && anchor.to <= docSize

              if (hasAnchor && ed) {
                const from = Math.max(0, Math.min(anchor.from, docSize))
                const to = Math.max(from, Math.min(anchor.to, docSize))
                if (to <= from) {
                  await comments.createComment({
                    type: 'document',
                    content,
                    createdByName: currentUserName || undefined,
                    createdByAvatar: currentUserAvatar || undefined
                  })
                  return
                }
                const selectedText = anchor.selectedText?.trim() || ed.state.doc.textBetween(from, to, '\n', ' ')
                const comment = await comments.createComment({
                  type: 'inline',
                  content,
                  selectionStart: from,
                  selectionEnd: to,
                  selectedText,
                  createdByName: currentUserName || undefined,
                  createdByAvatar: currentUserAvatar || undefined
                })
                if (comment) {
                  ed.chain()
                    .focus()
                    .setTextSelection({ from, to })
                    .setInlineComment({
                      commentId: comment.id,
                      commentType: 'inline',
                      createdBy: currentUserId || '',
                      createdAt: comment.createdAt
                    })
                    .run()
                }
                return
              }

              await comments.createComment({
                type: 'document',
                content,
                createdByName: currentUserName || undefined,
                createdByAvatar: currentUserAvatar || undefined
              })
            }}
            onUpdateComment={async (commentId, content) => {
              await comments.updateComment(commentId, { content })
            }}
            onResolveComment={async commentId => {
              await comments.resolveComment(commentId)
            }}
            onDeleteComment={async commentId => {
              await comments.deleteComment(commentId)
            }}
            onClose={() => setRightSidebar('closed')}
            currentUserId={currentUserId || undefined}
            currentUserName={currentUserName || undefined}
            currentUserAvatar={currentUserAvatar || undefined}
            accessToken={accessToken}
            headerHeight={measuredHeaderHeight || 120}
            onUnhighlight={commentId => {
              if (!editor) return
              const c = comments.comments.find(x => x.id === commentId)
              const selection = findInlineCommentSelection(editor, commentId, c)
              if (!selection) return
              editor.chain().setTextSelection(selection).unsetInlineComment().run()
            }}
            onScrollToHighlight={commentId => {
              if (!editor) return
              const c = comments.comments.find(x => x.id === commentId)
              const selection = findInlineCommentSelection(editor, commentId, c)
              if (!selection) return
              editor.chain().setTextSelection(selection).focus().run()
              setTimeout(() => scrollInlineCommentRangeIntoView(editor, selection.from, selection.to, commentId), 50)
            }}
            data-testid="document-comment-panel"
          />
        )}

        {document?.id && rightSidebar === 'ai' && (
          <AiEditPanel
            editor={editor}
            documentId={document.id}
            documentTitle={title}
            onClose={() => setRightSidebar('closed')}
            currentUserId={currentUserId || undefined}
            headerHeight={measuredHeaderHeight || 120}
            data-testid="document-ai-edit-panel"
          />
        )}

        {/* Inline comment popover (Google Docs style) */}
        <InlineCommentPopover
          isOpen={showInlineCommentPopover}
          position={inlineCommentPosition}
          onEditWithAI={() => {
            if (!pendingSelection) return
            setAiSelectionSnapshot(pendingSelection.text)
            setAiSelectionSnapshotHtml(pendingSelection.html)
            setAiInstruction('')
            setShowAiInstructionDialog(true)
            setShowInlineCommentPopover(false)
            setPendingSelection(null)
          }}
          messages={{
            addComment: t('shared-comment-add'),
            placeholder: t('shared-comment-placeholder'),
            comment: t('shared-comment-button')
          }}
          onSubmit={async content => {
            if (!pendingSelection || !editor) return

            const comment = await comments.createComment({
              type: 'inline',
              content,
              selectionStart: pendingSelection.from,
              selectionEnd: pendingSelection.to,
              selectedText: pendingSelection.text,
              createdByName: currentUserName || undefined,
              createdByAvatar: currentUserAvatar || undefined
            })

            if (comment) {
              // Highlight the text with comment marker
              editor
                .chain()
                .focus()
                .setInlineComment({
                  commentId: comment.id,
                  commentType: 'inline',
                  createdBy: currentUserId || '',
                  createdAt: comment.createdAt
                })
                .run()
            }

            setPendingSelection(null)
          }}
          onClose={() => {
            setShowInlineCommentPopover(false)
            setPendingSelection(null)
          }}
          data-testid="document-inline-comment-popover"
        />
      </div>
    )
  }
)

export default PagedDocumentEditor
