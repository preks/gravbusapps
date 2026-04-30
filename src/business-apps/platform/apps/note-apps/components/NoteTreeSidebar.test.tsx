import React from 'react'
import { render, screen } from '@testing-library/react'
import { NoteTreeSidebar } from './NoteTreeSidebar'
import type { NoteSummary, NoteTreeNode } from '../types'

jest.mock('@newwork/nw-design-system', () => ({
  Button: ({ children, ...props }: React.PropsWithChildren<React.ButtonHTMLAttributes<HTMLButtonElement>>) => (
    <button {...props}>{children}</button>
  ),
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  DropdownMenu: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    onClick
  }: React.PropsWithChildren<{ onClick?: React.MouseEventHandler<HTMLDivElement> }>) => (
    <div role="menuitem" onClick={onClick}>
      {children}
    </div>
  ),
  DropdownMenuSeparator: () => <div />,
  DropdownMenuTrigger: ({ children }: React.PropsWithChildren) => <>{children}</>,
  Tooltip: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  TooltipContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  TooltipProvider: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  TooltipTrigger: ({ children }: React.PropsWithChildren) => <>{children}</>,
  useTranslation: () => ({ t: (key: string) => key })
}))

jest.mock('./SortableNoteTree', () => ({
  SortableNoteTree: ({ tree }: { tree: NoteTreeNode[] }) => (
    <div data-testid="sortable-note-tree" data-tree-ids={tree.map(note => note.id).join(',')} />
  )
}))

function makeSummary(overrides: Partial<NoteSummary>): NoteSummary {
  return {
    id: 'note-1',
    title: 'Note',
    isPinned: false,
    isArchived: false,
    position: 0,
    ownerId: 'user-1',
    createdAt: '2026-04-29T08:00:00.000Z',
    updatedAt: '2026-04-29T08:00:00.000Z',
    ...overrides
  }
}

function makeTreeNode(overrides: Partial<NoteTreeNode>): NoteTreeNode {
  return {
    ...makeSummary(overrides),
    children: [],
    depth: 0,
    ...overrides
  }
}

const dragDrop = {
  activeId: null,
  overId: null,
  projected: null,
  sensors: [],
  measuring: {},
  collisionDetection: jest.fn(),
  handleDragStart: jest.fn(),
  handleDragMove: jest.fn(),
  handleDragOver: jest.fn(),
  handleDragEnd: jest.fn(),
  handleDragCancel: jest.fn()
} as any

describe('NoteTreeSidebar', () => {
  it('renders recent notes from the combined recent list instead of the owned-only tree', () => {
    render(
      <NoteTreeSidebar
        width={320}
        isResizing={false}
        tree={[makeTreeNode({ id: 'owned-old', updatedAt: '2026-04-29T08:00:00.000Z' })]}
        recentNotes={[
          makeSummary({
            id: 'shared-new',
            ownerId: 'user-2',
            isShared: true,
            permission: 'edit',
            updatedAt: '2026-04-30T08:00:00.000Z'
          }),
          makeSummary({ id: 'owned-old', updatedAt: '2026-04-29T08:00:00.000Z' })
        ]}
        expandedIds={new Set()}
        selectedId={null}
        isLoadingTree={false}
        activeQuickAccess="recent"
        searchQuery=""
        dragDrop={dragDrop}
        onSearchChange={() => {}}
        onQuickAccessChange={() => {}}
        onSelectNode={() => {}}
        onToggleExpand={() => {}}
        onCreateNote={() => {}}
        onCreateFolder={() => {}}
        onCollapse={() => {}}
        onResizeStart={() => {}}
      />
    )

    expect(screen.getByTestId('sortable-note-tree')).toHaveAttribute('data-tree-ids', 'shared-new,owned-old')
  })
})
