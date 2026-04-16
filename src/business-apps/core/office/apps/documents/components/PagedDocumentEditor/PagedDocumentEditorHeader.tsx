import { useRef } from 'react'
import type { ChangeEventHandler, FocusEventHandler, KeyboardEventHandler, MouseEventHandler, ReactNode } from 'react'
import type { Editor as TiptapEditor } from '@tiptap/react'
import {
  AiButton,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Separator
} from '@newwork/nw-design-system'
import {
  ArrowLeft,
  BookTemplate,
  FileDown,
  FileText,
  History,
  LayoutPanelLeft,
  Lock,
  MessageSquare,
  Printer,
  Save,
  Send,
  Unlock,
  Upload,
  Wand2
} from 'lucide-react'
import type { Document, DocumentApprovalRequest } from '../../types'
import type { PageLayoutPaginationConfig } from '../../utils/pageLayoutUtils'
import { PresenceIndicator } from '@/business-apps/platform/apps/shared/components/PresenceIndicator'
import { StatusBadge } from '@/business-apps/platform/apps/shared/components/StatusBadge'
import { EditorToolbar } from './EditorToolbar'
import { ApprovalStatusBadge, SaveStatusIndicator } from './PagedDocumentEditorHeaderStatus'
import type { RightSidebar } from './hooks/usePagedDocumentInteractionDialogs'

export interface PagedDocumentEditorHeaderProps {
  document?: Document
  paginationConfig?: PageLayoutPaginationConfig | null
  title: string
  isReadOnly: boolean
  isTrashedDocument: boolean
  isSaving: boolean
  isExporting: boolean
  hasUnsavedChanges: boolean
  lastSaved: Date | null
  participants: React.ComponentProps<typeof PresenceIndicator>['participants']
  unresolvedCommentCount: number
  rightSidebar: RightSidebar
  publishingStatus: string
  setHeaderChromeNode: (node: HTMLDivElement | null) => void
  onBack: () => void
  onTitleChange: ChangeEventHandler<HTMLInputElement>
  onTitleKeyDown: KeyboardEventHandler<HTMLInputElement>
  onTitleBlur: () => void
  onSave: () => void
  onCommentsButtonPointerDown: () => void
  onToggleCommentsSidebar: () => void
  onOpenVersionHistory: () => void
  onOpenCheckpointDialog: () => void
  onAcquireLock: () => void
  onReleaseLock: () => void
  onOpenPublishDialog: () => void
  onOpenPageSetupDialog: () => void
  onSaveAsTemplate?: () => void
  onSendForApproval?: () => void
  onExportWord: () => void
  onExportPDF: () => void
  onPrint: () => void
  onAiEditClick: () => void
  activeEditor: TiptapEditor | null
  canOpenPageNumbersDialog: boolean
  onOpenLinkDialog: () => void
  onOpenInsertImageDialog: () => void
  onOpenInsertSignatureDialog?: () => void
  onOpenInsertTableDialog: () => void
  onOpenTableSidebar: () => void
  onOpenPageNumbersDialog: () => void
  onOpenFind: () => void
  onOpenReplace: () => void
  onTranslate: (key: string, vars?: Record<string, string | number>) => string
  headerExtra?: ReactNode
  approvalRequest?: DocumentApprovalRequest
  isLocked: boolean
  isLockedByMe: boolean
  testId: string
}

