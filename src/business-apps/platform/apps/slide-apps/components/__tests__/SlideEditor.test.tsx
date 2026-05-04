import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { Slide } from '../../types'
import { createShapeFromPreset } from '../slideElements'

const awarenessMock = {
  setLocalStateField: jest.fn()
}

const emptyParticipants: unknown[] = []
const graphQlClientMock = {
  request: jest.fn().mockResolvedValue({ Employee: [] })
}
const collaborationApiMock = {
  participants: emptyParticipants,
  isSynced: true,
  isInitialized: true,
  awareness: awarenessMock,
  updateSlides: jest.fn(),
  updateTheme: jest.fn(),
  updateMasters: jest.fn(),
  updateSlide: jest.fn(),
  updateElement: jest.fn(),
  updateSlideById: jest.fn(),
  addSlideAfterId: jest.fn(),
  removeSlideById: jest.fn(),
  moveSlideById: jest.fn(),
  duplicateSlideById: jest.fn(),
  masters: undefined,
  flushPendingUpdates: jest.fn(),
  applyContentJsonSnapshot: jest.fn()
}
const presentationCastMock = {
  isConnected: false,
  isFallbackMode: false,
  connectionState: 'disconnected',
  startCasting: jest.fn(),
  stopCasting: jest.fn(),
  sendSlideData: jest.fn(),
  sendEffects: jest.fn(),
  sendClearEffects: jest.fn(),
  sendVideoControl: jest.fn()
}
const effectManagerMock = {
  queueEffect: jest.fn(),
  clearAllEffects: jest.fn()
}
const speechMatcherMock = {
  startListening: jest.fn(),
  stopListening: jest.fn()
}
const toolbarContextMock = {
  context: { type: 'none' as const }
}
const commentsHookMock = {
  comments: [],
  unresolvedCount: 0,
  isLoading: false,
  error: null,
  loadComments: jest.fn(),
  createComment: jest.fn(),
  updateComment: jest.fn(),
  resolveComment: jest.fn(),
  unresolveComment: jest.fn(),
  deleteComment: jest.fn(),
  replyToComment: jest.fn(),
  clearError: jest.fn()
}
const slideTransitionMock = {
  previousSlide: null,
  currentTransition: null,
  navigateToSlide: jest.fn(),
  handleTransitionComplete: jest.fn(),
  canNavigatePrev: false,
  canNavigateNext: false
}
const slideSpellCheckMock = {
  annotations: [],
  annotationsBySlide: {},
  isChecking: false,
  totalIssues: 0,
  selectedAnnotation: null,
  checkAllSlides: jest.fn(),
  selectAnnotation: jest.fn(),
  acceptSuggestion: jest.fn(),
  ignoreAnnotation: jest.fn(),
  ignoreWord: jest.fn()
}
const voiceInputMock = {
  transcript: '',
  interimTranscript: '',
  isListening: false,
  isSupported: true,
  volume: 0,
  error: null,
  startListening: jest.fn(),
  stopListening: jest.fn()
}
const aiAssistConfigMock = { enabled: false, enabledEffects: [] }
const clipboardWriteTextMock = jest.fn().mockResolvedValue(undefined)
const clipboardReadTextMock = jest.fn().mockResolvedValue('')
const clipboardReadMock = jest.fn().mockRejectedValue(new Error('Clipboard items unavailable in test'))

jest.mock('@newwork/nw-design-system', () => {
  return {
    Button: ({ children, ...props }: React.PropsWithChildren<React.ButtonHTMLAttributes<HTMLButtonElement>>) => (
      <button {...props}>{children}</button>
    ),
    Badge: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
    Dialog: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
    DialogContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
    DialogHeader: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
    DialogTitle: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
    Separator: () => <div />,
    Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
    Label: ({ children }: React.PropsWithChildren) => <label>{children}</label>,
    useTranslation: () => ({ t: (key: string) => key })
  }
})

jest.mock('@/common/network/graphql/useGraphQLClient', () => ({
  useGraphQLClient: () => graphQlClientMock
}))

jest.mock('../SlideCanvas', () => ({
  SlideCanvas: ({
    onSelectElements,
    onEditText,
    inlineEditing
  }: {
    onSelectElements: (ids: Set<string>) => void
    onEditText: (id: string) => void
    inlineEditing?: {
      editingTextId: string | null
      selectionToRestore?: { start: number; end: number } | null
      onSelectionChange: (range: { start: number; end: number } | null) => void
    }
  }) => (
    <div
      data-testid="mock-slide-canvas"
      data-editing-id={inlineEditing?.editingTextId ?? ''}
      data-selection-to-restore={
        inlineEditing?.selectionToRestore
          ? `${inlineEditing.selectionToRestore.start}:${inlineEditing.selectionToRestore.end}`
          : ''
      }
    >
      <div data-testid="mock-slide-element-text-1" data-slide-element="true" data-element-id="text-1">
        Mock slide element
      </div>
      <div data-testid="mock-slide-element-shape-1" data-slide-element="true" data-element-id="shape-1">
        Mock shape element
      </div>
      <button data-testid="mock-select-text" onClick={() => onSelectElements(new Set(['text-1']))}>
        Select text
      </button>
      <button data-testid="mock-edit-text" onClick={() => onEditText('text-1')}>
        Edit text
      </button>
      <button data-testid="mock-select-range" onClick={() => inlineEditing?.onSelectionChange({ start: 0, end: 8 })}>
        Select range
      </button>
      <button data-testid="mock-clear-range" onClick={() => inlineEditing?.onSelectionChange(null)}>
        Clear range
      </button>
    </div>
  )
}))

