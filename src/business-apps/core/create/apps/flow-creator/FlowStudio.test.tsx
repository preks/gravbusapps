import { render, screen, waitFor } from '@testing-library/react'
import { FlowStudio } from './FlowStudio'

const createLayoutMock = jest.fn()
const useFlowStudioClientMock = jest.fn()
const loadFlowMock = jest.fn()
const loadDraftMock = jest.fn()
const FLOW_CREATOR_CHAT_OPEN_STORAGE_KEY = 'flow-creator-chat-open'

const mockFlowStudioStoreState = {
  mode: 'simple',
  setMode: jest.fn(),
  templateName: 'Untitled Flow',
  setTemplateMetadata: jest.fn(),
  templateTags: {},
  setTemplateTags: jest.fn(),
  isDirty: false,
  nodes: [],
  edges: [],
  resetStore: jest.fn(),
  selectNode: jest.fn(),
  selectEdge: jest.fn(),
  toGraphDefinition: jest.fn(() => ({ nodes: [], edges: [] })),
  insertNodeOnEdgeByKind: jest.fn(),
  changeNodeStepKind: jest.fn()
}

jest.mock('@newwork/nw-design-system', () => ({
  AlertDialog: ({ open, children }: any) => (open ? <div>{children}</div> : null),
  AlertDialogAction: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  AlertDialogCancel: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  AlertDialogContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  AlertDialogDescription: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  AlertDialogFooter: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  AlertDialogHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  AlertDialogTitle: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Badge: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  CreateLayout: (props: any) => createLayoutMock(props),
  Dialog: ({ open, children }: any) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  DialogDescription: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  DialogFooter: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  DialogHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  DialogTitle: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Input: (props: any) => <input {...props} />,
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
  useTranslation: () => ({
    t: (key: string) =>
      (
        ({
          'app-eyebrow': 'Create',
          'list-title': 'FLOWs',
          'list-subtitle': 'Browse and open existing flow templates',
          'list-subtitle-create': 'Design and create new flows',
          'list-create': 'Create flow',
          'list-tab-create': 'Create',
          'list-tab-flows': 'FLOWs',
          'studio-back-to-list': 'Back',
          'app-title': 'Flow title',
          'app-description': 'Build a flow',
          'labels-title': 'Labels',
          'studio-loading': 'Loading...',
          'studio-unsaved-changes': 'Unsaved changes',
          'studio-saved': 'Saved',
          'studio-save-name-title': 'Save',
          'studio-save-name-description': 'Save description',
          'studio-save-name-label': 'Name',
          'studio-save-name-placeholder': 'Name',
          'studio-save-name-cancel': 'Cancel',
          'studio-save-name-confirm': 'Save',
          'studio-discard-title': 'Discard',
          'studio-discard-desc': 'Discard changes',
          'studio-discard-cancel': 'Cancel',
          'studio-discard-confirm': 'Discard',
          'studio-save-name-validation': 'Validation'
        }) as Record<string, string>
      )[key] ?? key
  })
}))

jest.mock('./components/canvas/FlowStudioCanvas', () => ({
  FlowStudioCanvas: () => <div data-testid="mock-flow-studio-canvas" />
}))

jest.mock('./components/FlowStudioChatPanel', () => ({
  FlowStudioChatPanel: () => <div data-testid="mock-flow-studio-chat-panel" />
}))

jest.mock('./components/shared/NodeContextMenu', () => ({
  NodeContextMenu: () => <div data-testid="mock-node-context-menu" />
}))

jest.mock('./components/shared/PendingDeleteDialog', () => ({
  PendingDeleteDialog: () => <div data-testid="mock-pending-delete-dialog" />
}))

jest.mock('./components/shared/TemplateLabelsDialog', () => ({
  TemplateLabelsDialog: () => <div data-testid="mock-template-labels-dialog" />
}))

jest.mock('./hooks/useFlowStudioStore', () => ({
  useFlowStudioStore: (selector: (state: typeof mockFlowStudioStoreState) => unknown) =>
    selector(mockFlowStudioStoreState)
}))

jest.mock('./hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: () => undefined
}))

jest.mock('./hooks/useFlowStudioClient', () => ({
  useFlowStudioClient: (...args: unknown[]) => useFlowStudioClientMock(...args)
}))

jest.mock('./views/FlowStudioCreateView', () => ({
  FlowStudioCreateView: ({ onOpenDesignerWithAI }: any) => (
    <div data-testid="flow-studio-create-view">
      {typeof onOpenDesignerWithAI === 'function' ? (
        <button
          type="button"
          data-testid="flow-studio-create-view-open-ai"
          onClick={() => onOpenDesignerWithAI('AI flow')}
        >
          Open with AI
        </button>
      ) : null}
    </div>
  )
}))

jest.mock('./views/FlowStudioListView', () => ({
  FlowStudioListView: ({ onCreateFlow }: any) => (
    <div data-testid="flow-studio-list-view">
      {typeof onCreateFlow === 'function' ? (
        <button type="button" data-testid="flow-studio-list-view-create" onClick={onCreateFlow}>
          Create flow
        </button>
      ) : null}
    </div>
  )
}))