export function PagedDocumentEditorHeader({
  document,
  paginationConfig = null,
  title,
  isReadOnly,
  isTrashedDocument,
  isSaving,
  isExporting,
  hasUnsavedChanges,
  lastSaved,
  participants,
  unresolvedCommentCount,
  rightSidebar,
  publishingStatus,
  setHeaderChromeNode,
  onBack,
  onTitleChange,
  onTitleKeyDown,
  onTitleBlur,
  onSave,
  onCommentsButtonPointerDown,
  onToggleCommentsSidebar,
  onOpenVersionHistory,
  onOpenCheckpointDialog,
  onAcquireLock,
  onReleaseLock,
  onOpenPublishDialog,
  onOpenPageSetupDialog,
  onSaveAsTemplate,
  onSendForApproval,
  onExportWord,
  onExportPDF,
  onPrint,
  onAiEditClick,
  activeEditor,
  canOpenPageNumbersDialog,
  onOpenLinkDialog,
  onOpenInsertImageDialog,
  onOpenInsertSignatureDialog,
  onOpenInsertTableDialog,
  onOpenTableSidebar,
  onOpenPageNumbersDialog,
  onOpenFind,
  onOpenReplace,
  onTranslate,
  headerExtra,
  approvalRequest,
  isLocked,
  isLockedByMe,
  testId
}: Readonly<PagedDocumentEditorHeaderProps>) {
  /**
   * After mousedown+focus+select on a previously unfocused title, the same gesture's mouseup can still
   * move the caret in some browsers. We preventDefault on that one mouseup only.
   * When the field is already focused, clear the flag so a click can collapse the selection normally.
   */
  const blockNextTitleMouseUpRef = useRef(false)
  const titleSelectDoneInMouseDownRef = useRef(false)

  const handleTitleMouseDown: MouseEventHandler<HTMLInputElement> = event => {
    if (isReadOnly) {
      return
    }
    const input = event.currentTarget
    if (document.activeElement === input) {
      blockNextTitleMouseUpRef.current = false
      return
    }
    event.preventDefault()
    input.focus()
    input.select()
    blockNextTitleMouseUpRef.current = true
    titleSelectDoneInMouseDownRef.current = true
  }

  const handleTitleMouseUp: MouseEventHandler<HTMLInputElement> = event => {
    if (!blockNextTitleMouseUpRef.current) {
      return
    }
    blockNextTitleMouseUpRef.current = false
    event.preventDefault()
  }

  /** Tab / programmatic focus: select all. Skip when mousedown already focused + selected. */
  const handleTitleFocus: FocusEventHandler<HTMLInputElement> = event => {
    if (isReadOnly) {
      return
    }
    if (titleSelectDoneInMouseDownRef.current) {
      titleSelectDoneInMouseDownRef.current = false
      return
    }
    event.currentTarget.select()
  }

  const handleTitleBlur = () => {
    blockNextTitleMouseUpRef.current = false
    titleSelectDoneInMouseDownRef.current = false
    onTitleBlur()
  }

  return (
    <div ref={setHeaderChromeNode} className="gba:border-b gba:border-border/50 gba:bg-background">
      <div className="gba:px-4 gba:py-3">
        <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
          <div className="gba:flex gba:items-center gba:gap-4 gba:min-w-0 gba:flex-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              title={onTranslate('editor-back-title')}
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
                  value={title}
                  onChange={onTitleChange}
                  onKeyDown={onTitleKeyDown}
                  onMouseDown={handleTitleMouseDown}
                  onMouseUp={handleTitleMouseUp}
                  onFocus={handleTitleFocus}
                  onBlur={handleTitleBlur}
                  placeholder={onTranslate('editor-title-placeholder')}
                  disabled={isReadOnly}
                  className="gba:h-auto gba:min-w-0 gba:w-full gba:border-0 gba:bg-transparent gba:p-0 gba:text-base gba:font-semibold focus-visible:gba:ring-0 focus-visible:gba:ring-offset-0"
                />
              </div>
            </div>

            {approvalRequest && <ApprovalStatusBadge approvalRequest={approvalRequest} />}
          </div>

          <div className="gba:flex gba:items-center gba:gap-2">
            {participants.length > 0 && (
              <PresenceIndicator
                participants={participants}
                maxVisible={3}
                size="sm"
                showLabel={false}
                className="gba:mr-2"
              />
            )}

            <div className="gba:flex gba:items-center gba:gap-2 gba:mr-2">
              <SaveStatusIndicator
                isSaving={isSaving}
                hasUnsavedChanges={hasUnsavedChanges}
                lastSaved={lastSaved}
                t={onTranslate}
              />
            </div>

            <Separator orientation="vertical" className="gba:h-6" />

            {!document?.id && !isReadOnly && (
              <Button
                onClick={onSave}
                disabled={isSaving}
                variant="default"
                size="sm"
                data-testid="save-new-document-button"
                className="gba:bg-primary gba:text-primary-foreground"
              >
                <Save className="gba:w-4 gba:h-4 gba:mr-2" />
                {isSaving ? onTranslate('editor-saving') : onTranslate('editor-save-document')}
              </Button>
            )}

            {document?.id && !isReadOnly && (
              <Button
                onClick={onSave}
                disabled={isSaving}
                variant="ghost"
                size="sm"
                title={isSaving ? onTranslate('editor-saving') : onTranslate('editor-save-document')}
                data-testid="save-document-button"
                className="gba:h-8"
              >
                <Save className="gba:w-4 gba:h-4" />
              </Button>
            )}

            {!isTrashedDocument && document?.id && (
              <>
                <Button
                  variant={rightSidebar === 'comments' ? 'default' : 'ghost'}
                  size="sm"
                  onPointerDownCapture={onCommentsButtonPointerDown}
                  onClick={onToggleCommentsSidebar}
                  title={onTranslate('editor-comments-title')}
                  data-testid="comments-button"
                  className="gba:h-8"
                >
                  <MessageSquare className="gba:w-4 gba:h-4" />
                  {unresolvedCommentCount > 0 && (
                    <Badge variant="warning" className="gba:ml-1 gba:px-1 gba:py-0 gba:h-4 gba:text-xs">
                      {unresolvedCommentCount}
                    </Badge>
                  )}
                </Button>

                {isLocked && isLockedByMe && (
                  <Badge variant="default" className="gba:flex gba:items-center gba:gap-1">
                    <Lock className="gba:h-3 gba:w-3" />
                    {onTranslate('editor-locked')}
                  </Badge>
                )}

                <StatusBadge status={publishingStatus || 'draft'} />
              </>
            )}

            {!isTrashedDocument && document?.id && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <FileText className="gba:w-4 gba:h-4 gba:mr-2" />
                    {onTranslate('editor-document-menu')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onOpenVersionHistory}>
                    <History className="gba:w-4 gba:h-4 gba:mr-2" />
                    {onTranslate('editor-version-history')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onOpenCheckpointDialog}>
                    <Save className="gba:w-4 gba:h-4 gba:mr-2" />
                    {onTranslate('editor-save-checkpoint')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {isLockedByMe ? (
                    <DropdownMenuItem onClick={onReleaseLock}>
                      <Unlock className="gba:w-4 gba:h-4 gba:mr-2" />
                      {onTranslate('editor-unlock-document')}
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={onAcquireLock}>
                      <Lock className="gba:w-4 gba:h-4 gba:mr-2" />
                      {onTranslate('editor-lock-document')}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onOpenPublishDialog}>
                    <Upload className="gba:w-4 gba:h-4 gba:mr-2" />
                    {onTranslate('editor-publish')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onOpenPageSetupDialog} data-testid="page-setup-button">
                    <LayoutPanelLeft className="gba:w-4 gba:h-4 gba:mr-2" />
                    {onTranslate('page-setup-title')}
                  </DropdownMenuItem>
                  {onSaveAsTemplate && (
                    <DropdownMenuItem onClick={onSaveAsTemplate}>
                      <BookTemplate className="gba:w-4 gba:h-4 gba:mr-2" />
                      {onTranslate('editor-save-template')}
                    </DropdownMenuItem>
                  )}
                  {onSendForApproval && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={onSendForApproval}>
                        <Send className="gba:w-4 gba:h-4 gba:mr-2" />
                        {onTranslate('editor-send-for-approval')}
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onExportWord} disabled={isExporting}>
                    <FileDown className="gba:w-4 gba:h-4 gba:mr-2" />
                    {onTranslate('editor-export-word')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onExportPDF} disabled={isExporting}>
                    <FileDown className="gba:w-4 gba:h-4 gba:mr-2" />
                    {onTranslate('editor-export-pdf')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onPrint}>
                    <Printer className="gba:w-4 gba:h-4 gba:mr-2" />
                    {onTranslate('editor-print')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {!isTrashedDocument && document?.id && (
              <AiButton
                size="sm"
                showIcon
                icon={<Wand2 className="gba:w-4 gba:h-4" />}
                iconPosition="before"
                onClick={onAiEditClick}
                data-testid="ai-edit-button"
              >
                {onTranslate('editor-ai-edit')}
              </AiButton>
            )}
          </div>
        </div>
      </div>

      {headerExtra && <div className="gba:px-4 gba:pb-3">{headerExtra}</div>}

      <EditorToolbar
        editor={isTrashedDocument ? null : activeEditor}
        paginationConfig={paginationConfig}
        onOpenLinkDialog={onOpenLinkDialog}
        onOpenInsertImageDialog={onOpenInsertImageDialog}
        onOpenInsertSignatureDialog={onOpenInsertSignatureDialog}
        onOpenInsertTableDialog={onOpenInsertTableDialog}
        onOpenTableSidebar={onOpenTableSidebar}
        onOpenPageNumbersDialog={canOpenPageNumbersDialog ? onOpenPageNumbersDialog : undefined}
        onOpenFind={onOpenFind}
        onOpenReplace={onOpenReplace}
        data-testid={`${testId}-toolbar`}
      />
    </div>
  )
}
