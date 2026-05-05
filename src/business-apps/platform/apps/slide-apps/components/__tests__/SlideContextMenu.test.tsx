import React from 'react'
import { render, screen } from '@testing-library/react'
import { SlideContextMenu } from '../SlideContextMenu'
import type { SlideContextMenuState } from '../../hooks/useSlideContextMenu'
import { createShapeFromPreset } from '../slideElements'

jest.mock('@newwork/nw-design-system', () => ({
  ContextMenu: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  ContextMenuTrigger: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  ContextMenuContent: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
    const { onCloseAutoFocus, ...rest } = props
    void onCloseAutoFocus
    return <div {...rest}>{children}</div>
  },
  ContextMenuItem: ({
    children,
    onSelect,
    ...props
  }: React.PropsWithChildren<{ onSelect?: () => void } & Record<string, unknown>>) => (
    <button onClick={() => onSelect?.()} {...props}>
      {children}
    </button>
  ),
  ContextMenuSeparator: () => <hr />,
  ContextMenuSub: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  ContextMenuSubContent: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <div {...props}>{children}</div>
  ),
  ContextMenuSubTrigger: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <button {...props}>{children}</button>
  ),
  useTranslation: () => ({ t: (key: string) => key })
}))

function makeShapeState(overrides: Partial<SlideContextMenuState> = {}): SlideContextMenuState {
  const element = createShapeFromPreset('rect', {
    id: 'shape-1',
    position: { x: 80, y: 80 },
    size: { width: 240, height: 120 }
  })

  return {
    kind: 'single-shape',
    targetElementId: 'shape-1',
    selectionIds: ['shape-1'],
    selectedElements: [element],
    singleElement: element,
    selectionCount: 1,
    hasUnlockedSelection: true,
    hasLockedSelection: false,
    canEdit: true,
    hasClipboardContent: true,
    capabilities: {
      canCopy: true,
      canCut: true,
      canPaste: true,
      canDuplicate: true,
      canDelete: true,
      canEditText: true,
      canEditPoints: true,
      canBringForward: true,
      canSendBackward: true,
      canAlign: true,
      canDistribute: true,
      canFlip: true,
      canGroup: false,
      canUngroup: false,
      canLock: true,
      canUnlock: false
    },
    ...overrides
  }
}

const actions = {
  onCopy: jest.fn(),
  onCut: jest.fn(),
  onPaste: jest.fn(),
  onCopyTextSelection: jest.fn(),
  onCutTextSelection: jest.fn(),
  onPasteTextSelection: jest.fn(),
  onDuplicate: jest.fn(),
  onDelete: jest.fn(),
  onEditText: jest.fn(),
  onEditPoints: jest.fn(),
  onBringToFront: jest.fn(),
  onBringForward: jest.fn(),
  onSendToBack: jest.fn(),
  onSendBackward: jest.fn(),
  onAlign: jest.fn(),
  onDistribute: jest.fn(),
  onFlip: jest.fn(),
  onGroup: jest.fn(),
  onUngroup: jest.fn(),
  onLockSelection: jest.fn(),
  onUnlockSelection: jest.fn(),
  onShowFormatOptions: jest.fn(),
  onOpenCommentPanel: jest.fn(),
  onShowLinkDialog: jest.fn(),
  onShowSpellCheck: jest.fn()
}

describe('SlideContextMenu', () => {
  beforeEach(() => {
    Object.values(actions).forEach(mockFn => mockFn.mockClear())
  })

  it('renders z-order and layout actions as first-level menu entries', () => {
    const { container } = render(
      <SlideContextMenu
        contextMenuState={makeShapeState()}
        onContextMenuCapture={() => {}}
        actions={actions}
        canCreateComments
      >
        <div>canvas</div>
      </SlideContextMenu>
    )

    expect(screen.getByText('editor-cut')).toBeInTheDocument()
    expect(screen.getByText('editor-copy')).toBeInTheDocument()
    expect(screen.getByText('editor-paste')).toBeInTheDocument()
    expect(screen.getByTestId('slide-context-menu-bring-to-front-trigger')).toBeInTheDocument()
    expect(screen.getByTestId('slide-context-menu-send-to-back-trigger')).toBeInTheDocument()
    expect(screen.getByTestId('slide-context-menu-align-trigger')).toBeInTheDocument()
    expect(screen.getByTestId('slide-context-menu-distribute-trigger')).toBeInTheDocument()
    expect(screen.getByTestId('slide-context-menu-flip-trigger')).toBeInTheDocument()
    expect(screen.getByText('context-menu-bring-forward')).toBeInTheDocument()
    expect(screen.getByText('context-menu-send-backward')).toBeInTheDocument()
    expect(screen.getByText('context-menu-new-comment')).toBeInTheDocument()
    expect(screen.queryByText('context-menu-layers')).not.toBeInTheDocument()
    expect(screen.queryByText('props-arrange')).not.toBeInTheDocument()
    expect(screen.queryByText('context-menu-format-options')).not.toBeInTheDocument()
    expect(container.querySelectorAll('svg').length).toBeGreaterThan(0)
  })

  it('does not render object-level format options for images and videos', () => {
    render(
      <SlideContextMenu
        contextMenuState={makeShapeState({
          kind: 'single-media',
          capabilities: {
            ...makeShapeState().capabilities,
            canEditText: false,
            canEditPoints: false
          }
        })}
        onContextMenuCapture={() => {}}
        actions={actions}
      >
        <div>canvas</div>
      </SlideContextMenu>
    )

    expect(screen.queryByText('context-menu-format-picture')).not.toBeInTheDocument()
  })

  it('renders grouping actions as direct menu items beside other layout actions', () => {
    render(
      <SlideContextMenu
        contextMenuState={makeShapeState({
          kind: 'multi-selection',
          selectionCount: 2,
          capabilities: {
            ...makeShapeState().capabilities,
            canEditText: false,
            canEditPoints: false,
            canGroup: true,
            canUngroup: true
          }
        })}
        onContextMenuCapture={() => {}}
        actions={actions}
      >
        <div>canvas</div>
      </SlideContextMenu>
    )

    expect(screen.getByTestId('slide-context-menu-group')).toBeInTheDocument()
    expect(screen.getByTestId('slide-context-menu-ungroup')).toBeInTheDocument()
    expect(screen.queryByText('props-arrange')).not.toBeInTheDocument()
  })

  it('renders an inline text editing menu instead of object-level actions', () => {
    render(
      <SlideContextMenu
        contextMenuState={makeShapeState()}
        onContextMenuCapture={() => {}}
        actions={actions}
        isInlineTextEditing
        hasExpandedTextSelection
        canInsertLink
        canCreateComments
      >
        <div>canvas</div>
      </SlideContextMenu>
    )

    expect(screen.getByText('editor-link')).toBeInTheDocument()
    expect(screen.queryByText('spell-check-button')).not.toBeInTheDocument()
    expect(screen.queryByText('context-menu-format-text')).not.toBeInTheDocument()
    expect(screen.queryByTestId('slide-context-menu-bring-to-front-trigger')).not.toBeInTheDocument()
    expect(screen.queryByTestId('slide-context-menu-send-to-back-trigger')).not.toBeInTheDocument()
    expect(screen.queryByTestId('slide-context-menu-align-trigger')).not.toBeInTheDocument()
    expect(screen.queryByTestId('slide-context-menu-distribute-trigger')).not.toBeInTheDocument()
    expect(screen.queryByTestId('slide-context-menu-flip-trigger')).not.toBeInTheDocument()
  })
})