jest.mock('@/business-apps/flow/providers', () => ({
  MockDataProvider: ({ children }: any) => <>{children}</>
}))

describe('FlowStudio', () => {
  beforeEach(() => {
    loadFlowMock.mockResolvedValue(undefined)
    loadDraftMock.mockResolvedValue(undefined)

    createLayoutMock.mockImplementation(
      ({
        heroVariant,
        heroTitle,
        heroSubtitle,
        heroExtra,
        views,
        currentView,
        canvasPanel,
        chatPanelCollapsed,
        'data-testid': dataTestId
      }: any) => (
        <div
          data-testid="mock-create-layout"
          data-hero-variant={heroVariant}
          data-layout-testid={dataTestId}
          data-hero-title-type={typeof heroTitle}
          data-current-view={currentView}
          data-views={Array.isArray(views) ? views.map(view => view.value).join(',') : ''}
          data-chat-collapsed={typeof chatPanelCollapsed === 'boolean' ? String(chatPanelCollapsed) : ''}
        >
          <div data-testid="mock-create-layout-subtitle">{heroSubtitle}</div>
          <div data-testid="mock-create-layout-extra">{heroExtra}</div>
          <div data-testid="mock-create-layout-canvas">{canvasPanel}</div>
        </div>
      )
    )

    useFlowStudioClientMock.mockReturnValue({
      saveFlow: jest.fn(),
      loadFlow: loadFlowMock,
      loadDraft: loadDraftMock,
      isLoading: false
    })

    globalThis.history.replaceState({}, '', '/')
    globalThis.localStorage.removeItem(FLOW_CREATOR_CHAT_OPEN_STORAGE_KEY)
  })

  afterEach(() => {
    jest.clearAllMocks()
    loadFlowMock.mockReset()
    loadDraftMock.mockReset()
  })

  it('renders the list overview inside CreateLayout overview mode', () => {
    render(<FlowStudio accessToken="token" />)

    expect(screen.getByTestId('mock-create-layout')).toHaveAttribute('data-hero-variant', 'overview')
    expect(screen.getByTestId('mock-create-layout')).toHaveAttribute(
      'data-layout-testid',
      'flow-studio-overview-layout'
    )
    expect(screen.getByTestId('mock-create-layout')).toHaveAttribute('data-hero-title-type', 'string')
    expect(screen.getByTestId('mock-create-layout')).toHaveAttribute('data-current-view', 'create')
    expect(screen.getByTestId('mock-create-layout')).toHaveAttribute('data-views', 'create,flows')
    expect(screen.getByText('Design and create new flows')).toBeInTheDocument()
    expect(screen.queryByTestId('flow-studio-hero-create')).not.toBeInTheDocument()
    expect(screen.getByTestId('flow-studio-create-view')).toBeInTheDocument()
  })

  it('passes the create action to the flows data display instead of the hero', () => {
    globalThis.history.replaceState({}, '', '/#flows')

    render(<FlowStudio accessToken="token" />)

    expect(screen.queryByTestId('flow-studio-hero-create')).not.toBeInTheDocument()
    expect(screen.getByTestId('flow-studio-list-view-create')).toBeInTheDocument()
  })

  it('loads a draft from the URL when draftId is present', () => {
    globalThis.history.replaceState({}, '', '/platform/create/flow-studio?draftId=draft-123#manage')

    render(<FlowStudio accessToken="token" />)

    expect(loadDraftMock).toHaveBeenCalledWith('draft-123')
  })

  it('falls back to loading a draft when a flowId URL points to an unsaved draft', async () => {
    loadFlowMock.mockRejectedValueOnce(new Error('Template not found'))
    globalThis.history.replaceState({}, '', '/platform/create/flow-studio?flowId=draft-123#flows')

    render(<FlowStudio accessToken="token" />)

    expect(loadFlowMock).toHaveBeenCalledWith('draft-123')
    await waitFor(() => expect(loadDraftMock).toHaveBeenCalledWith('draft-123'))
    await waitFor(() => {
      expect(globalThis.location.search).toBe('?draftId=draft-123')
      expect(globalThis.location.hash).toBe('#manage')
    })
  })

  it('uses the persisted chat preference when opening the designer', () => {
    globalThis.localStorage.setItem(FLOW_CREATOR_CHAT_OPEN_STORAGE_KEY, 'false')

    render(<FlowStudio accessToken="token" templateId="flow-123" />)

    expect(screen.getByTestId('mock-create-layout')).toHaveAttribute('data-chat-collapsed', 'true')
  })

  it('opens the chat when AI prompt opens the designer despite a persisted closed preference', () => {
    globalThis.localStorage.setItem(FLOW_CREATOR_CHAT_OPEN_STORAGE_KEY, 'false')

    render(<FlowStudio accessToken="token" />)
    screen.getByTestId('flow-studio-create-view-open-ai').click()

    expect(screen.getByTestId('mock-create-layout')).toHaveAttribute('data-chat-collapsed', 'false')
  })
})