jest.mock('../SlideContextMenu', () => ({
  SlideContextMenu: ({
    children,
    contextMenuState,
    onContextMenuCapture,
    actions,
    disabled,
    isInlineTextEditing,
    hasExpandedTextSelection,
    canInsertLink,
    'data-testid': testId = 'slide-context-menu'
  }: React.PropsWithChildren<{
    contextMenuState: { kind: string; selectionIds: string[] }
    onContextMenuCapture: (event: React.MouseEvent<HTMLElement>) => void
    actions: {
      onCopy: () => void
      onPaste: () => void
      onDelete?: () => void
      onDuplicate?: () => void
      onBringToFront?: () => void
      onBringForward?: () => void
      onSendToBack?: () => void
      onSendBackward?: () => void
      onCopyTextSelection?: () => void
      onCutTextSelection?: () => void
      onPasteTextSelection?: () => void
    }
    disabled?: boolean
    isInlineTextEditing?: boolean
    hasExpandedTextSelection?: boolean
    canInsertLink?: boolean
    'data-testid'?: string
  }>) => (
    <div
      data-testid={testId}
      data-kind={contextMenuState.kind}
      data-selection-ids={contextMenuState.selectionIds.join(',')}
      data-disabled={disabled ? 'true' : 'false'}
      data-inline-editing={isInlineTextEditing ? 'true' : 'false'}
      data-has-expanded-selection={hasExpandedTextSelection ? 'true' : 'false'}
      data-can-insert-link={canInsertLink ? 'true' : 'false'}
      onContextMenuCapture={disabled ? undefined : onContextMenuCapture}
    >
      <button data-testid={`${testId}-mock-copy`} onClick={actions.onCopy}>
        Context copy
      </button>
      <button data-testid={`${testId}-mock-paste`} onClick={actions.onPaste}>
        Context paste
      </button>
      <button data-testid={`${testId}-mock-delete`} onClick={actions.onDelete}>
        Context delete
      </button>
      <button data-testid={`${testId}-mock-duplicate`} onClick={actions.onDuplicate}>
        Context duplicate
      </button>
      <button data-testid={`${testId}-mock-bring-to-front`} onClick={actions.onBringToFront}>
        Context bring to front
      </button>
      <button data-testid={`${testId}-mock-bring-forward`} onClick={actions.onBringForward}>
        Context bring forward
      </button>
      <button data-testid={`${testId}-mock-send-to-back`} onClick={actions.onSendToBack}>
        Context send to back
      </button>
      <button data-testid={`${testId}-mock-send-backward`} onClick={actions.onSendBackward}>
        Context send backward
      </button>
      <button data-testid={`${testId}-mock-copy-text`} onClick={actions.onCopyTextSelection}>
        Context copy text
      </button>
      <button data-testid={`${testId}-mock-cut-text`} onClick={actions.onCutTextSelection}>
        Context cut text
      </button>
      <button data-testid={`${testId}-mock-paste-text`} onClick={actions.onPasteTextSelection}>
        Context paste text
      </button>
      {children}
    </div>
  )
}))

jest.mock('../FloatingTextActions', () => ({
  FloatingTextActions: ({ 'data-testid': testId }: { 'data-testid'?: string }) => (
    <div data-testid={testId ?? 'floating-text-actions'}>Floating actions</div>
  )
}))

jest.mock('../SlideThumbnail', () => ({
  SlideThumbnail: () => <div>thumbnail</div>
}))

jest.mock('../PropertyPanel', () => ({
  PropertyPanel: () => <div>property-panel</div>
}))

jest.mock('../CollaboratorCursors', () => ({
  CollaboratorCursors: () => <div>cursors</div>
}))

jest.mock('../../../shared/components/PresenceIndicator', () => ({
  PresenceIndicator: () => <div>presence</div>
}))

jest.mock('../../../shared/components/AutoSaveIndicator', () => ({
  AutoSaveIndicator: () => <div>autosave</div>
}))

jest.mock('../../../shared/components/CommentPanel', () => ({
  CommentPanel: ({
    comments,
    onCreateComment,
    onUnresolveComment,
    onClose,
    onScrollToHighlight,
    currentUserName,
    currentUserAvatar,
    disableCreateComment,
    activeCommentId,
    canReplyToComments,
    canResolveComments,
    canEditOwnComments,
    canDeleteOwnComments,
    'data-testid': testId = 'comment-panel'
  }: {
    comments: Array<{ id: string }>
    onCreateComment: (content: string, parentId?: string, userName?: string, userAvatar?: string) => Promise<void>
    onUnresolveComment?: (commentId: string) => Promise<boolean | void>
    onClose: () => void
    onScrollToHighlight?: (commentId: string) => void
    currentUserName?: string
    currentUserAvatar?: string
    disableCreateComment?: boolean
    activeCommentId?: string | null
    canReplyToComments?: boolean
    canResolveComments?: boolean
    canEditOwnComments?: boolean
    canDeleteOwnComments?: boolean
    'data-testid'?: string
  }) => (
    <div
      data-testid={testId}
      data-create-disabled={disableCreateComment ? 'true' : 'false'}
      data-active-comment-id={activeCommentId ?? ''}
      data-can-reply={canReplyToComments ? 'true' : 'false'}
      data-can-resolve={canResolveComments ? 'true' : 'false'}
      data-can-edit-own={canEditOwnComments ? 'true' : 'false'}
      data-can-delete-own={canDeleteOwnComments ? 'true' : 'false'}
    >
      <button
        data-testid={`${testId}-create`}
        onClick={() => void onCreateComment('New comment', undefined, currentUserName, currentUserAvatar)}
      >
        Create comment
      </button>
      <button data-testid={`${testId}-close`} onClick={onClose}>
        Close comments
      </button>
      {comments[0] ? (
        <button data-testid={`${testId}-reopen`} onClick={() => void onUnresolveComment?.(comments[0].id)}>
          Reopen comment
        </button>
      ) : null}
      {comments[0] ? (
        <button data-testid={`${testId}-jump`} onClick={() => onScrollToHighlight?.(comments[0].id)}>
          Jump to comment
        </button>
      ) : null}
    </div>
  )
}))

jest.mock('../editor/SlideEditorHeaderActions', () => ({
  SlideEditorHeaderActions: () => <div>header-actions</div>
}))

jest.mock('../toolbar', () => ({
  SlideToolbarRibbon: ({ onShowLinkDialog }: { onShowLinkDialog: () => void }) => (
    <button data-testid="mock-show-link-dialog" onClick={onShowLinkDialog}>
      toolbar
    </button>
  )
}))

jest.mock('../SlideLayoutPicker', () => ({
  SlideLayoutPicker: () => <div>layout-picker</div>
}))

jest.mock('../SlideMasterView', () => ({
  SlideMasterView: () => <div>master-view</div>
}))

jest.mock('../GradientBuilder', () => ({
  GradientBuilder: () => <div>gradient-builder</div>
}))

jest.mock('../LinkDialog', () => ({
  LinkDialog: ({ open, selectedText, initialUrl }: { open: boolean; selectedText: string; initialUrl?: string }) =>
    open ? (
      <div data-testid="mock-link-dialog" data-selected-text={selectedText} data-initial-url={initialUrl ?? ''} />
    ) : null
}))

jest.mock('../PdfExportDialog', () => ({
  PdfExportDialog: () => null
}))

jest.mock('../SpeakerNotesPanel', () => ({
  SpeakerNotesPanel: () => <div>speaker-notes</div>
}))

jest.mock('../PresenterView', () => ({
  PresenterView: () => <div>presenter-view</div>
}))

jest.mock('../SlideTransitionPlayer', () => ({
  SlideTransitionPlayer: ({ children }: React.PropsWithChildren) => <div>{children}</div>
}))

jest.mock('../SpellCheckPanel', () => ({
  SpellCheckPanel: () => <div>spell-check</div>
}))

jest.mock('../AIAssistSettings', () => ({
  AIAssistSettings: () => <div>ai-assist-settings</div>,
  loadAIAssistConfig: () => aiAssistConfigMock,
  saveAIAssistConfig: jest.fn()
}))

jest.mock('../../services', () => ({
  SlidesApiService: {
    setAccessToken: jest.fn(),
    createComment: jest.fn(),
    listComments: jest.fn(),
    updateComment: jest.fn(),
    resolveComment: jest.fn(),
    unresolveComment: jest.fn(),
    deleteComment: jest.fn(),
    replyToComment: jest.fn(),
    updateSlide: jest.fn().mockResolvedValue(undefined)
  }
}))

