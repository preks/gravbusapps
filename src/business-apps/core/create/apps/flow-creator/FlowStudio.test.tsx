import React from 'react'
import { render, screen } from '@testing-library/react'
import { FlowStudio } from './FlowStudio'

const createLayoutMock = jest.fn()
const useFlowStudioClientMock = jest.fn()

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
  selectEdge: jest.fn()
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
  FlowStudioCreateView: () => <div data-testid="flow-studio-create-view" />
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
    createLayoutMock.mockImplementation(
      ({
        heroVariant,
        heroTitle,
        heroSubtitle,
        heroExtra,
        views,
        currentView,
        canvasPanel,
        'data-testid': dataTestId
      }: any) => (
        <div
          data-testid="mock-create-layout"
          data-hero-variant={heroVariant}
          data-layout-testid={dataTestId}
          data-hero-title-type={typeof heroTitle}
          data-current-view={currentView}
          data-views={Array.isArray(views) ? views.map(view => view.value).join(',') : ''}
        >
          <div data-testid="mock-create-layout-subtitle">{heroSubtitle}</div>
          <div data-testid="mock-create-layout-extra">{heroExtra}</div>
          <div data-testid="mock-create-layout-canvas">{canvasPanel}</div>
        </div>
      )
    )

    useFlowStudioClientMock.mockReturnValue({
      saveFlow: jest.fn(),
      loadFlow: jest.fn(),
      isLoading: false
    })

    globalThis.history.replaceState({}, '', '/')
  })

  afterEach(() => {
    jest.clearAllMocks()
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
})
