import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import type { Slide } from '../../types'

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

jest.mock('@newwork/nw-design-system', () => {
  return {
    Button: ({ children, ...props }: React.PropsWithChildren<React.ButtonHTMLAttributes<HTMLButtonElement>>) => (
      <button {...props}>{children}</button>
    ),
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
    inlineEditing?: { onSelectionChange: (range: { start: number; end: number } | null) => void }
  }) => (
    <div data-testid="mock-slide-canvas">
      <button data-testid="mock-select-text" onClick={() => onSelectElements(new Set(['text-1']))}>
        Select text
      </button>
      <button data-testid="mock-edit-text" onClick={() => onEditText('text-1')}>
        Edit text
      </button>
      <button data-testid="mock-select-range" onClick={() => inlineEditing?.onSelectionChange({ start: 0, end: 8 })}>
        Select range
      </button>
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

function makeSlide(): Slide {
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
    }
  }
}

describe('SlideEditor workspace deselection', () => {
  beforeAll(() => {
    window.HTMLElement.prototype.scrollIntoView = jest.fn()
  })

  beforeEach(() => {
    awarenessMock.setLocalStateField.mockClear()
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

  it('opens the link dialog for the full text content when the text box is selected as an object', () => {
    render(<SlideEditor slideId="deck-1" slide={makeSlide()} onBack={() => {}} accessToken="" />)

    fireEvent.click(screen.getByTestId('mock-select-text'))
    fireEvent.click(screen.getByTestId('mock-show-link-dialog'))

    expect(screen.getByTestId('mock-link-dialog')).toHaveAttribute('data-selected-text', 'Editable text')
    expect(screen.getByTestId('mock-link-dialog')).toHaveAttribute('data-initial-url', '')
  })
})