jest.mock('../../hooks/useSlideCollaboration', () => ({
  useSlideCollaboration: ({ initialSlides, initialThemeId }: { initialSlides: unknown[]; initialThemeId: string }) => ({
    slides: initialSlides,
    themeId: initialThemeId,
    ...collaborationApiMock
  })
}))

jest.mock('../../../shared/hooks/useComments', () => ({
  useComments: () => commentsHookMock
}))

jest.mock('../../hooks/usePresentationCast', () => ({
  usePresentationCast: () => presentationCastMock
}))

jest.mock('../../hooks/useEffectManager', () => ({
  useEffectManager: () => effectManagerMock
}))

jest.mock('../../hooks/useSpeechMatcher', () => ({
  useSpeechMatcher: () => speechMatcherMock
}))

jest.mock('../../hooks/useToolbarContext', () => ({
  useToolbarContext: () => toolbarContextMock
}))

jest.mock('../../hooks/useSlideTransition', () => ({
  useSlideTransition: () => slideTransitionMock
}))

jest.mock('../../hooks/useSlideSpellCheck', () => ({
  useSlideSpellCheck: () => slideSpellCheckMock
}))

jest.mock('../../../shared', () => ({
  useVoiceInput: () => voiceInputMock
}))

jest.mock('../../hooks/useImageObjectUrls', () => ({
  clearImageObjectUrlCache: jest.fn()
}))

import { SlideEditor } from '../SlideEditor'

function makeSlide(overrides: Partial<Slide> = {}): Slide {
  return {
    id: 'deck-1',
    title: 'Test deck',
    createdAt: '2026-04-26T00:00:00.000Z',
    updatedAt: '2026-04-26T00:00:00.000Z',
    createdBy: 'tester',
    contentJson: {
      slides: [
        {
          id: 'slide-1',
          elements: [
            {
              id: 'text-1',
              type: 'text',
              position: { x: 100, y: 100 },
              size: { width: 300, height: 120 },
              rotation: 0,
              opacity: 1,
              locked: false,
              zIndex: 1,
              content: 'Editable text',
              fontFamily: 'Inter',
              fontSize: 18,
              fontWeight: 'normal',
              fontStyle: 'normal',
              textDecoration: 'none',
              textAlign: 'left',
              verticalAlign: 'top',
              color: '#111111',
              backgroundColor: 'transparent',
              lineHeight: 1.2,
              letterSpacing: 0,
              padding: 16
            }
          ],
          background: { type: 'solid', color: '#ffffff' }
        }
      ],
      themeId: 'default'
    },
    permission: 'owner',
    ...overrides
  }
}

function makeLayeredSlide(): Slide {
  return makeSlide({
    contentJson: {
      slides: [
        {
          id: 'slide-1',
          background: { type: 'solid', color: '#ffffff' },
          elements: [
            {
              id: 'text-1',
              type: 'text',
              position: { x: 100, y: 100 },
              size: { width: 300, height: 120 },
              rotation: 0,
              opacity: 1,
              locked: false,
              zIndex: 1,
              content: 'Front candidate',
              fontFamily: 'Inter',
              fontSize: 18,
              fontWeight: 'normal',
              fontStyle: 'normal',
              textDecoration: 'none',
              textAlign: 'left',
              verticalAlign: 'top',
              color: '#111111',
              backgroundColor: 'transparent',
              lineHeight: 1.2,
              letterSpacing: 0,
              padding: 16
            },
            {
              id: 'text-2',
              type: 'text',
              position: { x: 160, y: 160 },
              size: { width: 280, height: 100 },
              rotation: 0,
              opacity: 1,
              locked: false,
              zIndex: 2,
              content: 'Middle layer',
              fontFamily: 'Inter',
              fontSize: 18,
              fontWeight: 'normal',
              fontStyle: 'normal',
              textDecoration: 'none',
              textAlign: 'left',
              verticalAlign: 'top',
              color: '#111111',
              backgroundColor: 'transparent',
              lineHeight: 1.2,
              letterSpacing: 0,
              padding: 16
            },
            {
              id: 'text-3',
              type: 'text',
              position: { x: 220, y: 220 },
              size: { width: 260, height: 90 },
              rotation: 0,
              opacity: 1,
              locked: false,
              zIndex: 3,
              content: 'Back layer',
              fontFamily: 'Inter',
              fontSize: 18,
              fontWeight: 'normal',
              fontStyle: 'normal',
              textDecoration: 'none',
              textAlign: 'left',
              verticalAlign: 'top',
              color: '#111111',
              backgroundColor: 'transparent',
              lineHeight: 1.2,
              letterSpacing: 0,
              padding: 16
            }
          ]
        }
      ],
      themeId: 'default'
    }
  })
}

function makeFrontMostTargetSlide(): Slide {
  const layeredSlide = makeLayeredSlide()

  return {
    ...layeredSlide,
    contentJson: {
      ...layeredSlide.contentJson,
      slides: layeredSlide.contentJson.slides.map((slideItem, index) => {
        if (index !== 0) {
          return slideItem
        }

        return {
          ...slideItem,
          elements: slideItem.elements.map(element => {
            if (element.id === 'text-1') {
              return { ...element, zIndex: 3 }
            }

            if (element.id === 'text-2') {
              return { ...element, zIndex: 1 }
            }

            if (element.id === 'text-3') {
              return { ...element, zIndex: 2 }
            }

            return element
          })
        }
      })
    }
  }
}

function makeDuplicateZIndexTextSlide(): Slide {
  const layeredSlide = makeLayeredSlide()

  return {
    ...layeredSlide,
    contentJson: {
      ...layeredSlide.contentJson,
      slides: layeredSlide.contentJson.slides.map((slideItem, index) => {
        if (index !== 0) {
          return slideItem
        }

        return {
          ...slideItem,
          elements: slideItem.elements.map(element => ({ ...element, zIndex: 1 }))
        }
      })
    }
  }
}

function makeDuplicateZIndexShapeSlide(): Slide {
  const shapeElement = createShapeFromPreset('rect', {
    id: 'shape-1',
    position: { x: 80, y: 80 },
    size: { width: 240, height: 120 }
  })

  return makeSlide({
    contentJson: {
      slides: [
        {
          id: 'slide-1',
          background: { type: 'solid', color: '#ffffff' },
          elements: [
            {
              ...shapeElement,
              zIndex: 1
            },
            {
              id: 'text-2',
              type: 'text',
              position: { x: 160, y: 160 },
              size: { width: 280, height: 100 },
              rotation: 0,
              opacity: 1,
              locked: false,
              zIndex: 1,
              content: 'Second layer',
              fontFamily: 'Inter',
              fontSize: 18,
              fontWeight: 'normal',
              fontStyle: 'normal',
              textDecoration: 'none',
              textAlign: 'left',
              verticalAlign: 'top',
              color: '#111111',
              backgroundColor: 'transparent',
              lineHeight: 1.2,
              letterSpacing: 0,
              padding: 16
            },
            {
              id: 'text-3',
              type: 'text',
              position: { x: 220, y: 220 },
              size: { width: 260, height: 90 },
              rotation: 0,
              opacity: 1,
              locked: false,
              zIndex: 1,
              content: 'Third layer',
              fontFamily: 'Inter',
              fontSize: 18,
              fontWeight: 'normal',
              fontStyle: 'normal',
              textDecoration: 'none',
              textAlign: 'left',
              verticalAlign: 'top',
              color: '#111111',
              backgroundColor: 'transparent',
              lineHeight: 1.2,
              letterSpacing: 0,
              padding: 16
            }
          ]
        }
      ],
      themeId: 'default'
    }
  })
}

function makeFrontMostDuplicateZIndexTextSlide(): Slide {
  return makeSlide({
    contentJson: {
      slides: [
        {
          id: 'slide-1',
          background: { type: 'solid', color: '#ffffff' },
          elements: [
            {
              id: 'text-2',
              type: 'text',
              position: { x: 160, y: 160 },
              size: { width: 280, height: 100 },
              rotation: 0,
              opacity: 1,
              locked: false,
              zIndex: 1,
              content: 'Back layer',
              fontFamily: 'Inter',
              fontSize: 18,
              fontWeight: 'normal',
              fontStyle: 'normal',
              textDecoration: 'none',
              textAlign: 'left',
              verticalAlign: 'top',
              color: '#111111',
              backgroundColor: 'transparent',
              lineHeight: 1.2,
              letterSpacing: 0,
              padding: 16
            },
            {
              id: 'text-3',
              type: 'text',
              position: { x: 220, y: 220 },
              size: { width: 260, height: 90 },
              rotation: 0,
              opacity: 1,
              locked: false,
              zIndex: 1,
              content: 'Middle layer',
              fontFamily: 'Inter',
              fontSize: 18,
              fontWeight: 'normal',
              fontStyle: 'normal',
              textDecoration: 'none',
              textAlign: 'left',
              verticalAlign: 'top',
              color: '#111111',
              backgroundColor: 'transparent',
              lineHeight: 1.2,
              letterSpacing: 0,
              padding: 16
            },
            {
              id: 'text-1',
              type: 'text',
              position: { x: 100, y: 100 },
              size: { width: 300, height: 120 },
              rotation: 0,
              opacity: 1,
              locked: false,
              zIndex: 1,
              content: 'Front candidate',
              fontFamily: 'Inter',
              fontSize: 18,
              fontWeight: 'normal',
              fontStyle: 'normal',
              textDecoration: 'none',
              textAlign: 'left',
              verticalAlign: 'top',
              color: '#111111',
              backgroundColor: 'transparent',
              lineHeight: 1.2,
              letterSpacing: 0,
              padding: 16
            }
          ]
        }
      ],
      themeId: 'default'
    }
  })
}

function makeFrontMostDuplicateZIndexShapeSlide(): Slide {
  const shapeElement = createShapeFromPreset('rect', {
    id: 'shape-1',
    position: { x: 80, y: 80 },
    size: { width: 240, height: 120 }
  })

  return makeSlide({
    contentJson: {
      slides: [
        {
          id: 'slide-1',
          background: { type: 'solid', color: '#ffffff' },
          elements: [
            {
              id: 'text-2',
              type: 'text',
              position: { x: 160, y: 160 },
              size: { width: 280, height: 100 },
              rotation: 0,
              opacity: 1,
              locked: false,
              zIndex: 1,
              content: 'Back layer',
              fontFamily: 'Inter',
              fontSize: 18,
              fontWeight: 'normal',
              fontStyle: 'normal',
              textDecoration: 'none',
              textAlign: 'left',
              verticalAlign: 'top',
              color: '#111111',
              backgroundColor: 'transparent',
              lineHeight: 1.2,
              letterSpacing: 0,
              padding: 16
            },
            {
              id: 'text-3',
              type: 'text',
              position: { x: 220, y: 220 },
              size: { width: 260, height: 90 },
              rotation: 0,
              opacity: 1,
              locked: false,
              zIndex: 1,
              content: 'Middle layer',
              fontFamily: 'Inter',
              fontSize: 18,
              fontWeight: 'normal',
              fontStyle: 'normal',
              textDecoration: 'none',
              textAlign: 'left',
              verticalAlign: 'top',
              color: '#111111',
              backgroundColor: 'transparent',
              lineHeight: 1.2,
              letterSpacing: 0,
              padding: 16
            },
            {
              ...shapeElement,
              zIndex: 1
            }
          ]
        }
      ],
      themeId: 'default'
    }
  })
}

describe('SlideEditor workspace deselection', () => {
  beforeAll(() => {
    window.HTMLElement.prototype.scrollIntoView = jest.fn()
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: clipboardWriteTextMock,
        readText: clipboardReadTextMock,
        read: clipboardReadMock
      }
    })
  })

  beforeEach(() => {
    awarenessMock.setLocalStateField.mockClear()
    collaborationApiMock.addSlideAfterId.mockReset()
    collaborationApiMock.updateSlide.mockReset()
    collaborationApiMock.updateElement.mockReset()
    commentsHookMock.comments = []
    commentsHookMock.unresolvedCount = 0
    commentsHookMock.isLoading = false
    commentsHookMock.error = null
    commentsHookMock.loadComments.mockReset()
    commentsHookMock.createComment.mockReset()
    commentsHookMock.updateComment.mockReset()
    commentsHookMock.resolveComment.mockReset()
    commentsHookMock.unresolveComment.mockReset()
    commentsHookMock.deleteComment.mockReset()
    commentsHookMock.replyToComment.mockReset()
    commentsHookMock.clearError.mockReset()
    clipboardWriteTextMock.mockClear()
    clipboardReadTextMock.mockReset()
    clipboardReadTextMock.mockResolvedValue('')
    clipboardReadMock.mockReset()
    clipboardReadMock.mockRejectedValue(new Error('Clipboard items unavailable in test'))
  })

  it('renders existing slide content without crashing during placeholder normalization', () => {
    render(<SlideEditor slideId="deck-1" slide={makeSlide()} onBack={() => {}} accessToken="" />)

    expect(screen.getByTestId('mock-slide-canvas')).toBeInTheDocument()
  })

  it('clears selection only when clicking the empty workspace around the slide', () => {
    render(<SlideEditor slideId="deck-1" slide={makeSlide()} onBack={() => {}} accessToken="" />)

    fireEvent.click(screen.getByTestId('mock-select-text'))
    expect(screen.getByTestId('slide-editor-floating-text-actions')).toBeInTheDocument()

    fireEvent.mouseDown(screen.getByTestId('mock-slide-canvas'))
    expect(screen.getByTestId('slide-editor-floating-text-actions')).toBeInTheDocument()

    fireEvent.mouseDown(screen.getByTestId('slide-editor-floating-text-actions'))
    expect(screen.getByTestId('slide-editor-floating-text-actions')).toBeInTheDocument()

    fireEvent.mouseDown(screen.getByTestId('slide-editor-canvas-workspace'))
    expect(screen.queryByTestId('slide-editor-floating-text-actions')).not.toBeInTheDocument()
    expect(awarenessMock.setLocalStateField).toHaveBeenLastCalledWith('selection', null)
  })

  it('opens the link dialog with the active text selection while editing', () => {
    render(<SlideEditor slideId="deck-1" slide={makeSlide()} onBack={() => {}} accessToken="" />)

    fireEvent.click(screen.getByTestId('mock-edit-text'))
    fireEvent.click(screen.getByTestId('mock-select-range'))
    fireEvent.click(screen.getByTestId('mock-show-link-dialog'))

    expect(screen.getByTestId('mock-link-dialog')).toHaveAttribute('data-selected-text', 'Editable')
    expect(screen.getByTestId('mock-link-dialog')).toHaveAttribute('data-initial-url', '')
  })

  it('keeps the custom context menu active while inline text editing is open', () => {
    render(<SlideEditor slideId="deck-1" slide={makeSlide()} onBack={() => {}} accessToken="" />)

    fireEvent.click(screen.getByTestId('mock-edit-text'))
    fireEvent.click(screen.getByTestId('mock-select-range'))

    expect(screen.getByTestId('slide-editor-context-menu')).toHaveAttribute('data-disabled', 'false')
    expect(screen.getByTestId('slide-editor-context-menu')).toHaveAttribute('data-inline-editing', 'true')
    expect(screen.getByTestId('slide-editor-context-menu')).toHaveAttribute('data-has-expanded-selection', 'true')
    expect(screen.getByTestId('slide-editor-context-menu')).toHaveAttribute('data-can-insert-link', 'true')
  })

  it('opens the link dialog for the full text content when the text box is selected as an object', () => {
    render(<SlideEditor slideId="deck-1" slide={makeSlide()} onBack={() => {}} accessToken="" />)

    fireEvent.click(screen.getByTestId('mock-select-text'))
    fireEvent.click(screen.getByTestId('mock-show-link-dialog'))

    expect(screen.getByTestId('mock-link-dialog')).toHaveAttribute('data-selected-text', 'Editable text')
    expect(screen.getByTestId('mock-link-dialog')).toHaveAttribute('data-initial-url', '')
  })

  it('syncs selection before opening the slide context menu on right-click', () => {
    render(<SlideEditor slideId="deck-1" slide={makeSlide()} onBack={() => {}} accessToken="" />)

    fireEvent.contextMenu(screen.getByTestId('mock-slide-element-text-1'))

    expect(screen.getByTestId('slide-editor-context-menu')).toHaveAttribute('data-kind', 'single-text')
    expect(screen.getByTestId('slide-editor-context-menu')).toHaveAttribute('data-selection-ids', 'text-1')
    expect(screen.getByTestId('slide-editor-floating-text-actions')).toBeInTheDocument()
  })

  it('treats blank-canvas right-click as an empty-canvas context menu', () => {
    render(<SlideEditor slideId="deck-1" slide={makeSlide()} onBack={() => {}} accessToken="" />)

    fireEvent.click(screen.getByTestId('mock-select-text'))
    expect(screen.getByTestId('slide-editor-floating-text-actions')).toBeInTheDocument()

    fireEvent.contextMenu(screen.getByTestId('mock-slide-canvas'))

    expect(screen.getByTestId('slide-editor-context-menu')).toHaveAttribute('data-kind', 'canvas-empty')
    expect(screen.getByTestId('slide-editor-context-menu')).toHaveAttribute('data-selection-ids', '')
    expect(screen.queryByTestId('slide-editor-floating-text-actions')).not.toBeInTheDocument()
  })

  it('copies the right-clicked element instead of the whole slide', async () => {
    render(<SlideEditor slideId="deck-1" slide={makeSlide()} onBack={() => {}} accessToken="" />)

    fireEvent.contextMenu(screen.getByTestId('mock-slide-element-text-1'))
    fireEvent.click(screen.getByTestId('slide-editor-context-menu-mock-copy'))
    fireEvent.click(screen.getByTestId('slide-editor-context-menu-mock-paste'))

    await waitFor(() => {
      expect(collaborationApiMock.updateSlide).toHaveBeenCalled()
    })

    expect(collaborationApiMock.addSlideAfterId).not.toHaveBeenCalled()
  })

  it('deletes the right-clicked element from the context menu even when it was not selected first', async () => {
    render(<SlideEditor slideId="deck-1" slide={makeSlide()} onBack={() => {}} accessToken="" />)

    fireEvent.contextMenu(screen.getByTestId('mock-slide-element-text-1'))
    fireEvent.click(screen.getByTestId('slide-editor-context-menu-mock-delete'))

    await waitFor(() => {
      expect(collaborationApiMock.updateSlide).toHaveBeenCalled()
    })

    const deletedTextElement = collaborationApiMock.updateSlide.mock.calls
      .flatMap(call => {
        const update = call.find(
          (arg): arg is { elements?: Array<{ id?: string }> } =>
            typeof arg === 'object' && arg !== null && 'elements' in arg
        )

        return update?.elements ?? []
      })
      .find((element: { id?: string }) => element.id === 'text-1')

    expect(deletedTextElement).toBeUndefined()
  })

  it('duplicates the right-clicked element from the context menu even when it was not selected first', async () => {
    render(<SlideEditor slideId="deck-1" slide={makeSlide()} onBack={() => {}} accessToken="" />)

    fireEvent.contextMenu(screen.getByTestId('mock-slide-element-text-1'))
    fireEvent.click(screen.getByTestId('slide-editor-context-menu-mock-duplicate'))

    await waitFor(() => {
      expect(collaborationApiMock.updateSlide).toHaveBeenCalled()
    })

    const duplicatedTextElements = collaborationApiMock.updateSlide.mock.calls
      .flatMap(call => {
        const update = call.find(
          (arg): arg is { elements?: Array<{ type?: string; content?: string }> } =>
            typeof arg === 'object' && arg !== null && 'elements' in arg
        )

        return update?.elements ?? []
      })
      .filter(
        (element: { type?: string; content?: string }) => element.type === 'text' && element.content === 'Editable text'
      )

    expect(duplicatedTextElements.length).toBeGreaterThan(1)
  })

  it('brings the right-clicked element all the way to the front from the context menu', async () => {
    render(<SlideEditor slideId="deck-1" slide={makeLayeredSlide()} onBack={() => {}} accessToken="" />)

    fireEvent.contextMenu(screen.getByTestId('mock-slide-element-text-1'))
    fireEvent.click(screen.getByTestId('slide-editor-context-menu-mock-bring-to-front'))

    await waitFor(() => {
      expect(collaborationApiMock.updateSlide).toHaveBeenCalled()
    })

    const lastUpdateCall =
      collaborationApiMock.updateSlide.mock.calls[collaborationApiMock.updateSlide.mock.calls.length - 1]
    const update = lastUpdateCall.find(
      (arg): arg is { elements?: Array<{ id?: string; zIndex?: number }> } =>
        typeof arg === 'object' && arg !== null && 'elements' in arg
    )
    const updatedElements = update?.elements ?? []

    expect(updatedElements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'text-1', zIndex: 3 }),
        expect.objectContaining({ id: 'text-2', zIndex: 1 }),
        expect.objectContaining({ id: 'text-3', zIndex: 2 })
      ])
    )
  })

  it('normalizes duplicate z-index values when bringing a text box to front from the context menu', async () => {
    render(<SlideEditor slideId="deck-1" slide={makeDuplicateZIndexTextSlide()} onBack={() => {}} accessToken="" />)

    fireEvent.contextMenu(screen.getByTestId('mock-slide-element-text-1'))
    fireEvent.click(screen.getByTestId('slide-editor-context-menu-mock-bring-to-front'))

    await waitFor(() => {
      expect(collaborationApiMock.updateSlide).toHaveBeenCalled()
    })

    const lastUpdateCall =
      collaborationApiMock.updateSlide.mock.calls[collaborationApiMock.updateSlide.mock.calls.length - 1]
    const update = lastUpdateCall.find(
      (arg): arg is { elements?: Array<{ id?: string; zIndex?: number }> } =>
        typeof arg === 'object' && arg !== null && 'elements' in arg
    )
    const updatedElements = update?.elements ?? []

    expect(updatedElements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'text-2', zIndex: 1 }),
        expect.objectContaining({ id: 'text-3', zIndex: 2 }),
        expect.objectContaining({ id: 'text-1', zIndex: 3 })
      ])
    )
  })

  it('normalizes duplicate z-index values when bringing a shape forward from the context menu', async () => {
    render(<SlideEditor slideId="deck-1" slide={makeDuplicateZIndexShapeSlide()} onBack={() => {}} accessToken="" />)

    fireEvent.contextMenu(screen.getByTestId('mock-slide-element-shape-1'))
    fireEvent.click(screen.getByTestId('slide-editor-context-menu-mock-bring-forward'))

    await waitFor(() => {
      expect(collaborationApiMock.updateSlide).toHaveBeenCalled()
    })

    const lastUpdateCall =
      collaborationApiMock.updateSlide.mock.calls[collaborationApiMock.updateSlide.mock.calls.length - 1]
    const update = lastUpdateCall.find(
      (arg): arg is { elements?: Array<{ id?: string; zIndex?: number }> } =>
        typeof arg === 'object' && arg !== null && 'elements' in arg
    )
    const updatedElements = update?.elements ?? []

    expect(updatedElements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'text-2', zIndex: 1 }),
        expect.objectContaining({ id: 'shape-1', zIndex: 2 }),
        expect.objectContaining({ id: 'text-3', zIndex: 3 })
      ])
    )
  })

  it('normalizes duplicate z-index values when sending a text box backward from the context menu', async () => {
    render(
      <SlideEditor slideId="deck-1" slide={makeFrontMostDuplicateZIndexTextSlide()} onBack={() => {}} accessToken="" />
    )

    fireEvent.contextMenu(screen.getByTestId('mock-slide-element-text-1'))
    fireEvent.click(screen.getByTestId('slide-editor-context-menu-mock-send-backward'))

    await waitFor(() => {
      expect(collaborationApiMock.updateSlide).toHaveBeenCalled()
    })

    const lastUpdateCall =
      collaborationApiMock.updateSlide.mock.calls[collaborationApiMock.updateSlide.mock.calls.length - 1]
    const update = lastUpdateCall.find(
      (arg): arg is { elements?: Array<{ id?: string; zIndex?: number }> } =>
        typeof arg === 'object' && arg !== null && 'elements' in arg
    )
    const updatedElements = update?.elements ?? []

    expect(updatedElements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'text-2', zIndex: 1 }),
        expect.objectContaining({ id: 'text-1', zIndex: 2 }),
        expect.objectContaining({ id: 'text-3', zIndex: 3 })
      ])
    )
  })

  it('normalizes duplicate z-index values when sending a shape backward from the context menu', async () => {
    render(
      <SlideEditor slideId="deck-1" slide={makeFrontMostDuplicateZIndexShapeSlide()} onBack={() => {}} accessToken="" />
    )

    fireEvent.contextMenu(screen.getByTestId('mock-slide-element-shape-1'))
    fireEvent.click(screen.getByTestId('slide-editor-context-menu-mock-send-backward'))

    await waitFor(() => {
      expect(collaborationApiMock.updateSlide).toHaveBeenCalled()
    })

    const lastUpdateCall =
      collaborationApiMock.updateSlide.mock.calls[collaborationApiMock.updateSlide.mock.calls.length - 1]
    const update = lastUpdateCall.find(
      (arg): arg is { elements?: Array<{ id?: string; zIndex?: number }> } =>
        typeof arg === 'object' && arg !== null && 'elements' in arg
    )
    const updatedElements = update?.elements ?? []

    expect(updatedElements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'text-2', zIndex: 1 }),
        expect.objectContaining({ id: 'shape-1', zIndex: 2 }),
        expect.objectContaining({ id: 'text-3', zIndex: 3 })
      ])
    )
  })

  it('sends the right-clicked element all the way to the back from the context menu', async () => {
    render(<SlideEditor slideId="deck-1" slide={makeFrontMostTargetSlide()} onBack={() => {}} accessToken="" />)

    fireEvent.contextMenu(screen.getByTestId('mock-slide-element-text-1'))
    fireEvent.click(screen.getByTestId('slide-editor-context-menu-mock-send-to-back'))

    await waitFor(() => {
      expect(collaborationApiMock.updateSlide).toHaveBeenCalled()
    })

    const lastUpdateCall =
      collaborationApiMock.updateSlide.mock.calls[collaborationApiMock.updateSlide.mock.calls.length - 1]
    const update = lastUpdateCall.find(
      (arg): arg is { elements?: Array<{ id?: string; zIndex?: number }> } =>
        typeof arg === 'object' && arg !== null && 'elements' in arg
    )
    const updatedElements = update?.elements ?? []

    expect(updatedElements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'text-1', zIndex: 1 }),
        expect.objectContaining({ id: 'text-2', zIndex: 2 }),
        expect.objectContaining({ id: 'text-3', zIndex: 3 })
      ])
    )
  })

  it('copies selected inline text into the text clipboard before slide-level paste', async () => {
    render(<SlideEditor slideId="deck-1" slide={makeSlide()} onBack={() => {}} accessToken="" />)

    fireEvent.contextMenu(screen.getByTestId('mock-slide-element-text-1'))
    fireEvent.click(screen.getByTestId('slide-editor-context-menu-mock-copy'))

    fireEvent.click(screen.getByTestId('mock-edit-text'))
    fireEvent.click(screen.getByTestId('mock-select-range'))
    fireEvent.contextMenu(screen.getByTestId('mock-slide-element-text-1'))
    fireEvent.click(screen.getByTestId('mock-clear-range'))
    fireEvent.click(screen.getByTestId('slide-editor-context-menu-mock-copy-text'))

    await waitFor(() => {
      expect(clipboardWriteTextMock).toHaveBeenCalledWith('Editable')
    })

    fireEvent.mouseDown(screen.getByTestId('slide-editor-canvas-workspace'))
    fireEvent.contextMenu(screen.getByTestId('mock-slide-canvas'))
    fireEvent.click(screen.getByTestId('slide-editor-context-menu-mock-paste'))

    await waitFor(() => {
      expect(collaborationApiMock.updateSlide).toHaveBeenCalled()
    })

    const pastedTextElement = collaborationApiMock.updateSlide.mock.calls
      .flatMap(call => {
        const update = call.find(
          (arg): arg is { elements?: Array<{ type?: string; content?: string }> } =>
            typeof arg === 'object' && arg !== null && 'elements' in arg
        )

        return update?.elements ?? []
      })
      .find((element: { type?: string; content?: string }) => element.type === 'text' && element.content === 'Editable')

    expect(collaborationApiMock.addSlideAfterId).not.toHaveBeenCalled()
    expect(pastedTextElement).toEqual(
      expect.objectContaining({
        type: 'text',
        content: 'Editable'
      })
    )
  })

  it('creates a new text box from external plain-text paste on the canvas', async () => {
    clipboardReadMock.mockRejectedValue(new Error('Clipboard items unavailable in test'))
    clipboardReadTextMock.mockResolvedValue('External plain text')

    render(<SlideEditor slideId="deck-1" slide={makeSlide()} onBack={() => {}} accessToken="" />)

    await act(async () => {
      fireEvent.keyDown(window, { key: 'v', metaKey: true, target: document.body })
    })

    await waitFor(() => {
      expect(collaborationApiMock.updateSlide).toHaveBeenCalled()
    })

    const pastedTextElement = collaborationApiMock.updateSlide.mock.calls
      .flatMap(call => {
        const update = call.find(
          (arg): arg is { elements?: Array<{ type?: string; content?: string }> } =>
            typeof arg === 'object' && arg !== null && 'elements' in arg
        )

        return update?.elements ?? []
      })
      .find(
        (element: { type?: string; content?: string }) =>
          element.type === 'text' && element.content === 'External plain text'
      )

    expect(pastedTextElement).toEqual(
      expect.objectContaining({
        type: 'text',
        content: 'External plain text'
      })
    )
  })

  it('cuts only the selected inline text instead of removing the whole text box', async () => {
    render(<SlideEditor slideId="deck-1" slide={makeSlide()} onBack={() => {}} accessToken="" />)

    fireEvent.click(screen.getByTestId('mock-edit-text'))
    fireEvent.click(screen.getByTestId('mock-select-range'))
    fireEvent.click(screen.getByTestId('slide-editor-context-menu-mock-cut-text'))

    await waitFor(() => {
      expect(clipboardWriteTextMock).toHaveBeenCalledWith('Editable')
    })

    expect(collaborationApiMock.updateSlide).not.toHaveBeenCalled()
    expect(collaborationApiMock.updateElement).toHaveBeenCalledWith(
      0,
      'text-1',
      expect.objectContaining({
        content: ' text'
      })
    )
  })

  it('reopens resolved comments from the shared comments panel wiring', () => {
    commentsHookMock.comments = [
      {
        id: 'comment-1',
        entityId: 'deck-1',
        entityType: 'slide',
        type: 'document',
        content: 'Resolved comment',
        createdBy: 'user-1',
        createdAt: '2026-04-29T16:00:00.000Z',
        resolvedAt: '2026-04-29T16:05:00.000Z'
      } as never
    ]

    render(<SlideEditor slideId="deck-1" slide={makeSlide()} onBack={() => {}} accessToken="token" />)

    fireEvent.click(screen.getByTestId('slide-editor-comments-toggle'))
    fireEvent.click(screen.getByTestId('slide-editor-comments-panel-reopen'))

    expect(commentsHookMock.unresolveComment).toHaveBeenCalledWith('comment-1')
  })

  it('creates deck-level comments when nothing on the slide is selected', () => {
    render(
      <SlideEditor
        slideId="deck-1"
        slide={makeSlide()}
        onBack={() => {}}
        accessToken="token"
        userInfo={{ id: 'user-1', givenName: 'Emir', familyName: 'Salihagic' } as never}
      />
    )

    fireEvent.click(screen.getByTestId('slide-editor-comments-toggle'))
    fireEvent.click(screen.getByTestId('slide-editor-comments-panel-create'))

    expect(commentsHookMock.createComment).toHaveBeenCalledWith({
      type: 'document',
      slideAnchorData: {
        kind: 'slide',
        slideId: 'slide-1'
      },
      content: 'New comment',
      createdByName: 'Emir Salihagic',
      createdByAvatar: undefined
    })
  })

  it('anchors new comments to the selected element when a slide object is selected', () => {
    render(<SlideEditor slideId="deck-1" slide={makeSlide()} onBack={() => {}} accessToken="token" />)

    fireEvent.click(screen.getByTestId('mock-select-text'))
    fireEvent.pointerDown(screen.getByTestId('slide-editor-comments-toggle'))
    fireEvent.click(screen.getByTestId('slide-editor-comments-toggle'))
    fireEvent.click(screen.getByTestId('slide-editor-comments-panel-create'))

    expect(commentsHookMock.createComment).toHaveBeenCalledWith({
      type: 'selection',
      selectedText: 'Editable text',
      slideAnchorData: {
        kind: 'element',
        slideId: 'slide-1',
        elementIds: ['text-1']
      },
      content: 'New comment',
      createdByName: 'editor-user-fallback',
      createdByAvatar: undefined
    })
  })

  it('anchors new comments to the active text range when text is selected inside an element', () => {
    render(<SlideEditor slideId="deck-1" slide={makeSlide()} onBack={() => {}} accessToken="token" />)

    fireEvent.click(screen.getByTestId('mock-edit-text'))
    fireEvent.click(screen.getByTestId('mock-select-range'))
    fireEvent.pointerDown(screen.getByTestId('slide-editor-comments-toggle'))
    fireEvent.click(screen.getByTestId('slide-editor-comments-toggle'))
    fireEvent.click(screen.getByTestId('slide-editor-comments-panel-create'))

    expect(commentsHookMock.createComment).toHaveBeenCalledWith({
      type: 'selection',
      selectionStart: 0,
      selectionEnd: 8,
      selectedText: 'Editable',
      slideAnchorData: {
        kind: 'text-range',
        slideId: 'slide-1',
        elementId: 'text-1',
        start: 0,
        end: 8,
        selectedText: 'Editable',
        contextAfter: ' text'
      },
      content: 'New comment',
      createdByName: 'editor-user-fallback',
      createdByAvatar: undefined
    })
  })

  it('navigates to an anchored slide comment from the comments panel', () => {
    commentsHookMock.comments = [
      {
        id: 'comment-1',
        entityId: 'deck-1',
        entityType: 'slide',
        type: 'selection',
        content: 'Check this text',
        createdBy: 'user-1',
        createdAt: '2026-04-29T16:00:00.000Z',
        selectedText: 'Editable',
        slideAnchorData: {
          kind: 'text-range',
          slideId: 'slide-1',
          elementId: 'text-1',
          start: 0,
          end: 8,
          selectedText: 'Editable'
        }
      }
    ]

    render(<SlideEditor slideId="deck-1" slide={makeSlide()} onBack={() => {}} accessToken="token" />)

    fireEvent.click(screen.getByTestId('slide-editor-comments-toggle'))
    fireEvent.click(screen.getByTestId('slide-editor-comments-panel-jump'))

    expect(screen.getByTestId('mock-slide-canvas')).toHaveAttribute('data-editing-id', 'text-1')
    expect(screen.getByTestId('mock-slide-canvas')).toHaveAttribute('data-selection-to-restore', '0:8')
  })

  it('opens the comments panel and activates the matching thread when the thumbnail comment badge is clicked', () => {
    commentsHookMock.comments = [
      {
        id: 'comment-1',
        entityId: 'deck-1',
        entityType: 'slide',
        type: 'selection',
        content: 'Check this text',
        createdBy: 'user-1',
        createdAt: '2026-04-29T16:00:00.000Z',
        selectedText: 'Editable',
        slideAnchorData: {
          kind: 'text-range',
          slideId: 'slide-1',
          elementId: 'text-1',
          start: 0,
          end: 8,
          selectedText: 'Editable',
          contextAfter: ' text'
        }
      }
    ]

    render(<SlideEditor slideId="deck-1" slide={makeSlide()} onBack={() => {}} accessToken="token" />)

    fireEvent.click(screen.getByTestId('slide-editor-thumbnail-comment-badge-0'))

    expect(screen.getByTestId('slide-editor-comments-panel')).toHaveAttribute('data-active-comment-id', 'comment-1')
    expect(screen.getByTestId('mock-slide-canvas')).toHaveAttribute('data-editing-id', 'text-1')
    expect(screen.getByTestId('mock-slide-canvas')).toHaveAttribute('data-selection-to-restore', '0:8')
  })

  it('supports keyboard selection on slide thumbnails', () => {
    const slide = makeSlide({
      contentJson: {
        slides: [
          {
            id: 'slide-1',
            elements: [],
            background: { type: 'solid', color: '#ffffff' }
          },
          {
            id: 'slide-2',
            elements: [],
            background: { type: 'solid', color: '#ffffff' }
          }
        ],
        themeId: 'default'
      }
    })

    render(<SlideEditor slideId="deck-1" slide={slide} onBack={() => {}} accessToken="token" />)

    fireEvent.keyDown(screen.getByTestId('slide-editor-thumbnail-1'), { key: 'Enter' })

    expect(screen.getByTestId('slide-editor-thumbnail-0')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByTestId('slide-editor-thumbnail-1')).toHaveAttribute('aria-pressed', 'true')
  })

  it('reanchors stale text-range comments by matching the selected text inside the edited element', () => {
    commentsHookMock.comments = [
      {
        id: 'comment-1',
        entityId: 'deck-1',
        entityType: 'slide',
        type: 'selection',
        content: 'Check moved text',
        createdBy: 'user-1',
        createdAt: '2026-04-29T16:00:00.000Z',
        selectedText: 'Editable',
        slideAnchorData: {
          kind: 'text-range',
          slideId: 'slide-1',
          elementId: 'text-1',
          start: 0,
          end: 8,
          selectedText: 'Editable',
          contextBefore: 'Intro ',
          contextAfter: ' text'
        }
      }
    ]

    const slide = makeSlide({
      contentJson: {
        slides: [
          {
            id: 'slide-1',
            elements: [
              {
                id: 'text-1',
                type: 'text',
                position: { x: 100, y: 100 },
                size: { width: 300, height: 120 },
                rotation: 0,
                opacity: 1,
                locked: false,
                zIndex: 1,
                content: 'Intro Editable text',
                fontFamily: 'Inter',
                fontSize: 18,
                fontWeight: 'normal',
                fontStyle: 'normal',
                textDecoration: 'none',
                textAlign: 'left',
                verticalAlign: 'top',
                color: '#111111',
                backgroundColor: 'transparent',
                lineHeight: 1.2,
                letterSpacing: 0,
                padding: 16
              }
            ],
            background: { type: 'solid', color: '#ffffff' }
          }
        ],
        themeId: 'default'
      }
    })

    render(<SlideEditor slideId="deck-1" slide={slide} onBack={() => {}} accessToken="token" />)

    fireEvent.click(screen.getByTestId('slide-editor-comments-toggle'))
    fireEvent.click(screen.getByTestId('slide-editor-comments-panel-jump'))

    expect(screen.getByTestId('mock-slide-canvas')).toHaveAttribute('data-editing-id', 'text-1')
    expect(screen.getByTestId('mock-slide-canvas')).toHaveAttribute('data-selection-to-restore', '6:14')
  })

  it('opens the comments panel with the comment shortcut when commenting is allowed', () => {
    render(<SlideEditor slideId="deck-1" slide={makeSlide()} onBack={() => {}} accessToken="token" />)

    fireEvent.keyDown(window, { key: 'M', metaKey: true, shiftKey: true })

    expect(screen.getByTestId('slide-editor-comments-panel')).toBeInTheDocument()
  })

  it('keeps comment-only collaborators read-only while still exposing comments', () => {
    render(
      <SlideEditor
        slideId="deck-1"
        slide={makeSlide({ permission: 'comment' })}
        onBack={() => {}}
        accessToken="token"
      />
    )

    expect(screen.queryByTestId('mock-show-link-dialog')).not.toBeInTheDocument()
    expect(screen.getByTestId('slide-editor-comments-toggle')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('slide-editor-comments-toggle'))
    expect(screen.getByTestId('slide-editor-comments-panel')).toHaveAttribute('data-create-disabled', 'false')
    expect(screen.getByTestId('slide-editor-comments-panel')).toHaveAttribute('data-can-reply', 'true')
    expect(screen.getByTestId('slide-editor-comments-panel')).toHaveAttribute('data-can-resolve', 'true')
  })

  it('shows the comments panel in view mode but disables creating comments', () => {
    render(
      <SlideEditor slideId="deck-1" slide={makeSlide({ permission: 'view' })} onBack={() => {}} accessToken="token" />
    )

    fireEvent.click(screen.getByTestId('slide-editor-comments-toggle'))
    expect(screen.getByTestId('slide-editor-comments-panel')).toHaveAttribute('data-create-disabled', 'true')
    expect(screen.getByTestId('slide-editor-comments-panel')).toHaveAttribute('data-can-reply', 'false')
    expect(screen.getByTestId('slide-editor-comments-panel')).toHaveAttribute('data-can-resolve', 'false')
    expect(screen.getByTestId('slide-editor-comments-panel')).toHaveAttribute('data-can-edit-own', 'false')
    expect(screen.getByTestId('slide-editor-comments-panel')).toHaveAttribute('data-can-delete-own', 'false')
  })
})
